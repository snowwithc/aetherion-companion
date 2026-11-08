/** Collapsible combat log - newest entry on top. */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import type { LogEntry } from '@/engine';
import { cn } from '@/lib/utils';

const TONE: Record<LogEntry['tone'], string> = {
  info: 'text-[hsl(var(--text-dim))]',
  player: 'text-[hsl(188_90%_76%)]',
  enemy: 'text-[hsl(14_90%_74%)]',
  damage: 'text-[hsl(6_90%_74%)]',
  heal: 'text-[hsl(142_70%_68%)]',
  status: 'text-[hsl(262_70%_80%)]',
  warn: 'text-[hsl(42_95%_70%)]',
  system: 'text-[hsl(var(--text))] font-semibold',
};

export function CombatLog({ log, defaultOpen = false }: { log: LogEntry[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const latest = log[log.length - 1];
  const items = [...log].reverse();
  return (
    <div className="panel overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left" data-testid="combat-log-toggle-button" aria-expanded={open}>
        <ScrollText className="h-4 w-4 shrink-0 text-[hsl(var(--aether-cyan))]" />
        <span className="text-xs font-extrabold uppercase tracking-widest text-[hsl(var(--text-dim))]">Log</span>
        <span className={cn('min-w-0 flex-1 truncate text-sm', latest ? TONE[latest.tone] : '')} data-testid="combat-log-latest-text">
          {latest?.text}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? (
        <ol className="thin-scroll max-h-[34vh] space-y-1 overflow-y-auto border-t border-[hsl(var(--border-c))] px-3 py-2" data-testid="combat-log-list">
          {items.map((e) => (
            <li key={e.id} className={cn('text-sm leading-snug', TONE[e.tone])}>
              <span className="mr-2 font-mono-ui text-[10px] text-[hsl(var(--text-dim))]/60">R{e.round}</span>
              {e.text}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
