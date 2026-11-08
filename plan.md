# plan.md — Aetherion Companion (Phase 1 only)

## 1) Objectives
- Deliver a fully playable **3-episode campaign** in **Manual Simulator mode** (no camera), with all rules implemented in a **pure TS engine** (`/src/engine`) separated from UI.
- Keep all balance/content in editable JSON under `/src/data` (characters, activations, fusion matrix, boosters, scenarios, enemies, config).
- Provide a **CardDetector interface** with `ManualSimulatorDetector` (real) + `LiveCameraDetector` (stub/unavailable) so Phase 2 can drop in later.
- Ship a mobile-first UI (React + Tailwind + Framer Motion) with **simple CSS animations** (no particle effects) and persistence via **localStorage**.
- **Crucial Phase 1 constraint:** fully test and validate in **Manual mode** first; do **not** build the live camera detection pipeline.
- **Language constraint for first pass:** default UI copy is **Bahasa Indonesia** (hardcoded for now; full i18n deferred).

## 2) Implementation Steps

### Phase 1 — Core Loop POC (engine in isolation)
**User stories**
1. As a player, I can simulate placing/removing cards into Zones A–D and see engine state update deterministically.
2. As a player, I can complete a wave using Attack/Action/Recharge and see correct HP/Energy/Defense math.
3. As a player, I can arm boosters and confirm they apply **only** to my next turn and then expire.
4. As a player, I can fuse via Activation and see the fusion name + timer + raw/energy attacks.
5. As a player, I can confirm enemy intent is always visible and enemy move loop executes correctly.

**Steps**
- ✅ Frontend TypeScript enabled (CRA + craco).
- ✅ `/src/data/*.json` created for all content.
- ✅ Pure `/src/engine` implemented:
  - State model: episode → wave → battle
  - Turn system: start-of-turn ticks, one player action, enemy action, end-of-round counters
  - Damage formula with defense cap (40%), scenario modifiers, booster multipliers
  - Status system + scenario special rules
  - Fusion system: activation replacement, signature +5 numeric-only
  - Booster arming/expiry rules, max 2
  - Enemy AI: looping move list, telegraphed intent
  - Between waves heal/restore helpers
- ✅ Engine tests: `src/engine/__tests__/engine.test.ts` **24/24 passing**.

### Phase 2 — V1 App Development (all screens + manual detector)
**User stories**
1. As a player, I can start/continue a campaign and progress is saved/restored from localStorage.
2. As a player, I can use Setup in **Manual mode** to place cards into zones and see what the app detects.
3. As a player, I can play the Battle screen comfortably on phone with large buttons and a readable log.
4. As a player, I can view all cards in the Library including the 10×5 fusion matrix.
5. As a player, I can reset progress and change settings without breaking my run.

**Steps**
- ✅ Routing + layout shell (mobile-first) implemented:
  - Title, Campaign Map, Setup, Battle, Results, Card Library, Settings.
  - `App.tsx` uses React Router + Suspense, `GameProvider`, Sonner toaster.
- ✅ Persistence:
  - Zustand stores already in place; progress/settings saved in localStorage.
  - Battle snapshots saved during play for resume.
- ✅ Detection layer:
  - `CardDetector` contract + `ManualSimulatorDetector` implemented.
  - `LiveCameraDetector` stub remains (Phase 2 deferred).
- ✅ Setup/Calibration screen (Phase 1 version):
  - Manual character selection places Character in Zone A.
  - Mat preview (A–D) shows readings.
- ✅ Battle screen:
  - Enemy panel (HP/status/intent), Player panel (HP/Energy/DEF/status/fusion/scenario/boosters).
  - Zone strip A–D with wrong-zone warnings.
  - Actions: Attack / Action Card / Recharge; fused adds Raw/Energy.
  - Action Card flow: choose E/F/G, then place card in B/C/D via Manual tray.
  - Collapsible combat log.
  - Simple animations (lunge, hit flash, overlays), no particles.
- ✅ Card Library:
  - Tabs for Character/Activation/Booster/Scenario + **Fusion Matrix** view.
  - Card detail dialog.
- ✅ Settings:
  - Sound toggle, low-graphics toggle, debug overlay setting, reset progress.
  - Camera mode shown as “coming soon” with Phase 2 note.
- ✅ Bahasa Indonesia strings centralized in `src/i18n/id.ts` (hardcoded first pass).
- ✅ TypeScript ergonomics:
  - Added `src/components/ui/typed.ts` wrapper to type shadcn `.jsx` components from TSX.

### Phase 3 — Testing & Hardening
**User stories**
1. As a player, I can play the entire campaign without a crash or soft-lock.
2. As a player, I can close/reopen and continue mid-battle exactly where I left off.
3. As a player, I can’t exploit boosters (no same-turn benefit) or exceed max armed boosters.
4. As a player, wrong-zone placement never triggers effects and is clearly warned.
5. As a player, victory/defeat/wave-clear transitions always apply correct heals/restores.

**Steps**
- ✅ Visual smoke QA (screens load, navigation works, Bahasa Indonesia copy present) via screenshot tool:
  - Title, Map, Setup, Battle (initiative + attack), Library.
- ⏳ Run automated **frontend playtest** (testing agent) in Manual mode:
  - Episode 1 → Episode 3 full playthrough.
  - Edge cases:
    - Action Card canceled
    - Wrong-zone placement
    - 2 boosters cap
    - Fusion replacement
    - Scenario penalties blocked by Clear Skies
    - Resume mid-battle from localStorage snapshot
- ⏳ Patch issues found (small incremental fixes).
- ⏳ Add regression tests in engine when bugs discovered.

## 3) Next Actions
1. Run the automated frontend playtest (Manual mode) for a full 3-episode campaign.
2. Fix any UI↔engine sync/persistence issues revealed by playtest.
3. Confirm victory/defeat/wave-clear transitions + unlock logic are correct.
4. After user review/approval of Phase 1, only then discuss Phase 2 camera detection scope.

## 4) Success Criteria
- Entire 3-episode campaign is **fully playable in Manual mode**, including wave-to-wave progression and bosses.
- Engine remains pure TS, deterministic, and validated by passing unit tests.
- App runs frontend-only (no backend, no login) and persists via localStorage.
- UI defaults to **Bahasa Indonesia** copy (hardcoded is acceptable for Phase 1).
- Live camera detection is clearly deferred (Phase 2 not started).