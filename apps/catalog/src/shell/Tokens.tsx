import { HUES } from '@scoreboards/design-system'
import semanticCss from '@scoreboards/design-system/tokens/semantic.css?raw'
import typographyCss from '@scoreboards/design-system/tokens/typography.css?raw'
import spacingCss from '@scoreboards/design-system/tokens/spacing.css?raw'
import radiusShadowCss from '@scoreboards/design-system/tokens/radius-shadow.css?raw'
import mochaCss from '@scoreboards/design-system/tokens/colors-mocha.css?raw'
import { rootDeclarations, withPrefix, type TokenDeclaration } from './parseTokens'

// Token specimens are the catalog's own chrome: they paint a token with an
// inline style, which no story is allowed to do (eslint.config.js).

const FLAVORS = [
  { id: 'latte', label: 'Latte' },
  { id: 'frappe', label: 'Frappé' },
  { id: 'macchiato', label: 'Macchiato' },
  { id: 'mocha', label: 'Mocha' },
] as const

const SEMANTIC = rootDeclarations(semanticCss)
const TYPOGRAPHY = rootDeclarations(typographyCss)
const SPACING = rootDeclarations(spacingCss)
const RADIUS_SHADOW = rootDeclarations(radiusShadowCss)
/** The raw palette, minus the two non-colour helpers (`is-dark`, `on-accent`). */
const PALETTE = withPrefix(
  rootDeclarations(mochaCss.replace("[data-theme='mocha']", ':root')),
  '--ctp-',
).filter((token) => !['--ctp-is-dark', '--ctp-on-accent'].includes(token.name))

function TokenName({ token }: { token: TokenDeclaration }) {
  return (
    <span className="cat-token__meta">
      <code className="cat-token__name">{token.name}</code>
      <code className="cat-token__value">{token.value}</code>
    </span>
  )
}

function ColorTokens({ tokens }: { tokens: TokenDeclaration[] }) {
  return (
    <ul className="cat-tokens cat-tokens--colors">
      {tokens.map((token) => (
        <li key={token.name} className="cat-token">
          <span className="cat-token__chip" style={{ background: `var(${token.name})` }} />
          <TokenName token={token} />
        </li>
      ))}
    </ul>
  )
}

/** The 26 Catppuccin colours of each flavor, side by side. */
export function PaletteSpecimen() {
  return (
    <div className="cat-palettes">
      {FLAVORS.map((flavor) => (
        <div key={flavor.id} className="cat-palette" data-theme={flavor.id}>
          <span className="cat-palette__name">{flavor.label}</span>
          <ul className="cat-palette__chips">
            {PALETTE.map((token) => (
              <li
                key={token.name}
                className="cat-palette__chip"
                title={token.name}
                style={{ background: `var(${token.name})` }}
              />
            ))}
          </ul>
        </div>
      ))}
      <p className="cat-note">
        De gauche à droite : {PALETTE.map((token) => token.name.replace('--ctp-', '')).join(', ')}.
        Les composants ne lisent jamais ces valeurs : ils passent par les tokens sémantiques.
      </p>
    </div>
  )
}

const SEMANTIC_GROUPS = [
  { title: 'Surfaces', prefixes: ['--surface-', '--scrim'] },
  { title: 'Texte', prefixes: ['--text-'] },
  { title: 'Bordures', prefixes: ['--border-'] },
  {
    title: 'Statuts',
    prefixes: ['--color-success', '--color-warning', '--color-danger', '--color-info'],
  },
  { title: 'Accent', prefixes: ['--color-primary'] },
]

export function SemanticSpecimen() {
  return (
    <div className="cat-groups">
      {SEMANTIC_GROUPS.map((group) => (
        <div key={group.title} className="cat-group">
          <h3 className="cat-group__title">{group.title}</h3>
          <ColorTokens tokens={withPrefix(SEMANTIC, ...group.prefixes)} />
        </div>
      ))}
    </div>
  )
}

export function AccentSpecimen() {
  return (
    <ul className="cat-tokens cat-tokens--colors">
      {HUES.map((hue) => (
        <li key={hue} className="cat-token">
          <span className="cat-token__chip" style={{ background: `var(--ctp-${hue})` }} />
          <span className="cat-token__meta">
            <code className="cat-token__name">{`data-accent="${hue}"`}</code>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function TypeSpecimen() {
  const sizes = withPrefix(TYPOGRAPHY, '--text-')
  const others = TYPOGRAPHY.filter((token) => !token.name.startsWith('--text-'))
  return (
    <div className="cat-groups">
      <ul className="cat-type">
        {sizes.map((token) => (
          <li key={token.name} className="cat-type__row">
            <TokenName token={token} />
            <span className="cat-type__sample" style={{ fontSize: `var(${token.name})` }}>
              Partie de Skyjo, manche 4 — 128 pts
            </span>
          </li>
        ))}
      </ul>
      <TokenTable tokens={others} />
    </div>
  )
}

export function SpacingSpecimen() {
  return (
    <ul className="cat-type">
      {SPACING.map((token) => (
        <li key={token.name} className="cat-type__row">
          <TokenName token={token} />
          <span className="cat-bar" style={{ width: `var(${token.name})` }} />
        </li>
      ))}
    </ul>
  )
}

export function ShapeSpecimen() {
  const radii = withPrefix(RADIUS_SHADOW, '--radius-')
  const shadows = withPrefix(RADIUS_SHADOW, '--shadow-')
  const motion = withPrefix(RADIUS_SHADOW, '--ease-', '--duration-', '--border-width')
  return (
    <div className="cat-groups">
      <ul className="cat-shapes">
        {radii.map((token) => (
          <li key={token.name} className="cat-shape">
            <span className="cat-shape__box" style={{ borderRadius: `var(${token.name})` }} />
            <TokenName token={token} />
          </li>
        ))}
        {shadows.map((token) => (
          <li key={token.name} className="cat-shape">
            <span className="cat-shape__box" style={{ boxShadow: `var(${token.name})` }} />
            <TokenName token={token} />
          </li>
        ))}
      </ul>
      <TokenTable tokens={motion} />
    </div>
  )
}

function TokenTable({ tokens }: { tokens: TokenDeclaration[] }) {
  return (
    <ul className="cat-tokens">
      {tokens.map((token) => (
        <li key={token.name} className="cat-token">
          <TokenName token={token} />
        </li>
      ))}
    </ul>
  )
}
