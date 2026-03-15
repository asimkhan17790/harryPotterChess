import * as THREE from 'three';
import type { CaptureEffect, SpellName } from './types';
import { WingardiumLeviosaEffect } from './WingardiumLeviosa';
import { ExpectoPatronumEffect } from './ExpectoPatronum';
import { TransfigurationEffect } from './Transfiguration';
import { ReductoEffect } from './Reducto';
import { AvadaKedavraEffect } from './AvadaKedavra';
import { FiendfyreEffect } from './Fiendfyre';

export type { CaptureEffect, SpellName };

/**
 * Factory — instantiates the correct spell effect for the given name.
 * `onReady` is called at the keyframe when the attacker piece should
 * begin its move animation.
 */
export function createCaptureEffect(
  spell: SpellName,
  group: THREE.Group,
  attackerPos: THREE.Vector3,
  victim: THREE.Mesh,
  onReady: () => void,
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
  }
}
