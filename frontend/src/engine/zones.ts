/** Mat zones and card-type rules. Zones E-G are physical draw piles (never scanned). */
import { cardTypeOf } from './data';
import type { CardType, DeckId, ZoneId } from './types';

export const ZONES: ZoneId[] = ['A', 'B', 'C', 'D'];

export const ZONE_FOR_TYPE: Record<CardType, ZoneId> = { character: 'A', activation: 'B', booster: 'C', scenario: 'D' };
export const TYPE_FOR_ZONE: Record<ZoneId, CardType> = { A: 'character', B: 'activation', C: 'booster', D: 'scenario' };
export const DECK_FOR_TYPE: Record<Exclude<CardType, 'character'>, DeckId> = { activation: 'E', booster: 'F', scenario: 'G' };
export const TYPE_FOR_DECK: Record<DeckId, Exclude<CardType, 'character'>> = { E: 'activation', F: 'booster', G: 'scenario' };
export const ZONE_FOR_DECK: Record<DeckId, ZoneId> = { E: 'B', F: 'C', G: 'D' };

export const TYPE_LABEL: Record<CardType, string> = {
  character: 'Character',
  activation: 'Activation',
  booster: 'Booster',
  scenario: 'Scenario',
};

export type ZoneCheck = { ok: true; type: CardType } | { ok: false; message: string; type: CardType | null };

/** Is this card allowed in this zone? Returns a friendly warning when not. */
export function checkZone(zone: ZoneId, cardId: string): ZoneCheck {
  const type = cardTypeOf(cardId);
  if (!type) return { ok: false, type: null, message: 'Unknown card - try placing it again.' };
  const expected = ZONE_FOR_TYPE[type];
  if (expected !== zone) return { ok: false, type, message: `${TYPE_LABEL[type]} cards go in Zone ${expected}` };
  return { ok: true, type };
}
