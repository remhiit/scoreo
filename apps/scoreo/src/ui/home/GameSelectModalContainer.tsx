import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import type { WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import i18n from '../../i18n/i18n'
import { MODULE_MANIFESTS } from '../../modules/registry'
import { GameSelectModal } from './GameSelectModal'

export interface GameSelectModalHandle {
  open: () => void
}

export interface GameSelectModalContainerProps {
  getGameTypes: () => GameType[]
  onAddGameType: (name: string, winCondition: WinCondition) => GameType
  onStartGame: (gameTypeId: string, playerIds: string[]) => void
  onStartModule: (moduleId: string, playerIds: string[]) => void
  selectedPlayerIds: string[]
}

function domainErrorMessage(e: unknown): string {
  if (e instanceof ValidationError || e instanceof NotFoundError) return e.message
  return i18n.t('home.failedToCreateGameType', { message: e instanceof Error ? e.message : '' })
}

export const GameSelectModalContainer = forwardRef<
  GameSelectModalHandle,
  GameSelectModalContainerProps
>(function GameSelectModalContainer(
  { getGameTypes, onAddGameType, onStartGame, onStartModule, selectedPlayerIds },
  ref,
) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [gameTypes, setGameTypes] = useState<GameType[]>(() => getGameTypes())
  const [selectedGameType, setSelectedGameType] = useState<GameType | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const [showAddGameForm, setShowAddGameForm] = useState(false)
  const [inlineGameName, setInlineGameName] = useState('')
  const [inlineGameWinCondition, setInlineGameWinCondition] =
    useState<WinCondition>('HIGHEST_SCORE')
  const [inlineGameError, setInlineGameError] = useState<string | undefined>(undefined)

  useImperativeHandle(ref, () => ({
    open: () => {
      setGameTypes(getGameTypes())
      setSelectedGameType(undefined)
      setError(undefined)
      setShowAddGameForm(false)
      setOpen(true)
    },
  }))

  const boundModuleIds = useMemo(
    () => new Set(gameTypes.map((gt) => gt.moduleId).filter((id): id is string => id !== null)),
    [gameTypes],
  )

  // A module already bound is reachable through its game type above; showing it
  // here too would offer the same game twice.
  const availableModules: ScoringModuleManifest[] = useMemo(
    () =>
      MODULE_MANIFESTS.filter(
        (m) =>
          !boundModuleIds.has(m.moduleId) &&
          selectedPlayerIds.length >= m.minPlayers &&
          selectedPlayerIds.length <= m.maxPlayers,
      ),
    [boundModuleIds, selectedPlayerIds.length],
  )

  const moduleForSelectedGame = useMemo(
    () =>
      selectedGameType?.moduleId === undefined || selectedGameType.moduleId === null
        ? undefined
        : MODULE_MANIFESTS.find((m) => m.moduleId === selectedGameType.moduleId),
    [selectedGameType],
  )

  function addInlineGameType() {
    const name = inlineGameName.trim()
    try {
      const created = onAddGameType(name, inlineGameWinCondition)
      const refreshed = getGameTypes()
      setGameTypes(refreshed)
      setSelectedGameType(refreshed.find((gt) => gt.id === created.id))
      setShowAddGameForm(false)
      setInlineGameName('')
      setInlineGameWinCondition('HIGHEST_SCORE')
      setInlineGameError(undefined)
    } catch (e) {
      setInlineGameError(domainErrorMessage(e))
    }
  }

  return (
    <GameSelectModal
      open={open}
      onClose={() => setOpen(false)}
      gameTypes={gameTypes}
      selectedGameType={selectedGameType}
      onSelectGameType={(gt) => {
        setSelectedGameType(gt)
        setError(undefined)
      }}
      onStartMatch={() => {
        if (!selectedGameType) {
          setError(t('home.pleaseSelectGame'))
          return
        }
        setOpen(false)
        onStartGame(selectedGameType.id, selectedPlayerIds)
      }}
      error={error}
      showAddGameForm={showAddGameForm}
      onToggleAddGameForm={() => setShowAddGameForm(!showAddGameForm)}
      inlineGameName={inlineGameName}
      onChangeInlineGameName={(name) => {
        setInlineGameName(name)
        setInlineGameError(undefined)
      }}
      inlineGameWinCondition={inlineGameWinCondition}
      onChangeInlineGameWinCondition={setInlineGameWinCondition}
      inlineGameError={inlineGameError}
      onAddInlineGameType={addInlineGameType}
      availableModules={availableModules}
      moduleForSelectedGame={moduleForSelectedGame}
      onStartOnModule={(moduleId) => {
        setOpen(false)
        onStartModule(moduleId, selectedPlayerIds)
      }}
    />
  )
})
