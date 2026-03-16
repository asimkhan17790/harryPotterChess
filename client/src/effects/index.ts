import * as THREE from 'three';
import type { CaptureEffect, SpellName } from './types';
import { WingardiumLeviosaEffect } from './WingardiumLeviosa';
import { ExpectoPatronumEffect } from './ExpectoPatronum';
import { TransfigurationEffect } from './Transfiguration';
import { ReductoEffect } from './Reducto';
import { AvadaKedavraEffect } from './AvadaKedavra';
import { FiendfyreEffect } from './Fiendfyre';
import { QueenSwordEffect } from './QueenSword';
import { KnightChargeEffect } from './KnightCharge';

export type { CaptureEffect, SpellName };

/** Extra args required only by the knight capture animation. */
export interface KnightChargeArgs {
  attackerGroup: THREE.Group;
  chromaticVec: THREE.Vector2;
  bloomProxy: { intensity: number };
}

/**
 * Factory — instantiates the correct spell effect for the given name.
 * `onReady` is called at the keyframe when the attacker piece should
 * begin its move animation.
 *
 * For `'knightCharge'` pass `knightArgs` with the full piece Group,
 * plus refs to the chromatic-aberration offset vector and bloom proxy.
 */
export function createCaptureEffect(
  spell: SpellName,
  group: THREE.Group,
  attackerPos: THREE.Vector3,
  victim: THREE.Mesh,
  onReady: () => void,
  knightArgs?: KnightChargeArgs,
): CaptureEffect {
  switch (spell) {
    case 'wingardiumLeviosa':
      return new WingardiumLeviosaEffect(group, attackerPos, victim, onReady);
    case 'expectoPatronum':
      return new ExpectoPatronumEffect(group, attackerPos, victim, onReady);
    case 'transfiguration':
      return new TransfigurationEffect(group, attackerPos, victim, onReady);
    case 'reducto':
      return new ReductoEffect(group, attackerPos, victim, onReady);
    case 'avadaKedavra':
      return new AvadaKedavraEffect(group, attackerPos, victim, onReady);
    case 'fiendFyre':
      return new FiendfyreEffect(group, attackerPos, victim, onReady);
    case 'queenSword':
      return new QueenSwordEffect(group, attackerPos, victim, onReady);
    case 'knightCharge': {
      const ka = knightArgs ?? {
        attackerGroup: new THREE.Group(),
        chromaticVec: new THREE.Vector2(0.0003, 0.0003),
        bloomProxy: { intensity: 0.2 },
      };
      return new KnightChargeEffect(
        group,
        ka.attackerGroup,
        victim,
        onReady,
        ka.chromaticVec,
        ka.bloomProxy,
      );
    }
  }
}
