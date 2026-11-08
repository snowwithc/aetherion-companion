/**
 * Card Library: tabs for Character / Activation / Booster / Scenario, plus a 10x5 fusion matrix.
 * Tapping any card opens the full-detail dialog.
 */
import React, { useMemo, useState } from 'react';
import { Eye, Layers } from 'lucide-react';
import { activations, boosters, cardName, characters, elements, ELEMENT_ORDER, getFusion, scenarios, type CardType, type ElementId } from '@/engine';
import { Screen } from '@/components/game/Screen';
import { CardFace } from '@/components/game/CardFace';
import { CardDetailDialog } from '@/components/game/CardDetailDialog';
import { ELEMENT_ICON } from '@/components/game/icons';
import { cn } from '@/lib/utils';
import { t } from '@/i18n/id';

type TabId = CardType | 'fusion';

const TABS: { id: TabId; label: string }[] = [
  { id: 'character', label: t.library.tabs.character },
  { id: 'activation', label: t.library.tabs.activation },
  { id: 'booster', label: t.library.tabs.booster },
  { id: 'scenario', label: t.library.tabs.scenario },
  { id: 'fusion', label: t.library.tabs.fusion },
];

export default function LibraryPage() {
  const [tab, setTab] = useState<TabId>('character');
  const [detail, setDetail] = useState<string | null>(null);

  const ids = useMemo(() => {
    if (tab === 'character') return characters.map((c) => c.id);
    if (tab === 'activation') return activations.map((a) => a.id);
    if (tab === 'booster') return boosters.map((b) => b.id);
    if (tab === 'scenario') return scenarios.map((s) => s.id);
    return [];
  }, [tab]);

  return (
    <Screen title={t.library.title} subtitle={t.library.subtitle} back="/" wide testId="library-screen">
      <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-1" data-testid="library-tabs">
        {TABS.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setTab(it.id)}
            data-testid={`library-tab-${it.id}`}
            className={cn(
              'whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors',
              tab === it.id ? 'bg-[hsl(var(--aether-cyan))] text-[hsl(222_45%_8%)]' : 'text-[hsl(var(--text-dim))] hover:bg-[hsl(var(--panel-2))]',
            )}
          >
            {it.label}
          </button>
        ))}
      </div>

      {tab === 'fusion' ? (
        <FusionMatrix onCardClick={setDetail} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5" data-testid="library-card-grid">
          {ids.map((id) => (
            <button key={id} type="button" onClick={() => setDetail(id)} data-testid={`library-card-${id}`} className="group text-left">
              <div className="rounded-2xl p-1 transition-colors group-hover:bg-[hsl(var(--panel))]">
                <div style={{ aspectRatio: '63/88' }}>
                  <CardFace cardId={id} tilt={false} />
                </div>
                <div className="mt-1.5 truncate text-sm font-bold">{cardName(id)}</div>
                <div className="flex items-center gap-1 text-[11px] text-[hsl(var(--text-dim))]">
                  <Eye className="h-3 w-3" /> Lihat detail
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <CardDetailDialog cardId={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}

function FusionMatrix({ onCardClick }: { onCardClick: (id: string) => void }) {
  return (
    <div data-testid="library-fusion-matrix">
      <div className="mb-3 flex items-center gap-2 text-sm text-[hsl(var(--text-dim))]">
        <Layers className="h-4 w-4 text-[hsl(var(--aether-cyan))]" /> {t.library.fusionHint}
      </div>
      <div className="overflow-x-auto thin-scroll">
        <table className="min-w-full border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[hsl(var(--bg-0))] p-2 text-left text-xs font-extrabold uppercase tracking-widest text-[hsl(var(--aether-cyan))]">{t.library.tabs.activation}</th>
              {ELEMENT_ORDER.map((e: ElementId) => {
                const Icon = ELEMENT_ICON[e];
                return (
                  <th key={e} className="p-2 text-center text-[11px] font-extrabold uppercase tracking-widest text-[hsl(var(--text-dim))]">
                    <Icon className="mx-auto mb-0.5 h-4 w-4" style={{ color: elements[e].color }} />
                    {elements[e].name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activations.map((a) => (
              <tr key={a.id}>
                <th className="sticky left-0 z-10 bg-[hsl(var(--bg-0))] p-2 text-left align-top" data-testid={`library-fusion-row-${a.id}`}>
                  <button type="button" onClick={() => onCardClick(a.id)} className="w-28 text-left">
                    <div style={{ aspectRatio: '63/88' }} className="w-16">
                      <CardFace cardId={a.id} tilt={false} />
                    </div>
                    <div className="mt-1 text-xs font-bold">{a.name}</div>
                  </button>
                </th>
                {ELEMENT_ORDER.map((e: ElementId) => {
                  const character = characters.find((c) => c.element === e)!;
                  const f = getFusion(a.id, character.id);
                  return (
                    <td key={e} className="min-w-[160px] p-1 align-top">
                      <button
                        type="button"
                        onClick={() => onCardClick(character.id)}
                        className="flex h-full w-full flex-col rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-2 text-left hover:bg-[hsl(var(--panel-2))]"
                        data-testid={`library-fusion-cell-${a.id}-${e}`}
                      >
                        <span className={cn('text-xs font-bold', f.signature ? 'text-[hsl(var(--aether-gold))]' : 'text-[hsl(var(--text))]')}>
                          {f.name}{f.signature ? ' \u2605' : ''}
                        </span>
                        <span className="mt-0.5 text-[10px] text-[hsl(var(--text-dim))]">{character.name}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[hsl(var(--text-dim))]"><span className="text-[hsl(var(--aether-gold))]">\u2605</span> = Signature Fusion (bonus +5 pada efek numerik).</p>
    </div>
  );
}
