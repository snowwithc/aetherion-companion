/**
 * Battle screen - the main gameplay.
 *
 * Flow:
 *  - Load the saved BattleState from progress (or build a fresh one).
 *  - useBattleController drives the engine and emits animations + fx.
 *  - initiative: big d6 button.
 *  - playerAction / awaitingCard: action bar + card tray.
 *  - victory/defeat: controller fires onEnd, we save progress, navigate to /results.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, Flag, Layers, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  createBattle, defensePct, elements, getActions, getActivation, getBooster, getCharacter, getEnemy,
  getEnemyIntent, getEpisode, getFusion, getScenario, isLastWave, playerDefense, zoneHint,
  type BattleState, type DeckId,
} from '@/engine';
import { Screen } from '@/components/game/Screen';
import { StatBar } from '@/components/game/StatBar';
import { StatusPills } from '@/components/game/StatusPills';
import { ZoneStrip } from '@/components/game/ZoneStrip';
import { ActionBar } from '@/components/game/ActionBar';
import { CombatLog } from '@/components/game/CombatLog';
import { IntentBubble } from '@/components/game/IntentBubble';
import { CharacterFigure } from '@/components/game/CharacterFigure';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { CardFace } from '@/components/game/CardFace';
import { CardTray } from '@/components/game/CardTray';
import { Die } from '@/components/game/Die';
import { useGame } from '@/store/GameProvider';
import { useBattleController } from '@/hooks/useBattleController';
import { useZoneEvents, useZoneSnapshot } from '@/detection/hooks';
import { CameraPreview } from '@/components/game/CameraPreview';
import { DebugOverlay } from '@/components/game/DebugOverlay';
import { cn } from '@/lib/utils';
import { t } from '@/i18n/id';
import type { CardType } from '@/engine';

const DECK_LABEL: Record<DeckId, { name: string; type: CardType; zone: string }> = {
  E: { name: t.library.tabs.activation, type: 'activation', zone: 'B' },
  F: { name: t.library.tabs.booster, type: 'booster', zone: 'C' },
  G: { name: t.library.tabs.scenario, type: 'scenario', zone: 'D' },
};

export default function BattlePage() {
  const navigate = useNavigate();
  const { progress, updateProgress, manual, detector } = useGame();
  const run = progress.run;

  // Build / restore the battle state ONCE on mount.
  const initial = useMemo<BattleState | null>(() => {
    if (!run?.characterId) return null;
    if (progress.battle && progress.battle.episodeId === run.episodeId && progress.battle.waveIndex === run.waveIndex) return progress.battle;
    return createBattle({
      episodeId: run.episodeId,
      waveIndex: run.waveIndex,
      characterId: run.characterId,
      hp: run.hp,
      energy: run.energy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!run) {
      toast.info('Tidak ada pertempuran aktif.');
      navigate('/map', { replace: true });
    } else if (!run.characterId) {
      navigate('/setup', { replace: true });
    }
  }, [run, navigate]);

  if (!initial || !run?.characterId) return null;

  return <BattleInner initial={initial} />;
}

function BattleInner({ initial }: { initial: BattleState }) {
  const navigate = useNavigate();
  const { progress, updateProgress, manual, detector, camera, cameraActive, settings } = useGame();
  const [trayOpen, setTrayOpen] = useState(false);

  const onEnd = React.useCallback((state: BattleState) => {
    const run = progress.run;
    if (!run) return;
    if (state.phase === 'victory') {
      const episodeDone = isLastWave(run);
      if (episodeDone) {
        updateProgress((p) => ({
          ...p,
          battle: null,
          run: null,
          unlockedEpisodes: Math.max(p.unlockedEpisodes, Math.min(3, (getEpisode(run.episodeId).number) + 1)),
          completedEpisodes: p.completedEpisodes.includes(run.episodeId) ? p.completedEpisodes : [...p.completedEpisodes, run.episodeId],
          clearedWaves: { ...p.clearedWaves, [run.episodeId]: Math.max(p.clearedWaves[run.episodeId] ?? 0, getEpisode(run.episodeId).waves.length) },
          lastResult: { type: 'episodeVictory', episodeId: run.episodeId, enemyId: state.enemy.enemyId },
        }));
      } else {
        // Wave cleared - compute heal here so Results screen can show it.
        const heal = { hpBefore: state.player.hp, hpAfter: Math.min(100, state.player.hp + 25), energyBefore: state.player.energy, energyAfter: Math.min(100, state.player.energy + 50) };
        updateProgress((p) => ({
          ...p,
          battle: null,
          run: { ...run, hp: state.player.hp, energy: state.player.energy },
          clearedWaves: { ...p.clearedWaves, [run.episodeId]: Math.max(p.clearedWaves[run.episodeId] ?? 0, run.waveIndex + 1) },
          lastResult: { type: 'waveCleared', episodeId: run.episodeId, waveIndex: run.waveIndex, enemyId: state.enemy.enemyId, heal },
        }));
      }
    } else if (state.phase === 'defeat') {
      updateProgress((p) => ({
        ...p,
        battle: null,
        lastResult: { type: 'defeat', episodeId: run.episodeId, waveIndex: run.waveIndex, enemyId: state.enemy.enemyId },
      }));
    }
    navigate('/results', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.run, navigate]);

  const onSnapshot = React.useCallback((state: BattleState) => {
    updateProgress((p) => ({ ...p, battle: state }));
  }, [updateProgress]);

  const { state, fx, dice, banner, moment, anim, roll, act, cancelCard, pickDeck, onZoneEvent, dismissMoment } = useBattleController(initial, { onEnd, onSnapshot });

  // Wire the manual detector to the controller (any zone event -> engine).
  useZoneEvents(detector, onZoneEvent);
  const matSnapshot = useZoneSnapshot(detector);

  const char = getCharacter(state.player.characterId);
  const enemy = getEnemy(state.enemy.enemyId);
  const intent = getEnemyIntent(state);
  const actions = getActions(state);
  const fusionColor = state.player.fusion ? getActivation(state.player.fusion.activationId).color : null;

  const episode = getEpisode(state.episodeId);
  const waveLabel = `EP ${episode.number} - Wave ${state.waveIndex + 1}/${episode.waves.length}`;

  const openTrayForDeck = (deck: DeckId) => {
    pickDeck(deck);
    setTrayOpen(true);
  };

  const onForfeit = () => {
    if (window.confirm(t.battle.forfeitConfirm)) {
      updateProgress((p) => ({
        ...p,
        battle: null,
        lastResult: { type: 'defeat', episodeId: state.episodeId, waveIndex: state.waveIndex, enemyId: state.enemy.enemyId },
      }));
      navigate('/results', { replace: true });
    }
  };

  return (
    <Screen
      title={state.phase === 'enemyTurn' ? `${enemy.name} - ${t.battle.enemyTurn}` : t.battle.title}
      subtitle={`${waveLabel} - ${t.battle.round} ${state.round}`}
      back={() => navigate('/map')}
      wide
      testId="battle-screen"
      right={
        <button type="button" onClick={onForfeit} className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.08)] px-2 py-1.5 text-xs font-semibold text-[hsl(6_90%_75%)] hover:brightness-110" data-testid="battle-forfeit-button">
          <Flag className="h-3.5 w-3.5" /> {t.battle.forfeit}
        </button>
      }
    >
      <div className="relative space-y-3">
        {/* ENEMY PANEL */}
        <section className="panel relative overflow-hidden p-3 sm:p-4" data-testid="battle-enemy-panel">
          <div className="flex items-start gap-3">
            <div className="relative">
              <EnemyFigure
                enemyId={state.enemy.enemyId}
                color={enemy.color}
                boss={enemy.boss}
                raging={intent.raging}
                lungeKey={anim.enemyLunge}
                hitKey={anim.enemyHit}
                defeated={state.phase === 'victory'}
                testId="battle-enemy-art"
              />
              <FloatingFx list={fx.filter((f) => f.side === 'enemy')} testId="battle-enemy-fx" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-display text-lg font-semibold leading-tight" data-testid="battle-enemy-name">{enemy.name}{enemy.boss ? <span className="ml-2 rounded-md bg-[hsl(var(--aether-gold)/0.2)] px-1.5 py-0.5 font-mono-ui text-[10px] font-bold text-[hsl(var(--aether-gold))]">{t.map.boss}</span> : null}</div>
              </div>
              <StatBar value={state.enemy.hp} max={state.enemy.maxHp} kind="enemy" testId="battle-enemy-hp-bar" compact />
              <div className="text-[11px] font-semibold text-[hsl(var(--text-dim))]" data-testid="battle-enemy-defense">
                {t.battle.defense}: <span className="text-[hsl(var(--text))] font-mono-ui">{Math.round(enemy.defense * 100)}%</span>
              </div>
              <StatusPills statuses={state.enemy.statuses} testId="battle-enemy-statuses" emptyText={t.battle.noStatus} />
              <IntentBubble intent={intent} compact />
            </div>
          </div>
        </section>

        {/* SCENARIO + FUSION indicators */}
        <section className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="battle-status-row">
          {state.scenario ? (
            <ScenarioBadge scenarioId={state.scenario.scenarioId} rounds={state.scenario.roundsLeft} />
          ) : (
            <EmptyBadge label={t.battle.noScenario} />
          )}
          {state.player.fusion ? (
            <FusionBadge state={state} color={fusionColor} />
          ) : (
            <EmptyBadge label={t.battle.noFusion} />
          )}
        </section>

        {/* CAMERA PREVIEW (when camera mode is active) */}
        {cameraActive ? (
          <section data-testid="battle-camera-section" className="space-y-2">
            <div className="relative aspect-[16/9] w-full">
              <CameraPreview detector={camera} showOverlay className="absolute inset-0" testId="battle-camera-preview" />
            </div>
            {settings.debugOverlay ? <DebugOverlay detector={camera} /> : null}
          </section>
        ) : null}

        {/* ZONE STRIP */}
        <section data-testid="battle-zone-strip-section">
          <ZoneStrip
            snapshot={matSnapshot}
            highlight={state.phase === 'awaitingCard' && state.pending?.deck ? [{ E: 'B', F: 'C', G: 'D' }[state.pending.deck] as 'B' | 'C' | 'D'] : []}
            onChipClick={(z) => { if (matSnapshot[z].cardId && z !== 'A') manual.remove(z); }}
          />
        </section>

        {/* PLAYER PANEL */}
        <section className="panel relative overflow-hidden p-3 sm:p-4" data-testid="battle-player-panel">
          <div className="flex items-start gap-3">
            <div className="relative">
              <CharacterFigure
                characterId={state.player.characterId}
                fusionActivationId={state.player.fusion?.activationId ?? null}
                lungeKey={anim.playerLunge}
                hitKey={anim.playerHit}
                testId="battle-player-art"
              />
              <FloatingFx list={fx.filter((f) => f.side === 'player')} testId="battle-player-fx" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="font-display text-lg font-semibold leading-tight" data-testid="battle-player-name">
                  {state.player.fusion?.name ?? char.name}
                  <span className="ml-2 text-xs font-normal text-[hsl(var(--text-dim))]">{elements[char.element].name}</span>
                </div>
              </div>
              <StatBar value={state.player.hp} max={state.player.maxHp} kind="hp" testId="battle-player-hp-bar" compact />
              <StatBar value={state.player.energy} max={state.player.maxEnergy} kind="energy" label={t.battle.energy} testId="battle-player-energy-bar" compact />
              <div className="text-[11px] font-semibold text-[hsl(var(--text-dim))]" data-testid="battle-player-defense">
                {t.battle.defense}: <span className="text-[hsl(var(--text))] font-mono-ui">{defensePct(playerDefense(state))}</span>
              </div>
              <StatusPills statuses={state.player.statuses} testId="battle-player-statuses" emptyText={t.battle.noStatus} />
              <BoosterSlots state={state} />
            </div>
          </div>
        </section>

        {/* ACTION BAR or INITIATIVE or AWAITING CARD */}
        <section data-testid="battle-action-section">
          {state.phase === 'initiative' ? (
            <InitiativeCta onRoll={() => roll()} dice={dice} />
          ) : state.phase === 'awaitingCard' ? (
            <AwaitingCardCta
              pendingDeck={state.pending?.deck ?? null}
              onPickDeck={openTrayForDeck}
              onCancel={() => cancelCard()}
              onOpenTray={() => setTrayOpen(true)}
            />
          ) : (
            <ActionBar actions={actions} onAction={act} fusionActivationId={state.player.fusion?.activationId ?? null} fusionColor={fusionColor} />
          )}
        </section>

        {/* QUICK TRAY TOGGLE */}
        <section className="flex justify-center">
          <button type="button" onClick={() => setTrayOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-2 text-xs font-bold text-[hsl(var(--text-dim))] hover:text-white" data-testid="battle-open-tray-button">
            <Layers className="h-4 w-4" /> {t.battle.openTray}
          </button>
        </section>

        {/* LOG */}
        <section data-testid="battle-combat-log-section">
          <CombatLog log={state.log} defaultOpen={false} />
        </section>

        {/* OVERLAYS */}
        <BannerOverlay banner={banner} />
        <CardMomentOverlay moment={moment} onDismiss={dismissMoment} />
        <DiceOverlay dice={dice} />
      </div>

      <CardTray open={trayOpen} onOpenChange={setTrayOpen} tab={state.phase === 'awaitingCard' ? (state.pending?.deck ? DECK_LABEL[state.pending.deck].type as CardType : 'activation') : undefined} />
    </Screen>
  );
}

// --------- helpers --------------------------------------------------------

function InitiativeCta({ onRoll, dice }: { onRoll: () => void; dice: { value: number; key: number } | null }) {
  return (
    <div className="panel flex flex-col items-center gap-3 p-4 text-center" data-testid="battle-initiative-cta">
      <div className="text-sm text-[hsl(var(--text-dim))]">{t.battle.rollHint}</div>
      <button type="button" onClick={onRoll} className="inline-flex min-h-[64px] items-center gap-2 rounded-2xl bg-[hsl(var(--aether-cyan))] px-6 text-lg font-extrabold text-[hsl(222_45%_8%)] shadow-[0_14px_30px_-18px_hsl(var(--aether-cyan)/0.8)] active:scale-[0.98]" data-testid="battle-initiative-roll-button">
        <Dices className="h-6 w-6" /> {t.battle.rollInitiative}
      </button>
      {dice ? <Die value={dice.value} rollKey={dice.key} size={64} testId="battle-initiative-die" /> : null}
    </div>
  );
}

function AwaitingCardCta({ pendingDeck, onPickDeck, onCancel, onOpenTray }: {
  pendingDeck: DeckId | null;
  onPickDeck: (d: DeckId) => void;
  onCancel: () => void;
  onOpenTray: () => void;
}) {
  return (
    <div className="panel p-3" data-testid="battle-awaiting-card-cta">
      <div className="mb-2 text-sm text-[hsl(var(--text-dim))]">{t.battle.pendingHint}</div>
      <div className="grid grid-cols-3 gap-2">
        {(['E', 'F', 'G'] as DeckId[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onPickDeck(d)}
            data-testid={`battle-awaiting-pick-deck-${d}`}
            className={cn(
              'rounded-xl border px-2 py-2 text-xs font-bold transition-colors',
              pendingDeck === d ? 'border-[hsl(var(--aether-cyan))] bg-[hsl(var(--aether-cyan)/0.12)] text-[hsl(188_90%_82%)]' : 'border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] text-[hsl(var(--text-dim))]',
            )}
          >
            <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--aether-gold))]">PILE {d}</div>
            <div className="text-sm">{DECK_LABEL[d].name}</div>
            <div className="text-[10px] text-[hsl(var(--text-dim))]">zona {DECK_LABEL[d].zone}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onOpenTray} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--aether-cyan))] px-3 py-2 text-sm font-bold text-[hsl(222_45%_8%)]" data-testid="battle-awaiting-open-tray-button">
          <Layers className="h-4 w-4" /> {t.battle.openTray}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-2 text-sm font-bold" data-testid="battle-awaiting-cancel-button">
          <XCircle className="h-4 w-4" /> {t.battle.cancelCard}
        </button>
      </div>
    </div>
  );
}

function ScenarioBadge({ scenarioId, rounds }: { scenarioId: string; rounds: number }) {
  const sc = getScenario(scenarioId);
  return (
    <div className="panel flex items-center gap-2 p-2" data-testid="battle-scenario-badge">
      <div className="w-10" style={{ aspectRatio: '63/88' }}>
        <CardFace cardId={scenarioId} tilt={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-lavender))]">{t.battle.scenario}</div>
        <div className="truncate text-sm font-bold">{sc.name}</div>
        <div className="text-[11px] text-[hsl(var(--text-dim))]">{rounds} ronde tersisa</div>
      </div>
    </div>
  );
}

function FusionBadge({ state, color }: { state: BattleState; color: string | null }) {
  const f = state.player.fusion!;
  const fusion = getFusion(f.activationId, state.player.characterId);
  return (
    <div className="panel flex items-center gap-2 p-2" data-testid="battle-fusion-badge" style={{ borderColor: `${color ?? '#8B4FE0'}66` }}>
      <div className="w-10" style={{ aspectRatio: '63/88' }}>
        <CardFace cardId={f.activationId} tilt={false} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em]" style={{ color: color ?? '#C9B2F2' }}>{t.battle.fusion}{fusion.signature ? ' \u2605' : ''}</div>
        <div className="truncate text-sm font-bold">{f.name}</div>
        <div className="text-[11px] text-[hsl(var(--text-dim))]">{f.roundsLeft} ronde tersisa</div>
      </div>
    </div>
  );
}

function EmptyBadge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-3 text-xs italic text-[hsl(var(--text-dim))]/70">
      {label}
    </div>
  );
}

function BoosterSlots({ state }: { state: BattleState }) {
  const list = state.player.boosters;
  if (list.length === 0) return <div className="text-xs italic text-[hsl(var(--text-dim))]/70" data-testid="battle-booster-slots">{t.battle.noBoosters}</div>;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="battle-booster-slots">
      {list.map((slot, i) => {
        const def = getBooster(slot.boosterId);
        return (
          <span
            key={`${slot.boosterId}-${i}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              slot.state === 'active' ? 'border-[hsl(var(--aether-gold)/0.6)] bg-[hsl(var(--aether-gold)/0.15)] text-[hsl(42_95%_80%)]' : 'border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] text-[hsl(var(--text-dim))]',
            )}
            title={def.text}
            data-testid={`battle-booster-${slot.boosterId}`}
          >
            {def.name} <span className="opacity-70">({slot.state === 'active' ? 'aktif' : 'siap'})</span>
          </span>
        );
      })}
    </div>
  );
}

function FloatingFx({ list, testId }: { list: { id: number; text: string; tone: string }[]; testId?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0" data-testid={testId}>
      <AnimatePresence>
        {list.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: -46 - i * 2, scale: 1 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute left-1/2 top-4 -translate-x-1/2 text-base font-extrabold"
            style={{ color: f.tone === 'damage' ? '#ff7a6a' : f.tone === 'heal' ? '#7bdd9c' : f.tone === 'energy' ? '#5EC8E5' : f.tone === 'status' ? '#D6B4FF' : '#E9EEFC' }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function BannerOverlay({ banner }: { banner: { key: number; text: string; tone: string } | null }) {
  return (
    <AnimatePresence>
      {banner ? (
        <motion.div
          key={banner.key}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2"
          data-testid="battle-banner"
        >
          <div className={cn(
            'rounded-2xl px-5 py-2 font-display text-xl font-semibold tracking-wide',
            banner.tone === 'good' ? 'bg-[hsl(var(--success)/0.2)] text-[hsl(142_70%_80%)]' :
              banner.tone === 'bad' ? 'bg-[hsl(var(--danger)/0.2)] text-[hsl(6_90%_80%)]' :
                banner.tone === 'warn' ? 'bg-[hsl(var(--warning)/0.2)] text-[hsl(42_95%_80%)]' :
                  'bg-[hsl(var(--panel))] text-[hsl(var(--text))]',
          )}>
            {banner.text}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CardMomentOverlay({ moment, onDismiss }: { moment: { key: number; cardId: string; title: string; subtitle: string } | null; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {moment ? (
        <motion.button
          key={moment.key}
          type="button"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-[hsl(var(--bg-0)/0.72)] backdrop-blur-sm"
          data-testid="battle-card-moment"
        >
          <motion.div initial={{ scale: 0.6, y: 80, rotate: -10 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className="flex flex-col items-center gap-2">
            <div className="w-[180px]" style={{ aspectRatio: '63/88' }}>
              <CardFace cardId={moment.cardId} tilt={false} />
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-semibold text-white" data-testid="battle-card-moment-title">{moment.title}</div>
              <div className="text-sm text-[hsl(var(--text-dim))]">{moment.subtitle}</div>
            </div>
            <div className="text-[11px] uppercase tracking-widest text-[hsl(var(--text-dim))]/70">{t.common.tapToReturn}</div>
          </motion.div>
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}

function DiceOverlay({ dice }: { dice: { key: number; value: number; label: string; success?: boolean } | null }) {
  return (
    <AnimatePresence>
      {dice ? (
        <motion.div
          key={dice.key}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed right-4 top-24 z-40 flex items-center gap-2 rounded-2xl border border-[hsl(var(--border-c))] bg-[hsl(var(--bg-1)/0.9)] px-3 py-2 backdrop-blur"
          data-testid="battle-dice-overlay"
        >
          <Die value={dice.value} rollKey={dice.key} size={48} />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--text-dim))]">{dice.label}</div>
            <div className={cn('font-mono-ui text-lg font-extrabold', dice.success === true ? 'text-[hsl(var(--success))]' : dice.success === false ? 'text-[hsl(var(--danger))]' : 'text-[hsl(var(--text))]')}>d6 = {dice.value}</div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
