/** Shared page shell: header with back button, title and an optional right-side slot. */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string | (() => void);
  right?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  testId?: string;
}

export function Screen({ title, subtitle, back, right, children, wide, testId }: Props) {
  const navigate = useNavigate();
  const onBack = () => {
    if (typeof back === 'function') back();
    else if (back) navigate(back);
  };
  return (
    <div className="aether-bg grain relative min-h-[100dvh]" data-testid={testId}>
      <header className="safe-top sticky top-0 z-30 border-b border-[hsl(var(--border-c))] bg-[hsl(var(--bg-0)/0.92)] backdrop-blur">
        <div className={cn('mx-auto flex items-center gap-3 px-4 py-3', wide ? 'max-w-6xl' : 'max-w-4xl')}>
          {back ? (
            <button type="button" onClick={onBack} className="rounded-xl border border-[hsl(var(--border-c))] bg-[hsl(var(--panel))] p-2.5 hover:bg-[hsl(var(--panel-2))]" data-testid="screen-back-button" aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-semibold leading-tight sm:text-3xl" data-testid="screen-title">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-[hsl(var(--text-dim))]">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      </header>
      <motion.main initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={cn('relative z-10 mx-auto px-4 pb-16 pt-5', wide ? 'max-w-6xl' : 'max-w-4xl')}>
        {children}
      </motion.main>
    </div>
  );
}

/** Primary / secondary buttons used across non-battle screens. */
export function GameButton({
  children, onClick, variant = 'primary', disabled, testId, className, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  testId?: string;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold transition-[filter,transform,background-color] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'primary' && 'bg-[hsl(var(--aether-cyan))] text-[hsl(222_45%_8%)] shadow-[0_14px_30px_-18px_hsl(var(--aether-cyan)/0.8)] hover:brightness-105',
        variant === 'secondary' && 'border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] text-[hsl(var(--text))] hover:brightness-110',
        variant === 'ghost' && 'text-[hsl(var(--text-dim))] hover:bg-[hsl(var(--panel))] hover:text-white',
        variant === 'danger' && 'bg-[hsl(var(--danger))] text-white hover:brightness-105',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DidYouKnow({ text, testId }: { text: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--aether-gold)/0.35)] bg-[hsl(var(--aether-gold)/0.08)] p-3" data-testid={testId}>
      <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-gold))]">Did you know?</div>
      <p className="text-sm leading-relaxed text-[hsl(var(--text))]">{text}</p>
    </div>
  );
}
