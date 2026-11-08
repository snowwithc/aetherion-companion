# plan.md — Aetherion Companion (Phase 1 ✅ complete → Phase 2 ✅2a shipped → Phase 2b/2c next)

## 1) Objectives
- ✅ Deliver a fully playable **3-episode campaign** in **Manual Simulator mode** (no camera), with all rules implemented in a **pure TS engine** (`/src/engine`) separated from UI.
- ✅ Keep all balance/content in editable JSON under `/src/data`.
- ✅ Persist progress in **localStorage** (no backend, no login).
- ✅ Mobile-first UI (React + Tailwind + Framer Motion) with simple CSS animations.
- ✅ Default UI language is **Bahasa Indonesia** (hardcoded first pass; full i18n deferred).

- ✅ **Phase 2 objective (approved) — Live Camera Detection for rear phone camera**
  - ✅ Primary detection: **ArUco markers** via `js-aruco` (reliable, deterministic)
  - ✅ Table calibration: **4 corner markers (0–3)**
  - ✅ Same `CardDetector` interface so engine/UI don’t care about source (manual vs camera)
  - ✅ **Debug overlay ON by default during development** (markers + status)
  - ⏳ Fallback detection: **YOLOv8n ONNX** classifier (only if model file exists) — scaffold present, not activated without model.
  - ⏳ Proper top-down warp + per-zone crops (homography) — planned for Phase 2b.

## 2) Implementation Steps

### Phase 1 — Core Loop POC (engine in isolation)
**User stories**
1. Simulate placing/removing cards into Zones A–D and see engine state update deterministically.
2. Complete a wave using Attack/Action/Recharge with correct HP/Energy/Defense math.
3. Arm boosters and confirm they apply **only** on the next relevant turn then expire.
4. Fuse via Activation and see fusion name + timer + raw/energy attacks.
5. Enemy intent is always visible and enemy move loop executes correctly.

**Status / Work Done**
- ✅ Frontend TypeScript enabled (CRA + craco).
- ✅ `/src/data/*.json` created for all content.
- ✅ Pure `/src/engine` implemented (battle loop, combat math, statuses, fusions, scenarios, boosters, AI, campaign helpers).
- ✅ Engine unit tests: `src/engine/__tests__/engine.test.ts` **24/24 passing**.

### Phase 1.5 — V1 App Development (all screens + manual detector)
**User stories**
1. Start/continue a campaign and progress is saved/restored from localStorage.
2. Use Setup in **Manual mode** to place cards into zones and see what the app detects.
3. Play the Battle screen comfortably on phone with large buttons and readable log.
4. View all cards in the Library including the 10×5 fusion matrix.
5. Reset progress and change settings without breaking the run.

**Status / Work Done**
- ✅ Routing + layout shell implemented: Title, Campaign Map, Setup, Battle, Results, Library, Settings.
- ✅ Persistence via localStorage for settings + progress + battle snapshot.
- ✅ Detection layer:
  - ✅ `CardDetector` contract implemented.
  - ✅ `ManualSimulatorDetector` implemented.
  - ✅ `LiveCameraDetector` implemented (Phase 2a) — no longer a stub.
- ✅ Setup screen supports Manual character selection (places Character in Zone A).
- ✅ Battle screen wired via `useBattleController`.
- ✅ Card Library includes Fusion Matrix + detail dialog.
- ✅ Settings includes toggles + reset progress.
- ✅ Bahasa Indonesia copy centralized in `src/i18n/id.ts`.
- ✅ Automated frontend playtests:
  - ✅ Phase 1 playtest (Manual mode) passed (no critical issues).
  - ✅ Phase 2a regression playtest passed (no regressions; camera UI gracefully falls back in headless).

---

### Phase 2 — Live Camera Detection (Rear Camera + ArUco + optional YOLOv8n)

#### Architecture (implemented + planned)
**Implemented (Phase 2a)**
- ✅ `/src/detection/vision/`
  - ✅ `aruco.ts` — wrapper around `js-aruco` (marker detection)
  - ✅ `pipeline.ts` — frame analysis + corner-based zone mapping + debouncing (`ZoneDebouncer`)
  - ✅ `onnx.ts` — ONNX scaffold present (lazy load), inert when model missing
  - ✅ `homography.ts` — implemented as a math helper (not yet used for warp)
- ✅ `/src/detection/LiveCameraDetector.ts`
  - ✅ Real `getUserMedia` rear-camera request (facingMode: environment)
  - ✅ Frame loop at `config.detection.fps`
  - ✅ Emits `ZoneEvent` for stable changes
  - ✅ Exposes telemetry (fps, markers found, calibrated, lastFrame) via `subscribeTelemetry`
- ✅ `/src/data/markers.json`
  - ✅ Corner markers: 0–3
  - ✅ Card markers mapping created (IDs 100+ mapped to cardIds)
- ✅ UI:
  - ✅ `CameraPreview.tsx` — mounts live `<video>` and draws overlay (markers + calibration)
  - ✅ `DebugOverlay.tsx` — developer-facing readings (zones, fps, calibration)

**Planned (Phase 2b/2c)**
- ⏳ Warp to top-down using corners (homography) + per-zone crops
- ⏳ ONNX classification fallback on crops (YOLOv8n ONNX), only when a model file is present
- ⏳ Printable calibration PDF for corner markers + optional card marker sheet

#### UI integration (implemented)
- ✅ `GameProvider.tsx`
  - ✅ Swaps active detector based on `settings.detectionMode`
  - ✅ Starts/stops camera as mode changes
  - ✅ Graceful fallback to manual when permission denied/unavailable (toast + mode revert)
- ✅ `Settings.tsx`
  - ✅ Camera mode selection is enabled (no longer disabled)
  - ✅ Debug overlay default ON (dev-friendly)
- ✅ `Setup.tsx`
  - ✅ Added “Deteksi Kartu” panel
  - ✅ Camera preview shown in camera mode
  - ✅ Character picker hidden in camera mode (character chosen by physical card)
- ✅ `Battle.tsx`
  - ✅ Uses active detector from provider
  - ✅ Optional camera preview + debug overlay section when camera mode is active

---

#### Phase 2a — (Push 1) Camera open + ArUco detection + zone events + debug overlay
**Goal:** Get reliable marker detection and zone events end-to-end (no warp yet).

**Status:** ✅ Shipped and validated.

**What was delivered**
- ✅ Rear camera mode toggle in Settings
- ✅ Live camera stream acquisition (`getUserMedia`)
- ✅ ArUco marker detection via `js-aruco`
- ✅ Calibration requirement: 4 corner markers visible → `calibrated=true`
- ✅ Zone mapping relative to corner markers (splitting mat into 4 vertical zones)
- ✅ Stable zone events via `ZoneDebouncer` (register/clear frames)
- ✅ Debug UI:
  - ✅ Overlay on preview showing marker polygons + IDs
  - ✅ Debug panel with zone readings + fps
- ✅ Graceful fallback to Manual if camera is denied/unavailable

**Exit criteria:** ✅ Met.

---

#### Phase 2b — Homography warp + per-zone crops + ONNX activation (YOLOv8n)
**Goal:** Proper top-down mat warp and robust per-zone image crops for better accuracy and to enable ONNX fallback.

**User stories**
1. When corner markers 0–3 are visible, the app warps camera view to a top-down mat.
2. Each zone A–D has a stable crop extracted from the warped mat (shown in debug overlay).
3. If an ONNX model exists, classifier runs on zone crops and reports top label + confidence.
4. Marker-first stays authoritative; ONNX only fills gaps when a marker is occluded.

**Implementation steps**
- Use `vision/homography.ts` to compute a transform from corner markers → canonical mat rectangle.
- Add a warp step (Canvas2D approach first; WebGL optional later):
  - Produce a top-down “mat” canvas at a fixed resolution (e.g., 1024×256 or 960×240).
  - Define zone rectangles for A–D in mat coordinates.
- Enhance `vision/pipeline.ts`:
  - If corners locked: warp frame → mat space.
  - Crop each zone (A–D) into ImageData.
  - Marker-first:
    - If marker is detected and its center lies inside a zone crop → assign cardId.
  - ONNX fallback:
    - If no marker assigned in a zone, and `onnx.ts` reports available → classify crop.
    - Apply confidence threshold + debouncing.
- Enhance `DebugOverlay.tsx`:
  - Show warped mat preview and zone crops.
  - Show per-zone confidence (marker vs ONNX).

**Exit criteria**
- Calibration lock works reliably.
- Crops are stable and match physical zones.
- ONNX remains inert when model missing (no perf penalty).

---

#### Phase 2c — Printable calibration PDF (corner + optional card markers)
**Goal:** Make physical setup repeatable for classrooms/players.

**Deliverables**
- Printable PDF (A4/Letter) containing:
  - 4 large corner markers (0–3) positioned for easy camera visibility
  - Optional guide grid indicating Zones A–D
  - Optional small card markers sheet (IDs 100–139) with instructions for attaching

**Implementation steps**
- Add `/public/print/calibration.pdf` (generated via a script or static asset).
- Add Setup screen CTA: “Unduh lembar kalibrasi”.
- Include short in-app instructions for:
  - Lighting tips
  - Distance/angle tips
  - What “kalibrasi OK” means

**Exit criteria**
- A user can print once, place the sheet, and camera calibrates quickly.

---

### Phase 3 — Testing & Hardening (expanded to include camera)
**User stories**
1. Full campaign playable without crash or soft-lock in both Manual and Camera mode.
2. Close/reopen and continue mid-battle accurately.
3. Camera mode handles: permission denial, autofocus hunting, low light, partial occlusion.
4. Wrong-zone placement is ignored and warned.
5. Performance: usable on mid-range phones.

**Steps**
- Keep engine unit tests passing.
- Add camera-focused checks:
  - `markers.json` completeness and uniqueness
  - Debouncer behavior on noisy detection
  - Calibration state transitions (not calibrated → calibrated → lost)
- Manual QA on real phone (rear camera):
  - Setup calibration flow
  - 10–15 minute play session
  - Battery/thermal check

## 3) Next Actions
1. ✅ Phase 2a is done (camera mode toggle, ArUco detection, debouncing, debug overlay, fallback).
2. **Confirm with user** the intended physical marker strategy for cards:
   - Are markers attached to each card (preferred for reliability), or only the mat corners?
3. Implement **Phase 2b**:
   - top-down warp + per-zone crops
   - enable ONNX fallback when model file exists (YOLOv8n)
4. Implement **Phase 2c**:
   - printable calibration PDF + in-app instructions
5. Run real-device QA and patch issues.

## 4) Success Criteria
- ✅ Phase 1 remains fully playable in Manual mode.
- ✅ Phase 2a: camera mode works with ArUco markers + corner calibration + stable zone events.
- Phase 2b: camera mode gains top-down warp + robust crops; ONNX fallback works when model present.
- Phase 2c: players can print a calibration sheet and set up quickly.
- No backend required; localStorage persistence remains intact.
