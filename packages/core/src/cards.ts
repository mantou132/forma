/** Every game in the series, in dimension-map order; only shipped games have cards so far */
export const SERIES = [
  { id: 'lattice', name: 'Lattice', zh: '铺', jump: '2D → 3D' },
  { id: 'shadow', name: 'Shadow', zh: '影', jump: '3D → 2D' },
  { id: 'time', name: 'Time', zh: '时', jump: '2D+t → 3D' },
  { id: 'knot', name: 'Knot', zh: '结', jump: '2D → 3D' },
  { id: 'cone', name: 'Cone', zh: '锥', jump: '3D ∩ 2D' },
  { id: 'quasicrystal', name: 'Quasicrystal', zh: '晶', jump: '5D → 2D' },
  { id: 'tesseract', name: 'Tesseract', zh: '四', jump: '4D → 3D' },
] as const;

export type GameId = (typeof SERIES)[number]['id'];

export type TheoremCard = {
  id: string;
  game: GameId;
  title: string;
  text: string;
};

export const CARDS: TheoremCard[] = [
  {
    id: 'lattice-flip',
    game: 'lattice',
    title: 'One Flip, One Cube',
    text: 'Every flip of a small hexagon is a single cube, added or removed.',
  },
  {
    id: 'lattice-count',
    game: 'lattice',
    title: 'The Cube Count',
    text: 'However you tile a hexagon with sides a, b, c, the three tile directions appear exactly ab, bc and ca times — the floor and two walls of the box.',
  },
  {
    id: 'lattice-distance',
    game: 'lattice',
    title: 'The Shortest Way',
    text: 'The fewest flips between two tilings is the number of cubes in which their stacks differ.',
  },
  {
    id: 'lattice-gravity',
    game: 'lattice',
    title: 'Gravity',
    text: 'A flip that seems forbidden is a cube with nothing to rest on. Stacks only grow into the corner.',
  },
  {
    id: 'lattice-stairs',
    game: 'lattice',
    title: 'Impossible Stairs',
    text: 'Every staircase you can draw with these tiles is a real one. Seen whole, the impossible becomes a walk.',
  },
  {
    id: 'lattice-parity',
    game: 'lattice',
    title: 'Two Kinds of Triangle',
    text: 'Every tile covers one ▷ and one ◁. If a region has more of one than the other, no tiling exists — ever.',
  },
  {
    id: 'lattice-form',
    game: 'lattice',
    title: '形',
    text: 'Seen flat, a character. Seen whole, a pile of cubes in a corner.',
  },
  {
    id: 'shadow-through',
    game: 'shadow',
    title: 'Straight Through',
    text: 'Look straight along an axis and depth disappears: one carve removes a whole line of cubes.',
  },
  {
    id: 'shadow-hull',
    game: 'shadow',
    title: 'Where Shadows Meet',
    text: 'The largest object with given shadows is the intersection of their extrusions.',
  },
  {
    id: 'shadow-plug',
    game: 'shadow',
    title: 'The Plug',
    text: 'One object can cast a circle, a square and a triangle — at the same time.',
  },
  {
    id: 'shadow-sparse',
    game: 'shadow',
    title: 'Shadows Lie',
    text: 'Many objects share the same three shadows. The fewest cubes that cast them is a puzzle of its own.',
  },
  {
    id: 'shadow-form',
    game: 'shadow',
    title: '形',
    text: 'A sculpture that only means something from one side.',
  },
  {
    id: 'time-worldline',
    game: 'time',
    title: 'Worldlines',
    text: 'A moving dot is a still line in spacetime. Time is just one more direction.',
  },
  {
    id: 'time-crossing',
    game: 'time',
    title: 'Crossing',
    text: 'Paths that cross on the map only meet if they cross at the same height in time.',
  },
  {
    id: 'time-braid',
    game: 'time',
    title: 'Braids',
    text: 'Dots that dance around each other weave a braid. The order they pass in is its shape.',
  },
  {
    id: 'time-order',
    game: 'time',
    title: 'Who Goes First',
    text: 'In a single lane, order is everything: one worldline has to pass above the other.',
  },
  {
    id: 'time-patrol',
    game: 'time',
    title: 'Still Walls',
    text: 'A patrol moving through time is a fixed wall in spacetime. You only have to find the gap.',
  },
  {
    id: 'time-form',
    game: 'time',
    title: '形',
    text: 'Seen from above, a street map. Seen through time, a sculpture.',
  },
];

export const getCard = (id: string) => CARDS.find((card) => card.id === id);

/** Card number within its own game, starting at 1 */
export const cardNumber = (card: TheoremCard) => CARDS.filter((c) => c.game === card.game).indexOf(card) + 1;
