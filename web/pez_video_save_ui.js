import { app } from "../../scripts/app.js";

console.log("🐟 Pez Video Save & Compare UI V8 Loaded!");

const VALID_SAVE_MODES = ["Guardar Video", "Solo Preview"];
const VALID_CALIDADES = ["Alta (CRF 20)", "Máxima (CRF 17)", "Media (CRF 24)"];
const VALID_FORMATOS = ["MP4 (H.264)", "WebM (VP9)"];

const TAG_DEFINITIONS = [
    { label: "+ [name]", token: "[name]" },
    { label: "+ [date]", token: "[date]" },
    { label: "+ [time]", token: "[time]" },
    { label: "+ [counter]", token: "[counter]" },
    { label: "+ [fps]", token: "[fps]" },
    { label: "+ [width]", token: "[width]" },
    { label: "+ [height]", token: "[height]" },
    { label: "+ [duration]", token: "[duration]" },
    { label: "+ [seed]", token: "[seed]" }
];

function createSectionHeader(titleText, hasTopBorder = true, customHeight = 26, alignRight = false) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = customHeight + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = hasTopBorder ? "5px 0px 2px 0px" : "2px 0px 2px 0px";
    if (hasTopBorder) {
        container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    }
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    label.textContent = titleText;
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    if (alignRight) {
        label.style.textAlign = "right";
        label.style.paddingRight = "8px";
    }
    container.appendChild(label);
    return container;
}

function createPezButtonGrid(targetWidget, options, defaultVal) {
    if (targetWidget) {
        targetWidget.computeSize = () => [0, -4];
        targetWidget.draw = () => {};
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.boxSizing = "border-box";
    container.style.padding = "2px 0px 4px 0px";
    container.style.userSelect = "none";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = `repeat(${options.length}, 1fr)`;
    grid.style.gap = "4px";
    grid.style.width = "100%";
    grid.style.boxSizing = "border-box";
    container.appendChild(grid);

    const buttons = [];

    const updateVisuals = (currentVal) => {
        buttons.forEach(b => {
            const isActive = (b.dataset.val === String(currentVal));
            b.style.backgroundColor = isActive ? "#ef4444" : "#242424";
            b.style.color = isActive ? "#ffffff" : "#aaaaaa";
            b.style.borderColor = isActive ? "#ff5555" : "#161616";
            b.style.fontWeight = isActive ? "bold" : "normal";
        });
    };

    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = opt;
        btn.title = opt;
        btn.dataset.val = opt;
        btn.style.height = "26px";
        btn.style.boxSizing = "border-box";
        btn.style.padding = "2px 4px";
        btn.style.border = "1px solid #161616";
        btn.style.borderRadius = "4px";
        btn.style.fontSize = "10px";
        btn.style.fontFamily = "sans-serif";
        btn.style.cursor = "pointer";
        btn.style.whiteSpace = "nowrap";
        btn.style.overflow = "hidden";
        btn.style.textOverflow = "ellipsis";
        btn.style.transition = "all 0.15s ease";

        btn.onmouseenter = () => {
            if (btn.dataset.val !== String(targetWidget?.value)) {
                btn.style.backgroundColor = "#303030";
                btn.style.borderColor = "#ef4444";
                btn.style.color = "#ffffff";
            }
        };
        btn.onmouseleave = () => {
            updateVisuals(targetWidget?.value);
        };

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (targetWidget) {
                targetWidget.value = opt;
                if (targetWidget.callback) targetWidget.callback(opt);
            }
            updateVisuals(opt);
            if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
        };

        buttons.push(btn);
        grid.appendChild(btn);
    });

    updateVisuals(targetWidget?.value || defaultVal);
    container._updateVisuals = updateVisuals;
    return container;
}

function sanitizePezVideoSaveWidgets(node) {
    if (!node || !node.widgets) return;

    const wFps = node.widgets.find(w => w.name === "fps");
    const wSaveMode = node.widgets.find(w => w.name === "save_mode");
    const wOutputDir = node.widgets.find(w => w.name === "output_dir");
    const wPattern = node.widgets.find(w => w.name === "filename_pattern");
    const wCalidad = node.widgets.find(w => w.name === "calidad");
    const wFormato = node.widgets.find(w => w.name === "formato");

    if (wFps) {
        let v = parseFloat(wFps.value);
        if (isNaN(v) || v <= 0) v = 24.0;
        wFps.value = v;
    }
    if (wSaveMode) {
        if (!wSaveMode.value || !VALID_SAVE_MODES.includes(String(wSaveMode.value))) {
            wSaveMode.value = "Guardar Video";
        }
    }
    if (wOutputDir) {
        if (typeof wOutputDir.value !== "string" || !wOutputDir.value.trim() || wOutputDir.value === "Guardar Video" || wOutputDir.value === "Solo Preview") {
            wOutputDir.value = "output";
        }
    }
    if (wPattern) {
        if (typeof wPattern.value !== "string" || !wPattern.value.trim() || wPattern.value.length < 2) {
            wPattern.value = "[name]_[date]_[time]_[counter]";
        }
    }
    if (wCalidad) {
        if (!wCalidad.value || !VALID_CALIDADES.includes(String(wCalidad.value))) {
            wCalidad.value = "Alta (CRF 20)";
        }
    }
    if (wFormato) {
        if (!wFormato.value || !VALID_FORMATOS.includes(String(wFormato.value))) {
            wFormato.value = "MP4 (H.264)";
        }
    }
}

function applySlotPositions(node) {
    if (!node) return;
    const w = node.size ? node.size[0] : 450;

    // Orden estricto de entradas:
    // 1. video (y = 36)
    // 2. audio (y = 54)
    // 3. name (y = 72)
    // 4. video_previo (y = 526)
    if (node.inputs && Array.isArray(node.inputs)) {
        let videoSlot = null;
        let audioSlot = null;
        let nameSlot = null;
        let previoSlot = null;

        for (const inp of node.inputs) {
            if (!inp) continue;
            const low = (inp.name || "").toLowerCase();
            const lowLabel = (inp.label || "").toLowerCase();
            const type = (inp.type || "").toUpperCase();

            if (low === "video_previo" || lowLabel === "video_previo") {
                if (!previoSlot || (inp.link != null && previoSlot.link == null)) previoSlot = inp;
            } else if (low === "audio" || lowLabel === "audio" || type === "AUDIO") {
                if (!audioSlot || (inp.link != null && audioSlot.link == null)) audioSlot = inp;
            } else if (low === "name" || lowLabel === "name" || type === "STRING") {
                if (!nameSlot || (inp.link != null && nameSlot.link == null)) nameSlot = inp;
            } else if (low === "video" || lowLabel === "video" || type.includes("IMAGE") || type.includes("VIDEO")) {
                if (!videoSlot || (inp.link != null && videoSlot.link == null)) videoSlot = inp;
            }
        }

        const newInputs = [];
        // 1. video (y = 36)
        if (videoSlot) {
            videoSlot.name = "video";
            videoSlot.label = "video";
            videoSlot.type = "IMAGE";
            videoSlot.pos = [10, 36];
            newInputs.push(videoSlot);
        }
        // 2. audio (y = 54)
        if (audioSlot) {
            audioSlot.name = "audio";
            audioSlot.label = "audio";
            audioSlot.type = "AUDIO";
            audioSlot.pos = [10, 54];
            newInputs.push(audioSlot);
        }
        // 3. name (y = 72)
        if (nameSlot) {
            nameSlot.name = "name";
            nameSlot.label = "name";
            nameSlot.type = "STRING";
            nameSlot.pos = [10, 72];
            newInputs.push(nameSlot);
        }
        // 4. video_previo (y = 526)
        if (previoSlot) {
            previoSlot.name = "video_previo";
            previoSlot.label = "video_previo";
            previoSlot.type = "IMAGE";
            previoSlot.pos = [10, 526];
            newInputs.push(previoSlot);
        }

        if (newInputs.length > 0) {
            node.inputs = newInputs;
        }
    }

    // Slots de salida
    if (node.outputs && Array.isArray(node.outputs)) {
        if (node.outputs[0]) {
            node.outputs[0].pos = [w - 10, 36]; // ruta de guardado (string)
            node.outputs[0].name = "ruta de guardado (string)";
            node.outputs[0].label = "ruta de guardado (string)";
            node.outputs[0].type = "STRING";
        }
        if (node.outputs[1]) {
            node.outputs[1].pos = [w - 10, 54]; // video (image,video)
            node.outputs[1].name = "video (image,video)";
            node.outputs[1].label = "video (image,video)";
            node.outputs[1].type = "IMAGE";
        }
    }
}

function setupPezVideoSaveUI(node) {
    if (node._pez_save_ui_initialized) return;
    node._pez_save_ui_initialized = true;

    // 1. Título del Nodo
    if (node.title && !node.title.startsWith("🐟")) {
        node.title = "🐟 " + node.title.replace(/^🐟\s*/, "");
    }

    // Sanitizar valores nativos inmediatamente para corregir flujos previos guardados
    sanitizePezVideoSaveWidgets(node);

    // Widgets arrancan inmediatamente debajo de audio (y = 92)
    node.widgets_start_y = 92;

    // Configurar posiciones de slots
    applySlotPositions(node);

    // Ocultar widgets nativos en canvas para evitar empalmes
    const nativeToHide = ["fps", "save_mode", "output_dir", "filename_pattern", "calidad", "formato"];
    node.widgets?.forEach(w => {
        if (nativeToHide.includes(w.name)) {
            w.computeSize = () => [0, -4];
            w.draw = () => {};
        }
    });

    // Retener widgets DOM y posiciones de slots al recargar o cargar flujo
    const origConfigure = node.configure;
    node.configure = function(info) {
        const domWidgets = this.widgets ? this.widgets.filter(w => w.name.endsWith("_ui") || w.type === "HTML") : [];
        if (domWidgets.length > 0) {
            this.widgets = this.widgets.filter(w => !w.name.endsWith("_ui") && w.type !== "HTML");
        }

        if (origConfigure) origConfigure.apply(this, arguments);

        for (const dw of domWidgets) {
            if (!this.widgets.includes(dw)) {
                this.widgets.push(dw);
            }
        }

        sanitizePezVideoSaveWidgets(this);

        this.widgets_start_y = 92;
        applySlotPositions(this);
        this.widgets?.forEach(w => {
            if (nativeToHide.includes(w.name)) {
                w.computeSize = () => [0, -4];
                w.draw = () => {};
            }
        });
        this.setSize([450, 840]);
    };

    // Hook serialize para garantizar que jamás se envíen valores corruptos al servidor
    const origSerialize = node.serialize;
    node.serialize = function() {
        sanitizePezVideoSaveWidgets(this);
        return origSerialize ? origSerialize.apply(this, arguments) : {};
    };

    // Identificar widgets nativos
    const wFps = node.widgets?.find(w => w.name === "fps");
    const wSaveMode = node.widgets?.find(w => w.name === "save_mode");
    const wOutputDir = node.widgets?.find(w => w.name === "output_dir");
    const wPattern = node.widgets?.find(w => w.name === "filename_pattern");
    const wCalidad = node.widgets?.find(w => w.name === "calidad");
    const wFormato = node.widgets?.find(w => w.name === "formato");

    // Hook getInputPos y getOutputPos
    node.getInputPos = function(slot, out) {
        out = out || new Float32Array(2);
        if (this.inputs && this.inputs[slot] && this.inputs[slot].pos) {
            out[0] = this.pos[0] + this.inputs[slot].pos[0];
            out[1] = this.pos[1] + this.inputs[slot].pos[1];
            return out;
        }
        const ys = [36, 54, 72, 526];
        const y = (ys[slot] !== undefined) ? ys[slot] : (36 + slot * 18);
        out[0] = this.pos[0] + 10;
        out[1] = this.pos[1] + y;
        return out;
    };

    node.getOutputPos = function(slot, out) {
        out = out || new Float32Array(2);
        const w = this.size ? this.size[0] : 450;
        if (this.outputs && this.outputs[slot] && this.outputs[slot].pos) {
            out[0] = this.pos[0] + this.outputs[slot].pos[0];
            out[1] = this.pos[1] + this.outputs[slot].pos[1];
            return out;
        }
        const ys = [36, 54];
        const y = (ys[slot] !== undefined) ? ys[slot] : (36 + slot * 18);
        out[0] = this.pos[0] + w - 10;
        out[1] = this.pos[1] + y;
        return out;
    };

    // Hook getConnectionPos
    node.getConnectionPos = function(isInput, slot_idx, out) {
        if (isInput) {
            return this.getInputPos(slot_idx, out);
        } else {
            return this.getOutputPos(slot_idx, out);
        }
    };

    // Hook onResize
    const origOnResize = node.onResize;
    node.onResize = function(size) {
        if (origOnResize) origOnResize.apply(this, arguments);
        applySlotPositions(this);
    };

    // Hook Canvas: Dibujar marcas justo al inicio debajo del encabezado (y = 16)
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

    // 2. SECCIÓN: MODO Y RUTA DE GUARDADO (Arranca limpio a y = 92)
    const headerModo = createSectionHeader("MODO Y RUTA DE GUARDADO", false, 24);
    node.addDOMWidget("header_modo_ui", "HTML", headerModo, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 24, getMaxHeight: () => 24
    });

    const modeButtons = createPezButtonGrid(wSaveMode, VALID_SAVE_MODES, "Guardar Video");
    node.addDOMWidget("save_mode_btns_ui", "HTML", modeButtons, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 30, getMaxHeight: () => 30
    });

    // Fila CARPETA DE DESTINO con espacio amplio (margin-top: 10px y margin-bottom: 6px) para no verse pegada
    const dirContainer = document.createElement("div");
    dirContainer.style.display = "flex";
    dirContainer.style.flexDirection = "column";
    dirContainer.style.width = "100%";
    dirContainer.style.boxSizing = "border-box";
    dirContainer.style.padding = "8px 0px 4px 0px";

    const dirLabel = document.createElement("div");
    dirLabel.textContent = "CARPETA DE DESTINO:";
    dirLabel.style.color = "#888888";
    dirLabel.style.fontSize = "9px";
    dirLabel.style.fontFamily = "sans-serif";
    dirLabel.style.marginTop = "2px";
    dirLabel.style.marginBottom = "5px";
    dirContainer.appendChild(dirLabel);

    const dirInputRow = document.createElement("div");
    dirInputRow.style.display = "flex";
    dirInputRow.style.gap = "6px";
    dirInputRow.style.width = "100%";

    const dirInput = document.createElement("input");
    dirInput.type = "text";
    dirInput.value = wOutputDir?.value || "output";
    dirInput.style.flex = "1";
    dirInput.style.height = "26px";
    dirInput.style.boxSizing = "border-box";
    dirInput.style.padding = "4px 8px";
    dirInput.style.backgroundColor = "#1a1a1a";
    dirInput.style.border = "1px solid #333333";
    dirInput.style.borderRadius = "4px";
    dirInput.style.color = "#ffffff";
    dirInput.style.fontSize = "10px";
    dirInput.style.fontFamily = "monospace";

    dirInput.onchange = () => {
        if (wOutputDir) {
            wOutputDir.value = dirInput.value.trim();
            if (wOutputDir.callback) wOutputDir.callback(dirInput.value.trim());
        }
    };
    dirInputRow.appendChild(dirInput);
    node._pez_dir_input = dirInput;

    const browseBtn = document.createElement("button");
    browseBtn.type = "button";
    browseBtn.textContent = "📁 EXPLORAR...";
    browseBtn.title = "Seleccionar carpeta en tu computadora";
    browseBtn.style.height = "26px";
    browseBtn.style.padding = "2px 10px";
    browseBtn.style.backgroundColor = "#242424";
    browseBtn.style.border = "1px solid #161616";
    browseBtn.style.borderRadius = "4px";
    browseBtn.style.color = "#aaaaaa";
    browseBtn.style.fontSize = "10px";
    browseBtn.style.fontWeight = "bold";
    browseBtn.style.cursor = "pointer";
    browseBtn.style.whiteSpace = "nowrap";
    browseBtn.style.transition = "all 0.15s ease";

    browseBtn.onmouseenter = () => {
        browseBtn.style.backgroundColor = "#303030";
        browseBtn.style.borderColor = "#ef4444";
        browseBtn.style.color = "#ffffff";
    };
    browseBtn.onmouseleave = () => {
        browseBtn.style.backgroundColor = "#242424";
        browseBtn.style.borderColor = "#161616";
        browseBtn.style.color = "#aaaaaa";
    };

    browseBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prevText = browseBtn.textContent;
        browseBtn.textContent = "⏳ Abriendo...";
        try {
            const currentVal = dirInput.value.trim();
            const res = await fetch(`/pez/pick_folder?path=${encodeURIComponent(currentVal)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.display_path) {
                    dirInput.value = data.display_path;
                    if (wOutputDir) {
                        wOutputDir.value = data.display_path;
                        if (wOutputDir.callback) wOutputDir.callback(data.display_path);
                    }
                }
            } else {
                throw new Error("HTTP " + res.status);
            }
        } catch (err) {
            const manual = prompt("Escribe o pega la ruta de la carpeta donde deseas guardar (ej: video/minimax o ruta absoluta):", dirInput.value);
            if (manual !== null) {
                dirInput.value = manual.trim();
                if (wOutputDir) {
                    wOutputDir.value = manual.trim();
                    if (wOutputDir.callback) wOutputDir.callback(manual.trim());
                }
            }
        } finally {
            browseBtn.textContent = prevText;
            if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
        }
    };
    dirInputRow.appendChild(browseBtn);
    dirContainer.appendChild(dirInputRow);

    node.addDOMWidget("dir_row_ui", "HTML", dirContainer, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 58, getMaxHeight: () => 58
    });

    // 3. SECCIÓN: FORMATO DE NOMBRE Y TAGS
    const headerTags = createSectionHeader("FORMATO DE NOMBRE Y TAGS", true, 26);
    node.addDOMWidget("header_tags_ui", "HTML", headerTags, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 26, getMaxHeight: () => 26
    });

    const tagsMainContainer = document.createElement("div");
    tagsMainContainer.style.display = "flex";
    tagsMainContainer.style.flexDirection = "column";
    tagsMainContainer.style.width = "100%";
    tagsMainContainer.style.height = "156px";
    tagsMainContainer.style.boxSizing = "border-box";
    tagsMainContainer.style.padding = "2px 0px 2px 0px";

    // 3.A: VISTA PREVIA DEL NOMBRE
    const previewBox = document.createElement("div");
    previewBox.style.display = "flex";
    previewBox.style.flexDirection = "column";
    previewBox.style.width = "100%";
    previewBox.style.minHeight = "36px";
    previewBox.style.boxSizing = "border-box";
    previewBox.style.padding = "4px 8px";
    previewBox.style.backgroundColor = "#141414";
    previewBox.style.border = "1px solid #2a2a2a";
    previewBox.style.borderRadius = "4px";
    previewBox.style.marginBottom = "4px";

    const previewLabel = document.createElement("div");
    previewLabel.textContent = "VISTA PREVIA DEL NOMBRE:";
    previewLabel.style.color = "#ef4444";
    previewLabel.style.fontSize = "8px";
    previewLabel.style.fontWeight = "bold";
    previewLabel.style.letterSpacing = "0.5px";
    previewLabel.style.marginBottom = "2px";
    previewBox.appendChild(previewLabel);

    const previewText = document.createElement("div");
    previewText.style.color = "#ffffff";
    previewText.style.fontSize = "10px";
    previewText.style.fontFamily = "monospace";
    previewText.style.lineHeight = "1.3";
    previewText.style.wordBreak = "break-all";
    previewText.style.whiteSpace = "normal";
    previewText.style.userSelect = "text";
    previewBox.appendChild(previewText);

    node._pez_preview_div = previewText;
    tagsMainContainer.appendChild(previewBox);

    // 3.B: CAMPO PATRÓN DE NOMBRE
    const patternLabel = document.createElement("div");
    patternLabel.textContent = "PATRÓN DE FORMATO:";
    patternLabel.style.color = "#888888";
    patternLabel.style.fontSize = "9px";
    patternLabel.style.fontFamily = "sans-serif";
    patternLabel.style.marginBottom = "2px";
    tagsMainContainer.appendChild(patternLabel);

    const patternInput = document.createElement("input");
    patternInput.type = "text";
    patternInput.value = wPattern?.value || "[name]_[date]_[time]_[counter]";
    patternInput.style.width = "100%";
    patternInput.style.height = "22px";
    patternInput.style.boxSizing = "border-box";
    patternInput.style.padding = "2px 8px";
    patternInput.style.backgroundColor = "#1a1a1a";
    patternInput.style.border = "1px solid #333333";
    patternInput.style.borderRadius = "4px";
    patternInput.style.color = "#ffffff";
    patternInput.style.fontSize = "10px";
    patternInput.style.fontFamily = "monospace";
    patternInput.style.marginBottom = "4px";

    const updatePreviewText = () => {
        if (!node._pez_preview_div) return;
        const curFps = parseFloat(wFps?.value) || 24.0;
        const curPattern = patternInput.value.trim() || "[name]_[date]_[time]_[counter]";
        const curExt = (wFormato?.value?.includes("WebM") ? ".webm" : ".mp4");

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");

        let res = curPattern
            .replace(/\[name\]/g, "PezSample")
            .replace(/\[date\]/g, `${y}${m}${d}`)
            .replace(/\[time\]/g, `${hh}${mm}${ss}`)
            .replace(/\[counter\]/g, "0001")
            .replace(/\[fps\]/g, `${Math.round(curFps)}fps`)
            .replace(/\[width\]/g, "1024")
            .replace(/\[height\]/g, "576")
            .replace(/\[duration\]/g, "5.0s")
            .replace(/\[seed\]/g, "123456789");

        if (!res.endsWith(".mp4") && !res.endsWith(".webm")) {
            res += curExt;
        }
        node._pez_preview_div.textContent = res;
    };

    patternInput.oninput = () => {
        if (wPattern) {
            wPattern.value = patternInput.value;
            if (wPattern.callback) wPattern.callback(patternInput.value);
        }
        updatePreviewText();
    };
    node._pez_pattern_input = patternInput;
    tagsMainContainer.appendChild(patternInput);

    // 3.C: TAGS COMO CHIPS
    const chipsWrapper = document.createElement("div");
    chipsWrapper.style.display = "flex";
    chipsWrapper.style.flexWrap = "wrap";
    chipsWrapper.style.gap = "4px";
    chipsWrapper.style.width = "100%";
    chipsWrapper.style.boxSizing = "border-box";
    chipsWrapper.style.marginBottom = "4px";

    TAG_DEFINITIONS.forEach(tag => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.textContent = tag.label;
        chip.title = `Añadir ${tag.token} al nombre`;
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.justifyContent = "center";
        chip.style.width = "auto";
        chip.style.height = "22px";
        chip.style.boxSizing = "border-box";
        chip.style.padding = "2px 8px";
        chip.style.backgroundColor = "#242424";
        chip.style.border = "1px solid #383838";
        chip.style.borderRadius = "12px";
        chip.style.color = "#dcdcdc";
        chip.style.fontSize = "10px";
        chip.style.fontFamily = "sans-serif";
        chip.style.cursor = "pointer";
        chip.style.whiteSpace = "nowrap";
        chip.style.transition = "all 0.15s ease";

        chip.onmouseenter = () => {
            chip.style.backgroundColor = "#ef4444";
            chip.style.borderColor = "#ff6666";
            chip.style.color = "#ffffff";
        };
        chip.onmouseleave = () => {
            chip.style.backgroundColor = "#242424";
            chip.style.borderColor = "#383838";
            chip.style.color = "#dcdcdc";
        };

        chip.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            let cur = patternInput.value.trim();
            if (cur.length > 0 && !cur.endsWith("_") && !cur.endsWith("-")) {
                cur += "_";
            }
            cur += tag.token;
            patternInput.value = cur;
            if (wPattern) {
                wPattern.value = cur;
                if (wPattern.callback) wPattern.callback(cur);
            }
            updatePreviewText();
            if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
        };

        chipsWrapper.appendChild(chip);
    });
    tagsMainContainer.appendChild(chipsWrapper);

    // 3.D: BOTONES BORRAR Y RESETEAR
    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.gap = "6px";
    actionsRow.style.width = "100%";

    const btnBack = document.createElement("button");
    btnBack.type = "button";
    btnBack.textContent = "🗑️ BORRAR ÚLTIMO";
    btnBack.style.flex = "1";
    btnBack.style.height = "24px";
    btnBack.style.backgroundColor = "#242424";
    btnBack.style.border = "1px solid #161616";
    btnBack.style.borderRadius = "4px";
    btnBack.style.color = "#aaaaaa";
    btnBack.style.fontSize = "9px";
    btnBack.style.fontWeight = "bold";
    btnBack.style.cursor = "pointer";
    btnBack.style.transition = "all 0.15s ease";

    btnBack.onmouseenter = () => {
        btnBack.style.backgroundColor = "#303030";
        btnBack.style.borderColor = "#ef4444";
        btnBack.style.color = "#ffffff";
    };
    btnBack.onmouseleave = () => {
        btnBack.style.backgroundColor = "#242424";
        btnBack.style.borderColor = "#161616";
        btnBack.style.color = "#aaaaaa";
    };

    btnBack.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        let cur = patternInput.value.trim();
        const lastUnderscore = cur.lastIndexOf("_");
        if (lastUnderscore > 0) {
            cur = cur.substring(0, lastUnderscore);
        } else {
            cur = "";
        }
        patternInput.value = cur;
        if (wPattern) {
            wPattern.value = cur;
            if (wPattern.callback) wPattern.callback(cur);
        }
        updatePreviewText();
        if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
    };
    actionsRow.appendChild(btnBack);

    const btnReset = document.createElement("button");
    btnReset.type = "button";
    btnReset.textContent = "🔄 RESETEAR FORMATO";
    btnReset.style.flex = "1";
    btnReset.style.height = "24px";
    btnReset.style.backgroundColor = "#242424";
    btnReset.style.border = "1px solid #161616";
    btnReset.style.borderRadius = "4px";
    btnReset.style.color = "#aaaaaa";
    btnReset.style.fontSize = "9px";
    btnReset.style.fontWeight = "bold";
    btnReset.style.cursor = "pointer";
    btnReset.style.transition = "all 0.15s ease";

    btnReset.onmouseenter = () => {
        btnReset.style.backgroundColor = "#303030";
        btnReset.style.borderColor = "#ef4444";
        btnReset.style.color = "#ffffff";
    };
    btnReset.onmouseleave = () => {
        btnReset.style.backgroundColor = "#242424";
        btnReset.style.borderColor = "#161616";
        btnReset.style.color = "#aaaaaa";
    };

    btnReset.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const def = "[name]_[date]_[time]_[counter]";
        patternInput.value = def;
        if (wPattern) {
            wPattern.value = def;
            if (wPattern.callback) wPattern.callback(def);
        }
        updatePreviewText();
        if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
    };
    actionsRow.appendChild(btnReset);
    tagsMainContainer.appendChild(actionsRow);

    node.addDOMWidget("tags_main_ui", "HTML", tagsMainContainer, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 156, getMaxHeight: () => 156
    });

    // 4. SECCIÓN: CONFIGURACIÓN DEL VIDEO
    const headerVideoConfig = createSectionHeader("CONFIGURACIÓN DEL VIDEO", true, 26);
    node.addDOMWidget("header_video_config_ui", "HTML", headerVideoConfig, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 26, getMaxHeight: () => 26
    });

    // 4.A: Fila Invertida de FPS
    const fpsRow = document.createElement("div");
    fpsRow.style.display = "flex";
    fpsRow.style.alignItems = "center";
    fpsRow.style.gap = "8px";
    fpsRow.style.width = "100%";
    fpsRow.style.height = "30px";
    fpsRow.style.boxSizing = "border-box";
    fpsRow.style.padding = "2px 0px 4px 0px";

    const fpsInput = document.createElement("input");
    fpsInput.type = "number";
    fpsInput.min = "1";
    fpsInput.max = "120";
    fpsInput.step = "1";
    fpsInput.value = wFps?.value || "24";
    fpsInput.style.width = "110px";
    fpsInput.style.height = "26px";
    fpsInput.style.boxSizing = "border-box";
    fpsInput.style.padding = "2px 6px";
    fpsInput.style.backgroundColor = "#1a1a1a";
    fpsInput.style.border = "1px solid #333333";
    fpsInput.style.borderRadius = "4px";
    fpsInput.style.color = "#ffffff";
    fpsInput.style.fontSize = "11px";
    fpsInput.style.fontFamily = "monospace";
    fpsInput.style.fontWeight = "bold";
    fpsInput.style.textAlign = "center";

    fpsInput.onchange = () => {
        let val = parseFloat(fpsInput.value);
        if (isNaN(val) || val <= 0) val = 24.0;
        fpsInput.value = val;
        if (wFps) {
            wFps.value = val;
            if (wFps.callback) wFps.callback(val);
        }
        updatePreviewText();
    };
    fpsRow.appendChild(fpsInput);
    node._pez_fps_input = fpsInput;

    const fpsLabel = document.createElement("div");
    fpsLabel.textContent = "FPS (VELOCIDAD DE REPRODUCCIÓN)";
    fpsLabel.style.color = "#888888";
    fpsLabel.style.fontSize = "9px";
    fpsLabel.style.fontFamily = "sans-serif";
    fpsLabel.style.fontWeight = "bold";
    fpsLabel.style.userSelect = "none";
    fpsRow.appendChild(fpsLabel);

    node.addDOMWidget("fps_row_ui", "HTML", fpsRow, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 30, getMaxHeight: () => 30
    });

    // 4.B: Calidad Buttons
    const calidadButtons = createPezButtonGrid(wCalidad, VALID_CALIDADES, "Alta (CRF 20)");
    node.addDOMWidget("calidad_btns_ui", "HTML", calidadButtons, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 30, getMaxHeight: () => 30
    });

    // 4.C: Formato Buttons
    const formatoButtons = createPezButtonGrid(wFormato, VALID_FORMATOS, "MP4 (H.264)");
    node.addDOMWidget("formato_btns_ui", "HTML", formatoButtons, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 30, getMaxHeight: () => 30
    });

    // 5. SECCIÓN: COMPARADOR Y PREVIEW
    // Altura de 42px: deja espacio holgado para el slot de video_previo (y=526)
    // El texto 'COMPARADOR Y PREVIEW' se alinea a la derecha para no chocar jamás con 'video_previo'
    const headerPreview = createSectionHeader("COMPARADOR Y PREVIEW", true, 42, true);
    node.addDOMWidget("header_preview_ui", "HTML", headerPreview, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 42, getMaxHeight: () => 42
    });

    // 6. CONTENEDOR DEL REPRODUCTOR DE VIDEO (Inicia abajo del slot, sin tapar 'video_previo')
    const playerContainer = document.createElement("div");
    playerContainer.style.display = "flex";
    playerContainer.style.flexDirection = "column";
    playerContainer.style.width = "100%";
    playerContainer.style.minHeight = "280px";
    playerContainer.style.boxSizing = "border-box";
    playerContainer.style.padding = "2px 0px";
    playerContainer.style.backgroundColor = "#121212";
    playerContainer.style.border = "1px solid #222222";
    playerContainer.style.borderRadius = "6px";
    playerContainer.style.overflow = "hidden";

    const emptyPlaceholder = document.createElement("div");
    emptyPlaceholder.style.display = "flex";
    emptyPlaceholder.style.flexDirection = "column";
    emptyPlaceholder.style.alignItems = "center";
    emptyPlaceholder.style.justifyContent = "center";
    emptyPlaceholder.style.width = "100%";
    emptyPlaceholder.style.height = "270px";
    emptyPlaceholder.style.color = "#555555";
    emptyPlaceholder.style.fontSize = "11px";
    emptyPlaceholder.style.fontFamily = "sans-serif";
    emptyPlaceholder.style.gap = "8px";

    const fishIcon = document.createElement("div");
    fishIcon.textContent = "🐟";
    fishIcon.style.fontSize = "28px";
    emptyPlaceholder.appendChild(fishIcon);

    const emptyText = document.createElement("div");
    emptyText.textContent = "Listo para guardar, previsualizar o comparar video";
    emptyPlaceholder.appendChild(emptyText);
    playerContainer.appendChild(emptyPlaceholder);

    node._pez_player_container = playerContainer;

    node.addDOMWidget("video_player_container_ui", "HTML", playerContainer, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 280, getMaxHeight: () => 280
    });

    // Dimensiones finales del nodo (450 x 840)
    node.setSize([450, 840]);

    updatePreviewText();
    setTimeout(() => {
        applySlotPositions(node);
        updatePreviewText();
        if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
    }, 50);
}

function renderVideoPlayer(node, mainVideoInfo, prevVideoInfo) {
    const container = node._pez_player_container;
    if (!container) return;

    container.innerHTML = "";

    const mainUrl = `/view?filename=${encodeURIComponent(mainVideoInfo.filename)}&subfolder=${encodeURIComponent(mainVideoInfo.subfolder || "")}&type=${encodeURIComponent(mainVideoInfo.type || "output")}`;
    const prevUrl = prevVideoInfo ? `/view?filename=${encodeURIComponent(prevVideoInfo.filename)}&subfolder=${encodeURIComponent(prevVideoInfo.subfolder || "")}&type=${encodeURIComponent(prevVideoInfo.type || "output")}` : null;

    const topBar = document.createElement("div");
    topBar.style.display = "flex";
    topBar.style.justifyContent = "space-between";
    topBar.style.alignItems = "center";
    topBar.style.padding = "4px 8px";
    topBar.style.backgroundColor = "#181818";
    topBar.style.borderBottom = "1px solid #282828";

    const pathInfo = document.createElement("div");
    pathInfo.textContent = mainVideoInfo.filename;
    pathInfo.title = mainVideoInfo.filename;
    pathInfo.style.color = "#aaaaaa";
    pathInfo.style.fontSize = "9px";
    pathInfo.style.fontFamily = "monospace";
    pathInfo.style.overflow = "hidden";
    pathInfo.style.textOverflow = "ellipsis";
    pathInfo.style.whiteSpace = "nowrap";
    pathInfo.style.maxWidth = "210px";
    topBar.appendChild(pathInfo);

    const btnGroup = document.createElement("div");
    btnGroup.style.display = "flex";
    btnGroup.style.gap = "4px";

    if (mainVideoInfo.type === "temp") {
        const btnSaveNow = document.createElement("button");
        btnSaveNow.type = "button";
        btnSaveNow.textContent = "💾 GUARDAR ESTE VIDEO EN DISCO";
        btnSaveNow.title = "Guardar este video generado inmediatamente sin volver a procesar";
        btnSaveNow.style.height = "22px";
        btnSaveNow.style.padding = "1px 8px";
        btnSaveNow.style.backgroundColor = "#ef4444";
        btnSaveNow.style.border = "1px solid #ff6666";
        btnSaveNow.style.borderRadius = "3px";
        btnSaveNow.style.color = "#ffffff";
        btnSaveNow.style.fontSize = "9px";
        btnSaveNow.style.fontWeight = "bold";
        btnSaveNow.style.cursor = "pointer";

        btnSaveNow.onclick = async () => {
            btnSaveNow.textContent = "⏳ Guardando...";
            btnSaveNow.disabled = true;
            try {
                const targetDir = node._pez_dir_input ? node._pez_dir_input.value : "output";
                const pattern = node._pez_pattern_input ? node._pez_pattern_input.value : "[name]_[date]_[time]_[counter]";
                const res = await fetch("/pez/save_video_file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filename: mainVideoInfo.filename,
                        subfolder: mainVideoInfo.subfolder || "",
                        target_dir: targetDir,
                        filename_pattern: pattern
                    })
                });
                const data = await res.json();
                if (data.success) {
                    btnSaveNow.textContent = "✅ Guardado en " + data.saved_filename;
                    btnSaveNow.style.backgroundColor = "#22c55e";
                    btnSaveNow.style.borderColor = "#4ade80";
                    pathInfo.textContent = data.saved_filename;
                } else {
                    btnSaveNow.textContent = "❌ " + (data.error || "Error al guardar");
                    btnSaveNow.style.backgroundColor = "#b91c1c";
                }
            } catch (err) {
                btnSaveNow.textContent = "❌ Error de conexión";
                btnSaveNow.style.backgroundColor = "#b91c1c";
            }
        };
        btnGroup.appendChild(btnSaveNow);
    }

    const btnDownload = document.createElement("a");
    btnDownload.href = mainUrl;
    btnDownload.download = mainVideoInfo.filename;
    btnDownload.textContent = "📥 DESCARGAR";
    btnDownload.style.display = "inline-flex";
    btnDownload.style.alignItems = "center";
    btnDownload.style.height = "22px";
    btnDownload.style.padding = "1px 8px";
    btnDownload.style.boxSizing = "border-box";
    btnDownload.style.backgroundColor = "#2a2a2a";
    btnDownload.style.border = "1px solid #444444";
    btnDownload.style.borderRadius = "3px";
    btnDownload.style.color = "#ffffff";
    btnDownload.style.fontSize = "9px";
    btnDownload.style.fontWeight = "bold";
    btnDownload.style.textDecoration = "none";
    btnDownload.style.cursor = "pointer";
    btnGroup.appendChild(btnDownload);

    const btnFullscreen = document.createElement("button");
    btnFullscreen.type = "button";
    btnFullscreen.textContent = "⛶ PANTALLA COMPLETA";
    btnFullscreen.title = "Ver video en pantalla completa";
    btnFullscreen.style.display = "inline-flex";
    btnFullscreen.style.alignItems = "center";
    btnFullscreen.style.height = "22px";
    btnFullscreen.style.padding = "1px 8px";
    btnFullscreen.style.boxSizing = "border-box";
    btnFullscreen.style.backgroundColor = "#2a2a2a";
    btnFullscreen.style.border = "1px solid #444444";
    btnFullscreen.style.borderRadius = "3px";
    btnFullscreen.style.color = "#ffffff";
    btnFullscreen.style.fontSize = "9px";
    btnFullscreen.style.fontWeight = "bold";
    btnFullscreen.style.cursor = "pointer";
    btnGroup.appendChild(btnFullscreen);

    topBar.appendChild(btnGroup);
    container.appendChild(topBar);

    if (prevUrl) {
        const compareWrapper = document.createElement("div");
        compareWrapper.style.position = "relative";
        compareWrapper.style.width = "100%";
        compareWrapper.style.height = "240px";
        compareWrapper.style.minHeight = "240px";
        compareWrapper.style.backgroundColor = "#000000";
        compareWrapper.style.overflow = "hidden";
        compareWrapper.style.userSelect = "none";
        compareWrapper.style.cursor = "ew-resize";

        btnFullscreen.onclick = () => {
            if (compareWrapper.requestFullscreen) compareWrapper.requestFullscreen();
            else if (compareWrapper.webkitRequestFullscreen) compareWrapper.webkitRequestFullscreen();
        };

        // 1. CAPA DE FONDO: Video Previo (tamaño completo 100%, nunca cambia de escala)
        const videoAntes = document.createElement("video");
        videoAntes.src = prevUrl;
        videoAntes.loop = true;
        videoAntes.muted = true;
        videoAntes.autoplay = true;
        videoAntes.style.position = "absolute";
        videoAntes.style.top = "0";
        videoAntes.style.left = "0";
        videoAntes.style.width = "100%";
        videoAntes.style.height = "100%";
        videoAntes.style.objectFit = "contain";
        videoAntes.style.pointerEvents = "none";
        compareWrapper.appendChild(videoAntes);

        // 2. CAPA SUPERIOR: Video Nuevo (mismo tamaño exacto 100%, enmascarado con clip-path)
        const videoDespues = document.createElement("video");
        videoDespues.src = mainUrl;
        videoDespues.loop = true;
        videoDespues.muted = true;
        videoDespues.autoplay = true;
        videoDespues.style.position = "absolute";
        videoDespues.style.top = "0";
        videoDespues.style.left = "0";
        videoDespues.style.width = "100%";
        videoDespues.style.height = "100%";
        videoDespues.style.objectFit = "contain";
        videoDespues.style.clipPath = "inset(0 0 0 50%)"; // Enmascara la mitad izquierda mostrando el previo
        videoDespues.style.pointerEvents = "none";
        compareWrapper.appendChild(videoDespues);

        // 3. ETIQUETAS "PREVIO" Y "NUEVO"
        const badgeAntes = document.createElement("div");
        badgeAntes.textContent = "PREVIO";
        badgeAntes.style.position = "absolute";
        badgeAntes.style.top = "8px";
        badgeAntes.style.left = "8px";
        badgeAntes.style.backgroundColor = "rgba(0,0,0,0.7)";
        badgeAntes.style.border = "1px solid rgba(239, 68, 68, 0.6)";
        badgeAntes.style.color = "#ef4444";
        badgeAntes.style.fontSize = "9px";
        badgeAntes.style.fontWeight = "bold";
        badgeAntes.style.padding = "2px 6px";
        badgeAntes.style.borderRadius = "3px";
        badgeAntes.style.zIndex = "5";
        badgeAntes.style.pointerEvents = "none";
        compareWrapper.appendChild(badgeAntes);

        const badgeDespues = document.createElement("div");
        badgeDespues.textContent = "NUEVO";
        badgeDespues.style.position = "absolute";
        badgeDespues.style.top = "8px";
        badgeDespues.style.right = "8px";
        badgeDespues.style.backgroundColor = "rgba(0,0,0,0.7)";
        badgeDespues.style.border = "1px solid rgba(34, 197, 94, 0.6)";
        badgeDespues.style.color = "#22c55e";
        badgeDespues.style.fontSize = "9px";
        badgeDespues.style.fontWeight = "bold";
        badgeDespues.style.padding = "2px 6px";
        badgeDespues.style.borderRadius = "3px";
        badgeDespues.style.zIndex = "5";
        badgeDespues.style.pointerEvents = "none";
        compareWrapper.appendChild(badgeDespues);

        // 4. LÍNEA DIVISORIA VERTICAL
        const dividerLine = document.createElement("div");
        dividerLine.style.position = "absolute";
        dividerLine.style.top = "0";
        dividerLine.style.bottom = "0";
        dividerLine.style.width = "2px";
        dividerLine.style.backgroundColor = "#ef4444";
        dividerLine.style.left = "50%";
        dividerLine.style.transform = "translateX(-50%)";
        dividerLine.style.pointerEvents = "none";
        dividerLine.style.zIndex = "10";
        dividerLine.style.boxShadow = "0 0 6px rgba(239, 68, 68, 0.8)";
        compareWrapper.appendChild(dividerLine);

        // 5. MANIJA CIRCULAR DE ARRASTRE
        const handle = document.createElement("div");
        handle.style.position = "absolute";
        handle.style.top = "50%";
        handle.style.left = "50%";
        handle.style.transform = "translate(-50%, -50%)";
        handle.style.width = "34px";
        handle.style.height = "34px";
        handle.style.borderRadius = "50%";
        handle.style.backgroundColor = "#ef4444";
        handle.style.border = "2px solid #ffffff";
        handle.style.color = "#ffffff";
        handle.style.display = "flex";
        handle.style.alignItems = "center";
        handle.style.justifyContent = "center";
        handle.style.cursor = "ew-resize";
        handle.style.boxShadow = "0px 3px 10px rgba(0,0,0,0.9)";
        handle.style.zIndex = "20";
        handle.style.userSelect = "none";
        handle.style.whiteSpace = "nowrap";
        handle.innerHTML = `<span style="font-size: 11px; font-weight: 900; letter-spacing: 2px; margin-left: 2px; display: inline-block;">◀▶</span>`;
        compareWrapper.appendChild(handle);

        let isDragging = false;
        const updateSplit = (clientX) => {
            const rect = compareWrapper.getBoundingClientRect();
            if (!rect.width) return;
            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));
            const pct = (x / rect.width) * 100;
            videoDespues.style.clipPath = `inset(0 0 0 ${pct}%)`;
            dividerLine.style.left = `${pct}%`;
            handle.style.left = `${pct}%`;
        };

        handle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isDragging = true;
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        };
        compareWrapper.onmousedown = (e) => {
            if (e.target === handle || handle.contains(e.target)) return;
            e.preventDefault();
            isDragging = true;
            updateSplit(e.clientX);
            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        };
        const onMouseMove = (e) => {
            if (isDragging) updateSplit(e.clientX);
        };
        const onMouseUp = () => {
            isDragging = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        container.appendChild(compareWrapper);

        const controlBar = document.createElement("div");
        controlBar.style.display = "flex";
        controlBar.style.alignItems = "center";
        controlBar.style.gap = "8px";
        controlBar.style.padding = "4px 8px";
        controlBar.style.backgroundColor = "#181818";

        const btnPlay = document.createElement("button");
        btnPlay.type = "button";
        btnPlay.textContent = "❚❚";
        btnPlay.style.height = "22px";
        btnPlay.style.width = "30px";
        btnPlay.style.backgroundColor = "#2a2a2a";
        btnPlay.style.border = "1px solid #444";
        btnPlay.style.borderRadius = "3px";
        btnPlay.style.color = "#fff";
        btnPlay.style.cursor = "pointer";

        btnPlay.onclick = () => {
            if (videoAntes.paused) {
                videoAntes.play();
                videoDespues.play();
                btnPlay.textContent = "❚❚";
            } else {
                videoAntes.pause();
                videoDespues.pause();
                btnPlay.textContent = "▶";
            }
        };
        controlBar.appendChild(btnPlay);

        const scrubBar = document.createElement("input");
        scrubBar.type = "range";
        scrubBar.min = "0";
        scrubBar.max = "100";
        scrubBar.value = "0";
        scrubBar.style.flex = "1";
        scrubBar.style.accentColor = "#ef4444";
        scrubBar.style.cursor = "pointer";

        videoAntes.ontimeupdate = () => {
            if (videoAntes.duration) {
                scrubBar.value = (videoAntes.currentTime / videoAntes.duration) * 100;
            }
            if (Math.abs(videoAntes.currentTime - videoDespues.currentTime) > 0.08) {
                videoDespues.currentTime = videoAntes.currentTime;
            }
        };

        scrubBar.oninput = () => {
            if (videoAntes.duration) {
                const targetTime = (parseFloat(scrubBar.value) / 100) * videoAntes.duration;
                videoAntes.currentTime = targetTime;
                videoDespues.currentTime = targetTime;
            }
        };
        controlBar.appendChild(scrubBar);

        const btnMute = document.createElement("button");
        btnMute.type = "button";
        btnMute.textContent = "🔇";
        btnMute.title = "Silenciar / Activar sonido";
        btnMute.style.height = "22px";
        btnMute.style.width = "30px";
        btnMute.style.backgroundColor = "#2a2a2a";
        btnMute.style.border = "1px solid #444";
        btnMute.style.borderRadius = "3px";
        btnMute.style.color = "#fff";
        btnMute.style.cursor = "pointer";
        btnMute.onclick = () => {
            const isMuted = videoAntes.muted;
            videoAntes.muted = !isMuted;
            videoDespues.muted = !isMuted;
            btnMute.textContent = isMuted ? "🔊" : "🔇";
        };
        controlBar.appendChild(btnMute);

        const btnFs = document.createElement("button");
        btnFs.type = "button";
        btnFs.textContent = "⛶";
        btnFs.title = "Pantalla completa";
        btnFs.style.height = "22px";
        btnFs.style.width = "30px";
        btnFs.style.backgroundColor = "#2a2a2a";
        btnFs.style.border = "1px solid #444";
        btnFs.style.borderRadius = "3px";
        btnFs.style.color = "#fff";
        btnFs.style.cursor = "pointer";
        btnFs.onclick = () => {
            if (compareWrapper.requestFullscreen) compareWrapper.requestFullscreen();
            else if (compareWrapper.webkitRequestFullscreen) compareWrapper.webkitRequestFullscreen();
        };
        controlBar.appendChild(btnFs);

        container.appendChild(controlBar);

    } else {
        const videoElem = document.createElement("video");
        videoElem.src = mainUrl;
        videoElem.controls = true;
        videoElem.autoplay = true;
        videoElem.loop = true;
        videoElem.style.width = "100%";
        videoElem.style.height = "240px";
        videoElem.style.minHeight = "240px";
        videoElem.style.objectFit = "contain";
        videoElem.style.backgroundColor = "#000000";
        videoElem.style.display = "block";
        videoElem.style.borderRadius = "4px";

        btnFullscreen.onclick = () => {
            if (videoElem.requestFullscreen) videoElem.requestFullscreen();
            else if (videoElem.webkitRequestFullscreen) videoElem.webkitRequestFullscreen();
        };

        container.appendChild(videoElem);
    }
}

app.registerExtension({
    name: "Pez.VideoSaveCompareUI",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PezVideoSaveCompare") {
            const origOnNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (origOnNodeCreated) origOnNodeCreated.apply(this, arguments);
                setupPezVideoSaveUI(this);
            };

            const origOnExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                if (origOnExecuted) origOnExecuted.apply(this, arguments);
                if (message && message.videos && message.videos.length > 0) {
                    const mainVideo = message.videos[0];
                    const prevVideo = (message.video_previo && message.video_previo.length > 0) ? message.video_previo[0] : null;
                    renderVideoPlayer(this, mainVideo, prevVideo);
                }
            };
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "PezVideoSaveCompare") {
            setTimeout(() => {
                setupPezVideoSaveUI(node);
            }, 15);
        }
    },
    async loadedGraphNode(node) {
        if (node.comfyClass === "PezVideoSaveCompare") {
            setTimeout(() => {
                setupPezVideoSaveUI(node);
            }, 15);
        }
    }
});
