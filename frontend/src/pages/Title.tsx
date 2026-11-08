/**
 * Title screen: entry point of the app.
 * - Big wordmark and background art.
 * - New Game (go to campaign map), Continue (only if progress exists), Library, Settings.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpenText, Play, Settings as SettingsIcon, SquareLibrary } from 'lucide-react';
import { useGame } from '@/store/GameProvider';
import { hasSave } from '@/store/progress';
import { GameButton } from '@/components/game/Screen';
import { CardShowcase } from '@/components/game/CardShowcase';
import { t } from '@/i18n/id';

export default function TitlePage() {
  const navigate = useNavigate();
  const { progress } = useGame();
  const canContinue = hasSave(progress);

  return (
    <div className="aether-bg grain relative flex min-h-[100dvh] flex-col" data-testid="title-screen">
      <div className="safe-top relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-10 pt-10 sm:pt-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2">
          <span className="rounded-full border border-[hsl(var(--aether-gold)/0.4)] bg-[hsl(var(--aether-gold)/0.08)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-gold))]" data-testid="title-phase-badge">
            {t.title.phase1Badge}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="wordmark mt-6 text-5xl font-bold uppercase leading-none sm:text-7xl"
          data-testid="title-wordmark"
        >
          {t.common.appName}
        </motion.h1>
        <p className="mt-2 max-w-lg text-sm text-[hsl(var(--text-dim))] sm:text-base" data-testid="title-subtitle">
          {t.title.subtitle}
        </p>

        <div className="mt-8 flex flex-col-reverse gap-8 sm:mt-10 sm:flex-row sm:items-center">
          <div className="flex max-w-md flex-1 flex-col gap-3">
            {canContinue ? (
              <GameButton testId="title-continue-button" onClick={() => navigate('/map')}>
                <Play className="h-5 w-5" />
                {t.title.continue}
              </GameButton>
            ) : null}
            <GameButton
              testId="title-new-game-button"
              variant={canContinue ? 'secondary' : 'primary'}
              onClick={() => navigate('/map', { state: { newGame: true } })}
            >
              <Play className="h-5 w-5" />
              {t.title.newGame}
            </GameButton>
            <div className="grid grid-cols-2 gap-3">
              <GameButton testId="title-library-button" variant="ghost" onClick={() => navigate('/library')}>
                <BookOpenText className="h-5 w-5" />
                {t.title.library}
              </GameButton>
              <GameButton testId="title-settings-button" variant="ghost" onClick={() => navigate('/settings')}>
                <SettingsIcon className="h-5 w-5" />
                {t.title.settings}
              </GameButton>
            </div>
          </div>
          <div className="relative mx-auto w-[180px] sm:w-[220px]" data-testid="title-card-showcase">
            <div style={{ aspectRatio: '63/88' }}>
              <CardShowcase cardId="char_solara" />
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--text-dim))]/60">
          <SquareLibrary className="mb-1 inline h-3 w-3" /> {t.common.appTagline}
        </div>
      </div>
    </div>
  );
}
