# ComfyUI-PezNodes 🐟

Una colección de nodos personalizados para **ComfyUI** diseñados para agilizar flujos de trabajo de video, especialmente optimizados para modelos como **MiniMax H3**.

## Nodos Incluidos

### 1. Pez Load Transparent PNG
Este nodo soluciona el problema de los "bordes mordidos" (jagged edges / aliasing) que ocurren al enviar imágenes PNG con transparencia directa a los modelos de video.

**¿Qué hace?**
- Carga imágenes PNG reconociendo perfectamente su canal Alfa (transparencia).
- Genera automáticamente un color de fondo sólido (por defecto `#808080` gris medio, o el que elijas).
- Realiza una composición (composite) interna perfecta de la imagen sobre el fondo.
- Si la imagen cargada no tiene transparencia (ej. JPG), el nodo la procesa intacta sin generar errores de dimensiones.

**¿Cómo conectarlo?**
Simplemente reemplaza tu nodo tradicional `Load Image` por este. 
- Conecta la salida `IMAGE` directo a tu nodo de **Referencias de Video** o **ControlNet**.

---

### 2. Pez MiniMax Preview
Un nodo de previsualización en tiempo real para observar el progreso de la generación de video en modelos como MiniMax H3, sin tener que esperar a que el proceso termine por completo.

**¿Qué hace?**
- Intercepta los pasos de "denoising" (ruido) del modelo en tiempo real.
- Renderiza el avance directamente en la interfaz de ComfyUI.
- Incluye gráficas de σ/Δ (Sigma/Delta) y tiempo por paso.
- **Inteligente:** La pantalla permanece limpia ("waiting for sample...") al iniciar un workflow y se auto-limpia al finalizar para no saturar tu pantalla con previsualizaciones viejas.

**¿Cómo conectarlo?**
- Se conecta usualmente en medio del flujo de muestreo (sampling) de MiniMax H3. 
- Su funcionamiento interno toma la información del modelo y extrae los tensores para decodificarlos usando un VAE ligero, proyectando los cuadros en el widget visual.

---

### 3. Pez Load LoRA & Triggers
La versión definitiva del cargador de LoRAs. Reemplaza por completo el nodo nativo de ComfyUI, añadiendo capacidades de extracción inteligente de etiquetas y limpieza de prompts.

**¿Qué hace?**
- Carga el LoRA y lo aplica al modelo y al CLIP (igual que el clásico).
- Automáticamente extrae las "trigger words" ocultas en los metadatos del archivo sin afectar el rendimiento.
- Incluye un campo manual (`manual_tags`) por si el creador borró los metadatos del archivo.
- **Filtro Anti-Duplicados:** Mezcla tus etiquetas manuales con las etiquetas automáticas del LoRA y elimina las palabras repetidas, asegurando que tu prompt no quede sobre-saturado (quemado).

---

### 4. Pez Prompt Combiner
El compañero perfecto para el nodo anterior. Sirve como tu lienzo principal para escribir.

**¿Qué hace?**
- Escribes tu prompt principal normal (ej. `a dog running in a field`).
- Recibe por cable las etiquetas purificadas desde tu **Pez Load LoRA & Triggers**.
- Concatena todo inteligentemente (agregando comas donde se debe) y te entrega una cadena de texto impecable, lista para irse al `CLIP Text Encode`.

## Instalación

1. Navega a la carpeta de nodos personalizados de tu instalación de ComfyUI:
   ```bash
   cd ComfyUI/custom_nodes/
   ```
2. Clona este repositorio:
   ```bash
   git clone https://github.com/unpezcado/ComfyUI-PezNodes.git
   ```
3. Reinicia tu servidor de ComfyUI. Los nodos aparecerán bajo la categoría **Pez**.

## Contribuciones y Screenshots
¡Agrega aquí tus capturas de pantalla para ayudar a otros miembros a conectar los cables visualmente!
![image](https://github.com/user-attachments/assets/6df71b05-5cae-4053-93d1-3fb3db700a18)