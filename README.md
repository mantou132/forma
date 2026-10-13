# Forma 形

A series of math puzzle games where the answer only appears after you change dimensions. It's inspired by 3Blue1Brown: some problems get easy when you lift them up a dimension, and some get clearer when you project them down.

| Game | Insight | Jump |
| --- | --- | --- |
| **Lattice** 形·铺 | A rhombus tiling of a hexagon is a stack of cubes in a corner. | 2D → 3D |
| **Shadow** 形·影 | One object can cast a circle, a square and a triangle at the same time. | 3D → 2D |

Every game follows the same pattern: get stuck, tilt the phone (the series-wide "change dimension" gesture), see why, and collect a theorem card.

## Development

```bash
pnpm install
pnpm -C packages/lattice dev   # http://localhost:1430
pnpm -C packages/shadow dev    # http://localhost:1431
pnpm -r test
pnpm tauri:lattice ios dev
```

See [AGENTS.md](AGENTS.md) for the project layout and conventions.
