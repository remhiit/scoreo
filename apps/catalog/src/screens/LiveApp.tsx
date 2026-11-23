import { useContext, useState } from 'react'
import {
  AppShell,
  i18n,
  ServicesProvider,
  ThemeContext,
  useMemoryRouter,
  type Screen,
  type Services,
} from 'scoreo/catalog'
import { CatalogThemeContext } from '../shell/theme'

/** The catalog shows Scoreo in French, as its players use it. */
if (i18n.language !== 'fr') void i18n.changeLanguage('fr')

export interface LiveAppProps {
  /** Builds the frame's data, once: each frame owns its repositories. */
  services: () => Services
  /** The screen the frame opens on; the viewer can navigate from there. */
  screen: (services: Services) => Screen
}

/**
 * Scoreo itself, running in a frame: the real `AppShell` with its real screens,
 * over in-memory repositories seeded with example data, routed in memory so
 * several frames live side by side. Nothing is redrawn: when a screen changes in
 * the app, it changes here.
 */
export function LiveApp({ services: build, screen }: LiveAppProps) {
  const [services] = useState(build)
  const [initial] = useState(() => screen(services))
  const theme = useContext(CatalogThemeContext)
  return (
    <ServicesProvider services={services}>
      <ThemeContext.Provider value={theme}>
        <Shell initial={initial} />
      </ThemeContext.Provider>
    </ServicesProvider>
  )
}

function Shell({ initial }: { initial: Screen }) {
  return <AppShell router={useMemoryRouter(initial)} />
}
