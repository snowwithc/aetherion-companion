/**
 * Combat math. The core formula (section 5 of the spec):
 *
 *   damage = round(base x attackMultiplier x scenarioModifier x (1 - enemyDefense))
 *
 * - base: action damage (15 / 20 / 25) plus flat card bonuses, minus Chill.
 * - attackMultiplier: Booster multipliers x Weaken (0.75).
 * - scenarioModifier: 1.2 boosted element, 0.8 weakened element, 1 otherwise.
 * - enemyDefense: base + Armor Up, halved by Armor Breaker, reduced by "ignore X% Defense", capped at 40%.
 */
import { config, getBooster, getCharacter, getEnemy, getFusion, getScenario } from './data';
import { getStatus } from './statuses';
import type { BattleState, BoosterAction, BoosterDef, BoosterSlot, ScenarioRule, ElementId } from './types';

/** Round half up, robust to floating point noise (22.4999999 -> 22, 22.5 -> 23). */
export const roundDmg = (x: number) => Math.round(x + 1e-9);
export const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/, ''));

export function playerElement(s: BattleState): ElementId {
  return getCharacter(s.player.characterId).element;
}

/** Active (not merely armed) boosters that modify the given action. */
export function activeBoosters(s: BattleState, action: BoosterAction): { slot: BoosterSlot; def: BoosterDef }[] {
  return s.player.boosters
    .filter((slot) => slot.state === 'active')
    .map((slot) => ({ slot, def: getBooster(slot.boosterId) }))
    .filter(({ def }) => def.appliesTo.includes(action));
}

/** Clear Skies is active this turn (ignore scenario penalties). */
export function clearSkiesActive(s: BattleState): boolean {
  return s.player.boosters.some((slot) => slot.state === 'active' && !!getBooster(slot.boosterId).mods.ignoreScenarioPenalties);
}

/** Rules of the active scenario with the given type. */
export function scenarioRules(s: BattleState, type: ScenarioRule['type']): ScenarioRule[] {
  if (!s.scenario) return [];
  return getScenario(s.scenario.scenarioId).rules.filter((r) => r.type === type);
}

/** Second Wind (or any booster with disableAttacks) is active. */
export function attacksDisabled(s: BattleState): boolean {
  return s.player.boosters.some((slot) => slot.state === 'active' && !!getBooster(slot.boosterId).mods.disableAttacks);
}

export function playerDefense(s: BattleState): number {
  let base = getCharacter(s.player.characterId).defense;
  const f = s.player.fusion;
  if (f) base += getFusion(f.activationId, s.player.characterId).override?.defenseBonus ?? 0;
  return Math.min(config.defenseCap, Math.max(0, base));
}

export function enemyBaseDefense(s: BattleState): number {
  const armor = getStatus(s.enemy.statuses, 'armorUp')?.value ?? 0;
  return getEnemy(s.enemy.enemyId).defense + armor;
}

export function isRaging(s: BattleState): boolean {
  const rage = getEnemy(s.enemy.enemyId).traits?.rage;
  return !!rage && s.enemy.hp > 0 && s.enemy.hp < s.enemy.maxHp * rage.belowPct;
}

/** Scenario damage modifier for an element (1.2 / 0.8 / 1). */
export function scenarioModifier(s: BattleState, element: ElementId, ignoreScenario: boolean, clearSkies: boolean): number {
  if (!s.scenario || ignoreScenario) return 1;
  const sc = getScenario(s.scenario.scenarioId);
  if (sc.boosted.includes(element)) return config.scenario.boostedMultiplier;
  if (sc.weakened.includes(element)) return clearSkies ? 1 : config.scenario.weakenedMultiplier;
  return 1;
}

export interface AttackPlan {
  base: number;
  multiplier: number;
  scenarioMod: number;
  defense: number;
  damage: number;
  notes: string[];
  usedBoosters: string[];
  lifesteal: number;
  selfPenalty: number;
  daybreak: boolean;
  chilled: boolean;
}

export interface AttackExtras {
  flat?: number;
  ignoreScenario?: boolean;
  ignoreDefensePct?: number[];
}

/** Computes a player attack without changing the state (also used for button previews). */
export function planPlayerAttack(s: BattleState, kind: 'attack' | 'raw' | 'energy', extras: AttackExtras = {}): AttackPlan {
  const char = getCharacter(s.player.characterId);
  const notes: string[] = [];
  const fusion = s.player.fusion;
  const ignoreScenario = !!extras.ignoreScenario;
  const clearSkies = clearSkiesActive(s);

  let base = kind === 'attack' ? config.actions.attack.damage : kind === 'raw' ? config.actions.rawAttack.damage : config.actions.energyAttack.damage;
  let daybreak = false;
  if (kind === 'attack' && char.passive.id === 'daybreak' && !s.player.daybreakUsed) {
    base = char.passive.params.firstAttackDamage;
    daybreak = true;
    notes.push('Daybreak');
  }
  let flat = extras.flat ?? 0;
  if (!ignoreScenario && fusion && kind !== 'attack') {
    for (const r of scenarioRules(s, 'fusionAttackBonus')) {
      if (r.activation === fusion.activationId) {
        flat += r.value ?? 0;
        notes.push(`${getScenario(s.scenario!.scenarioId).name} +${r.value}`);
      }
    }
  }
  const chilled = !!getStatus(s.player.statuses, 'chill');
  if (chilled) { flat -= config.statuses.chillAmount; notes.push('Chill'); }
  const raw = Math.max(0, base + flat);

  let multiplier = 1;
  let defMultiplier = 1;
  let lifesteal = 0;
  let selfPenalty = 1;
  const usedBoosters: string[] = [];
  for (const { def } of activeBoosters(s, kind)) {
    const m = def.mods;
    let used = false;
    if (m.damageMultiplier) { multiplier *= m.damageMultiplier; used = true; }
    if (m.enemyDefenseMultiplier !== undefined) { defMultiplier *= m.enemyDefenseMultiplier; used = true; }
    if (m.lifesteal) { lifesteal = Math.max(lifesteal, m.lifesteal); used = true; }
    if (m.selfIncomingMultiplier) { selfPenalty = Math.max(selfPenalty, m.selfIncomingMultiplier); }
    if (used) { usedBoosters.push(def.id); notes.push(def.name); }
  }
  if (getStatus(s.player.statuses, 'weaken')) { multiplier *= config.statuses.weakenMultiplier; notes.push('Weakened'); }

  const scenarioMod = scenarioModifier(s, char.element, ignoreScenario, clearSkies);

  let defense = enemyBaseDefense(s) * defMultiplier;
  const ignores = [...(extras.ignoreDefensePct ?? [])];
  if (!ignoreScenario) {
    for (const r of scenarioRules(s, 'ignoreDefense')) if (r.element === char.element) ignores.push(r.value ?? 0);
  }
  for (const p of ignores) defense *= 1 - p / 100;
  defense = Math.min(config.defenseCap, Math.max(0, defense));

  const damage = roundDmg(raw * multiplier * scenarioMod * (1 - defense));
  return { base: raw, multiplier, scenarioMod, defense, damage, notes, usedBoosters, lifesteal, selfPenalty, daybreak, chilled };
}

/** Human readable formula for the combat log, e.g. "15 x1.2 scenario -10% DEF = 16". */
export function formulaText(p: { base: number; multiplier: number; scenarioMod: number; defense: number; damage: number }): string {
  let t = `${p.base}`;
  if (p.multiplier !== 1) t += ` x${fmt(p.multiplier)}`;
  if (p.scenarioMod !== 1) t += ` x${fmt(p.scenarioMod)} scenario`;
  if (p.defense > 0) t += ` -${pct(p.defense)} DEF`;
  return `${t} = ${p.damage}`;
}
