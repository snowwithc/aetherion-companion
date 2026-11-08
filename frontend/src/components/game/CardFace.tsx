/**
 * A card rendered with CSS 3D: front = card image, back = card_back.png.
 * Supports pointer tilt, flip and a placeholder when an image is missing.
 */
import React, { useRef, useState } from 'react';
import { cardName, cardColor } from '@/engine';
import { cn } from '@/lib/utils';
import { CARD_BACK, CARD_BACK_THUMB, cardImage, cardThumb } from './assets';

interface Props {
  cardId: string | null;
  /** Use the full-resolution PNG instead of the thumbnail. */
  hi?: boolean;
  flipped?: boolean;
  tilt?: boolean;
  className?: string;
  onClick?: () => void;
  testId?: string;
  title?: string;
}

export function CardPlaceholder({ cardId, className }: { cardId: string | null; className?: string }) {
  const color = cardId ? cardColor(cardId) : '#2a3550';
  return (
    <div
      className={cn('flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center', className)}
      style={{ background: `linear-gradient(160deg, ${color}55, #0f1626 70%)` }}
    >
      <span className="font-display text-sm font-semibold leading-tight text-white/90">{cardId ? cardName(cardId) : 'Card'}</span>
      <span className="text-[10px] uppercase tracking-widest text-white/50">art missing</span>
    </div>
  );
}

export function CardFace({ cardId, hi, flipped = false, tilt = true, className, onClick, testId, title }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [frontError, setFrontError] = useState(false);
  const [backError, setBackError] = useState(false);

  const onMove = (e: React.PointerEvent) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setRot({ x: -py * 14, y: px * 16 });
  };

  const Wrapper: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      data-testid={testId}
      title={title ?? (cardId ? cardName(cardId) : undefined)}
      onClick={onClick}
      className={cn('tilt-wrap block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] rounded-[6%/4.3%]', className)}
    >
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={() => setRot({ x: 0, y: 0 })}
        className="tilt-card card-face"
        style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}
      >
        <div className={cn('flip-inner', flipped && 'is-flipped')}>
          <div className="flip-face">
            {cardId && !frontError ? (
              <img src={hi ? cardImage(cardId) : cardThumb(cardId)} alt={cardName(cardId)} loading="lazy" draggable={false} onError={() => setFrontError(true)} />
            ) : (
              <CardPlaceholder cardId={cardId} />
            )}
          </div>
          <div className="flip-face flip-back">
            {!backError ? (
              <img src={hi ? CARD_BACK : CARD_BACK_THUMB} alt="Aetherion card back" loading="lazy" draggable={false} onError={() => setBackError(true)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--panel-2))] font-display text-xs tracking-[0.3em] text-[hsl(var(--aether-silver))]">AETHERION</div>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
