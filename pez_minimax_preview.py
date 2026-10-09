"""MiniMax H3 Preview Override ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â kjnodes-style live preview for MiniMax H3.

Port of KJNodes' "Model Preview Override" for the MiniMax H3 AV model.

Instead of the default 512px first-frame preview, this node attaches an
OUTER_SAMPLE wrapper to the model. On every sampler step the H3 *video* latent
(the first stream of the NestedTensor) is decoded and pushed to a DOM widget
on this node via the "minimax_h3_preview_override" websocket event, at full
sampler resolution (capped by max_resolution).

Decoding paths:
  0. Optional tiny VAE (TAEHV/TAESD from MiniMax H3 Tiny VAE Loader) -> true-RGB
     previews via vae.decode(). Only tiny decoders are accepted: a full VAE (e.g.
     minimax_h3_video_vae) is IGNORED, because decoding it every step while the DiT
     is resident blows up VRAM (that was the original VRAM-killer).
  1. Animated Latent2RGB     -> preview_frames temporal slices decoded with the
                                H3 latent_rgb_factors (24ch), played back as
                                WebP/MP4 at preview_fps (preview_frames > 1).
  2. Single Latent2RGB frame -> one JPEG per step (preview_frames = 1).

For full-quality frames use the regular VAEDecode after sampling.

The payload schema matches KJNodes' so the same JS widget conventions apply:
boundary-0 message carries the sigma schedule, step messages carry the image.
"""

import base64
import io as pyio
import logging
import queue
import threading
import time

import numpy as np
import torch

import comfy.patcher_extension
import comfy.utils
import folder_paths
import latent_preview
from comfy_api.latest import io
from PIL import Image, ImageOps

try:
    from server import PromptServer
except ImportError:
    PromptServer = None


def _suppressed_preview_image(self_, preview_format, x0):
    return None


class _AsyncPreviewEncoder:
    """Off-thread encoder. Bounded FIFO drops-on-full so the sampler never blocks on us."""

    _STOP = object()

    def __init__(self, max_in_flight=2):
        self.q = queue.Queue(maxsize=max_in_flight)
        self.thread = threading.Thread(target=self._run, name="minimax_h3_preview_encoder", daemon=True)
        self.thread.start()

    def submit(self, fn):
        try:
            self.q.put_nowait(fn)
            return True
        except queue.Full:
            return False

    def _run(self):
        while True:
            item = self.q.get()
            if item is self._STOP:
                return
            try:
                item()
            except Exception:
                logging.exception("[MiniMax H3 Preview Override] async encoder error")

    def shutdown(self, drain_timeout=5.0):
        try:
            self.q.put(self._STOP, timeout=drain_timeout)
        except queue.Full:
            pass
        self.thread.join(timeout=drain_timeout)


def _get_core_previewer(load_device, latent_format):
    # Walk past custom-node hooks on get_previewer to reach the unwrapped core function.
    fn = latent_preview.get_previewer
    seen = set()
    while hasattr(fn, "__wrapped__") and id(fn) not in seen:
        seen.add(id(fn))
        fn = fn.__wrapped__
    return fn(load_device, latent_format)


def _video_part(x0, latent_shapes):
    """Extract the video stream from an H3 latent.

    Nested latents are packed flat ([B, 1, N]) before sampling, and an OUTER_SAMPLE
    wrapper that replaces the callback receives the *packed* tensor at step boundaries
    (the sampler's own unpack wrapper is bypassed). Handle both the already-unpacked
    NestedTensor and the flat-packed tensor here.
    """
    if getattr(x0, "is_nested", False):
        return x0.unbind()[0]
    if latent_shapes is not None and len(latent_shapes) > 1:
        return comfy.utils.unpack_latents(x0, latent_shapes)[0]
    return x0


_tae_decode_warned = False


def _tae_decode_to_pil(vae, video_5d, max_frames=None):
    """True-RGB preview via a tiny autoencoder (TAEHV/TAESD), kjnodes-style.

    The TAE is a small network, so per-step decode is cheap. vae.decode returns
    [B, T, H, W, C] in [-1, 1]. Any failure (e.g. latent-channel mismatch with the
    loaded TAE) returns [] so the caller falls back to Latent2RGB; the warning is
    logged once, not per step.
    """
    global _tae_decode_warned
    if video_5d.ndim != 5:
        return []
    try:
        images = vae.decode(video_5d[:1])
    except Exception as e:
        if not _tae_decode_warned:
            _tae_decode_warned = True
            logging.warning(f"[MiniMax H3 PreviewOverride] Tiny VAE decode failed, falling back to Latent2RGB: {e}")
        return []
    if images.ndim == 5:
        images = images[0]
    if images.ndim != 4:
        return []
    t_total = images.shape[0]
    if max_frames is not None and 0 < max_frames < t_total:
        indices = np.linspace(0, t_total - 1, max_frames).round().astype(int).tolist()
        images = images[indices]
        
    # Validacion contra corrupcion FP16 en resoluciones extremas
    import torch
    if torch.isnan(images).any():
        if not getattr(vae, '_nan_warned', False):
            vae._nan_warned = True
            import logging
            logging.warning('[Pez MiniMax Preview] Tiny VAE genero NaNs (posible overflow FP16 por alta resolucion). Usando Latent2RGB de respaldo.')
        return []

    # TAEHV/TAESD decode to [-1, 1] by contract; clamp absorbs any drift (no per-step min()).
    images = images.add(1.0).mul_(127.5).clamp_(0, 255)
    u8 = images.to(torch.uint8).cpu().numpy()
    return [Image.fromarray(u8[i]) for i in range(u8.shape[0])]


class _DropMissingVAEKeys(logging.Filter):
    """Decoder-only TAE files (e.g. the trained H3 decoder) have no encoder half, so
    comfy.sd.VAE always logs a 'Missing VAE keys [...]' warning on load. Expected
    here ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â drop just that record while loading so the log stays clean."""

    def filter(self, record):
        return "Missing VAE keys" not in record.getMessage()


def _vae_approx_list():
    """TAE files available in ComfyUI/models/vae_approx for the vae_name combo."""
    try:
        options = sorted(folder_paths.get_filename_list("vae_approx"))
    except Exception:
        options = []
    return options or ["taeh3_decoder.safetensors"]


def _load_tiny_vae(vae_name):
    """Load a Tiny AutoEncoder from models/vae_approx as a standard VAE (TAEHV/TAESD
    branch), suppressing the expected 'Missing VAE keys' warning for decoder-only files."""
    import comfy.sd
    path = folder_paths.get_full_path_or_raise("vae_approx", vae_name)
    sd = comfy.utils.load_torch_file(path)
    root = logging.getLogger()
    flt = _DropMissingVAEKeys()
    root.addFilter(flt)
    try:
        vae = comfy.sd.VAE(sd=sd)
    finally:
        root.removeFilter(flt)
    vae.throw_exception_if_invalid()
    return vae


def _decode_video_frames_l2rgb(x0_5d, latent_format, max_frames, stride=1):
    """Decode T temporal frames of a 5D video latent via latent_rgb_factors -> list[PIL].

    Mirrors KJNodes' helper: linear project [B,24,T,H,W] with the format's
    latent_rgb_factors, then scale -1..1 -> 0..255 (same math as core preview_to_image).
    """
    if x0_5d.ndim != 5:
        return []
    rgb_factors = getattr(latent_format, "latent_rgb_factors", None)
    if rgb_factors is None:
        return []
    try:
        reshape = getattr(latent_format, "latent_rgb_factors_reshape", None)
        if reshape is not None:
            x0_5d = reshape(x0_5d)
        bias = getattr(latent_format, "latent_rgb_factors_bias", None)
        factors = torch.tensor(rgb_factors, device=x0_5d.device, dtype=x0_5d.dtype).transpose(0, 1)
        bias_t = torch.tensor(bias, device=x0_5d.device, dtype=x0_5d.dtype) if bias is not None else None
        x = x0_5d[0]
        if stride > 1:
            x = x[:, ::stride]
        t_total = x.shape[1]
        if max_frames > 0 and max_frames < t_total:
            indices = np.linspace(0, t_total - 1, max_frames).round().astype(int).tolist()
            x = x[:, indices]
        x = x.movedim(0, -1)
        rgb = torch.nn.functional.linear(x, factors, bias=bias_t)
        rgb.add_(1.0).mul_(127.5).clamp_(0, 255)
        rgb_cpu = rgb.to(torch.uint8).cpu().numpy()
        return [Image.fromarray(rgb_cpu[i]) for i in range(rgb_cpu.shape[0])]
    except Exception:
        return []


# PyPI PyAV wheels typically lack NVENC; probe once at import.
def _probe_nvenc():
    try:
        import av  # noqa
        av.Codec("h264_nvenc", "w")
        return True
    except Exception:
        return False


_NVENC_AVAILABLE = _probe_nvenc()

# NVENC H.264 rejects sub-145x49 inputs at avcodec_open2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fall back to WebP for small frames.
_NVENC_MIN_W = 145
_NVENC_MIN_H = 49

_nvenc_warned = False


def _encode_mp4_nvenc(frames, fps, max_res):
    """Fragmented MP4 so the browser can decode mid-download. Returns (None, 0, 0) on
    failure (including too-small-for-NVENC), so the caller falls through to WebP."""
    global _nvenc_warned
    if not frames:
        return None, 0, 0
    try:
        import av
    except Exception:
        return None, 0, 0
    pil_frames = []
    for f in frames:
        pf = f if f.mode == "RGB" else f.convert("RGB")
        if max_res and max_res > 0 and (pf.width > max_res or pf.height > max_res):
            pf = ImageOps.contain(pf, (max_res, max_res), Image.LANCZOS)
        pil_frames.append(pf)
    # yuv420p requires even dimensions.
    w0, h0 = pil_frames[0].width, pil_frames[0].height
    out_w, out_h = w0 & ~1, h0 & ~1
    if (out_w, out_h) != (w0, h0):
        pil_frames = [pf.resize((out_w, out_h), Image.LANCZOS) for pf in pil_frames]
    if out_w < _NVENC_MIN_W or out_h < _NVENC_MIN_H:
        return None, 0, 0
    option_candidates = [
        {"preset": "p1", "rc": "vbr", "cq": "23"},
        {"preset": "p1"},
    ]
    last_err = None
    for opts in option_candidates:
        buf = pyio.BytesIO()
        try:
            container = av.open(
                buf, mode="w", format="mp4",
                options={"movflags": "frag_keyframe+empty_moov+default_base_moof"},
            )
            stream = container.add_stream("h264_nvenc", rate=int(max(1, fps)))
            stream.width = out_w
            stream.height = out_h
            stream.pix_fmt = "yuv420p"
            stream.options = opts
            for pf in pil_frames:
                for pkt in stream.encode(av.VideoFrame.from_image(pf)):
                    container.mux(pkt)
            for pkt in stream.encode():
                container.mux(pkt)
            container.close()
            return base64.b64encode(buf.getvalue()).decode("ascii"), out_w, out_h
        except Exception as e:
            last_err = e
            continue
    if not _nvenc_warned:
        _nvenc_warned = True
        logging.warning(f"[MiniMax H3 PreviewOverride] NVENC MP4 encode failed, using WebP fallback: {last_err}")
    return None, 0, 0


def _encode_animated_webp(frames, fps, quality, max_res):
    if not frames:
        return None, 0, 0
    pil_frames = []
    for f in frames:
        pf = f if f.mode == "RGB" else f.convert("RGB")
        if max_res and max_res > 0 and (pf.width > max_res or pf.height > max_res):
            pf = ImageOps.contain(pf, (max_res, max_res), Image.LANCZOS)
        pil_frames.append(pf)
    duration_ms = max(1, int(round(1000 / max(1, fps))))
    buf = pyio.BytesIO()
    try:
        pil_frames[0].save(
            buf,
            format="WEBP",
            save_all=True,
            append_images=pil_frames[1:],
            duration=duration_ms,
            loop=0,
            quality=quality,
            method=4,
        )
    except Exception as e:
        logging.warning(f"Animated WebP encode failed: {e}")
        return None, 0, 0
    return base64.b64encode(buf.getvalue()).decode("ascii"), pil_frames[0].width, pil_frames[0].height


class _H3PreviewOverrideWrapper:
    def __init__(self, max_resolution, node_id, jpeg_quality, suppress_default,
                 preview_frames=1, preview_fps=12, vae=None):
        self.max_resolution = max_resolution
        self.node_id = str(node_id) if node_id is not None else None
        self.jpeg_quality = jpeg_quality
        self.suppress_default = suppress_default
        self.preview_frames = preview_frames
        self.preview_fps = preview_fps
        self.frames = []
        # Only tiny autoencoders (TAEHV/TAESD) are allowed as per-step decoders.
        # A full video VAE would eat VRAM every step ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ignore it and stay on Latent2RGB.
        self.vae = None
        self._tiny_vae = False
        if vae is not None:
            try:
                cls_name = vae.first_stage_model.__class__.__name__
                if cls_name in ("TAEHV", "TAESD", "PezDummyVAE"):
                    self.vae = vae
                    self._tiny_vae = True
                else:
                    logging.warning(
                        f"[MiniMax H3 PreviewOverride] VAE ({cls_name}) is not a tiny decoder "
                        f"(TAEHV/TAESD) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ignoring it, using Latent2RGB. Full video VAEs are too "
                        f"heavy for per-step previews; use MiniMax H3 Tiny VAE Loader instead."
                    )
            except Exception:
                pass

    def __call__(self, executor, noise, latent_image, sampler, sigmas, denoise_mask,
                 callback, disable_pbar, seed, latent_shapes):
        guider = executor.class_obj
        model_patcher = guider.model_patcher
        latent_format = model_patcher.model.latent_format

        # Preflight: a tiny decoder must match the model's video latent channels (H3 = 24).
        # A mismatched TAE (e.g. the 128-channel LTX2 tae) physically cannot decode H3 latents
        # ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â disable it with one clear warning instead of failing every step.
        if self._tiny_vae:
            try:
                want = latent_shapes[0][1] if latent_shapes and len(latent_shapes) > 0 \
                    else getattr(latent_format, "latent_channels", None)
                have = getattr(self.vae, "latent_channels", None)
                if want is not None and have is not None and have != want:
                    logging.warning(
                        f"[MiniMax H3 PreviewOverride] Loaded TAE has {have} latent channels but "
                        f"the model needs {want} ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â it cannot decode these latents. TAE previews "
                        f"disabled, using Latent2RGB. (LTX/Wan TAEs are incompatible with H3; "
                        f"a 24-channel H3 TAE is required.)"
                    )
                    self._tiny_vae = False
            except Exception:
                pass

        # H3's MiniMaxH3AV has no taesd_decoder_name, so the core previewer is Latent2RGB.
        previewer = _get_core_previewer(model_patcher.load_device, latent_format)
        # Explicit Latent2RGB built from the format's own factors (24ch video stream).
        fallback_previewer = None
        try:
            rgb_factors = getattr(latent_format, "latent_rgb_factors", None)
            if rgb_factors is not None:
                fallback_previewer = latent_preview.Latent2RGBPreviewer(
                    rgb_factors,
                    getattr(latent_format, "latent_rgb_factors_bias", None),
                    getattr(latent_format, "latent_rgb_factors_reshape", None),
                )
        except Exception:
            pass

        original_callback = callback
        node_id = self.node_id
        max_res = self.max_resolution
        quality = self.jpeg_quality
        self.frames = []

        sigmas_list = sigmas.detach().cpu().tolist() if sigmas is not None else []

        # Pre-seed so step 1 has a measurable ÃƒÅ½Ã¢â‚¬Â (model's first transformation noise -> x0).
        initial_video_cpu = None
        try:
            if sigmas is not None and len(sigmas) > 0:
                s0 = sigmas[0].to(noise.device) if hasattr(sigmas[0], "to") else sigmas[0]
                seeded = noise * s0  # flat packed tensor at OUTER_SAMPLE level
                initial_video_cpu = _video_part(seeded, latent_shapes).detach().float().cpu()
        except Exception as e:
            logging.warning(f"[MiniMax H3 PreviewOverride] initial seed ÃƒÅ½Ã¢â‚¬Â pre-fill failed: {e}")

        state = {"last_video_gpu": None, "last_time": None, "step_ms_window": []}
        total_steps_init = max(0, len(sigmas_list) - 1)

        if node_id is not None and PromptServer is not None:
            init_payload = {
                "node_id": str(node_id),
                "step": 0,
                "total": total_steps_init,
                "sigma": sigmas_list[0] if sigmas_list else None,
                "sigmas": sigmas_list,
            }
            try:
                pil_init = None
                if initial_video_cpu is not None and initial_video_cpu.ndim == 5:
                    if fallback_previewer is not None:
                        out = fallback_previewer.decode_latent_to_preview(initial_video_cpu)
                        if isinstance(out, Image.Image):
                            pil_init = out
                if pil_init is not None:
                    if pil_init.mode != "RGB":
                        pil_init = pil_init.convert("RGB")
                    if max_res and max_res > 0 and (pil_init.width > max_res or pil_init.height > max_res):
                        pil_init = ImageOps.contain(pil_init, (max_res, max_res), Image.LANCZOS)
                    ibuf = pyio.BytesIO()
                    pil_init.save(ibuf, format="JPEG", quality=quality)
                    init_payload["image"] = base64.b64encode(ibuf.getvalue()).decode("ascii")
                    init_payload["w"] = pil_init.width
                    init_payload["h"] = pil_init.height
            except Exception as e:
                logging.warning(f"Initial noise preview failed (sigmas still sent): {e}")
            PromptServer.instance.send_sync("pez_minimax_preview", init_payload, PromptServer.instance.client_id)
            PromptServer.instance.send_sync("minimax_h3_preview_override", init_payload, PromptServer.instance.client_id)

        encoder = _AsyncPreviewEncoder()
        animate_video = self.preview_frames > 1
        anim_frames = self.preview_frames
        anim_fps = self.preview_fps

        def new_callback(step, x0, x, total_steps_):
            if previewer is not None or fallback_previewer is not None:
                try:
                    video = _video_part(x0, latent_shapes)
                    if not isinstance(video, torch.Tensor):
                        raise TypeError(f"unexpected x0 type: {type(video).__name__}")

                    pil_frames = []
                    if self._tiny_vae and video.ndim == 5:
                        pil_frames = _tae_decode_to_pil(
                            self.vae, video, max_frames=anim_frames if animate_video else 1,
                        )
                    if not pil_frames and animate_video and video.ndim == 5:
                        pil_frames = _decode_video_frames_l2rgb(video, latent_format, anim_frames)
                    if not pil_frames:
                        for prev in (previewer, fallback_previewer):
                            if prev is None:
                                continue
                            try:
                                out = prev.decode_latent_to_preview(video)
                            except Exception as e:
                                if prev is previewer:
                                    logging.warning(f"Active previewer raised, trying Latent2RGB fallback: {e}")
                                continue
                            if isinstance(out, Image.Image):
                                pil_frames = [out]
                                break
                            elif prev is previewer:
                                logging.warning(
                                    f"[MiniMax H3 PreviewOverride] {type(previewer).__name__} returned "
                                    f"{type(out).__name__} instead of PIL.Image ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â falling back to Latent2RGB."
                                )

                    if not pil_frames:
                        if original_callback is not None:
                            original_callback(step, x0, x, total_steps_)
                        return

                    pil_first = pil_frames[0]
                    if pil_first.mode != "RGB":
                        pil_first = pil_first.convert("RGB")
                        pil_frames[0] = pil_first
                    # Kept so a second run could reuse captured frames if needed.
                    self.frames.append(pil_first)

                    if node_id is not None and PromptServer is not None:
                        # ÃƒÅ½Ã¢â‚¬Â over the video stream only; computed on GPU to avoid a per-step
                        # full-latent CPU copy (keeps one latent in VRAM instead).
                        delta_v = None
                        try:
                            video_cur = video.detach()
                            prev = state["last_video_gpu"]
                            if prev is not None and prev.shape == video_cur.shape:
                                diff = video_cur.float().sub(prev.float())
                                delta_v = (diff.norm() / max(1, diff.numel()) ** 0.5).item()
                            state["last_video_gpu"] = video_cur
                        except Exception as e:
                            logging.warning(f"[MiniMax H3 PreviewOverride] ÃƒÅ½Ã¢â‚¬Â failed: {e}")

                        now = time.perf_counter()
                        step_ms = None
                        if state["last_time"] is not None:
                            step_ms = (now - state["last_time"]) * 1000.0
                            w = state["step_ms_window"]
                            w.append(step_ms)
                            if len(w) > 8:
                                w.pop(0)
                        state["last_time"] = now
                        avg_step_ms = (sum(state["step_ms_window"]) / len(state["step_ms_window"])) if state["step_ms_window"] else None
                        sigma_val = sigmas_list[step] if 0 <= step < len(sigmas_list) else None
                        sent_step = step + 1

                        def _encode_and_send(
                            pil_frames=pil_frames, step_ms=step_ms, avg_step_ms=avg_step_ms,
                            sigma_val=sigma_val, sent_step=sent_step, total_steps_=total_steps_,
                            delta_v=delta_v,
                        ):
                            if len(pil_frames) > 1:
                                b64, w_, h_, mime = None, 0, 0, None
                                if _NVENC_AVAILABLE:
                                    b64, w_, h_ = _encode_mp4_nvenc(pil_frames, anim_fps, max_res)
                                    if b64:
                                        mime = "video/mp4"
                                if not b64:
                                    b64, w_, h_ = _encode_animated_webp(pil_frames, anim_fps, quality, max_res)
                                    mime = "image/webp"
                            else:
                                pil_send = pil_frames[0]
                                if max_res and max_res > 0 and (pil_send.width > max_res or pil_send.height > max_res):
                                    pil_send = ImageOps.contain(pil_send, (max_res, max_res), Image.LANCZOS)
                                buf = pyio.BytesIO()
                                pil_send.save(buf, format="JPEG", quality=quality)
                                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                                w_, h_ = pil_send.width, pil_send.height
                                mime = "image/jpeg"

                            if not b64:
                                return

                            payload = {
                                "node_id": str(node_id),
                                "image": b64,
                                "mime": mime,
                                "w": w_,
                                "h": h_,
                                "step": sent_step,
                                "total": total_steps_,
                                "sigma": sigma_val,
                                "sigmas": None,
                                "delta": delta_v,
                                "step_ms": step_ms,
                                "avg_step_ms": avg_step_ms,
                                "fps": anim_fps if mime in ("video/mp4", "image/webp") else None,
                            }
                            PromptServer.instance.send_sync("pez_minimax_preview", payload, PromptServer.instance.client_id)
                            PromptServer.instance.send_sync("minimax_h3_preview_override", payload, PromptServer.instance.client_id)

                        encoder.submit(_encode_and_send)
                except Exception as e:
                    logging.warning(f"[MiniMax H3 PreviewOverride] step preview failed: {e}")
            if original_callback is not None:
                original_callback(step, x0, x, total_steps_)

        # Suppress every concrete decode_latent_to_preview_image so only this node's
        # preview updates while sampling (progress bar still advances).
        prev_methods = []
        if self.suppress_default:
            targets = [latent_preview.LatentPreviewer]
            stack = list(latent_preview.LatentPreviewer.__subclasses__())
            while stack:
                cls = stack.pop()
                targets.append(cls)
                stack.extend(cls.__subclasses__())
            for cls in targets:
                if "decode_latent_to_preview_image" in cls.__dict__:
                    prev_methods.append((cls, cls.__dict__["decode_latent_to_preview_image"]))
                    cls.decode_latent_to_preview_image = _suppressed_preview_image
        try:
            state["last_time"] = time.perf_counter()
            return executor(noise, latent_image, sampler, sigmas, denoise_mask, new_callback,
                            disable_pbar, seed, latent_shapes=latent_shapes)
        finally:
            encoder.shutdown(drain_timeout=5.0)
            for cls, prev in prev_methods:
                cls.decode_latent_to_preview_image = prev
            # Don't keep the last sampled latent pinned on GPU after the run.
            state["last_video_gpu"] = None




class PezDummyVAE:
    def __init__(self, sd):
        import comfy.taesd.taehv
        import comfy.model_management
        import comfy.latent_formats
        self.first_stage_model = comfy.taesd.taehv.TAEHV(latent_channels=24, latent_format=comfy.latent_formats.HunyuanVideo)
        import torch
        self.first_stage_model.decoder[22] = torch.nn.Conv2d(64, 3, kernel_size=3, padding=1, dtype=torch.float16)
        self.first_stage_model.patch_size = 1
        self.first_stage_model.load_state_dict(sd, strict=False)
        self.first_stage_model.eval()
        self.device = comfy.model_management.get_torch_device()
        self.first_stage_model.to(self.device, dtype=torch.float16)
    
    def decode(self, x):
        import torch
        import torch.nn.functional as F
        import comfy.taesd.taehv
        import comfy.model_management
        x = x.to(self.device, dtype=torch.float16)
        model = self.first_stage_model
        x = x.unsqueeze(0) if x.ndim == 4 else x
        x = x.movedim(1, 2) if x.shape[1] != model.latent_channels else x
        x = model.process_in(x).movedim(2, 1)
        single_frame = x.shape[1] == 1
        x = comfy.taesd.taehv.apply_model_with_memblocks(
            model.decoder, x, model.parallel, model.show_progress_bar,
            output_device=comfy.model_management.intermediate_device(),
            patch_size=model.patch_size, decode=True
        )
        if not single_frame:
            chunk_frames = 5 * model.t_upscale
            x = F.pad(x, (0, 0, 0, 0, 0, 0, 0, -x.shape[1] % chunk_frames))
            x = x.unflatten(1, (-1, chunk_frames))[:, :, model.frames_to_trim:].flatten(1, 2)
            out = x[:, :-3 * model.t_upscale].movedim(2, 1)
        else:
            out = x[:, model.frames_to_trim:].movedim(2, 1)
        out = out.movedim(1, -1)
        return out.cpu()

def _pez_load_tiny_vae(vae_name):
    import comfy.utils
    import folder_paths
    import logging
    path = folder_paths.get_full_path_or_raise("vae_approx", vae_name)
    sd = comfy.utils.load_torch_file(path)
    try:
        return PezDummyVAE(sd)
    except Exception as e:
        logging.warning(f"[Pez MiniMax Preview] No se pudo cargar TAE '{vae_name}': {e}")
        return None

class PezMiniMaxPreview:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "modelo": ("MODEL", {"tooltip": "El modelo base a previsualizar."}),
                "enable_preview": ("BOOLEAN", {"default": True, "label_on": "Habilitado", "label_off": "Deshabilitado", "tooltip": "Activa o desactiva la previsualización en tiempo real."}),
                "quality": (["Low (Baja)", "Medium (Media)", "High (Alta)", "Baja", "Media", "Alta"], {"default": "High (Alta)", "tooltip": "Calidad y resolución de la previsualización."}),
            },
            "optional": {
                "tiny_vae": ("VAE", {"tooltip": "Opcional: Si tienes un Tiny VAE específico (ej. TAEH3), conéctalo aquí."}),
            },
            "hidden": {"unique_id": "UNIQUE_ID"}
        }

    RETURN_TYPES = ("MODEL",)
    RETURN_NAMES = ("modelo",)
    FUNCTION = "execute"
    CATEGORY = "Pez/MiniMax"

    def execute(self, modelo=None, enable_preview=True, quality="High (Alta)", tiny_vae=None, unique_id=None, model=None, **kwargs):
        target_model = modelo if modelo is not None else model
        if not enable_preview:
            return (target_model,)
        
        m = target_model.clone()
        
        q_map = {
            "Baja": (256, 1, 12, 60),
            "Low (Baja)": (256, 1, 12, 60),
            "Media": (512, 3, 12, 75),
            "Medium (Media)": (512, 3, 12, 75),
            "Alta": (768, 6, 12, 85),
            "High (Alta)": (768, 6, 12, 85)
        }
        max_res, anim_frames, anim_fps, jpeg_q = q_map.get(quality, q_map["Alta"])
        
        vae_name = "taeh3_decoder.safetensors"
        if tiny_vae is None and vae_name:
            tiny_vae = _pez_load_tiny_vae(vae_name)

        cb = _H3PreviewOverrideWrapper(
            max_resolution=max_res,
            node_id=unique_id or getattr(self, "pez_id", None) or "288",
            jpeg_quality=jpeg_q,
            suppress_default=True,
            preview_frames=anim_frames,
            preview_fps=anim_fps,
            vae=tiny_vae,
        )
        import comfy.patcher_extension
        m.add_wrapper_with_key(comfy.patcher_extension.WrappersMP.OUTER_SAMPLE, "minimax_h3_preview_override", cb)
        return (m,)

    @classmethod
    def IS_CHANGED(s, **kwargs):
        return float("NaN")

NODE_CLASS_MAPPINGS = {
    "PezMiniMaxPreview": PezMiniMaxPreview
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezMiniMaxPreview": "🐟 Pez MiniMax Preview"
}




