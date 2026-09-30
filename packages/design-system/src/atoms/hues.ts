/** The 14 Catppuccin hues, each usable as the app accent. */
export const HUES = [
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
] as const
export type Hue = (typeof HUES)[number]
