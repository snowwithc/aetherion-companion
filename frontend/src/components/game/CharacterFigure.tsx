/**
 * Battle figure for the player's character.
 * Default: the art cropped from the user's character card, shown as a 2.5D portrait
 * (soft mask, element glow, idle bob, pointer parallax, attack lunge, hit flash).
 * If /assets/models/<id>.glb exists (and Low graphics is off) the 3D model is used instead.
 */
import React, { Suspense, useEffect, useRef, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { elements, getActivation, getCharacter } from '@/engine';
import { assetExists } from '@/detection/LiveCameraDetector';
import { useGame } from '@/store/GameProvider';
import { cn } from '@/lib/utils';
import { characterArt, characterModel } from './assets';
import { ELEMENT_ICON } from './icons';

const CharacterModel3D = React.lazy(() => import('./CharacterModel3D'));
const modelCache = new Map<string, Promise<boolean>>();
const hasModel = (id: string) => {
  if (!modelCache.has(id)) modelCache.set(id, assetExists(characterModel(id)));
  return modelCache.get(id)!;
};

class ModelBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface Props {
  characterId: string;
  fusionActivationId?: string | null;
  lungeKey?: number;
  hitKey?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  testId?: string;
}

export function CharacterFigure({ characterId, fusionActivationId, lungeKey = 0, hitKey = 0, size = 'md', className, testId }: Props) {
  const { settings } = useGame();
  const char = getCharacter(characterId);
  const color = elements[char.element].color;
  const fusionColor = fusionActivationId ? getActivation(fusionActivationId).color : null;
  const Icon = ELEMENT_ICON[char.element];
  const controls = useAnimationControls();
  const [flash, setFlash] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [model, setModel] = useState(false);
  const [imgError, setImgError] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setModel(false);
    if (!settings.lowGraphics) hasModel(characterId).then((ok) => alive && setModel(ok));
    return () => {
      alive = false;
    };
  }, [characterId, settings.lowGraphics]);

  useEffect(() => {
    if (!lungeKey) return;
    void controls.start({ x: [0, 26, -4, 0], y: [0, -16, 0, 0], rotate: [0, 3, 0, 0], transition: { duration: 0.5, ease: 'easeOut' } });
  }, [lungeKey, controls]);

  useEffect(() => {
    if (!hitKey) return;
    setFlash((f) => f + 1);
    void controls.start({ x: [0, -8, 7, -4, 0], transition: { duration: 0.35 } });
  }, [hitKey, controls]);

  const onMove = (e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    setParallax({ x: ((e.clientX - r.left) / r.width - 0.5) * 10, y: ((e.clientY - r.top) / r.height - 0.5) * 8 });
  };

  const dims = size === 'lg' ? 'w-[200px] h-[210px] sm:w-[240px] sm:h-[250px]' : size === 'sm' ? 'w-[112px] h-[118px]' : 'w-[150px] h-[158px] sm:w-[190px] sm:h-[200px]';
  const portrait = (
    <div className="portrait-mask absolute inset-0">
      {!imgError ? (
        <img
          src={characterArt(characterId)}
          alt={char.name}
          draggable={false}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition-transform duration-300 ease-out"
          style={{ transform: `scale(1.08) translate(${parallax.x}px, ${parallax.y}px)` }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" style={{ background: `radial-gradient(circle at 50% 40%, ${color}66, #0b1222 70%)` }}>
          <Icon className="h-16 w-16 text-white/80" />
        </div>
      )}
    </div>
  );

  return (
    <div ref={boxRef} onPointerMove={onMove} onPointerLeave={() => setParallax({ x: 0, y: 0 })} className={cn('relative select-none', dims, className)} data-testid={testId}>
      {/* element glow */}
      <div
        className="anim-glow absolute -inset-3 rounded-[36px] blur-2xl"
        style={{ background: `radial-gradient(circle at 50% 45%, ${fusionColor ?? color}AA, transparent 65%)` }}
      />
      <motion.div animate={controls} className="relative h-full w-full">
        <div className="anim-bob relative h-full w-full">
        <div className="anim-breathe relative h-full w-full">
          {model ? (
            <ModelBoundary fallback={portrait}>
              <Suspense fallback={portrait}>
                <div className="absolute inset-0">
                  <CharacterModel3D characterId={characterId} />
                </div>
              </Suspense>
            </ModelBoundary>
          ) : (
            portrait
          )}
          {/* fusion ring */}
          {fusionColor ? (
            <div className="pointer-events-none absolute inset-2 rounded-[30px] border-2 anim-glow" style={{ borderColor: `${fusionColor}CC`, boxShadow: `0 0 24px ${fusionColor}88, inset 0 0 18px ${fusionColor}55` }} />
          ) : null}
          {/* hit flash */}
          <motion.div
            key={flash}
            initial={{ opacity: flash ? 0.75 : 0 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none absolute inset-0 rounded-[30px] bg-white mix-blend-overlay"
          />
        </div>
        </div>
      </motion.div>
      {/* element badge (sits where the card's empty hexagon slot is) */}
      <div
        className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-xl border-2 shadow-lg"
        style={{ borderColor: color, background: '#0b1324', boxShadow: `0 0 14px ${color}88` }}
        title={elements[char.element].name}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
    </div>
  );
}
