# Glossary

| Term | Definition |
|---|---|
| **Reducer** | Pure function `(state, action) => state` in `ui/*/`, colocated with its screen. Receives an **Action** and produces the next **State**. Contains the screen's business logic. Equivalent of Kotlin's Handler. |
| **Action** | Discriminated union (TypeScript) representing a user event or an async result (click, input, use-case outcome, etc.). Dispatched to the reducer via `dispatch()`. Equivalent of Kotlin's Intent. |
| **State** | Plain object representing the complete state of a screen at a given moment. Produced by the reducer, read by the screen component via `useReducer`. |
| **Use Case** | Class in `application/` that encapsulates a business operation (e.g. `AddPlayerUseCase`, `CreateMatchUseCase`). No framework dependency. |
| **Port** | TypeScript interface in `domain/port/` defining a data access contract (e.g. `PlayerRepository`). |
| **Adapter** | Concrete implementation of a Port in `infrastructure/` (e.g. `LocalStoragePlayerRepository`). |
| **MVI-style** | Model-View-Intent-inspired unidirectional data flow: View → dispatch(Action) → reducer → State → View, via React's `useReducer`. |
| **WinCondition** | Union type defining how a winner is determined: `HIGHEST_SCORE`, `LOWEST_SCORE`, or `MANUAL`. |
| **ServicesContext** | Root React context (`src/services/ServicesContext.tsx`) built once via `useMemo`, exposing the concrete repositories and use cases to every screen via `useServices()`. |
| **Flavor** | One of the 4 Catppuccin themes — `latte` (light, default), `frappe`, `macchiato`, `mocha` (dark) — selected via `data-theme` on `<html>`. Distinct from **Accent**: a flavor sets the whole palette (surfaces, text, borders), not just the primary hue. |
| **Accent** | The app's primary hue, independently swappable from the **Flavor** — 14 Catppuccin presets (default `mauve`), selected via `data-accent` on `<html>`. Changing accent retints `--color-primary` and everything derived from it without touching surfaces/text/borders. |
| **Raw token** | A `--ctp-*` custom property (e.g. `--ctp-mauve`, `--ctp-base`) — one of the literal Catppuccin palette values for the active flavor, defined in `tokens/colors-*.css`. Never referenced directly outside `tokens/semantic.css`. |
| **Semantic token** | A `--color-*`/`--surface-*`/`--text-*`/`--border-*` custom property (e.g. `--color-primary`, `--surface-card`, `--text-body`) defined in `tokens/semantic.css` as an alias onto the active flavor's raw tokens. The only layer components and screens should read. |
