/** HP / Energy bar with a smooth fill transition. */
import React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: number;
  max: number;
  kind: 'hp' | 'energy' | 'enemy';
  label?: React.ReactNode;
  testId?: string;
  compact?: boolean;
}

export function StatBar({ value, max, kind, label, testId, compact }: Props) {
  const pctValue = Math.max(0, Math.min(100, (value / max) * 100));
  const low = kind !== 'energy' && pctValue < 25;
  const fill =
    kind === 'energy'
      ? 'bg-[hsl(var(--energy))] shadow-[0_0_14px_-2px_hsl(var(--energy)/0.7)]'
      : low
        ? 'bg-[hsl(var(--hp-low))] animate-pulse'
        : kind === 'enemy'
          ? 'bg-[hsl(6_78%_56%)] shadow-[0_0_14px_-4px_hsl(6_82%_54%/0.7)]'
          : 'bg-[hsl(var(--hp))] shadow-[0_0_14px_-4px_hsl(var(--hp)/0.7)]';
  return (
    <div className="w-full" data-testid={testId}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs font-semibold text-[hsl(var(--text-dim))]">
        <span className="uppercase tracking-wider">{label ?? (kind === 'energy' ? 'Energy' : 'HP')}</span>
        <span className={cn('tabular text-[hsl(var(--text))]', compact ? 'text-sm' : 'text-base')} data-testid={testId ? `${testId}-value` : undefined}>
          {value}
          <span className="text-[hsl(var(--text-dim))]">/{max}</span>
        </span>
      </div>
      <div className={cn('overflow-hidden rounded-full bg-[hsl(var(--muted-c))]', compact ? 'h-2.5' : 'h-3')}>
        <div className={cn('bar-shine h-full rounded-full transition-[width] duration-500 ease-out', fill)} style={{ width: `${pctValue}%` }} />
      </div>
    </div>
  );
}
