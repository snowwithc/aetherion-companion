/**
 * Results page: one component, three variants, routed from the battle screen.
 * Variant is read from the progress.lastResult that the Battle page just wrote.
 * - waveCleared   -> heal summary and Next Wave button.
 * - episodeVictory -> big Trophy, unlock the next episode.
 * - defeat        -> retry the wave or bail to the title.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, LayoutGrid, RefreshCw, Swords, Trophy, Zap } from 'lucide-react';
import { Screen, GameButton, DidYouKnow } from '@/components/game/Screen';
import { useGame } from '@/store/GameProvider';
import { advanceRun, createBattle, getEnemy, getEpisode, nextEpisodeId, newRun } from '@/engine';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { t } from '@/i18n/id';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { progress, updateProgress, manual } = useGame();
  const last = progress.lastResult;

  React.useEffect(() => {
    if (!last) navigate('/', { replace: true });
  }, [last, navigate]);

  if (!last) return null;

  const enemy = getEnemy(last.enemyId);
  const episode = getEpisode(last.episodeId);

  // --- WAVE CLEARED --------------------------------------------------------
  if (last.type === 'waveCleared') {
    const run = progress.run;
    const heal = last.heal;
    const onNext = () => {
      if (!run) return;
      const { run: newer } = advanceRun(run, heal.hpAfter, heal.energyAfter);
      const battle = createBattle({ episodeId: newer.episodeId, waveIndex: newer.waveIndex, characterId: newer.characterId ?? 'char_solara', hp: newer.hp, energy: newer.energy });
      updateProgress((p) => ({ ...p, run: newer, battle, lastResult: null }));
      manual.clear(['B', 'C', 'D']);
      navigate('/battle');
    };
    return (
      <Screen title={t.results.waveCleared} subtitle={t.results.waveClearedSub} back={() => navigate('/map')} testId="results-wave-cleared-screen">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <EnemyFigure enemyId={enemy.id} color={enemy.color} boss={enemy.boss} defeated className="!h-[150px] !w-[150px]" />
          </div>
          <div className="panel w-full p-4">
            <div className="mb-2 text-sm font-bold uppercase tracking-widest text-[hsl(var(--aether-cyan))]">{t.results.healBetween}</div>
            <div className="grid grid-cols-2 gap-3">
              <StatPatch icon={<Heart className="h-4 w-4 text-[hsl(var(--hp))]" />} label={t.results.hpRestored} from={heal.hpBefore} to={heal.hpAfter} max={100} testId="results-heal-hp" />
              <StatPatch icon={<Zap className="h-4 w-4 text-[hsl(var(--energy))]" />} label={t.results.energyRestored} from={heal.energyBefore} to={heal.energyAfter} max={100} testId="results-heal-energy" />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <GameButton testId="results-next-wave-button" onClick={onNext} className="flex-1"><Swords className="h-5 w-5" /> {t.results.nextWave}</GameButton>
            <GameButton testId="results-to-map-button" variant="secondary" onClick={() => navigate('/map')} className="flex-1"><LayoutGrid className="h-5 w-5" /> {t.results.toMap}</GameButton>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // --- EPISODE VICTORY -----------------------------------------------------
  if (last.type === 'episodeVictory') {
    const nextId = nextEpisodeId(last.episodeId);
    const onNextEp = () => {
      if (!nextId) {
        navigate('/map');
        return;
      }
      const run = newRun(nextId);
      updateProgress((p) => ({ ...p, run, battle: null, lastResult: null }));
      navigate(`/briefing/${nextId}`);
    };
    return (
      <Screen title={t.results.victory} subtitle={t.results.victorySub} back={() => navigate('/map')} testId="results-victory-screen">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
          <Trophy className="h-24 w-24 text-[hsl(var(--aether-gold))] anim-glow" />
          <div className="text-center">
            <div className="font-display text-2xl font-semibold">{episode.name}</div>
            <p className="text-sm text-[hsl(var(--text-dim))]">{episode.subtitle}</p>
          </div>
          <DidYouKnow text={episode.stemFact} />
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            {nextId ? (
              <GameButton testId="results-next-episode-button" onClick={onNextEp} className="flex-1"><Swords className="h-5 w-5" /> {t.results.nextEpisode}</GameButton>
            ) : null}
            <GameButton testId="results-to-map-button" variant="secondary" onClick={() => navigate('/map')} className="flex-1"><LayoutGrid className="h-5 w-5" /> {t.results.toMap}</GameButton>
          </div>
        </motion.div>
      </Screen>
    );
  }

  // --- DEFEAT --------------------------------------------------------------
  const onRetry = () => {
    const run = progress.run;
    if (!run) {
      navigate('/map');
      return;
    }
    const retry = { ...run, hp: run.waveStartHp, energy: run.waveStartEnergy };
    const battle = createBattle({
      episodeId: retry.episodeId,
      waveIndex: retry.waveIndex,
      characterId: retry.characterId ?? 'char_solara',
      hp: retry.hp,
      energy: retry.energy,
    });
    updateProgress((p) => ({ ...p, run: retry, battle, lastResult: null }));
    manual.clear(['B', 'C', 'D']);
    navigate('/battle');
  };
  return (
    <Screen title={t.results.defeat} subtitle={t.results.defeatSub} back={() => navigate('/map')} testId="results-defeat-screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
        <EnemyFigure enemyId={enemy.id} color={enemy.color} raging boss={enemy.boss} className="!h-[150px] !w-[150px]" />
        <div className="text-center text-sm text-[hsl(var(--text-dim))]">Episode {episode.number} - Gelombang {last.waveIndex + 1} - {enemy.name}</div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <GameButton testId="results-retry-wave-button" onClick={onRetry} className="flex-1"><RefreshCw className="h-5 w-5" /> {t.results.retryWave}</GameButton>
          <GameButton testId="results-to-title-button" variant="secondary" onClick={() => navigate('/')} className="flex-1">{t.results.toTitle}</GameButton>
        </div>
      </motion.div>
    </Screen>
  );
}

function StatPatch({ icon, label, from, to, max, testId }: { icon: React.ReactNode; label: string; from: number; to: number; max: number; testId?: string }) {
  const delta = to - from;
  return (
    <div className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] p-3" data-testid={testId}>
      <div className="mb-1 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-[hsl(var(--text-dim))]">{icon} {label}</div>
      <div className="font-mono-ui text-lg">{from} <span className="text-[hsl(var(--text-dim))]">-&gt;</span> {to}/{max}</div>
      <div className="text-xs font-semibold text-[hsl(var(--success))]">{delta > 0 ? `+${delta}` : '0'}</div>
    </div>
  );
}
