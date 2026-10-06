/**
 * 1000 Sabords' game pieces: what the design system has no component for. The
 * only place in this package that writes `className` and CSS — see
 * doc/technical/module-contract.md § "Game pieces live in `src/design/`".
 */
export { DieCounter, type DieCounterProps } from './DieCounter'
export { ModuleRoot } from './ModuleRoot'
export { ScorePreview, type PreviewTone, type ScorePreviewProps } from './ScorePreview'
export {
  ScoreTable,
  type CellTone,
  type ScoreCell,
  type ScoreTableProps,
  type TotalTone,
} from './ScoreTable'
