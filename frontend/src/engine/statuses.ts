/**
 * Status effects: definitions, merging rules and countdown helpers.
 *
 * Three families:
 *  - DOT (burn, scald, poison, typhoon): deal `value` HP at the start of the owner's turn, `turns` ticks.
 *  - TIMED (weaken, healBlock, healHalve, backlash, armorUp): last `turns` of the OWNER's turns,
 *    counted down at the end of each owner turn (a status the owner gave itself skips the first countdown).
 *  - CONSUMABLE (stun, chill, silence, fortify, discount): stay until they are used up.
 */
import type { Status, StatusId } from './types';

export const DOT_STATUSES: StatusId[] = ['burn', 'scald', 'poison', 'typhoon'];
export const TIMED_STATUSES: StatusId[] = ['weaken', 'healBlock', 'healHalve', 'backlash', 'armorUp'];

export interface StatusInfo { name: string; description: string; harmful: boolean }

/** Display info for every status (used by the UI pills and the Card Library). */
export const STATUS_INFO: Record<StatusId, StatusInfo> = {
  burn: { name: 'Burn', description: 'Takes HP damage at the start of each of its turns.', harmful: true },
  scald: { name: 'Scald', description: 'Takes HP damage at the start of its next turn.', harmful: true },
  poison: { name: 'Poison', description: 'Takes HP damage at the start of each of its turns.', harmful: true },
  typhoon: { name: 'Typhoon', description: 'A storm deals HP damage at the start of each of its turns.', harmful: true },
  stun: { name: 'Stun', description: 'Skips its next turn.', harmful: true },
  chill: { name: 'Chill', description: 'Its next attack deals 5 less damage.', harmful: true },
  weaken: { name: 'Weaken', description: 'Deals 25% less damage for 1 turn.', harmful: true },
  silence: { name: 'Silence', description: 'Its next special or heal move becomes a basic attack.', harmful: true },
  healBlock: { name: 'Heal Block', description: 'Cannot heal during its next turn.', harmful: true },
  healHalve: { name: 'Spored', description: 'All its healing is halved.', harmful: true },
  backlash: { name: 'Backlash', description: 'Takes HP damage every time it uses a special move.', harmful: true },
  armorUp: { name: 'Armor Up', description: '+Defense for a few rounds.', harmful: false },
  fortify: { name: 'Fortify', description: 'Takes less damage from the next hit.', harmful: false },
  discount: { name: 'Catalyst', description: 'Your next action costs less Energy.', harmful: false },
  rage: { name: 'Rage', description: 'Below 50% HP: +5 damage on all attacks.', harmful: false },
};

export const getStatus = (list: Status[], id: StatusId) => list.find((s) => s.id === id);
export const hasStatus = (list: Status[], id: StatusId) => list.some((s) => s.id === id);
export const removeStatus = (list: Status[], id: StatusId) => list.filter((s) => s.id !== id);

/** Adds a status, merging with an existing one of the same id (keeps the stronger / longer). */
export function addStatus(list: Status[], incoming: Status): Status[] {
  const existing = getStatus(list, incoming.id);
  if (!existing) return [...list, { ...incoming }];
  const merged: Status = {
    id: incoming.id,
    value: Math.max(existing.value ?? 0, incoming.value ?? 0) || undefined,
    turns: Math.max(existing.turns ?? 0, incoming.turns ?? 0) || undefined,
    fresh: incoming.fresh,
  };
  return list.map((s) => (s.id === incoming.id ? merged : s));
}

/** End-of-owner-turn countdown for TIMED statuses. */
export function countdownTimed(list: Status[]): Status[] {
  const out: Status[] = [];
  for (const s of list) {
    if (!TIMED_STATUSES.includes(s.id)) { out.push(s); continue; }
    if (s.fresh) { out.push({ ...s, fresh: false }); continue; }
    const turns = (s.turns ?? 1) - 1;
    if (turns > 0) out.push({ ...s, turns });
  }
  return out;
}
