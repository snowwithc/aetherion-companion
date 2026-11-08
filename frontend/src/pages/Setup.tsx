/**
 * Setup / Calibration screen.
 *
 * Phase 1: Camera is deferred, so this screen is a Manual-mode character picker.
 * - If a character has already been chosen (continuing a run), we show it preselected.
 * - User taps a character card to place it in Zone A, then confirms to start the battle.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Info, ScanLine, Shuffle, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { createBattle, characters, elements, getCharacter, getEnemy, getEpisode } from '@/engine';
import { useGame } from '@/store/GameProvider';
import { useZoneSnapshot } from '@/detection/hooks';
import { Screen, GameButton, DidYouKnow } from '@/components/game/Screen';
import { MatPreview } from '@/components/game/MatPreview';
import { CardFace } from '@/components/game/CardFace';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { ELEMENT_ICON } from '@/components/game/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { t } from '@/i18n/id';

export default function SetupPage() {
  const navigate = useNavigate();
  const { progress, updateProgress, manual } = useGame();
  const snapshot = useZoneSnapshot(manual);
  const run = progress.run;

  const selectedId = snapshot.A.cardId ?? run?.characterId ?? null;
  const selected = selectedId ? getCharacter(selectedId) : null;

  // Guard: without a run, send user back to the map.
  useEffect(() => {
    if (!run) {
      toast.info('Pilih episode terlebih dahulu.');
      navigate('/map', { replace: true });
    }
  }, [run, navigate]);

  // If the run already has a character but Zone A is empty, pre-populate the mat.
  useEffect(() => {
    if (run?.characterId && !snapshot.A.cardId) {
      manual.place(run.characterId, 'A');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.characterId]);

  if (!run) return null;

  const ep = getEpisode(run.episodeId);
  const enemy = getEnemy(ep.waves[run.waveIndex]);

  const pickCharacter = (id: string) => {
    manual.place(id, 'A');
  };

  const randomCharacter = () => {
    const pool = characters.filter((c) => c.id !== selectedId);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? characters[0];
    pickCharacter(pick.id);
  };

  const startBattle = () => {
    if (!selected) {
      toast.warning(t.setup.missingCharacter);
      return;
    }
    const nextRun = { ...run, characterId: selected.id };
    const battle = createBattle({
      episodeId: run.episodeId,
      waveIndex: run.waveIndex,
      characterId: selected.id,
      hp: run.hp,
      energy: run.energy,
    });
    updateProgress((p) => ({ ...p, run: nextRun, battle }));
    // Clear activation/booster/scenario zones for a clean battle start.
    manual.clear(['B', 'C', 'D']);
    navigate('/battle');
  };

  return (
    <Screen title={t.setup.title} subtitle={`Episode ${ep.number} - ${ep.name} - ${t.setup.wave} ${run.waveIndex + 1}/${ep.waves.length}`} back="/map" testId="setup-screen">
      <div className="space-y-4">
        {/* VS banner */}
        <div className="panel flex items-center gap-4 p-3 sm:p-4" data-testid="setup-versus-banner">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--text-dim))]">{t.setup.vs}</div>
            <div className="font-display text-xl font-semibold leading-tight sm:text-2xl" data-testid="setup-enemy-name">{enemy.name}{enemy.boss ? <span className="ml-2 rounded-md bg-[hsl(var(--aether-gold)/0.2)] px-1.5 py-0.5 font-mono-ui text-[10px] font-bold text-[hsl(var(--aether-gold))]">{t.map.boss}</span> : null}</div>
            <p className="text-sm text-[hsl(var(--text-dim))]">{enemy.flavor}</p>
          </div>
          <EnemyFigure enemyId={enemy.id} color={enemy.color} boss={enemy.boss} className="!h-[90px] !w-[90px] sm:!h-[120px] sm:!w-[120px]" testId="setup-enemy-art" />
        </div>

        {/* Mat */}
        <div data-testid="setup-mat">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--text-dim))]">
            <ScanLine className="h-4 w-4 text-[hsl(var(--aether-cyan))]" />
            {t.setup.zoneHint}
          </div>
          <MatPreview snapshot={snapshot} highlight={selected ? [] : ['A']} />
        </div>

        {/* Character picker */}
        <div className="panel p-3 sm:p-4" data-testid="setup-character-picker">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">{t.setup.chooseCharacter}</h2>
              <p className="text-xs text-[hsl(var(--text-dim))]">{t.setup.chooseHint}</p>
            </div>
            <button type="button" onClick={randomCharacter} className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] px-3 py-2 text-xs font-bold hover:brightness-110" data-testid="setup-random-character-button">
              <Shuffle className="h-3.5 w-3.5" /> Acak
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="setup-character-grid">
            {characters.map((c) => {
              const Icon = ELEMENT_ICON[c.element];
              const active = selectedId === c.id;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => pickCharacter(c.id)}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative rounded-2xl border p-2 text-left transition-colors',
                    active ? 'border-[hsl(var(--aether-cyan))] bg-[hsl(var(--aether-cyan)/0.07)] shadow-[0_0_18px_-6px_hsl(var(--aether-cyan)/0.9)]' : 'border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] hover:bg-[hsl(var(--panel-2))]',
                  )}
                  data-testid={`setup-character-option-${c.id}`}
                >
                  <div style={{ aspectRatio: '63/88' }}>
                    <CardFace cardId={c.id} tilt={false} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs font-bold">
                    <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="truncate text-[10px] text-[hsl(var(--text-dim))]">{elements[c.element].name}</div>
                  {active ? <CheckCircle2 className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-[hsl(var(--bg-0))] text-[hsl(var(--aether-cyan))]" /> : null}
                </motion.button>
              );
            })}
          </div>
          {selected ? (
            <div className="mt-4 rounded-xl border border-[hsl(var(--aether-cyan)/0.35)] bg-[hsl(var(--aether-cyan)/0.07)] p-3" data-testid="setup-character-detail">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[hsl(var(--aether-cyan))]" />
                <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-cyan))]">{t.setup.passive}</div>
              </div>
              <div className="mt-1 text-sm font-semibold">{selected.passive.name}</div>
              <p className="text-sm text-[hsl(var(--text-dim))]">{selected.passive.text}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono-ui">
                <span className="rounded-md bg-[hsl(var(--panel))] px-2 py-0.5">DEF {Math.round(selected.defense * 100)}%</span>
                <span className="rounded-md bg-[hsl(var(--panel))] px-2 py-0.5">Recharge +{selected.recharge}</span>
              </div>
            </div>
          ) : null}
        </div>

        <DidYouKnow text={ep.stemFact} />

        <GameButton testId="setup-start-battle-button" onClick={startBattle} disabled={!selected} className="w-full">
          <Swords className="h-5 w-5" />
          {t.setup.continue}
        </GameButton>
      </div>
    </Screen>
  );
}
