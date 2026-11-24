import screenUsage from 'virtual:screen-usage'
import { usageByComponent, type ScreenUsage } from '../usage/extract'
import { DESIGN_SYSTEM_COMPONENTS } from './designSystemComponents'

/** The index keeps design-system components only (not a constant such as `HUES`). */
const SCREENS: ScreenUsage[] = screenUsage.map((screen) => ({
  ...screen,
  components: screen.components.filter((name) => DESIGN_SYSTEM_COMPONENTS.includes(name)),
}))

const BY_COMPONENT = usageByComponent(SCREENS, DESIGN_SYSTEM_COMPONENTS)

const KIND = { shell: 'Coquille', host: 'Écran', module: 'Module' } as const

function screenLabel(screen: ScreenUsage): string {
  return screen.kind === 'shell' ? 'App' : screen.id
}

/** 07 — which design-system components each screen imports, and the reverse. */
export function Usage() {
  const unused = BY_COMPONENT.filter((entry) => entry.screens.length === 0).length
  return (
    <>
      <header className="cat-page-head">
        <span className="cat-page-head__number">07</span>
        <h1 className="cat-page-head__title">Écran × composants</h1>
        <p className="cat-overview__rule">
          Quels composants du design system chaque écran de Scoreo et de ses modules importe, et
          l’inverse. Calculé au build depuis les imports réels du code (
          <code>apps/catalog/usagePlugin.ts</code>), jamais écrit à la main : les fichiers d’un
          écran comptent, et ce qu’ils importent en chemin relatif (compositions partagées, pièces
          de jeu), sans jamais entrer dans un autre écran.
        </p>
        <ul className="cat-toc">
          <li>
            <button
              type="button"
              className="cat-toc__link"
              onClick={() =>
                document.getElementById('index-ecrans')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Par écran ({SCREENS.length})
            </button>
          </li>
          <li>
            <button
              type="button"
              className="cat-toc__link"
              onClick={() =>
                document.getElementById('index-composants')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Par composant ({BY_COMPONENT.length}, dont {unused} sans écran)
            </button>
          </li>
        </ul>
      </header>

      <section className="cat-specimen" aria-labelledby="index-ecrans">
        <h2 className="cat-specimen__title" id="index-ecrans">
          Par écran
        </h2>
        <table className="cat-usage">
          <thead>
            <tr>
              <th scope="col">Écran</th>
              <th scope="col">Composants</th>
            </tr>
          </thead>
          <tbody>
            {SCREENS.map((screen) => (
              <tr key={screen.id}>
                <th scope="row">
                  <span className="cat-usage__name">{screenLabel(screen)}</span>
                  <span className="cat-usage__kind">
                    {KIND[screen.kind]} · <code>{screen.path}</code>
                  </span>
                </th>
                <td>
                  {screen.components.length === 0 ? (
                    <span className="cat-note">Aucun composant du design system</span>
                  ) : (
                    <span className="cat-usage__list">
                      {screen.components.map((name) => (
                        <code key={name}>{name}</code>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cat-specimen" aria-labelledby="index-composants">
        <h2 className="cat-specimen__title" id="index-composants">
          Par composant
        </h2>
        <table className="cat-usage">
          <thead>
            <tr>
              <th scope="col">Composant</th>
              <th scope="col">Écrans</th>
            </tr>
          </thead>
          <tbody>
            {BY_COMPONENT.map((entry) => (
              <tr key={entry.component}>
                <th scope="row">
                  <code>{entry.component}</code>
                </th>
                <td>
                  {entry.screens.length === 0 ? (
                    <span className="cat-note">Aucun écran ne l’importe</span>
                  ) : (
                    <span className="cat-usage__list">
                      {entry.screens.map((id) => (
                        <code key={id}>{id === 'shell' ? 'App' : id}</code>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
