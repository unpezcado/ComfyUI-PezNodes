import json
import math
import os
import re
import cv2
import wave
import time
import shutil
import datetime
import subprocess
import numpy as np
import torch
import folder_paths

# Registro de endpoint para guardado instantáneo desde el preview sin re-generar
try:
    from server import PromptServer
    from aiohttp import web

    if hasattr(PromptServer, "instance") and PromptServer.instance and hasattr(PromptServer.instance, "routes"):
        @PromptServer.instance.routes.get("/pez/pick_folder")
        async def pez_pick_folder_handler(request):
            try:
                import sys
                import shutil
                import subprocess
                import asyncio
                import folder_paths

                start_path = request.query.get("path", "").strip()
                comfy_out = os.path.abspath(folder_paths.get_output_directory())

                def _open_dialog():
                    init_dir = comfy_out
                    if start_path:
                        if os.path.isabs(start_path) and os.path.isdir(start_path):
                            init_dir = start_path
                        else:
                            candidate = os.path.abspath(os.path.join(comfy_out, start_path))
                            if os.path.isdir(candidate):
                                init_dir = candidate

                    if sys.platform == "win32":
                        ps = (
                            "Add-Type -AssemblyName System.Windows.Forms;"
                            "$r='';"
                            "$o=New-Object System.Windows.Forms.Form;"
                            "$o.TopMost=$true;$o.ShowInTaskbar=$false;$o.FormBorderStyle='None';"
                            "$o.Width=1;$o.Height=1;$o.Opacity=0;$o.StartPosition='CenterScreen';"
                            "$o.Add_Shown({"
                            "$o.Activate();"
                            "$d=New-Object System.Windows.Forms.FolderBrowserDialog;"
                            "$d.Description='Selecciona la carpeta de destino para guardar tus videos';"
                            "$d.ShowNewFolderButton=$true;"
                            "if($env:PEZ_START){try{$d.SelectedPath=$env:PEZ_START}catch{}};"
                            "if($d.ShowDialog($o) -eq [System.Windows.Forms.DialogResult]::OK){$script:r=$d.SelectedPath};"
                            "$o.Close()"
                            "});"
                            "[void]$o.ShowDialog();"
                            "[Console]::Out.Write($r)"
                        )
                        env = dict(os.environ)
                        env["PEZ_START"] = init_dir
                        out = subprocess.run(
                            ["powershell", "-NoProfile", "-STA", "-Command", ps],
                            capture_output=True, text=True, timeout=300, env=env,
                            creationflags=0x08000000,
                        )
                        return (out.stdout or "").strip()
                    elif sys.platform == "darwin":
                        script = f'POSIX path of (choose folder with prompt "Selecciona la carpeta de destino" default location POSIX file "{init_dir}")'
                        out = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=300)
                        return (out.stdout or "").strip().rstrip("/") if out.returncode == 0 else ""
                    else:
                        if shutil.which("zenity"):
                            out = subprocess.run(["zenity", "--file-selection", "--directory", f"--filename={init_dir}/"], capture_output=True, text=True, timeout=300)
                            return (out.stdout or "").strip() if out.returncode == 0 else ""
                        elif shutil.which("kdialog"):
                            out = subprocess.run(["kdialog", "--getexistingdirectory", init_dir], capture_output=True, text=True, timeout=300)
                            return (out.stdout or "").strip() if out.returncode == 0 else ""
                        return ""

                loop = asyncio.get_running_loop()
                chosen_path = await loop.run_in_executor(None, _open_dialog)

                if not chosen_path:
                    return web.json_response({"success": False, "cancelled": True})

                chosen_path = os.path.abspath(chosen_path)
                
                try:
                    rel = os.path.relpath(chosen_path, comfy_out)
                    if not rel.startswith("..") and rel != ".":
                        display_path = rel.replace("\\", "/")
                    elif rel == ".":
                        display_path = "output"
                    else:
                        display_path = chosen_path.replace("\\", "/")
                except Exception:
                    display_path = chosen_path.replace("\\", "/")

                return web.json_response({
                    "success": True,
                    "full_path": chosen_path.replace("\\", "/"),
                    "display_path": display_path
                })
            except Exception as e:
                return web.json_response({"success": False, "error": str(e)})

        @PromptServer.instance.routes.post("/pez/save_video_file")
        async def pez_save_video_file_handler(request):
            try:
                data = await request.json()
                temp_filename = data.get("temp_filename") or data.get("filename")
                subfolder = data.get("subfolder", "").strip()
                target_dir = data.get("target_dir", "output").strip()
                final_name = data.get("final_name", "").strip()

                temp_dir = folder_paths.get_temp_directory()
                src_path = os.path.join(temp_dir, subfolder, temp_filename) if subfolder else os.path.join(temp_dir, temp_filename)
                if not os.path.exists(src_path):
                    src_path = os.path.join(temp_dir, temp_filename)
                if not os.path.exists(src_path):
                    return web.json_response({"success": False, "error": f"No se encontró el archivo temporal: {temp_filename}"})

                comfy_out = folder_paths.get_output_directory()
                if target_dir.lower() in ("output", "", "./output"):
                    dest_dir = comfy_out
                elif os.path.isabs(target_dir):
                    dest_dir = target_dir
                elif target_dir.lower().startswith("output/") or target_dir.lower().startswith("output\\"):
                    dest_dir = os.path.join(comfy_out, target_dir[7:])
                else:
                    dest_dir = os.path.join(comfy_out, target_dir)

                os.makedirs(dest_dir, exist_ok=True)
                if not final_name:
                    final_name = temp_filename
                dest_path = os.path.join(dest_dir, final_name)
                shutil.copyfile(src_path, dest_path)
                return web.json_response({"success": True, "saved_path": dest_path, "saved_filename": os.path.basename(dest_path)})
            except Exception as e:
                return web.json_response({"success": False, "error": str(e)})
except Exception:
    pass


class PezVideoSaveCompare:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "video": ("IMAGE,VIDEO", {"tooltip": "Fotogramas del video (IMAGE) o stream nativo de video (VIDEO de LTX/ComfyUI)"}),
                "fps": ("FLOAT", {"default": 24.0, "min": 1.0, "max": 120.0, "step": 0.1, "tooltip": "Frames por segundo del video"}),
                "save_mode": (["Guardar Video", "Solo Preview"], {"default": "Guardar Video", "pez_button": True}),
                "output_dir": ("STRING", {"default": "output", "multiline": False, "tooltip": "Carpeta de destino (relativa o absoluta)"}),
                "filename_pattern": ("STRING", {"default": "[name]_[date]_[time]_[counter]", "multiline": False, "tooltip": "Patrón con tags interactivos"}),
                "calidad": (["Alta (CRF 20)", "Máxima (CRF 17)", "Media (CRF 24)"], {"default": "Alta (CRF 20)", "pez_button": True}),
                "formato": (["MP4 (H.264)", "WebM (VP9)"], {"default": "MP4 (H.264)", "pez_button": True}),
            },
            "optional": {
                "name": ("STRING", {"forceInput": True, "tooltip": "Entrada para conectar el texto o prefijo del nombre"}),
                "audio": ("AUDIO", {"tooltip": "Pista de audio opcional a multiplexar en el video"}),
                "video_previo": ("IMAGE,VIDEO", {"tooltip": "Video anterior / previo para comparativa A/B (acepta IMAGE o VIDEO)"}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("STRING", "IMAGE,VIDEO")
    RETURN_NAMES = ("ruta de guardado (string)", "video (image,video)")
    OUTPUT_NODE = True
    FUNCTION = "save_and_compare"
    CATEGORY = "Pez/Video"

    def _sanitize_filename(self, filename):
        cleaned = re.sub(r'[\\/*?:"<>|]', '_', filename)
        cleaned = re.sub(r'[\r\n\t]', '', cleaned).strip(' ._')
        return cleaned or "PezVideo"

    def _get_next_counter(self, target_dir, prefix):
        if not os.path.exists(target_dir):
            return "0001"
        try:
            files = os.listdir(target_dir)
            pattern = re.compile(rf"{re.escape(prefix)}.*?_(\d{{4,}})\.(mp4|webm)$", re.IGNORECASE)
            max_num = 0
            for f in files:
                m = pattern.search(f)
                if m:
                    val = int(m.group(1))
                    if val > max_num:
                        max_num = val
            if max_num > 0:
                return f"{max_num + 1:04d}"
            matching = [f for f in files if f.lower().endswith(('.mp4', '.webm'))]
            return f"{len(matching) + 1:04d}"
        except Exception:
            return "0001"

    def _export_audio_to_wav(self, audio_dict, temp_wav_path):
        try:
            if not audio_dict or "waveform" not in audio_dict or "sample_rate" not in audio_dict:
                return False
            waveform = audio_dict["waveform"]
            sample_rate = int(audio_dict["sample_rate"])
            
            if isinstance(waveform, torch.Tensor):
                wf = waveform.detach().cpu().float()
                if wf.ndim == 3: wf = wf[0]
                channels = wf.shape[0]
                wf = wf.clamp(-1.0, 1.0).numpy()
            elif isinstance(waveform, np.ndarray):
                wf = waveform
                if wf.ndim == 3: wf = wf[0]
                channels = wf.shape[0]
                wf = np.clip(wf, -1.0, 1.0)
            else:
                return False

            audio_int16 = (wf * 32767).astype(np.int16)
            interleaved = audio_int16.T.reshape(-1)

            with wave.open(temp_wav_path, "wb") as wav_file:
                wav_file.setnchannels(channels)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(interleaved.tobytes())
            return True
        except Exception as e:
            print(f"[Pez Video Save] Advertencia: No se pudo exportar audio temporal: {e}")
            return False

    @staticmethod
    def _json_safe(obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return obj
        if isinstance(obj, dict):
            return {str(k): PezVideoSaveCompare._json_safe(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [PezVideoSaveCompare._json_safe(v) for v in obj]
        return obj

    @staticmethod
    def _escape_ffmetadata(value):
        out = []
        for ch in value:
            if ch in ("=", ";", "#", "\\"):
                out.append("\\")
                out.append(ch)
            elif ch == "\n":
                out.append("\\\n")
            elif ch == "\r":
                pass
            else:
                out.append(ch)
        return "".join(out)

    def _create_ffmetadata_file(self, temp_dir, prompt=None, extra_pnginfo=None):
        try:
            from comfy.cli_args import args
            if getattr(args, "disable_metadata", False):
                return None, None
        except Exception:
            pass

        meta_dict = {}
        if isinstance(extra_pnginfo, dict):
            wf = extra_pnginfo.get("workflow")
            if wf is not None:
                meta_dict["workflow"] = wf
        if prompt is not None:
            meta_dict["prompt"] = prompt

        if not meta_dict:
            return None, None

        try:
            safe_tags = {k: json.dumps(self._json_safe(v)) for k, v in meta_dict.items()}
        except Exception as e:
            print(f"[Pez Video Save] Error serializando metadata: {e}")
            return None, None

        meta_path = os.path.join(temp_dir, f"temp_pez_meta_{int(time.time() * 1000)}.txt")
        try:
            with open(meta_path, "w", encoding="utf-8") as mf:
                mf.write(";FFMETADATA1\n")
                for k, v in safe_tags.items():
                    mf.write(f"{k}={self._escape_ffmetadata(v)}\n")
            return meta_path, safe_tags
        except Exception as e:
            print(f"[Pez Video Save] Error guardando ffmetadata: {e}")
            return None, None

    def _encode_tensor_video(self, tensor_video, fps, out_path, ext, crf, audio_wav=None, metadata_file=None, metadata_dict=None):
        num_frames, height, width, _ = tensor_video.shape

        pad_w = width % 2
        pad_h = height % 2
        adj_w = width + pad_w
        adj_h = height + pad_h

        if isinstance(tensor_video, torch.Tensor):
            frames_np = (tensor_video.detach().cpu().numpy() * 255.0).clip(0, 255).astype(np.uint8)
        else:
            frames_np = (np.array(tensor_video) * 255.0).clip(0, 255).astype(np.uint8)

        if pad_w > 0 or pad_h > 0:
            padded_frames = np.zeros((num_frames, adj_h, adj_w, 3), dtype=np.uint8)
            padded_frames[:, :height, :width, :] = frames_np
            frames_np = padded_frames
            width, height = adj_w, adj_h

        cmd = [
            'ffmpeg', '-y',
            '-f', 'rawvideo',
            '-vcodec', 'rawvideo',
            '-s', f'{width}x{height}',
            '-pix_fmt', 'rgb24',
            '-r', str(fps),
            '-i', '-'
        ]

        curr_input_idx = 1
        has_audio = audio_wav and os.path.exists(audio_wav)
        if has_audio:
            cmd.extend(['-i', audio_wav])
            curr_input_idx += 1

        has_meta = metadata_file and os.path.exists(metadata_file)
        if has_meta:
            cmd.extend(['-i', metadata_file, '-map_metadata', str(curr_input_idx)])

        if ext == '.mp4':
            cmd.extend([
                '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p',
                '-crf', str(crf),
                '-preset', 'fast',
                '-movflags', 'use_metadata_tags+faststart'
            ])
            if has_audio:
                cmd.extend(['-c:a', 'aac', '-b:a', '192k', '-shortest'])
        else:
            cmd.extend([
                '-c:v', 'libvpx-vp9',
                '-crf', str(crf),
                '-b:v', '0',
                '-pix_fmt', 'yuv420p'
            ])
            if has_audio:
                cmd.extend(['-c:a', 'libopus', '-b:a', '128k', '-shortest'])

        cmd.append(out_path)

        try:
            proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            proc.communicate(input=frames_np.tobytes())
            if proc.returncode == 0 and os.path.exists(out_path):
                return True
        except Exception as e:
            print(f"[Pez Video Save] FFmpeg error: {e}. Probando PyAV...")

        try:
            import av
            container = av.open(out_path, mode='w', format='mp4' if ext == '.mp4' else 'webm')
            if metadata_dict:
                for k, v in metadata_dict.items():
                    container.metadata[k] = v if isinstance(v, str) else json.dumps(v)
            stream = container.add_stream('h264' if ext == '.mp4' else 'vp9', rate=int(round(fps)))
            stream.width = width
            stream.height = height
            stream.pix_fmt = 'yuv420p'
            for i in range(num_frames):
                frame = av.VideoFrame.from_ndarray(frames_np[i], format='rgb24')
                for packet in stream.encode(frame):
                    container.mux(packet)
            for packet in stream.encode():
                container.mux(packet)
            container.close()
            return True
        except Exception as e:
            print(f"[Pez Video Save] PyAV fallback falló: {e}")
            return False

    def save_and_compare(self, video, fps, save_mode, output_dir, filename_pattern, calidad, formato, 
                         name=None, audio=None, video_previo=None, prompt=None, extra_pnginfo=None, unique_id=None):
        if video is None:
            raise ValueError("Pez Video Save & Compare: La entrada 'video' no puede ser nula.")

        original_video = video

        # Manejar si video es un objeto nativo ComfyUI Video (como el de Decode LTX)
        if hasattr(video, "get_components"):
            comp = video.get_components()
            if hasattr(comp, "images") and comp.images is not None:
                if audio is None and hasattr(comp, "audio") and comp.audio is not None:
                    audio = comp.audio
                if hasattr(comp, "frame_rate") and comp.frame_rate:
                    try:
                        detected_fps = float(comp.frame_rate)
                        if detected_fps > 0 and fps == 24.0:
                            fps = detected_fps
                    except Exception:
                        pass
                video = comp.images

        # Manejar si video_previo es un objeto nativo ComfyUI Video
        if video_previo is not None and hasattr(video_previo, "get_components"):
            comp_prev = video_previo.get_components()
            if hasattr(comp_prev, "images") and comp_prev.images is not None:
                video_previo = comp_prev.images

        if len(video) == 0:
            raise ValueError("Pez Video Save & Compare: La entrada 'video' no contiene fotogramas.")

        try:
            fps = float(fps)
            if fps <= 0: fps = 24.0
        except Exception:
            fps = 24.0

        num_frames, height, width, _ = video.shape
        duration_sec = num_frames / fps

        formato_str = str(formato) if formato else "MP4"
        ext = ".webm" if "WebM" in formato_str else ".mp4"

        calidad_str = str(calidad) if calidad else "Alta"
        if "17" in calidad_str: crf = 17
        elif "24" in calidad_str: crf = 24
        else: crf = 20

        seed_str = "0"
        if prompt:
            try:
                for k, v in prompt.items():
                    if isinstance(v, dict) and "inputs" in v and "seed" in v["inputs"]:
                        seed_str = str(v["inputs"]["seed"])
                        break
            except Exception: pass

        temp_dir = folder_paths.get_temp_directory()
        comfy_output_dir = folder_paths.get_output_directory()

        is_preview_only = (save_mode == "Solo Preview")

        if is_preview_only:
            target_dir = temp_dir
        else:
            cleaned_out = output_dir.strip()
            if cleaned_out.lower() in ("output", "", "./output"):
                target_dir = comfy_output_dir
            elif os.path.isabs(cleaned_out):
                target_dir = cleaned_out
            elif cleaned_out.lower().startswith("output/") or cleaned_out.lower().startswith("output\\"):
                target_dir = os.path.join(comfy_output_dir, cleaned_out[7:])
            else:
                target_dir = os.path.join(comfy_output_dir, cleaned_out)

        os.makedirs(target_dir, exist_ok=True)

        now = datetime.datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        
        base_name = "PezVideo"
        if name is not None and isinstance(name, str) and name.strip():
            base_name = name.strip()
        clean_name = self._sanitize_filename(base_name)

        counter_str = self._get_next_counter(target_dir, clean_name)

        fn_pattern = filename_pattern or "[name]_[date]_[time]_[counter]"
        tags = {
            r"\[name\]": clean_name,
            r"\[date\]": date_str,
            r"\[time\]": time_str,
            r"\[counter\]": counter_str,
            r"\[seed\]": seed_str,
            r"\[fps\]": f"{int(fps) if fps.is_integer() else fps}fps",
            r"\[width\]": str(width),
            r"\[height\]": str(height),
            r"\[duration\]": f"{duration_sec:.1f}s"
        }

        filename_resolved = fn_pattern
        for tag_regex, val in tags.items():
            filename_resolved = re.sub(tag_regex, str(val), filename_resolved, flags=re.IGNORECASE)

        filename_resolved = self._sanitize_filename(filename_resolved)
        final_filename = f"{filename_resolved}{ext}"
        final_filepath = os.path.join(target_dir, final_filename)

        idx = 1
        while os.path.exists(final_filepath) and not is_preview_only:
            final_filename = f"{filename_resolved}_{idx:02d}{ext}"
            final_filepath = os.path.join(target_dir, final_filename)
            idx += 1

        audio_wav_path = None
        if audio is not None:
            temp_wav = os.path.join(temp_dir, f"temp_pez_audio_{int(time.time() * 1000)}.wav")
            if self._export_audio_to_wav(audio, temp_wav):
                audio_wav_path = temp_wav

        meta_file, meta_dict = self._create_ffmetadata_file(temp_dir, prompt=prompt, extra_pnginfo=extra_pnginfo)
        try:
            self._encode_tensor_video(video, fps, final_filepath, ext, crf, audio_wav=audio_wav_path, metadata_file=meta_file, metadata_dict=meta_dict)
        finally:
            if meta_file and os.path.exists(meta_file):
                try:
                    os.unlink(meta_file)
                except Exception:
                    pass

        preview_filename = final_filename
        preview_subfolder = ""
        preview_type = "output"

        # Crear siempre una copia accesible en temp si se guardó en ruta externa
        temp_preview_copy = f"temp_pez_{int(time.time() * 1000)}_{final_filename}"
        temp_preview_path = os.path.join(temp_dir, temp_preview_copy)
        shutil.copyfile(final_filepath, temp_preview_path)

        if is_preview_only:
            preview_type = "temp"
            preview_subfolder = ""
            preview_filename = final_filename
        else:
            try:
                rel = os.path.relpath(target_dir, comfy_output_dir)
                if not rel.startswith(".."):
                    preview_subfolder = ("" if rel == "." else rel).replace("\\", "/")
                    preview_type = "output"
                    preview_filename = final_filename
                else:
                    preview_filename = temp_preview_copy
                    preview_type = "temp"
                    preview_subfolder = ""
            except Exception:
                preview_type = "temp"
                preview_filename = temp_preview_copy

        prev_preview_item = []
        if video_previo is not None and len(video_previo) > 0:
            prev_name = f"pez_prev_{int(time.time() * 1000)}.mp4"
            prev_path = os.path.join(temp_dir, prev_name)
            if self._encode_tensor_video(video_previo, fps, prev_path, ".mp4", crf=22):
                prev_preview_item.append({
                    "filename": prev_name,
                    "subfolder": "",
                    "type": "temp",
                    "format": "video/mp4"
                })

        if audio_wav_path and os.path.exists(audio_wav_path):
            try: os.remove(audio_wav_path)
            except Exception: pass

        ui_payload = {
            "videos": [
                {
                    "filename": preview_filename,
                    "temp_file": temp_preview_copy,
                    "final_name": final_filename,
                    "subfolder": preview_subfolder,
                    "type": preview_type,
                    "format": "video/mp4" if ext == ".mp4" else "video/webm"
                }
            ],
            "video_previo": prev_preview_item
        }

        return {
            "ui": ui_payload,
            "result": (final_filepath, original_video if hasattr(original_video, "get_components") else video)
        }

NODE_CLASS_MAPPINGS = {
    "PezVideoSaveCompare": PezVideoSaveCompare
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PezVideoSaveCompare": "🐟 Pez Video Save & Compare"
}
