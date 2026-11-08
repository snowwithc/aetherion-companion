/**
 * Campaign Map: three episode cards with lock / completed / in-progress badges.
 * Tapping an available episode goes to Setup for the next unfinished wave.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Play, RefreshCw, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { episodes, getEnemy } from '@/engine';
import { useGame } from '@/store/GameProvider';
import { newRun } from '@/engine';
import { Screen, GameButton, DidYouKnow } from '@/components/game/Screen';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { t } from '@/i18n/id';

export default function CampaignMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { progress, updateProgress, resetProgress } = useGame();

  // If user arrives via "Game Baru", wipe the active run so we start fresh.
  React.useEffect(() => {
    const st = (location.state as { newGame?: boolean } | null) || null;
    if (st?.newGame && progress.run) {
      updateProgress((p) => ({ ...p, run: null, battle: null, lastResult: null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStartEpisode = (episodeId: string, episodeNumber: number) => {
    if (episodeNumber > progress.unlockedEpisodes) {
      toast.warning(`${t.map.locked}: selesaikan episode sebelumnya.`);
      return;
    }
    const activeRun = progress.run?.episodeId === episodeId ? progress.run : null;
    const run = activeRun ?? newRun(episodeId);
    updateProgress((p) => ({ ...p, run }));
    navigate('/setup');
  };

  const onReset = () => {
    if (window.confirm(t.map.resetConfirm)) {
      resetProgress();
      toast.success('Progres diatur ulang.');
    }
  };

  return (
    <Screen
      title={t.map.title}
      subtitle={t.map.subtitle}
      back="/"
      testId="campaign-map-screen"
      right={
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-2 text-xs font-semibold text-[hsl(var(--text-dim))] hover:text-white"
          data-testid="campaign-map-reset-button"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t.map.reset}
        </button>
      }
    >
      <div className="grid gap-4" data-testid="campaign-map-episode-list">
        {episodes.map((ep) => {
          const number = ep.number;
          const unlocked = number <= progress.unlockedEpisodes;
          const completed = progress.completedEpisodes.includes(ep.id);
          const activeHere = progress.run?.episodeId === ep.id;
          const cleared = progress.clearedWaves[ep.id] ?? 0;
          const totalWaves = ep.waves.length;
          const bossId = ep.waves[ep.waves.length - 1];
          const boss = getEnemy(bossId);

          return (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: number * 0.05 }}
              className={cn(
                'panel relative overflow-hidden p-4 sm:p-5',
                unlocked ? 'border-[hsl(var(--border-c))]' : 'opacity-70',
              )}
              data-testid={`campaign-map-episode-${ep.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <EnemyFigure enemyId={bossId} color={boss.color} boss className="!h-[110px] !w-[110px] sm:!h-[140px] sm:!w-[140px]" testId={`campaign-map-episode-${ep.id}-boss-art`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-[hsl(var(--aether-cyan))] px-1.5 py-0.5 font-mono-ui text-[11px] font-extrabold text-[hsl(222_45%_8%)]">EP {number}</span>
                    {completed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.15)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--success))]"><Trophy className="h-3 w-3" /> {t.map.completed}</span>
                    ) : null}
                    {!unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted-c))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--text-dim))]"><Lock className="h-3 w-3" /> {t.map.locked}</span>
                    ) : null}
                    {activeHere && !completed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--warning)/0.18)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--warning))]">{t.map.inProgress}</span>
                    ) : null}
                  </div>
                  <h2 className="font-display text-xl font-semibold leading-tight sm:text-2xl" data-testid={`campaign-map-episode-${ep.id}-name`}>{ep.name}</h2>
                  <p className="text-sm text-[hsl(var(--text-dim))]">{ep.subtitle}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {ep.waves.map((wid, idx) => {
                      const w = getEnemy(wid);
                      const done = idx < cleared;
                      const active = unlocked && idx === cleared;
                      return (
                        <div
                          key={`${ep.id}-${wid}-${idx}`}
                          className={cn(
                            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            done ? 'border-[hsl(var(--success)/0.5)] bg-[hsl(var(--success)/0.1)] text-[hsl(142_70%_70%)]' :
                              active ? 'border-[hsl(var(--aether-cyan)/0.5)] bg-[hsl(var(--aether-cyan)/0.1)] text-[hsl(188_90%_78%)]' :
                                'border-[hsl(var(--border-c))] text-[hsl(var(--text-dim))]',
                          )}
                          data-testid={`campaign-map-episode-${ep.id}-wave-${idx}`}
                        >
                          {done ? <CheckCircle2 className="h-3 w-3" /> : null}
                          {idx + 1}. {w.name} {w.boss ? <span className="ml-0.5 font-mono-ui text-[10px] text-[hsl(var(--aether-gold))]">({t.map.boss})</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <GameButton
                      testId={`campaign-map-episode-${ep.id}-start-button`}
                      disabled={!unlocked}
                      onClick={() => onStartEpisode(ep.id, number)}
                      variant={activeHere || unlocked ? 'primary' : 'secondary'}
                    >
                      <Play className="h-5 w-5" />
                      {completed ? t.map.replay : activeHere ? t.map.resume : t.map.start}
                    </GameButton>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <DidYouKnow text={ep.stemFact} testId={`campaign-map-episode-${ep.id}-stem-fact`} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Screen>
  );
}
