import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveBindingTarget } from '../../application/bindModuleUseCase'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import type { WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'
import i18n from '../../i18n/i18n'
import { findManifest, MODULE_MANIFESTS } from '../../modules/registry'
import { GameSelectModal, type GameChoice } from './GameSelectModal'

export interface GameSelectModalHandle {
  open: () => void
}

export interface GameSelectModalContainerProps {
  /** Archived game types are needed too: a module bound to one is never offered unbound. */
  getGameTypes: (includeInactive?: boolean) => GameType[]
  onAddGameType: (name: string, winCondition: WinCondition) => GameType
  onStartGame: (gameTypeId: string, playerIds: string[]) => void
  onStartModule: (moduleId: string, playerIds: string[]) => void
  /** "Play in Scoreo" on a module no game type is bound to yet. */
  onStartModuleInScoreo: (moduleId: string, playerIds: string[]) => void
  selectedPlayerIds: string[]
}

const MODULE_CHOICE_PREFIX = 'module:'

/**
 * The game list: active game types first, as the repository orders them, then
 * every registered module no game type stands for yet, sorted by label.
 *
 * A module is left out when a game type — even an archived one — is bound to
 * it, or when the game type its binding would pick by name
 * (`resolveBindingTarget`, the rules `BindModuleUseCase` applies) is active:
 * that game then offers the module itself (`moduleClaimingGameType`). In every
 * other case the module stays listed, so it is always reachable — including
 * when the binding would pick an archived homonym, which launching it then
 * reactivates. Two same-name games may then show side by side; merging them is
 * left to the Games screen.
 */
function buildChoices(allGameTypes: readonly GameType[]): GameChoice[] {
  const active = allGameTypes.filter((gt) => gt.active)

  const gameTypeChoices: GameChoice[] = active.map((gt) => ({
    kind: 'gameType',
    value: gt.id,
    label: gt.name,
    gameType: gt,
  }))
  const moduleChoices: GameChoice[] = MODULE_MANIFESTS.filter((m) => {
    const target = resolveBindingTarget(m, allGameTypes)
    if (target === undefined) return true
    // Bound, or offered on the active game type its binding would pick
    // (`moduleClaimingGameType`): listing the module too would show it twice.
    return target.kind === 'byName' && !target.gameType.active
  })
    .map((m): GameChoice => ({
      kind: 'module',
      value: `${MODULE_CHOICE_PREFIX}${m.moduleId}`,
      label: m.gameNames[0],
      manifest: m,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  return [...gameTypeChoices, ...moduleChoices]
}

/**
 * The module an unbound game type stands for by name — a game created by a v1.1
 * import, or by hand, before its module was played. Its module entry is hidden
 * from the list (see `buildChoices`), so this is the only way to reach the
 * module from that game: "Play on the module" then lets `BindModuleUseCase`
 * stamp the `moduleId` onto it (its rule 2). A module already bound to another
 * game type is not offered: binding would open that other game instead.
 *
 * The module is only offered when `resolveBindingTarget` — the very rules 1
 * and 2 the use case applies — lands on this game type: rule 2 picks the
 * *first* name match, archived games included, so with two homonyms (say an
 * older archived "Skyjo" and an active "skyjo") offering it on the second would
 * bind, reactivate and open the first. `allGameTypes` is `getAll(true)`, the
 * same list in the same order the use case reads.
 */
function moduleClaimingGameType(
  gameType: GameType,
  allGameTypes: readonly GameType[],
): ScoringModuleManifest | undefined {
  return MODULE_MANIFESTS.find((m) => {
    const target = resolveBindingTarget(m, allGameTypes)
    return target?.kind === 'byName' && target.gameType.id === gameType.id
  })
}

function domainErrorMessage(e: unknown): string {
  if (e instanceof ValidationError || e instanceof NotFoundError) return e.message
  return i18n.t('home.failedToCreateGameType', { message: e instanceof Error ? e.message : '' })
}

export const GameSelectModalContainer = forwardRef<
  GameSelectModalHandle,
  GameSelectModalContainerProps
>(function GameSelectModalContainer(
  {
    getGameTypes,
    onAddGameType,
    onStartGame,
    onStartModule,
    onStartModuleInScoreo,
    selectedPlayerIds,
  },
  ref,
) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [allGameTypes, setAllGameTypes] = useState<GameType[]>(() => getGameTypes(true))
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  const [showAddGameForm, setShowAddGameForm] = useState(false)
  const [inlineGameName, setInlineGameName] = useState('')
  const [inlineGameWinCondition, setInlineGameWinCondition] =
    useState<WinCondition>('HIGHEST_SCORE')
  const [inlineGameError, setInlineGameError] = useState<string | undefined>(undefined)

  useImperativeHandle(ref, () => ({
    open: () => {
      setAllGameTypes(getGameTypes(true))
      setSelectedValue(undefined)
      setError(undefined)
      setShowAddGameForm(false)
      setOpen(true)
    },
  }))

  const choices = useMemo(() => buildChoices(allGameTypes), [allGameTypes])
  const selectedChoice = choices.find((c) => c.value === selectedValue)

  const moduleForSelectedGame = useMemo(() => {
    if (selectedChoice === undefined) return undefined
    if (selectedChoice.kind === 'module') return selectedChoice.manifest
    const moduleId = selectedChoice.gameType.moduleId
    if (moduleId !== null) return findManifest(moduleId)
    return moduleClaimingGameType(selectedChoice.gameType, allGameTypes)
  }, [selectedChoice, allGameTypes])

  const moduleFitsPlayers =
    moduleForSelectedGame !== undefined &&
    selectedPlayerIds.length >= moduleForSelectedGame.minPlayers &&
    selectedPlayerIds.length <= moduleForSelectedGame.maxPlayers

  function addInlineGameType() {
    const name = inlineGameName.trim()
    try {
      const created = onAddGameType(name, inlineGameWinCondition)
      setAllGameTypes(getGameTypes(true))
      setSelectedValue(created.id)
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
      choices={choices}
      selectedValue={selectedChoice?.value}
      onSelectChoice={(choice) => {
        setSelectedValue(choice.value)
        setError(undefined)
      }}
      onStartMatch={() => {
        if (!selectedChoice) {
          setError(t('home.pleaseSelectGame'))
          return
        }
        setOpen(false)
        if (selectedChoice.kind === 'module') {
          onStartModuleInScoreo(selectedChoice.manifest.moduleId, selectedPlayerIds)
        } else {
          onStartGame(selectedChoice.gameType.id, selectedPlayerIds)
        }
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
      moduleForSelectedGame={moduleForSelectedGame}
      moduleFitsPlayers={moduleFitsPlayers}
      onStartOnModule={(moduleId) => {
        setOpen(false)
        onStartModule(moduleId, selectedPlayerIds)
      }}
    />
  )
})
