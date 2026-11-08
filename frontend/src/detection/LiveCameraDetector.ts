/**
 * Live Camera detector: opens the rear camera, grabs frames at the configured FPS,
 * runs the ArUco + homography vision pipeline, and emits the same ZoneEvent shape as the
 * Manual detector. The game loop never knows whether a card came from a tap or a camera.
 */
import { config } from '@/engine';
import { emptySnapshot, type CardDetector, type DetectorStatus, type ZoneEvent, type ZoneSnapshot } from './types';
import { analyseFrame, GeometryTracker, ZoneDebouncer, type PipelineOutput, type ZoneProgress } from './vision/pipeline';
import { MAT } from './vision/matLayout';
import { warpTopDown, type RGBAImage } from './vision/warp';
import type { ZoneId } from '@/engine';

export interface CameraTelemetry {
  running: boolean;
  calibrated: boolean;
  markerCount: number;
  fps: number;
  /** Time spent analysing the last frame (ms) - useful to spot slow phones. */
  analyseMs: number;
  lastError: string | null;
  lastFrame: PipelineOutput | null;
  zoneProgress: Record<ZoneId, ZoneProgress> | null;
  /** Straightened paper-space view (only while debug is on). */
  topDown: RGBAImage | null;
  topDownPxPerMm: number;
  video: HTMLVideoElement | null;
  /** Size of the analysed frame (camera coordinates in lastFrame use this space). */
  frameWidth: number;
  frameHeight: number;
}

const EMPTY_TELEMETRY: CameraTelemetry = {
  running: false,
  calibrated: false,
  markerCount: 0,
  fps: 0,
  analyseMs: 0,
  lastError: null,
  lastFrame: null,
  zoneProgress: null,
  topDown: null,
  topDownPxPerMm: config.detection.topDownPxPerMm,
  video: null,
  frameWidth: 0,
  frameHeight: 0,
};

export class LiveCameraDetector implements CardDetector {
  readonly kind = 'camera' as const;

  private zones: ZoneSnapshot = emptySnapshot();
  private listeners = new Set<(e: ZoneEvent) => void>();
  private telemetryListeners = new Set<(t: CameraTelemetry) => void>();

  private video: HTMLVideoElement | null = null;
  private parking: HTMLDivElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private frameTimer: number | null = null;
  private running = false;
  private debug = false;
  private frameCount = 0;
  private frameTimes: number[] = [];
  private debouncer = new ZoneDebouncer();
  private tracker = new GeometryTracker(config.detection.geometryHoldMs);
  /** Immutable snapshot handed to React (a new object on every change). */
  private telemetry: CameraTelemetry = EMPTY_TELEMETRY;

  /** Override the debounce thresholds (from Settings). */
  setTuning(t: { registerFrames?: number; clearFrames?: number; geometryHoldMs?: number }) {
    this.debouncer.configure(t.registerFrames ?? config.detection.registerFrames, t.clearFrames ?? config.detection.clearFrames);
    if (t.geometryHoldMs !== undefined) this.tracker.setHoldMs(t.geometryHoldMs);
  }

  /** While on, every few frames we also build the straightened top-down view. */
  setDebug(enabled: boolean) {
    this.debug = enabled;
    if (!enabled && this.telemetry.topDown) this.patchTelemetry({ topDown: null });
  }

  async start(): Promise<DetectorStatus> {
    if (this.running) return { available: true, cameraFound: true, message: 'Kamera sudah aktif.' };
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.patchTelemetry({ lastError: 'Browser ini tidak mendukung akses kamera.' });
      return { available: false, cameraFound: false, message: 'Perangkat tanpa akses kamera - gunakan Mode Manual.' };
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.patchTelemetry({ lastError: message });
      return { available: false, cameraFound: true, message: `Kamera ditolak: ${message}` };
    }
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.setAttribute('playsinline', 'true');
    video.srcObject = this.stream;
    // Park the video in the DOM while no preview shows it: iOS Safari pauses detached videos.
    const parking = document.createElement('div');
    parking.setAttribute('aria-hidden', 'true');
    parking.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(parking);
    parking.appendChild(video);
    this.parking = parking;
    try {
      await video.play();
    } catch {
      /* some browsers need a user gesture; frames start once it plays */
    }
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.running = true;
    this.debouncer.reset();
    this.tracker.reset();
    this.patchTelemetry({ running: true, lastError: null, video });
    this.loop();
    return { available: true, cameraFound: true, modelFound: false, message: 'Kamera siap. Arahkan ke lembar kalibrasi di meja.' };
  }

  stop() {
    this.running = false;
    if (this.frameTimer) window.clearTimeout(this.frameTimer);
    this.frameTimer = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
    this.parking?.remove();
    this.parking = null;
    this.canvas = null;
    this.ctx = null;
    this.debouncer.reset();
    this.tracker.reset();
    this.frameTimes = [];
    // Zones are reset silently: switching to Manual must not look like "cards were lifted".
    this.zones = emptySnapshot();
    this.telemetry = { ...EMPTY_TELEMETRY, lastError: this.telemetry.lastError };
    this.emitTelemetry();
  }

  subscribe(listener: (e: ZoneEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeTelemetry(listener: (t: CameraTelemetry) => void) {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  getSnapshot(): ZoneSnapshot {
    return this.zones;
  }

  getTelemetry(): CameraTelemetry {
    return this.telemetry;
  }

  /** Move the live video into a preview container (returns a function that parks it again). */
  attachVideo(host: HTMLElement): () => void {
    const video = this.video;
    if (!video) return () => {};
    host.appendChild(video);
    void video.play().catch(() => {});
    return () => {
      if (this.parking && video === this.video) {
        this.parking.appendChild(video);
        void video.play().catch(() => {});
      } else if (video.parentNode === host) {
        host.removeChild(video);
      }
    };
  }

  // ------------------------------------------------------------------ internals

  private loop = () => {
    if (!this.running) return;
    try {
      this.tick();
    } catch (err) {
      this.patchTelemetry({ lastError: err instanceof Error ? err.message : String(err) });
    }
    this.frameTimer = window.setTimeout(this.loop, Math.max(1, Math.round(1000 / config.detection.fps)));
  };

  private tick() {
    const { video, canvas, ctx } = this;
    if (!video || !canvas || !ctx || video.readyState < 2 || video.videoWidth === 0) return;
    // Cap the LONGEST side so portrait phones (720x1280) are not analysed at full size.
    const sw = video.videoWidth;
    const sh = video.videoHeight;
    const scale = Math.min(1, config.detection.processMaxSide / Math.max(sw, sh));
    const w = Math.round(sw * scale);
    const h = Math.round(sh * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const frame = ctx.getImageData(0, 0, w, h);

    const t0 = performance.now();
    const now = Date.now();
    const output = analyseFrame(frame, this.tracker, now);
    const changes = this.debouncer.feed(output.readings);
    this.frameCount += 1;

    let topDown = this.telemetry.topDown;
    if (this.debug && output.paperToCamera && this.frameCount % Math.max(1, config.detection.debugWarpEveryFrames) === 0) {
      topDown = warpTopDown(frame, output.paperToCamera, MAT.paper, config.detection.topDownPxPerMm);
    } else if (!this.debug || !output.paperToCamera) {
      topDown = null;
    }
    const analyseMs = performance.now() - t0;

    this.frameTimes.push(t0);
    while (this.frameTimes.length > 10) this.frameTimes.shift();
    const span = this.frameTimes.length >= 2 ? this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0] : 0;
    const fps = span > 0 ? Math.round(((this.frameTimes.length - 1) / span) * 1000) : 0;

    for (const change of changes) {
      const confidence = change.cardId ? output.readings[change.zone].confidence || 1 : 0;
      this.zones = { ...this.zones, [change.zone]: { cardId: change.cardId, confidence, at: now } };
      const event: ZoneEvent = { zone: change.zone, cardId: change.cardId, confidence, source: 'camera', at: now };
      this.listeners.forEach((fn) => fn(event));
    }

    this.patchTelemetry({
      calibrated: output.calibrated,
      markerCount: output.markers.length,
      fps,
      analyseMs: Math.round(analyseMs),
      lastFrame: output,
      zoneProgress: this.debouncer.progress(),
      topDown,
      frameWidth: w,
      frameHeight: h,
    });
  }

  private patchTelemetry(patch: Partial<CameraTelemetry>) {
    this.telemetry = { ...this.telemetry, ...patch };
    this.emitTelemetry();
  }

  private emitTelemetry() {
    const snap = this.telemetry;
    this.telemetryListeners.forEach((fn) => fn(snap));
  }
}
