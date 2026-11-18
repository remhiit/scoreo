/**
 * What the design catalog (apps/catalog) takes from the app to show its real
 * screens with example data: the shell, its routers, the services bag and the
 * in-memory repositories to seed it. Nothing here runs in the deployed app,
 * which starts from main.tsx; this entry point is the `scoreo/catalog` export.
 */
import './i18n/i18n'

export { AppShell } from './App'
export { default as i18n } from './i18n/i18n'
export { createServices, type Services } from './services/createServices'
export { ServicesProvider } from './services/ServicesContext'
export { ThemeContext, type ThemeState } from './ui/theme/themeContext'
export type { Accent, Flavor } from './ui/theme/themeManager'
export { useMemoryRouter } from './ui/navigation/useMemoryRouter'
export * from './ui/navigation/screen'
export { MODULE_MANIFESTS } from './modules/registry'
export { InMemoryCloudSyncRepository } from './infrastructure/testing/inMemoryCloudSyncRepository'
export { InMemoryGameTypeRepository } from './infrastructure/testing/inMemoryGameTypeRepository'
export { InMemoryMatchDraftRepository } from './infrastructure/testing/inMemoryMatchDraftRepository'
export { InMemoryMatchRepository } from './infrastructure/testing/inMemoryMatchRepository'
export { InMemoryPlayerRepository } from './infrastructure/testing/inMemoryPlayerRepository'
export { BindModuleUseCase } from './application/bindModuleUseCase'
export { newGameType, type GameType, type Match, type Player } from '@scoreboards/shared-domain'
export type { MatchDraft } from './domain/model/matchDraft'
