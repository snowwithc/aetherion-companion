# plan.md — Aetherion Companion (Phase 1 ✅ complete → Phase 2 ✅2a→2b→2c→2d complete incl. Boss Preview Clip → Deploy next)

## 1) Objectives
- ✅ Deliver a fully playable **3-episode campaign** in **Mode Manual** (tanpa backend), dengan semua rules di **pure TS engine** (`/src/engine`) terpisah dari UI.
- ✅ Konten/balance editable via JSON di `/src/data`.
- ✅ Simpan progres di **localStorage** (tanpa login).
- ✅ Mobile-first UI (React + Tailwind + Framer Motion) + animasi ringan.
- ✅ UI **hardcoded Bahasa Indonesia** via `src/i18n/id.ts`.

- ✅ **Phase 2 objective (approved) — Live Camera Detection (rear camera)**
  - ✅ Primary detection: **ArUco markers** via `js-aruco` (deterministik)
  - ✅ Table calibration: **4 corner markers** (mat cetak)
  - ✅ Homography warp (top-down) untuk akurasi saat HP miring
  - ✅ PDF kit: mat kalibrasi + 35 stiker marker (in-app via `jspdf`)
  - ✅ Debug overlay/telemetry
  - ✅ AI fallback (ONNX) dibatalkan (deployment blocker) — marker-first baseline

- ✅ **Phase 2d — Mission Briefings + Episode Preview Clip**
  - ✅ Briefing sinematik “incoming transmission” untuk tiap episode (staged reveal + typewriter)
  - ✅ **User-confirmed behavior implemented**:
    - ✅ Briefing tampil **setiap kali** episode dimulai (Start/Replay/Resume) dan saat “Episode Berikutnya”
    - ✅ Style: **sinematik bertahap — sci‑fi hype**
  - ✅ **Episode Preview Clip (NEW)**:
    - ✅ Overlay 2.5s “target locked” boss hype (auto-dismiss)
    - ✅ Tap untuk skip
    - ✅ Meng-gate typewriter briefing agar tidak “balapan” dengan clip
  - ✅ Semua string tetap **Bahasa Indonesia** via `src/i18n/id.ts`

- ⏳ **Deploy**
  - Goal: publish live URL untuk playtest real-device: ArUco kamera + warp + PDF print + briefing
  - ✅ Deployment readiness scan PASS
  - ⏳ Next: user menekan tombol **Deploy** di Emergent UI

---

## 2) Implementation Steps

### Phase 1 — Core Loop POC (engine in isolation)
**User stories**
1. Simulate placing/removing cards into Zones A–D dan state engine konsisten.
2. Selesaikan wave dengan Attack/Action/Recharge dan perhitungan HP/Energy/Defense benar.
3. Booster berlaku pada timing yang tepat lalu expired.
4. Fusion via Activation menghasilkan fusion name + timer + variasi serangan.
5. Enemy intent terlihat dan enemy loop berjalan benar.

**Status / Work Done**
- ✅ Frontend TypeScript enabled.
- ✅ `/src/data/*.json` untuk semua konten.
- ✅ Pure `/src/engine` (battle loop, combat math, statuses, fusions, scenarios, boosters, AI, campaign helpers).
- ✅ Engine unit tests: `src/engine/__tests__/engine.test.ts` **24/24 passing**.

### Phase 1.5 — V1 App Development (screens + manual detector)
**User stories**
1. Start/continue campaign, progres tersimpan/restore dari localStorage.
2. Setup **Manual**: place/tap kartu dan lihat deteksi.
3. Battle screen nyaman di HP.
4. Library tampilkan semua kartu + fusion matrix.
5. Reset progress dan settings aman.

**Status / Work Done**
- ✅ Routing + shell: Title, Campaign Map, Setup, Battle, Results, Library, Settings.
- ✅ Persistence localStorage untuk settings + progress + battle snapshot.
- ✅ Detection layer:
  - ✅ `CardDetector` contract.
  - ✅ `ManualSimulatorDetector`.
  - ✅ `LiveCameraDetector`.
- ✅ Setup: manual character selection.
- ✅ Battle: controller wired.
- ✅ Library: fusion matrix + dialog.
- ✅ Settings: toggles + reset.
- ✅ Bahasa Indonesia copy centralized: `src/i18n/id.ts`.

---

### Phase 2 — Live Camera Detection (Rear Camera + ArUco markers)

#### Critical clarifications (locked-in requirements)
- **Markers ditempel di sisi DEPAN kartu** (kartu face-up di meja).
- `js-aruco` memakai dictionary 5×5 (IDs 0–1023) → rotation safety penting.
- `markers.json` IDs harus tetap **rotation-safe**.
- **Jangan re-introduce `onnxruntime-web`** (deployment blocker).

---

#### Architecture (implemented)
- ✅ `/src/detection/vision/`
  - ✅ ArUco wrapper + pipeline
  - ✅ Homography warp utilities (`warp.ts`) terintegrasi
- ✅ `/src/detection/LiveCameraDetector.ts`
  - ✅ `getUserMedia` rear camera
  - ✅ frame loop
  - ✅ `ZoneEvent` stabil (debounce)
  - ✅ telemetry untuk overlay
- ✅ `/src/data/markers.json`
  - ✅ rotation-safe IDs untuk corners + 35 card markers

---

#### Phase 2a — Camera open + detection + zone events + debug overlay
**Status:** ✅ Done.

**Delivered**
- ✅ Kamera mode toggle.
- ✅ Stream acquisition (`getUserMedia`).
- ✅ `js-aruco` marker detection.
- ✅ Corner calibration gating.
- ✅ Zone debouncing.
- ✅ Debug overlay.
- ✅ Fallback ke manual saat kamera gagal.

---

#### Phase 2b — Homography warp (tilt-resistant)
**Status:** ✅ Done.

**Delivered**
- ✅ Top-down warp (homography) untuk mapping zona stabil saat tilt.
- ✅ Unit tests untuk mapping tilted.

---

#### Phase 2c — Calibration PDF + sticker sheet generation
**Status:** ✅ Done.

**Delivered**
- ✅ `jspdf` PDF kit:
  1. ✅ Mat kalibrasi A4 landscape (4 corner markers + zona A–D)
  2. ✅ Sticker sheet A4 portrait (35 marker)
- ✅ Rotation-safe ID allocation preserved.
- ✅ Automated verification (Jest + Python/PyMuPDF simulated tilt decode).

---

### Phase 2d — Mission Briefings (Episode intro screens) + Episode Preview Clip
**Goal:** Tambahkan layer naratif + hype STEM sebelum gameplay.

**Status:** ✅ Done (polish complete).

**What was delivered**
- ✅ `src/pages/Briefing.tsx`
  - Cinematic “incoming transmission” layout
  - Staged reveal (Framer Motion)
  - Typewriter untuk teks kunci
  - Reduced-motion/low-graphics safe
- ✅ Data integration:
  - `src/data/campaign.json` extended dengan `briefing`:
    - `codename`, `intro`, `objective`, `tacticTip` (Bahasa Indonesia)
  - `EpisodeDef` extended dengan `briefing?: EpisodeBriefing`
- ✅ Routing:
  - `/briefing/:episodeId` + fallback `/briefing`
- ✅ Flow integration:
  - Map Start/Replay/Resume → `/briefing/:episodeId`
  - Results “Episode Berikutnya” → `/briefing/:nextEpisodeId`
- ✅ Bug fix:
  - Fixed Typewriter runtime error (`Cannot create property '_iv' on number ...`) via proper timer cleanup

**Episode Preview Clip (NEW)**
- ✅ `src/components/game/BossIntroClip.tsx`
  - Overlay “target locked” boss hype (~2.5s)
  - Auto-dismiss + tap/CTA untuk skip
  - Menampilkan nama boss + threat + HP + ATK
  - Audio cue (SFX) best-effort (may be muted by autoplay policy)
- ✅ Briefing gating:
  - Typewriter header dimulai setelah clip selesai agar pacing rapi
- ✅ UI copy:
  - `src/i18n/id.ts` extended: `t.briefing.clip.*`
- ✅ CSS:
  - Animasi tambahan untuk clip di `src/App.css`

**Frontend testing**
- ✅ Mission Briefings test run: `iteration_3.json` **14/14 passed**.
- ✅ Boss Intro Clip test run: `iteration_4.json` **11/11 passed**.

**Exit criteria:** ✅ Met.

---

## 3) Next Actions
1. ⏳ **Publish / Deploy**
   - User menekan **Deploy** di Emergent UI
   - Ambil live URL dan share untuk playtest
2. ⏳ Real-device QA checklist (phone camera)
   - kamera permission prompt
   - 4 corners terdeteksi + kalibrasi lock
   - warp stabil saat tilt
   - stiker terbaca di jarak/lighting normal
   - flow: Map → Boss Clip → Briefing → Setup → Battle
3. ⏳ Phase 2c print QA
   - cetak A4 skala **100%**
   - validasi scan marker indoor lighting

---

## 4) Success Criteria
- ✅ Phase 1 playable (manual) tanpa backend.
- ✅ Phase 2a/2b/2c camera system complete (ArUco + warp + PDF kit).
- ✅ Phase 2d narrative layer complete:
  - ✅ cinematic briefing
  - ✅ boss preview clip 2.5s
- ⏳ Deployed: live URL tersedia untuk playtest di HP.
- ✅ Tetap frontend-only: state di localStorage, tanpa login/backend.
