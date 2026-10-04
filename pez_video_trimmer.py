import os
import cv2
import torch
import numpy as np
import folder_paths

try:
    from comfy_extras.nodes_audio import load as comfy_load_audio
    HAS_AUDIO = True
except ImportError:
    HAS_AUDIO = False

try:
    from comfy_api.latest import InputImpl
    from comfy_api.latest._input_impl.video_types import VideoComponents, VideoFromComponents
    HAS_VIDEO_IMPL = True
except ImportError:
    HAS_VIDEO_IMPL = False

class PezVideoTrimmer:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        video_extensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.gif']
        video_files = [f for f in files if any(f.lower().endswith(ext) for ext in video_extensions)]
        
        return {
            "required": {
                "video": (sorted(video_files), {"video_upload": True}),
                "start_second": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 99999.0, "step": 0.1}),
                "end_second": ("FLOAT", {"default": 60.0, "min": 0.1, "max": 99999.0, "step": 0.1}),
                "resolution": (["Original", "1920x1080", "1280x720", "1024x1024", "768x768", "512x512", "512x768", "768x512"], {"default": "Original", "pez_button": True}),
                "custom_width": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 8}),
                "custom_height": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 8}),
                "motor_alineacion": (["Exacto", "LTX-Video (8N+1)", "WanVideo (4N+1)"], {"default": "Exacto", "pez_button": True}),
                "segundos_por_lote": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 9999.0, "step": 1.0, "tooltip": "0 para desactivar"}),
            },
            "optional": {
                "video_previo": ("VIDEO", {"tooltip": "Nodo de entrada"}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "AUDIO", "VIDEO", "FLOAT", "INT", "INT", "INT", "FLOAT")
    RETURN_NAMES = ("Video sin audio (IMAGE)", "Solo Audio (AUDIO)", "Video + Audio (VIDEO)", "Velocidad (FPS)", "Total Fotogramas", "Ancho (Width)", "Alto (Height)", "Duraci\u00f3n (Segundos)")
    FUNCTION = "trim_video"
    CATEGORY = "Pez/Video"

    def trim_video(self, video, start_second, end_second, resolution, custom_width, custom_height, motor_alineacion="Exacto", segundos_por_lote=0.0, video_previo=None):
        if video_previo is not None:
            try:
                components = video_previo.get_components()
                original_fps = float(components.frame_rate)
                if original_fps <= 0: original_fps = 24.0
                start_frame = int(start_second * original_fps)
                end_frame = int(end_second * original_fps)
                
                if segundos_por_lote > 0.0 and motor_alineacion != "Exacto":
                    frames_por_lote = int(segundos_por_lote * original_fps)
                    if motor_alineacion == "LTX-Video (8N+1)":
                        frames_por_lote = ((frames_por_lote - 1) // 8) * 8 + 1
                    elif motor_alineacion == "WanVideo (4N+1)":
                        frames_por_lote = ((frames_por_lote - 1) // 4) * 4 + 1
                    start_lote = start_frame // frames_por_lote
                    end_lote = end_frame // frames_por_lote
                    start_frame = start_lote * frames_por_lote
                    end_frame = end_lote * frames_por_lote
                
                all_images = components.images
                end_frame = min(end_frame, len(all_images))
                start_frame = min(start_frame, end_frame - 1)
                if start_frame < 0: start_frame = 0
                sliced_images = all_images[start_frame:end_frame]
                target_w, target_h = None, None
                if custom_width > 0 and custom_height > 0:
                    target_w = custom_width
                    target_h = custom_height
                elif resolution != "Original":
                    target_w, target_h = [int(v) for v in resolution.split('x')]
                if target_w and target_h:
                    import torch.nn.functional as F
                    sliced_images = sliced_images.permute(0, 3, 1, 2)
                    sliced_images = F.interpolate(sliced_images, size=(target_h, target_w), mode='bilinear', align_corners=False)
                    sliced_images = sliced_images.permute(0, 2, 3, 1)
                final_h, final_w = sliced_images.shape[1], sliced_images.shape[2]
                final_duration = len(sliced_images) / original_fps
                sliced_audio = None
                if components.audio is not None:
                    sr = components.audio["sample_rate"]
                    wf = components.audio["waveform"]
                    s_samp = int(start_second * sr)
                    e_samp = int(end_second * sr)
                    if len(wf.shape) == 3: trimmed_wf = wf[:, :, s_samp:e_samp]
                    else: trimmed_wf = wf[:, s_samp:e_samp]
                    sliced_audio = {"waveform": trimmed_wf, "sample_rate": sr}
                else:
                    sliced_audio = {"waveform": torch.zeros((1, 2, 44100)), "sample_rate": 44100}
                new_video_obj = None
                if HAS_VIDEO_IMPL:
                    new_components = VideoComponents(images=sliced_images, audio=sliced_audio, frame_rate=components.frame_rate)
                    new_video_obj = VideoFromComponents(new_components)
                return (sliced_images, sliced_audio, new_video_obj, original_fps, len(sliced_images), final_w, final_h, final_duration)
            except Exception as e:
                pass

        video_path = folder_paths.get_annotated_filepath(video)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened(): raise Exception(f"No se pudo abrir el video: {video}")
        original_fps = cap.get(cv2.CAP_PROP_FPS)
        if original_fps <= 0: original_fps = 24.0
        
        start_frame = int(start_second * original_fps)
        end_frame = int(end_second * original_fps)
        
        # Inteligencia de alineacion a Lotes
        if segundos_por_lote > 0.0 and motor_alineacion != "Exacto":
            frames_por_lote = int(segundos_por_lote * original_fps)
            if motor_alineacion == "LTX-Video (8N+1)":
                frames_por_lote = ((frames_por_lote - 1) // 8) * 8 + 1
            elif motor_alineacion == "WanVideo (4N+1)":
                frames_por_lote = ((frames_por_lote - 1) // 4) * 4 + 1
            
            # Ajustamos start y end a los bloques exactos de frames_por_lote
            start_lote = start_frame // frames_por_lote
            end_lote = end_frame // frames_por_lote
            
            start_frame = start_lote * frames_por_lote
            end_frame = end_lote * frames_por_lote

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        frames = []
        current_frame = start_frame
        target_w, target_h = None, None
        if custom_width > 0 and custom_height > 0:
            target_w = custom_width
            target_h = custom_height
        elif resolution != "Original":
            target_w, target_h = [int(v) for v in resolution.split('x')]
        while current_frame < end_frame:
            ret, frame = cap.read()
            if not ret: break
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            if target_w and target_h: frame = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
            frames.append(frame.astype(np.float32) / 255.0)
            current_frame += 1
        cap.release()
        if not frames: raise Exception(f"Pez Video Trimmer: No frames found.")
        image_tensor = torch.from_numpy(np.array(frames))
        final_h, final_w = image_tensor.shape[1], image_tensor.shape[2]
        final_duration = len(frames) / original_fps
        audio_dict = {"waveform": torch.zeros((1, 2, 44100)), "sample_rate": 44100}
        if HAS_AUDIO:
            try:
                waveform, sample_rate = comfy_load_audio(video_path)
                start_sample = int(start_second * sample_rate)
                end_sample = int(end_second * sample_rate)
                trimmed_waveform = waveform[:, start_sample:end_sample]
                audio_dict = {"waveform": trimmed_waveform.unsqueeze(0), "sample_rate": sample_rate}
            except Exception: pass
        video_obj = None
        if HAS_VIDEO_IMPL:
            duration = end_second - start_second
            video_obj = InputImpl.VideoFromFile(video_path, start_time=start_second, duration=duration)
        return (image_tensor, audio_dict, video_obj, original_fps, len(frames), final_w, final_h, final_duration)

NODE_CLASS_MAPPINGS = {
    "PezVideoTrimmer": PezVideoTrimmer
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezVideoTrimmer": "🐟 Pez Video Trimmer Loader"
}
