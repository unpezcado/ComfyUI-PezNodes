import os
import json
import math
import folder_paths
import comfy.utils
from safetensors import safe_open

class PezLoadLoraWithTags:
    def __init__(self):
        self.loaded_lora = None

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "model": ("MODEL", {"tooltip": "El modelo base."}),
                "clip": ("CLIP", {"tooltip": "El CLIP base."}),
                "lora_name": (folder_paths.get_filename_list("loras"), ),
                "strength_model": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}),
                "strength_clip": ("FLOAT", {"default": 1.0, "min": -10.0, "max": 10.0, "step": 0.01}),
                "manual_tags": ("STRING", {"multiline": True, "default": "", "tooltip": "Tus trigger words manuales. Si el LoRA trae metadatos, se combinaran y se borraran los duplicados."}),
            }
        }

    CATEGORY = "Pez/LoRA"
    RETURN_TYPES = ("MODEL", "CLIP", "STRING")
    RETURN_NAMES = ("MODEL", "CLIP", "TAGS (Extra)")
    FUNCTION = "load_lora_with_tags"

    def load_lora_with_tags(self, model, clip, lora_name, strength_model, strength_clip, manual_tags):
        # 1. Cargar LoRA normalmente usando la funcion de ComfyUI
        lora_path = folder_paths.get_full_path("loras", lora_name)
        lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
        model_lora, clip_lora = comfy.sd.load_lora_for_models(model, clip, lora, strength_model, strength_clip)

        # 2. Extraer metadatos para encontrar trigger words / tags
        found_tags = []
        if lora_path.endswith(".safetensors"):
            try:
                with safe_open(lora_path, framework="pt", device="cpu") as f:
                    metadata = f.metadata()
                    if metadata:
                        # Buscar claves comunes de triggers
                        # A1111 / Kohya / Civitai suelen guardar 'ss_tag_frequency' o 'modelspec.tags'
                        if "ss_tag_frequency" in metadata:
                            try:
                                freq_dict = json.loads(metadata["ss_tag_frequency"])
                                for bucket, tags in freq_dict.items():
                                    for tag in tags.keys():
                                        found_tags.append(tag)
                            except:
                                pass
                        
                        if "modelspec.tags" in metadata:
                            tags_comma = metadata["modelspec.tags"].split(",")
                            found_tags.extend([t.strip() for t in tags_comma if t.strip()])
                            
                        # Algunos guardan una clave directa 'trigger_word' o 'trained_words'
                        for k in ["trigger_word", "trained_words", "ss_trained_words"]:
                            if k in metadata:
                                try:
                                    val = json.loads(metadata[k])
                                    if isinstance(val, list):
                                        found_tags.extend(val)
                                    elif isinstance(val, str):
                                        found_tags.extend([t.strip() for t in val.split(",")])
                                except:
                                    found_tags.extend([t.strip() for t in metadata[k].split(",")])
            except Exception as e:
                print(f"[PezLoRA] No se pudieron leer metadatos de {lora_name}: {e}")

        # 3. Procesar manual_tags
        manual_list = [t.strip() for t in manual_tags.split(",") if t.strip()]

        # 4. Combinar y limpiar duplicados manteniendo el orden
        # Primero las etiquetas encontradas en el archivo, luego las que el usuario escribio manualmente
        combined = []
        seen = set()
        
        for t in found_tags + manual_list:
            t_clean = t.strip()
            # Limpiar etiquetas raras que puedan venir en formato JSON sucio
            t_clean = t_clean.strip('\"\'[]{}')
            if t_clean and t_clean.lower() not in seen:
                seen.add(t_clean.lower())
                combined.append(t_clean)

        # Filtrar posibles tags no deseados o de sistema que a veces se cuelan
        ignore_words = {"false", "true", "none", "null"}
        final_list = []
        for t in combined:
            if t.lower() not in ignore_words and len(t) > 1:
                final_list.append(t)
                
        final_tags_str = ", ".join(final_list)

        return (model_lora, clip_lora, final_tags_str)

class PezPrompterMaximum:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "aspect_ratio": (["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "3:2", "2:3"], {"default": "16:9", "pez_button": True}),
                "megapixels": ("FLOAT", {"default": 0.4, "min": 0.1, "max": 10.0, "step": 0.1, "tooltip": "0.4 MP es comun para video. SDXL usa 1.0 MP."}),
                "multiple": ("INT", {"default": 32, "min": 8, "max": 128, "step": 8, "tooltip": "Multiplo para redondear pixeles (32 es el estandar para modelos de video y SDXL)."}),
                "duration_seconds": ("FLOAT", {"default": 5.0, "min": 0.1, "max": 60.0, "step": 0.1, "tooltip": "Duracion del video en segundos. Ignora esto si estas haciendo una imagen."}),
                "main_prompt": ("STRING", {"multiline": True, "default": "", "tooltip": "Escribe aqui tu prompt principal o positivo."}),
                "negative_prompt": ("STRING", {"multiline": True, "default": "", "tooltip": "Escribe aqui tu prompt negativo."}),
            },
            "optional": {
                "extra_tags": ("STRING", {"forceInput": True, "tooltip": "Conecta aqui la salida TAGS de tu Pez Load LoRA."}),
            }
        }

    CATEGORY = "Pez/Text"
    RETURN_TYPES = ("STRING", "INT", "INT", "INT", "STRING")
    RETURN_NAMES = ("Prompt Combinado", "Ancho (Width)", "Alto (Height)", "Frames de Video", "Prompt Negativo")
    FUNCTION = "process"

    def process(self, main_prompt, aspect_ratio, megapixels, multiple, duration_seconds, extra_tags="", negative_prompt=""):
        # 1. Procesar Prompt Positivo y Negativo
        p = (main_prompt or "").strip()
        t = (extra_tags or "").strip()
        neg = (negative_prompt or "").strip()
        
        final_prompt = ""
        if not p and not t:
            final_prompt = ""
        elif not p:
            final_prompt = t
        elif not t:
            final_prompt = p
        elif p.endswith(","):
            final_prompt = f"{p} {t}"
        else:
            final_prompt = f"{p}, {t}"
            
        # 2. Calcular Megapixeles -> Ancho y Alto
        try:
            mp_val = float(megapixels)
        except (TypeError, ValueError):
            mp_val = 0.4
        area = mp_val * 1_000_000
        
        ar_str = str(aspect_ratio or "16:9")
        if ":" in ar_str:
            try:
                parts = ar_str.split(":")
                w_ratio = float(parts[0])
                h_ratio = float(parts[1])
                ar = w_ratio / h_ratio if h_ratio != 0 else (16.0 / 9.0)
            except (ValueError, ZeroDivisionError):
                ar = 16.0 / 9.0
        else:
            ar = 1.0
            
        try:
            mult = int(multiple)
        except (TypeError, ValueError):
            mult = 32
        if mult <= 0: mult = 32
        
        h_exact = math.sqrt(area / ar)
        w_exact = h_exact * ar
        
        width = int(round(w_exact / mult) * mult)
        height = int(round(h_exact / mult) * mult)

        # 3. Calcular Frames para MiniMax (F + (5 - (F % 17)) % 17) a 24 FPS
        try:
            dur = float(duration_seconds)
        except (TypeError, ValueError):
            dur = 5.0
        base_frames = max(5, round(dur * 24))
        mod_val = base_frames % 17
        add_val = (5 - mod_val) % 17
        video_frames = int(base_frames + add_val)

        return (final_prompt, width, height, video_frames, neg)

NODE_CLASS_MAPPINGS = {
    "PezLoadLoraWithTags": PezLoadLoraWithTags,
    "PezPrompterMaximum": PezPrompterMaximum
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezLoadLoraWithTags": "🐟 Pez Load LoRA & Triggers",
    "PezPrompterMaximum": "🐟 Pez Prompter Maximum"
}
