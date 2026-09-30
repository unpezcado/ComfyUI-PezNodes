import os
import json
import folder_paths
from safetensors import safe_open

class PezLoraTriggerExtractor:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "lora_name": (folder_paths.get_filename_list("loras"), ),
            }
        }

    CATEGORY = "Pez/Text"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("TRIGGER_WORDS",)
    FUNCTION = "extract"

    def extract(self, lora_name):
        lora_path = folder_paths.get_full_path("loras", lora_name)
        if not lora_path or not os.path.exists(lora_path):
            return ("",)

        tags = []
        try:
            with safe_open(lora_path, framework="pt") as f:
                meta = f.metadata()
                if not meta:
                    return ("",)
                
                # Check for Civitai / ModelSpec standard
                if "modelspec.trigger_words" in meta:
                    val = meta["modelspec.trigger_words"]
                    if isinstance(val, str):
                        try:
                            parsed = json.loads(val)
                            if isinstance(parsed, list):
                                return (", ".join(parsed),)
                        except:
                            return (val,)
                            
                # Check for Kohya_ss tag frequency
                if "ss_tag_frequency" in meta:
                    freq_data = json.loads(meta["ss_tag_frequency"])
                    tag_counts = {}
                    # freq_data is usually {"dir_name": {"tag": count, ...}}
                    for dir_name, dir_tags in freq_data.items():
                        for tag, count in dir_tags.items():
                            tag = tag.strip()
                            tag_counts[tag] = tag_counts.get(tag, 0) + count
                    
                    # Sort tags by frequency
                    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
                    # Return top 15 tags to avoid giant spam, or all if few
                    top_tags = [t[0] for t in sorted_tags[:20]]
                    return (", ".join(top_tags),)
                
                # Check for output name (fallback)
                if "ss_output_name" in meta:
                    return (meta["ss_output_name"],)
                    
        except Exception as e:
            print(f"[Pez Lora Extractor] Error reading {lora_name}: {e}")
            
        return ("",)

NODE_CLASS_MAPPINGS = {
    "PezLoraTriggerExtractor": PezLoraTriggerExtractor
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezLoraTriggerExtractor": "Pez LoRA Trigger Extractor"
}
