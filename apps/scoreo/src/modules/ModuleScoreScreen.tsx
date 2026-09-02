import type { ScoringModuleScreenProps } from '@scoreboards/module-api'
import { X } from 'lucide-react'
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { Screen } from '../ui/navigation/screen'
import type { Services } from '../services/createServices'
import { LudoButton } from '../ui/shared/LudoButton'
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
  /**
   * Host-facing only — the module itself only ever sees a plain `() => void`
   * (below). Carries the id of the last match saved during this session, so
   * the host can land on it instead of guessing from the route.
   */
  onExit: (savedMatchId?: string) => void
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

  // Not React state on purpose: recording it must never trigger a re-render
  // of the module screen mid-session, only be read once, on exit.
  const savedMatchIdRef = useRef<string | undefined>(undefined)

  const host = useMemo(
    () =>
      new ModuleHostAdapter(
        screen.moduleId,
        screen.gameTypeId,
        services.playerRepository,
        services.matchRepository,
        services.moduleDraftRepository,
        services.currentDate,
        // `saveMatch` only ever runs from a module's own event handler (both
        // installed modules call it from a click, never during their own
        // render), so this write always happens well outside render — React's
        // compiler-oriented lint can't see that far, hence the disable.
        // eslint-disable-next-line react-hooks/refs
        (matchId) => {
          savedMatchIdRef.current = matchId
        },
      ),
    [screen.moduleId, screen.gameTypeId, services],
  )

  // The module only ever gets `() => void`, per the contract: the id travels
  // to the host, never to the module.
  const handleExit = useCallback(() => {
    onExit(savedMatchIdRef.current)
  }, [onExit])

  const editing = useMemo(
    () =>
      screen.matchId === undefined
        ? undefined
        : resolveEditing(services.matchRepository.findById(screen.matchId), screen.moduleId),
    [screen.matchId, screen.moduleId, services],
  )

  return (
    <>
      {/*
        Rendered as a sibling of the boundary/Suspense below, never a child: a
        module that fails to load, throws while rendering, or is unknown must
        still leave this the one visible way back to Scoreo (#389).
      */}
      <div className="app-module-bar">
        <span className="app-module-bar-title">{module?.manifest.displayName ?? ''}</span>
        <LudoButton
          text={<X size={18} aria-hidden />}
          variant="ghost"
          iconOnly
          ariaLabel={t('modules.exit')}
          onClick={handleExit}
        />
      </div>
      <div className="app-module-content">
        {module === undefined || Screen === undefined ? (
          <div className="empty-inline">{t('modules.unknownModule')}</div>
        ) : (
          <ModuleErrorBoundary fallback={<div className="error-msg">{t('modules.failedToLoad')}</div>}>
            <Suspense fallback={<div className="empty-inline">{t('modules.loading')}</div>}>
              <Screen host={host} playerIds={screen.playerIds} editing={editing} onExit={handleExit} />
            </Suspense>
          </ModuleErrorBoundary>
        )}
      </div>
    </>
  )
}
