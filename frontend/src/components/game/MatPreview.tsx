/**
 * Top-down battle mat preview: the four scanned zones (A-D) plus the E/F/G draw piles.
 * In camera mode (Phase 2) this is drawn over the warped camera image.
 */
import React from 'react';
import { cardName, TYPE_FOR_ZONE, TYPE_LABEL, ZONES, type ZoneId } from '@/engine';
import type { ZoneSnapshot } from '@/detection/types';
import { cn } from '@/lib/utils';
import { CardFace } from './CardFace';
import { zoneWarning } from './ZoneStrip';

interface Props {
  snapshot: ZoneSnapshot;
  highlight?: ZoneId[];
  mini?: boolean;
  debug?: boolean;
  onZoneClick?: (z: ZoneId) => void;
}

export function MatPreview({ snapshot, highlight = [], mini, debug, onZoneClick }: Props) {
  return (
    <div
      className={cn('relative rounded-2xl border border-[hsl(var(--aether-cyan)/0.35)] bg-[hsl(223_45%_8%)]', mini ? 'p-1.5' : 'p-3 sm:p-4')}
      style={{ backgroundImage: 'linear-gradient(hsla(188,80%,60%,0.06) 1px, transparent 1px), linear-gradient(90deg, hsla(188,80%,60%,0.06) 1px, transparent 1px)', backgroundSize: mini ? '10px 10px' : '22px 22px' }}
      data-testid={mini ? 'mat-preview-mini' : 'mat-preview'}
    >
      {/* corner markers 0-3 */}
      {!mini
        ? [
            ['left-1.5 top-1.5', 0],
            ['right-1.5 top-1.5', 1],
            ['right-1.5 bottom-1.5', 2],
            ['left-1.5 bottom-1.5', 3],
          ].map(([pos, id]) => (
            <span key={id} className={cn('absolute flex h-5 w-5 items-center justify-center rounded-[4px] bg-white font-mono-ui text-[9px] font-bold text-black', pos as string)}>
              {id}
            </span>
          ))
        : null}
      <div className={cn('grid grid-cols-4', mini ? 'gap-1' : 'gap-2 px-4 sm:gap-3')}>
        {ZONES.map((z) => {
          const r = snapshot[z];
          const warn = zoneWarning(z, r.cardId);
          return (
            <button
              key={z}
              type="button"
              onClick={onZoneClick ? () => onZoneClick(z) : undefined}
              className={cn(
                'relative flex flex-col items-center rounded-xl border border-dashed text-center',
                mini ? 'gap-0.5 p-1' : 'gap-1.5 p-2',
                warn ? 'border-[hsl(var(--warning))]' : 'border-[hsl(var(--border-c))]',
                highlight.includes(z) && 'anim-pulse-ring border-solid border-[hsl(var(--aether-cyan))]',
              )}
              data-testid={`setup-zone-${z.toLowerCase()}-box`}
            >
              <span className={cn('font-extrabold tracking-widest text-[hsl(var(--aether-cyan))]', mini ? 'text-[8px]' : 'text-[11px]')}>
                {z}
                {!mini ? <span className="ml-1 font-semibold tracking-normal text-[hsl(var(--text-dim))]">{TYPE_LABEL[TYPE_FOR_ZONE[z]]}</span> : null}
              </span>
              <div className={cn('w-full', mini ? 'max-w-[26px]' : 'max-w-[86px]')}>
                {r.cardId ? <CardFace cardId={r.cardId} tilt={false} /> : <div className="aspect-[63/88] rounded-md bg-[hsl(var(--bg-1))]" />}
              </div>
              {!mini ? (
                <>
                  <span className="w-full truncate text-xs font-semibold">{r.cardId ? cardName(r.cardId) : 'empty'}</span>
                  <span className="font-mono-ui text-[10px] text-[hsl(var(--text-dim))]" data-testid={`setup-zone-${z.toLowerCase()}-confidence`}>
                    {r.cardId ? `conf ${(r.confidence * 100).toFixed(0)}%` : '-'}
                  </span>
                  {warn ? <span className="text-[10px] font-semibold text-[hsl(42_95%_70%)]">{warn}</span> : null}
                </>
              ) : debug && r.cardId ? (
                <span className="font-mono-ui text-[7px] text-[hsl(var(--aether-cyan))]">{(r.confidence * 100).toFixed(0)}%</span>
              ) : null}
              {!mini ? (
                <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                  {[10 + ZONES.indexOf(z) * 2, 11 + ZONES.indexOf(z) * 2].map((id) => (
                    <span key={id} className="rounded-[3px] bg-white px-1 font-mono-ui text-[8px] font-bold text-black">{id}</span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {!mini ? (
        <div className="mt-4 grid grid-cols-3 gap-2 px-4 sm:px-16">
          {(['E', 'F', 'G'] as const).map((p, i) => (
            <div key={p} className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-2 py-1.5 text-center">
              <div className="text-[11px] font-extrabold tracking-widest text-[hsl(var(--aether-gold))]">PILE {p}</div>
              <div className="text-[11px] text-[hsl(var(--text-dim))]">{['Activation', 'Booster', 'Scenario'][i]} deck (not scanned)</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
