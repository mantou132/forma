import { getGame, type LevelRef } from '../game';

/** Hosts the game's level element; each level gets a fresh page so state never leaks between levels */
@customElement('forma-level-page')
export class FormaLevelPageElement extends GemElement {
  @property ref?: LevelRef;

  @template()
  #render = () => (this.ref ? getGame().level(this.ref) : null);
}
