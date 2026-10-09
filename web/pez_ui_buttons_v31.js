import { app } from "../../scripts/app.js";

console.log("🐟 Pez UI Buttons V31 Loaded! (Trimmer, AutoBatcher, Prompter & Transparent PNG)");

const VALID_RESOLUTIONS = ["Original", "1920x1080", "1280x720", "1024x1024", "768x768", "512x512", "512x768", "768x512"];
const VALID_MOTORS = ["Exacto", "LTX-Video (8N+1)", "WanVideo (4N+1)"];
const VALID_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "3:2", "2:3"];

function restorePrompterMaximumWidgets(node, values) {
    if (!node || !node.widgets) return;

    const wAspect = node.widgets.find(w => w.name === "aspect_ratio");
    const wMega = node.widgets.find(w => w.name === "megapixels");
    const wMult = node.widgets.find(w => w.name === "multiple");
    const wDur = node.widgets.find(w => w.name === "duration_seconds");
    const wMainPrompt = node.widgets.find(w => w.name === "main_prompt");
    const wNegPrompt = node.widgets.find(w => w.name === "negative_prompt");

    let sourceValues = values;
    if (!sourceValues || !Array.isArray(sourceValues)) {
        sourceValues = node.widgets_values || [];
    }

    if (sourceValues.length > 6) {
        // Saved with DOM widgets in old version
        if (wAspect && sourceValues[0] !== undefined) wAspect.value = sourceValues[0];
        if (wMega && sourceValues[2] !== undefined) wMega.value = sourceValues[2];
        if (wMult && sourceValues[3] !== undefined) wMult.value = sourceValues[3];
        if (wDur && sourceValues[5] !== undefined) wDur.value = sourceValues[5];
        if (wMainPrompt && sourceValues[7] !== undefined) wMainPrompt.value = sourceValues[7];
        if (wNegPrompt && sourceValues[8] !== undefined) wNegPrompt.value = sourceValues[8];
    } else if (sourceValues.length >= 4) {
        if (sourceValues[2] === 2 && (sourceValues[5] === 15 || sourceValues[5] === "15" || sourceValues[5] === 15.0)) {
            // Shifted values corrupted in older save
            if (wAspect) wAspect.value = sourceValues[0] || "16:9";
            if (wMega) wMega.value = 0.7;
            if (wMult) wMult.value = 32;
            if (wDur) wDur.value = 10.0;
            if (wMainPrompt) wMainPrompt.value = "";
            if (wNegPrompt) wNegPrompt.value = "";
        } else {
            if (wAspect && sourceValues[0] !== undefined) wAspect.value = sourceValues[0];
            if (wMega && sourceValues[1] !== undefined) wMega.value = sourceValues[1];
            if (wMult && sourceValues[2] !== undefined) wMult.value = sourceValues[2];
            if (wDur && sourceValues[3] !== undefined) wDur.value = sourceValues[3];
            if (wMainPrompt && sourceValues[4] !== undefined) wMainPrompt.value = sourceValues[4];
            if (wNegPrompt && sourceValues[5] !== undefined) wNegPrompt.value = sourceValues[5];
        }
    }

    // Defaults si están vacíos o inválidos
    if (wAspect) {
        if (!wAspect.value || !VALID_ASPECTS.includes(String(wAspect.value))) {
            wAspect.value = "16:9";
        }
    }

    // 2. Megapixels: default 0.7
    if (wMega) {
        let v = parseFloat(wMega.value);
        if (isNaN(v) || v <= 0 || v > 10) {
            wMega.value = 0.7;
        }
    }

    // 3. Multiple: default 32
    if (wMult) {
        let v = parseInt(wMult.value);
        if (isNaN(v) || v < 8 || v % 8 !== 0) {
            wMult.value = 32;
        }
    }

    // 4. Duration Seconds: default 10.0
    if (wDur) {
        let v = parseFloat(wDur.value);
        if (isNaN(v) || v <= 0 || v > 60) {
            wDur.value = 10.0;
        }
    }

    // 5. Main Prompt: default ""
    if (wMainPrompt) {
        if (wMainPrompt.value == null || typeof wMainPrompt.value === "number") {
            wMainPrompt.value = "";
        }
    }

    // 6. Negative Prompt: default ""
    if (wNegPrompt) {
        if (wNegPrompt.value == null || typeof wNegPrompt.value === "number") {
            wNegPrompt.value = "";
        }
    }
}

function sanitizeWidgetValues(node) {
    if (!node || !node.widgets) return;

    for (let w of node.widgets) {
        if (w.name === "start_second") {
            const val = parseFloat(w.value);
            if (isNaN(val)) w.value = 0.0;
        } else if (w.name === "end_second") {
            const val = parseFloat(w.value);
            if (isNaN(val) || val <= 0) w.value = 60.0;
        } else if (w.name === "segundos_por_lote") {
            const val = parseFloat(w.value);
            if (isNaN(val)) w.value = (node.comfyClass === "PezAutoBatcher" ? 10.0 : 0.0);
        } else if (w.name === "custom_width" || w.name === "custom_height") {
            const val = parseInt(w.value);
            if (isNaN(val) || val < 0) w.value = 0;
        } else if (w.name === "resolution") {
            if (!w.value || !VALID_RESOLUTIONS.includes(String(w.value))) {
                w.value = "Original";
            }
            if (w.value === "Original") {
                const cw = node.widgets.find(x => x.name === "custom_width");
                const ch = node.widgets.find(x => x.name === "custom_height");
                if (cw && !node._pez_user_custom_edited) cw.value = 0;
                if (ch && !node._pez_user_custom_edited) ch.value = 0;
            }
        } else if (w.name === "motor_alineacion") {
            if (!node._pez_user_selected_motor) {
                if (!w.value || !VALID_MOTORS.includes(String(w.value)) || w.value === "LTX-Video (8N+1)") {
                    w.value = "Exacto";
                }
            } else if (!w.value || !VALID_MOTORS.includes(String(w.value))) {
                w.value = "Exacto";
            }
        } else if (w.name === "aspect_ratio") {
            if (!w.value || !VALID_ASPECTS.includes(String(w.value))) {
                w.value = "16:9";
            }
        } else if (w.name === "megapixels") {
            const val = parseFloat(w.value);
            if (isNaN(val) || val <= 0 || val > 10) w.value = 0.7;
        } else if (w.name === "multiple") {
            const val = parseInt(w.value);
            if (isNaN(val) || val < 8 || val % 8 !== 0) w.value = 32;
        } else if (w.name === "duration_seconds") {
            const val = parseFloat(w.value);
            if (isNaN(val) || val <= 0 || val > 60) w.value = 10.0;
        } else if (w.name === "main_prompt") {
            if (w.value == null || typeof w.value === "number") {
                w.value = "";
            }
        } else if (w.name === "negative_prompt") {
            if (w.value == null || typeof w.value === "number") {
                w.value = "";
            }
        } else if (w.name === "bg_color") {
            if (!w.value || typeof w.value !== "string" || !w.value.startsWith("#")) {
                w.value = "#808080";
            }
        }
    }
}

// Actualizar visualmente el botón seleccionado en rojo
function updateAllPezButtons(node) {
    if (!node || !node.widgets) return;
    sanitizeWidgetValues(node);

    for (const w of node.widgets) {
        if (w.name === "resolution" || w.name === "motor_alineacion" || w.name === "aspect_ratio") {
            const buttons = node["_pez_buttons_" + w.name];
            if (buttons && Array.isArray(buttons)) {
                buttons.forEach(b => {
                    if (b.updateState) b.updateState();
                });
            }
        }
    }
}

function normalizeSlots(node) {
    if (!node) return;
    const nameMap = {
        "model": "modelo",
        "modelo": "modelo",
        "clip": "clip",
        "image": "imagen",
        "imagen": "imagen",
        "mask": "máscara",
        "mascara": "máscara",
        "máscara": "máscara",
        "tinyvae": "tiny_vae",
        "tiny_vae": "tiny_vae",
        "video": "video",
        "audio": "audio",
        "tags (extra)": "tags (extra)",
        "tags": "tags (extra)",
        "extra_tags": "tags (extra)"
    };

    if (node.inputs && Array.isArray(node.inputs)) {
        for (const input of node.inputs) {
            if (!input) continue;
            const lowName = (input.name || "").toLowerCase();
            const lowLabel = (input.label || "").toLowerCase();
            if (nameMap[lowName]) {
                input.label = nameMap[lowName];
            } else if (nameMap[lowLabel]) {
                input.label = nameMap[lowLabel];
            } else if (input.label) {
                input.label = input.label.toLowerCase();
            } else if (input.name) {
                input.label = input.name.toLowerCase();
            }
        }
    }

    if (node.outputs && Array.isArray(node.outputs)) {
        for (const output of node.outputs) {
            if (!output) continue;
            const lowName = (output.name || "").toLowerCase();
            const lowLabel = (output.label || "").toLowerCase();
            if (nameMap[lowName]) {
                output.label = nameMap[lowName];
                output.name = nameMap[lowName];
            } else if (nameMap[lowLabel]) {
                output.label = nameMap[lowLabel];
                output.name = nameMap[lowLabel];
            } else if (output.label) {
                output.label = output.label.toLowerCase();
                output.name = output.name.toLowerCase();
            } else if (output.name) {
                output.label = output.name.toLowerCase();
                output.name = output.name.toLowerCase();
            }
        }
    }
}

// 1. DIBUJAR MARCAS "← ENTRADAS" Y "SALIDAS →" EN ROJO (9px BOLD)
function hookNodeLabels(node) {
    if (!node) return;
    if (node._pez_labels_hooked) {
        normalizeSlots(node);
        return;
    }
    node._pez_labels_hooked = true;

    if (node.title && !node.title.startsWith("🐟")) {
        node.title = "🐟 " + node.title.replace(/^🐟\s*/, "");
    }

    normalizeSlots(node);

    const origConfigure = node.onConfigure || node.configure;
    node.onConfigure = function() {
        if (origConfigure) origConfigure.apply(this, arguments);
        normalizeSlots(this);
    };

    // Geometría limpia: slots inician a y = 30 con margen debajo del título y = 16
    node.getInputPos = function(slot, out) {
        out = out || new Float32Array(2);
        out[0] = this.pos[0] + 10;
        out[1] = this.pos[1] + 30 + (slot * 18);
        return out;
    };

    node.getOutputPos = function(slot, out) {
        out = out || new Float32Array(2);
        out[0] = this.pos[0] + this.size[0] - 10;
        out[1] = this.pos[1] + 30 + (slot * 18);
        return out;
    };

    node.getConnectionPos = function(isInput, slot_idx, out) {
        if (isInput) return this.getInputPos(slot_idx, out);
        return this.getOutputPos(slot_idx, out);
    };

    if (node.comfyClass === "PezPrompterMaximum") {
        node.widgets_start_y = 112;
    }

    const origOnResize = node.onResize;
    node.onResize = function(size) {
        if (origOnResize) origOnResize.apply(this, arguments);
        if (this.comfyClass === "PezPrompterMaximum") {
            this.widgets_start_y = 112;
        }
    };

    const origDrawFg = node.onDrawForeground;
    node.onDrawForeground = function(ctx) {
        if (origDrawFg) origDrawFg.apply(this, arguments);
        if (this.comfyClass === "PezPrompterMaximum") {
            this.widgets_start_y = 112;
        }
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 9px sans-serif";

        // Marcar ENTRADAS únicamente si tiene entradas reales y NO es PezLoadTransparentPNG
        if (this.comfyClass !== "PezLoadTransparentPNG" && this.inputs && this.inputs.length > 0) {
            ctx.textAlign = "left";
            ctx.fillText("← ENTRADAS", 16, 16);
        }

        // Marcar SALIDAS a la derecha únicamente si tiene salidas
        if (this.outputs && this.outputs.length > 0) {
            ctx.textAlign = "right";
            ctx.fillText("SALIDAS →", this.size[0] - 16, 16);
        }

        ctx.restore();
    };
}

// 2. SECCIÓN "TIEMPOS" (Trimmer) (9px BOLD)
function createTiemposHeader(node) {
    if (node._pez_dom_header_tiempos) return;
    node._pez_dom_header_tiempos = true;

    const neededH = 38;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "10px 0px 6px 0px";
    container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    label.textContent = "TIEMPOS";
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.marginBottom = "8px";
    container.appendChild(label);

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget("header_tiempos_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => neededH,
            getMaxHeight: () => neededH
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, neededH];
    }
}

// 3. SECCIÓN "TIEMPO" (Prompter Maximum) (9px BOLD)
function createTiempoPrompterHeader(node) {
    if (node._pez_dom_header_tiempo_prompter) return;
    node._pez_dom_header_tiempo_prompter = true;

    const neededH = 38;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "10px 0px 6px 0px";
    container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    label.textContent = "TIEMPO";
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.marginBottom = "8px";
    container.appendChild(label);

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget("header_tiempo_prompter_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => neededH,
            getMaxHeight: () => neededH
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, neededH];
    }
}

// 4. SECCIÓN "ARCHIVO DE VIDEO" (9px BOLD)
function createVideoSectionHeader(node) {
    if (node._pez_dom_header_video) return;
    node._pez_dom_header_video = true;

    const neededH = 40;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "12px 0px 6px 0px";
    container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    label.textContent = "ARCHIVO DE VIDEO";
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.marginBottom = "8px";
    container.appendChild(label);

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget("header_video_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => neededH,
            getMaxHeight: () => neededH
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, neededH];
    }
}

// 5. SECCIÓN "PROMPTS" (9px BOLD)
function createPromptsSectionHeader(node) {
    if (node._pez_dom_header_prompts) return;
    node._pez_dom_header_prompts = true;

    const neededH = 38;

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "10px 0px 6px 0px";
    container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    label.textContent = "PROMPTS";
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.marginBottom = "8px";
    container.appendChild(label);

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget("header_prompts_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => neededH,
            getMaxHeight: () => neededH
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, neededH];
    }
}

// 6. BOTÓN "ELIGE ARCHIVO PARA SUBIR" CON ILUMINACIÓN EN ROJO AL ROLLOVER
function createUploadDOMButton(node, uploadWidget) {
    if (node._pez_dom_upload_created) return;
    node._pez_dom_upload_created = true;

    // Purgar y ocultar cualquier widget nativo de upload para que jamás se duplique en el canvas
    if (node.widgets) {
        for (let i = node.widgets.length - 1; i >= 0; i--) {
            const w = node.widgets[i];
            if (w && w.name !== "upload_btn_ui" && (
                w.name === "upload" || 
                w.name === "choose file to upload" || 
                (typeof w.label === "string" && w.label.toLowerCase().includes("subir")) || 
                (w.type === "button" && w.name !== "upload_btn_ui")
            )) {
                w.computeSize = () => [0, -4];
                w.draw = () => {};
                w.type = "hidden";
                if (w.element) w.element.style.display = "none";
                node.widgets.splice(i, 1);
            }
        }
    }

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.width = "100%";
    container.style.boxSizing = "border-box";
    container.style.padding = "4px 0px 14px 0px";
    container.style.userSelect = "none";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "elige archivo para subir";
    btn.style.width = "100%";
    btn.style.height = "28px";
    btn.style.boxSizing = "border-box";
    btn.style.padding = "4px 8px";
    btn.style.backgroundColor = "#242424";
    btn.style.border = "1px solid #161616";
    btn.style.borderRadius = "4px";
    btn.style.color = "#aaaaaa";
    btn.style.fontSize = "11px";
    btn.style.fontFamily = "sans-serif";
    btn.style.cursor = "pointer";
    btn.style.transition = "all 0.15s ease";

    btn.onmouseenter = () => {
        btn.style.backgroundColor = "#303030";
        btn.style.borderColor = "#ef4444";
        btn.style.color = "#ffffff";
    };
    btn.onmouseleave = () => {
        btn.style.backgroundColor = "#242424";
        btn.style.borderColor = "#161616";
        btn.style.color = "#aaaaaa";
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isVideoNode = (node.comfyClass === "PezVideoTrimmer");
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = isVideoNode ? "video/*,.mp4,.webm,.mkv,.avi,.mov,.gif" : "image/*,.png,.jpg,.jpeg,.webp";
        inp.style.display = "none";
        inp.onchange = async () => {
            const file = inp.files?.[0];
            inp.remove();
            if (!file) return;
            const fd = new FormData();
            fd.append("image", file, file.name);
            fd.append("overwrite", "true");
            try {
                const res = await fetch("/upload/image", { method: "POST", body: fd });
                if (res.ok) {
                    const data = await res.json();
                    const name = data.name;
                    const targetWidgetName = isVideoNode ? "video" : "image";
                    const targetWidget = node.widgets?.find(w => w.name === targetWidgetName);
                    if (targetWidget) {
                        if (!targetWidget.options) targetWidget.options = { values: [] };
                        if (!targetWidget.options.values.includes(name)) {
                            targetWidget.options.values.push(name);
                            targetWidget.options.values.sort();
                        }
                        targetWidget.value = name;
                        if (targetWidget.callback) targetWidget.callback(name);
                    }
                    if (isVideoNode) {
                        updateTrimmerVideoPlayer(node);
                    }
                    if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
                    if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
                }
            } catch (err) {
                console.error("[Pez] Error subiendo archivo:", err);
            }
        };
        document.body.appendChild(inp);
        inp.click();
    };

    container.appendChild(btn);

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget("upload_btn_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => 44,
            getMaxHeight: () => 44
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, 44];
    }
}

// 7. BOTONERAS CON SINCRONIZACIÓN PERSISTENTE Y REACTIVA
function createButtonGridDOM(node, targetWidget, widgetName) {
    if (node["_pez_dom_" + widgetName]) {
        updateAllPezButtons(node);
        return;
    }
    node["_pez_dom_" + widgetName] = true;

    if (widgetName === "resolution") {
        if (!targetWidget.value || !VALID_RESOLUTIONS.includes(String(targetWidget.value))) {
            targetWidget.value = "Original";
        }
    } else if (widgetName === "motor_alineacion") {
        if (!node._pez_user_selected_motor) {
            if (!targetWidget.value || !VALID_MOTORS.includes(String(targetWidget.value)) || targetWidget.value === "LTX-Video (8N+1)") {
                targetWidget.value = "Exacto";
            }
        } else if (!targetWidget.value || !VALID_MOTORS.includes(String(targetWidget.value))) {
            targetWidget.value = "Exacto";
        }
    } else if (widgetName === "aspect_ratio") {
        if (!targetWidget.value || !VALID_ASPECTS.includes(String(targetWidget.value))) {
            targetWidget.value = "16:9";
        }
    }

    const options = targetWidget.options?.values || 
                    (Array.isArray(targetWidget.options) ? targetWidget.options : []) || 
                    targetWidget.pez_options || 
                    (widgetName === "aspect_ratio" ? VALID_ASPECTS : []);

    if (!options || options.length === 0) return;

    const isMultiRow = options.length > 4;
    const neededH = isMultiRow ? 102 : 74;

    targetWidget.computeSize = () => [0, -4];
    targetWidget.draw = () => {};
    targetWidget.type = "hidden";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "0px 0px 8px 0px";
    container.style.borderTop = "1px solid rgba(255, 255, 255, 0.12)";
    container.style.userSelect = "none";
    container.style.overflow = "hidden";

    const label = document.createElement("div");
    if (widgetName === "resolution") {
        label.textContent = "RESOLUCIÓN";
    } else if (widgetName === "motor_alineacion") {
        label.textContent = "ALINEACIÓN DE MODELO AI";
    } else if (widgetName === "aspect_ratio") {
        label.textContent = "RESOLUCIÓN (ASPECT RATIO)";
    } else {
        label.textContent = widgetName.toUpperCase();
    }
    label.style.color = "#ef4444";
    label.style.fontSize = "9px";
    label.style.fontFamily = "sans-serif";
    label.style.fontWeight = "bold";
    label.style.letterSpacing = "0.5px";
    label.style.height = "14px";
    label.style.lineHeight = "14px";
    label.style.marginBottom = "8px";
    container.appendChild(label);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = isMultiRow ? "repeat(4, 1fr)" : `repeat(${options.length}, 1fr)`;
    grid.style.gap = "2px";
    grid.style.width = "100%";
    grid.style.boxSizing = "border-box";
    container.appendChild(grid);

    const buttons = [];

    const getDefaultVal = () => {
        if (widgetName === "resolution") return "Original";
        if (widgetName === "motor_alineacion") return "Exacto";
        if (widgetName === "aspect_ratio") return "16:9";
        return options[0];
    };

    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = opt;
        btn.title = opt;
        btn.style.height = "26px";
        btn.style.boxSizing = "border-box";
        btn.style.padding = "2px";
        btn.style.border = "1px solid #161616";
        btn.style.borderRadius = "4px";
        btn.style.fontSize = "10px";
        btn.style.fontFamily = "sans-serif";
        btn.style.cursor = "pointer";
        btn.style.whiteSpace = "nowrap";
        btn.style.overflow = "hidden";
        btn.style.textOverflow = "ellipsis";
        btn.style.transition = "all 0.15s ease";

        let isCurrentlySelected = false;

        const updateState = () => {
            const currentValue = targetWidget.value || getDefaultVal();
            
            const isCustom = (widgetName === "resolution" && currentValue !== "Original") && (() => {
                const cw = node.widgets?.find(w => w.name === "custom_width");
                const ch = node.widgets?.find(w => w.name === "custom_height");
                return cw && ch && Number(cw.value) > 0 && Number(ch.value) > 0;
            })();

            isCurrentlySelected = !isCustom && (currentValue === opt);
            btn.style.backgroundColor = isCurrentlySelected ? "#b91c1c" : "#242424";
            btn.style.borderColor = isCurrentlySelected ? "#ef4444" : "#161616";
            btn.style.color = isCurrentlySelected ? "#ffffff" : "#9ca3af";
            btn.style.fontWeight = isCurrentlySelected ? "bold" : "normal";
        };
        btn.updateState = updateState;
        updateState();

        btn.onmouseenter = () => {
            if (isCurrentlySelected) {
                btn.style.backgroundColor = "#dc2626";
                btn.style.borderColor = "#fca5a5";
            } else {
                btn.style.backgroundColor = "#303030";
                btn.style.borderColor = "#ef4444";
                btn.style.color = "#ffffff";
            }
        };

        btn.onmouseleave = () => {
            updateState();
        };

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (widgetName === "motor_alineacion") {
                node._pez_user_selected_motor = true;
            }
            if (widgetName === "aspect_ratio") {
                node._pez_user_selected_ar = true;
            }

            targetWidget.value = opt;
            if (targetWidget.callback) {
                try {
                    targetWidget.callback(opt);
                } catch (err) {}
            }

            if (widgetName === "resolution") {
                const cw = node.widgets?.find(w => w.name === "custom_width");
                const ch = node.widgets?.find(w => w.name === "custom_height");
                if (cw) cw.value = 0;
                if (ch) ch.value = 0;
                node._pez_user_custom_edited = false;
            }

            buttons.forEach(b => b.updateState && b.updateState());

            if (node.graph) node.graph._version++;
            if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
            if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
        };

        buttons.push(btn);
        grid.appendChild(btn);
    });

    node["_pez_buttons_" + widgetName] = buttons;

    // Reactividad en targetWidget.value
    let _internalVal = targetWidget.value || getDefaultVal();
    try {
        Object.defineProperty(targetWidget, "value", {
            get() {
                if (widgetName === "resolution") {
                    if (!_internalVal || !VALID_RESOLUTIONS.includes(String(_internalVal))) return "Original";
                } else if (widgetName === "motor_alineacion") {
                    if (!_internalVal || !VALID_MOTORS.includes(String(_internalVal))) return "Exacto";
                } else if (widgetName === "aspect_ratio") {
                    if (!_internalVal || !VALID_ASPECTS.includes(String(_internalVal))) return "16:9";
                }
                return _internalVal;
            },
            set(newVal) {
                if (widgetName === "resolution") {
                    if (!newVal || !VALID_RESOLUTIONS.includes(String(newVal))) {
                        _internalVal = "Original";
                    } else {
                        _internalVal = newVal;
                    }
                } else if (widgetName === "motor_alineacion") {
                    if (!newVal || !VALID_MOTORS.includes(String(newVal))) {
                        _internalVal = "Exacto";
                    } else {
                        _internalVal = newVal;
                    }
                } else if (widgetName === "aspect_ratio") {
                    if (!newVal || !VALID_ASPECTS.includes(String(newVal))) {
                        _internalVal = "16:9";
                    } else {
                        _internalVal = newVal;
                    }
                } else {
                    _internalVal = newVal;
                }
                buttons.forEach(b => b.updateState && b.updateState());
            },
            configurable: true,
            enumerable: true
        });
    } catch (e) {}

    let domWidget = null;
    if (typeof node.addDOMWidget === "function") {
        domWidget = node.addDOMWidget(widgetName + "_btn_ui", "HTML", container, {
            serialize: false,
            hideOnZoom: false,
            getMinHeight: () => neededH,
            getMaxHeight: () => neededH
        });
    }

    if (domWidget) {
        domWidget.computeSize = (width) => [width, neededH];
    }

    if (widgetName === "resolution") {
        const cw = node.widgets?.find(w => w.name === "custom_width");
        const ch = node.widgets?.find(w => w.name === "custom_height");
        const hookChange = (w) => {
            if (w && !w._pez_hooked) {
                w._pez_hooked = true;
                const origCb = w.callback;
                w.callback = function() {
                    node._pez_user_custom_edited = true;
                    if (origCb) origCb.apply(this, arguments);
                    buttons.forEach(b => b.updateState && b.updateState());
                };
            }
        };
        hookChange(cw);
        hookChange(ch);
    }
}

// 8. GEOMETRÍA DE SLOTS Y ENCABEZADOS DE PEZVIDEOTRIMMER
function applyTrimmerSlotPositions(node) {
    if (!node || node.comfyClass !== "PezVideoTrimmer") return;
    const w = node.size ? node.size[0] : 474;

    // Slot de entrada: video_previo (y=30, x=10 dentro del nodo, icono estándar)
    if (node.inputs) {
        node.inputs.forEach((inp) => {
            if (inp.name === "video_previo") {
                inp.pos = [10, 30];
                inp.shape = 0; // Círculo estándar LiteGraph
            }
        });
    }

    // 8 Slots de salida: y=30, 48, 66, 84, 102, 120, 138, 156 (x = w - 10)
    if (node.outputs) {
        node.outputs.forEach((out, idx) => {
            out.pos = [w - 10, 30 + idx * 18];
        });
    }
}

function setupTrimmerHooks(node) {
    if (!node || node.comfyClass !== "PezVideoTrimmer") return;

    if (node.title && !node.title.startsWith("🐟")) {
        node.title = "🐟 " + node.title.replace(/^🐟\s*/, "");
    }

    // Los widgets arrancan a y = 168 (inmediatamente debajo del último slot a y=156, con margen limpio)
    node.widgets_start_y = 168;
    applyTrimmerSlotPositions(node);

    // Hook coordenadas de entrada
    node.getInputPos = function(slot, out) {
        out = out || new Float32Array(2);
        out[0] = this.pos[0] + 10;
        out[1] = this.pos[1] + 30;
        return out;
    };

    // Hook coordenadas de salida
    node.getOutputPos = function(slot, out) {
        out = out || new Float32Array(2);
        out[0] = this.pos[0] + this.size[0] - 10;
        out[1] = this.pos[1] + 30 + (slot * 18);
        return out;
    };

    // Hook conexión de cables
    node.getConnectionPos = function(isInput, slot_idx, out) {
        if (isInput) return this.getInputPos(slot_idx, out);
        return this.getOutputPos(slot_idx, out);
    };

    // Hook Canvas: Dibujar marcas rojas "← ENTRADAS" y "SALIDAS →" a y = 16
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
        if (this.size[0] < 474) this.size[0] = 474;
        if (this.size[1] < 900) this.size[1] = 900;
        this.widgets_start_y = 176;
        applyTrimmerSlotPositions(this);
    };
}

// 9. REPRODUCTOR DE VIDEO DEDICADO PARA PEZVIDEOTRIMMER (ESTÁNDAR PIXAROMA CON BARRA INFERIOR)
const PEZ_SVG_PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" style="pointer-events:none;display:block;"><path d="M8 5v14l11-7z"/></svg>`;
const PEZ_SVG_PAUSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" style="pointer-events:none;display:block;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
const PEZ_SVG_DL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" style="pointer-events:none;display:block;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
const PEZ_SVG_FS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" style="pointer-events:none;display:block;"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;

function fmtVideoTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

function createTrimmerVideoPlayerDOM(node) {
    if (!node || node.comfyClass !== "PezVideoTrimmer") return;

    let playerWidget = node.widgets?.find(w => w.name === "trimmer_player_ui");
    if (playerWidget && playerWidget.element) {
        updateTrimmerVideoPlayer(node);
        return;
    }

    const wrap = document.createElement("div");
    wrap.className = "pez-trimmer-player-wrap";
    wrap.style.cssText = "position: relative; width: 100%; height: 250px; min-height: 250px; box-sizing: border-box; margin-top: 4px;";

    const inner = document.createElement("div");
    inner.className = "pez-trimmer-inner";
    inner.style.cssText = "position: absolute; inset: 0; display: flex; flex-direction: column; border-radius: 4px; overflow: hidden; background: #000000; border: 1px solid #222222;";
    wrap.appendChild(inner);

    // Área de video superior (ocupa todo el espacio restante)
    const mediaContainer = document.createElement("div");
    mediaContainer.className = "pez-trimmer-media";
    mediaContainer.style.cssText = "position: relative; flex: 1 1 0; min-height: 0; width: 100%; background: #000000; overflow: hidden; cursor: pointer;";

    const videoEl = document.createElement("video");
    videoEl.preload = "auto";
    videoEl.playsInline = true;
    videoEl.loop = true;
    videoEl.style.cssText = "position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #000000; display: none;";
    mediaContainer.appendChild(videoEl);

    const placeholder = document.createElement("div");
    placeholder.className = "pez-trimmer-placeholder";
    placeholder.textContent = "(sin video cargado — selecciona uno arriba o súbelo)";
    placeholder.style.cssText = "position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #888888; font-size: 12px; text-align: center; padding: 16px; box-sizing: border-box; background: #141414;";
    mediaContainer.appendChild(placeholder);

    inner.appendChild(mediaContainer);

    // Barra de control inferior idéntica a Pixaroma
    const bar = document.createElement("div");
    bar.className = "pez-trimmer-bar";
    bar.style.cssText = "flex: 0 0 auto; height: 32px; display: flex; align-items: center; gap: 8px; padding: 4px 8px; box-sizing: border-box; background: rgba(0, 0, 0, 0.45); border-top: 1px solid rgba(255, 255, 255, 0.08); user-select: none;";

    const makeBarBtn = (title, svgHtml) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = title;
        btn.style.cssText = "width: 24px; height: 24px; flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: none; border-radius: 4px; background: transparent; cursor: pointer; transition: background 0.15s ease;";
        btn.innerHTML = svgHtml;
        btn.onmouseenter = () => btn.style.background = "rgba(255, 255, 255, 0.15)";
        btn.onmouseleave = () => btn.style.background = "transparent";
        return btn;
    };

    // Botón Play / Pause
    const playBtn = makeBarBtn("Reproducir / Pausar", PEZ_SVG_PLAY);
    bar.appendChild(playBtn);

    // Tiempo actual y duración
    const timeEl = document.createElement("span");
    timeEl.className = "pez-trimmer-time";
    timeEl.style.cssText = "flex: 0 0 auto; font: 11px monospace; color: rgba(255, 255, 255, 0.75); white-space: nowrap; user-select: none;";
    timeEl.textContent = "0:00 / 0:00";
    bar.appendChild(timeEl);

    // Barra deslizadora de reproducción (Scrub bar roja)
    const scrub = document.createElement("div");
    scrub.className = "pez-trimmer-scrub";
    scrub.style.cssText = "flex: 1 1 auto; min-width: 30px; height: 6px; position: relative; border-radius: 3px; background: rgba(255, 255, 255, 0.16); cursor: pointer;";

    const fill = document.createElement("div");
    fill.style.cssText = "position: absolute; left: 0; top: 0; height: 100%; width: 0%; border-radius: 3px; background: #ef4444; pointer-events: none;";
    scrub.appendChild(fill);

    const handle = document.createElement("div");
    handle.style.cssText = "position: absolute; top: 50%; left: 0%; width: 11px; height: 11px; border-radius: 50%; background: #ffffff; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 2px rgba(0,0,0,0.6);";
    scrub.appendChild(handle);
    bar.appendChild(scrub);

    // Botón Descargar
    const dlBtn = makeBarBtn("Descargar este video", PEZ_SVG_DL);
    bar.appendChild(dlBtn);

    // Botón Pantalla Completa
    const fsBtn = makeBarBtn("Pantalla completa", PEZ_SVG_FS);
    bar.appendChild(fsBtn);

    inner.appendChild(bar);

    // Lógica interactiva
    const togglePlay = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!videoEl.src) return;
        if (videoEl.paused) videoEl.play().catch(() => {});
        else videoEl.pause();
    };

    playBtn.onclick = togglePlay;
    mediaContainer.onclick = togglePlay;

    const toggleFs = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!videoEl.src) return;
        if (videoEl.requestFullscreen) videoEl.requestFullscreen();
        else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
    };

    fsBtn.onclick = toggleFs;
    mediaContainer.ondblclick = toggleFs;

    dlBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!videoEl.src) return;
        const a = document.createElement("a");
        a.href = videoEl.src;
        a.download = node._pez_video_filename || "video.mp4";
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    // Scrub dragging
    let dragging = false;
    const seekFrom = (e) => {
        if (!videoEl.src || !videoEl.duration) return;
        const rect = scrub.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        videoEl.currentTime = ratio * videoEl.duration;
    };
    scrub.addEventListener("mousedown", (e) => {
        dragging = true;
        seekFrom(e);
        e.preventDefault();
        e.stopPropagation();
    });
    window.addEventListener("mousemove", (e) => {
        if (dragging) seekFrom(e);
    });
    window.addEventListener("mouseup", () => {
        dragging = false;
    });

    const refreshBar = () => {
        const dur = isFinite(videoEl.duration) ? videoEl.duration : 0;
        const cur = isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;
        const ratio = dur > 0 ? Math.max(0, Math.min(1, cur / dur)) : 0;
        const pct = (ratio * 100).toFixed(2) + "%";
        fill.style.width = pct;
        handle.style.left = pct;
        timeEl.textContent = `${fmtVideoTime(cur)} / ${fmtVideoTime(dur)}`;
        playBtn.innerHTML = (videoEl.paused || videoEl.ended) ? PEZ_SVG_PLAY : PEZ_SVG_PAUSE;
    };

    ["play", "pause", "ended", "timeupdate", "loadedmetadata", "durationchange"].forEach(ev => {
        videoEl.addEventListener(ev, refreshBar);
    });

    playerWidget = node.addDOMWidget("trimmer_player_ui", "HTML", wrap, {
        serialize: false,
        hideOnZoom: false,
        getMinHeight: () => 250,
        getMaxHeight: () => 250
    });
    playerWidget.computeSize = (w) => [w, 250];
    playerWidget.computeLayoutSize = () => ({ minHeight: 250, minWidth: node.size ? node.size[0] : 474 });

    updateTrimmerVideoPlayer(node);
}

function updateTrimmerVideoPlayer(node) {
    if (!node || node.comfyClass !== "PezVideoTrimmer") return;
    const playerWidget = node.widgets?.find(w => w.name === "trimmer_player_ui");
    if (!playerWidget || !playerWidget.element) return;
    const wrap = playerWidget.element;
    const videoEl = wrap.querySelector("video");
    const placeholder = wrap.querySelector(".pez-trimmer-placeholder");
    if (!videoEl) return;

    const vidWidget = node.widgets?.find(w => w.name === "video");
    const val = vidWidget ? vidWidget.value : "";
    if (!val || typeof val !== "string" || val === "0" || val === "NaN") {
        videoEl.removeAttribute("src");
        videoEl.style.display = "none";
        if (placeholder) placeholder.style.display = "flex";
        return;
    }

    const norm = val.replace(/\\/g, "/");
    const lastSlash = norm.lastIndexOf("/");
    const filename = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
    const subfolder = lastSlash >= 0 ? norm.slice(0, lastSlash) : "";

    node._pez_video_filename = filename;

    const params = new URLSearchParams({
        filename: filename,
        subfolder: subfolder,
        type: "input"
    });
    const newSrc = `/view?${params.toString()}`;
    if (videoEl.getAttribute("data-pez-src") !== newSrc) {
        videoEl.setAttribute("data-pez-src", newSrc);
        videoEl.src = newSrc;
        videoEl.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
        videoEl.load();
        const setThumb = () => {
            if (videoEl.currentTime === 0) {
                videoEl.currentTime = 0.001; // Primer fotograma visible de inmediato como miniatura
            }
        };
        videoEl.onloadedmetadata = setThumb;
        videoEl.onloadeddata = setThumb;
    }
}

// 8. ORDENAMIENTO ESTRICTO E INFALIBLE
function applyExactWidgetLayout(node) {
    if (!node || !node.widgets) return;

    if (node.comfyClass === "PezVideoTrimmer") {
        const EXACT_ORDER = [
            "header_tiempos_ui",
            "start_second",
            "end_second",
            "resolution",
            "resolution_btn_ui",
            "custom_width",
            "custom_height",
            "motor_alineacion",
            "motor_alineacion_btn_ui",
            "segundos_por_lote",
            "header_video_ui",
            "video",
            "upload_btn_ui",
            "trimmer_player_ui"
        ];

        node.widgets.sort((a, b) => {
            let idxA = EXACT_ORDER.indexOf(a.name);
            let idxB = EXACT_ORDER.indexOf(b.name);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
    } else if (node.comfyClass === "PezAutoBatcher") {
        const BATCHER_ORDER = [
            "motor_alineacion",
            "motor_alineacion_btn_ui",
            "segundos_por_lote",
            "indice_actual"
        ];

        node.widgets.sort((a, b) => {
            let idxA = BATCHER_ORDER.indexOf(a.name);
            let idxB = BATCHER_ORDER.indexOf(b.name);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
    } else if (node.comfyClass === "PezPrompterMaximum") {
        const PROMPTER_ORDER = [
            "aspect_ratio_btn_ui",
            "aspect_ratio",
            "megapixels",
            "multiple",
            "header_tiempo_prompter_ui",
            "duration_seconds",
            "header_prompts_ui",
            "main_prompt",
            "negative_prompt"
        ];

        node.widgets.sort((a, b) => {
            let idxA = PROMPTER_ORDER.indexOf(a.name);
            let idxB = PROMPTER_ORDER.indexOf(b.name);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
    } else if (node.comfyClass === "PezLoadTransparentPNG") {
        const TRANSPARENT_ORDER = [
            "image",
            "bg_color",
            "upload_btn_ui"
        ];

        node.widgets.sort((a, b) => {
            let idxA = TRANSPARENT_ORDER.indexOf(a.name);
            let idxB = TRANSPARENT_ORDER.indexOf(b.name);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            return idxA - idxB;
        });
    }
}

function processPezNode(node) {
    if (!node.widgets) return;

    // PezVideoTrimmer
    if (node.comfyClass === "PezVideoTrimmer") {
        createTiemposHeader(node);
        for (const w of [...node.widgets]) {
            if (w.name === "resolution" || w.name === "motor_alineacion") {
                createButtonGridDOM(node, w, w.name);
            }
        }
        createVideoSectionHeader(node);
        const uploadNativeWidget = node.widgets.find(w => 
            w.name === "upload" || 
            w.type === "button" || 
            (typeof w.label === "string" && w.label.toLowerCase().includes("subir")) ||
            (typeof w.name === "string" && w.name.toLowerCase().includes("subir"))
        );
        createUploadDOMButton(node, uploadNativeWidget || { label: "elige archivo para subir" });

        // Crear reproductor de video dedicado idéntico a Pixaroma
        createTrimmerVideoPlayerDOM(node);

        // Configurar geometría precisa de slots y encabezados
        setupTrimmerHooks(node);

        // Hook al cambiar el combo de video para refrescar el reproductor inmediatamente
        const vidWidget = node.widgets.find(w => w.name === "video");
        if (vidWidget && !vidWidget._pez_preview_hooked) {
            vidWidget._pez_preview_hooked = true;
            const origVidCb = vidWidget.callback;
            vidWidget.callback = function() {
                if (origVidCb) origVidCb.apply(this, arguments);
                updateTrimmerVideoPlayer(node);
                if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
            };
        }
    } 
    // PezAutoBatcher
    else if (node.comfyClass === "PezAutoBatcher") {
        hookNodeLabels(node);
        for (const w of [...node.widgets]) {
            if (w.name === "motor_alineacion") {
                createButtonGridDOM(node, w, w.name);
            }
        }
    } 
    // PezPrompterMaximum
    else if (node.comfyClass === "PezPrompterMaximum") {
        hookNodeLabels(node);
        for (const w of [...node.widgets]) {
            if (w.name === "aspect_ratio") {
                createButtonGridDOM(node, w, w.name);
            }
        }
        createTiempoPrompterHeader(node);
        createPromptsSectionHeader(node);

        const mp = node.widgets.find(w => w.name === "main_prompt");
        if (mp) {
            mp.label = "PROMPT POSITIVO";
            if (!mp.options) mp.options = {};
            mp.options.placeholder = "positive prompt";
            mp.placeholder = "positive prompt";
            if (mp.inputEl) mp.inputEl.placeholder = "positive prompt";
            if (mp.element) mp.element.placeholder = "positive prompt";
        }
        const np = node.widgets.find(w => w.name === "negative_prompt");
        if (np) {
            np.label = "PROMPT NEGATIVO";
            if (!np.options) np.options = {};
            np.options.placeholder = "negative prompt";
            np.placeholder = "negative prompt";
            if (np.inputEl) np.inputEl.placeholder = "negative prompt";
            if (np.element) np.element.placeholder = "negative prompt";
        }
    }
    // PezLoadTransparentPNG
    else if (node.comfyClass === "PezLoadTransparentPNG") {
        hookNodeLabels(node);
        const uploadNativeWidget = node.widgets.find(w => 
            w.name === "upload" || 
            w.type === "button" || 
            (typeof w.label === "string" && w.label.toLowerCase().includes("subir")) ||
            (typeof w.name === "string" && w.name.toLowerCase().includes("subir"))
        );
        createUploadDOMButton(node, uploadNativeWidget);
    }
    // PezLoadLoraWithTags
    else if (node.comfyClass === "PezLoadLoraWithTags") {
        hookNodeLabels(node);
    }

    // Ordenamiento estricto
    applyExactWidgetLayout(node);
    sanitizeWidgetValues(node);
    updateAllPezButtons(node);

    if (node.computeSize) {
        const computed = node.computeSize();
        const minW = (node.comfyClass === "PezVideoTrimmer" ? 474 : (node.comfyClass === "PezPrompterMaximum" ? 380 : (node.comfyClass === "PezLoadTransparentPNG" ? 280 : 0)));
        const minH = (node.comfyClass === "PezVideoTrimmer" ? 900 : (node.comfyClass === "PezPrompterMaximum" ? 520 : 0));
        node.setSize([
            Math.max(node.size[0] || 0, computed[0] || 0, minW),
            Math.max(node.size[1] || 0, computed[1] || 0, minH)
        ]);
        if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
        if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
    }
}

const PEZ_CLASSES = [
    "PezVideoTrimmer", 
    "PezAutoBatcher", 
    "PezPrompterMaximum", 
    "PezLoadTransparentPNG"
];

app.registerExtension({
    name: "Pez.UIButtonsV31",
    async loadedGraphNode(node) {
        if (node.comfyClass === "PezLoadLoraWithTags") {
            hookNodeLabels(node);
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "PezLoadLoraWithTags") {
            hookNodeLabels(node);
        }
        if (PEZ_CLASSES.includes(node.comfyClass)) {
            const origConfigure = node.configure;
            node.configure = function(info) {
                const savedValues = info && info.widgets_values ? [...info.widgets_values] : null;

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

                if (this.comfyClass === "PezPrompterMaximum") {
                    restorePrompterMaximumWidgets(this, savedValues);
                }

                if (this.comfyClass === "PezVideoTrimmer") {
                    setupTrimmerHooks(this);
                    this.setSize([Math.max(this.size[0] || 0, 474), Math.max(this.size[1] || 0, 900)]);
                    createTrimmerVideoPlayerDOM(this);
                    updateTrimmerVideoPlayer(this);
                }

                sanitizeWidgetValues(this);
                updateAllPezButtons(this);
                setTimeout(() => {
                    updateAllPezButtons(this);
                    if (this.comfyClass === "PezVideoTrimmer") {
                        updateTrimmerVideoPlayer(this);
                    }
                }, 50);
            };

            const origOnSerialize = node.onSerialize;
            node.onSerialize = function(info) {
                if (origOnSerialize) origOnSerialize.apply(this, arguments);
                if (this.comfyClass === "PezPrompterMaximum" && info) {
                    const realOrder = ["aspect_ratio", "megapixels", "multiple", "duration_seconds", "main_prompt", "negative_prompt"];
                    info.widgets_values = realOrder.map(name => {
                        const w = this.widgets?.find(x => x.name === name);
                        return w ? w.value : undefined;
                    });
                }
            };

            setTimeout(() => {
                if (node.comfyClass === "PezVideoTrimmer") {
                    setupTrimmerHooks(node);
                    node.setSize([Math.max(node.size[0] || 0, 474), Math.max(node.size[1] || 0, 900)]);
                }
                if (node.comfyClass === "PezPrompterMaximum") {
                    restorePrompterMaximumWidgets(node, node.widgets_values);
                }
                processPezNode(node);
                updateAllPezButtons(node);
                if (node.comfyClass === "PezVideoTrimmer") {
                    updateTrimmerVideoPlayer(node);
                }
            }, 10);
        }
    },
    async loadedGraphNode(node) {
        if (PEZ_CLASSES.includes(node.comfyClass)) {
            if (node.comfyClass === "PezPrompterMaximum") {
                restorePrompterMaximumWidgets(node, node.widgets_values);
            }
            if (node.comfyClass === "PezVideoTrimmer") {
                setupTrimmerHooks(node);
                node.setSize([Math.max(node.size[0] || 0, 474), Math.max(node.size[1] || 0, 900)]);
                createTrimmerVideoPlayerDOM(node);
            }
            processPezNode(node);
            updateAllPezButtons(node);
            if (node.comfyClass === "PezVideoTrimmer") {
                updateTrimmerVideoPlayer(node);
            }
            setTimeout(() => {
                if (node.comfyClass === "PezVideoTrimmer") {
                    setupTrimmerHooks(node);
                    node.setSize([Math.max(node.size[0] || 0, 474), Math.max(node.size[1] || 0, 900)]);
                    updateTrimmerVideoPlayer(node);
                }
                updateAllPezButtons(node);
            }, 50);
            setTimeout(() => {
                if (node.comfyClass === "PezVideoTrimmer") {
                    updateTrimmerVideoPlayer(node);
                }
                updateAllPezButtons(node);
            }, 250);
        }
    }
});
