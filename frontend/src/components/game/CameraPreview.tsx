/**
 * Camera preview: mounts the detector's video + canvas elements into the DOM and draws an
 * overlay with detected markers, zone polygons and FPS/calibration status.
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { LiveCameraDetector } from '@/detection/LiveCameraDetector';
import type { ArucoMarker } from '@/detection/vision/aruco';
import { ZONES } from '@/engine';
import { useCameraTelemetry } from '@/detection/useCameraTelemetry';
import { cn } from '@/lib/utils';

interface Props {
  detector: LiveCameraDetector;
  showOverlay?: boolean;
  className?: string;
  testId?: string;
}

export function CameraPreview({ detector, showOverlay = true, className, testId }: Props) {
  const videoHostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const tel = useCameraTelemetry(detector);

  // Mount the detector's <video> element into our container (it drives the stream).
  useLayoutEffect(() => {
    const host = videoHostRef.current;
    const video = tel.video;
    if (!host || !video) return;
    host.innerHTML = '';
    video.className = 'h-full w-full object-cover';
    video.setAttribute('playsinline', 'true');
    host.appendChild(video);
    return () => {
      if (video.parentNode === host) host.removeChild(video);
    };
  }, [tel.video]);

  // Draw overlay each time the telemetry updates.
  useEffect(() => {
    const overlay = overlayRef.current;
    const host = videoHostRef.current;
    const video = tel.video;
    const canvas = tel.canvas;
    if (!overlay || !host || !video || !canvas) return;
    const rect = host.getBoundingClientRect();
    if (overlay.width !== rect.width || overlay.height !== rect.height) {
      overlay.width = Math.max(1, Math.round(rect.width));
      overlay.height = Math.max(1, Math.round(rect.height));
    }
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (!showOverlay) return;

    // Camera-space coords are canvas.width x canvas.height. Overlay scales them.
    const sx = overlay.width / canvas.width;
    const sy = overlay.height / canvas.height;

    const markers = tel.lastFrame?.markers ?? [];
    const cornerIds = tel.lastFrame?.corners ? new Set(Object.values(tel.lastFrame.corners).filter(Boolean).map((m) => (m as ArucoMarker).id)) : new Set<number>();

    // Draw each marker polygon + ID label.
    for (const m of markers) {
      const isCorner = cornerIds.has(m.id);
      ctx.strokeStyle = isCorner ? 'rgba(245, 184, 46, 0.95)' : 'rgba(94, 200, 229, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      m.corners.forEach((c, i) => {
        const x = c.x * sx;
        const y = c.y * sy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = isCorner ? 'rgba(245, 184, 46, 0.9)' : 'rgba(94, 200, 229, 0.9)';
      const cx = m.center.x * sx;
      const cy = m.center.y * sy;
      ctx.fillRect(cx - 12, cy - 8, 24, 16);
      ctx.fillStyle = '#0b1324';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(m.id), cx, cy);
    }

    // Draw calibrated mat polygon + zone splits.
    const corners = tel.lastFrame?.corners;
    if (tel.calibrated && corners && corners.topLeft && corners.topRight && corners.bottomRight && corners.bottomLeft) {
      const TL = corners.topLeft.center;
      const TR = corners.topRight.center;
      const BR = corners.bottomRight.center;
      const BL = corners.bottomLeft.center;
      ctx.strokeStyle = 'rgba(94, 200, 229, 0.9)';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(TL.x * sx, TL.y * sy);
      ctx.lineTo(TR.x * sx, TR.y * sy);
      ctx.lineTo(BR.x * sx, BR.y * sy);
      ctx.lineTo(BL.x * sx, BL.y * sy);
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Zone split markers along the top/bottom edges at u = 0.25, 0.5, 0.75.
      for (let i = 1; i <= 3; i++) {
        const u = i / 4;
        const x1 = TL.x + u * (TR.x - TL.x);
        const y1 = TL.y + u * (TR.y - TL.y);
        const x2 = BL.x + u * (BR.x - BL.x);
        const y2 = BL.y + u * (BR.y - BL.y);
        ctx.strokeStyle = 'rgba(94, 200, 229, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x1 * sx, y1 * sy);
        ctx.lineTo(x2 * sx, y2 * sy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // Zone labels.
      ZONES.forEach((z, i) => {
        const u = (i + 0.5) / 4;
        const cxTop = TL.x + u * (TR.x - TL.x);
        const cyTop = TL.y + u * (TR.y - TL.y);
        ctx.fillStyle = 'rgba(94, 200, 229, 0.85)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(z, cxTop * sx, cyTop * sy - 20);
      });
    }
  }, [tel, showOverlay]);

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-[hsl(var(--border-c))] bg-black', className)} data-testid={testId}>
      <div ref={videoHostRef} className="absolute inset-0" />
      <canvas ref={overlayRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      {/* Status pill */}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-mono-ui text-white" data-testid="camera-status-pill">
        <span className={cn('inline-block h-2 w-2 rounded-full', tel.calibrated ? 'bg-[hsl(var(--success))]' : tel.running ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--danger))]')} />
        {tel.calibrated ? 'KAL' : tel.running ? 'CARI' : 'OFF'} · {tel.markerCount} mk · {tel.fps} fps
      </div>
      {!tel.running ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--bg-0)/0.85)] p-4 text-center text-sm text-[hsl(var(--text-dim))]" data-testid="camera-preview-offline">
          {tel.lastError ?? 'Menunggu kamera...'}
        </div>
      ) : null}
    </div>
  );
}
