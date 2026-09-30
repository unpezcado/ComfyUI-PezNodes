import os
import json
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
                "manual_tags": ("STRING", {"multiline": True, "default": "", "tooltip": "Tus trigger words manuales. Si el LoRA trae metadatos, se combinarán y se borrarán los duplicados."}),
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

class PezPromptCombiner:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "main_prompt": ("STRING", {"multiline": True, "default": "", "tooltip": "Escribe aqui tu prompt principal."}),
            },
            "optional": {
                "extra_tags": ("STRING", {"forceInput": True, "tooltip": "Conecta aqui la salida TAGS de tu Pez Load LoRA."}),
            }
        }

    CATEGORY = "Pez/Text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("PROMPT_FINAL",)
    FUNCTION = "combine"

    def combine(self, main_prompt, extra_tags=""):
        # Limpiar
        p = main_prompt.strip()
        t = extra_tags.strip() if extra_tags else ""
        
        if not p and not t:
            return ("",)
        if not p:
            return (t,)
        if not t:
            return (p,)
            
        # Unir asegurando que haya una coma
        if p.endswith(","):
            return (f"{p} {t}",)
        else:
            return (f"{p}, {t}",)

NODE_CLASS_MAPPINGS = {
    "PezLoadLoraWithTags": PezLoadLoraWithTags,
    "PezPromptCombiner": PezPromptCombiner
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezLoadLoraWithTags": "Pez Load LoRA & Triggers",
    "PezPromptCombiner": "Pez Prompt Combiner"
}
