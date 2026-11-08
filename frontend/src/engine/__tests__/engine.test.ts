/**
 * Engine rule tests. Run with:  cd frontend && CI=true yarn test --watchAll=false src/engine
 */
import {
  ALL_CARD_IDS, activations, characters, chooseAction, createBattle, episodes, getActions, getEnemyIntent,
  getFusion, placeCard, rollInitiative, runEnemyTurn, scriptedDice, seededRng, startPlayerTurn, planPlayerAttack,
  attackText, getEnemy, BattleState, Rng, StepResult, PlayerActionKind,
} from '../index';

const ok = (r: StepResult) => {
  if (r.warning) throw new Error(`Unexpected warning: ${r.warning}`);
  return r.state;
};

/** New battle where the player goes first and it is the player's action. */
function start(characterId: string, episodeId = 'ep1', waveIndex = 0): BattleState {
  let s = createBattle({ episodeId, waveIndex, characterId });
  s = ok(rollInitiative(s, scriptedDice([6])));
  expect(s.firstSide).toBe('player');
  return ok(startPlayerTurn(s));
}

/** Enemy turn + start of the next player turn. */
function cycle(s: BattleState, rng: Rng = scriptedDice([1, 1, 1, 1])): BattleState {
  expect(s.phase).toBe('enemyTurn');
  s = ok(runEnemyTurn(s, rng));
  if (s.phase === 'defeat' || s.phase === 'victory') return s;
  expect(s.phase).toBe('playerTurnStart');
  return ok(startPlayerTurn(s, rng));
}

function play(s: BattleState, cardId: string, zone: 'B' | 'C' | 'D'): BattleState {
  s = ok(chooseAction(s, 'actionCard'));
  return ok(placeCard(s, zone, cardId));
}

describe('data', () => {
  test('35 cards and 9 enemies', () => {
    expect(ALL_CARD_IDS).toHaveLength(35);
    expect(episodes.flatMap((e) => e.waves).map(getEnemy)).toHaveLength(9);
  });
  test('all 50 fusion names exist, 11 signature pairings', () => {
    let sig = 0;
    for (const a of activations) for (const c of characters) {
      const f = getFusion(a.id, c.id);
      expect(f.name).toBeTruthy();
      expect(f.name.endsWith('Form')).toBe(false);
      if (f.signature) sig++;
    }
    expect(sig).toBe(11); // Fire has two signature pairings
  });
  test('signature +5 only on numeric effects', () => {
    expect(attackText('act_fire', 'energy', true)).toContain('Burn 10');
    expect(attackText('act_fire', 'energy', false)).toContain('Burn 5');
    expect(attackText('act_wind', 'raw', true)).not.toContain('{value}');
    expect(attackText('act_magma', 'raw', true)).toContain('30%');
  });
});

describe('core actions', () => {
  test('Daybreak first attack 20, then 15; costs 15 Energy', () => {
    let s = start('char_solara');
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(60 - 20);
    expect(s.player.energy).toBe(85);
    s = cycle(s);
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(60 - 20 - 15);
  });
  test('defense reduces damage: 15 x (1-10%) = 14', () => {
    let s = start('char_aquor', 'ep1', 1);
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(80 - 14);
  });
  test('defense is capped at 40%', () => {
    const s = start('char_aquor', 'ep2', 2);
    s.enemy.statuses = [{ id: 'armorUp', value: 0.5, turns: 2 }];
    expect(planPlayerAttack(s, 'attack').defense).toBeCloseTo(0.4);
    expect(planPlayerAttack(s, 'attack').damage).toBe(9);
  });
  test('recharge +15 (Magmaros +10, Aquor +20), capped at 100', () => {
    let s = start('char_magmaros');
    s.player.energy = 50;
    s = ok(chooseAction(s, 'recharge'));
    expect(s.player.energy).toBe(60);
    let a = start('char_aquor');
    a.player.energy = 50;
    a = ok(chooseAction(a, 'recharge'));
    expect(a.player.energy).toBe(70);
    let z = start('char_zephyra');
    z.player.energy = 95;
    z = ok(chooseAction(z, 'recharge'));
    expect(z.player.energy).toBe(100);
  });
  test('only one action per turn; unaffordable actions disabled, recharge always enabled', () => {
    let s = start('char_solara');
    s.player.energy = 10;
    const acts = getActions(s);
    expect(acts.find((a) => a.kind === 'attack')!.enabled).toBe(false);
    expect(acts.find((a) => a.kind === 'actionCard')!.enabled).toBe(false);
    expect(acts.find((a) => a.kind === 'recharge')!.enabled).toBe(true);
    s = ok(chooseAction(s, 'recharge'));
    expect(chooseAction(s, 'recharge').warning).toBeTruthy();
  });
});

describe('boosters', () => {
  test('Double Strike never applies on the turn it is placed, applies next turn, then expires', () => {
    let s = start('char_aquor');
    s = play(s, 'boost_double_strike', 'C');
    expect(s.player.energy).toBe(75);
    expect(s.player.boosters[0].state).toBe('armed');
    expect(s.enemy.hp).toBe(60);
    s = cycle(s);
    expect(s.player.boosters[0].state).toBe('active');
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(60 - 30);
    expect(s.player.boosters).toHaveLength(0);
    s = cycle(s);
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(60 - 30 - 15);
  });
  test('unused booster expires at the end of the next turn', () => {
    let s = start('char_aquor');
    s = play(s, 'boost_double_strike', 'C');
    s = cycle(s);
    s = ok(chooseAction(s, 'recharge'));
    expect(s.player.boosters).toHaveLength(0);
  });
  test('Eco Shield halves the enemy next attack', () => {
    let s = start('char_zephyra', 'ep2', 0); // Coal Golem attack 12, Zephyra DEF 5%
    s = play(s, 'boost_eco_shield', 'C');
    s = ok(runEnemyTurn(s, scriptedDice([1])));
    expect(s.player.hp).toBe(100 - 6); // 12 x0.5 x0.95 = 5.7 -> 6
    expect(s.player.boosters).toHaveLength(0);
  });
  test('Efficiency Core makes the next Action Card cost 15', () => {
    let s = start('char_aquor');
    s = play(s, 'boost_efficiency_core', 'C');
    s = cycle(s);
    expect(getActions(s).find((a) => a.kind === 'actionCard')!.cost).toBe(15);
    s = play(s, 'scen_ocean', 'D');
    expect(s.player.energy).toBe(100 - 25 - 15);
  });
  test('Second Wind: x2 recharge + 10 HP, attacks disabled that turn', () => {
    let s = start('char_aquor');
    s = play(s, 'boost_second_wind', 'C');
    s = cycle(s);
    s.player.hp = 50;
    expect(getActions(s).find((a) => a.kind === 'attack')!.enabled).toBe(false);
    s = ok(chooseAction(s, 'recharge'));
    expect(s.player.energy).toBe(Math.min(100, 75 + 40));
    expect(s.player.hp).toBe(60);
  });
  test('Glass Cannon: x3 attack and x1.5 from the next enemy attack', () => {
    let s = start('char_aquor', 'ep2', 0); // Coal Golem DEF 20%
    s = play(s, 'boost_glass_cannon', 'C');
    s = cycle(s);
    const hpBefore = s.player.hp;
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(90 - 36); // 15 x3 x(1-20%) = 36
    s = ok(runEnemyTurn(s, scriptedDice([1])));
    expect(hpBefore - s.player.hp).toBe(15); // 12 x1.5 x0.85 = 15.3 -> 15
  });
  test('max 2 boosters in play', () => {
    let s = start('char_aquor');
    s.player.boosters = [
      { boosterId: 'boost_overcharge', placedTurn: 1, state: 'armed', used: false },
      { boosterId: 'boost_power_surge', placedTurn: 1, state: 'armed', used: false },
    ];
    s = ok(chooseAction(s, 'actionCard'));
    expect(placeCard(s, 'C', 'boost_double_strike').warning).toMatch(/2 Boosters/);
  });
});

describe('fusion', () => {
  test('Solar Flare: signature, 3 rounds of fused turns, then revert', () => {
    let s = start('char_solara');
    s = play(s, 'act_fire', 'B');
    expect(s.player.fusion?.name).toBe('Solar Flare');
    expect(s.player.fusion?.signature).toBe(true);
    expect(s.player.fusion?.roundsLeft).toBe(3);
    let fusedTurns = 0;
    for (let i = 0; i < 5; i++) {
      s = cycle(s);
      if (s.phase !== 'playerAction') break;
      if (s.player.fusion) {
        fusedTurns++;
        expect(getActions(s).find((a) => a.kind === 'raw')!.visible).toBe(true);
      }
      s = ok(chooseAction(s, 'recharge'));
    }
    expect(fusedTurns).toBe(3);
  });
  test('Raw Attack 20 + Scald (signature 10); Energy Attack 25 + Burn', () => {
    let s = start('char_aquor'); // Steam = signature
    s = play(s, 'act_fire', 'B');
    s = cycle(s);
    s = ok(chooseAction(s, 'raw'));
    expect(s.player.energy).toBe(100 - 25 - 20);
    expect(s.enemy.hp).toBe(60 - 20);
    expect(s.enemy.statuses.find((x) => x.id === 'scald')?.value).toBe(10);
    s = ok(runEnemyTurn(s, scriptedDice([1])));
    expect(s.enemy.hp).toBe(60 - 20 - 10);
  });
  test('new activation replaces the fusion', () => {
    let s = start('char_verdan');
    s = play(s, 'act_water', 'B');
    expect(s.player.fusion?.name).toBe('Rainforest');
    s = cycle(s);
    s = play(s, 'act_ice', 'B');
    expect(s.player.fusion?.name).toBe('Permafrost Thicket');
    expect(s.player.fusion?.roundsLeft).toBe(3);
  });
  test('Wind raw silences the next special', () => {
    let s = start('char_zephyra'); // Smog Wisp: Atk, Atk, Smog Cloud
    s = play(s, 'act_wind', 'B');
    s = cycle(s);
    s = ok(chooseAction(s, 'raw'));
    s = cycle(s); // enemy attack #2 done
    expect(getEnemyIntent(s).note).toBe('silenced');
    s = ok(chooseAction(s, 'recharge'));
    s = ok(runEnemyTurn(s, scriptedDice([1])));
    expect(s.player.statuses.find((x) => x.id === 'weaken')).toBeUndefined();
  });
});

describe('placement and enemy', () => {
  test('wrong-zone placement warns and does nothing', () => {
    let s = start('char_solara');
    s = ok(chooseAction(s, 'actionCard'));
    const r = placeCard(s, 'B', 'boost_double_strike');
    expect(r.warning).toBe('Booster cards go in Zone C');
    expect(r.state).toBe(s);
    expect(placeCard(s, 'D', 'act_fire').warning).toBe('Activation cards go in Zone B');
  });
  test('placing without an Action Card warns', () => {
    const s = start('char_solara');
    expect(placeCard(s, 'B', 'act_fire').warning).toMatch(/Action Card/);
  });
  test('enemy move list loops and intent is telegraphed', () => {
    let s = start('char_magmaros');
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      seen.push(getEnemyIntent(s).move.name);
      s = ok(chooseAction(s, 'recharge'));
      s = cycle(s);
    }
    expect(seen).toEqual(['Attack', 'Attack', 'Smog Cloud', 'Attack']);
  });
  test('scenario boosted element +20% (Desert Solar), 2 rounds', () => {
    let s = start('char_solara');
    s.player.daybreakUsed = true;
    s = play(s, 'scen_desert', 'D');
    s = cycle(s);
    s = ok(chooseAction(s, 'attack'));
    expect(s.enemy.hp).toBe(60 - 18);
    s = cycle(s);
    expect(s.scenario).not.toBeNull();
    s = ok(chooseAction(s, 'recharge'));
    s = cycle(s);
    expect(s.scenario).toBeNull();
  });
});

describe('full campaign smoke test', () => {
  test('a simple bot can play every wave to an end without errors', () => {
    const rng = seededRng(42);
    for (const ep of episodes) {
      for (let w = 0; w < ep.waves.length; w++) {
        let s = createBattle({ episodeId: ep.id, waveIndex: w, characterId: characters[w % 5].id });
        s = rollInitiative(s, rng).state;
        let guard = 0;
        while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
          if (s.phase === 'playerTurnStart') s = startPlayerTurn(s, rng).state;
          else if (s.phase === 'enemyTurn') s = runEnemyTurn(s, rng).state;
          else if (s.phase === 'playerAction') {
            const acts = getActions(s).filter((a) => a.enabled && a.visible);
            const pick = (k: PlayerActionKind) => acts.find((a) => a.kind === k);
            if (!s.player.fusion && pick('actionCard') && rng() < 0.4) {
              s = chooseAction(s, 'actionCard').state;
              const card = ['act_fire', 'act_lightning', 'boost_double_strike', 'scen_monsoon'][Math.floor(rng() * 4)];
              const zone = card.startsWith('act') ? 'B' : card.startsWith('boost') ? 'C' : 'D';
              s = placeCard(s, zone, card).state;
            } else {
              const a = pick('energy') ?? pick('raw') ?? pick('attack') ?? pick('recharge')!;
              s = chooseAction(s, a.kind, rng).state;
            }
          }
        }
        expect(['victory', 'defeat']).toContain(s.phase);
      }
    }
  });
});
