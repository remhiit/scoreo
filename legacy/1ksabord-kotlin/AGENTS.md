# AGENTS.md — 1000 Sabords

**Start session in caveman mode (full).** If context reset or new agent spawn, re-enable caveman immediately.

KMP project: pirate dice game score tracker. Kotlin/JS web (active), Android skeleton (dormant).

## Quick commands (run from `kotlin/`)

| What | Command |
|---|---|
| Tests | `./gradlew jsNodeTest` |
| Build prod | `./gradlew jsBrowserDistribution --no-daemon -q` |
| Dev hot-reload | `./gradlew jsBrowserDevelopmentRun` (→ localhost:8080) |
| Dev webpack | `./gradlew jsBrowserDevelopmentWebpack` |

Build after any change to Kotlin source, CSS, or HTML. Always run from `kotlin/`.

Always update README.md when making impactful changes (new features, build commands, architecture changes, activated targets, CI/CD, etc.).

## Key constraints from copilot-instructions.md

- All UI text, comments, var names in **French**
- No JS frameworks / npm deps beyond Kotlin/JS toolchain
- UI built with Kotlin string templates + `innerHTML` — do NOT use DOM API (`createElement`)
- Use `escHtml()` when injecting user-provided text (player names) into HTML
- Must use CSS custom properties for colors (`--bg`, `--surface`, `--primary`, `--text`, etc.) — never hardcode
- Player colors: `COULEURS_JOUEURS` in `Constantes.kt`, mirrored in CSS `--c0`..`--c7`

## Architecture

- **DDD + hexagonal**: pure domain in `commonMain/fr/ksabord/domaine/`, adapters in `jsMain/fr/ksabord/ui/`
- Domain depends on nothing; adapters depend on domain
- **Singleton `val partie`** (`Partie.kt`) — mutable top-level state shared everywhere
- UI state in `jsMain/EtatTour.kt` — also top-level vars: `dés`, `tabActif`, `carteSelectionnée`, `multiplicateurManuel`

## Event handling

- **Single click delegate** on `document` — dispatch by `data-action` attribute (see `Main.kt:16-21`)
- Non-click events (Enter key, `<select>` change) attached in `postRendu()` (see `Rendu.kt:36-48`)
- `render()` rebuilds `#app.innerHTML` completely each call — no virtual DOM

## Score calculation

- `calculerScore(dés: LancerDés, carte: String): RésultatScore` in `CalculateurScore.kt`
- Pure function, no side effects, no global state
- Card IDs: `none`, `captain`, `diamond`, `gold`, `animals`, `witch`, `sea2`/`sea3`/`sea4`, `skull1`/`skull2`

## Persistence (localStorage)

- `partie` save/restore: JSON → `localStorage` key `"partie"`
- Known players: key `"joueurs_connus"`
- History: key `"historique_parties"` — list of `PartieTerminée`
- Export/import uses LZW compression → `.sabords` file (see `Compression.kt`)

## Quirks & gotchas

- **gradle.properties**: proxy configured (`vip-users.proxy.edf.fr:3131`), `kotlin.js.yarn=false` (uses npm)
- Android target in `build.gradle.kts` is **commented out** — needs SDK + uncommenting
- Game types: `CoupCalculateur`, `CoupManuel`, `CoupÎleCrânes` — sealed subclass of `ÉvénementCoup` (serialized with `@SerialName`)
- Magic Pirate win: 9 diamonds or 9 gold → instant victory, no post-game wait
- History detail uses event sourcing (`coups` list) — older archives may have empty list
- `js()` calls for JS interop in `Persistence.kt` (export download, FileReader)
- No hot-reload of CSS — edit in `jsMain/resources/index.html`, rebuild
