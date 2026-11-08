/**
 * Typed access to the editable JSON game data in /src/data.
 * All balance numbers come from these files - change the JSON, not the code.
 */
import configJson from '../data/config.json';
import charactersJson from '../data/characters.json';
import activationsJson from '../data/activations.json';
import fusionsJson from '../data/fusions.json';
import boostersJson from '../data/boosters.json';
import scenariosJson from '../data/scenarios.json';
import enemiesJson from '../data/enemies.json';
import campaignJson from '../data/campaign.json';
import type {
  ActivationDef, BoosterDef, CardType, CharacterDef, ElementId, EnemyDef, EpisodeDef,
  FusionCell, FusionOverride, ScenarioDef,
} from './types';

export const config = configJson;
export type GameConfig = typeof configJson;

export const characters = charactersJson.characters as unknown as CharacterDef[];
export const elements = charactersJson.elements as Record<ElementId, { name: string; color: string }>;
export const activations = activationsJson.activations as unknown as ActivationDef[];
export const boosters = boostersJson.boosters as unknown as BoosterDef[];
export const scenarios = scenariosJson.scenarios as unknown as ScenarioDef[];
export const enemies = enemiesJson.enemies as unknown as EnemyDef[];
export const episodes = campaignJson.episodes as unknown as EpisodeDef[];
export const fusionMatrix = fusionsJson.matrix as unknown as Record<string, Record<ElementId, FusionCell>>;
export const fusionOverrides = fusionsJson.fusionOverrides as unknown as Record<string, FusionOverride>;

export const ELEMENT_ORDER: ElementId[] = ['solar', 'hydro', 'geothermal', 'wind', 'plants'];

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const charMap = byId(characters);
const actMap = byId(activations);
const boostMap = byId(boosters);
const scenMap = byId(scenarios);
const enemyMap = byId(enemies);
const epMap = byId(episodes);

function must<T>(v: T | undefined, what: string): T {
  if (!v) throw new Error(`Unknown ${what}`);
  return v;
}

export const getCharacter = (id: string) => must(charMap.get(id), `character ${id}`);
export const getActivation = (id: string) => must(actMap.get(id), `activation ${id}`);
export const getBooster = (id: string) => must(boostMap.get(id), `booster ${id}`);
export const getScenario = (id: string) => must(scenMap.get(id), `scenario ${id}`);
export const getEnemy = (id: string) => must(enemyMap.get(id), `enemy ${id}`);
export const getEpisode = (id: string) => must(epMap.get(id), `episode ${id}`);
export const findCharacter = (id: string) => charMap.get(id);

/** All 35 card ids in the same order as the classifier labels. */
export const ALL_CARD_IDS: string[] = [
  ...characters.map((c) => c.id),
  ...activations.map((a) => a.id),
  ...boosters.map((b) => b.id),
  ...scenarios.map((s) => s.id),
];

/** Card type from its id prefix (char_, act_, boost_, scen_). */
export function cardTypeOf(cardId: string): CardType | null {
  if (charMap.has(cardId)) return 'character';
  if (actMap.has(cardId)) return 'activation';
  if (boostMap.has(cardId)) return 'booster';
  if (scenMap.has(cardId)) return 'scenario';
  return null;
}

export function cardName(cardId: string): string {
  return (
    charMap.get(cardId)?.name ?? actMap.get(cardId)?.name ?? boostMap.get(cardId)?.name ?? scenMap.get(cardId)?.name ?? cardId
  );
}

export function cardColor(cardId: string): string {
  return (
    charMap.get(cardId)?.color ?? actMap.get(cardId)?.color ?? scenMap.get(cardId)?.color ?? (boostMap.has(cardId) ? '#E9B23A' : '#5EC8E5')
  );
}

/** Fusion name + signature flag for an activation card and a character. */
export function getFusion(activationId: string, characterId: string): FusionCell & { key: string; override?: FusionOverride } {
  const element = getCharacter(characterId).element;
  const cell = fusionMatrix[activationId]?.[element];
  const key = `${activationId}+${element}`;
  return { name: cell?.name ?? `${getActivation(activationId).name} Form`, signature: !!cell?.signature, key, override: fusionOverrides[key] };
}

/** Effect text with the {value} placeholder filled (signature fusions get the bonus). */
export function attackText(activationId: string, which: 'raw' | 'energy', signature: boolean): string {
  const def = getActivation(activationId)[which];
  const withValue = def.effects.find((e) => typeof e.value === 'number');
  const value = withValue?.value !== undefined ? withValue.value + (signature ? config.fusion.signatureBonus : 0) : undefined;
  return value !== undefined ? def.text.replace('{value}', String(value)) : def.text;
}
