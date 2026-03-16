export type SpellName =
  | 'wingardiumLeviosa'
  | 'expectoPatronum'
  | 'transfiguration'
  | 'reducto'
  | 'avadaKedavra'
  | 'fiendFyre'
  | 'queenSword'
  | 'knightCharge';

/** Every capture-animation effect must implement this interface. */
export interface CaptureEffect {
  update(delta: number): void;
  readonly isComplete: boolean;
  /** Remove all created meshes from the group and dispose geometry/materials. */
  dispose(): void;
}
