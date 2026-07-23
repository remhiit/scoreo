import { useState } from 'react'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import type { WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'

function domainErrorMessage(e: unknown): string {
  if (e instanceof ValidationError || e instanceof NotFoundError) return e.message
  return `Failed to create game type: ${e instanceof Error ? e.message : ''}`
}

export function useGameSelectModal(
  getGameTypes: () => GameType[],
  onAddGameType: (name: string, winCondition: WinCondition) => GameType,
) {
  const [open, setOpen] = useState(false)
  const [gameTypes, setGameTypes] = useState<GameType[]>(() => getGameTypes())
  const [selectedGameType, setSelectedGameType] = useState<GameType | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const [showAddGameForm, setShowAddGameForm] = useState(false)
  const [inlineGameName, setInlineGameName] = useState('')
  const [inlineGameWinCondition, setInlineGameWinCondition] =
    useState<WinCondition>('HIGHEST_SCORE')
  const [inlineGameError, setInlineGameError] = useState<string | undefined>(undefined)

  function openModal() {
    setGameTypes(getGameTypes())
    setSelectedGameType(undefined)
    setError(undefined)
    setShowAddGameForm(false)
    setOpen(true)
  }

  function selectGameType(gt: GameType) {
    setSelectedGameType(gt)
    setError(undefined)
  }

  function changeInlineGameName(name: string) {
    setInlineGameName(name)
    setInlineGameError(undefined)
  }

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

  function confirmStart(onConfirmed: (gameTypeId: string) => void) {
    if (!selectedGameType) {
      setError('Please select a game')
      return
    }
    setOpen(false)
    onConfirmed(selectedGameType.id)
  }

  return {
    open,
    onClose: () => setOpen(false),
    openModal,
    gameTypes,
    selectedGameType,
    onSelectGameType: selectGameType,
    error,
    showAddGameForm,
    onToggleAddGameForm: () => setShowAddGameForm((v) => !v),
    inlineGameName,
    onChangeInlineGameName: changeInlineGameName,
    inlineGameWinCondition,
    onChangeInlineGameWinCondition: setInlineGameWinCondition,
    inlineGameError,
    onAddInlineGameType: addInlineGameType,
    confirmStart,
  }
}
