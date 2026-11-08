/**
 * Battle controller: connects the pure engine to React.
 * - applies engine steps and plays their events as animations (in order)
 * - drives automatic phases (start of your turn, enemy turn, end of battle)
 * - turns zone events from the detector into card placements
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  cancelActionCard, cardName, cardTypeOf, chooseAction, chooseDeck, config, placeCard, rollInitiative, runEnemyTurn,
  startPlayerTurn, STATUS_INFO, type BattleEvent, type BattleState, type DeckId, type PlayerActionKind, type Side, type StepResult,
} from '@/engine';
import type { ZoneEvent } from '@/detection/types';
import { sfx } from '@/audio/sfx';

export interface FxItem { id: number; side: Side; text: string; tone: 'damage' | 'heal' | 'energy' | 'info' | 'status' }
export interface DiceShow { key: number; value: number; label: string; success?: boolean }
export interface BannerShow { key: number; text: string; tone: 'info' | 'warn' | 'good' | 'bad' }
export interface CardMoment { key: number; cardId: string; title: string; subtitle: string }

interface Callbacks {
  onEnd: (s: BattleState) => void;
  onSnapshot: (s: BattleState) => void;
}

export function useBattleController(initial: BattleState, callbacks: Callbacks) {
  const [state, setState] = useState<BattleState>(initial);
  const stateRef = useRef(initial);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const [fx, setFx] = useState<FxItem[]>([]);
  const [dice, setDice] = useState<DiceShow | null>(null);
  const [banner, setBanner] = useState<BannerShow | null>(null);
  const [moment, setMoment] = useState<CardMoment | null>(null);
  const [anim, setAnim] = useState({ playerLunge: 0, enemyLunge: 0, playerHit: 0, enemyHit: 0 });

  const timers = useRef<number[]>([]);
  const animUntil = useRef(0);
  const seq = useRef(0);
  const ended = useRef(false);

  const later = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const pushFx = useCallback((side: Side, text: string, tone: FxItem['tone']) => {
    const id = ++seq.current;
    setFx((list) => [...list.slice(-8), { id, side, text, tone }]);
    later(1400, () => setFx((list) => list.filter((f) => f.id !== id)));
  }, [later]);

  /** Shows one engine event on screen. */
  const show = useCallback((e: BattleEvent) => {
    switch (e.type) {
      case 'dice': {
        const key = ++seq.current;
        setDice({ key, value: e.value, label: e.label, success: e.success });
        sfx('dice');
        later(1300, () => setDice((d) => (d && d.key === key ? null : d)));
        break;
      }
      case 'lunge':
        setAnim((a) => (e.side === 'player' ? { ...a, playerLunge: a.playerLunge + 1 } : { ...a, enemyLunge: a.enemyLunge + 1 }));
        sfx(e.side === 'player' ? (e.special ? 'special' : 'attack') : 'enemy');
        break;
      case 'damage':
        setAnim((a) => (e.side === 'player' ? { ...a, playerHit: a.playerHit + 1 } : { ...a, enemyHit: a.enemyHit + 1 }));
        pushFx(e.side, `-${e.amount}`, 'damage');
        sfx('hit');
        break;
      case 'heal':
        pushFx(e.side, `+${e.amount} HP`, 'heal');
        sfx('heal');
        break;
      case 'energy':
        pushFx('player', `${e.amount > 0 ? '+' : ''}${e.amount} EN`, 'energy');
        sfx('energy');
        break;
      case 'dodge':
        pushFx('player', 'DODGE!', 'info');
        sfx('dodge');
        break;
      case 'status':
        pushFx(e.side, STATUS_INFO[e.status].name, 'status');
        break;
      case 'card': {
        const type = cardTypeOf(e.cardId);
        const subtitle =
          type === 'booster' ? 'Booster ARMED - it works on your next turn' : type === 'scenario' ? `Scenario active for ${config.scenario.rounds} rounds` : 'Activation card';
        setMoment({ key: ++seq.current, cardId: e.cardId, title: cardName(e.cardId), subtitle });
        sfx('card');
        break;
      }
      case 'fusion':
        setMoment((m) => (m ? { ...m, subtitle: `Fusion: ${e.name}${e.signature ? ' (Signature +5)' : ''}` } : m));
        setBanner({ key: ++seq.current, text: `FUSION: ${e.name}${e.signature ? ' ★' : ''}`, tone: 'good' });
        sfx('fusion');
        break;
      case 'fusionEnd':
        setBanner({ key: ++seq.current, text: `${e.name} fades`, tone: 'info' });
        break;
      case 'banner':
        setBanner({ key: ++seq.current, text: e.text, tone: e.tone });
        break;
      case 'outcome':
        sfx(e.result === 'victory' ? 'victory' : 'defeat');
        setBanner({ key: ++seq.current, text: e.result === 'victory' ? 'VICTORY!' : 'DEFEATED', tone: e.result === 'victory' ? 'good' : 'bad' });
        break;
      default:
        break;
    }
  }, [later, pushFx]);

  /** Plays events one after another. */
  const play = useCallback((events: BattleEvent[]) => {
    let t = 0;
    for (const e of events) {
      later(t, () => show(e));
      t += e.type === 'dice' ? 950 : e.type === 'card' ? 1500 : e.type === 'status' ? 180 : e.type === 'lunge' ? 220 : 300;
    }
    animUntil.current = Math.max(animUntil.current, Date.now() + t);
  }, [later, show]);

  const apply = useCallback((res: StepResult): boolean => {
    if (res.warning) {
      toast.warning(res.warning);
      sfx('warn');
      return false;
    }
    if (res.state === stateRef.current) return false;
    stateRef.current = res.state;
    setState(res.state);
    play(res.events);
    return true;
  }, [play]);

  // ---- automatic phases
  useEffect(() => {
    const s = state;
    const wait = (base: number) => Math.max(base, animUntil.current - Date.now() + 200);
    let id: number | undefined;
    if (s.phase === 'playerTurnStart') id = window.setTimeout(() => apply(startPlayerTurn(stateRef.current)), wait(config.ui.playerTurnDelayMs));
    else if (s.phase === 'enemyTurn') id = window.setTimeout(() => apply(runEnemyTurn(stateRef.current)), wait(config.ui.enemyTurnDelayMs));
    else if ((s.phase === 'victory' || s.phase === 'defeat') && !ended.current) {
      id = window.setTimeout(() => {
        ended.current = true;
        cbRef.current.onEnd(stateRef.current);
      }, wait(2000));
    }
    if (s.phase === 'playerAction') cbRef.current.onSnapshot(s);
    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [state, apply]);

  // ---- player inputs
  const roll = useCallback(() => apply(rollInitiative(stateRef.current)), [apply]);
  const act = useCallback((kind: PlayerActionKind) => {
    sfx('click');
    return apply(chooseAction(stateRef.current, kind));
  }, [apply]);
  const cancelCard = useCallback(() => apply(cancelActionCard(stateRef.current)), [apply]);
  const pickDeck = useCallback((deck: DeckId) => apply(chooseDeck(stateRef.current, deck)), [apply]);

  /** A stable card detection arrived from the detector (manual or camera). */
  const onZoneEvent = useCallback((e: ZoneEvent) => {
    if (!e.cardId) return;
    const s = stateRef.current;
    if (s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'initiative') return;
    apply(placeCard(s, e.zone, e.cardId));
  }, [apply]);

  const dismissMoment = useCallback(() => setMoment(null), []);

  useEffect(() => {
    if (!moment) return;
    const key = moment.key;
    const id = window.setTimeout(() => setMoment((m) => (m && m.key === key ? null : m)), 2200);
    return () => window.clearTimeout(id);
  }, [moment]);

  useEffect(() => {
    if (!banner) return;
    const key = banner.key;
    const id = window.setTimeout(() => setBanner((b) => (b && b.key === key ? null : b)), 1800);
    return () => window.clearTimeout(id);
  }, [banner]);

  return { state, fx, dice, banner, moment, anim, roll, act, cancelCard, pickDeck, onZoneEvent, dismissMoment };
}
