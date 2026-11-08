# plan.md — Aetherion Companion (Phase 1 ✅ complete → Phase 2 ✅2a→2b→2c→2d complete → Deploy next)

## 1) Objectives
- ✅ Deliver a fully playable **3-episode campaign** in **Manual Simulator mode** (no camera), with all rules implemented in a **pure TS engine** (`/src/engine`) separated from UI.
- ✅ Keep all balance/content in editable JSON under `/src/data`.
- ✅ Persist progress in **localStorage** (no backend, no login).
- ✅ Mobile-first UI (React + Tailwind + Framer Motion) with simple CSS animations.
- ✅ UI language is **Bahasa Indonesia** (hardcoded first pass; full i18n deferred).

- ✅ **Phase 2 objective (approved) — Live Camera Detection for rear phone camera**
  - ✅ Primary detection: **ArUco markers** via `js-aruco` (reliable, deterministic)
  - ✅ Table calibration: **4 corner markers** (printed mat)
  - ✅ Same `CardDetector` interface so engine/UI don’t care about source (manual vs camera)
  - ✅ Debug overlay supported (markers + status)
  - ✅ **Tilt-resistant detection**: top-down warp (homography)
  - ✅ Printable calibration/sticker PDFs (in-app generated)
  - ✅ AI fallback dropped: user requested YOLOv8n nano originally, but **deployment constraints forbid ONNX**.
    - Decision: keep marker-first deterministic system as production baseline.

- ✅ **Phase 2d — Mission Briefings (Episode intro)**
  - ✅ Cinematic, sci-fi “transmission” animated briefing for each episode.
  - ✅ **User-confirmed behavior implemented**:
    - ✅ Briefing shows **every time** an episode is started (Start/Replay/Resume), and when advancing to the next episode.
    - ✅ Style: **sinematik bertahap — sci‑fi hype**.
  - ✅ All UI strings remain **Bahasa Indonesia** via `src/i18n/id.ts`.

- ⏳ **Deploy**
  - Goal: publish a live URL for real-device camera QA (ArUco detection + homography + printed calibration mat).
  - ✅ Deployment readiness scan PASS.
  - Next: user presses **Deploy** in Emergent UI.

---

## 2) Implementation Steps

### Phase 1 — Core Loop POC (engine in isolation)
**User stories**
1. Simulate placing/removing cards into Zones A–D and see engine state update deterministically.
2. Complete a wave using Attack/Action/Recharge with correct HP/Energy/Defense math.
3. Arm boosters and confirm they apply **only** on the next relevant turn then expire.
4. Fuse via Activation and see fusion name + timer + raw/energy attacks.
5. Enemy intent is always visible and enemy move loop executes correctly.

**Status / Work Done**
- ✅ Frontend TypeScript enabled.
- ✅ `/src/data/*.json` created for all content.
- ✅ Pure `/src/engine` implemented (battle loop, combat math, statuses, fusions, scenarios, boosters, AI, campaign helpers).
- ✅ Engine unit tests: `src/engine/__tests__/engine.test.ts` **24/24 passing**.

### Phase 1.5 — V1 App Development (all screens + manual detector)
**User stories**
1. Start/continue a campaign and progress is saved/restored from localStorage.
2. Use Setup in **Manual mode** to place cards into zones and see what the app detects.
3. Play the Battle screen comfortably on phone with large buttons and readable log.
4. View all cards in the Library including the fusion matrix.
5. Reset progress and change settings without breaking the run.

**Status / Work Done**
- ✅ Routing + layout shell implemented: Title, Campaign Map, Setup, Battle, Results, Library, Settings.
- ✅ Persistence via localStorage for settings + progress + battle snapshot.
- ✅ Detection layer:
  - ✅ `CardDetector` contract implemented.
  - ✅ `ManualSimulatorDetector` implemented.
  - ✅ `LiveCameraDetector` implemented.
- ✅ Setup screen supports Manual character selection (places Character in Zone A).
- ✅ Battle screen wired via `useBattleController`.
- ✅ Card Library includes fusion matrix + detail dialogs.
- ✅ Settings includes toggles + reset progress.
- ✅ Bahasa Indonesia copy centralized in `src/i18n/id.ts`.
- ✅ Automated frontend playtests:
  - ✅ Phase 1 playtest passed (no critical issues).

---

### Phase 2 — Live Camera Detection (Rear Camera + ArUco markers)

#### Critical clarifications (locked-in requirements)
- **Markers must be placed on the FRONT of each physical card** (cards are face-up under the camera).
- `js-aruco` uses an original 5×5 ArUco-like dictionary (IDs 0–1023). Rotation safety matters.
- `markers.json` IDs must remain **rotation-safe**.
  - ✅ Mapping updated to IDs with **≥ 5 bit margin under 90/180/270° rotation**.
- **Do not re-introduce `onnxruntime-web`** (deployment blocker).

---

#### Architecture (implemented)
- ✅ `/src/detection/vision/`
  - ✅ ArUco wrapper + analysis pipeline
  - ✅ Homography warp utilities (`warp.ts`) integrated into pipeline
- ✅ `/src/detection/LiveCameraDetector.ts`
  - ✅ `getUserMedia` rear-camera request (facingMode: environment)
  - ✅ frame loop at configured FPS
  - ✅ emits `ZoneEvent` for stable zone changes
  - ✅ telemetry exposed for overlays
- ✅ `/src/data/markers.json`
  - ✅ rotation-safe IDs allocated for:
    - ✅ corners
    - ✅ 35 card markers

---

#### Phase 2a — Camera open + ArUco detection + zone events + debug overlay
**Goal:** End-to-end marker detection and zone events.

**Status:** ✅ Done.

**What was delivered**
- ✅ Rear camera mode toggle in Settings.
- ✅ Live camera stream acquisition (`getUserMedia`).
- ✅ ArUco marker detection via `js-aruco`.
- ✅ Corner-based calibration gating.
- ✅ Stable zone events via `ZoneDebouncer`.
- ✅ Debug overlay.
- ✅ Graceful fallback to Manual if camera denied/unavailable.
- ✅ Removed ONNX runtime dependency.

**Exit criteria:** ✅ Met.

---

#### Phase 2b — Homography warp (tilt-resistant)
**Goal:** Make detection accurate when the phone is tilted.

**Status:** ✅ Done.

**What was delivered**
- ✅ Top-down warp (homography) so zone assignment stays stable under tilt.
- ✅ Unit tests validating tilted mapping correctness.

**Exit criteria:** ✅ Met.

---

#### Phase 2c — Calibration PDF + sticker sheet generation
**Goal:** Physical setup becomes repeatable (classrooms, quick start).

**Status:** ✅ Done.

**Deliverables**
- ✅ In-app generated PDF kit via `jspdf`:
  1. ✅ Calibration mat (A4 landscape) with 4 corner markers + zones.
  2. ✅ Sticker sheet (A4 portrait) with all 35 card markers.
- ✅ Rotation-safe ID allocation preserved and tested.
- ✅ Automated verification:
  - ✅ Jest tests for PDF generation
  - ✅ External decode checks via Python (`PyMuPDF`) on simulated camera tilt

**Exit criteria:** ✅ Met.

---

### Phase 2d — Mission Briefings (Episode intro screens)
**Goal:** Add an episode intro screen that makes the campaign feel like a narrative and hypes the STEM theme.

**Status:** ✅ Done.

**What was delivered**
- ✅ New page `src/pages/Briefing.tsx`:
  - Cinematic “incoming transmission” layout with staged reveal (Framer Motion).
  - Typewriter-style reveals for key lines.
  - Respects reduced-motion/low-graphics (animations disabled appropriately).
- ✅ Data integration:
  - `src/data/campaign.json` extended with episode-level `briefing` fields:
    - `codename`, `intro`, `objective`, `tacticTip` (Bahasa Indonesia).
  - `EpisodeDef` extended with optional `briefing` block.
- ✅ Routing:
  - `/briefing/:episodeId` (plus `/briefing` fallback) added to router.
- ✅ Flow integration:
  - Map Start/Replay/Resume → `/briefing/:episodeId`.
  - Results “Episode Berikutnya” → `/briefing/:nextEpisodeId`.
- ✅ UI copy:
  - `src/i18n/id.ts` extended under `briefing` for additional labels.
- ✅ Bug fix:
  - Fixed Typewriter runtime error (`Cannot create property '_iv' on number ...`) via proper timer cleanup.

**Frontend testing**
- ✅ `testing_agent_v3` completed: **14/14 passed**, frontend success **100%**.
- ✅ Verified: no runtime error overlays on briefing pages.

**Exit criteria:** ✅ Met.

---

## 3) Next Actions
1. ⏳ **Publish / Deploy**
   - User presses **Deploy** in Emergent UI.
   - Capture and share the live URL.
2. ⏳ Real-device QA checklist (phone camera)
   - camera permission prompt works
   - 4 corners recognized and calibration locks
   - warp view stable under normal tilt
   - stickers detectable at typical distance/lighting
   - mission briefings flow: Map → Briefing → Setup works on-device
3. ⏳ Phase 2c print QA
   - Print the PDF on A4 at **100% scale**
   - Confirm markers scan reliably under indoor lighting

---

## 4) Success Criteria
- ✅ Phase 1 remains fully playable in Manual mode.
- ✅ Phase 2a: camera mode works with ArUco markers + corner calibration + stable zone events + debug overlay.
- ✅ Phase 2b: camera mode gains **tilt-resistant warping** + **mm-accurate zone mapping**.
- ✅ Phase 2c: players can print calibration mat + card sticker sheet and set up quickly.
- ✅ Phase 2d: Mission briefings add narrative + STEM/tactics without slowing the core loop.
- ⏳ Deployed: live URL available for user playtest on a real phone.
- No backend required; localStorage persistence remains intact.
