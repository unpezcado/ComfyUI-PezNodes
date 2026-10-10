// 🐟 Pez MiniMax Preview — UI Customizada para MiniMax H3
// Incluye branding Pez (Entradas/Salidas alineadas, toggle switch iOS/Android ON/OFF,
// botonera de calidad Baja/Media/Alta, visualizador, telemetría unificada en español y gráficas σ/Δ y tiempo por paso).

const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

const STYLE_ID = "pez-minimax-preview-stylesheet";
function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.pez-h3-root {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 6px 8px 8px 8px;
    width: 100%;
    box-sizing: border-box;
    background: #141414;
    border: 1px solid #282828;
    border-radius: 8px;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.pez-h3-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    box-sizing: border-box;
}
.pez-h3-header-label {
    color: #ef4444;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 12px;
}
.pez-h3-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #262626;
    border-radius: 6px;
    padding: 6px 10px;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.15s ease;
}
.pez-h3-toggle-row:hover {
    background: #222222;
    border-color: #383838;
}
.pez-h3-toggle-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
}
.pez-h3-toggle-title {
    font-size: 11px;
    font-weight: 600;
    color: #e5e5e5;
}
.pez-h3-toggle-status {
    font-size: 10px;
    font-weight: bold;
    color: #ef4444;
}
.pez-h3-switch-track {
    width: 44px;
    height: 24px;
    background: #ef4444;
    border-radius: 12px;
    position: relative;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
    box-sizing: border-box;
}
.pez-h3-switch-thumb {
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 22px;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    box-sizing: border-box;
}
.pez-h3-switch-track.off {
    background: #333333;
}
.pez-h3-switch-thumb.off {
    transform: translateX(-20px);
}
.pez-h3-quality-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 3px;
    width: 100%;
    box-sizing: border-box;
}
.pez-h3-q-btn {
    height: 26px;
    border-radius: 4px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid #161616;
    transition: all 0.15s ease;
    box-sizing: border-box;
    padding: 0 4px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}
.pez-h3-image-area {
    position: relative;
    width: 100%;
    min-height: 200px;
    height: 240px;
    background: repeating-conic-gradient(#181818 0% 25%, #1c1c1c 0% 50%) 50%/16px 16px;
    border: 1px solid #242424;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
    flex: 1;
}
.pez-h3-img, .pez-h3-video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity .12s ease;
    image-rendering: pixelated;
}
.pez-h3-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 12px;
}
.pez-h3-scrub {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 6px;
    background: rgba(0,0,0,.5);
    cursor: pointer;
    display: none;
}
.pez-h3-scrub-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, #ef4444, #f59e0b);
}
.pez-h3-stats-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: #181818;
    border: 1px solid #282828;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 11px;
    box-sizing: border-box;
}
.pez-h3-stats-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #ef4444;
}
.pez-h3-stats-right {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 10.5px;
    color: #a3a3a3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.pez-h3-graphs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
    box-sizing: border-box;
}
.pez-h3-graph-cell {
    background: #181818;
    border: 1px solid #282828;
    border-radius: 6px;
    padding: 5px 6px;
    box-sizing: border-box;
}
.pez-h3-graph-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10px;
    color: #888;
    margin-bottom: 4px;
}
.pez-h3-graph-label {
    white-space: nowrap;
    font-weight: 600;
}
.pez-h3-graph-value {
    font-family: ui-monospace, Consolas, monospace;
    color: #d0d0d0;
    font-size: 10.5px;
}
.pez-h3-graph-canvas {
    width: 100%;
    height: 48px;
    display: block;
    cursor: crosshair;
}
.pez-h3-foot {
    font-size: 9.5px;
    color: #666;
    text-align: center;
    line-height: 12px;
}
`;
    document.head.appendChild(style);
}

// Búsqueda de nodo por ID en grafos y subgrafos
function findNodeByQualifiedId(rootGraph, qid) {
    if (!rootGraph || !qid) return null;
    const parts = String(qid).split(":");
    let graph = rootGraph;
    for (let i = 0; i < parts.length - 1; i++) {
        const parentId = parseInt(parts[i], 10);
        if (!Number.isFinite(parentId)) return null;
        const parentNode = graph?.getNodeById?.(parentId);
        if (!parentNode?.subgraph) return null;
        graph = parentNode.subgraph;
    }
    const leafId = parseInt(parts[parts.length - 1], 10);
    if (!Number.isFinite(leafId)) return null;
    return graph?.getNodeById?.(leafId) || null;
}

const allPreviewNodes = new Set();

const handlePreviewEvent = (e) => {
    const data = e.detail;
    if (!data) return;
    let node = null;
    if (data.node_id != null) {
        node = findNodeByQualifiedId(app.graph, data.node_id);
    }
    if (!node && allPreviewNodes.size === 1) {
        node = [...allPreviewNodes][0];
    }
    if (node?._h3PreviewHandler) {
        node._h3PreviewHandler(data);
    }
};

api.addEventListener("pez_minimax_preview", handlePreviewEvent);
api.addEventListener("minimax_h3_preview_override", handlePreviewEvent);

api.addEventListener("status", (e) => {
    if (e.detail && e.detail.exec_info && e.detail.exec_info.queue_remaining === 0) {
        for (const n of allPreviewNodes) {
            if (n._h3Clear) n._h3Clear();
        }
    }
});

api.addEventListener("b_queue_end", () => {
    for (const n of allPreviewNodes) {
        if (n._h3Clear) n._h3Clear();
    }
});

api.addEventListener("execution_start", () => {
    for (const n of allPreviewNodes) {
        if (n._h3Clear) n._h3Clear();
    }
});

function chainCallback(target, name, fn) {
    const prev = target[name];
    target[name] = function (...args) {
        const r = prev?.apply(this, args);
        fn.apply(this, args);
        return r;
    };
}

function el(tag, className, parent) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (parent) parent.appendChild(e);
    return e;
}

function b64ToBlob(b64, mime) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

function fmt(n, d) {
    return Number.isFinite(n) ? n.toFixed(d) : "—";
}

const GRAPH_PAD_X = 3;
function syncCanvasDPR(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = canvas.clientHeight || canvas.height;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, W: cssW, H: cssH };
}

function drawGrid(ctx, W, H, padX, padY) {
    const iH = H - 2 * padY;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let f = 0.25; f <= 0.75; f += 0.25) {
        const y = Math.round(padY + f * iH) + 0.5;
        ctx.beginPath();
        ctx.moveTo(padX, y);
        ctx.lineTo(W - padX, y);
        ctx.stroke();
    }
}

function drawGraph(canvas, sigmas, deltas, step, totalSteps, hoverStep, lockedStep) {
    const { ctx, W, H } = syncCanvasDPR(canvas);
    const padX = GRAPH_PAD_X, padY = 4;
    const iW = W - 2 * padX, iH = H - 2 * padY;
    ctx.clearRect(0, 0, W, H);
    
    // 1. Cuadrícula
    drawGrid(ctx, W, H, padX, padY);

    const n = sigmas?.length || 0;
    const xSteps = Math.max(totalSteps || n, n, deltas?.length || 0);
    const xAt = i => padX + (i / Math.max(1, xSteps - 1)) * iW;

    // 2. Curva Sigma
    if (n > 1) {
        let sMax = -Infinity, sMin = Infinity;
        for (const s of sigmas) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
        if (sMin > 0) sMin = 0;
        const sRange = Math.max(sMax - sMin, 1e-6);
        const sYAt = v => padY + (1 - (v - sMin) / sRange) * iH;

        ctx.strokeStyle = "rgba(208,208,208,.55)";
        ctx.lineWidth = 1.1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const px = padX + (i / (n - 1)) * iW;
            const py = sYAt(sigmas[i]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Punto activo en el paso actual
        if (step != null && step >= 0) {
            const idx = Math.max(0, Math.min(n - 1, step));
            const px = padX + (idx / Math.max(1, n - 1)) * iW;
            const py = sYAt(sigmas[idx]);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 3. Área y línea Delta
    if (deltas && deltas.length >= 1) {
        let dMax = 1e-6;
        for (const v of deltas) if (Number.isFinite(v) && v > dMax) dMax = v;
        const dYAt = v => padY + (1 - v / dMax) * iH;
        
        ctx.beginPath();
        ctx.moveTo(xAt(0), H - padY);
        ctx.lineTo(xAt(0), dYAt(deltas[0]));
        for (let i = 0; i < deltas.length; i++) {
            ctx.lineTo(xAt(i + 1), dYAt(deltas[i]));
        }
        ctx.lineTo(xAt(deltas.length), H - padY);
        ctx.closePath();
        ctx.fillStyle = "rgba(230,126,34,.22)";
        ctx.fill();

        ctx.strokeStyle = "#e67e22";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < deltas.length; i++) {
            const px = xAt(i + 1), py = dYAt(deltas[i]);
            if (i === 0) {
                ctx.moveTo(xAt(0), dYAt(deltas[0]));
                ctx.lineTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.stroke();
    }

    // 4. Marcador de scrubbing / hover
    const mark = hoverStep != null ? hoverStep : lockedStep;
    if (mark != null && mark >= 0 && mark < xSteps) {
        ctx.strokeStyle = mark === lockedStep ? "rgba(245,200,60,.9)" : "rgba(208,208,208,.5)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash(mark === lockedStep ? [4, 2] : []);
        ctx.beginPath();
        ctx.moveTo(xAt(mark) + 0.5, padY);
        ctx.lineTo(xAt(mark) + 0.5, H - padY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawTimeGraph(canvas, stepTimes, step, totalSteps, hoverStep, lockedStep) {
    const { ctx, W, H } = syncCanvasDPR(canvas);
    const padX = GRAPH_PAD_X, padY = 4;
    const iW = W - 2 * padX, iH = H - 2 * padY;
    ctx.clearRect(0, 0, W, H);

    // 1. Cuadrícula
    drawGrid(ctx, W, H, padX, padY);

    const count = stepTimes?.length || 0;
    if (count === 0) return;

    const xSteps = Math.max(totalSteps || count, count);
    const xAt = i => padX + (i / Math.max(1, xSteps - 1)) * iW;

    let tMax = 1e-6;
    for (const v of stepTimes) if (Number.isFinite(v) && v > tMax) tMax = v;
    const tYAt = v => padY + (1 - v / tMax) * iH;

    // 2. Área y línea de tiempo por paso
    ctx.beginPath();
    ctx.moveTo(xAt(0), H - padY);
    ctx.lineTo(xAt(0), tYAt(stepTimes[0]));
    for (let i = 0; i < count; i++) {
        ctx.lineTo(xAt(i), tYAt(stepTimes[i]));
    }
    ctx.lineTo(xAt(count - 1), H - padY);
    ctx.closePath();
    ctx.fillStyle = "rgba(230,126,34,.22)";
    ctx.fill();

    ctx.strokeStyle = "#e67e22";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
        const px = xAt(i), py = tYAt(stepTimes[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 3. Marcador de scrubbing / hover
    const mark = hoverStep != null ? hoverStep : lockedStep;
    if (mark != null && mark >= 0 && mark < xSteps) {
        ctx.strokeStyle = mark === lockedStep ? "rgba(245,200,60,.9)" : "rgba(208,208,208,.5)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash(mark === lockedStep ? [4, 2] : []);
        ctx.beginPath();
        ctx.moveTo(xAt(mark) + 0.5, padY);
        ctx.lineTo(xAt(mark) + 0.5, H - padY);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function applyPezPreviewSlotPositions(node) {
    if (!node) return;
    const w = node.size ? node.size[0] : 380;
    if (node.inputs && Array.isArray(node.inputs)) {
        for (let i = 0; i < node.inputs.length; i++) {
            if (node.inputs[i]) {
                node.inputs[i].pos = [10, 36 + i * 18];
            }
        }
    }
    if (node.outputs && Array.isArray(node.outputs)) {
        for (let i = 0; i < node.outputs.length; i++) {
            if (node.outputs[i]) {
                node.outputs[i].pos = [w - 10, 36 + i * 18];
            }
        }
    }
}

// Configuración de geometría limpia de slots y encabezados
function setupPezPreviewHooks(node) {
    if (node._pez_preview_hooked) {
        if (node.inputs && node.inputs.length > 2) {
            // Limpieza inmediata si aún contiene slots huérfanos
            const seen = {};
            for (let i = node.inputs.length - 1; i >= 0; i--) {
                const inp = node.inputs[i];
                if (!inp) continue;
                const low = (inp.name || "").toLowerCase();
                const type = (inp.type || "").toUpperCase();
                const isModel = low.includes("model") || type === "MODEL";
                const isVAE = low.includes("vae") || type === "VAE";
                const canonical = isModel ? "MODEL" : isVAE ? "VAE" : null;
                if (canonical) {
                    if (seen[canonical]) {
                        if (inp.link != null && seen[canonical].link == null) {
                            seen[canonical].link = inp.link;
                        }
                        node.inputs.splice(i, 1);
                        continue;
                    }
                    seen[canonical] = inp;
                } else if (inp.link == null) {
                    node.inputs.splice(i, 1);
                }
            }
            applyPezPreviewSlotPositions(node);
        }
        return;
    }
    node._pez_preview_hooked = true;

    if (node.title && !node.title.startsWith("🐟")) {
        node.title = "🐟 " + node.title.replace(/^🐟\s*/, "");
    }

    const normalizeSlots = (target) => {
        if (!target) return;
        if (target.inputs && target.inputs.length > 0) {
            // Deduplicación estricta de slots
            const seen = {};
            for (let i = target.inputs.length - 1; i >= 0; i--) {
                const inp = target.inputs[i];
                if (!inp) continue;
                const low = (inp.name || "").toLowerCase();
                const type = (inp.type || "").toUpperCase();
                const isModel = low.includes("model") || type === "MODEL";
                const isVAE = low.includes("vae") || type === "VAE";
                const canonical = isModel ? "MODEL" : isVAE ? "VAE" : null;
                
                if (canonical) {
                    if (seen[canonical]) {
                        if (inp.link != null && seen[canonical].link == null) {
                            seen[canonical].link = inp.link;
                        }
                        target.inputs.splice(i, 1);
                        continue;
                    }
                    seen[canonical] = inp;
                } else if (inp.link == null) {
                    target.inputs.splice(i, 1);
                }
            }

            for (const inp of target.inputs) {
                if (inp && (inp.name === "model" || inp.name === "MODEL" || inp.name === "MODELO" || inp.label === "model" || inp.label === "MODELO")) {
                    inp.label = "modelo";
                }
                if (inp && (inp.name === "tinyvae" || inp.name === "TINY_VAE" || inp.name === "tiny_vae" || inp.label === "tinyvae" || inp.label === "TINY_VAE")) {
                    inp.label = "tiny_vae";
                }
            }
        }
        if (target.outputs && target.outputs.length > 0) {
            for (const out of target.outputs) {
                if (out && (out.name === "model" || out.name === "MODEL" || out.name === "MODELO" || out.name === "modelo" || out.label === "model" || out.label === "MODELO" || out.label === "MODEL")) {
                    out.name = "modelo";
                    out.label = "modelo";
                }
            }
        }
        applyPezPreviewSlotPositions(target);
    };
    normalizeSlots(node);

    const origConfigure = node.onConfigure;
    node.onConfigure = function() {
        if (origConfigure) origConfigure.apply(this, arguments);
        normalizeSlots(this);
    };

    // Los widgets arrancan a y = 68 (inmediatamente debajo del slot tiny_vae a y=54, con margen limpio)
    node.widgets_start_y = 68;

    // Hook coordenadas de entrada (model a y=36, tiny_vae a y=54)
    node.getInputPos = function(slot, out) {
        out = out || new Float32Array(2);
        if (this.inputs && this.inputs[slot] && this.inputs[slot].pos) {
            out[0] = this.pos[0] + this.inputs[slot].pos[0];
            out[1] = this.pos[1] + this.inputs[slot].pos[1];
            return out;
        }
        out[0] = this.pos[0] + 10;
        out[1] = this.pos[1] + 36 + (slot * 18);
        return out;
    };

    // Hook coordenadas de salida (model a y=36)
    node.getOutputPos = function(slot, out) {
        out = out || new Float32Array(2);
        const w = this.size ? this.size[0] : 380;
        if (this.outputs && this.outputs[slot] && this.outputs[slot].pos) {
            out[0] = this.pos[0] + this.outputs[slot].pos[0];
            out[1] = this.pos[1] + this.outputs[slot].pos[1];
            return out;
        }
        out[0] = this.pos[0] + w - 10;
        out[1] = this.pos[1] + 36 + (slot * 18);
        return out;
    };

    // Hook conexión de cables
    node.getConnectionPos = function(isInput, slot_idx, out) {
        if (isInput) return this.getInputPos(slot_idx, out);
        return this.getOutputPos(slot_idx, out);
    };

    // Hook de dibujo en canvas:
    // Ambos títulos exactamente alineados horizontalmente a y = 16 (con margen arriba de model a y=36)
    const origDrawFg = node.onDrawForeground;
    node.onDrawForeground = function(ctx) {
        if (origDrawFg) origDrawFg.apply(this, arguments);
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 9px sans-serif";

        if (this.inputs && this.inputs.length > 0) {
            ctx.textAlign = "left";
            ctx.fillText("← ENTRADAS", 16, 16);
        }

        if (this.outputs && this.outputs.length > 0) {
            ctx.textAlign = "right";
            ctx.fillText("SALIDAS →", this.size[0] - 16, 16);
        }

        ctx.restore();
    };

    const origOnResize = node.onResize;
    node.onResize = function(size) {
        if (origOnResize) origOnResize.apply(this, arguments);
        if (this.size[0] < 380) this.size[0] = 380;
        if (this.size[1] < 600) this.size[1] = 600;
        this.widgets_start_y = 68;
        applyPezPreviewSlotPositions(this);
    };
}

app.registerExtension({
    name: "Pez.MiniMaxPreview",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData?.name !== "PezMiniMaxPreview") return;

        chainCallback(nodeType.prototype, "onNodeCreated", function () {
            ensureStyles();
            const node = this;
            allPreviewNodes.add(node);
            setupPezPreviewHooks(node);

            // Ocultar widgets nativos del canvas para sustituirlos por la UI personalizada
            for (const w of (node.widgets || [])) {
                if (w.name === "enable_preview" || w.name === "quality") {
                    w.computeSize = () => [0, -4];
                    w.draw = () => {};
                }
            }

            const root = el("div", "pez-h3-root");

            // 1. Control Toggle Switch iOS/Android: Habilitar / Deshabilitar Previsualización
            const toggleSection = el("div", "pez-h3-section", root);
            const toggleRow = el("div", "pez-h3-toggle-row", toggleSection);

            const toggleLeft = el("div", "pez-h3-toggle-left", toggleRow);
            const toggleTitle = el("span", "pez-h3-toggle-title", toggleLeft);
            toggleTitle.textContent = "Previsualización en vivo";
            const toggleStatus = el("span", "pez-h3-toggle-status", toggleLeft);
            toggleStatus.textContent = "Activado";

            const switchTrack = el("div", "pez-h3-switch-track", toggleRow);
            const switchThumb = el("div", "pez-h3-switch-thumb", switchTrack);

            const updateToggleUI = () => {
                const w = node.widgets?.find(x => x.name === "enable_preview");
                const isEnabled = w ? Boolean(w.value) : true;
                if (isEnabled) {
                    switchTrack.className = "pez-h3-switch-track";
                    switchThumb.className = "pez-h3-switch-thumb";
                    toggleStatus.style.color = "#ef4444";
                    toggleStatus.textContent = "Activado";
                } else {
                    switchTrack.className = "pez-h3-switch-track off";
                    switchThumb.className = "pez-h3-switch-thumb off";
                    toggleStatus.style.color = "#888888";
                    toggleStatus.textContent = "Desactivado";
                }
            };

            toggleRow.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const w = node.widgets?.find(x => x.name === "enable_preview");
                if (w) {
                    w.value = !w.value;
                    if (w.callback) w.callback(w.value);
                }
                updateToggleUI();
                if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
            };
            updateToggleUI();

            // 2. Control Botonera: Calidad de Rendering (Baja / Media / Alta)
            const qualitySection = el("div", "pez-h3-section", root);
            const qualityLabel = el("div", "pez-h3-header-label", qualitySection);
            qualityLabel.textContent = "CALIDAD DE RENDERING";

            const qualityGrid = el("div", "pez-h3-quality-grid", qualitySection);
            const qualityOptions = ["Baja", "Media", "Alta"];
            const qButtons = [];

            qualityOptions.forEach(opt => {
                const btn = el("button", "pez-h3-q-btn", qualityGrid);
                btn.type = "button";
                btn.textContent = opt;
                btn.title = opt;

                const updateQState = () => {
                    const w = node.widgets?.find(x => x.name === "quality");
                    const curVal = (w ? String(w.value) : "Alta").toLowerCase();
                    const optLower = opt.toLowerCase();
                    const isSelected = curVal === optLower || curVal.includes(optLower);
                    btn.style.backgroundColor = isSelected ? "#b91c1c" : "#242424";
                    btn.style.borderColor = isSelected ? "#ef4444" : "#161616";
                    btn.style.color = isSelected ? "#ffffff" : "#9ca3af";
                    btn.style.fontWeight = isSelected ? "bold" : "normal";
                };
                btn.updateQState = updateQState;
                updateQState();

                btn.onmouseenter = () => {
                    const w = node.widgets?.find(x => x.name === "quality");
                    const curVal = (w ? String(w.value) : "Alta").toLowerCase();
                    const optLower = opt.toLowerCase();
                    const isSelected = curVal === optLower || curVal.includes(optLower);
                    btn.style.backgroundColor = isSelected ? "#dc2626" : "#303030";
                    btn.style.borderColor = isSelected ? "#fca5a5" : "#ef4444";
                    btn.style.color = "#ffffff";
                };
                btn.onmouseleave = () => {
                    updateQState();
                };

                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const w = node.widgets?.find(x => x.name === "quality");
                    if (w) {
                        let targetVal = opt;
                        const validVals = w.options?.values || [];
                        if (validVals.length > 0) {
                            const match = validVals.find(v => {
                                const vStr = String(v).toLowerCase();
                                const optStr = opt.toLowerCase();
                                return vStr === optStr || vStr.includes(optStr);
                            });
                            if (match) targetVal = match;
                        }
                        w.value = targetVal;
                        if (w.callback) w.callback(targetVal);
                    }
                    qButtons.forEach(b => b.updateQState && b.updateQState());
                    if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
                };

                qButtons.push(btn);
            });

            // 3. Visualizador Central de Imagen / Video
            const imageArea = el("div", "pez-h3-image-area", root);
            const imgA = el("img", "pez-h3-img", imageArea);
            const imgB = el("img", "pez-h3-img", imageArea);
            imgA.draggable = imgB.draggable = false;
            imgB.style.opacity = "0";
            let visibleImg = imgA;
            let pendingImg = imgB;

            const videoEl = el("video", "pez-h3-video", imageArea);
            videoEl.style.opacity = "0";
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.loop = true;
            videoEl.autoplay = true;
            videoEl.disablePictureInPicture = true;

            const placeholder = el("div", "pez-h3-placeholder", imageArea);
            placeholder.textContent = "Esperando muestreo…";
            const scrubBar = el("div", "pez-h3-scrub", imageArea);
            const scrubFill = el("div", "pez-h3-scrub-fill", scrubBar);

            // 4. Barra Inferior de Telemetría y Progreso (Todo concentrado abajo)
            const statsBar = el("div", "pez-h3-stats-bar", root);
            const statsLeft = el("div", "pez-h3-stats-left", statsBar);
            statsLeft.textContent = "En reposo";
            const statsRight = el("div", "pez-h3-stats-right", statsBar);
            statsRight.textContent = "—";

            // 5. Ventanas Inferiores de Gráficos (σ / Δ y Tiempo por paso)
            const graphs = el("div", "pez-h3-graphs", root);
            function makeCell(labelHtml) {
                const cell = el("div", "pez-h3-graph-cell", graphs);
                const head = el("div", "pez-h3-graph-head", cell);
                const lbl = el("span", "pez-h3-graph-label", head);
                lbl.innerHTML = labelHtml;
                const val = el("span", "pez-h3-graph-value", head);
                const canvas = el("canvas", "pez-h3-graph-canvas", cell);
                return { canvas, val, lbl };
            }

            const sdCell = makeCell('<span style="color:#d0d0d0">σ (Ruido)</span> <span style="color:#666">/</span> <span style="color:#e67e22">Δ (Cambio)</span>');
            const timeCell = makeCell('Tiempo por paso');

            const footnote = el("div", "pez-h3-foot", root);
            footnote.textContent = "Pasa el cursor sobre la gráfica para explorar los pasos · Clic para fijar";

            // Registrar DOM Widget en el nodo
            node.addDOMWidget("h3_preview", "pez_minimax_preview_dom", root, { serialize: false });
            node.setSize([Math.max(node.size?.[0] ?? 380, 380), Math.max(node.size?.[1] ?? 600, 600)]);

            // Estado interno del render
            let hoverStep = null;
            let lockedStep = null;
            let lastCurrentStep = -1;
            let totalSteps = 0;
            let cachedSigmas = null;
            let lastStepMs = null;
            let lastAvgStepMs = null;
            let lastW = null;
            let lastH = null;
            let lastStep = 0;
            let lastTotal = 0;
            let bakedFps = null;
            let liveUrl = null;
            let liveMime = null;
            let currentVideoUrl = null;
            const stepBlobUrls = [];
            const stepMimes = [];
            const history = { stepMs: [], delta: [] };

            function showLiveFrame(url) {
                const target = pendingImg;
                target.src = url;
                target.decode().then(() => {
                    if (hoverStep != null || lockedStep != null) return;
                    if (liveUrl !== url || target !== pendingImg) return;
                    target.style.opacity = "1";
                    visibleImg.style.opacity = "0";
                    const prev = visibleImg;
                    visibleImg = target;
                    pendingImg = prev;
                }).catch(() => {});
            }

            function hideVideo() {
                videoEl.pause();
                videoEl.style.opacity = "0";
                currentVideoUrl = null;
            }

            function showVideo(url) {
                if (url === currentVideoUrl) return;
                currentVideoUrl = url;
                videoEl.src = url;
                videoEl.style.opacity = "1";
                visibleImg.style.opacity = "0";
                pendingImg.style.opacity = "0";
                videoEl.play().catch(() => {});
            }

            function showMedia(url, mime) {
                if (placeholder.parentNode) placeholder.remove();
                if (mime === "video/mp4") {
                    showVideo(url);
                } else {
                    hideVideo();
                    showLiveFrame(url);
                }
            }

            function setStepBlob(stepIdx, blob) {
                const url = URL.createObjectURL(blob);
                if (stepBlobUrls[stepIdx]) {
                    try { URL.revokeObjectURL(stepBlobUrls[stepIdx]); } catch {}
                }
                stepBlobUrls[stepIdx] = url;
                stepMimes[stepIdx] = blob.type;
                liveUrl = url;
                liveMime = blob.type;
                if (hoverStep == null && lockedStep == null) showMedia(url, blob.type);
            }

            function displayScrubStep() {
                const idx = hoverStep != null ? hoverStep : lockedStep;
                if (idx != null && stepBlobUrls[idx]) {
                    showMedia(stepBlobUrls[idx], stepMimes[idx] || (idx === 0 ? "image/jpeg" : liveMime));
                } else if (liveUrl) {
                    showMedia(liveUrl, liveMime);
                }
            }

            function currentFps() {
                return 12;
            }

            function renderStats() {
                const tIdx = (hoverStep != null ? hoverStep : (lockedStep != null ? lockedStep : lastCurrentStep)) - 1;
                const stepMs = (tIdx >= 0 && tIdx < history.stepMs.length)
                    ? history.stepMs[tIdx]
                    : (history.stepMs.length > 0 ? history.stepMs[history.stepMs.length - 1] : lastStepMs);
                
                const avgTxt = lastAvgStepMs != null
                    ? `${(lastAvgStepMs / 1000).toFixed(2)}s/paso` : "—";
                
                let eta = "";
                if (lastAvgStepMs != null && lastTotal != null && lastStep != null) {
                    const remaining = Math.max(0, lastTotal - lastStep);
                    eta = ` · Restante: ~${(remaining * lastAvgStepMs / 1000).toFixed(1)}s`;
                }

                // Valor numérico de tiempo por paso
                const timeTxt = (stepMs != null && Number.isFinite(stepMs))
                    ? (stepMs >= 1000 ? `${(stepMs / 1000).toFixed(2)} s` : `${stepMs.toFixed(0)} ms`)
                    : "—";
                timeCell.val.textContent = timeTxt;

                // Valor numérico de Sigma / Delta
                let sd = "—";
                if (cachedSigmas && cachedSigmas.length > 0) {
                    const idx = hoverStep != null ? hoverStep : (lockedStep != null ? lockedStep : lastCurrentStep);
                    const safeIdx = Math.max(0, Math.min(idx, cachedSigmas.length - 1));
                    const sig = cachedSigmas[safeIdx];
                    const dIdx = Math.max(0, safeIdx - 1);
                    const d = (history.delta && history.delta.length > dIdx)
                        ? history.delta[dIdx]
                        : (history.delta.length > 0 ? history.delta[history.delta.length - 1] : null);
                    sd = `${fmt(sig, 3)} / ${fmt(d, 3)}`;
                }
                sdCell.val.textContent = sd;

                // Barra unificada inferior
                if (lastStep > 0 && lastTotal > 0) {
                    statsLeft.innerHTML = `● Paso ${lastStep} / ${lastTotal}`;
                    statsRight.textContent = `${lastW ?? "—"}×${lastH ?? "—"} · ${avgTxt}${eta}`;
                } else {
                    statsLeft.textContent = "En reposo";
                    statsRight.textContent = "—";
                }
            }

            function drawAll() {
                drawGraph(sdCell.canvas, cachedSigmas, history.delta, lastCurrentStep, totalSteps, hoverStep, lockedStep);
                drawTimeGraph(timeCell.canvas, history.stepMs, lastCurrentStep, totalSteps, hoverStep, lockedStep);
                renderStats();
            }

            function resetRun() {
                for (const u of stepBlobUrls) {
                    if (u) try { URL.revokeObjectURL(u); } catch {}
                }
                stepBlobUrls.length = 0;
                stepMimes.length = 0;
                history.stepMs.length = 0;
                history.delta.length = 0;
                hoverStep = null;
                lockedStep = null;
                lastCurrentStep = -1;
                totalSteps = 0;
                lastStepMs = null;
                lastAvgStepMs = null;
                bakedFps = null;
                hideVideo();
                liveUrl = null;
                liveMime = null;
                
                visibleImg.src = "";
                visibleImg.style.opacity = "0";
                pendingImg.src = "";
                pendingImg.style.opacity = "0";
                
                if (!placeholder.parentNode) {
                    imageArea.appendChild(placeholder);
                }
                placeholder.textContent = "Esperando muestreo…";
                scrubBar.style.display = "none";
                
                statsLeft.textContent = "En reposo";
                statsRight.textContent = "—";
                sdCell.val.textContent = "—";
                timeCell.val.textContent = "—";
                
                cachedSigmas = null;
                const r1 = syncCanvasDPR(sdCell.canvas);
                r1.ctx.clearRect(0, 0, r1.W, r1.H);
                drawGrid(r1.ctx, r1.W, r1.H, GRAPH_PAD_X, 4);
                const r2 = syncCanvasDPR(timeCell.canvas);
                r2.ctx.clearRect(0, 0, r2.W, r2.H);
                drawGrid(r2.ctx, r2.W, r2.H, GRAPH_PAD_X, 4);
            }
            node._h3Clear = resetRun;

            // Scrubbing de animación
            function clipDurationMs() {
                if (currentVideoUrl && Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
                    return videoEl.duration * 1000;
                }
                return 0;
            }
            function tickScrub() {
                requestAnimationFrame(tickScrub);
                const dur = clipDurationMs();
                if (dur > 0) {
                    if (scrubBar.style.display === "none") scrubBar.style.display = "block";
                    scrubFill.style.width = ((videoEl.currentTime / videoEl.duration) * 100) + "%";
                    if (bakedFps != null && bakedFps > 0) {
                        const rate = currentFps() / bakedFps;
                        if (Math.abs(videoEl.playbackRate - rate) > 0.001) videoEl.playbackRate = rate;
                    }
                } else if (scrubBar.style.display !== "none") {
                    scrubBar.style.display = "none";
                }
            }
            requestAnimationFrame(tickScrub);

            scrubBar.addEventListener("mousedown", (ev) => {
                if (ev.button !== 0) return;
                ev.stopPropagation();
                ev.preventDefault();
                const rect = scrubBar.getBoundingClientRect();
                const seek = (e) => {
                    if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
                        videoEl.currentTime = ((e.clientX - rect.left) / rect.width) * videoEl.duration;
                    }
                };
                seek(ev);
                const move = (e) => seek(e);
                const up = () => {
                    document.removeEventListener("mousemove", move);
                    document.removeEventListener("mouseup", up);
                };
                document.addEventListener("mousemove", move);
                document.addEventListener("mouseup", up);
            });

            imageArea.addEventListener("click", (ev) => {
                if (scrubBar.contains(ev.target)) return;
                if (clipDurationMs() <= 0) return;
                ev.stopPropagation();
                if (videoEl.paused) videoEl.play().catch(() => {});
                else videoEl.pause();
            });

            // Interactividad en gráfica σ/Δ: Hover para explorar, clic para fijar
            sdCell.canvas.addEventListener("mousemove", (ev) => {
                if (!cachedSigmas && !history.delta.length) return;
                const rect = sdCell.canvas.getBoundingClientRect();
                const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                const xSteps = Math.max(totalSteps || cachedSigmas?.length || 0, cachedSigmas?.length || 0, history.delta.length);
                const fx = (ev.clientX - rect.left - GRAPH_PAD_X) / iW;
                const idx = Math.max(0, Math.min(xSteps - 1, Math.round(fx * (xSteps - 1))));
                if (idx !== hoverStep) {
                    hoverStep = idx;
                    displayScrubStep();
                    drawAll();
                }
            });
            sdCell.canvas.addEventListener("mouseleave", () => {
                if (hoverStep != null) {
                    hoverStep = null;
                    if (lockedStep == null) displayScrubStep();
                    drawAll();
                }
            });
            sdCell.canvas.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (lockedStep != null) {
                    lockedStep = null;
                } else if (cachedSigmas || history.delta.length > 0) {
                    const rect = sdCell.canvas.getBoundingClientRect();
                    const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                    const xSteps = Math.max(totalSteps || cachedSigmas?.length || 0, cachedSigmas?.length || 0, history.delta.length);
                    const fx = (ev.clientX - rect.left - GRAPH_PAD_X) / iW;
                    lockedStep = Math.max(0, Math.min(xSteps - 1, Math.round(fx * (xSteps - 1))));
                }
                displayScrubStep();
                drawAll();
            });

            // Interactividad en gráfica Tiempo por paso: Hover para explorar, clic para fijar
            timeCell.canvas.addEventListener("mousemove", (ev) => {
                if (!history.stepMs.length && !cachedSigmas) return;
                const rect = timeCell.canvas.getBoundingClientRect();
                const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                const xSteps = Math.max(totalSteps || 0, history.stepMs.length, cachedSigmas?.length || 0);
                const fx = (ev.clientX - rect.left - GRAPH_PAD_X) / iW;
                const idx = Math.max(0, Math.min(xSteps - 1, Math.round(fx * (xSteps - 1))));
                if (idx !== hoverStep) {
                    hoverStep = idx;
                    displayScrubStep();
                    drawAll();
                }
            });
            timeCell.canvas.addEventListener("mouseleave", () => {
                if (hoverStep != null) {
                    hoverStep = null;
                    if (lockedStep == null) displayScrubStep();
                    drawAll();
                }
            });
            timeCell.canvas.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (lockedStep != null) {
                    lockedStep = null;
                } else if (history.stepMs.length > 0 || cachedSigmas) {
                    const rect = timeCell.canvas.getBoundingClientRect();
                    const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                    const xSteps = Math.max(totalSteps || 0, history.stepMs.length, cachedSigmas?.length || 0);
                    const fx = (ev.clientX - rect.left - GRAPH_PAD_X) / iW;
                    lockedStep = Math.max(0, Math.min(xSteps - 1, Math.round(fx * (xSteps - 1))));
                }
                displayScrubStep();
                drawAll();
            });

            const handler = (data) => {
                try {
                    if (Array.isArray(data.sigmas) && data.sigmas.length > 1) {
                        cachedSigmas = data.sigmas;
                        resetRun();
                    }
                    if (typeof data.image === "string") {
                        const mime = typeof data.mime === "string" ? data.mime : "image/jpeg";
                        if (typeof data.fps === "number" && data.fps > 0) bakedFps = data.fps;
                        setStepBlob(data.step, b64ToBlob(data.image, mime));
                    }
                    totalSteps = data.total || totalSteps;
                    if (data.step_ms != null) history.stepMs.push(data.step_ms);
                    if (data.delta != null) history.delta.push(data.delta);
                    lastStepMs = data.step_ms;
                    lastAvgStepMs = data.avg_step_ms;
                    lastStep = data.step;
                    lastTotal = data.total;
                    lastW = data.w;
                    lastH = data.h;
                    lastCurrentStep = data.step;
                    drawAll();
                } catch (err) {
                    console.warn("[PezMiniMaxPreview] decode failed:", err);
                }
            };
            node._h3PreviewHandler = handler;

            node._h3PauseVideo = () => {
                if (videoEl && !videoEl.paused) {
                    videoEl.pause();
                }
                if (visibleImg && visibleImg.src && visibleImg.src.startsWith("blob:") && liveMime === "image/webp") {
                    const canvas = document.createElement("canvas");
                    canvas.width = visibleImg.naturalWidth || visibleImg.width;
                    canvas.height = visibleImg.naturalHeight || visibleImg.height;
                    const ctx = canvas.getContext("2d");
                    if (ctx && canvas.width > 0 && canvas.height > 0) {
                        ctx.drawImage(visibleImg, 0, 0);
                        visibleImg.src = canvas.toDataURL("image/jpeg");
                    }
                }
            };

            chainCallback(node, "onRemoved", function () {
                allPreviewNodes.delete(node);
                node._h3PreviewHandler = null;
                node._h3PauseVideo = null;
                node._h3Clear = null;
                for (const u of stepBlobUrls) {
                    if (u) try { URL.revokeObjectURL(u); } catch {}
                }
                stepBlobUrls.length = 0;
                stepMimes.length = 0;
                hideVideo();
            });
        });
    },
    async loadedGraphNode(node) {
        if (node.comfyClass === "PezMiniMaxPreview" || node.type === "PezMiniMaxPreview") {
            allPreviewNodes.add(node);
            setupPezPreviewHooks(node);
        }
    }
});
