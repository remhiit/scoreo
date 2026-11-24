import { MODULE_PIECES } from '../pieces'
import { Specimen } from './Specimen'

/** 06 — the game pieces each module keeps in its `src/design/`, under its own root. */
export function Pieces() {
  return (
    <>
      <header className="cat-page-head">
        <span className="cat-page-head__number">06</span>
        <h1 className="cat-page-head__title">Pièces de jeu</h1>
        <p className="cat-overview__rule">
          Ce que le design system n’a pas et qu’un jeu seul utilise : un compteur de dés, une grille
          de manches, une pastille de couleur. Chaque module les garde dans son{' '}
          <code>src/design/</code>, seul endroit où il écrit des classes et du CSS. Chaque pièce est
          rendue ici sous la racine de son module, pour que son CSS scopé s’applique.
        </p>
        <ul className="cat-toc">
          {MODULE_PIECES.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="cat-toc__link"
                onClick={() =>
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {entry.title}
              </button>
            </li>
          ))}
        </ul>
      </header>
      {MODULE_PIECES.map((entry) => (
        <section key={entry.id} className="cat-module" id={entry.id}>
          <h2 className="cat-module__title">
            {entry.title} <code>{`@scoreboards/${entry.id}`}</code>
          </h2>
          {entry.pieces.map((piece) => (
            <Specimen key={piece.id} story={piece} Root={entry.Root} />
          ))}
        </section>
      ))}
    </>
  )
}
