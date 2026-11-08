/** Full card detail popup used by the library. */
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/typed';
import { cardName, cardTypeOf, getActivation, getBooster, getCharacter, getScenario, attackText, elements, scenarios, activations, STATUS_INFO } from '@/engine';
import { CardShowcase } from './CardShowcase';
import { DidYouKnow } from './Screen';
import { ELEMENT_ICON, ACTIVATION_ICON } from './icons';
import { t } from '@/i18n/id';

interface Props {
  cardId: string | null;
  onClose: () => void;
}

export function CardDetailDialog({ cardId, onClose }: Props) {
  const open = !!cardId;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-[hsl(var(--border-c))] bg-[hsl(var(--bg-1))] thin-scroll" data-testid="card-detail-dialog">
        {cardId ? <CardDetailBody cardId={cardId} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CardDetailBody({ cardId }: { cardId: string }) {
  const type = cardTypeOf(cardId);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-semibold" data-testid="card-detail-title">{cardName(cardId)}</DialogTitle>
        <DialogDescription className="text-[hsl(var(--text-dim))]">{typeLabel(type)}</DialogDescription>
      </DialogHeader>
      <div className="mt-3 grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="mx-auto w-[180px]">
          <div style={{ aspectRatio: '63/88' }}>
            <CardShowcase cardId={cardId} slideIn={false} />
          </div>
        </div>
        <div className="space-y-3">
          {type === 'character' ? <CharacterBody cardId={cardId} /> : null}
          {type === 'activation' ? <ActivationBody cardId={cardId} /> : null}
          {type === 'booster' ? <BoosterBody cardId={cardId} /> : null}
          {type === 'scenario' ? <ScenarioBody cardId={cardId} /> : null}
        </div>
      </div>
    </>
  );
}

function typeLabel(type: ReturnType<typeof cardTypeOf>): string {
  switch (type) {
    case 'character': return 'Karakter';
    case 'activation': return 'Kartu Aktivasi';
    case 'booster': return 'Kartu Booster';
    case 'scenario': return 'Kartu Skenario';
    default: return '';
  }
}

function CharacterBody({ cardId }: { cardId: string }) {
  const c = getCharacter(cardId);
  const Icon = ELEMENT_ICON[c.element];
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-2 py-0.5 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
          {elements[c.element].name}
        </span>
        <span className="text-xs text-[hsl(var(--text-dim))]">{c.title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label={t.library.stat.defense} value={`${Math.round(c.defense * 100)}%`} />
        <Stat label={t.library.stat.recharge} value={`+${c.recharge} / aksi`} />
      </div>
      <div>
        <div className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-cyan))]">{t.library.stat.passive}: {c.passive.name}</div>
        <p className="text-sm text-[hsl(var(--text))]">{c.passive.text}</p>
      </div>
      <DidYouKnow text={c.stemFact} />
    </>
  );
}

function ActivationBody({ cardId }: { cardId: string }) {
  const a = getActivation(cardId);
  const Icon = ACTIVATION_ICON[a.id] ?? ELEMENT_ICON.solar;
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-2 py-0.5 text-xs font-semibold">
          <Icon className="h-3.5 w-3.5" style={{ color: a.color }} />
          Aktivasi
        </span>
      </div>
      <div className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-3">
        <div className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-cyan))]">{t.library.raw}</div>
        <p className="text-sm">{attackText(a.id, 'raw', false)}</p>
      </div>
      <div className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-3">
        <div className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-lavender))]">{t.library.energy}</div>
        <p className="text-sm">{attackText(a.id, 'energy', false)}</p>
      </div>
      <p className="text-xs text-[hsl(var(--text-dim))]">Pasangkan dengan karakter berbeda untuk membuka 5 kombinasi Fusi - lihat tab Matriks Fusi.</p>
    </>
  );
}

function BoosterBody({ cardId }: { cardId: string }) {
  const b = getBooster(cardId);
  return (
    <>
      <div className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--aether-gold)/0.5)] bg-[hsl(var(--aether-gold)/0.12)] px-2 py-0.5 text-xs font-semibold text-[hsl(42_95%_75%)]">Booster</div>
      <p className="text-sm">{b.text}</p>
      <p className="text-xs text-[hsl(var(--text-dim))]">Waktu: {b.timing === 'nextPlayerTurn' ? 'giliranmu berikutnya' : 'serangan musuh berikutnya'}.</p>
    </>
  );
}

function ScenarioBody({ cardId }: { cardId: string }) {
  const sc = getScenario(cardId);
  return (
    <>
      <div className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--aether-lavender)/0.5)] bg-[hsl(var(--aether-lavender)/0.12)] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--aether-lavender))]">Skenario</div>
      <p className="text-sm">{sc.text}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.1)] p-2">
          <div className="font-semibold text-[hsl(var(--success))]">Dikuatkan</div>
          <div className="text-[hsl(var(--text-dim))]">{sc.boosted.length ? sc.boosted.map((e) => elements[e].name).join(', ') : 'Tidak ada'}</div>
        </div>
        <div className="rounded-xl border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.1)] p-2">
          <div className="font-semibold text-[hsl(var(--danger))]">Dilemahkan</div>
          <div className="text-[hsl(var(--text-dim))]">{sc.weakened.length ? sc.weakened.map((e) => elements[e].name).join(', ') : 'Tidak ada'}</div>
        </div>
      </div>
      <DidYouKnow text={sc.stemFact} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] px-3 py-1.5">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--aether-cyan))]">{label}</div>
      <div className="font-mono-ui text-sm">{value}</div>
    </div>
  );
}

// re-exports to keep JSX imports concise
export { activations as libActivations, scenarios as libScenarios, STATUS_INFO };
