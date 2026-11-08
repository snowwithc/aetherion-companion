/**
 * Camera preview: shows the live rear-camera video with an overlay of
 *  - every detected marker (corners gold, cards cyan),
 *  - the printed mat and zones A-D projected back through the homography, so the outlines
 *    follow the real sheet even when the phone is tilted.
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { LiveCameraDetector, CameraTelemetry } from '@/detection/LiveCameraDetector';
import { applyHomography, type Pt } from '@/detection/vision/homography';
import { CORNER_IDS, MAT, MAT_ZONES, rectCenter, rectCorners, zoneRect } from '@/detection/vision/matLayout';
import { useCameraTelemetry } from '@/detection/useCameraTelemetry';
import { cardName } from '@/engine';
import { cn } from '@/lib/utils';
import { t } from '@/i18n/id';

interface Props {
  detector: LiveCameraDetector;
  showOverlay?: boolean;
  className?: string;
  testId?: string;
}

const CORNER_ID_SET = new Set<number>(Object.values(CORNER_IDS));
const GOLD = 'rgba(245, 184, 46, 0.95)';
const CYAN = 'rgba(94, 200, 229, 0.95)';
const AMBER = 'rgba(245, 158, 11, 0.95)';

export function calibrationLabel(tel: CameraTelemetry): string {
  if (!tel.running) return t.camera.status.off;
  const state = tel.lastFrame?.calibration ?? 'none';
  return t.camera.status[state];
}

function drawOverlay(canvas: HTMLCanvasElement, box: DOMRect, tel: CameraTelemetry) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(box.width * dpr));
  const H = Math.max(1, Math.round(box.height * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  const frame = tel.lastFrame;
  if (!frame || !tel.frameWidth || !tel.frameHeight) return;

  // The video uses object-contain: frame coordinates -> box pixels.
  const s = Math.min(W / tel.frameWidth, H / tel.frameHeight);
  const ox = (W - tel.frameWidth * s) / 2;
  const oy = (H - tel.frameHeight * s) / 2;
  const toBox = (p: Pt) => ({ x: ox + p.x * s, y: oy + p.y * s });
  const font = (px: number, weight = 700) => `${weight} ${Math.round(px * dpr)}px Manrope, sans-serif`;

  const polygon = (pts: Pt[]) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };

  // Mat + zones through the homography.
  const inv = frame.paperToCamera;
  if (inv) {
    const held = frame.calibration === 'held' || frame.calibration === 'partial';
    const project = (p: Pt) => toBox(applyHomography(inv, p));
    const paper = [{ x: 0, y: 0 }, { x: MAT.paper.width, y: 0 }, { x: MAT.paper.width, y: MAT.paper.height }, { x: 0, y: MAT.paper.height }].map(project);
    ctx.setLineDash([8 * dpr, 6 * dpr]);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = held ? AMBER : 'rgba(94, 200, 229, 0.6)';
    polygon(paper);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const z of MAT_ZONES) {
      const quad = rectCorners(zoneRect(z)).map(project);
      const reading = frame.readings[z];
      polygon(quad);
      if (reading.cardId) {
        ctx.fillStyle = 'rgba(94, 200, 229, 0.18)';
        ctx.fill();
      }
      ctx.lineWidth = (reading.cardId ? 2.5 : 1.5) * dpr;
      ctx.strokeStyle = reading.cardId ? CYAN : 'rgba(233, 238, 252, 0.55)';
      ctx.stroke();
      const c = project(rectCenter(zoneRect(z)));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(18, 800);
      ctx.fillStyle = 'rgba(11, 19, 36, 0.7)';
      ctx.fillText(z, c.x + dpr, c.y + dpr);
      ctx.fillStyle = reading.cardId ? CYAN : 'rgba(233, 238, 252, 0.85)';
      ctx.fillText(z, c.x, c.y);
      if (reading.cardId) {
        const label = cardName(reading.cardId);
        ctx.font = font(11, 700);
        const tw = ctx.measureText(label).width + 10 * dpr;
        ctx.fillStyle = 'rgba(11, 19, 36, 0.8)';
        ctx.fillRect(c.x - tw / 2, c.y + 12 * dpr, tw, 16 * dpr);
        ctx.fillStyle = '#E9EEFC';
        ctx.fillText(label, c.x, c.y + 20 * dpr);
      }
    }
  }

  // Raw markers.
  for (const m of frame.markers) {
    const isCorner = CORNER_ID_SET.has(m.id);
    ctx.strokeStyle = isCorner ? GOLD : CYAN;
    ctx.lineWidth = 2 * dpr;
    polygon(m.corners.map(toBox));
    ctx.stroke();
    const c = toBox(m.center);
    ctx.fillStyle = isCorner ? GOLD : CYAN;
    ctx.fillRect(c.x - 14 * dpr, c.y - 8 * dpr, 28 * dpr, 16 * dpr);
    ctx.fillStyle = '#0b1324';
    ctx.font = font(10, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(m.id), c.x, c.y);
  }
}

export function CameraPreview({ detector, showOverlay = true, className, testId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoHostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const tel = useCameraTelemetry(detector);

  // Borrow the detector's <video> while mounted; it goes back to its hidden parking spot after.
  useLayoutEffect(() => {
    const host = videoHostRef.current;
    const video = tel.video;
    if (!host || !video) return undefined;
    video.className = 'h-full w-full object-contain';
    return detector.attachVideo(host);
  }, [tel.video, detector]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    if (!showOverlay) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawOverlay(canvas, host.getBoundingClientRect(), tel);
  }, [tel, showOverlay]);

  const aspect = tel.frameWidth && tel.frameHeight ? `${tel.frameWidth} / ${tel.frameHeight}` : '4 / 3';
  const state = tel.lastFrame?.calibration ?? 'none';

  return (
    <div
      ref={hostRef}
      className={cn('relative mx-auto w-full max-h-[62vh] overflow-hidden rounded-2xl border border-[hsl(var(--border-c))] bg-black', className)}
      style={{ aspectRatio: aspect }}
      data-testid={testId}
    >
      <div ref={videoHostRef} className="absolute inset-0" />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 font-mono-ui text-[11px] text-white" data-testid="camera-status-pill">
        <span
          className={cn(
            'inline-block h-2 w-2 rounded-full',
            !tel.running ? 'bg-[hsl(var(--danger))]' : state === 'ok' ? 'bg-[hsl(var(--success))]' : state === 'none' ? 'bg-[hsl(var(--danger))]' : 'bg-[hsl(var(--warning))]',
          )}
        />
        <span data-testid="camera-calibration-state">{calibrationLabel(tel)}</span>
        <span className="text-white/60">- {tel.markerCount} mk - {tel.fps} fps</span>
      </div>
      {!tel.running ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--bg-0)/0.85)] p-4 text-center text-sm text-[hsl(var(--text-dim))]" data-testid="camera-preview-offline">
          {tel.lastError ?? t.camera.waiting}
        </div>
      ) : null}
    </div>
  );
}
