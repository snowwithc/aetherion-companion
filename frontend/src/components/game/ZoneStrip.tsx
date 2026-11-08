/** The four scanned zones A-D: shows the detected card (or "empty") and wrong-zone warnings. */
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import { cardName, checkZone, TYPE_FOR_ZONE, TYPE_LABEL, ZONES, type ZoneId } from '@/engine';
import type { ZoneSnapshot } from '@/detection/types';
import { cn } from '@/lib/utils';
import { CardFace } from './CardFace';

interface Props {
  snapshot: ZoneSnapshot;
  highlight?: ZoneId[];
  onChipClick?: (zone: ZoneId) => void;
  compact?: boolean;
}

export function zoneWarning(zone: ZoneId, cardId: string | null): string | null {
  if (!cardId) return null;
  const c = checkZone(zone, cardId);
  return c.ok ? null : c.message;
}

export function ZoneStrip({ snapshot, highlight = [], onChipClick, compact }: Props) {
  const warnings = ZONES.map((z) => zoneWarning(z, snapshot[z].cardId)).filter(Boolean) as string[];
  return (
    <div data-testid="zone-strip">
      <div className="grid grid-cols-4 gap-2">
        {ZONES.map((zone) => {
          const reading = snapshot[zone];
          const warn = zoneWarning(zone, reading.cardId);
          const hot = highlight.includes(zone);
          return (
            <button
              key={zone}
              type="button"
              onClick={onChipClick ? () => onChipClick(zone) : undefined}
              data-testid={`zone-chip-${zone.toLowerCase()}`}
              data-card={reading.cardId ?? ''}
              className={cn(
                'relative flex min-h-[64px] items-center gap-2 rounded-2xl border bg-[hsl(var(--panel))] px-2 py-1.5 text-left transition-colors',
                reading.cardId ? 'border-[hsl(var(--border-c))]' : 'border-dashed border-[hsl(var(--border-c))]',
                warn && 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.08)]',
                hot && 'anim-pulse-ring border-[hsl(var(--aether-cyan))]',
              )}
            >
              <div className="w-8 shrink-0 sm:w-9">
                <AnimatePresence mode="popLayout">
                  {reading.cardId ? (
                    <motion.div key={reading.cardId + reading.at} initial={{ y: -24, opacity: 0, rotateZ: -8 }} animate={{ y: 0, opacity: 1, rotateZ: 0 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', stiffness: 380, damping: 24 }}>
                      <CardFace cardId={reading.cardId} tilt={false} />
                    </motion.div>
                  ) : (
                    <div className="aspect-[63/88] rounded-md border border-dashed border-[hsl(var(--border-c))] bg-[hsl(var(--bg-1))]" />
                  )}
                </AnimatePresence>
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-[hsl(var(--aether-cyan))]">
                  {zone}
                  {!compact ? <span className="ml-1 font-semibold normal-case tracking-normal text-[hsl(var(--text-dim))]">{TYPE_LABEL[TYPE_FOR_ZONE[zone]]}</span> : null}
                </div>
                <div className={cn('truncate text-xs font-semibold', reading.cardId ? 'text-[hsl(var(--text))]' : 'text-[hsl(var(--text-dim))]/70')} data-testid={`zone-chip-${zone.toLowerCase()}-name`}>
                  {reading.cardId ? cardName(reading.cardId) : 'empty'}
                </div>
              </div>
              {warn ? <TriangleAlert className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-[hsl(var(--warning))]" /> : null}
            </button>
          );
        })}
      </div>
      {warnings.length ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-[hsl(var(--warning)/0.4)] bg-[hsl(var(--warning)/0.1)] px-3 py-2 text-sm font-semibold text-[hsl(42_95%_72%)]" data-testid="zone-strip-warning-text">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {warnings.join(' · ')}
        </div>
      ) : null}
    </div>
  );
}
