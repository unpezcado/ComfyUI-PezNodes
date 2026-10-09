import { app } from "../../scripts/app.js";

const VALID_RESOLUTIONS = ["Original", "1920x1080", "1280x720", "1024x1024", "768x768", "512x512", "512x768", "768x512"];
const VALID_MOTORS = ["Exacto", "LTX-Video (8N+1)", "WanVideo (4N+1)"];
const VALID_ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "3:2", "2:3"];

// Pez Video Trimmer Fix - Prompter logic handled exclusively in pez_ui_buttons_v31.js

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
        if (node.comfyClass === "PezVideoTrimmer") {
            sanitizePezWidgets(node);
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "PezVideoTrimmer") {
            setTimeout(() => sanitizePezWidgets(node), 10);
        }
    }
});