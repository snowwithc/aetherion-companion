/** Telegraphed next enemy move: icon + damage number + name, always visible before the enemy acts. */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Skull, Zap } from 'lucide-react';
import type { EnemyIntent } from '@/engine';
import { cn } from '@/lib/utils';
import { MOVE_ICON } from './icons';

export function IntentBubble({ intent, compact }: { intent: EnemyIntent; compact?: boolean }) {
  const Icon = MOVE_ICON[intent.move.icon];
  const dmg = intent.damage;
  const healing = intent.move.icon === 'heal';
  const severity = healing ? 'heal' : dmg === undefined ? 'util' : dmg >= 15 ? 'high' : dmg >= 10 ? 'mid' : 'low';
  const ring = {
    heal: 'ring-[hsl(var(--success)/0.55)]',
    util: 'ring-[hsl(var(--aether-lavender)/0.55)]',
    high: 'ring-[hsl(var(--danger)/0.7)]',
    mid: 'ring-[hsl(var(--warning)/0.6)]',
    low: 'ring-[hsl(var(--aether-cyan)/0.5)]',
  }[severity];
  const key = `${intent.move.name}-${dmg}-${intent.note}`;
  return (
    <div data-testid="enemy-intent-bubble" className={cn('rounded-2xl bg-[hsl(var(--bg-1))] px-3 py-2 ring-1', ring)}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--text-dim))]">Next move</div>
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className="flex items-center gap-2.5">
          <div className={cn('flex shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--panel-2))]', compact ? 'h-9 w-9' : 'h-11 w-11')} data-testid="enemy-intent-icon">
            <Icon className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', healing ? 'text-[hsl(var(--success))]' : severity === 'high' ? 'text-[hsl(6_90%_66%)]' : 'text-[hsl(var(--text))]')} />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              {dmg !== undefined ? (
                <span className={cn('tabular font-extrabold leading-none', compact ? 'text-2xl' : 'text-3xl', severity === 'high' ? 'text-[hsl(6_90%_66%)]' : 'text-[hsl(var(--text))]')} data-testid="enemy-intent-damage-text">
                  {dmg}
                </span>
              ) : null}
              <span className="truncate text-sm font-bold" data-testid="enemy-intent-name-text">{intent.move.name}</span>
            </div>
            {intent.move.text && !compact ? <div className="truncate text-xs text-[hsl(var(--text-dim))]">{intent.move.text}</div> : null}
          </div>
        </motion.div>
      </AnimatePresence>
      {intent.note || intent.raging ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {intent.note === 'stunned' ? <Badge icon={<Zap className="h-3 w-3" />} text="Stunned: will skip" good /> : null}
          {intent.note === 'silenced' ? <Badge icon={<Ban className="h-3 w-3" />} text="Silenced: basic attack" good /> : null}
          {intent.raging ? <Badge icon={<Skull className="h-3 w-3" />} text="Rage +5" /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Badge({ icon, text, good }: { icon: React.ReactNode; text: string; good?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', good ? 'bg-[hsl(var(--success)/0.16)] text-[hsl(142_70%_70%)]' : 'bg-[hsl(var(--danger)/0.18)] text-[hsl(6_90%_75%)]')}>
      {icon}
      {text}
    </span>
  );
}
