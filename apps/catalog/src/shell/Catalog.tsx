import { useEffect, useState } from 'react'
import { Chip, HUES, Swatch, type Hue } from '@scoreboards/design-system'
import { STORIES } from '../stories'
import { Specimen } from './Specimen'
import { LAYERS, type LayerId } from './types'

const FLAVORS = [
  { value: 'latte', label: 'Latte' },
  { value: 'frappe', label: 'Frappé' },
  { value: 'macchiato', label: 'Macchiato' },
  { value: 'mocha', label: 'Mocha' },
] as const
type Flavor = (typeof FLAVORS)[number]['value']

const STORAGE_KEY = 'scoreo-catalog-theme'

/**
 * The theme to open on: the one remembered, else the viewer's own preference
 * (a host page may set `data-theme="light" | "dark"` on <html>), else the OS one.
 */
function initialTheme(): { flavor: Flavor; accent: Hue } {
  const fallback = { flavor: preferredFlavor(), accent: 'mauve' as Hue }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      flavor?: Flavor
      accent?: Hue
    } | null
    return {
      flavor: FLAVORS.some((f) => f.value === stored?.flavor) ? stored!.flavor! : fallback.flavor,
      accent: HUES.includes(stored?.accent as Hue) ? stored!.accent! : fallback.accent,
    }
  } catch {
    return fallback
  }
}

function preferredFlavor(): Flavor {
  const host = document.documentElement.getAttribute('data-theme')
  if (host === 'light') return 'latte'
  if (host === 'dark') return 'mocha'
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'latte' : 'mocha'
}

function layerFromHash(): LayerId | 'overview' {
  const hash = window.location.hash.replace('#', '')
  return LAYERS.some((layer) => layer.id === hash) ? (hash as LayerId) : 'overview'
}

/** The catalog: a theme bar, the atomic layers as navigation, one layer per page. */
export function Catalog() {
  const [theme, setTheme] = useState(initialTheme)
  const [page, setPage] = useState(layerFromHash)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.flavor)
    document.documentElement.setAttribute('data-accent', theme.accent)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    } catch {
      // A blocked storage only loses the remembered theme.
    }
  }, [theme])

  // A host that flips <html data-theme> to light/dark (a preview viewer) gets the
  // matching flavor instead of a value no Catppuccin sheet knows.
  useEffect(() => {
    const html = document.documentElement
    const observer = new MutationObserver(() => {
      const value = html.getAttribute('data-theme')
      if (value === 'light') setTheme((t) => ({ ...t, flavor: 'latte' }))
      else if (value === 'dark') setTheme((t) => ({ ...t, flavor: 'mocha' }))
    })
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setPage(layerFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const stories = page === 'overview' ? [] : STORIES.filter((story) => story.layer === page)
  const current = LAYERS.find((layer) => layer.id === page)

  return (
    <div className="cat-app">
      <header className="cat-top">
        <a className="cat-brand" href="#">
          <span className="cat-brand__name">Scoreo</span>
          <span className="cat-brand__sub">design system</span>
        </a>
        <div className="cat-theme" role="group" aria-label="Thème d’affichage">
          <div className="cat-theme__flavors">
            {FLAVORS.map((flavor) => (
              <Chip
                key={flavor.value}
                selected={theme.flavor === flavor.value}
                onClick={() => setTheme((t) => ({ ...t, flavor: flavor.value }))}
              >
                {flavor.label}
              </Chip>
            ))}
          </div>
          <div className="cat-theme__accents">
            {HUES.map((hue) => (
              <Swatch
                key={hue}
                hue={hue}
                label={`Accent ${hue}`}
                selected={theme.accent === hue}
                onClick={() => setTheme((t) => ({ ...t, accent: hue }))}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="cat-body">
        <nav className="cat-nav" aria-label="Couches">
          <a
            className="cat-nav__layer"
            href="#"
            aria-current={page === 'overview' ? 'page' : undefined}
          >
            <span className="cat-nav__number">··</span> Vue d’ensemble
          </a>
          {LAYERS.map((layer) => (
            <a
              key={layer.id}
              className="cat-nav__layer"
              href={`#${layer.id}`}
              aria-current={page === layer.id ? 'page' : undefined}
            >
              <span className="cat-nav__number">{layer.number}</span> {layer.title}
              <span className="cat-nav__count">
                {STORIES.filter((s) => s.layer === layer.id).length}
              </span>
            </a>
          ))}
        </nav>

        <main className="cat-main">
          {page === 'overview' ? (
            <Overview />
          ) : (
            <>
              <header className="cat-page-head">
                <span className="cat-page-head__number">{current?.number}</span>
                <h1 className="cat-page-head__title">{current?.title}</h1>
                <ul className="cat-toc">
                  {stories.map((story) => (
                    <li key={story.id}>
                      <button
                        type="button"
                        className="cat-toc__link"
                        onClick={() =>
                          document.getElementById(story.id)?.scrollIntoView({ behavior: 'smooth' })
                        }
                      >
                        {story.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </header>
              {stories.map((story) => (
                <Specimen key={story.id} story={story} />
              ))}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Overview() {
  return (
    <div className="cat-overview">
      <h1 className="cat-overview__title">
        Le design system de Scoreo, tel qu’il est dans le code
      </h1>
      <p className="cat-overview__lead">
        Chaque composant ci-dessous est le vrai composant de <code>@scoreboards/design-system</code>
        , rendu avec des données d’exemple. Rien n’est redessiné : quand le code change, le
        catalogue change. Les maquettes des nouvelles features se construisent avec ces mêmes
        pièces.
      </p>
      <ol className="cat-layers">
        {LAYERS.map((layer) => {
          const stories = STORIES.filter((s) => s.layer === layer.id)
          return (
            <li key={layer.id} className="cat-layer">
              <a href={`#${layer.id}`} className="cat-layer__link">
                <span className="cat-layer__number">{layer.number}</span>
                <span className="cat-layer__title">{layer.title}</span>
                <span className="cat-layer__items">{stories.map((s) => s.title).join(' · ')}</span>
              </a>
            </li>
          )
        })}
      </ol>
      <p className="cat-overview__rule">
        La règle : l’app et les modules assemblent ces composants et n’écrivent ni{' '}
        <code>className</code>, ni <code>style</code>, ni import d’icône. Un besoin visuel manquant
        devient un composant ou une prop ici.
      </p>
    </div>
  )
}
