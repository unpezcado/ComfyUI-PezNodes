from .pez_lora_tools import NODE_CLASS_MAPPINGS as lora_mappings, NODE_DISPLAY_NAME_MAPPINGS as lora_display
from .pez_video_trimmer import NODE_CLASS_MAPPINGS as trimmer_mappings, NODE_DISPLAY_NAME_MAPPINGS as trimmer_display
from .pez_load_transparent import NODE_CLASS_MAPPINGS as transparent_mappings, NODE_DISPLAY_NAME_MAPPINGS as transparent_display
from .pez_minimax_preview import NODE_CLASS_MAPPINGS as minimax_mappings, NODE_DISPLAY_NAME_MAPPINGS as minimax_display
from .pez_auto_batcher import PezAutoBatcher

NODE_CLASS_MAPPINGS = {
    **lora_mappings,
    **trimmer_mappings,
    **transparent_mappings,
    **minimax_mappings,
    "PezAutoBatcher": PezAutoBatcher
}

NODE_DISPLAY_NAME_MAPPINGS = {
    **lora_display,
    **trimmer_display,
    **transparent_display,
    **minimax_display,
    "PezAutoBatcher": "🐟 Pez Auto Batcher (Overnight)"
}

WEB_DIRECTORY = "./web"
