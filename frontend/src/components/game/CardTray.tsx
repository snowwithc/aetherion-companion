/**
 * Manual Simulator Card Tray: tap a card to "place" it on the mat (fires the same zone events as
 * the camera). Includes random draws from the E/F/G piles, per-zone remove and a
 * "force zone" option to simulate a misplaced card.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Shuffle, Trash2, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/typed';
import { activations, boosters, cardName, characters, scenarios, ZONES, TYPE_LABEL, ZONE_FOR_TYPE, DECK_FOR_TYPE, type CardType, type ZoneId } from '@/engine';
import { useGame } from '@/store/GameProvider';
import { useZoneSnapshot } from '@/detection/hooks';
import { sfx } from '@/audio/sfx';
import { cn } from '@/lib/utils';
import { CardFace } from './CardFace';

const TABS: CardType[] = ['character', 'activation', 'booster', 'scenario'];
const IDS: Record<CardType, string[]> = {
  character: characters.map((c) => c.id),
  activation: activations.map((a) => a.id),
  booster: boosters.map((b) => b.id),
  scenario: scenarios.map((s) => s.id),
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tab?: CardType;
  /** Card types shown as tabs (default: all). */
  types?: CardType[];
  /** Close the tray right after a card is placed. */
  closeOnPlace?: boolean;
  hint?: string;
}

export function CardTray({ open, onOpenChange, tab, types = TABS, closeOnPlace = true, hint }: Props) {
  const { manual } = useGame();
  const snapshot = useZoneSnapshot(manual);
  const [active, setActive] = useState<CardType>(tab ?? types[0]);
  const [force, setForce] = useState<ZoneId | 'auto'>('auto');

  useEffect(() => {
    if (open && tab) setActive(tab);
    if (open) setForce('auto');
  }, [open, tab]);

  const onMat = useMemo(() => new Set(ZONES.map((z) => snapshot[z].cardId).filter(Boolean) as string[]), [snapshot]);

  const place = (cardId: string) => {
    sfx('card');
    manual.place(cardId, force === 'auto' ? undefined : force);
    if (closeOnPlace) onOpenChange(false);
  };

  const randomDraw = () => {
    const pool = IDS[active].filter((id) => !onMat.has(id));
    const list = pool.length ? pool : IDS[active];
    place(list[Math.floor(Math.random() * list.length)]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[88vh] border-[hsl(var(--border-c))] bg-[hsl(var(--bg-1))]" data-testid="manual-card-tray">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 overflow-y-auto px-4 pb-6 pt-2 thin-scroll">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="font-display text-2xl font-semibold">Card Tray</DrawerTitle>
              <DrawerDescription className="text-sm text-[hsl(var(--text-dim))]">
                {hint ?? 'Manual Simulator: tap the card you placed on the mat.'}
              </DrawerDescription>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-[hsl(var(--border-c))] p-2 hover:bg-[hsl(var(--panel-2))]" data-testid="manual-card-tray-close-button" aria-label="Close tray">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* zone status + remove */}
          <div className="grid grid-cols-4 gap-2">
            {ZONES.map((z) => (
              <div key={z} className="flex items-center justify-between gap-1 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-2 py-1.5">
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold tracking-widest text-[hsl(var(--aether-cyan))]">ZONE {z}</div>
                  <div className="truncate text-xs font-semibold">{snapshot[z].cardId ? cardName(snapshot[z].cardId!) : 'empty'}</div>
                </div>
                <button
                  type="button"
                  disabled={!snapshot[z].cardId}
                  onClick={() => manual.remove(z)}
                  className="rounded-lg p-1.5 text-[hsl(var(--text-dim))] hover:bg-[hsl(var(--panel-2))] hover:text-white disabled:opacity-30"
                  data-testid={`manual-card-tray-remove-zone-${z.toLowerCase()}-button`}
                  aria-label={`Remove card from zone ${z}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* tabs */}
          <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-1" data-testid="manual-card-tray-tabs">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                data-testid={`manual-card-tray-tab-${t}`}
                className={cn('flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors', active === t ? 'bg-[hsl(var(--aether-cyan))] text-[hsl(222_45%_8%)]' : 'text-[hsl(var(--text-dim))] hover:bg-[hsl(var(--panel-2))]')}
              >
                {TYPE_LABEL[t]} <span className="opacity-70">({t === 'character' ? 'A' : `${DECK_FOR_TYPE[t as Exclude<CardType, 'character'>]}→${ZONE_FOR_TYPE[t]}`})</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {active !== 'character' ? (
              <button type="button" onClick={randomDraw} className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] px-3 py-2 text-sm font-bold hover:brightness-110" data-testid="manual-card-tray-random-draw-button">
                <Shuffle className="h-4 w-4" /> Random draw from {DECK_FOR_TYPE[active as Exclude<CardType, 'character'>]}
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-[hsl(var(--text-dim))]" data-testid="manual-card-tray-force-zone-toggle">
              <span className="mr-1">Place in:</span>
              {(['auto', ...ZONES] as const).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setForce(z)}
                  data-testid={`manual-card-tray-force-zone-${z.toLowerCase()}`}
                  className={cn('rounded-lg border px-2 py-1', force === z ? 'border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.15)] text-[hsl(42_95%_72%)]' : 'border-[hsl(var(--border-c))]')}
                  title={z === 'auto' ? 'Correct zone for the card' : `Force Zone ${z} (simulate a misplaced card)`}
                >
                  {z === 'auto' ? 'Auto' : z}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {IDS[active].map((id) => (
              <div key={id} className="relative">
                <CardFace cardId={id} onClick={() => place(id)} testId={`manual-card-tray-place-card-${id}`} />
                <div className="mt-1 truncate text-center text-xs font-semibold text-[hsl(var(--text-dim))]">{cardName(id)}</div>
                {onMat.has(id) ? <span className="absolute left-1 top-1 rounded-md bg-[hsl(var(--aether-cyan))] px-1.5 py-0.5 text-[10px] font-extrabold text-[hsl(222_45%_8%)]">ON MAT</span> : null}
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
