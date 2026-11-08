/**
 * Tiny synthesized sound effects (Web Audio API) - no audio files needed.
 * Silently does nothing if audio is unavailable.
 */
export type SfxName = 'click' | 'attack' | 'special' | 'hit' | 'heal' | 'energy' | 'dice' | 'card' | 'fusion' | 'warn' | 'victory' | 'defeat' | 'dodge' | 'enemy';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(v: boolean) {
  enabled = v;
}

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slideTo?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + (opts.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.12, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.12, delay = 0) {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + delay);
}

export function sfx(name: SfxName) {
  if (!enabled) return;
  switch (name) {
    case 'click': tone(660, 0.06, { type: 'triangle', gain: 0.06 }); break;
    case 'attack': tone(420, 0.12, { type: 'sawtooth', gain: 0.07, slideTo: 160 }); noise(0.08, 0.05); break;
    case 'special': tone(300, 0.25, { type: 'square', gain: 0.06, slideTo: 900 }); tone(600, 0.2, { type: 'triangle', gain: 0.05, delay: 0.08 }); break;
    case 'enemy': tone(160, 0.2, { type: 'sawtooth', gain: 0.08, slideTo: 70 }); noise(0.12, 0.06); break;
    case 'hit': noise(0.1, 0.12); tone(110, 0.12, { type: 'square', gain: 0.05 }); break;
    case 'heal': tone(523, 0.14, { gain: 0.07 }); tone(784, 0.18, { gain: 0.06, delay: 0.09 }); break;
    case 'energy': tone(880, 0.08, { type: 'triangle', gain: 0.05 }); tone(1320, 0.1, { type: 'triangle', gain: 0.04, delay: 0.06 }); break;
    case 'dice': for (let i = 0; i < 5; i++) tone(300 + Math.random() * 500, 0.03, { type: 'square', gain: 0.03, delay: i * 0.07 }); break;
    case 'card': tone(500, 0.1, { type: 'triangle', gain: 0.06, slideTo: 1000 }); break;
    case 'fusion': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.06, delay: i * 0.08 })); break;
    case 'warn': tone(220, 0.14, { type: 'square', gain: 0.05 }); tone(180, 0.16, { type: 'square', gain: 0.05, delay: 0.12 }); break;
    case 'dodge': tone(900, 0.12, { type: 'sine', gain: 0.05, slideTo: 1600 }); break;
    case 'victory': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.07, delay: i * 0.12 })); break;
    case 'defeat': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, { type: 'sine', gain: 0.07, delay: i * 0.16 })); break;
    default: break;
  }
}
