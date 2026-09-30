import torch
import nodes
import folder_paths
import os
import hashlib

class PezLoadTransparentPNG:
    @classmethod
    def INPUT_TYPES(s):
        input_dir = folder_paths.get_input_directory()
        files = [f for f in os.listdir(input_dir) if os.path.isfile(os.path.join(input_dir, f))]
        files = folder_paths.filter_files_content_types(files, ["image"])
        return {
            "required": {
                "image": (sorted(files), {"image_upload": True}),
                "bg_color": ("STRING", {"default": "#808080", "tooltip": "Color de fondo hexadecimal (ej. #808080 para gris, #000000 para negro)."}),
            }
        }

    CATEGORY = "Pez/Image"
    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("IMAGE", "MASK")
    FUNCTION = "load_and_composite"

    def load_and_composite(self, image, bg_color):
        # Usamos el nodo nativo de ComfyUI para cargar la imagen y su mascara
        loader = nodes.LoadImage()
        img_out, mask_out = loader.load_image(image)
        
        # img_out es [B, H, W, 3] en rango [0, 1]
        # mask_out es [B, H, W] en rango [0, 1] donde 1.0 = TRANSPARENTE y 0.0 = OPACO
        
        # Parseamos el color hexadecimal
        bg_color = bg_color.lstrip('#')
        if len(bg_color) == 6:
            r = int(bg_color[0:2], 16) / 255.0
            g = int(bg_color[2:4], 16) / 255.0
            b = int(bg_color[4:6], 16) / 255.0
        else:
            r, g, b = 0.5, 0.5, 0.5 # Gris por defecto si hay error en el formato
            
        bg_tensor = torch.tensor([r, g, b], dtype=img_out.dtype, device=img_out.device)
        bg_tensor = bg_tensor.view(1, 1, 1, 3).expand_as(img_out)
        
        # Calculamos la opacidad (invirtiendo la mascara nativa)
        opacity = 1.0 - mask_out
        opacity = opacity.unsqueeze(-1) # Adaptamos a [B, H, W, 1]
        
        # Componemos la imagen: (original * opacidad) + (fondo * (1 - opacidad))
        # Como mask_out original es exactamente (1 - opacidad), la usamos directo
        mask_out_expanded = mask_out.unsqueeze(-1)
        final_img = (img_out * opacity) + (bg_tensor * mask_out_expanded)
        
        return (final_img, mask_out)

    @classmethod
    def IS_CHANGED(s, image, bg_color):
        image_path = folder_paths.get_annotated_filepath(image)
        m = hashlib.sha256()
        with open(image_path, 'rb') as f:
            m.update(f.read())
        return m.digest().hex()

    @classmethod
    def VALIDATE_INPUTS(s, image, bg_color):
        if not folder_paths.exists_annotated_filepath(image):
            return "Invalid image file: {}".format(image)
        return True

NODE_CLASS_MAPPINGS = {
    "PezLoadTransparentPNG": PezLoadTransparentPNG
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "PezLoadTransparentPNG": "Pez Load Transparent PNG"
}
