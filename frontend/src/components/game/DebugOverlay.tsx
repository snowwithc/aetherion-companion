/**
 * Debug overlay (ON by default during development):
 *  - calibration state, which corner markers are visible, fps and analysis time,
 *  - the straightened top-down view of the mat,
 *  - one crop per zone with the card read there, its stability and confidence.
 */
import React, { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { LiveCameraDetector } from '@/detection/LiveCameraDetector';
import { useCameraTelemetry } from '@/detection/useCameraTelemetry';
import { CORNER_ORDER, MAT, MAT_ZONES, zoneRect, type CornerName } from '@/detection/vision/matLayout';
import { cropPaperRect, type RGBAImage } from '@/detection/vision/warp';
import { cardName, type ZoneId } from '@/engine';
import { cn } from '@/lib/utils';
import { t } from '@/i18n/id';
import { calibrationLabel } from './CameraPreview';

const CORNER_SHORT: Record<CornerName, string> = { topLeft: 'KA', topRight: 'KN', bottomRight: 'BN', bottomLeft: 'BA' };
const CORNER_TITLE: Record<CornerName, string> = { topLeft: 'kiri atas', topRight: 'kanan atas', bottomRight: 'kanan bawah', bottomLeft: 'kiri bawah' };

function paint(canvas: HTMLCanvasElement | null, img: RGBAImage | null) {
  if (!canvas || !img) return;
  if (canvas.width !== img.width || canvas.height !== img.height) {
    canvas.width = img.width;
    canvas.height = img.height;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
}

interface Props {
  detector: LiveCameraDetector;
  className?: string;
}

export function DebugOverlay({ detector, className }: Props) {
  const tel = useCameraTelemetry(detector);
  const frame = tel.lastFrame;
  const topRef = useRef<HTMLCanvasElement>(null);
  const cropRefs = useRef<Record<ZoneId, HTMLCanvasElement | null>>({ A: null, B: null, C: null, D: null });

  useEffect(() => {
    const top = tel.topDown;
    paint(topRef.current, top);
    const ctx = topRef.current?.getContext('2d');
    if (top && ctx) {
      const k = tel.topDownPxPerMm;
      for (const z of MAT_ZONES) {
        const r = zoneRect(z);
        ctx.strokeStyle = frame?.readings[z].cardId ? 'rgba(94, 200, 229, 0.95)' : 'rgba(245, 184, 46, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x * k, r.y * k, r.w * k, r.h * k);
      }
      for (const p of frame?.placements ?? []) {
        ctx.fillStyle = p.zone ? 'rgba(94, 200, 229, 1)' : 'rgba(239, 68, 68, 1)';
        ctx.beginPath();
        ctx.arc(p.paper.x * k, p.paper.y * k, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const z of MAT_ZONES) {
      paint(cropRefs.current[z], top ? cropPaperRect(top, zoneRect(z), tel.topDownPxPerMm) : null);
    }
  }, [tel.topDown, tel.topDownPxPerMm, frame]);

  const found = new Set(frame?.cornersFound ?? []);
  const strays = (frame?.placements ?? []).filter((p) => !p.zone);

  return (
    <div className={cn('panel space-y-3 p-3 text-xs', className)} data-testid="camera-debug-overlay">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-cyan))]">Debug kamera</span>
        <span className="font-mono-ui text-[hsl(var(--text-dim))]" data-testid="camera-debug-fps">
          {tel.fps} fps - {t.camera.speed} {tel.analyseMs} ms - {tel.frameWidth}x{tel.frameHeight}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[hsl(var(--border-c))] bg-[hsl(var(--panel-2))] px-2 py-0.5 font-semibold" data-testid="camera-debug-calibration">
          {calibrationLabel(tel)}
          {frame?.calibration === 'held' ? ` (${(frame.geometryAgeMs / 1000).toFixed(1)} dtk)` : ''}
        </span>
        <span className="text-[hsl(var(--text-dim))]">{t.camera.corners}:</span>
        {CORNER_ORDER.map((n) => (
          <span
            key={n}
            title={CORNER_TITLE[n]}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono-ui text-[10px] font-bold',
              found.has(n) ? 'border-[hsl(var(--success)/0.5)] text-[hsl(var(--success))]' : 'border-[hsl(var(--danger)/0.5)] text-[hsl(var(--danger))]',
            )}
            data-testid={`camera-debug-corner-${n}`}
          >
            {found.has(n) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {CORNER_SHORT[n]}
          </span>
        ))}
        <span className="text-[hsl(var(--text-dim))]">{t.camera.markers}: <span className="font-mono-ui text-[hsl(var(--text))]">{tel.markerCount}</span></span>
      </div>

      <div>
        <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--text-dim))]">{t.camera.topDown}</div>
        {tel.topDown ? (
          <canvas ref={topRef} className="w-full rounded-lg border border-[hsl(var(--border-c))]" style={{ aspectRatio: `${MAT.paper.width} / ${MAT.paper.height}` }} data-testid="camera-debug-topdown" />
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border-c))] p-4 text-center text-[hsl(var(--text-dim))]" style={{ aspectRatio: `${MAT.paper.width} / ${MAT.paper.height}` }} data-testid="camera-debug-topdown-empty">
            {t.camera.topDownEmpty}
          </div>
        )}
      </div>

      <div>
        <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--text-dim))]">{t.camera.zoneCrops}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {MAT_ZONES.map((z) => {
            const r = frame?.readings[z];
            const prog = tel.zoneProgress?.[z];
            return (
              <div key={z} className={cn('rounded-lg border p-1', r?.cardId ? 'border-[hsl(var(--aether-cyan))]' : 'border-[hsl(var(--border-c))]')} data-testid={`camera-debug-zone-${z.toLowerCase()}`}>
                <div className="flex items-center justify-between font-mono-ui text-[10px]">
                  <span className="font-extrabold text-[hsl(var(--aether-cyan))]">{z}</span>
                  <span className="text-[hsl(var(--text-dim))]">{prog ? `${Math.min(prog.count, prog.need)}/${prog.need}` : '-'}</span>
                </div>
                {tel.topDown ? (
                  <canvas ref={(el) => { cropRefs.current[z] = el; }} className="mt-0.5 w-full rounded" style={{ aspectRatio: `${zoneRect(z).w} / ${zoneRect(z).h}` }} />
                ) : (
                  <div className="mt-0.5 w-full rounded bg-[hsl(var(--bg-1))]" style={{ aspectRatio: `${zoneRect(z).w} / ${zoneRect(z).h}` }} />
                )}
                <div className="mt-0.5 truncate text-[10px] font-semibold">{r?.cardId ? cardName(r.cardId) : t.camera.empty}</div>
                <div className="font-mono-ui text-[9px] text-[hsl(var(--text-dim))]">
                  {r?.cardId ? `${t.camera.confidence} ${Math.round(r.confidence * 100)}%` : '-'}
                  {prog?.stable ? ` - ${t.camera.stability}` : ''}
                </div>
              </div>
            );
          })}
        </div>
        {strays.length ? (
          <div className="mt-1.5 text-[10px] text-[hsl(var(--warning))]" data-testid="camera-debug-strays">
            {strays.map((p) => cardName(p.cardId)).join(', ')} - {t.camera.outside}
          </div>
        ) : null}
      </div>
      {tel.lastError ? <div className="truncate text-[hsl(var(--danger))]">error: {tel.lastError}</div> : null}
    </div>
  );
}
