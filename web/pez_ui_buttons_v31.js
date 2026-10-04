import { app } from "../../scripts/app.js";

console.log("🐟 Pez UI Buttons V31 Loaded! (Trimmer, AutoBatcher, Prompter & Transparent PNG)");

const VALID_RESOLUTIONS = ["Original", "1920x1080", "1280x720", "1024x1024", "768x768", "512x512", "512x768", "768x512"];
const VALID_MOTORS = ["Exacto", "LTX-Video (8N+1)", "WanVideo (4N+1)"];
const VALID_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "3:2", "2:3"];

const FALLBACK_PROMPT = `integrated_multimodal_description: [Shot 1] Cinematic high-end product visualization, centered symmetrical composition, black seamless limbo environment with a soft diffused orange glow behind the subject. Use <Picture 1> as the primary visual reference for the old mobile phone, preserving its proportions, dark blue-gray body, silver front trim, monochrome greenish display, keypad, button layout, speaker holes, and overall industrial design. Use <Picture 3> as a technical reference for the old phone's side profile, rear shape, thickness, top and bottom geometry, and three-dimensional construction. Use <Picture 2> as the primary visual reference for the modern smartphone, preserving its orange metallic finish, front glass, screen proportions, premium industrial design, and overall silhouette. Use <Picture 4> as a technical reference for the modern smartphone's side thickness, rear housing, camera arrangement, edge geometry, button placement, and bottom details.

A single phone floats vertically at the exact center of the frame with no visible support. The camera remains completely static for the entire video. The phone is already rotating slowly in place around its own vertical axis when the video begins. The rotation is deliberate slow motion, smooth and controlled, never fast. Sparse dust particles drift gently through the black limbo with subtle gravity-influenced motion. These particles are only atmospheric support elements and must remain visually secondary at all times.

The phone keeps a constant on-screen size, constant distance to the camera, and constant central framing for the full duration. There must be no zoom, no push-in, no pull-out, no object scaling, no enlargement, no shrinking, and no apparent change from 500 percent to 100 percent. The phone always remains the same visual size in frame. The background stays clean and stable: black limbo, soft orange glow, and drifting particles. Do not apply any full-frame blur, full-screen distortion, or global image smear.

During the first half of the motion, the object remains entirely the old mobile phone while it continues its slow rotation toward the 180-degree orientation. Its form, thickness, buttons, screen casing, and proportions remain stable.`;

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

    const foundLongText = sourceValues.find(v => typeof v === "string" && !VALID_ASPECTS.includes(v) && v.trim().length > 15);
    const foundAspect = sourceValues.find(v => typeof v === "string" && VALID_ASPECTS.includes(v));
    if (wAspect) {
        wAspect.value = foundAspect || "16:9";
    }

    if (wMega) {
        let v = parseFloat(wMega.value);
        if (isNaN(v) || v > 10 || v <= 0 || v === 32 || v === 8 || v === 0.2) {
            wMega.value = 2.0;
        }
    }

    if (wMult) {
        let v = parseInt(wMult.value);
        if (isNaN(v) || v <= 0 || v === 8) {
            wMult.value = 32;
        }
    }

    if (wDur) {
        let v = parseFloat(wDur.value);
        if (isNaN(v) || v <= 0 || v === 32 || v === 32.0) {
            wDur.value = 8.0;
        }
    }

    if (wMainPrompt) {
        const isCorrupt = !wMainPrompt.value || 
                          typeof wMainPrompt.value === "number" || 
                          wMainPrompt.value === "8" || 
                          wMainPrompt.value === "8.0" || 
                          wMainPrompt.value === "32" || 
                          wMainPrompt.value === "2" ||
                          wMainPrompt.value.trim().length < 5;
        if (isCorrupt) {
            wMainPrompt.value = foundLongText || FALLBACK_PROMPT;
        }
    }

    if (wNegPrompt) {
        if (wNegPrompt.value == null || wNegPrompt.value === "NaN") {
            wNegPrompt.value = "";
        }
    }
}

function sanitizeWidgetValues(node) {
    if (!node || !node.widgets) return;

    if (node.comfyClass === "PezPrompterMaximum") {
        restorePrompterMaximumWidgets(node, node.widgets_values);
    }

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
            if (isNaN(val) || val <= 0 || val === 32 || val === 8 || val === 0.2) w.value = 2.0;
        } else if (w.name === "multiple") {
            const val = parseInt(w.value);
            if (isNaN(val) || val <= 0 || val === 8) w.value = 32;
        } else if (w.name === "duration_seconds") {
            const val = parseFloat(w.value);
            if (isNaN(val) || val <= 0 || val === 32 || val === 32.0) w.value = 8.0;
        } else if (w.name === "main_prompt") {
            if (w.value == null || w.value === "NaN" || w.value === "8" || w.value === "8.0" || w.value === "32") {
                w.value = FALLBACK_PROMPT;
            }
        } else if (w.name === "negative_prompt") {
            if (w.value == null || w.value === "NaN") w.value = "";
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

// 1. DIBUJAR MARCAS "← ENTRADAS" Y "SALIDAS →" EN ROJO (9px BOLD)
function hookNodeLabels(node) {
    if (node._pez_labels_hooked) return;
    node._pez_labels_hooked = true;

    if (node.title && !node.title.startsWith("🐟")) {
        node.title = "🐟 " + node.title.replace(/^🐟\s*/, "");
    }

    const origDrawFg = node.onDrawForeground;
    node.onDrawForeground = function(ctx) {
        if (origDrawFg) origDrawFg.apply(this, arguments);
        ctx.save();
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 9px sans-serif";

        // Marcar ENTRADAS únicamente en PezPrompterMaximum
        if (this.comfyClass === "PezPrompterMaximum" && this.inputs && this.inputs.length > 0) {
            ctx.textAlign = "left";
            ctx.fillText("← ENTRADAS", 16, 11);
        }

        // Marcar SALIDAS a la derecha
        if (this.outputs && this.outputs.length > 0) {
            ctx.textAlign = "right";
            ctx.fillText("SALIDAS →", this.size[0] - 18, -8);
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

    uploadWidget.computeSize = () => [0, -4];
    uploadWidget.draw = () => {};

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.width = "100%";
    container.style.boxSizing = "border-box";
    container.style.padding = "4px 0px 14px 0px";
    container.style.userSelect = "none";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = uploadWidget.label || uploadWidget.name || "elige archivo para subir";
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
        if (uploadWidget.callback) {
            try {
                uploadWidget.callback(uploadWidget.value, app.canvas, node, [0, 0], e);
            } catch (err) {
                const fileInputs = document.querySelectorAll('input[type="file"]');
                if (fileInputs.length > 0) {
                    fileInputs[fileInputs.length - 1].click();
                }
            }
        }
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

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.width = "100%";
    container.style.height = neededH + "px";
    container.style.boxSizing = "border-box";
    container.style.padding = "8px 0px 14px 0px";
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
            "upload"
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
            "aspect_ratio",
            "aspect_ratio_btn_ui",
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
            "upload_btn_ui",
            "upload"
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

    // Asegurar posicion del slot de entrada con margen suficiente debajo de ENTRADAS (y=26)
    if (node.inputs && node.inputs[0]) {
        node.inputs[0].pos = [0, 26];
    }

    // PezVideoTrimmer
    if (node.comfyClass === "PezVideoTrimmer") {
        hookNodeLabels(node);
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
        if (uploadNativeWidget) {
            createUploadDOMButton(node, uploadNativeWidget);
        }
    } 
    // PezAutoBatcher
    else if (node.comfyClass === "PezAutoBatcher") {
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
        if (mp) mp.label = "PROMPT POSITIVO";
        const np = node.widgets.find(w => w.name === "negative_prompt");
        if (np) np.label = "PROMPT NEGATIVO";
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
        if (uploadNativeWidget) {
            createUploadDOMButton(node, uploadNativeWidget);
        }
    }

    // Ordenamiento estricto
    applyExactWidgetLayout(node);
    sanitizeWidgetValues(node);
    updateAllPezButtons(node);

    if (node.computeSize) {
        const computed = node.computeSize();
        const minW = (node.comfyClass === "PezPrompterMaximum" ? 380 : (node.comfyClass === "PezLoadTransparentPNG" ? 280 : 0));
        const minH = (node.comfyClass === "PezPrompterMaximum" ? 560 : 0);
        node.setSize([
            Math.max(node.size[0] || 0, computed[0] || 0, minW),
            Math.max(node.size[1] || 0, computed[1] || 0, minH)
        ]);
        if (node.setDirtyCanvas) node.setDirtyCanvas(true, true);
        if (app.canvas && app.canvas.setDirty) app.canvas.setDirty(true, true);
    }
}

const PEZ_CLASSES = ["PezVideoTrimmer", "PezAutoBatcher", "PezPrompterMaximum", "PezLoadTransparentPNG"];

app.registerExtension({
    name: "Pez.UIButtonsV31",
    async nodeCreated(node) {
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

                sanitizeWidgetValues(this);
                updateAllPezButtons(this);
                setTimeout(() => {
                    updateAllPezButtons(this);
                }, 50);
            };

            setTimeout(() => {
                processPezNode(node);
                updateAllPezButtons(node);
            }, 10);
        }
    },
    async loadedGraphNode(node) {
        if (PEZ_CLASSES.includes(node.comfyClass)) {
            if (node.comfyClass === "PezPrompterMaximum") {
                restorePrompterMaximumWidgets(node, node.widgets_values);
            }
            processPezNode(node);
            updateAllPezButtons(node);
            setTimeout(() => {
                if (node.comfyClass === "PezPrompterMaximum") {
                    restorePrompterMaximumWidgets(node, node.widgets_values);
                }
                updateAllPezButtons(node);
            }, 50);
            setTimeout(() => {
                updateAllPezButtons(node);
            }, 200);
        }
    }
});
