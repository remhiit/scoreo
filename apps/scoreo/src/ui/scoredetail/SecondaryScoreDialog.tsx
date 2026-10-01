import {
  Button,
  ButtonRow,
  Dialog,
  NumberField,
  SheetRow,
  Stack,
  Text,
} from '@scoreboards/design-system'
import { useTranslation } from 'react-i18next'
import type { GameType } from '../../domain/model/gameType'
import type { Player } from '../../domain/model/player'

export interface SecondaryScoreDialogProps {
  gameType: GameType
  tiedPlayers: Player[]
  secondaryScoreInputs: Record<string, string>
  error: string | undefined
  onUpdateInput: (playerId: string, value: string) => void
  onSubmit: () => void
  onDismiss: () => void
}

/** Dialog for entering secondary scores to break a tie, titled from the game type's tieBreakLabel. */
export function SecondaryScoreDialog({
  gameType,
  tiedPlayers,
  secondaryScoreInputs,
  error,
  onUpdateInput,
  onSubmit,
  onDismiss,
}: SecondaryScoreDialogProps) {
  const { t } = useTranslation()
  const title = gameType.tieBreakLabel ?? t('scoreDetail.secondaryScore')
  return (
    <Dialog
      open
      title={`${title} ?`}
      onClose={onDismiss}
      closeLabel={t('common.close')}
      actions={
        <ButtonRow>
          <Button variant="secondary" onClick={onDismiss}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit}>{t('common.confirm')}</Button>
        </ButtonRow>
      }
    >
      <Stack gap={2}>
        {tiedPlayers.map((player) => (
          <SheetRow key={player.id} name={player.name}>
            <NumberField
              mode="plain"
              ariaLabel={player.name}
              value={secondaryScoreInputs[player.id] ?? ''}
              onChange={(value) => onUpdateInput(player.id, value)}
            />
          </SheetRow>
        ))}
      </Stack>
      {error && <Text variant="error">{error}</Text>}
    </Dialog>
  )
}
