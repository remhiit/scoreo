/**
 * Scoreo design system. The app composes these components and nothing else:
 * no class names, no inline styles, no stylesheet of its own. Every visual
 * decision lives in this package — see README.md.
 */

// 01 · atoms
export { Badge, type BadgeProps, type BadgeTone } from './atoms/Badge'
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './atoms/Button'
export { Checkbox, type CheckboxProps } from './atoms/Checkbox'
export { Chip, type ChipProps } from './atoms/Chip'
export { Icon, type IconProps, type IconSize } from './atoms/Icon'
export { ICON_NAMES, type IconName } from './atoms/icons'
export { Meter, type MeterProps } from './atoms/Meter'
export { DateInput, type DateInputProps } from './atoms/DateInput'
export { NumberField, type NumberFieldProps } from './atoms/NumberField'
export { NumberInput, type NumberInputProps } from './atoms/NumberInput'
export { Delta, Rank, Score, type ScoreProps } from './atoms/Score'
export { Select, type SelectOption, type SelectProps } from './atoms/Select'
export { Stack, type Space, type StackProps } from './atoms/Stack'
export { HUES, type Hue } from './atoms/hues'
export { Swatch, type SwatchProps } from './atoms/Swatch'
export { Text, type TextProps, type TextVariant } from './atoms/Text'
export { TextInput, type FieldSize, type TextInputProps } from './atoms/TextInput'

// 02 · molecules
export { BulletList } from './molecules/BulletList'
export { DetailList, DetailRow, type DetailRowProps } from './molecules/DetailList'
export { EmptyState, type EmptyStateProps } from './molecules/EmptyState'
export { FilterBar, type FilterBarProps } from './molecules/FilterBar'
export { ButtonRow, FormRow } from './molecules/FormRow'
export { HistoryCell, type HistoryCellProps } from './molecules/HistoryCell'
export {
  List,
  ListRow,
  type ListProps,
  type ListRowProps,
  type RowAction,
} from './molecules/ListRow'
export {
  SegmentedControl,
  Tabs,
  type ChoiceOption,
  type SegmentedControlProps,
  type TabsProps,
} from './molecules/SegmentedControl'
export { StandingsCard, type StandingsCardProps } from './molecules/StandingsCard'
export { StatRow, type StatRowProps } from './molecules/StatRow'
export { StatusLine, type StatusLineProps, type StatusTone } from './molecules/StatusLine'

// 03 · organisms
export { ActionBar, type ActionBarProps } from './organisms/ActionBar'
export { AppHeader, type AppHeaderProps, type HeaderAction } from './organisms/AppHeader'
export { Banner, type BannerProps } from './organisms/Banner'
export { Comparison, ComparisonCard, type ComparisonCardProps } from './organisms/Comparison'
export { Dialog, type DialogProps } from './organisms/Dialog'
export { DropZone, type DropZoneProps } from './organisms/DropZone'
export { RoundCard, type RoundCardProps } from './organisms/RoundCard'
export { Sheet, SheetRow, type SheetProps, type SheetRowProps } from './organisms/Sheet'
export { SideMenu, type SideMenuItem, type SideMenuProps } from './organisms/SideMenu'
export { Panel, type PanelProps } from './organisms/Panel'
export { StandingsGrid } from './organisms/StandingsGrid'
export { ThemePicker, type ThemePickerProps } from './organisms/ThemePicker'

// 04 · templates
export {
  ImmersiveTemplate,
  ScreenTemplate,
  type ImmersiveTemplateProps,
  type ScreenTemplateProps,
} from './templates/ScreenTemplate'
