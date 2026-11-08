/**
 * Manual Simulator: tapping a card in the Card Tray "places" it on the mat.
 * It fires exactly the same zone events as the live camera would.
 */
import { cardTypeOf, ZONE_FOR_TYPE, type ZoneId } from '@/engine';
import { emptySnapshot, type CardDetector, type DetectorStatus, type ZoneEvent, type ZoneSnapshot } from './types';

export class ManualSimulatorDetector implements CardDetector {
  readonly kind = 'manual' as const;
  private zones: ZoneSnapshot = emptySnapshot();
  private listeners = new Set<(e: ZoneEvent) => void>();

  async start(): Promise<DetectorStatus> {
    return { available: true, message: 'Manual Simulator ready - tap cards in the Card Tray.' };
  }

  stop() {
    /* nothing to release */
  }

  subscribe(listener: (e: ZoneEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): ZoneSnapshot {
    return this.zones;
  }

  /** Place a card. Without forceZone it goes to its correct zone (A-D). */
  place(cardId: string, forceZone?: ZoneId) {
    const type = cardTypeOf(cardId);
    const zone = forceZone ?? (type ? ZONE_FOR_TYPE[type] : 'B');
    this.emit(zone, cardId);
  }

  remove(zone: ZoneId) {
    if (this.zones[zone].cardId === null) return;
    this.emit(zone, null);
  }

  clear(zones: ZoneId[]) {
    zones.forEach((z) => this.remove(z));
  }

  private emit(zone: ZoneId, cardId: string | null) {
    const at = Date.now();
    this.zones = { ...this.zones, [zone]: { cardId, confidence: cardId ? 1 : 0, at } };
    const event: ZoneEvent = { zone, cardId, confidence: cardId ? 1 : 0, source: 'manual', at };
    this.listeners.forEach((fn) => fn(event));
  }
}
