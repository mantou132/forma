/** Face colours for both views; fills transition so the shift from flat to lit sweeps down the board */
export const boardStyle = css`
  .board {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    transition:
      transform 0.9s var(--ease-spring),
      filter 0.9s;
  }
  .f-flat {
    --ft: #f4c95d;
    --fr: #ef6f6c;
    --fl: #5bc0be;
    --edge: #0b0c14;
    --ew: 1.8;
  }
  .f-lit {
    --ft: #eef0ff;
    --fr: #7b86ff;
    --fl: #363cb8;
    --edge: rgb(8 9 30 / 0.5);
    --ew: 0.5;
  }
  .board.f-lit {
    transform: perspective(900px) rotateX(calc(var(--tilt-y, 0) * 7deg)) rotateY(calc(var(--tilt-x, 0) * -7deg))
      scale(1.04) translateY(-6px);
    filter: drop-shadow(0 34px 40px color-mix(in srgb, var(--game-accent-deep) 70%, transparent));
  }
  .face {
    stroke: var(--edge);
    stroke-width: var(--ew);
    stroke-linejoin: round;
    transition:
      fill 0.7s ease calc(var(--d, 0) * 450ms),
      stroke 0.7s ease calc(var(--d, 0) * 450ms),
      stroke-width 0.7s ease calc(var(--d, 0) * 450ms);
  }
  .t {
    fill: var(--ft);
  }
  .r {
    fill: var(--fr);
  }
  .l {
    fill: var(--fl);
  }
  .ghost {
    pointer-events: none;
    animation: ghost 0.42s ease-in forwards;
  }
  @keyframes ghost {
    to {
      opacity: 0;
      transform: rotate(60deg) scale(0.7);
    }
  }
`;

/** Pointer position in the SVG's own coordinates */
export const svgPoint = (svg: SVGSVGElement, { clientX, clientY }: { clientX: number; clientY: number }) => {
  const point = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse());
  return [point.x, point.y] as [number, number];
};
