/**
 * Built-in stylized 2D enemies (SVG), used until real art is dropped into
 * /public/assets/enemies/<enemyId>.png. Palette follows the card art: soot, oil, ember and grid tones.
 */
import React from 'react';

const Glow = ({ id, color, blur = 3 }: { id: string; color: string; blur?: number }) => (
  <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation={blur} result="b" />
    <feFlood floodColor={color} result="c" />
    <feComposite in="c" in2="b" operator="in" result="g" />
    <feMerge>
      <feMergeNode in="g" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
);

const Puff = ({ cx, cy, r, fill = '#7d7f93', o = 0.55, delay = '0s' }: { cx: number; cy: number; r: number; fill?: string; o?: number; delay?: string }) => (
  <circle cx={cx} cy={cy} r={r} fill={fill} opacity={o} className="anim-float" style={{ animationDelay: delay }} />
);

function SmogWisp() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="wisp-b" cx="45%" cy="35%" r="70%"><stop offset="0%" stopColor="#c3c6da" /><stop offset="100%" stopColor="#575a72" /></radialGradient>
        <Glow id="wisp-g" color="#FFD54A" />
      </defs>
      <Puff cx={36} cy={60} r={10} delay="0.4s" />
      <Puff cx={168} cy={52} r={8} delay="1.1s" />
      <g className="anim-sway">
        <path d="M92 136 C 96 160 80 172 60 182 C 86 180 108 170 114 140 Z" fill="#6b6e86" opacity="0.85" />
        <path d="M40 120 C 18 120 16 88 42 86 C 38 58 72 50 86 66 C 94 42 132 42 138 68 C 162 60 182 88 162 106 C 178 118 162 142 140 134 C 128 150 100 148 92 138 C 76 150 48 142 40 120 Z" fill="url(#wisp-b)" />
        <path d="M58 92 C 64 80 78 76 88 80" stroke="#e6e8f4" strokeOpacity="0.4" strokeWidth="5" fill="none" strokeLinecap="round" />
        <g filter="url(#wisp-g)">
          <ellipse cx="82" cy="100" rx="10" ry="8" fill="#FFD54A" />
          <ellipse cx="122" cy="100" rx="10" ry="8" fill="#FFD54A" />
        </g>
        <circle cx="84" cy="101" r="3.5" fill="#2a2234" />
        <circle cx="120" cy="101" r="3.5" fill="#2a2234" />
        <path d="M70 86 L94 93 M134 86 L110 93" stroke="#2c2d3e" strokeWidth="5" strokeLinecap="round" />
        <path d="M90 120 Q102 112 114 120" stroke="#2c2d3e" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function OilSlick() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="oil-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a4266" /><stop offset="100%" stopColor="#0b0912" /></linearGradient>
        <linearGradient id="oil-s" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#38e1ff" /><stop offset="50%" stopColor="#e04bff" /><stop offset="100%" stopColor="#ffe14a" /></linearGradient>
      </defs>
      <path d="M100 22 C 106 32 108 40 100 46 C 92 40 94 32 100 22 Z" fill="#1d1830" className="anim-float" />
      <path d="M30 150 C 30 120 60 112 70 96 C 78 70 92 54 100 44 C 108 54 122 70 130 96 C 140 112 170 120 170 150 C 170 172 140 180 100 180 C 60 180 30 172 30 150 Z" fill="url(#oil-b)" />
      <path d="M58 142 C 80 128 120 128 144 142" stroke="url(#oil-s)" strokeWidth="6" fill="none" opacity="0.75" strokeLinecap="round" />
      <path d="M70 160 C 90 150 112 150 132 160" stroke="url(#oil-s)" strokeWidth="4" fill="none" opacity="0.55" strokeLinecap="round" />
      <ellipse cx="84" cy="96" rx="7" ry="16" fill="#fff" opacity="0.16" transform="rotate(22 84 96)" />
      <ellipse cx="84" cy="116" rx="11" ry="9" fill="#f1ecff" />
      <ellipse cx="118" cy="116" rx="11" ry="9" fill="#f1ecff" />
      <circle cx="86" cy="118" r="4.5" fill="#6d2bd9" />
      <circle cx="116" cy="118" r="4.5" fill="#6d2bd9" />
      <path d="M92 132 Q101 138 110 132" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M42 176 C 44 184 40 190 36 190 C 32 190 30 184 34 178 Z" fill="#141022" />
      <path d="M162 172 C 164 180 160 186 156 186 C 152 186 150 180 154 174 Z" fill="#141022" />
    </svg>
  );
}

function SmogTitan() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="titan-b" cx="50%" cy="30%" r="75%"><stop offset="0%" stopColor="#a6a2bd" /><stop offset="100%" stopColor="#3f3b52" /></radialGradient>
        <Glow id="titan-g" color="#ff4d3a" blur={4} />
      </defs>
      <Puff cx={70} cy={14} r={9} delay="0s" />
      <Puff cx={100} cy={6} r={10} delay="0.6s" />
      <Puff cx={130} cy={14} r={9} delay="1.2s" />
      <rect x="62" y="20" width="16" height="36" rx="3" fill="#34313f" />
      <rect x="92" y="12" width="16" height="44" rx="3" fill="#34313f" />
      <rect x="122" y="20" width="16" height="36" rx="3" fill="#34313f" />
      <rect x="62" y="20" width="16" height="6" fill="#e2402b" />
      <rect x="92" y="12" width="16" height="6" fill="#e2402b" />
      <rect x="122" y="20" width="16" height="6" fill="#e2402b" />
      <path d="M20 150 C 6 130 22 104 44 110 C 46 92 64 86 76 96 L 124 96 C 136 86 154 92 156 110 C 178 104 194 130 180 150 C 188 170 168 190 146 182 C 130 196 70 196 54 182 C 32 190 12 170 20 150 Z" fill="url(#titan-b)" />
      <path d="M56 84 C 50 56 76 42 100 46 C 124 42 150 56 144 84 C 150 104 126 118 100 114 C 74 118 50 104 56 84 Z" fill="url(#titan-b)" />
      <g filter="url(#titan-g)">
        <path d="M70 76 L94 84 L72 90 Z" fill="#ff5a3c" />
        <path d="M130 76 L106 84 L128 90 Z" fill="#ff5a3c" />
      </g>
      <path d="M78 100 L86 94 L94 102 L100 94 L106 102 L114 94 L122 100" stroke="#22202c" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <circle cx="40" cy="150" r="14" fill="#56526a" />
      <circle cx="160" cy="150" r="14" fill="#56526a" />
    </svg>
  );
}

function CoalGolem() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="coal-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5a5450" /><stop offset="100%" stopColor="#1c1a19" /></linearGradient>
        <Glow id="coal-g" color="#FF7A1A" blur={3} />
      </defs>
      <polygon points="20,96 50,84 58,140 34,150" fill="#2c2826" />
      <polygon points="180,96 150,84 142,140 166,150" fill="#2c2826" />
      <polygon points="56,80 144,76 162,150 122,188 78,188 38,150" fill="url(#coal-b)" />
      <polygon points="72,28 128,26 138,72 62,74" fill="#2e2a28" />
      <polygon points="72,28 128,26 120,40 80,42" fill="#45403c" />
      <g filter="url(#coal-g)">
        <rect x="80" y="48" width="14" height="8" rx="2" fill="#FFB347" />
        <rect x="106" y="48" width="14" height="8" rx="2" fill="#FFB347" />
        <polyline points="70,100 90,118 84,140 104,160" stroke="#FF7A1A" strokeWidth="4" fill="none" strokeLinejoin="round" />
        <polyline points="128,92 116,112 132,130" stroke="#FF7A1A" strokeWidth="3.5" fill="none" strokeLinejoin="round" />
        <polyline points="100,170 112,178" stroke="#FF7A1A" strokeWidth="3" fill="none" />
      </g>
      <polygon points="90,62 110,62 104,68 96,68" fill="#191716" />
    </svg>
  );
}

function FumeDrone() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="drone-b" cx="40%" cy="30%" r="80%"><stop offset="0%" stopColor="#93a3b4" /><stop offset="100%" stopColor="#36404c" /></radialGradient>
        <Glow id="drone-g" color="#ff3b3b" blur={4} />
      </defs>
      <rect x="28" y="64" width="144" height="8" rx="4" fill="#46505c" />
      <g transform="translate(40 58)"><g className="anim-spin"><rect x="-30" y="-2.5" width="60" height="5" rx="2.5" fill="#c4d2df" opacity="0.8" /></g></g>
      <g transform="translate(160 58)"><g className="anim-spin"><rect x="-30" y="-2.5" width="60" height="5" rx="2.5" fill="#c4d2df" opacity="0.8" /></g></g>
      <rect x="37" y="56" width="6" height="12" fill="#2b323b" />
      <rect x="157" y="56" width="6" height="12" fill="#2b323b" />
      <ellipse cx="100" cy="104" rx="50" ry="38" fill="url(#drone-b)" />
      <path d="M56 96 L144 96" stroke="#2b323b" strokeWidth="3" opacity="0.5" />
      <circle cx="100" cy="106" r="18" fill="#141a22" />
      <g filter="url(#drone-g)"><circle cx="100" cy="106" r="9" fill="#ff3b3b" /></g>
      <circle cx="96" cy="102" r="3" fill="#ffd0d0" />
      <rect x="84" y="140" width="10" height="10" rx="2" fill="#2b323b" />
      <rect x="106" y="140" width="10" height="10" rx="2" fill="#2b323b" />
      <Puff cx={89} cy={164} r={9} delay="0s" fill="#8a8f9c" />
      <Puff cx={111} cy={174} r={11} delay="0.7s" fill="#8a8f9c" />
      <Puff cx={96} cy={186} r={8} delay="1.3s" fill="#8a8f9c" o={0.4} />
    </svg>
  );
}

function FurnaceColossus() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="furn-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a4a2a" /><stop offset="100%" stopColor="#3a1a0e" /></linearGradient>
        <radialGradient id="furn-f" cx="50%" cy="70%" r="70%"><stop offset="0%" stopColor="#ffe07a" /><stop offset="55%" stopColor="#ff7a1a" /><stop offset="100%" stopColor="#8a1e08" /></radialGradient>
        <Glow id="furn-g" color="#ff8a2a" blur={4} />
      </defs>
      <Puff cx={45} cy={12} r={9} delay="0.2s" />
      <Puff cx={155} cy={10} r={10} delay="0.9s" />
      <rect x="34" y="18" width="22" height="48" rx="3" fill="#3b2a24" />
      <rect x="144" y="18" width="22" height="48" rx="3" fill="#3b2a24" />
      <rect x="40" y="50" width="120" height="134" rx="20" fill="url(#furn-b)" />
      <rect x="40" y="50" width="120" height="14" rx="7" fill="#b2603a" opacity="0.6" />
      {[56, 144].map((x) => [70, 100, 130, 160].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#2a120a" />))}
      <g filter="url(#furn-g)">
        <rect x="70" y="80" width="22" height="7" rx="3" fill="#ffb347" />
        <rect x="108" y="80" width="22" height="7" rx="3" fill="#ffb347" />
      </g>
      <rect x="62" y="110" width="76" height="52" rx="10" fill="#230b04" />
      <rect x="68" y="116" width="64" height="40" rx="7" fill="url(#furn-f)" className="anim-glow" />
      {[80, 94, 108, 122].map((x) => <rect key={x} x={x} y="114" width="5" height="44" rx="2" fill="#2a120a" />)}
      <rect x="14" y="96" width="26" height="54" rx="10" fill="#5a2a18" />
      <rect x="160" y="96" width="26" height="54" rx="10" fill="#5a2a18" />
    </svg>
  );
}

function BlackoutWraith() {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="wraith-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d4470" /><stop offset="100%" stopColor="#0d0f1c" /></linearGradient>
        <Glow id="wraith-g" color="#5ee7ff" blur={4} />
      </defs>
      <g className="anim-sway">
        <path d="M100 22 C 142 28 160 80 162 128 C 164 158 170 174 178 184 L 150 172 L 136 188 L 118 172 L 100 190 L 82 172 L 64 188 L 50 172 L 22 184 C 30 174 36 158 38 128 C 40 80 58 28 100 22 Z" fill="url(#wraith-b)" />
        <ellipse cx="100" cy="84" rx="30" ry="34" fill="#04050b" />
        <g filter="url(#wraith-g)" className="anim-flicker">
          <ellipse cx="88" cy="84" rx="7" ry="4" fill="#5ee7ff" />
          <ellipse cx="112" cy="84" rx="7" ry="4" fill="#5ee7ff" />
        </g>
        <path d="M60 120 C 70 130 76 136 84 138" stroke="#5a6396" strokeWidth="3" fill="none" opacity="0.6" />
      </g>
      <g transform="translate(152 120)" className="anim-float">
        <circle cx="0" cy="0" r="14" fill="#1a1e2e" stroke="#d8e2f0" strokeWidth="2.5" />
        <path d="M-6 -8 L 0 -1 L -3 4 L 4 10" stroke="#d8e2f0" strokeWidth="2" fill="none" />
        <rect x="-7" y="13" width="14" height="9" rx="2" fill="#8792a8" />
      </g>
    </svg>
  );
}

function GridParasite() {
  const legs: [number, number, number, number][] = [
    [60, 96, 22, 70], [56, 112, 16, 116], [62, 128, 26, 158],
    [140, 96, 178, 70], [144, 112, 184, 116], [138, 128, 174, 158],
  ];
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="para-b" cx="45%" cy="35%" r="75%"><stop offset="0%" stopColor="#6f8a5c" /><stop offset="100%" stopColor="#1f2a1d" /></radialGradient>
        <Glow id="para-g" color="#9dff5a" blur={3} />
        <Glow id="para-y" color="#F5E14D" blur={3} />
      </defs>
      {legs.map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2c3a2a" strokeWidth="6" strokeLinecap="round" />
          <rect x={x2 - 7} y={y2 - 6} width="14" height="12" rx="3" fill="#cfd6c8" />
          <rect x={x2 - 5} y={y2 + 6} width="3" height="6" fill="#cfd6c8" />
          <rect x={x2 + 2} y={y2 + 6} width="3" height="6" fill="#cfd6c8" />
        </g>
      ))}
      <ellipse cx="100" cy="114" rx="52" ry="40" fill="url(#para-b)" />
      <path d="M58 106 Q100 92 142 106 M54 124 Q100 110 146 124" stroke="#2a3826" strokeWidth="3" fill="none" />
      <ellipse cx="100" cy="72" rx="28" ry="19" fill="#2f3f2c" />
      <g filter="url(#para-g)">
        <circle cx="88" cy="70" r="5" fill="#9dff5a" />
        <circle cx="112" cy="70" r="5" fill="#9dff5a" />
        <circle cx="100" cy="62" r="3.5" fill="#9dff5a" />
      </g>
      <g filter="url(#para-y)" className="anim-flicker">
        <polyline points="70,150 80,140 76,152 88,144" stroke="#F5E14D" strokeWidth="3" fill="none" />
        <polyline points="130,150 120,140 124,152 112,144" stroke="#F5E14D" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}

function FossilKing({ raging }: { raging?: boolean }) {
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="king-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a4520" /><stop offset="100%" stopColor="#140f07" /></linearGradient>
        <linearGradient id="king-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f5d27a" /><stop offset="100%" stopColor="#9a6c1c" /></linearGradient>
        <Glow id="king-g" color={raging ? '#ff3b2b' : '#ffb347'} blur={4} />
      </defs>
      {raging ? <circle cx="100" cy="110" r="88" fill="#ff3b2b" opacity="0.18" className="anim-glow" /> : null}
      <path d="M100 56 L 176 190 L 24 190 Z" fill="url(#king-c)" />
      <path d="M100 70 L 150 190 L 50 190 Z" fill="#2a2112" />
      <path d="M70 70 C 70 46 84 36 100 36 C 116 36 130 46 130 70 C 130 90 118 104 100 104 C 82 104 70 90 70 70 Z" fill="#2b2620" />
      <g filter="url(#king-g)">
        <path d="M80 66 L 96 72 L 82 78 Z" fill={raging ? '#ff4d3a' : '#ffb347'} />
        <path d="M120 66 L 104 72 L 118 78 Z" fill={raging ? '#ff4d3a' : '#ffb347'} />
      </g>
      <path d="M86 90 L 92 86 L 98 92 L 104 86 L 110 92 L 116 88" stroke="#d8cdb0" strokeWidth="3" fill="none" strokeLinejoin="round" />
      {/* oil-derrick crown */}
      <g stroke="url(#king-gold)" strokeWidth="3.5" fill="none" strokeLinejoin="round">
        <path d="M72 40 L 80 10 L 88 40 M74 32 L 86 32 M76 22 L 84 22" />
        <path d="M92 38 L 100 2 L 108 38 M94 28 L 106 28 M96 16 L 104 16" />
        <path d="M112 40 L 120 10 L 128 40 M114 32 L 126 32 M116 22 L 124 22" />
      </g>
      <rect x="68" y="38" width="64" height="7" rx="3" fill="url(#king-gold)" />
      <path d="M86 45 C 88 52 84 56 82 56 C 80 56 78 52 82 46 Z" fill="#0c0a08" />
      <path d="M116 45 C 118 54 114 58 112 58 C 110 58 108 54 112 46 Z" fill="#0c0a08" />
      {/* scepter */}
      <line x1="160" y1="80" x2="150" y2="186" stroke="url(#king-gold)" strokeWidth="5" strokeLinecap="round" />
      <polygon points="152,58 172,62 176,80 160,90 146,78" fill="#1c1a19" stroke="#ff7a1a" strokeWidth="2" />
    </svg>
  );
}

const ART: Record<string, (p: { raging?: boolean }) => React.ReactElement> = {
  smog_wisp: SmogWisp,
  oil_slick: OilSlick,
  smog_titan: SmogTitan,
  coal_golem: CoalGolem,
  fume_drone: FumeDrone,
  furnace_colossus: FurnaceColossus,
  blackout_wraith: BlackoutWraith,
  grid_parasite: GridParasite,
  fossil_king: FossilKing,
};

export function EnemyArtSvg({ enemyId, raging }: { enemyId: string; raging?: boolean }) {
  const Comp = ART[enemyId] ?? SmogWisp;
  return <Comp raging={raging} />;
}
