import type { PieceSymbol } from 'chess.js';
import type { SpellName } from '../effects/types';

/** Maps the ATTACKING piece type to its capture spell. */
export const CAPTURE_ANIMATIONS: Record<PieceSymbol, SpellName> = {
  p: 'wingardiumLeviosa',
  n: 'expectoPatronum',
  b: 'transfiguration',
  r: 'reducto',
  q: 'avadaKedavra',
  k: 'fiendFyre',
};
