import type { ShadowLevel } from '../model/levels';
import { hull } from '../model/voxels';
import { ShadowScene } from './scene';

const style = css`
  :scope {
    display: block;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

/** Non-interactive sculpture for the title screen and cards: the finished object, slowly turning */
@customElement('shadow-model')
@adoptedStyle(style)
export class ShadowModelElement extends GemElement {
  @property level?: ShadowLevel;

  #scene = new ShadowScene();

  @mounted()
  #mount = () => {
    if (!this.level) return;
    const { n, targets } = this.level;
    this.append(this.#scene.canvas);
    this.#scene.build(n, hull(n, targets), targets);
    const observer = new ResizeObserver(([entry]) =>
      this.#scene.resize(entry.contentRect.width, entry.contentRect.height),
    );
    observer.observe(this);
    let direction = 1;
    let swing = 0;
    const timer = setInterval(() => {
      swing += direction;
      if (Math.abs(swing) > 70) direction = -direction;
      this.#scene.orbitBy(direction * 0.8, 0);
    }, 33);
    return () => {
      clearInterval(timer);
      observer.disconnect();
      this.#scene.dispose();
    };
  };
}
