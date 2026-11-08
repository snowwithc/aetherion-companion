/** Icons for elements, activation cards, enemy moves and statuses (lucide-react). */
import {
  Atom, BatteryCharging, Ban, Biohazard, Droplet, Droplets, Flame, FlameKindling, FlaskConical, Hammer, HeartPulse,
  Leaf, Magnet, Mountain, Shield, ShieldCheck, Skull, Snowflake, Sparkles, Sprout, Sun, Swords, Timer, TrendingDown,
  Wind, Zap, Tag, type LucideIcon,
} from 'lucide-react';
import type { ElementId, MoveIcon, StatusId } from '@/engine';

export const ELEMENT_ICON: Record<ElementId, LucideIcon> = {
  solar: Sun,
  hydro: Droplet,
  geothermal: Flame,
  wind: Wind,
  plants: Leaf,
};

export const ACTIVATION_ICON: Record<string, LucideIcon> = {
  act_fire: Flame,
  act_wind: Wind,
  act_water: Droplets,
  act_ice: Snowflake,
  act_lightning: Zap,
  act_earth: Mountain,
  act_sunlight: Sun,
  act_magma: FlameKindling,
  act_spore: Sprout,
  act_catalyst: FlaskConical,
};

export const MOVE_ICON: Record<MoveIcon, LucideIcon> = {
  attack: Swords,
  poison: Biohazard,
  heal: HeartPulse,
  shield: Shield,
  stun: Zap,
  burn: Flame,
  weaken: TrendingDown,
  drain: Magnet,
  slam: Hammer,
};

export const STATUS_ICON: Record<StatusId, LucideIcon> = {
  burn: Flame,
  scald: Flame,
  poison: Biohazard,
  typhoon: Wind,
  stun: Zap,
  chill: Snowflake,
  weaken: TrendingDown,
  silence: Ban,
  healBlock: Ban,
  healHalve: Sprout,
  backlash: FlameKindling,
  armorUp: ShieldCheck,
  fortify: Mountain,
  discount: Tag,
  rage: Skull,
};

export { Atom, BatteryCharging, Sparkles, Timer };
