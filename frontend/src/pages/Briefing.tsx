/**
 * Mission Briefing screen - cinematic sci-fi "incoming transmission" intro
 * played every time an episode is started. Pure presentation, no engine state
 * changes; CTA buttons simply navigate to /setup (Siap / Lewati) or /map.
 *
 * All UI copy is sourced from src/i18n/id.ts (Bahasa Indonesia).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ChevronRight, Loader2, Radio, Rocket, Skull, SkipForward, Sparkles, Target } from 'lucide-react';
import { episodes, getEnemy, getEpisode } from '@/engine';
import { EnemyFigure } from '@/components/game/EnemyFigure';
import { GameButton } from '@/components/game/Screen';
import { useGame } from '@/store/GameProvider';
import { t } from '@/i18n/id';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/** Typewriter: reveals `text` char by char. When done, calls onDone once. */
function Typewriter({
  text,
  speed = 18,
  startDelay = 0,
  onDone,
  className,
  caret = true,
  testId,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  onDone?: () => void;
  className?: string;
  caret?: boolean;
  testId?: string;
}) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);
  const doneRef = React.useRef(false);
  useEffect(() => {
    doneRef.current = false;
    if (reduced) {
      setCount(text.length);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    setCount(0);
    let intervalId: number | undefined;
    const startTimer = window.setTimeout(() => {
      let i = 0;
      intervalId = window.setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          if (intervalId !== undefined) window.clearInterval(intervalId);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone?.();
          }
        }
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(startTimer);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay, reduced]);
  const done = count >= text.length;
  return (
    <span className={className} data-testid={testId}>
      {text.slice(0, count)}
      {caret && !done ? <span className="briefing-caret text-[hsl(var(--aether-cyan))]">▌</span> : null}
    </span>
  );
}

export default function BriefingPage() {
  const navigate = useNavigate();
  const params = useParams<{ episodeId: string }>();
  const { progress } = useGame();
  const reduced = useReducedMotion();

  const episodeId = params.episodeId ?? progress.run?.episodeId ?? episodes[0].id;
  const ep = useMemo(() => {
    try {
      return getEpisode(episodeId);
    } catch {
      return null;
    }
  }, [episodeId]);

  // Lock check: without a valid run matching the episode (or if locked), bounce to map.
  useEffect(() => {
    if (!ep) {
      toast.error('Episode tidak ditemukan.');
      navigate('/map', { replace: true });
      return;
    }
    if (ep.number > progress.unlockedEpisodes) {
      toast.warning(t.briefing.locked);
      navigate('/map', { replace: true });
      return;
    }
    if (!progress.run) {
      toast.info('Pilih episode terlebih dahulu.');
      navigate('/map', { replace: true });
    }
  }, [ep, progress.unlockedEpisodes, progress.run, navigate]);

  // Stage reveal: 0 = header, 1 = episode glyph, 2 = codename+intro, 3 = objective+target+route, 4 = science+tactic, 5 = CTAs
  const [stage, setStage] = useState(0);
  const [headerDone, setHeaderDone] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [objectiveDone, setObjectiveDone] = useState(false);

  useEffect(() => {
    if (reduced) {
      setStage(5);
      setHeaderDone(true);
      setIntroDone(true);
      setObjectiveDone(true);
    }
  }, [reduced]);

  // Advance stage from header once its typewriter finishes.
  useEffect(() => {
    if (stage === 0 && headerDone) setStage(1);
  }, [stage, headerDone]);

  // Stage 1 → stage 2 after short beat (episode glyph reveal).
  useEffect(() => {
    if (stage !== 1) return;
    const id = window.setTimeout(() => setStage(2), 450);
    return () => window.clearTimeout(id);
  }, [stage]);

  // Stage 2 → 3 after intro typewriter.
  useEffect(() => {
    if (stage === 2 && introDone) {
      const id = window.setTimeout(() => setStage(3), 180);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [stage, introDone]);

  // Stage 3 → 4 after objective typewriter.
  useEffect(() => {
    if (stage === 3 && objectiveDone) {
      const id = window.setTimeout(() => setStage(4), 220);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [stage, objectiveDone]);

  // Stage 4 → 5 after short beat for science+tactic to breathe.
  useEffect(() => {
    if (stage !== 4) return;
    const id = window.setTimeout(() => setStage(5), 750);
    return () => window.clearTimeout(id);
  }, [stage]);

  if (!ep) return null;

  // Default briefing content (fallback if JSON doesn't include a briefing block)
  const briefing = ep.briefing ?? {
    codename: `OPERASI ${ep.name.toUpperCase()}`,
    intro: ep.subtitle,
    objective: 'Selesaikan tiga gelombang dan kalahkan bos episode.',
    tacticTip: 'Pakai kombinasi Fusi dan Booster untuk memaksimalkan serangan.',
  };

  const bossId = ep.waves[ep.waves.length - 1];
  const boss = getEnemy(bossId);

  const skip = () => navigate('/setup');
  const go = () => navigate('/setup');
  const toMap = () => navigate('/map');

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return (
    <div className="aether-bg grain briefing-crt relative min-h-[100dvh] overflow-hidden" data-testid={`briefing-screen-${ep.id}`}>
      {/* Faint grid + beams for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(1200px 300px at 50% -5%, hsla(188,92%,52%,0.22), transparent 60%),radial-gradient(1000px 260px at 50% 110%, hsla(42,92%,56%,0.14), transparent 60%)',
        }}
      />

      {/* Top status bar */}
      <header className="safe-top relative z-20 border-b border-[hsl(var(--border-c))] bg-[hsl(var(--bg-0)/0.72)] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-mono-ui tracking-[0.18em] text-[hsl(var(--text-dim))]">
            <span className="briefing-signal inline-block h-2 w-2 rounded-full bg-[hsl(var(--danger))]" />
            <span className="hidden text-[hsl(var(--text))] sm:inline">{t.briefing.channel}</span>
            <span className="text-[hsl(var(--aether-cyan))]">AETH-{ep.number.toString().padStart(2, '0')}</span>
            <span className="hidden sm:inline">· {t.briefing.priority}</span>
            <span className="hidden text-[hsl(var(--danger))] sm:inline">{t.briefing.high}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono-ui tracking-[0.18em] text-[hsl(var(--text-dim))]">
            <span className="hidden sm:inline">{t.briefing.status}</span>
            <span className="rounded-md bg-[hsl(var(--danger)/0.18)] px-1.5 py-0.5 text-[hsl(var(--danger))]">{t.briefing.live}</span>
            <span className="tabular hidden sm:inline">{timestamp}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 pb-28 pt-5">
        {/* Transmission header */}
        <div className="flex items-start gap-3" data-testid="briefing-transmission-header">
          <div className="mt-1 rounded-xl border border-[hsl(var(--aether-cyan)/0.5)] bg-[hsl(var(--aether-cyan)/0.08)] p-2 text-[hsl(var(--aether-cyan))]">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--text-dim))]">{t.briefing.decoded}</div>
            <div className="font-display text-xl font-semibold leading-tight text-[hsl(var(--aether-cyan))] sm:text-2xl">
              <Typewriter
                text={t.briefing.transmission}
                speed={22}
                onDone={() => setHeaderDone(true)}
                testId="briefing-transmission-text"
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono-ui uppercase tracking-[0.14em] text-[hsl(var(--text-dim))]">
              <span className="briefing-chip" data-testid="briefing-operator"><span className="dot" />{t.briefing.operator}: {t.briefing.operatorName}</span>
              <span className="briefing-chip" data-testid="briefing-classified">{t.briefing.classified}</span>
            </div>
          </div>
        </div>

        {/* Episode glyph */}
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              key="ep-glyph"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mt-6 flex items-center gap-4"
              data-testid="briefing-episode-glyph"
            >
              <div className="relative shrink-0">
                <div className="briefing-ep-glyph text-6xl leading-none text-white sm:text-7xl" data-testid={`briefing-episode-number-${ep.id}`}>
                  {String(ep.number).padStart(2, '0')}
                </div>
                <div className="briefing-boot absolute inset-0 border-b-2 border-[hsl(var(--aether-cyan))]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[hsl(var(--aether-cyan))]">{t.briefing.episode} {ep.number}</div>
                <h1 className="font-display text-2xl font-semibold leading-tight text-white sm:text-3xl" data-testid={`briefing-episode-name-${ep.id}`}>{ep.name}</h1>
                <p className="mt-0.5 text-sm italic text-[hsl(var(--text-dim))]">{ep.subtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Codename + intro narrative */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.section
              key="codename"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="panel relative mt-5 overflow-hidden p-4 sm:p-5"
              data-testid="briefing-codename-panel"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[hsl(var(--aether-cyan)/0.08)] blur-2xl" />
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--aether-cyan))]">
                <Sparkles className="h-3.5 w-3.5" />
                {t.briefing.codename}
              </div>
              <div className="mt-1 font-mono-ui text-lg font-bold tracking-[0.12em] text-white sm:text-xl" data-testid="briefing-codename-text">
                {briefing.codename}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--text))] sm:text-base" data-testid="briefing-intro-text">
                <Typewriter text={briefing.intro} speed={14} onDone={() => setIntroDone(true)} caret={stage === 2} />
              </p>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Target + Wave route + Objective */}
        <AnimatePresence>
          {stage >= 3 && (
            <motion.section
              key="target"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]"
              data-testid="briefing-target-section"
            >
              <div className="panel p-4 sm:p-5">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--warning))]">
                  <Target className="h-3.5 w-3.5" />
                  {t.briefing.objective}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--text))] sm:text-base" data-testid="briefing-objective-text">
                  <Typewriter text={briefing.objective} speed={14} onDone={() => setObjectiveDone(true)} caret={stage === 3} />
                </p>
                <div className="mt-4">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--text-dim))]">{t.briefing.route}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-testid="briefing-wave-route">
                    {ep.waves.map((wid, idx) => {
                      const w = getEnemy(wid);
                      const isBoss = idx === ep.waves.length - 1;
                      return (
                        <React.Fragment key={`${ep.id}-route-${idx}`}>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                              isBoss
                                ? 'border-[hsl(var(--aether-gold)/0.6)] bg-[hsl(var(--aether-gold)/0.12)] text-[hsl(var(--aether-gold))]'
                                : 'border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] text-[hsl(var(--text))]',
                            )}
                            data-testid={`briefing-wave-${idx}`}
                          >
                            {isBoss ? <Skull className="h-3 w-3" /> : null}
                            <span className="font-mono-ui">{idx + 1}</span>
                            <span className="truncate">{w.name}</span>
                          </span>
                          {idx < ep.waves.length - 1 ? (
                            <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--text-dim))]" />
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Boss target card */}
              <div className="panel relative overflow-hidden p-3 sm:p-4" data-testid="briefing-boss-target">
                <div className="pointer-events-none absolute inset-0 opacity-70" style={{
                  background: `radial-gradient(180px 160px at 50% 65%, ${boss.color}33, transparent 70%)`,
                }} />
                <div className="relative z-10 flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--danger))]">
                  <AlertTriangle className="h-3 w-3" /> {t.briefing.target}
                </div>
                <div className="relative z-10 mt-1 flex items-center justify-center">
                  <EnemyFigure enemyId={boss.id} color={boss.color} boss={boss.boss} className="!h-[120px] !w-[120px]" testId="briefing-boss-art" />
                </div>
                <div className="relative z-10 mt-2 text-center">
                  <div className="font-display text-base font-semibold leading-tight text-white" data-testid="briefing-boss-name">{boss.name}</div>
                  <div className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--aether-gold))]">{t.briefing.boss}</div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Science + Tactic */}
        <AnimatePresence>
          {stage >= 4 && (
            <motion.section
              key="science"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 grid gap-4 sm:grid-cols-2"
              data-testid="briefing-science-section"
            >
              <div className="panel p-4 sm:p-5" data-testid="briefing-stem-panel">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--aether-cyan))]">
                  <Rocket className="h-3.5 w-3.5" />
                  {t.briefing.science}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--text))]" data-testid="briefing-stem-text">{ep.stemFact}</p>
              </div>
              <div className="panel p-4 sm:p-5" data-testid="briefing-tactic-panel">
                <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[hsl(var(--aether-gold))]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.briefing.tactic}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--text))]" data-testid="briefing-tactic-text">{briefing.tacticTip}</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Decoding indicator while stages are still revealing */}
        {stage < 5 && (
          <div className="mt-6 flex items-center gap-2 text-[11px] font-mono-ui tracking-[0.2em] text-[hsl(var(--text-dim))]" data-testid="briefing-loading-indicator">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.briefing.scrolling}
          </div>
        )}
      </main>

      {/* Sticky CTA bar */}
      <AnimatePresence>
        {stage >= 2 && (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[hsl(var(--border-c))] bg-[hsl(var(--bg-0)/0.9)] backdrop-blur"
          >
            <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={toMap}
                className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 text-xs font-semibold text-[hsl(var(--text-dim))] hover:text-white"
                data-testid="briefing-to-map-button"
              >
                {t.briefing.toMap}
              </button>
              <button
                type="button"
                onClick={skip}
                className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] px-3 text-xs font-bold text-[hsl(var(--text))] hover:brightness-110"
                data-testid="briefing-skip-button"
              >
                <SkipForward className="h-3.5 w-3.5" />
                {t.briefing.skip}
              </button>
              <div className="flex-1" />
              <GameButton
                testId="briefing-start-button"
                onClick={go}
                className="min-w-[60%] sm:min-w-[260px]"
              >
                <Rocket className="h-5 w-5" />
                {t.briefing.ready}
              </GameButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
