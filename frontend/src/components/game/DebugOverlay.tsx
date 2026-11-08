/**
 * Debug overlay: shows detected markers (ID + classification), per-zone readings, and fps.
 */
import React from 'react';
import type { LiveCameraDetector } from '@/detection/LiveCameraDetector';
import { useCameraTelemetry } from '@/detection/useCameraTelemetry';
import { cardName, ZONES, type ZoneId } from '@/engine';
import { cn } from '@/lib/utils';

interface Props {
  detector: LiveCameraDetector;
  className?: string;
}

export function DebugOverlay({ detector, className }: Props) {
  const tel = useCameraTelemetry(detector);
  const frame = tel.lastFrame;
  return (
    <div className={cn('panel space-y-2 p-3 text-xs font-mono-ui', className)} data-testid="camera-debug-overlay">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-block h-2 w-2 rounded-full', tel.calibrated ? 'bg-[hsl(var(--success))]' : tel.running ? 'bg-[hsl(var(--warning))]' : 'bg-[hsl(var(--danger))]')} />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-cyan))]">Debug</span>
        </div>
        <span className="text-[hsl(var(--text-dim))]" data-testid="camera-debug-fps">{tel.fps} fps</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Stat label="Marker" value={String(tel.markerCount)} />
        <Stat label="Kalibrasi" value={tel.calibrated ? 'OK' : '-'} />
        <Stat label="Sumber" value={tel.running ? 'kamera' : 'idle'} />
        <Stat label="Error" value={tel.lastError ? 'ya' : '-'} />
      </div>
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--aether-cyan))]">Zona</div>
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          {ZONES.map((z: ZoneId) => {
            const r = frame?.readings[z];
            const id = r?.cardId;
            return (
              <div key={z} className={cn('rounded border px-1 py-0.5', id ? 'border-[hsl(var(--aether-cyan))] text-[hsl(188_90%_82%)]' : 'border-[hsl(var(--border-c))] text-[hsl(var(--text-dim))]')} data-testid={`camera-debug-zone-${z.toLowerCase()}`}>
                <div className="font-extrabold">{z}</div>
                <div className="truncate">{id ? cardName(id) : '-'}</div>
              </div>
            );
          })}
        </div>
      </div>
      {tel.lastError ? <div className="truncate text-[hsl(6_90%_75%)]">err: {tel.lastError}</div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-widest text-[hsl(var(--text-dim))]">{label}</div>
      <div className="text-right text-[hsl(var(--text))]">{value}</div>
    </>
  );
}
