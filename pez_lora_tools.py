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
    RETURN_NAMES = ("MODEL", "CLIP", "TAGS")
    FUNCTION = "load_lora_and_tags"

    def extract_tags_from_lora(self, lora_path):
        if not lora_path or not os.path.exists(lora_path):
            return []
        
        try:
            with safe_open(lora_path, framework="pt") as f:
                meta = f.metadata()
                if not meta:
                    return []
                
                # Revisar estandar Civitai / ModelSpec
                if "modelspec.trigger_words" in meta:
                    val = meta["modelspec.trigger_words"]
                    if isinstance(val, str):
                        try:
                            parsed = json.loads(val)
                            if isinstance(parsed, list):
                                return parsed
                        except:
                            return [x.strip() for x in val.split(",")]
                            
                # Revisar estandar Kohya_ss
                if "ss_tag_frequency" in meta:
                    freq_data = json.loads(meta["ss_tag_frequency"])
                    tag_counts = {}
                    for dir_name, dir_tags in freq_data.items():
                        for tag, count in dir_tags.items():
                            tag = tag.strip()
                            tag_counts[tag] = tag_counts.get(tag, 0) + count
                    
                    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
                    top_tags = [t[0] for t in sorted_tags[:20]]
                    return top_tags
                
                if "ss_output_name" in meta:
                    return [meta["ss_output_name"]]
                    
        except Exception as e:
            print(f"[Pez Lora Extractor] Error al leer {lora_path}: {e}")
            
        return []

    def load_lora_and_tags(self, model, clip, lora_name, strength_model, strength_clip, manual_tags):
        if strength_model == 0 and strength_clip == 0:
            return (model, clip, manual_tags)

        lora_path = folder_paths.get_full_path("loras", lora_name)
        lora = None
        if self.loaded_lora is not None:
            if self.loaded_lora[0] == lora_path:
                lora = self.loaded_lora[1]
            else:
                temp = self.loaded_lora
                self.loaded_lora = None
                del temp

        if lora is None:
            lora = comfy.utils.load_torch_file(lora_path, safe_load=True)
            self.loaded_lora = (lora_path, lora)

        model_lora, clip_lora = comfy.sd.load_lora_for_models(model, clip, lora, strength_model, strength_clip)
        
        # Extraccion de tags
        auto_tags = self.extract_tags_from_lora(lora_path)
        
        # Procesar los manual_tags
        manual_list = [t.strip() for t in manual_tags.split(",") if t.strip()]
        
        # Combinar sin duplicados preservando el orden (manuales primero, luego automaticos)
        final_list = []
        seen = set()
        for t in manual_list + auto_tags:
            t_lower = t.lower()
            if t_lower not in seen:
                seen.add(t_lower)
                final_list.append(t)
                
        final_tags_str = ", ".join(final_list)

        return (model_lora, clip_lora, final_tags_str)

class PezPrompterMaximum:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "aspect_ratio": (["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "3:2", "2:3"], {"default": "16:9"}),
                "megapixels": ("FLOAT", {"default": 0.4, "min": 0.1, "max": 10.0, "step": 0.1, "tooltip": "0.4 MP es comun para video. SDXL usa 1.0 MP."}),
                "multiple": ("INT", {"default": 32, "min": 8, "max": 128, "step": 8, "tooltip": "Multiplo para redondear pixeles (32 es el estandar para modelos de video y SDXL)."}),
                "duration_seconds": ("FLOAT", {"default": 5.0, "min": 0.1, "max": 60.0, "step": 0.1, "tooltip": "Duracion del video en segundos. Ignora esto si estas haciendo una imagen."}),
                "main_prompt": ("STRING", {"multiline": True, "default": "", "tooltip": "Escribe aqui tu prompt principal."}),
            },
            "optional": {
                "extra_tags": ("STRING", {"forceInput": True, "tooltip": "Conecta aqui la salida TAGS de tu Pez Load LoRA."}),
            }
        }

    CATEGORY = "Pez/Text"
    RETURN_TYPES = ("STRING", "INT", "INT", "INT")
    RETURN_NAMES = ("PROMPT_FINAL", "WIDTH", "HEIGHT", "VIDEO_FRAMES")
    FUNCTION = "process"

    def process(self, main_prompt, aspect_ratio, megapixels, multiple, duration_seconds, extra_tags=""):
        # 1. Procesar Prompt
        p = main_prompt.strip()
        t = extra_tags.strip() if extra_tags else ""
        
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
        area = megapixels * 1_000_000
        
        if ":" in aspect_ratio:
            w_ratio, h_ratio = aspect_ratio.split(":")
            ar = float(w_ratio) / float(h_ratio)
        else:
            ar = 1.0
            
        h_exact = math.sqrt(area / ar)
        w_exact = h_exact * ar
        
        width = int(round(w_exact / multiple) * multiple)
        height = int(round(h_exact / multiple) * multiple)

        # 3. Calcular Frames para MiniMax (F + (5 - (F % 17)) % 17) a 24 FPS
        base_frames = max(5, round(duration_seconds * 24))
        mod_val = base_frames % 17
        add_val = (5 - mod_val) % 17
        video_frames = int(base_frames + add_val)

        return (final_prompt, width, height, video_frames)

NODE_CLASS_MAPPINGS = {
    "PezLoadLoraWithTags": PezLoadLoraWithTags,
    "PezPrompterMaximum": PezPrompterMaximum
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezLoadLoraWithTags": "Pez Load LoRA & Triggers",
    "PezPrompterMaximum": "Pez Prompter Maximum"
}
