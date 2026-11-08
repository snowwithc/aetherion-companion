/**
 * Enemy figure: uses /assets/enemies/<id>.png when present, otherwise the built-in SVG.
 * Animations: idle float, lunge toward the player, hit shake + flash, defeat fade.
 */
import React, { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { assetExists } from '@/detection/LiveCameraDetector';
import { cn } from '@/lib/utils';
import { enemyArt } from './assets';
import { EnemyArtSvg } from './EnemyArt';

const pngCache = new Map<string, Promise<boolean>>();
const hasPng = (id: string) => {
  if (!pngCache.has(id)) pngCache.set(id, assetExists(enemyArt(id)));
  return pngCache.get(id)!;
};

interface Props {
  enemyId: string;
  color: string;
  lungeKey?: number;
  hitKey?: number;
  defeated?: boolean;
  raging?: boolean;
  boss?: boolean;
  className?: string;
  testId?: string;
}

export function EnemyFigure({ enemyId, color, lungeKey = 0, hitKey = 0, defeated, raging, boss, className, testId }: Props) {
  const controls = useAnimationControls();
  const [png, setPng] = useState(false);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    let alive = true;
    setPng(false);
    hasPng(enemyId).then((ok) => alive && setPng(ok));
    return () => {
      alive = false;
    };
  }, [enemyId]);

  useEffect(() => {
    if (!lungeKey) return;
    void controls.start({ x: [0, -30, 4, 0], y: [0, 14, 0, 0], scale: [1, 1.06, 1, 1], transition: { duration: 0.5, ease: 'easeOut' } });
  }, [lungeKey, controls]);

  useEffect(() => {
    if (!hitKey) return;
    setFlash((f) => f + 1);
    void controls.start({ x: [0, 10, -8, 5, 0], transition: { duration: 0.35 } });
  }, [hitKey, controls]);

  return (
    <div className={cn('relative select-none', boss ? 'h-[150px] w-[150px] sm:h-[190px] sm:w-[190px]' : 'h-[130px] w-[130px] sm:h-[165px] sm:w-[165px]', className)} data-testid={testId}>
      <div className="anim-glow absolute inset-2 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${raging ? '#ff3b2b' : color}88, transparent 70%)` }} />
      <motion.div animate={controls} className="relative h-full w-full">
        <motion.div
          animate={defeated ? { opacity: 0, scale: 0.6, y: 20, filter: 'grayscale(1)' } : { opacity: 1, scale: 1, y: 0, filter: 'grayscale(0)' }}
          transition={{ duration: 0.8 }}
          className="relative h-full w-full"
        >
          <div className="anim-float relative h-full w-full">
          {png ? (
            <img src={enemyArt(enemyId)} alt={enemyId} className="h-full w-full object-contain" draggable={false} onError={() => setPng(false)} />
          ) : (
            <EnemyArtSvg enemyId={enemyId} raging={raging} />
          )}
          </div>
          <motion.div
            key={flash}
            initial={{ opacity: flash ? 0.7 : 0 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-[18%] rounded-full bg-white blur-md"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
