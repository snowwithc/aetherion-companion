/**
 * Battle flow - the heart of the Game Master.
 *
 * A ROUND = one player turn + one enemy turn (order decided by the initiative d6).
 * The UI drives the battle by calling these pure functions in order:
 *
 *   createBattle -> rollInitiative -> (startPlayerTurn -> chooseAction / placeCard) <-> runEnemyTurn ...
 *
 * Each call returns a NEW state, the events to animate, and an optional warning.
 * `state.phase` always tells the UI what to call next.
 */
import { config, getActivation, getBooster, getCharacter, getEnemy, getEpisode, getFusion, getScenario, cardName, elements } from './data';
import { activeBoosters, attacksDisabled, clearSkiesActive, formulaText, isRaging, planPlayerAttack, playerDefense, roundDmg, scenarioRules, pct } from './combat';
import { addStatus, countdownTimed, DOT_STATUSES, getStatus, hasStatus, removeStatus, STATUS_INFO } from './statuses';
import { checkZone, ZONE_FOR_TYPE, TYPE_LABEL } from './zones';
import { d6, defaultRng } from './rng';
import type {
  ActionInfo, AttackDef, BattleEvent, BattleState, DeckId, EnemyDef, EnemyMove, LogTone, MoveEffect,
  PlayerActionKind, Rng, Side, StatusId, StepResult, ZoneId,
} from './types';

// ------------------------------------------------------------------ helpers

const clone = (s: BattleState): BattleState => JSON.parse(JSON.stringify(s));
const other = (side: Side): Side => (side === 'player' ? 'enemy' : 'player');

function log(s: BattleState, tone: LogTone, text: string) {
  s.logSeq += 1;
  s.log.push({ id: s.logSeq, round: s.round, tone, text });
  if (s.log.length > config.ui.maxLogEntries) s.log.splice(0, s.log.length - config.ui.maxLogEntries);
}

const reject = (state: BattleState, warning: string): StepResult => ({ state, events: [], warning });

export const playerName = (s: BattleState) => s.player.fusion?.name ?? getCharacter(s.player.characterId).name;
export const enemyName = (s: BattleState) => getEnemy(s.enemy.enemyId).name;

/** Whose turn is it right now? */
export function currentSide(s: BattleState): Side {
  if (!s.firstSide) return 'player';
  return s.turnInRound === 0 ? s.firstSide : other(s.firstSide);
}

function isOver(s: BattleState) {
  return s.phase === 'victory' || s.phase === 'defeat';
}

/** Checks for a winner after any HP change. Returns true if the battle ended. */
function checkOutcome(s: BattleState, ev: BattleEvent[]): boolean {
  if (isOver(s)) return true;
  if (s.enemy.hp <= 0) {
    s.enemy.hp = 0;
    s.phase = 'victory';
    s.pending = null;
    log(s, 'system', `${enemyName(s)} is defeated! Wave cleared.`);
    ev.push({ type: 'outcome', result: 'victory' });
    return true;
  }
  if (s.player.hp <= 0) {
    s.player.hp = 0;
    s.phase = 'defeat';
    s.pending = null;
    log(s, 'system', `${playerName(s)} has fallen...`);
    ev.push({ type: 'outcome', result: 'defeat' });
    return true;
  }
  return false;
}

function damageSide(s: BattleState, side: Side, amount: number, ev: BattleEvent[], source: 'attack' | 'dot' | 'reflect' | 'backlash') {
  const target = side === 'player' ? s.player : s.enemy;
  target.hp = Math.max(0, target.hp - amount);
  ev.push({ type: 'damage', side, amount, source });
}

function healPlayer(s: BattleState, amount: number, ev: BattleEvent[], why: string) {
  const gain = Math.min(s.player.maxHp - s.player.hp, Math.max(0, amount));
  s.player.hp += gain;
  if (gain > 0) ev.push({ type: 'heal', side: 'player', amount: gain });
  log(s, 'heal', `${why}: +${gain} HP`);
}

function gainEnergy(s: BattleState, amount: number, ev: BattleEvent[], why: string) {
  const before = s.player.energy;
  s.player.energy = Math.max(0, Math.min(s.player.maxEnergy, s.player.energy + amount));
  const delta = s.player.energy - before;
  if (delta !== 0) ev.push({ type: 'energy', amount: delta });
  log(s, 'info', `${why}: ${delta >= 0 ? '+' : ''}${delta} Energy`);
}

function healEnemy(s: BattleState, amount: number, ev: BattleEvent[], why: string) {
  if (hasStatus(s.enemy.statuses, 'healBlock')) {
    log(s, 'status', `${enemyName(s)} tries to heal, but Heal Block stops it!`);
    return;
  }
  let heal = amount;
  if (hasStatus(s.enemy.statuses, 'healHalve')) heal = roundDmg(amount / 2);
  const gain = Math.min(s.enemy.maxHp - s.enemy.hp, heal);
  s.enemy.hp += gain;
  if (gain > 0) ev.push({ type: 'heal', side: 'enemy', amount: gain });
  log(s, 'enemy', `${enemyName(s)} ${why}: +${gain} HP${heal !== amount ? ' (halved by Spore)' : ''}`);
}

function applyStatusTo(s: BattleState, side: Side, id: StatusId, ev: BattleEvent[], opts: { value?: number; turns?: number; fresh?: boolean } = {}) {
  const fighter = side === 'player' ? s.player : s.enemy;
  fighter.statuses = addStatus(fighter.statuses, { id, value: opts.value, turns: opts.turns, fresh: opts.fresh });
  ev.push({ type: 'status', side, status: id });
  const who = side === 'player' ? playerName(s) : enemyName(s);
  const detail = opts.value !== undefined && DOT_STATUSES.includes(id) ? ` (${opts.value} HP x${opts.turns ?? 1})` : '';
  log(s, 'status', `${who} gains ${STATUS_INFO[id].name}${detail}.`);
}

/** Start-of-turn damage over time for one side. */
function tickDots(s: BattleState, side: Side, ev: BattleEvent[]) {
  const fighter = side === 'player' ? s.player : s.enemy;
  const next = [];
  for (const st of fighter.statuses) {
    if (!DOT_STATUSES.includes(st.id)) { next.push(st); continue; }
    const amount = st.value ?? 0;
    damageSide(s, side, amount, ev, 'dot');
    log(s, 'damage', `${STATUS_INFO[st.id].name} deals ${amount} to ${side === 'player' ? playerName(s) : enemyName(s)}.`);
    const turns = (st.turns ?? 1) - 1;
    if (turns > 0) next.push({ ...st, turns });
  }
  fighter.statuses = next;
}

// ------------------------------------------------------------------ setup

export interface BattleInput {
  episodeId: string;
  waveIndex: number;
  characterId: string;
  hp?: number;
  energy?: number;
}

export function createBattle(input: BattleInput): BattleState {
  const ep = getEpisode(input.episodeId);
  const def = getEnemy(ep.waves[input.waveIndex]);
  const s: BattleState = {
    version: 1,
    episodeId: input.episodeId,
    waveIndex: input.waveIndex,
    phase: 'initiative',
    round: 1,
    turnInRound: 0,
    firstSide: null,
    playerTurn: 0,
    player: {
      characterId: input.characterId,
      hp: Math.min(config.player.maxHp, input.hp ?? config.player.startHp),
      maxHp: config.player.maxHp,
      energy: Math.min(config.player.maxEnergy, input.energy ?? config.player.startEnergy),
      maxEnergy: config.player.maxEnergy,
      statuses: [],
      fusion: null,
      boosters: [],
      daybreakUsed: false,
      incomingPenalty: 1,
      cavernUsedRound: 0,
    },
    enemy: { enemyId: def.id, hp: def.hp, maxHp: def.hp, statuses: [], moveIndex: 0, usedOnce: [] },
    scenario: null,
    pending: null,
    log: [],
    logSeq: 0,
    initiativeRoll: null,
  };
  log(s, 'system', `Wave ${input.waveIndex + 1}/${ep.waves.length}: ${def.name}${def.boss ? ' (BOSS)' : ''} appears!`);
  return s;
}

/** Start-of-battle d6: 4-6 the player goes first. */
export function rollInitiative(state: BattleState, rng: Rng = defaultRng): StepResult {
  if (state.phase !== 'initiative') return reject(state, 'Initiative was already rolled.');
  const s = clone(state);
  const ev: BattleEvent[] = [];
  const roll = d6(rng);
  s.initiativeRoll = roll;
  s.firstSide = roll >= config.initiative.playerFirstMin ? 'player' : 'enemy';
  ev.push({ type: 'dice', value: roll, label: 'Initiative', success: s.firstSide === 'player' });
  log(s, 'system', `Initiative d6 = ${roll}: ${s.firstSide === 'player' ? 'you go first' : `${enemyName(s)} goes first`}.`);
  s.phase = s.firstSide === 'player' ? 'playerTurnStart' : 'enemyTurn';
  return { state: s, events: ev };
}

// ------------------------------------------------------------------ turn bookkeeping

/** Ends the current turn; at the end of a full round counts down fusion and scenario. */
function advanceTurn(s: BattleState, ev: BattleEvent[]) {
  if (isOver(s)) return;
  if (s.turnInRound === 0) {
    s.turnInRound = 1;
  } else {
    endRound(s, ev);
    s.round += 1;
    s.turnInRound = 0;
  }
  s.phase = currentSide(s) === 'player' ? 'playerTurnStart' : 'enemyTurn';
}

function endRound(s: BattleState, ev: BattleEvent[]) {
  const f = s.player.fusion;
  if (f) {
    if (f.fresh) f.fresh = false;
    else f.roundsLeft -= 1;
    if (f.roundsLeft <= 0) {
      log(s, 'info', `${f.name} fades. ${getCharacter(s.player.characterId).name} reverts to normal form.`);
      ev.push({ type: 'fusionEnd', name: f.name });
      s.player.fusion = null;
    }
  }
  const sc = s.scenario;
  if (sc) {
    if (sc.fresh) sc.fresh = false;
    else sc.roundsLeft -= 1;
    if (sc.roundsLeft <= 0) {
      log(s, 'info', `The ${getScenario(sc.scenarioId).name} scenario ends.`);
      s.scenario = null;
    }
  }
}

function endPlayerTurn(s: BattleState, ev: BattleEvent[]) {
  // Boosters that were active this turn expire now (used or not).
  s.player.boosters = s.player.boosters.filter((slot) => {
    const def = getBooster(slot.boosterId);
    if (slot.state === 'active' && def.timing === 'nextPlayerTurn') {
      if (!slot.used && !def.mods.ignoreScenarioPenalties) log(s, 'info', `${def.name} expired unused.`);
      return false;
    }
    return true;
  });
  s.player.statuses = countdownTimed(s.player.statuses);
  s.pending = null;
  advanceTurn(s, ev);
}

// ------------------------------------------------------------------ player turn

/** Start of the player's turn: activate boosters, DoT, passives, scenario effects, stun check. */
export function startPlayerTurn(state: BattleState, _rng: Rng = defaultRng): StepResult {
  if (state.phase !== 'playerTurnStart') return reject(state, 'Not the start of your turn.');
  const s = clone(state);
  const ev: BattleEvent[] = [];
  const char = getCharacter(s.player.characterId);
  s.playerTurn += 1;

  // 1) Boosters armed on an EARLIER turn become active now (never on the turn they were placed).
  for (const slot of s.player.boosters) {
    const def = getBooster(slot.boosterId);
    if (slot.state === 'armed' && def.timing === 'nextPlayerTurn' && slot.placedTurn < s.playerTurn) {
      slot.state = 'active';
      log(s, 'player', `${def.name} is active this turn.`);
    }
  }

  // 2) Damage over time.
  tickDots(s, 'player', ev);
  if (checkOutcome(s, ev)) return { state: s, events: ev };

  // 3) Passives.
  if (char.passive.id === 'regrowth' && s.player.hp < char.passive.params.belowHp) {
    healPlayer(s, char.passive.params.heal, ev, 'Regrowth');
  }

  // 4) Scenario start-of-turn effects (Desert, Rainforest).
  for (const r of scenarioRules(s, 'turnStartEnergy')) {
    if (r.element !== char.element) continue;
    const scName = getScenario(s.scenario!.scenarioId).name;
    if (r.penalty && clearSkiesActive(s)) { log(s, 'info', `Clear Skies protects you from the ${scName} penalty.`); continue; }
    gainEnergy(s, r.value ?? 0, ev, scName);
  }

  // 5) Stunned? Skip the turn.
  if (hasStatus(s.player.statuses, 'stun')) {
    s.player.statuses = removeStatus(s.player.statuses, 'stun');
    log(s, 'warn', `${playerName(s)} is stunned and skips this turn!`);
    ev.push({ type: 'banner', text: 'Stunned! Turn skipped', tone: 'bad' });
    endPlayerTurn(s, ev);
    return { state: s, events: ev };
  }

  s.phase = 'playerAction';
  log(s, 'system', `Round ${s.round} - your turn.`);
  return { state: s, events: ev };
}

/** Energy cost of an action after Boosters, Drought and Catalyst. */
export function actionCost(s: BattleState, kind: PlayerActionKind): number {
  let cost = 0;
  if (kind === 'attack') cost = config.actions.attack.cost;
  if (kind === 'raw') cost = config.actions.rawAttack.cost;
  if (kind === 'energy') cost = config.actions.energyAttack.cost;
  if (kind === 'actionCard') {
    cost = config.actions.actionCard.cost;
    for (const { def } of activeBoosters(s, 'actionCard')) if (def.mods.actionCardCost !== undefined) cost = Math.min(cost, def.mods.actionCardCost);
  }
  if ((kind === 'raw' || kind === 'energy') && s.player.fusion && !clearSkiesActive(s)) {
    for (const r of scenarioRules(s, 'fusionCostIncrease')) if (r.activation === s.player.fusion.activationId) cost += r.value ?? 0;
  }
  const discount = getStatus(s.player.statuses, 'discount');
  if (discount && kind !== 'recharge') cost = Math.max(0, cost - (discount.value ?? 0));
  return cost;
}

/** Which actions can the player take right now (with costs, reasons and damage previews)? */
export function getActions(s: BattleState): ActionInfo[] {
  const myTurn = s.phase === 'playerAction';
  const fused = !!s.player.fusion;
  const noAttacks = attacksDisabled(s);
  const make = (kind: PlayerActionKind, visible: boolean): ActionInfo => {
    const cost = actionCost(s, kind);
    let enabled = myTurn && visible;
    let reason: string | undefined;
    if (!myTurn) reason = 'Wait for your turn';
    else if (kind !== 'recharge' && s.player.energy < cost) { enabled = false; reason = `Needs ${cost} Energy`; }
    if (myTurn && noAttacks && (kind === 'attack' || kind === 'raw' || kind === 'energy')) { enabled = false; reason = 'Second Wind: no attacks this turn'; }
    let preview: number | undefined;
    if (kind === 'attack' || kind === 'raw' || kind === 'energy') {
      if (visible) preview = planPlayerAttack(s, kind, deterministicExtras(s, kind)).damage;
    }
    return { kind, visible, enabled, cost, reason, preview };
  };
  return [make('attack', true), make('actionCard', true), make('recharge', true), make('raw', fused), make('energy', fused)];
}

/** Raw/Energy attack definition for the current fusion (fusionOverrides win). */
function fusionAttack(s: BattleState, kind: 'raw' | 'energy'): AttackDef | null {
  const f = s.player.fusion;
  if (!f) return null;
  const fusion = getFusion(f.activationId, s.player.characterId);
  return fusion.override?.[kind] ?? getActivation(f.activationId)[kind];
}

/** Bonus value for signature fusions (only effects that print a number). */
const effectValue = (s: BattleState, v: number | undefined) =>
  v === undefined ? undefined : v + (s.player.fusion?.signature ? config.fusion.signatureBonus : 0);

/** Pre-damage card modifiers that need no dice (for previews). */
function deterministicExtras(s: BattleState, kind: 'attack' | 'raw' | 'energy') {
  const extras = { flat: 0, ignoreScenario: false, ignoreDefensePct: [] as number[] };
  if (kind === 'attack') return extras;
  const def = fusionAttack(s, kind);
  for (const e of def?.effects ?? []) {
    const v = effectValue(s, e.value);
    if (e.type === 'bonusDamageIfNoScenario' && !s.scenario) extras.flat += v ?? 0;
    if (e.type === 'ignoreScenario') extras.ignoreScenario = true;
    if (e.type === 'ignoreDefense') extras.ignoreDefensePct.push(v ?? 0);
  }
  return extras;
}

/** The player picks ONE action: attack, raw, energy, recharge, or actionCard (then place a card). */
export function chooseAction(state: BattleState, kind: PlayerActionKind, rng: Rng = defaultRng): StepResult {
  if (state.phase !== 'playerAction') return reject(state, state.phase === 'awaitingCard' ? 'Place your card first, or cancel the Action Card.' : 'Wait for your turn.');
  const info = getActions(state).find((a) => a.kind === kind);
  if (!info || !info.visible) return reject(state, 'That action is not available.');
  if (!info.enabled) return reject(state, info.reason ?? 'That action is not available.');

  const s = clone(state);
  const ev: BattleEvent[] = [];

  if (kind === 'actionCard') {
    s.pending = { kind: 'actionCard', cost: info.cost, deck: null };
    s.phase = 'awaitingCard';
    log(s, 'player', `Action Card (${info.cost} Energy): draw from E, F or G and place the card in Zone B, C or D.`);
    return { state: s, events: ev };
  }

  // Pay the cost (Catalyst discount is used up by any paid action).
  s.player.energy -= info.cost;
  if (kind !== 'recharge' && getStatus(s.player.statuses, 'discount')) s.player.statuses = removeStatus(s.player.statuses, 'discount');

  if (kind === 'recharge') doRecharge(s, ev);
  else doAttack(s, kind, rng, ev);

  if (!isOver(s)) endPlayerTurn(s, ev);
  return { state: s, events: ev };
}

function doRecharge(s: BattleState, ev: BattleEvent[]) {
  const char = getCharacter(s.player.characterId);
  let amount = char.recharge;
  const parts: string[] = [`${char.recharge}`];
  if (char.passive.id === 'tidalFlow') { amount += char.passive.params.extraEnergy; parts.push(`+${char.passive.params.extraEnergy} Tidal Flow`); }
  for (const r of scenarioRules(s, 'rechargeBonus')) { amount += r.value ?? 0; parts.push(`+${r.value} ${getScenario(s.scenario!.scenarioId).name}`); }
  const blocked = scenarioRules(s, 'noRecharge').some((r) => r.element === char.element);
  if (blocked && !clearSkiesActive(s)) {
    amount = 0;
    log(s, 'warn', `The ${getScenario(s.scenario!.scenarioId).name} blocks ${char.name}'s Recharge!`);
  } else if (blocked) {
    log(s, 'info', 'Clear Skies lets you Recharge despite the eclipse.');
  }
  let mult = 1;
  let heal = 0;
  for (const { slot, def } of activeBoosters(s, 'recharge')) {
    if (def.mods.rechargeMultiplier) { mult *= def.mods.rechargeMultiplier; slot.used = true; parts.push(`x${def.mods.rechargeMultiplier} ${def.name}`); }
    if (def.mods.rechargeHeal) { heal += def.mods.rechargeHeal; slot.used = true; }
  }
  amount = roundDmg(amount * mult);
  gainEnergy(s, amount, ev, `${playerName(s)} recharges (${parts.join(' ')})`);
  if (heal > 0) healPlayer(s, heal, ev, 'Second Wind');
}

function doAttack(s: BattleState, kind: 'attack' | 'raw' | 'energy', rng: Rng, ev: BattleEvent[]) {
  const char = getCharacter(s.player.characterId);
  const def = kind === 'attack' ? null : fusionAttack(s, kind);
  const label = kind === 'attack' ? 'Attack' : kind === 'raw' ? 'Raw Attack' : 'Energy Attack';

  // Pre-damage card effects.
  const extras = { flat: 0, ignoreScenario: false, ignoreDefensePct: [] as number[] };
  let lightningStun = false;
  for (const e of def?.effects ?? []) {
    const v = effectValue(s, e.value);
    if (e.type === 'stunOrBonus') {
      const roll = d6(rng);
      const ok = roll >= (e.min ?? 7);
      ev.push({ type: 'dice', value: roll, label: ok ? 'Stun!' : `+${v} dmg`, success: ok });
      if (ok) lightningStun = true;
      else extras.flat += v ?? 0;
      log(s, 'info', `Lightning d6 = ${roll}: ${ok ? 'Stun!' : `no stun, +${v} damage`}`);
    }
    if (e.type === 'bonusDamageIfNoScenario' && !s.scenario) extras.flat += v ?? 0;
    if (e.type === 'ignoreScenario') extras.ignoreScenario = true;
    if (e.type === 'ignoreDefense') extras.ignoreDefensePct.push(v ?? 0);
  }

  const plan = planPlayerAttack(s, kind, extras);
  for (const id of plan.usedBoosters) {
    const slot = s.player.boosters.find((b) => b.boosterId === id && b.state === 'active');
    if (slot) slot.used = true;
  }
  if (plan.daybreak) s.player.daybreakUsed = true;
  if (plan.chilled) s.player.statuses = removeStatus(s.player.statuses, 'chill');

  ev.push({ type: 'lunge', side: 'player', special: kind !== 'attack' });
  damageSide(s, 'enemy', plan.damage, ev, 'attack');
  const noteText = plan.notes.length ? ` [${plan.notes.join(', ')}]` : '';
  log(s, 'player', `${playerName(s)} - ${label}: ${formulaText(plan)} damage${noteText}${extras.ignoreScenario && s.scenario ? ' (ignores scenario)' : ''}`);

  if (plan.lifesteal > 0 && plan.damage > 0) healPlayer(s, roundDmg(plan.damage * plan.lifesteal), ev, 'Energy Siphon');
  if (plan.selfPenalty > 1) {
    s.player.incomingPenalty = Math.max(s.player.incomingPenalty, plan.selfPenalty);
    log(s, 'warn', `Glass Cannon: you will take x${plan.selfPenalty} damage from the enemy's next attack.`);
  }
  if (checkOutcome(s, ev)) return;

  // Post-damage card effects.
  for (const e of def?.effects ?? []) {
    const v = effectValue(s, e.value);
    switch (e.type) {
      case 'applyStatus': {
        if (!e.status) break;
        const side: Side = e.target === 'self' ? 'player' : 'enemy';
        if (e.min) {
          const roll = d6(rng);
          const ok = roll >= e.min;
          ev.push({ type: 'dice', value: roll, label: ok ? STATUS_INFO[e.status].name : 'Miss', success: ok });
          log(s, 'info', `d6 = ${roll} (needs ${e.min}+): ${ok ? STATUS_INFO[e.status].name + '!' : 'no effect'}`);
          if (!ok) break;
        }
        applyStatusTo(s, side, e.status, ev, { value: v, turns: e.turns, fresh: side === 'player' });
        break;
      }
      case 'gainEnergy':
        gainEnergy(s, v ?? 0, ev, getActivation(s.player.fusion!.activationId).name);
        break;
      case 'removeScenario':
        if (s.scenario) {
          log(s, 'info', `The ${getScenario(s.scenario.scenarioId).name} scenario is wiped away!`);
          s.scenario = null;
        }
        break;
      default:
        break;
    }
  }
  if (lightningStun) applyStatusTo(s, 'enemy', 'stun', ev);

  // Scenario attack riders (Ocean).
  if (s.scenario && !extras.ignoreScenario) {
    for (const r of scenarioRules(s, 'attackStun')) {
      if (r.element !== char.element) continue;
      const roll = d6(rng);
      const ok = roll >= (r.min ?? 7);
      ev.push({ type: 'dice', value: roll, label: ok ? 'Stun!' : 'Miss', success: ok });
      log(s, 'info', `${getScenario(s.scenario.scenarioId).name}: ${elements[char.element].name} attack d6 = ${roll}${ok ? ', Stun!' : ''}`);
      if (ok) applyStatusTo(s, 'enemy', 'stun', ev);
    }
    for (const r of scenarioRules(s, 'attackDot')) {
      if (r.element !== char.element || !r.status) continue;
      applyStatusTo(s, 'enemy', r.status, ev, { value: r.value, turns: r.turns });
    }
  }
}

/** Cancel a pending Action Card (no Energy is spent). */
export function cancelActionCard(state: BattleState): StepResult {
  if (state.phase !== 'awaitingCard') return reject(state, 'No Action Card to cancel.');
  const s = clone(state);
  s.pending = null;
  s.phase = 'playerAction';
  log(s, 'info', 'Action Card cancelled - no Energy spent.');
  return { state: s, events: [] };
}

/** Remember which draw pile the player chose (guidance only). */
export function chooseDeck(state: BattleState, deck: DeckId): StepResult {
  if (state.phase !== 'awaitingCard' || !state.pending) return reject(state, 'Choose Action Card first.');
  const s = clone(state);
  s.pending!.deck = deck;
  return { state: s, events: [] };
}

/**
 * A card was detected (stable) in a zone. Resolves it if an Action Card is pending.
 * Wrong zone / wrong time => friendly warning, state unchanged.
 */
export function placeCard(state: BattleState, zone: ZoneId, cardId: string | null): StepResult {
  if (!cardId) return { state, events: [] }; // removing a card never changes the game state
  const check = checkZone(zone, cardId);
  if (!check.ok) return reject(state, check.message);
  if (check.type === 'character') {
    if (cardId === state.player.characterId) return { state, events: [] };
    return reject(state, 'Character swaps happen between waves. Put your current Character back in Zone A.');
  }
  if (state.phase !== 'awaitingCard' || !state.pending) {
    if (isOver(state)) return { state, events: [] };
    return reject(state, state.phase === 'playerAction' ? 'Tap "Action Card" first, then place your card.' : 'Wait for your turn before placing a card.');
  }
  if (check.type === 'booster' && state.player.boosters.length >= config.boosters.maxArmed) {
    return reject(state, `You already have ${config.boosters.maxArmed} Boosters armed. Play something else.`);
  }

  const s = clone(state);
  const ev: BattleEvent[] = [];
  const cost = s.pending!.cost;
  s.player.energy -= cost;
  if (getStatus(s.player.statuses, 'discount')) s.player.statuses = removeStatus(s.player.statuses, 'discount');
  for (const { slot } of activeBoosters(s, 'actionCard')) if (getBooster(slot.boosterId).mods.actionCardCost !== undefined) slot.used = true;
  ev.push({ type: 'card', cardId });
  log(s, 'player', `Action Card: ${cardName(cardId)} placed in Zone ${zone} (-${cost} Energy).`);

  if (check.type === 'activation') setFusion(s, cardId, ev);
  if (check.type === 'booster') {
    const def = getBooster(cardId);
    s.player.boosters.push({ boosterId: cardId, placedTurn: s.playerTurn, state: 'armed', used: false });
    log(s, 'player', `${def.name} is ARMED - it takes effect ${def.timing === 'nextEnemyTurn' ? "on the enemy's next attack" : 'on your NEXT turn'}.`);
  }
  if (check.type === 'scenario') setScenario(s, cardId);

  endPlayerTurn(s, ev);
  return { state: s, events: ev };
}

function setFusion(s: BattleState, activationId: string, ev: BattleEvent[]) {
  const fusion = getFusion(activationId, s.player.characterId);
  let rounds = fusion.override?.rounds ?? config.fusion.rounds;
  for (const r of scenarioRules(s, 'fusionDurationBonus')) if (r.activation === activationId) rounds += r.value ?? 0;
  if (s.player.fusion) log(s, 'info', `${s.player.fusion.name} is replaced.`);
  s.player.fusion = { activationId, name: fusion.name, signature: !!fusion.signature, roundsLeft: rounds, fresh: true };
  ev.push({ type: 'fusion', name: fusion.name, activationId, signature: !!fusion.signature });
  log(s, 'player', `${getCharacter(s.player.characterId).name} fuses into ${fusion.name}${fusion.signature ? ' (Signature +5!)' : ''} for ${rounds} rounds. Raw Attack and Energy Attack unlocked.`);
}

function setScenario(s: BattleState, scenarioId: string) {
  const def = getScenario(scenarioId);
  if (s.scenario) log(s, 'info', `${getScenario(s.scenario.scenarioId).name} is replaced.`);
  s.scenario = { scenarioId, roundsLeft: config.scenario.rounds, fresh: true };
  const b = def.boosted.map((e) => elements[e].name).join(', ') || 'none';
  const w = def.weakened.map((e) => elements[e].name).join(', ') || 'none';
  log(s, 'player', `Scenario ${def.name} for ${config.scenario.rounds} rounds. Boosted: ${b}. Weakened: ${w}.`);
  const f = s.player.fusion;
  for (const r of def.rules) {
    if (r.type === 'fusionDurationBonus' && f && f.activationId === r.activation) {
      f.roundsLeft += r.value ?? 0;
      log(s, 'info', `${def.name}: ${f.name} lasts ${r.value} extra round.`);
    }
  }
}

// ------------------------------------------------------------------ enemy turn

export interface EnemyIntent {
  move: EnemyMove;
  /** Nominal damage incl. Rage and Chill (before your Defense). */
  damage?: number;
  note: 'stunned' | 'silenced' | null;
  raging: boolean;
  isSpecial: boolean;
}

const basicMove = (def: EnemyDef): EnemyMove => ({ name: 'Basic Attack', kind: 'basic', damage: def.basicAttack, icon: 'attack' });

/** The telegraphed next enemy move (always visible to the player). */
export function getEnemyIntent(s: BattleState): EnemyIntent {
  const def = getEnemy(s.enemy.enemyId);
  let move = def.moves[s.enemy.moveIndex];
  let note: EnemyIntent['note'] = null;
  const isSpecial = move.kind === 'special';
  if (hasStatus(s.enemy.statuses, 'stun')) note = 'stunned';
  else if (isSpecial && hasStatus(s.enemy.statuses, 'silence')) { move = basicMove(def); note = 'silenced'; }
  const raging = isRaging(s);
  let damage: number | undefined;
  if (move.damage !== undefined) {
    damage = move.damage + (raging ? def.traits!.rage!.bonus : 0) - (hasStatus(s.enemy.statuses, 'chill') ? config.statuses.chillAmount : 0);
    damage = Math.max(0, damage);
  }
  return { move, damage, note, raging, isSpecial: move.kind === 'special' };
}

function nextMoveIndex(def: EnemyDef, idx: number, usedOnce: number[]): number {
  const n = def.moves.length;
  for (let step = 1; step <= n; step++) {
    const j = (idx + step) % n;
    if (def.moves[j].once && usedOnce.includes(j)) continue;
    return j;
  }
  return idx;
}

/** Resolves one enemy attack against the player. Returns whether it landed. */
function enemyStrike(s: BattleState, move: EnemyMove, rng: Rng, ev: BattleEvent[]): boolean {
  const def = getEnemy(s.enemy.enemyId);
  const char = getCharacter(s.player.characterId);
  const notes: string[] = [];
  let base = move.damage ?? 0;
  if (isRaging(s)) { base += def.traits!.rage!.bonus; notes.push('Rage'); }
  if (hasStatus(s.enemy.statuses, 'chill')) {
    base -= config.statuses.chillAmount;
    s.enemy.statuses = removeStatus(s.enemy.statuses, 'chill');
    notes.push('Chill');
  }
  base = Math.max(0, base);
  ev.push({ type: 'lunge', side: 'enemy', special: move.kind === 'special' });

  if (char.passive.id === 'swiftStep') {
    const roll = d6(rng);
    const dodged = roll >= char.passive.params.dodgeMin;
    ev.push({ type: 'dice', value: roll, label: dodged ? 'Dodge!' : 'Swift Step', success: dodged });
    if (dodged) {
      ev.push({ type: 'dodge', side: 'player' });
      log(s, 'player', `Swift Step d6 = ${roll}: ${playerName(s)} dodges ${move.name}!`);
      s.player.incomingPenalty = 1;
      return false;
    }
    log(s, 'info', `Swift Step d6 = ${roll}: no dodge.`);
  }

  let mult = 1;
  for (const { slot, def: b } of activeBoosters(s, 'enemyAttack')) {
    if (b.mods.incomingMultiplier) { mult *= b.mods.incomingMultiplier; slot.used = true; notes.push(b.name); }
  }
  if (s.player.incomingPenalty > 1) { mult *= s.player.incomingPenalty; notes.push('Glass Cannon'); s.player.incomingPenalty = 1; }
  if (hasStatus(s.enemy.statuses, 'weaken')) { mult *= config.statuses.weakenMultiplier; notes.push('Weakened'); }
  const defense = playerDefense(s);
  let dmg = roundDmg(base * mult * (1 - defense));
  const formula = formulaText({ base, multiplier: mult, scenarioMod: 1, defense, damage: dmg });

  const fortify = getStatus(s.player.statuses, 'fortify');
  if (fortify) { dmg -= fortify.value ?? 0; s.player.statuses = removeStatus(s.player.statuses, 'fortify'); notes.push(`Fortify -${fortify.value}`); }
  const f = s.player.fusion;
  if (f && s.player.cavernUsedRound !== s.round) {
    for (const r of scenarioRules(s, 'fusionHitReduction')) {
      if (r.activation === f.activationId) { dmg -= r.value ?? 0; s.player.cavernUsedRound = s.round; notes.push(`Cavern -${r.value}`); }
    }
  }
  dmg = Math.max(0, dmg);
  damageSide(s, 'player', dmg, ev, 'attack');
  log(s, 'enemy', `${def.name} - ${move.name}: ${formula}${dmg !== roundDmg(base * mult * (1 - defense)) ? ` -> ${dmg}` : ''} damage${notes.length ? ` [${notes.join(', ')}]` : ''}`);
  return true;
}

function applyMoveEffects(s: BattleState, move: EnemyMove, rng: Rng, ev: BattleEvent[]) {
  for (const e of move.effects ?? ([] as MoveEffect[])) {
    if (e.type === 'heal') healEnemy(s, e.value ?? 0, ev, 'heals');
    if (e.type === 'drain') healEnemy(s, e.value ?? 0, ev, 'drains your energy and heals');
    if (e.type === 'applyStatus' && e.status) {
      if (e.target === 'self') { applyStatusTo(s, 'enemy', e.status, ev, { value: e.value, turns: e.turns, fresh: true }); continue; }
      if (e.min) {
        const roll = d6(rng);
        const ok = roll >= e.min;
        ev.push({ type: 'dice', value: roll, label: ok ? 'Stunned!' : 'Resisted', success: !ok });
        log(s, 'info', `${move.name} d6 = ${roll} (stuns on ${e.min}+): ${ok ? 'you are stunned!' : 'resisted'}`);
        if (!ok) continue;
      }
      applyStatusTo(s, 'player', e.status, ev, { value: e.value, turns: e.turns });
    }
  }
}

function endEnemyTurn(s: BattleState, ev: BattleEvent[]) {
  if (isOver(s)) return;
  s.player.boosters = s.player.boosters.filter((slot) => {
    const def = getBooster(slot.boosterId);
    if (slot.state === 'active' && def.timing === 'nextEnemyTurn') {
      if (!slot.used) log(s, 'info', `${def.name} expired unused.`);
      return false;
    }
    return true;
  });
  s.enemy.statuses = countdownTimed(s.enemy.statuses);
  s.enemy.moveIndex = nextMoveIndex(getEnemy(s.enemy.enemyId), s.enemy.moveIndex, s.enemy.usedOnce);
  advanceTurn(s, ev);
}

/** The enemy executes its telegraphed move, then reveals the next one. */
export function runEnemyTurn(state: BattleState, rng: Rng = defaultRng): StepResult {
  if (state.phase !== 'enemyTurn') return reject(state, 'Not the enemy turn.');
  const s = clone(state);
  const ev: BattleEvent[] = [];
  const def = getEnemy(s.enemy.enemyId);
  const char = getCharacter(s.player.characterId);

  // Defensive boosters armed last turn guard this enemy turn.
  for (const slot of s.player.boosters) {
    if (slot.state === 'armed' && getBooster(slot.boosterId).timing === 'nextEnemyTurn') slot.state = 'active';
  }

  tickDots(s, 'enemy', ev);
  if (checkOutcome(s, ev)) return { state: s, events: ev };

  if (hasStatus(s.enemy.statuses, 'stun')) {
    s.enemy.statuses = removeStatus(s.enemy.statuses, 'stun');
    log(s, 'status', `${def.name} is stunned and loses its ${def.moves[s.enemy.moveIndex].name}!`);
    ev.push({ type: 'banner', text: `${def.name} is stunned!`, tone: 'good' });
    endEnemyTurn(s, ev);
    return { state: s, events: ev };
  }

  const moveIdx = s.enemy.moveIndex;
  let move = def.moves[moveIdx];
  const wasSpecial = move.kind === 'special';
  if (wasSpecial && hasStatus(s.enemy.statuses, 'silence')) {
    s.enemy.statuses = removeStatus(s.enemy.statuses, 'silence');
    log(s, 'status', `Silenced! ${def.name} cannot use ${move.name} and makes a basic attack.`);
    move = basicMove(def);
  }
  if (move.once) s.enemy.usedOnce.push(moveIdx);
  const isSpecial = move.kind === 'special';

  if (move.damage !== undefined) {
    const landed = enemyStrike(s, move, rng, ev);
    if (landed) {
      applyMoveEffects(s, move, rng, ev);
      if (isSpecial && char.passive.id === 'coreHeat' && s.player.hp > 0) {
        const r = char.passive.params.reflect;
        damageSide(s, 'enemy', r, ev, 'reflect');
        log(s, 'player', `Core Heat reflects ${r} damage to ${def.name}!`);
      }
    }
  } else {
    ev.push({ type: 'lunge', side: 'enemy', special: true });
    log(s, 'enemy', `${def.name} uses ${move.name}.`);
    applyMoveEffects(s, move, rng, ev);
  }

  if (isSpecial) {
    const backlash = getStatus(s.enemy.statuses, 'backlash');
    if (backlash) {
      damageSide(s, 'enemy', backlash.value ?? 0, ev, 'backlash');
      log(s, 'damage', `Magma backlash burns ${def.name} for ${backlash.value}!`);
    }
  }

  if (checkOutcome(s, ev)) return { state: s, events: ev };
  endEnemyTurn(s, ev);
  return { state: s, events: ev };
}

// ------------------------------------------------------------------ small read helpers for the UI

export const zoneHint = (type: keyof typeof ZONE_FOR_TYPE) => `${TYPE_LABEL[type]} cards go in Zone ${ZONE_FOR_TYPE[type]}`;
export const defensePct = (x: number) => pct(x);
