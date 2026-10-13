import { getGame } from '../game';

const DIMENSIONS = ['0D', '1D', '2D', '3D', '4D'];

/** 0D → 4D strip; the current game's jump is drawn as a lit arc */
@customElement('forma-dimension-map')
export class FormaDimensionMapElement extends GemElement {
  @template()
  #render = () => {
    const game = getGame();
    const [from, to] = game.jump.split(/\s*[→∩]\s*/).map((d) => Math.min(4, Number.parseInt(d, 10)));
    const x = (d: number) => 20 + d * 70;
    const left = Math.min(from, to);
    const right = Math.max(from, to);
    return html`
      <svg viewBox="0 0 320 64" class="w-full" role="img" aria-label="Dimension map: ${game.name} travels ${game.jump}">
        <line x1="20" y1="40" x2="300" y2="40" stroke="var(--color-line)" stroke-width="1.5"></line>
        <path
          d="M${x(left)} 40 Q ${(x(left) + x(right)) / 2} ${40 - 26 * (right - left)} ${x(right)} 40"
          fill="none"
          stroke="var(--game-accent)"
          stroke-width="1.6"
          stroke-dasharray="3 4"
        ></path>
        ${DIMENSIONS.map((label, d) => {
          const lit = d === from || d === to;
          return svg`
            <circle cx=${x(d)} cy="40" r=${lit ? 4.5 : 3} fill=${lit ? '#fff' : 'var(--color-dim)'} class=${lit ? 'glow-point' : ''}></circle>
            <text x=${x(d)} y="60" text-anchor="middle" font-family="var(--font-mono)" font-size="9" letter-spacing="1.5" fill=${lit ? 'var(--color-text)' : 'var(--color-dim)'}>${label}</text>
          `;
        })}
      </svg>
    `;
  };
}
