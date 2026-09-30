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

Pez Load Transparent PNG
<img width="466" height="597" alt="Captura de pantalla 2026-09-30 095208" src="https://github.com/user-attachments/assets/daa87931-ee7f-4fec-87c8-f1a49133c2d1" />

Pez MiniMax Preview
<img width="1385" height="615" alt="Captura de pantalla 2026-09-30 095135" src="https://github.com/user-attachments/assets/2ba3c0b5-b93e-4c93-8837-40d1385b2ca7" />
