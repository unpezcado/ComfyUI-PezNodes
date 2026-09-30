// MiniMax H3 Preview Override — DOM widget for the PezMiniMaxPreview node.
// Streams "pez_minimax_preview" events into a live preview area with a
// sigma/delta graph, step-time graph, and hover/click step scrubbing.
const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

const STYLE_ID = "minimax-h3-pov-stylesheet";
function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.h3pov-root { display:flex; flex-direction:column; gap:6px; padding:6px; width:100%; height:100%;
  box-sizing:border-box; background:#141414; border:1px solid #333; border-radius:8px; user-select:none; }
.h3pov-header { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:11px; color:#bbb; }
.h3pov-title { font-weight:600; color:#9ecbff; letter-spacing:.3px; }
.h3pov-summary { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#8a8a8a; }
.h3pov-image-area { position:relative; flex:1; min-height:80px; background:repeating-conic-gradient(#181818 0% 25%, #1c1c1c 0% 50%) 50%/16px 16px;
  border-radius:6px; overflow:hidden; cursor:pointer; }
.h3pov-img, .h3pov-video { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; transition:opacity .12s ease; image-rendering: pixelated; }
.h3pov-placeholder { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#5a5a5a; font-size:12px; }
.h3pov-scrub { position:absolute; left:0; right:0; bottom:0; height:6px; background:rgba(0,0,0,.45); cursor:pointer; display:none; }
.h3pov-scrub-fill { height:100%; width:0%; background:linear-gradient(90deg,#e67e22,#f5a623); }
.h3pov-graphs { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
.h3pov-graph-cell { background:#1a1a1a; border:1px solid #2a2a2a; border-radius:6px; padding:3px 5px; }
.h3pov-graph-head { display:flex; justify-content:space-between; align-items:baseline; font-size:10px; color:#8a8a8a; }
.h3pov-graph-label { white-space:nowrap; }
.h3pov-graph-value { font-family:ui-monospace,Consolas,monospace; color:#d0d0d0; }
.h3pov-graph-canvas { width:100%; height:38px; display:block; cursor:crosshair; }
.h3pov-foot { font-size:10px; color:#666; text-align:center; }
`;
    document.head.appendChild(style);
}

// Walks subgraph chain for ids like "12:7:5" (mirrors getNodeByExecutionId).
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

api.addEventListener("pez_minimax_preview", (e) => {
    const data = e.detail;
    if (!data || data.node_id == null) return;
    const node = findNodeByQualifiedId(app.graph, data.node_id);
    if (node?._h3PreviewHandler) node._h3PreviewHandler(data);
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

function drawGraph(canvas, sigmas, deltas, step, totalSteps, hoverStep, lockedStep) {
    const { ctx, W, H } = syncCanvasDPR(canvas);
    const padX = GRAPH_PAD_X, padY = 3;
    const iW = W - 2 * padX, iH = H - 2 * padY;
    ctx.clearRect(0, 0, W, H);
    const n = sigmas?.length || 0;
    const xSteps = Math.max(totalSteps || n, n, deltas?.length || 0);
    const xAt = i => padX + (i / Math.max(1, xSteps - 1)) * iW;

    if (n > 1) {
        let sMax = -Infinity, sMin = Infinity;
        for (const s of sigmas) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
        if (sMin > 0) sMin = 0;
        const sRange = Math.max(sMax - sMin, 1e-6);
        const sYAt = v => padY + (1 - (v - sMin) / sRange) * iH;
        ctx.strokeStyle = "rgba(208,208,208,.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const px = padX + (i / (n - 1)) * iW;
            const py = sYAt(sigmas[i]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const i = Math.max(0, Math.min(n - 1, step));
        ctx.fillStyle = "#d0d0d0";
        ctx.beginPath();
        ctx.arc(padX + (i / Math.max(1, n - 1)) * iW, sYAt(sigmas[i]), 2.2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (deltas && deltas.length >= 1) {
        let dMax = 1e-6;
        for (const v of deltas) if (Number.isFinite(v) && v > dMax) dMax = v;
        const dYAt = v => padY + (1 - v / dMax) * iH;
        ctx.beginPath();
        ctx.moveTo(xAt(0), H - padY);
        ctx.lineTo(xAt(0), dYAt(deltas[0]));
        for (let i = 0; i < deltas.length; i++) ctx.lineTo(xAt(i + 1), dYAt(deltas[i]));
        ctx.lineTo(xAt(deltas.length), H - padY);
        ctx.closePath();
        ctx.fillStyle = "rgba(230,126,34,.15)";
        ctx.fill();
        ctx.strokeStyle = "#e67e22";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let i = 0; i < deltas.length; i++) {
            const px = xAt(i + 1), py = dYAt(deltas[i]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

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

app.registerExtension({
    name: "Pez.MiniMaxPreview",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData?.name !== "PezMiniMaxPreview") return;

        chainCallback(nodeType.prototype, "onNodeCreated", function () {
            ensureStyles();
            const node = this;

            const root = el("div", "h3pov-root");
            const header = el("div", "h3pov-header", root);
            const title = el("span", "h3pov-title", header);
            title.textContent = "Pez MiniMax Preview";
            const summary = el("span", "h3pov-summary", header);
            summary.textContent = "idle";

            const imageArea = el("div", "h3pov-image-area", root);
            const imgA = el("img", "h3pov-img", imageArea);
            const imgB = el("img", "h3pov-img", imageArea);
            imgA.draggable = imgB.draggable = false;
            imgB.style.opacity = "0";
            let visibleImg = imgA;
            let pendingImg = imgB;
            const videoEl = el("video", "h3pov-video", imageArea);
            videoEl.style.opacity = "0";
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.loop = true;
            videoEl.autoplay = true;
            videoEl.disablePictureInPicture = true;
            const placeholder = el("div", "h3pov-placeholder", imageArea);
            placeholder.textContent = "waiting for sample…";
            const scrubBar = el("div", "h3pov-scrub", imageArea);
            const scrubFill = el("div", "h3pov-scrub-fill", scrubBar);

            const graphs = el("div", "h3pov-graphs", root);
            function makeCell(labelText) {
                const cell = el("div", "h3pov-graph-cell", graphs);
                const head = el("div", "h3pov-graph-head", cell);
                const lbl = el("span", "h3pov-graph-label", head);
                lbl.textContent = labelText;
                const val = el("span", "h3pov-graph-value", head);
                const canvas = el("canvas", "h3pov-graph-canvas", cell);
                return { canvas, val, lbl };
            }
            const sdCell = makeCell("σ / Δ");
            const timeCell = makeCell("step time");
            el("div", "h3pov-foot", root).textContent = "hover σ/Δ graph to scrub steps · click to lock";

            node.addDOMWidget("h3_preview", "minimax_h3_preview", root, { serialize: false });
            node.setSize([Math.max(node.size?.[0] ?? 340, 340), Math.max(node.size?.[1] ?? 400, 400)]);

            // Per-run state.
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

            const fpsWidget = () => node.widgets?.find(w => w.name === "preview_fps");
            function currentFps() {
                const v = +fpsWidget()?.value;
                return Number.isFinite(v) && v > 0 ? v : 12;
            }

            function renderStats() {
                const tIdx = lastCurrentStep - 1;
                const stepMs = (tIdx >= 0 && tIdx < history.stepMs.length) ? history.stepMs[tIdx] : null;
                const avgTxt = lastAvgStepMs != null
                    ? `${(lastAvgStepMs / 1000).toFixed(2)}s/step` : "—";
                let eta = "";
                if (lastAvgStepMs != null && lastTotal != null && lastStep != null) {
                    eta = ` · ETA ${((lastTotal - lastStep) * lastAvgStepMs / 1000).toFixed(1)}s`;
                }
                const timeTxt = stepMs != null ? `${stepMs.toFixed(0)}ms` : "—";
                timeCell.val.textContent = timeTxt;
                let sd = "—";
                if (cachedSigmas) {
                    const idx = hoverStep != null ? hoverStep : (lockedStep != null ? lockedStep : lastCurrentStep);
                    const sig = cachedSigmas[Math.min(idx, cachedSigmas.length - 1)];
                    const d = (idx - 1 >= 0 && history.delta[idx - 1] != null) ? history.delta[idx - 1] : null;
                    sd = `${fmt(sig, 3)} / ${fmt(d, 3)}`;
                }
                sdCell.val.textContent = sd;
                summary.textContent = `${lastW ?? "—"}×${lastH ?? "—"} · ${lastStep ?? 0}/${lastTotal ?? 0} · ${avgTxt}${eta}`;
            }

            function drawAll() {
                drawGraph(sdCell.canvas, cachedSigmas, history.delta, lastCurrentStep, totalSteps, hoverStep, lockedStep);
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
                bakedFps = null;
                hideVideo();
                liveUrl = null;
                liveMime = null;
                placeholder.remove();
                imageArea.appendChild(placeholder);
                placeholder.textContent = "waiting for sample…";
                scrubBar.style.display = "none";
            }

            // Animated playback scrub (WebP plays natively in <img>; MP4 in <video>).
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

            // σ/Δ graph: hover to scrub, click to lock.
            sdCell.canvas.addEventListener("mousemove", (ev) => {
                if (!cachedSigmas) return;
                const rect = sdCell.canvas.getBoundingClientRect();
                const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                const xSteps = Math.max(totalSteps || cachedSigmas.length, cachedSigmas.length, history.delta.length);
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
                } else if (cachedSigmas) {
                    const rect = sdCell.canvas.getBoundingClientRect();
                    const iW = Math.max(1, rect.width - 2 * GRAPH_PAD_X);
                    const xSteps = Math.max(totalSteps || cachedSigmas.length, cachedSigmas.length, history.delta.length);
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
                    console.warn("[MiniMaxH3.PreviewOverride] decode failed:", err);
                }
            };
            node._h3PreviewHandler = handler;

            chainCallback(node, "onRemoved", function () {
                node._h3PreviewHandler = null;
                for (const u of stepBlobUrls) {
                    if (u) try { URL.revokeObjectURL(u); } catch {}
                }
                stepBlobUrls.length = 0;
                stepMimes.length = 0;
                hideVideo();
            });
        });
    },
});



