/**
 * Aetherion engine - shared types.
 * The engine is PURE TypeScript: no React, no DOM. Every function takes a state
 * and returns a NEW state plus a list of events the UI can animate.
 */

export type ElementId = 'solar' | 'hydro' | 'geothermal' | 'wind' | 'plants';
export type CardType = 'character' | 'activation' | 'booster' | 'scenario';
export type ZoneId = 'A' | 'B' | 'C' | 'D';
export type DeckId = 'E' | 'F' | 'G';
export type Side = 'player' | 'enemy';
/** Random number generator returning [0, 1). Inject a seeded one in tests. */
export type Rng = () => number;

// ---------------------------------------------------------------- data shapes

export type PassiveId = 'daybreak' | 'tidalFlow' | 'coreHeat' | 'swiftStep' | 'regrowth';

export interface CharacterDef {
  id: string;
  name: string;
  element: ElementId;
  title: string;
  defense: number;
  recharge: number;
  color: string;
  passive: { id: PassiveId; name: string; text: string; params: Record<string, number> };
  stemFact: string;
}

export type StatusId =
  | 'burn' | 'scald' | 'poison' | 'typhoon' // damage over time
  | 'stun' | 'chill' | 'weaken' | 'silence'
  | 'healBlock' | 'healHalve' | 'backlash' | 'armorUp'
  | 'fortify' | 'discount' | 'rage';

/** Effects printed on Activation cards (Raw / Energy attack riders). */
export interface CardEffect {
  type: 'applyStatus' | 'gainEnergy' | 'ignoreScenario' | 'removeScenario' | 'bonusDamageIfNoScenario' | 'stunOrBonus' | 'ignoreDefense';
  target?: 'enemy' | 'self';
  status?: StatusId;
  /** The card's printed number. Signature fusions add +signatureBonus to it. */
  value?: number;
  turns?: number;
  /** d6 threshold: the effect happens on a roll >= min. */
  min?: number;
}

export interface AttackDef { text: string; effects: CardEffect[] }

export interface ActivationDef {
  id: string;
  name: string;
  color: string;
  raw: AttackDef;
  energy: AttackDef;
}

export interface FusionCell { name: string; signature?: boolean }

export interface FusionOverride {
  raw?: AttackDef;
  energy?: AttackDef;
  defenseBonus?: number;
  rounds?: number;
}

export type BoosterAction = 'attack' | 'raw' | 'energy' | 'recharge' | 'actionCard' | 'turnStart' | 'enemyAttack';

export interface BoosterDef {
  id: string;
  name: string;
  text: string;
  timing: 'nextPlayerTurn' | 'nextEnemyTurn';
  appliesTo: BoosterAction[];
  mods: {
    damageMultiplier?: number;
    enemyDefenseMultiplier?: number;
    rechargeMultiplier?: number;
    rechargeHeal?: number;
    lifesteal?: number;
    incomingMultiplier?: number;
    actionCardCost?: number;
    disableAttacks?: boolean;
    selfIncomingMultiplier?: number;
    ignoreScenarioPenalties?: boolean;
  };
}

export interface ScenarioRule {
  type: 'attackStun' | 'attackDot' | 'turnStartEnergy' | 'fusionAttackBonus' | 'ignoreDefense' | 'fusionDurationBonus' | 'rechargeBonus' | 'fusionHitReduction' | 'noRecharge' | 'fusionCostIncrease';
  element?: ElementId;
  activation?: string;
  status?: StatusId;
  value?: number;
  turns?: number;
  min?: number;
  penalty?: boolean;
}

export interface ScenarioDef {
  id: string;
  name: string;
  color: string;
  boosted: ElementId[];
  weakened: ElementId[];
  text: string;
  rules: ScenarioRule[];
  stemFact: string;
}

export interface MoveEffect {
  type: 'applyStatus' | 'heal' | 'drain';
  target?: 'player' | 'self';
  status?: StatusId;
  value?: number;
  turns?: number;
  min?: number;
}

export type MoveIcon = 'attack' | 'poison' | 'heal' | 'shield' | 'stun' | 'burn' | 'weaken' | 'drain' | 'slam';

export interface EnemyMove {
  name: string;
  kind: 'basic' | 'special';
  damage?: number;
  icon: MoveIcon;
  text?: string;
  once?: boolean;
  effects?: MoveEffect[];
}

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  defense: number;
  basicAttack: number;
  boss?: boolean;
  finalBoss?: boolean;
  color: string;
  flavor: string;
  traits?: { rage?: { belowPct: number; bonus: number } };
  moves: EnemyMove[];
}

export interface EpisodeDef {
  id: string;
  number: number;
  name: string;
  subtitle: string;
  waves: string[];
  stemFact: string;
}

// ---------------------------------------------------------------- battle state

export interface Status {
  id: StatusId;
  value?: number;
  /** Remaining ticks (DoT) or remaining owner turns (timed statuses). */
  turns?: number;
  /** Applied during the owner's own turn: skip the first end-of-turn countdown. */
  fresh?: boolean;
}

export interface BoosterSlot {
  boosterId: string;
  /** Player turn number on which it was placed. */
  placedTurn: number;
  state: 'armed' | 'active';
  used: boolean;
}

export interface FusionState {
  activationId: string;
  name: string;
  signature: boolean;
  roundsLeft: number;
  /** True during the round it was created (that round does not count down). */
  fresh: boolean;
}

export interface ScenarioState {
  scenarioId: string;
  roundsLeft: number;
  fresh: boolean;
}

export interface PlayerState {
  characterId: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  statuses: Status[];
  fusion: FusionState | null;
  boosters: BoosterSlot[];
  /** Solara's Daybreak was already used this wave. */
  daybreakUsed: boolean;
  /** Glass Cannon penalty: multiplier for the enemy's next attack (1 = none). */
  incomingPenalty: number;
  /** Round number in which Underground Cavern's free Fortify was used. */
  cavernUsedRound: number;
}

export interface EnemyState {
  enemyId: string;
  hp: number;
  maxHp: number;
  statuses: Status[];
  /** Index of the telegraphed (next) move in the move list. */
  moveIndex: number;
  /** Indexes of once-only moves that were already used. */
  usedOnce: number[];
}

export type Phase = 'initiative' | 'playerTurnStart' | 'playerAction' | 'awaitingCard' | 'enemyTurn' | 'victory' | 'defeat';

export type LogTone = 'info' | 'player' | 'enemy' | 'damage' | 'heal' | 'status' | 'warn' | 'system';

export interface LogEntry { id: number; round: number; tone: LogTone; text: string }

export interface PendingActionCard { kind: 'actionCard'; cost: number; deck: DeckId | null }

export interface BattleState {
  version: 1;
  episodeId: string;
  waveIndex: number;
  phase: Phase;
  round: number;
  /** 0 = first turn of the round, 1 = second turn. */
  turnInRound: 0 | 1;
  firstSide: Side | null;
  /** Number of player turns that have started (used for booster timing). */
  playerTurn: number;
  player: PlayerState;
  enemy: EnemyState;
  scenario: ScenarioState | null;
  pending: PendingActionCard | null;
  log: LogEntry[];
  logSeq: number;
  initiativeRoll: number | null;
}

// ---------------------------------------------------------------- engine output

export type PlayerActionKind = 'attack' | 'raw' | 'energy' | 'recharge' | 'actionCard';

export type BattleEvent =
  | { type: 'dice'; value: number; label: string; success?: boolean }
  | { type: 'lunge'; side: Side; special?: boolean }
  | { type: 'damage'; side: Side; amount: number; source: 'attack' | 'dot' | 'reflect' | 'backlash' }
  | { type: 'heal'; side: Side; amount: number }
  | { type: 'energy'; amount: number }
  | { type: 'dodge'; side: Side }
  | { type: 'status'; side: Side; status: StatusId }
  | { type: 'card'; cardId: string }
  | { type: 'fusion'; name: string; activationId: string; signature: boolean }
  | { type: 'fusionEnd'; name: string }
  | { type: 'banner'; text: string; tone: 'info' | 'warn' | 'good' | 'bad' }
  | { type: 'outcome'; result: 'victory' | 'defeat' };

export interface StepResult {
  state: BattleState;
  events: BattleEvent[];
  /** Friendly warning when an input was rejected (state unchanged). */
  warning?: string;
}

export interface ActionInfo {
  kind: PlayerActionKind;
  visible: boolean;
  enabled: boolean;
  cost: number;
  reason?: string;
  /** Expected damage (deterministic part only) for planning. */
  preview?: number;
}
