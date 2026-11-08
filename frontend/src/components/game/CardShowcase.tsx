/**
 * Shows a card as a real 3D mesh (lazy three.js) or, in Low graphics mode / on any WebGL error,
 * as the lightweight CSS 3D card. The game never breaks if WebGL or an image is missing.
 */
import React, { Suspense, useState } from 'react';
import { useGame } from '@/store/GameProvider';
import { CardFace } from './CardFace';

const Card3D = React.lazy(() => import('./Card3D'));

class SafeBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* fall back silently */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const webglOk = (() => {
  let cached: boolean | null = null;
  return () => {
    if (cached !== null) return cached;
    try {
      const c = document.createElement('canvas');
      cached = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      cached = false;
    }
    return cached;
  };
})();

interface Props {
  cardId: string;
  className?: string;
  slideIn?: boolean;
  /** Allow tap-to-flip. */
  flippable?: boolean;
  startFlipped?: boolean;
  testId?: string;
}

export function CardShowcase({ cardId, className, slideIn = true, flippable = true, startFlipped = false, testId }: Props) {
  const { settings } = useGame();
  const [flipped, setFlipped] = useState(startFlipped);
  const fallback = (
    <div className="mx-auto h-full" style={{ aspectRatio: '63 / 88' }}>
      <CardFace cardId={cardId} hi flipped={flipped} tilt />
    </div>
  );
  const use3D = !settings.lowGraphics && webglOk();
  return (
    <div
      className={className}
      data-testid={testId}
      role={flippable ? 'button' : undefined}
      aria-label={flippable ? 'Tap to flip the card' : undefined}
      onClick={flippable ? () => setFlipped((f) => !f) : undefined}
    >
      {use3D ? (
        <SafeBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Card3D cardId={cardId} flipped={flipped} slideIn={slideIn} className="h-full w-full" />
          </Suspense>
        </SafeBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
