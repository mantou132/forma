# Forma 形

A series of math puzzle games where the answer only appears after you change dimensions. It's inspired by 3Blue1Brown: some problems get easy when you lift them up a dimension, and some get clearer when you project them down.

| Game | Insight | Jump |
| --- | --- | --- |
| **Lattice** 形·铺 | A rhombus tiling of a hexagon is a stack of cubes in a corner. | 2D → 3D |
| **Shadow** 形·影 | One object can cast a circle, a square and a triangle at the same time. | 3D → 2D |
| **Time** 形·时 | A moving dot is a still line in spacetime: paths only collide if they cross at the same height in time. | 2D+t → 3D |

Every game follows the same pattern: get stuck, tilt the phone (the series-wide "change dimension" gesture), see why, and collect a theorem card.

## Development

```bash
pnpm install
pnpm -C packages/lattice dev   # http://localhost:1430
pnpm -C packages/shadow dev    # http://localhost:1431
pnpm -C packages/time dev      # http://localhost:1432
pnpm -r test
pnpm tauri:lattice ios dev
```

See [AGENTS.md](AGENTS.md) for the project layout and conventions.
