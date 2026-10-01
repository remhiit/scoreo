import { Button, HistoryCell, NumberField, RoundCard, Stack } from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../domain/model/player'

export interface RoundHistoryListProps {
  rounds: Record<string, string>[]
  players: Player[]
  onChangeScore: (roundIndex: number, playerId: string, value: string) => void
  onRemoveRound: (index: number) => void
  onAddRound: () => void
}

/**
 * One round card per round, cells wrapping instead of scrolling sideways (a
 * column per player breaks down past ~4 players). Every score stays editable
 * in place. Remove stays hidden while a single round remains.
 */
export function RoundHistoryList({
  rounds,
  players,
  onChangeScore,
  onRemoveRound,
  onAddRound,
}: RoundHistoryListProps) {
  const { t } = useTranslation()
  const canRemove = rounds.length > 1

  return (
    <Stack gap={2}>
      {rounds.map((round, roundIndex) => (
        <RoundCard
          key={roundIndex}
          title={t('scoreDetail.round', { number: roundIndex + 1 })}
          trailing={
            canRemove && (
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                label={t('scoreDetail.removeRound')}
                title={t('scoreDetail.removeRound')}
                onClick={() => onRemoveRound(roundIndex)}
              />
            )
          }
        >
          {players.map((player) => (
            <HistoryCell key={player.id} name={player.name}>
              <NumberField
                ariaLabel={player.name}
                value={round[player.id] ?? ''}
                onChange={(value) => onChangeScore(roundIndex, player.id, value)}
              />
            </HistoryCell>
          ))}
        </RoundCard>
      ))}

      <Stack direction="row" justify="center">
        <Button variant="secondary" size="sm" icon="plus" onClick={onAddRound}>
          {t('scoreDetail.addRound')}
        </Button>
      </Stack>
    </Stack>
  )
}
