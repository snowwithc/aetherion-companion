/**
 * Live Camera detector: opens the rear camera, grabs frames at the configured FPS,
 * runs the ArUco vision pipeline, and emits the same ZoneEvent shape as the Manual detector.
 *
 * The game loop never knows whether events come from a tap or a camera - it only sees
 * "card X landed in zone Y".
 */
import { config } from '@/engine';
import { emptySnapshot, type CardDetector, type DetectorStatus, type ZoneEvent, type ZoneSnapshot } from './types';
import { analyseFrame, ZoneDebouncer, type PipelineOutput } from './vision/pipeline';

/** True when a static file really exists (the dev server answers unknown paths with index.html). */
export async function assetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return false;
    const type = res.headers.get('content-type') ?? '';
    return !type.includes('text/html');
  } catch {
    return false;
  }
}

export interface CameraTelemetry {
  running: boolean;
  calibrated: boolean;
  markerCount: number;
  fps: number;
  lastError: string | null;
  lastFrame: PipelineOutput | null;
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
}

export class LiveCameraDetector implements CardDetector {
  readonly kind = 'camera' as const;

  private zones: ZoneSnapshot = emptySnapshot();
  private listeners = new Set<(e: ZoneEvent) => void>();
  private telemetryListeners = new Set<(t: CameraTelemetry) => void>();

  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private rafId: number | null = null;
  private frameTimer: number | null = null;
  private running = false;
  private debouncer = new ZoneDebouncer();

  private telemetry: CameraTelemetry = {
    running: false,
    calibrated: false,
    markerCount: 0,
    fps: 0,
    lastError: null,
    lastFrame: null,
    video: null,
    canvas: null,
  };

  async start(): Promise<DetectorStatus> {
    this.debouncer.configure(config.detection.registerFrames, config.detection.clearFrames);
    const cameraFound = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    if (!cameraFound) {
      this.telemetry.lastError = 'Browser ini tidak mendukung getUserMedia.';
      this.notifyTelemetry();
      return { available: false, cameraFound: false, message: 'Perangkat tanpa akses kamera - gunakan Mode Manual.' };
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.telemetry.lastError = message;
      this.notifyTelemetry();
      return { available: false, cameraFound: true, message: `Kamera ditolak: ${message}` };
    }
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch {
      /* some browsers need an interaction; we try again on next frame */
    }
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 360;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.running = true;
    this.telemetry.running = true;
    this.telemetry.video = this.video;
    this.telemetry.canvas = this.canvas;
    this.loop();
    this.notifyTelemetry();
    return {
      available: true,
      cameraFound: true,
      modelFound: false,
      message: 'Kamera siap. Arahkan ke marker ArUco di meja untuk mulai.',
    };
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.frameTimer) window.clearTimeout(this.frameTimer);
    this.rafId = null;
    this.frameTimer = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) { this.video.srcObject = null; this.video = null; }
    this.canvas = null;
    this.ctx = null;
    this.debouncer.reset();
    this.zones = emptySnapshot();
    this.telemetry.running = false;
    this.telemetry.lastFrame = null;
    this.telemetry.video = null;
    this.telemetry.canvas = null;
    this.notifyTelemetry();
  }

  subscribe(listener: (e: ZoneEvent) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  subscribeTelemetry(listener: (t: CameraTelemetry) => void) {
    this.telemetryListeners.add(listener);
    listener(this.telemetry);
    return () => { this.telemetryListeners.delete(listener); };
  }

  getSnapshot(): ZoneSnapshot {
    return this.zones;
  }

  getTelemetry(): CameraTelemetry {
    return this.telemetry;
  }

  // ---------------- internals

  private frameTimes: number[] = [];

  private loop = () => {
    if (!this.running) return;
    this.tick();
    const delay = Math.max(1, Math.round(1000 / config.detection.fps));
    this.frameTimer = window.setTimeout(this.loop, delay);
  };

  private tick() {
    const video = this.video;
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!video || !canvas || !ctx) return;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    // Match canvas aspect to the live stream.
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    if (canvas.width !== sw || canvas.height !== sh) {
      canvas.width = Math.min(960, sw);
      canvas.height = Math.round((canvas.width / sw) * sh);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const output = analyseFrame(frame);
    this.telemetry.lastFrame = output;
    this.telemetry.calibrated = output.calibrated;
    this.telemetry.markerCount = output.markers.length;
    // FPS sliding window.
    const now = performance.now();
    this.frameTimes.push(now);
    while (this.frameTimes.length > 10) this.frameTimes.shift();
    if (this.frameTimes.length >= 2) {
      const span = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
      this.telemetry.fps = span > 0 ? Math.round(((this.frameTimes.length - 1) / span) * 1000) : 0;
    }
    // Zone events
    const changes = this.debouncer.feed({
      A: { zone: 'A', cardId: output.readings.A.cardId, confidence: output.readings.A.confidence },
      B: { zone: 'B', cardId: output.readings.B.cardId, confidence: output.readings.B.confidence },
      C: { zone: 'C', cardId: output.readings.C.cardId, confidence: output.readings.C.confidence },
      D: { zone: 'D', cardId: output.readings.D.cardId, confidence: output.readings.D.confidence },
    });
    for (const change of changes) {
      const at = Date.now();
      this.zones = { ...this.zones, [change.zone]: { cardId: change.cardId, confidence: change.cardId ? 1 : 0, at } };
      const event: ZoneEvent = { zone: change.zone, cardId: change.cardId, confidence: change.cardId ? 1 : 0, source: 'camera', at };
      this.listeners.forEach((fn) => fn(event));
    }
    this.notifyTelemetry();
  }

  private notifyTelemetry() {
    const snapshot = { ...this.telemetry };
    this.telemetryListeners.forEach((fn) => fn(snapshot));
  }
}
