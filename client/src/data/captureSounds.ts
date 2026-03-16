import type { SpellName } from '../effects/types';

export interface SpellSounds {
  cast: string;
  impact: string;
}

/** Sound file paths under /public/audio/spells/. */
export const CAPTURE_SOUNDS: Record<SpellName, SpellSounds> = {
  wingardiumLeviosa: {
    cast: '/audio/spells/wingardium_cast.mp3',
    impact: '/audio/spells/levitate_shatter.mp3',
  },
  expectoPatronum: {
    cast: '/audio/spells/expecto_cast.mp3',
    impact: '/audio/spells/patronus_charge.mp3',
  },
  transfiguration: {
    cast: '/audio/spells/transfig_cast.mp3',
    impact: '/audio/spells/stone_crumble.mp3',
  },
  reducto: {
    cast: '/audio/spells/reducto_cast.mp3',
    impact: '/audio/spells/explosion.mp3',
  },
  avadaKedavra: {
    cast: '/audio/spells/avada_cast.mp3',
    impact: '/audio/spells/avada_impact.mp3',
  },
  fiendFyre: {
    cast: '/audio/spells/fiendfyre_cast.mp3',
    impact: '/audio/spells/fiendfyre_roar.mp3',
  },
  queenSword: {
    cast: '/audio/spells/sword_unsheathe.mp3',
    impact: '/audio/spells/sword_impact.mp3',
  },
  knightCharge: {
    cast: '/audio/spells/horse_charge.mp3',
    impact: '/audio/spells/sword_impact.mp3',
  },
};
