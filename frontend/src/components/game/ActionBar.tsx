/** Big touch-friendly action buttons with Energy cost badges and damage previews. */
import React from 'react';
import { BatteryCharging, Layers, Sparkles, Swords } from 'lucide-react';
import type { ActionInfo, PlayerActionKind } from '@/engine';
import { cn } from '@/lib/utils';
import { ACTIVATION_ICON } from './icons';

interface Props {
  actions: ActionInfo[];
  onAction: (kind: PlayerActionKind) => void;
  fusionActivationId?: string | null;
  fusionColor?: string | null;
}

const LABEL: Record<PlayerActionKind, string> = {
  attack: 'Attack',
  actionCard: 'Action Card',
  recharge: 'Recharge',
  raw: 'Raw Attack',
  energy: 'Energy Attack',
};

const TESTID: Record<PlayerActionKind, string> = {
  attack: 'battle-attack-button',
  actionCard: 'battle-action-card-button',
  recharge: 'battle-recharge-button',
  raw: 'battle-raw-attack-button',
  energy: 'battle-energy-attack-button',
};

export function ActionBar({ actions, onAction, fusionActivationId, fusionColor }: Props) {
  const get = (k: PlayerActionKind) => actions.find((a) => a.kind === k)!;
  const fused = get('raw').visible;
  const FusionIcon = fusionActivationId ? ACTIVATION_ICON[fusionActivationId] ?? Sparkles : Sparkles;

  const Btn = ({ kind, icon, variant }: { kind: PlayerActionKind; icon: React.ReactNode; variant: 'primary' | 'secondary' | 'fusion' }) => {
    const a = get(kind);
    return (
      <button
        type="button"
        disabled={!a.enabled}
        onClick={() => onAction(kind)}
        data-testid={TESTID[kind]}
        title={a.reason}
        className={cn(
          'relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center font-bold transition-[filter,transform,background-color] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45',
          variant === 'primary' && 'bg-[hsl(var(--aether-cyan))] text-[hsl(222_45%_8%)] shadow-[0_14px_30px_-18px_hsl(var(--aether-cyan)/0.8)] hover:brightness-105',
          variant === 'secondary' && 'border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] text-[hsl(var(--text))] hover:brightness-110',
          variant === 'fusion' && 'border text-white hover:brightness-110',
        )}
        style={variant === 'fusion' ? { background: `${fusionColor ?? '#8B4FE0'}33`, borderColor: `${fusionColor ?? '#8B4FE0'}AA` } : undefined}
      >
        <span className="flex items-center gap-1.5 text-[15px]">
          {icon}
          {LABEL[kind]}
        </span>
        <span className={cn('text-[11px] font-semibold', variant === 'primary' ? 'text-[hsl(222_45%_14%)]' : 'text-[hsl(var(--text-dim))]')}>
          {kind === 'recharge' ? 'restore Energy' : `${a.cost} Energy`}
          {a.preview !== undefined ? ` · ~${a.preview} dmg` : ''}
        </span>
        {!a.enabled && a.reason && a.reason !== 'Wait for your turn' ? (
          <span className="absolute -top-2 right-2 rounded-full border border-[hsl(var(--border-c))] bg-[hsl(var(--bg-0))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--text-dim))]">{a.reason}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2" data-testid="battle-action-bar">
      {fused ? (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="raw" icon={<FusionIcon className="h-4 w-4" />} variant="fusion" />
          <Btn kind="energy" icon={<Sparkles className="h-4 w-4" />} variant="fusion" />
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        <Btn kind="attack" icon={<Swords className="h-4 w-4" />} variant="primary" />
        <Btn kind="actionCard" icon={<Layers className="h-4 w-4" />} variant="secondary" />
        <Btn kind="recharge" icon={<BatteryCharging className="h-4 w-4" />} variant="secondary" />
      </div>
    </div>
  );
}
