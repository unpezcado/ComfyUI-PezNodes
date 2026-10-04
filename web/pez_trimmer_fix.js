import { app } from "../../scripts/app.js";

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

function sanitizePezWidgets(node) {
    if (!node || !node.widgets) return;
    for (let w of node.widgets) {
        if (w.name === "video") {
            const isInvalid = !w.value || typeof w.value !== "string" || !w.value.includes(".") || w.value === "0" || w.value === "NaN";
            if (isInvalid) {
                if (node.widgets_values && Array.isArray(node.widgets_values)) {
                    const foundVideo = node.widgets_values.find(v => typeof v === "string" && (
                        v.toLowerCase().endsWith(".mp4") || 
                        v.toLowerCase().endsWith(".webm") || 
                        v.toLowerCase().endsWith(".mov") || 
                        v.toLowerCase().endsWith(".mkv") || 
                        v.toLowerCase().endsWith(".avi")
                    ));
                    if (foundVideo) {
                        w.value = foundVideo;
                    }
                }
                if ((!w.value || typeof w.value !== "string" || !w.value.includes(".")) && w.options?.values?.length > 0) {
                    w.value = w.options.values[0];
                }
            }
        } else if (w.name === "image") {
            if ((!w.value || typeof w.value !== "string" || w.value === "0") && w.options?.values?.length > 0) {
                w.value = w.options.values[0];
            }
        } else if (w.name === "bg_color") {
            if (!w.value || typeof w.value !== "string" || !w.value.startsWith("#")) {
                w.value = "#808080";
            }
        } else if (w.name === "start_second") {
            const val = parseFloat(w.value);
            if (isNaN(val)) w.value = 0.0;
        } else if (w.name === "end_second") {
            const val = parseFloat(w.value);
            if (isNaN(val) || val <= 0) w.value = 60.0;
        } else if (w.name === "segundos_por_lote") {
            const val = parseFloat(w.value);
            if (isNaN(val)) w.value = (node.comfyClass === "PezAutoBatcher" ? 10.0 : 0.0);
        } else if (w.name === "custom_width" || w.name === "custom_height" || w.name === "custom_width_px" || w.name === "custom_height_px") {
            const val = parseInt(w.value);
            if (isNaN(val) || val < 0) w.value = 0;
        } else if (w.name === "resolution") {
            if (!w.value || !VALID_RESOLUTIONS.includes(String(w.value))) {
                w.value = "Original";
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
        } else {
            if (typeof w.value === "number" && isNaN(w.value)) {
                w.value = 0;
            }
        }
    }
}

app.registerExtension({
    name: "Pez.VideoTrimmerFix",
    async loadedGraphNode(node, app) {
        if (node.comfyClass === "PezPrompterMaximum") {
            restorePrompterMaximumWidgets(node, node.widgets_values);
        }
        sanitizePezWidgets(node);
    },
    async nodeCreated(node) {
        if (node.comfyClass === "PezPrompterMaximum") {
            restorePrompterMaximumWidgets(node, node.widgets_values);
        }
        setTimeout(() => sanitizePezWidgets(node), 10);
    }
});