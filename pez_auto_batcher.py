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

class PezAutoBatcher:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "video_previo": ("VIDEO", {"tooltip": "Conecta aqui la salida VIDEO del Trimmer"}),
                "segundos_por_lote": ("FLOAT", {"default": 10.0, "min": 1.0, "max": 9999.0, "step": 1.0, "tooltip": "Duracion de cada pedazo (chunk)"}),
                "indice_actual": ("INT", {"default": 1, "min": 1, "max": 99999, "step": 1, "tooltip": "Conecta un nodo Primitive aqui y ponlo en 'increment'"}),
                "motor_alineacion": (["Exacto", "LTX-Video (8N+1)", "WanVideo (4N+1)"], {"default": "Exacto", "pez_button": True}),
            }
        }
    
    RETURN_TYPES = ("IMAGE", "AUDIO", "VIDEO", "FLOAT", "INT", "INT", "INT", "FLOAT")
    RETURN_NAMES = ("video sin audio (image)", "solo audio (audio)", "video + audio (video)", "velocidad (fps)", "total fotogramas", "ancho (width)", "alto (height)", "duración (segundos)")
    FUNCTION = "process_batch"
    CATEGORY = "Pez/Video"

    def process_batch(self, video_previo, segundos_por_lote, indice_actual, motor_alineacion="Exacto"):
        try:
            components = video_previo.get_components()
            original_fps = float(components.frame_rate)
            if original_fps <= 0: original_fps = 24.0
            
            # Calcular fotogramas base deseados
            target_frames_raw = int(segundos_por_lote * original_fps)
            
            # Ajustamos los frames dependiendo del motor seleccionado
            if motor_alineacion == "LTX-Video (8N+1)":
                target_frames_valid = ((target_frames_raw - 1) // 8) * 8 + 1
            elif motor_alineacion == "WanVideo (4N+1)":
                target_frames_valid = ((target_frames_raw - 1) // 4) * 4 + 1
            else:
                target_frames_valid = target_frames_raw
            
            # Calculamos los indices en base a fotogramas, NO a segundos brutos,
            # para que el siguiente lote empiece EXACTAMENTE donde termino el anterior
            start_frame = (indice_actual - 1) * target_frames_valid
            end_frame = start_frame + target_frames_valid
            
            # Re-calcular los segundos reales para el audio
            start_second = start_frame / original_fps
            end_second = end_frame / original_fps
            
            all_images = components.images
            
            if start_frame >= len(all_images):
                raise Exception("\n\n[PEZ AUTO-BATCHER] FIN DEL VIDEO ALCANZADO!\nEl video termino. Este error es INTENCIONAL para detener la cola automatica de ComfyUI. Ya tienes todos tus videos procesados!\n")
                
            end_frame = min(end_frame, len(all_images))
            sliced_images = all_images[start_frame:end_frame]
                
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
            if "FIN DEL VIDEO ALCANZADO" in str(e): raise e
            raise Exception(f"[Pez Auto Batcher] Error procesando VIDEO nativo: {e}")

NODE_CLASS_MAPPINGS = {
    "PezAutoBatcher": PezAutoBatcher
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezAutoBatcher": "\U0001F41F Pez Auto Batcher (Overnight)"
}
