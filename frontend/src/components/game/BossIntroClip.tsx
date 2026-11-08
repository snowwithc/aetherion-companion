/**
 * BossIntroClip — short (~2.5s) cinematic "target locked" overlay for the Mission Briefing.
 * Plays at the top of the Briefing screen, sits above everything with fixed positioning,
 * then auto-dismisses by calling onDone(). Tap anywhere to skip. Respects reduced motion
 * and the user's low-graphics setting (both cases collapse to an instant reveal).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Crosshair, Heart, Skull, Swords } from 'lucide-react';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { getEnemy } from '@/engine';
import { sfx } from '@/audio/sfx';
import { t } from '@/i18n/id';
import { cn } from '@/lib/utils';

interface Props {
  enemyId: string;
  /** Total clip duration in ms (default 2500). */
  duration?: number;
  onDone: () => void;
  testId?: string;
}

export function BossIntroClip({ enemyId, duration = 2500, onDone, testId = 'boss-intro-clip' }: Props) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'acquiring' | 'locked' | 'done'>('acquiring');
  const doneRef = useRef(false);

  const enemy = useMemo(() => getEnemy(enemyId), [enemyId]);
  const bossLabel = enemy.finalBoss ? t.briefing.clip.finalBoss : t.briefing.clip.locked;
  // Threat = 3 stars by default, 4 for boss, 5 for final boss.
  const threat = enemy.finalBoss ? 5 : enemy.boss ? 4 : 3;

  // Audio cue (gracefully no-ops if sound is disabled / autoplay blocks).
  useEffect(() => {
    try { sfx('warn'); } catch {}
    const t1 = window.setTimeout(() => {
      try { sfx('enemy'); } catch {}
    }, 600);
    return () => window.clearTimeout(t1);
  }, []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('done');
    // Give the exit animation a breath before signalling parent.
    window.setTimeout(onDone, reduced ? 0 : 220);
  };

  useEffect(() => {
    if (reduced) {
      finish();
      return;
    }
    // Phase cross-fade timing
    const acquireMs = Math.max(400, Math.floor(duration * 0.35));
    const t1 = window.setTimeout(() => setPhase('locked'), acquireMs);
    const t2 = window.setTimeout(finish, duration);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, duration]);

  const onSkip = () => finish();

  const bossColor = enemy.color;

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="boss-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.22 } }}
          transition={{ duration: 0.18 }}
          onClick={onSkip}
          className="fixed inset-0 z-[90] cursor-pointer select-none"
          data-testid={testId}
          aria-label={bossLabel}
        >
          {/* Dark base */}
          <div className="absolute inset-0 bg-[hsl(var(--bg-0)/0.95)]" />
          {/* Grid sweep */}
          <div className="clip-grid absolute inset-0 pointer-events-none" />
          {/* Color aura centered behind boss, tinted to enemy color */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl clip-aura"
            style={{ backgroundColor: `${bossColor}33` }}
          />
          {/* Danger scan lines */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0 3px, hsla(0,80%,55%,0.08) 3px 4px)',
              mixBlendMode: 'screen',
            }}
          />
          {/* Diagonal "sweep" flash band */}
          <div
            aria-hidden
            className="clip-sweep pointer-events-none absolute left-0 top-0 h-full w-[40%]"
            style={{
              background: 'linear-gradient(90deg, transparent, hsla(188,92%,65%,0.28), transparent)',
            }}
          />
          {/* Vignette */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(60% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.85))' }}
          />

          {/* Content */}
          <div className="safe-top safe-bottom relative z-10 mx-auto flex h-full max-w-md flex-col items-center justify-between px-5 py-8">
            {/* Top: status chip */}
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-ui text-[10.5px] font-bold uppercase tracking-[0.22em]',
                  phase === 'acquiring'
                    ? 'border-[hsl(var(--warning)/0.6)] bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]'
                    : 'border-[hsl(var(--danger)/0.6)] bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]',
                )}
                data-testid="boss-intro-status"
              >
                <span className={cn('h-1.5 w-1.5 rounded-full briefing-signal', phase === 'acquiring' ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--danger))]')} />
                {phase === 'acquiring' ? t.briefing.clip.acquiring : bossLabel}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSkip(); }}
                className="rounded-full border border-[hsl(var(--border-c))] bg-[hsl(var(--panel)/0.7)] px-2.5 py-1 font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--text-dim))] hover:text-white"
                data-testid="boss-intro-skip-button"
              >
                {t.briefing.clip.tapToSkip}
              </button>
            </div>

            {/* Middle: boss figure + reticle */}
            <div className={cn('relative flex items-center justify-center', phase === 'locked' && !reduced ? 'clip-shake' : '')}>
              {/* Reticle */}
              <div
                aria-hidden
                className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', phase === 'acquiring' ? 'clip-reticle' : 'clip-reticle')}
              >
                <Crosshair
                  className="h-[72vmin] w-[72vmin] opacity-70"
                  style={{ color: phase === 'acquiring' ? 'hsl(var(--warning))' : bossColor, strokeWidth: 0.6 }}
                />
              </div>
              {/* Corner brackets */}
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {['tl','tr','bl','br'].map((pos) => (
                  <span
                    key={pos}
                    className={cn(
                      'absolute h-6 w-6 border-2',
                      pos === 'tl' && 'left-2 top-2 border-b-0 border-r-0',
                      pos === 'tr' && 'right-2 top-2 border-b-0 border-l-0',
                      pos === 'bl' && 'bottom-2 left-2 border-r-0 border-t-0',
                      pos === 'br' && 'bottom-2 right-2 border-l-0 border-t-0',
                    )}
                    style={{ borderColor: phase === 'acquiring' ? 'hsl(var(--warning))' : bossColor }}
                  />
                ))}
              </div>
              {/* Boss */}
              <div className="clip-boss-in relative z-10">
                <EnemyFigure
                  enemyId={enemy.id}
                  color={enemy.color}
                  boss={enemy.boss}
                  className="!h-[46vmin] !w-[46vmin] max-h-[260px] max-w-[260px]"
                  testId="boss-intro-figure"
                />
              </div>
            </div>

            {/* Bottom: name + threat panels */}
            <div className="w-full">
              <div
                className="mb-2 text-center font-display text-3xl font-semibold leading-tight text-white sm:text-4xl"
                style={{ textShadow: `0 0 18px ${bossColor}aa, 0 2px 0 rgba(0,0,0,0.4)` }}
                data-testid="boss-intro-name"
              >
                {enemy.name}
                {enemy.boss ? (
                  <span className="ml-2 align-middle">
                    <Skull className="inline h-5 w-5 text-[hsl(var(--aether-gold))]" />
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div
                  className="clip-panel-left rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel)/0.8)] p-2 text-center backdrop-blur"
                  data-testid="boss-intro-threat"
                >
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--danger))]">
                    <AlertTriangle className="h-3 w-3" /> {t.briefing.clip.threat}
                  </div>
                  <div className="mt-0.5 font-mono-ui text-sm font-bold text-white" aria-label={`threat ${threat} of 5`}>
                    {'★'.repeat(threat)}<span className="text-[hsl(var(--text-dim))]">{'★'.repeat(Math.max(0, 5 - threat))}</span>
                  </div>
                </div>
                <div
                  className="clip-panel-left rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel)/0.8)] p-2 text-center backdrop-blur"
                  style={{ animationDelay: '560ms' }}
                  data-testid="boss-intro-hp"
                >
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--success))]">
                    <Heart className="h-3 w-3" /> {t.briefing.clip.hp}
                  </div>
                  <div className="tabular mt-0.5 font-mono-ui text-sm font-bold text-white">{enemy.hp}</div>
                </div>
                <div
                  className="clip-panel-right rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel)/0.8)] p-2 text-center backdrop-blur"
                  data-testid="boss-intro-atk"
                >
                  <div className="flex items-center justify-center gap-1 text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-cyan))]">
                    <Swords className="h-3 w-3" /> {t.briefing.clip.atk}
                  </div>
                  <div className="tabular mt-0.5 font-mono-ui text-sm font-bold text-white">{enemy.basicAttack}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
