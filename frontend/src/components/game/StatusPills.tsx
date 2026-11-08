/** Small status pills (Burn 5 x2, Stun, Weaken...) with a tooltip-style title. */
import React from 'react';
import { STATUS_INFO, type Status } from '@/engine';
import { cn } from '@/lib/utils';
import { STATUS_ICON } from './icons';

interface Props {
  statuses: Status[];
  extra?: Status[];
  testId: string;
  emptyText?: string;
}

export function StatusPills({ statuses, extra = [], testId, emptyText }: Props) {
  const all = [...statuses, ...extra];
  return (
    <div className="flex min-h-[26px] flex-wrap gap-1.5" data-testid={testId}>
      {all.length === 0 && emptyText ? <span className="text-xs text-[hsl(var(--text-dim))]/70">{emptyText}</span> : null}
      {all.map((s) => {
        const info = STATUS_INFO[s.id];
        const Icon = STATUS_ICON[s.id];
        const detail =
          s.id === 'armorUp' ? `+${Math.round((s.value ?? 0) * 100)}%` : s.value !== undefined ? String(s.value) : '';
        return (
          <span
            key={s.id}
            title={`${info.name}: ${info.description}`}
            data-testid={`${testId}-${s.id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
              info.harmful
                ? 'border-[hsl(var(--danger)/0.45)] bg-[hsl(var(--danger)/0.14)] text-[hsl(6_90%_78%)]'
                : 'border-[hsl(var(--aether-cyan)/0.4)] bg-[hsl(var(--aether-cyan)/0.12)] text-[hsl(188_90%_78%)]',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {info.name}
            {detail ? <span className="tabular opacity-90">{detail}</span> : null}
            {s.turns !== undefined && s.turns > 0 ? <span className="tabular opacity-70">x{s.turns}</span> : null}
          </span>
        );
      })}
    </div>
  );
}
