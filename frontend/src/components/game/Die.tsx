/** A CSS 3D six-sided die that tumbles and lands on `value`. */
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Rotation that shows each face to the viewer. */
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

const FACE_TRANSFORM = (n: number, half: number) => {
  switch (n) {
    case 1: return `rotateY(0deg) translateZ(${half}px)`;
    case 2: return `rotateY(90deg) translateZ(${half}px)`;
    case 3: return `rotateX(90deg) translateZ(${half}px)`;
    case 4: return `rotateX(-90deg) translateZ(${half}px)`;
    case 5: return `rotateY(-90deg) translateZ(${half}px)`;
    default: return `rotateY(180deg) translateZ(${half}px)`;
  }
};

interface Props {
  value: number;
  size?: number;
  rolling?: boolean;
  rollKey?: string | number;
  className?: string;
  testId?: string;
}

export function Die({ value, size = 84, rollKey, className, testId }: Props) {
  const half = size / 2;
  const target = FACE_ROT[value] ?? FACE_ROT[1];
  return (
    <div className={cn('die-scene', className)} style={{ width: size, height: size }} data-testid={testId} data-value={value}>
      <motion.div
        key={rollKey}
        className="die-cube"
        initial={{ rotateX: target.x + 720 + 45, rotateY: target.y + 540 + 30, y: -18 }}
        animate={{ rotateX: target.x, rotateY: target.y, y: 0 }}
        transition={{ duration: 0.95, ease: [0.2, 0.9, 0.25, 1] }}
      >
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="die-face" style={{ transform: FACE_TRANSFORM(n, half) }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className={cn(PIPS[n].includes(i) ? 'die-pip' : '', n === 1 && PIPS[n].includes(i) && 'red')} />
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
