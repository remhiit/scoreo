import { Tabs } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { GameType } from '../../domain/model/gameType'

const ALL = '__all__'

export interface GameTypeTabsProps {
  gameTypes: GameType[]
  selectedGameTypeId: string | undefined
  onSelect: (gameTypeId: string | undefined) => void
}

/** "All" then one tab per game type — the filter shared by Stats and Hall of Fame. */
export function GameTypeTabs({ gameTypes, selectedGameTypeId, onSelect }: GameTypeTabsProps) {
  const { t } = useTranslation()
  return (
    <Tabs
      ariaLabel={t('stats.all')}
      options={[
        { value: ALL, label: t('stats.all') },
        ...gameTypes.map((gt) => ({ value: gt.id, label: gt.name })),
      ]}
      value={selectedGameTypeId ?? ALL}
      onChange={(value) => onSelect(value === ALL ? undefined : value)}
    />
  )
}
