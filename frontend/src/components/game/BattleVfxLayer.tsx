/**
 * BattleVfxLayer - 2D attack / ability animations overlay.
 *
 * Fixed-position overlay (pointer-events: none) that sits above the battle
 * panels and renders travelling / impact / self-aura VFX for every action
 * that goes through the engine:
 *
 *   Player "attack"      → slash across the enemy
 *   Player "raw"         → impact burst on the enemy
 *   Player "energy"      → energy beam projectile travelling to enemy
 *   Player fusion lunge  → fusion nova (color = fusion/activation color)
 *   Player "recharge"    → recharge sparkle on the player
 *   Dodge                → swish on the dodging figure
 *   Heal                 → heal sparkles on the healed figure
 *   Enemy "attack"/"slam"→ slash / slam on the player
 *   Enemy "poison"       → poison drip on the player
 *   Enemy "burn"         → fire rising on the player
 *   Enemy "stun"         → orbiting stars on the player
 *   Enemy "weaken"       → downward dark wisp on the player
 *   Enemy "shield"       → hex shield around the enemy
 *   Enemy "drain"        → tether from player to enemy
 *   Status event         → generic status pulse on the target
 *
 * Positions are computed on the fly from the attacker/target refs; the
 * component also listens to window resize so hot-plug layouts still work.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Side } from '@/engine';
import { useGame } from '@/store/GameProvider';

export type VfxKind =
  | 'slash'
  | 'raw'
  | 'beam'
  | 'fusion'
  | 'heal'
  | 'recharge'
  | 'poison'
  | 'burn'
  | 'shield'
  | 'stun'
  | 'weaken'
  | 'drain'
  | 'slam'
  | 'dodge'
  | 'status';

/** Which figure does the VFX originate from (attacker) vs land on (target). */
export interface VfxItem {
  id: number;
  kind: VfxKind;
  /** Who initiated the action (affects direction). */
  attacker: Side;
  /** Who the VFX lands on. Defaults to opposite side (or same side for self-FX). */
  target?: Side;
  /** Optional accent color override (fusion / element / status). */
  color?: string;
  /** Lifetime in ms (default per kind). */
  ttl?: number;
}

interface Point { x: number; y: number }

interface Props {
  /** Ref to the container of the player's figure (used to compute center). */
  playerRef: React.RefObject<HTMLElement | null>;
  /** Ref to the container of the enemy's figure. */
  enemyRef: React.RefObject<HTMLElement | null>;
  items: VfxItem[];
}

const DEFAULT_TTL: Record<VfxKind, number> = {
  slash: 520,
  raw: 560,
  beam: 620,
  fusion: 1000,
  heal: 900,
  recharge: 900,
  poison: 900,
  burn: 900,
  shield: 900,
  stun: 1100,
  weaken: 850,
  drain: 900,
  slam: 700,
  dodge: 520,
  status: 700,
};

/** Self-FX kinds target the attacker instead of the opposite side. */
const SELF_KINDS: Partial<Record<VfxKind, true>> = {
  recharge: true,
  heal: true,
  shield: true,
  fusion: true,
};

function centerOf(el: HTMLElement | null): Point | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function BattleVfxLayer({ playerRef, enemyRef, items }: Props) {
  const { settings } = useGame();
  const reduced = useReducedMotion();
  const quiet = reduced || settings.lowGraphics;
  const [, force] = useState(0);

  // Re-measure on resize / scroll.
  useEffect(() => {
    const onChange = () => force((n) => n + 1);
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, { passive: true });
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[25] overflow-hidden" data-testid="battle-vfx-layer">
      <AnimatePresence>
        {items.map((it) => {
          const targetSide: Side = it.target ?? (SELF_KINDS[it.kind] ? it.attacker : it.attacker === 'player' ? 'enemy' : 'player');
          const from = centerOf((it.attacker === 'player' ? playerRef.current : enemyRef.current) as HTMLElement | null);
          const to = centerOf((targetSide === 'player' ? playerRef.current : enemyRef.current) as HTMLElement | null);
          if (!from || !to) return null;
          return (
            <VfxRenderer key={it.id} item={it} from={from} to={to} quiet={quiet} />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function VfxRenderer({ item, from, to, quiet }: { item: VfxItem; from: Point; to: Point; quiet: boolean }) {
  const ttl = Math.max(220, item.ttl ?? DEFAULT_TTL[item.kind] ?? 700);
  const common = useMemo(() => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: Math.min(0.2, ttl / 1000 / 4) },
  }), [ttl]);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const color = item.color ?? kindColor(item.kind);
  const containerClass = quiet ? '' : 'vfx-full-anim';

  switch (item.kind) {
    case 'slash':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <SlashBurst color={color} duration={ttl} />
        </motion.div>
      );
    case 'raw':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <ImpactRings color={color} duration={ttl} />
        </motion.div>
      );
    case 'slam':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <SlamShock color={color} duration={ttl} />
        </motion.div>
      );
    case 'beam':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: from.x, top: from.y, width: dist, height: 48, transform: `translateY(-50%) rotate(${angle}deg)`, transformOrigin: '0 50%' }} data-testid={`battle-vfx-${item.kind}`}>
          <Beam color={color} duration={ttl} dist={dist} />
        </motion.div>
      );
    case 'drain':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: from.x, top: from.y, width: dist, height: 52, transform: `translateY(-50%) rotate(${angle}deg)`, transformOrigin: '0 50%' }} data-testid={`battle-vfx-${item.kind}`}>
          <Tether color={color} duration={ttl} dist={dist} />
        </motion.div>
      );
    case 'fusion':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <FusionNova color={color} duration={ttl} />
        </motion.div>
      );
    case 'heal':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <HealSparks color={color} duration={ttl} />
        </motion.div>
      );
    case 'recharge':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <RechargeOrbs color={color} duration={ttl} />
        </motion.div>
      );
    case 'poison':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <PoisonDrip color={color} duration={ttl} />
        </motion.div>
      );
    case 'burn':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <BurnFlames color={color} duration={ttl} />
        </motion.div>
      );
    case 'shield':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <HexShield color={color} duration={ttl} />
        </motion.div>
      );
    case 'stun':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <StunStars color={color} duration={ttl} />
        </motion.div>
      );
    case 'weaken':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <WeakenWisp color={color} duration={ttl} />
        </motion.div>
      );
    case 'dodge':
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <DodgeSwish color={color} duration={ttl} />
        </motion.div>
      );
    case 'status':
    default:
      return (
        <motion.div {...common} className={containerClass} style={{ position: 'absolute', left: to.x, top: to.y, transform: 'translate(-50%, -50%)' }} data-testid={`battle-vfx-${item.kind}`}>
          <StatusPulse color={color} duration={ttl} />
        </motion.div>
      );
  }
}

/* --------------------------------- colors --------------------------------- */

function kindColor(k: VfxKind): string {
  switch (k) {
    case 'slash': return 'hsl(188 92% 70%)'; // cyan
    case 'raw': return 'hsl(42 92% 62%)';    // gold
    case 'beam': return 'hsl(188 92% 70%)';  // cyan
    case 'fusion': return 'hsl(272 80% 72%)'; // lavender
    case 'heal': return 'hsl(142 70% 65%)';   // green
    case 'recharge': return 'hsl(188 92% 70%)'; // cyan
    case 'poison': return 'hsl(100 70% 60%)'; // poison green
    case 'burn': return 'hsl(18 92% 60%)';    // orange
    case 'shield': return 'hsl(210 85% 70%)'; // blue
    case 'stun': return 'hsl(50 95% 60%)';    // yellow
    case 'weaken': return 'hsl(272 50% 55%)'; // muted purple
    case 'drain': return 'hsl(290 70% 65%)';  // magenta
    case 'slam': return 'hsl(18 92% 55%)';    // red-orange
    case 'dodge': return 'hsl(200 50% 90%)';  // off-white
    case 'status':
    default: return 'hsl(210 40% 90%)';
  }
}

/* -------------------------------- primitives ------------------------------ */

/** A diagonal slash (two angled strokes crossing). */
function SlashBurst({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="180" height="180" viewBox="-90 -90 180 180" aria-hidden>
      <defs>
        <linearGradient id="slashGrad" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="0.5" stopColor={color} stopOpacity="1" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g style={{ mixBlendMode: 'screen' as const }}>
        <path d="M -70 -40 L 70 40" stroke="url(#slashGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray="300" style={{ animation: `aeth-vfx-slash-stroke ${s} cubic-bezier(.2,.8,.2,1) forwards` }} fill="none" />
        <path d="M -60 40 L 60 -40" stroke="url(#slashGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="300"
          style={{ animation: `aeth-vfx-slash-stroke ${s} cubic-bezier(.2,.8,.2,1) 110ms forwards` }} fill="none" />
        <circle r="36" fill={color} opacity="0.0" style={{ animation: `aeth-vfx-starburst ${s} ease-out forwards`, transformOrigin: '0 0' }} />
      </g>
    </svg>
  );
}

/** Multi-ring physical impact. */
function ImpactRings({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="180" height="180" viewBox="-90 -90 180 180" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        {[0, 110, 210].map((d, i) => (
          <circle key={i} r={28 + i * 4} fill="none" stroke={color} strokeWidth={3 - i * 0.5}
            style={{ animation: `aeth-vfx-impact-ring ${s} cubic-bezier(.2,.8,.2,1) ${d}ms forwards`, transformOrigin: '0 0', opacity: 0 }} />
        ))}
        {/* sparkles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.cos(a) * 42;
          const y = Math.sin(a) * 42;
          return (
            <line key={i} x1={x * 0.4} y1={y * 0.4} x2={x} y2={y} stroke={color} strokeWidth="2"
              style={{ animation: `aeth-vfx-fade ${s} ease-out 60ms forwards`, opacity: 0 }} />
          );
        })}
      </g>
    </svg>
  );
}

/** Vertical shockwave slam impact. */
function SlamShock({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="220" height="180" viewBox="-110 -90 220 180" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        <ellipse cx="0" cy="12" rx="60" ry="14" fill="none" stroke={color} strokeWidth="4"
          style={{ animation: `aeth-vfx-shockwave ${s} cubic-bezier(.2,.8,.2,1) forwards`, transformOrigin: '0 12px', opacity: 0 }} />
        <ellipse cx="0" cy="12" rx="40" ry="10" fill="none" stroke={color} strokeWidth="2.5"
          style={{ animation: `aeth-vfx-shockwave ${s} cubic-bezier(.2,.8,.2,1) 110ms forwards`, transformOrigin: '0 12px', opacity: 0 }} />
        <line x1="0" y1="-60" x2="0" y2="20" stroke={color} strokeWidth="6" strokeLinecap="round"
          style={{ animation: `aeth-vfx-fade ${s} ease-out forwards`, opacity: 0 }} />
      </g>
    </svg>
  );
}

/** Horizontal energy beam from attacker to target. */
function Beam({ color, duration, dist }: { color: string; duration: number; dist: number }) {
  const s = `${duration}ms`;
  return (
    <div style={{ width: dist, height: 48, position: 'relative' }}>
      {/* core */}
      <div
        style={{
          position: 'absolute', left: 0, top: 22, width: dist, height: 4,
          background: `linear-gradient(90deg, transparent, ${color} 30%, white 55%, ${color} 70%, transparent)`,
          boxShadow: `0 0 18px ${color}, 0 0 36px ${color}`,
          transformOrigin: '0 50%', opacity: 0,
          animation: `aeth-vfx-fade ${s} ease-out forwards`,
          mixBlendMode: 'screen',
        }}
      />
      {/* projectile head */}
      <motion.div
        initial={{ x: 0, opacity: 0, scale: 0.6 }}
        animate={{ x: dist - 16, opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.9] }}
        transition={{ duration: duration / 1000 }}
        style={{
          position: 'absolute', left: 0, top: 14, width: 24, height: 24, borderRadius: 999,
          background: `radial-gradient(circle, white 0%, ${color} 55%, transparent 80%)`,
          boxShadow: `0 0 24px ${color}`,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}

/** Drain tether: curved tendril from attacker to target. */
function Tether({ color, duration, dist }: { color: string; duration: number; dist: number }) {
  const s = `${duration}ms`;
  return (
    <svg width={Math.max(dist, 20)} height="52" viewBox={`0 0 ${Math.max(dist, 20)} 52`} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id="drainGrad" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.1" />
          <stop offset="1" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={`M 0 26 Q ${dist / 2} ${Math.random() > 0.5 ? 6 : 46} ${dist} 26`}
        stroke="url(#drainGrad)" strokeWidth="4" fill="none"
        style={{ animation: `aeth-vfx-slash-stroke ${s} ease-out forwards`, opacity: 0, filter: `drop-shadow(0 0 6px ${color})`, mixBlendMode: 'screen' }}
        strokeDasharray="500"
      />
    </svg>
  );
}

/** Fusion nova: big rotating burst + rings + runes. */
function FusionNova({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="260" height="260" viewBox="-130 -130 260 260" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        <circle r="24" fill={color}
          style={{ animation: `aeth-vfx-starburst ${s} ease-out forwards`, opacity: 0, transformOrigin: '0 0' }} />
        {[0, 160, 330].map((d, i) => (
          <circle key={i} r={40 + i * 10} fill="none" stroke={color} strokeWidth={2.4 - i * 0.4}
            style={{ animation: `aeth-vfx-impact-ring-slow ${s} cubic-bezier(.2,.8,.2,1) ${d}ms forwards`, opacity: 0, transformOrigin: '0 0' }} />
        ))}
        {/* rune spokes */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.cos(a) * 60;
          const y = Math.sin(a) * 60;
          return (
            <line key={i} x1={x * 0.3} y1={y * 0.3} x2={x} y2={y} stroke={color} strokeWidth="3" strokeLinecap="round"
              style={{ animation: `aeth-vfx-fade ${s} ease-out ${i * 20}ms forwards`, opacity: 0 }} />
          );
        })}
        {/* outer ring with pulse */}
        <circle r="90" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4"
          style={{ animation: `aeth-vfx-pulse ${s} ease-in-out forwards`, transformOrigin: '0 0' }} />
      </g>
    </svg>
  );
}

/** Rising heal sparkles (plus signs). */
function HealSparks({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="160" height="200" viewBox="-80 -100 160 200" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        {[-50, -20, 10, 40, -10, 30].map((x, i) => (
          <g key={i} transform={`translate(${x} 60)`} style={{ animation: `aeth-vfx-spark-up ${s} ease-out ${i * 60}ms forwards`, opacity: 0, transformOrigin: 'center' }}>
            <circle r="7" fill={color} opacity="0.4" />
            <line x1="-6" x2="6" y1="0" y2="0" stroke={color} strokeWidth="2.2" />
            <line x1="0" x2="0" y1="-6" y2="6" stroke={color} strokeWidth="2.2" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Orbs orbiting the player for recharge. */
function RechargeOrbs({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="200" height="200" viewBox="-100 -100 200 200" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const, animation: `aeth-vfx-stun-orbit ${s} linear forwards`, transformOrigin: '0 0' }}>
        {[0, 90, 180, 270].map((deg, i) => (
          <g key={i} transform={`rotate(${deg}) translate(60 0)`}>
            <circle r="8" fill={color} opacity="0.95" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            <circle r="3" fill="white" opacity="0.9" />
          </g>
        ))}
      </g>
      <g style={{ animation: `aeth-vfx-pulse ${s} ease-in-out forwards`, mixBlendMode: 'screen' as const, transformOrigin: '0 0' }}>
        <circle r="26" fill="none" stroke={color} strokeWidth="2" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Poison drip (green droplets falling). */
function PoisonDrip({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="160" height="200" viewBox="-80 -100 160 200" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        {[-40, -15, 10, 35].map((x, i) => (
          <g key={i} transform={`translate(${x} -40)`} style={{ animation: `aeth-vfx-spark-down ${s} ease-in ${i * 80}ms forwards`, opacity: 0, transformOrigin: 'center' }}>
            <path d="M 0 -10 C 7 -2 7 6 0 12 C -7 6 -7 -2 0 -10 Z" fill={color} />
          </g>
        ))}
        <ellipse cx="0" cy="56" rx="48" ry="8" fill={color} opacity="0.35"
          style={{ animation: `aeth-vfx-pulse ${s} ease-in-out forwards`, transformOrigin: '0 56px' }} />
      </g>
    </svg>
  );
}

/** Burning flame tongues rising from target. */
function BurnFlames({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="160" height="200" viewBox="-80 -100 160 200" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        {[-30, 0, 30].map((x, i) => (
          <path key={i} d={`M ${x} 50 C ${x - 12} 20, ${x - 6} -10, ${x} -40 C ${x + 6} -10, ${x + 12} 20, ${x} 50 Z`}
            fill={color} style={{ animation: `aeth-vfx-spark-up ${s} ease-out ${i * 60}ms forwards`, opacity: 0, transformOrigin: 'center', filter: `blur(1.2px)` }} />
        ))}
      </g>
    </svg>
  );
}

/** Hexagonal shield. */
function HexShield({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  const hex = 'M 0 -60 L 52 -30 L 52 30 L 0 60 L -52 30 L -52 -30 Z';
  return (
    <svg width="180" height="180" viewBox="-90 -90 180 180" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const, animation: `aeth-vfx-pulse ${s} ease-in-out forwards`, transformOrigin: '0 0' }}>
        <path d={hex} fill={`${color}33`} stroke={color} strokeWidth="2.4" />
        <path d={hex} fill="none" stroke={color} strokeWidth="1" opacity="0.6" transform="scale(0.78)" />
      </g>
    </svg>
  );
}

/** Stars orbiting the target. */
function StunStars({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="200" height="140" viewBox="-100 -70 200 140" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const, animation: `aeth-vfx-stun-orbit ${s} linear forwards`, transformOrigin: '0 0' }}>
        {[0, 120, 240].map((deg, i) => (
          <g key={i} transform={`rotate(${deg}) translate(50 -30)`}>
            <polygon points="0,-10 3,-3 10,0 3,3 0,10 -3,3 -10,0 -3,-3" fill={color} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Downward dark wisp. */
function WeakenWisp({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="140" height="180" viewBox="-70 -90 140 180" aria-hidden>
      <defs>
        <linearGradient id="weakenGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset="1" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <g style={{ mixBlendMode: 'screen' as const, animation: `aeth-vfx-spark-down ${s} ease-in forwards`, opacity: 0, transformOrigin: 'center' }}>
        <path d="M 0 -60 Q -20 -20 0 10 Q 20 40 0 70" stroke="url(#weakenGrad)" strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="60" rx="30" ry="6" fill={color} opacity="0.5" />
      </g>
    </svg>
  );
}

/** Swish arc for dodge. */
function DodgeSwish({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="180" height="100" viewBox="-90 -50 180 100" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const, animation: `aeth-vfx-swish ${s} cubic-bezier(.2,.8,.2,1) forwards`, opacity: 0, transformOrigin: 'center' }}>
        <path d="M -60 10 Q 0 -30 60 10" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.95" />
        <path d="M -40 20 Q 0 -10 40 20" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

/** Generic status pulse. */
function StatusPulse({ color, duration }: { color: string; duration: number }) {
  const s = `${duration}ms`;
  return (
    <svg width="140" height="140" viewBox="-70 -70 140 140" aria-hidden>
      <g style={{ mixBlendMode: 'screen' as const }}>
        <circle r="18" fill={color} opacity="0.8" style={{ animation: `aeth-vfx-starburst ${s} ease-out forwards`, transformOrigin: '0 0' }} />
        <circle r="34" fill="none" stroke={color} strokeWidth="2" style={{ animation: `aeth-vfx-impact-ring ${s} ease-out forwards`, transformOrigin: '0 0', opacity: 0 }} />
      </g>
    </svg>
  );
}
