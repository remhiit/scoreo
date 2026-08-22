import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { Component, lazy, Suspense, useMemo, type ComponentType, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Screen } from '../ui/navigation/screen'
import type { Services } from '../services/createServices'
import { ModuleHostAdapter } from './moduleHostAdapter'
import { findModule } from './registry'
import { resolveEditing } from './resolveEditing'

/**
 * A module's screen is third-party-ish code inside Scoreo: it may fail to load
 * (a chunk that never arrives) or throw while rendering. Neither may take the
 * host down — the user must still be able to walk back to their history.
 */
class ModuleErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export interface ModuleScoreRouteProps {
  screen: Extract<Screen, { type: 'ModuleScore' }>
  services: Services
  onExit: () => void
}

export function ModuleScoreScreen({ screen, services, onExit }: ModuleScoreRouteProps) {
  const { t } = useTranslation()
  const module = useMemo(() => findModule(screen.moduleId), [screen.moduleId])

  // `lazy` must keep the same identity across renders, or React remounts the
  // module — and its half-entered scores — on every parent render.
  const Screen = useMemo(
    () =>
      module === undefined
        ? undefined
        : (lazy(module.load) as ComponentType<ScoringModuleScreenProps>),
    [module],
  )

  const host = useMemo(
    () =>
      new ModuleHostAdapter(
        screen.moduleId,
        screen.gameTypeId,
        services.playerRepository,
        services.matchRepository,
        services.moduleDraftRepository,
        services.currentDate,
      ),
    [screen.moduleId, screen.gameTypeId, services],
  )

  const editing = useMemo(
    () =>
      screen.matchId === undefined
        ? undefined
        : resolveEditing(services.matchRepository.findById(screen.matchId), screen.moduleId),
    [screen.matchId, screen.moduleId, services],
  )

  if (module === undefined || Screen === undefined) {
    return <div className="empty-inline">{t('modules.unknownModule')}</div>
  }

  return (
    <ModuleErrorBoundary fallback={<div className="error-msg">{t('modules.failedToLoad')}</div>}>
      <Suspense fallback={<div className="empty-inline">{t('modules.loading')}</div>}>
        <Screen host={host} playerIds={screen.playerIds} editing={editing} onExit={onExit} />
      </Suspense>
    </ModuleErrorBoundary>
  )
}
