# Glossary

| Term | Definition |
|---|---|
| **Handler** | MVI class in `commonMain` that receives **Intents** and produces a **State** via `mutableStateOf`. Contains the screen's business logic. |
| **Intent** | Sealed class representing a user action (click, input, etc.). Sent to the Handler via `handle()`. |
| **State** | Immutable data class representing the complete state of a screen at a given moment. Produced by the Handler, read by the View. |
| **Use Case** | Class in `application/` that encapsulates a business operation (e.g. `AddPlayerUseCase`, `CreateMatchUseCase`). No framework dependency. |
| **Port** | Kotlin interface in `domain/port/` defining a data access contract (e.g. `PlayerRepository`). |
| **Adapter** | Concrete implementation of a Port in `jsMain/infrastructure/` (e.g. `LocalStoragePlayerRepository`). |
| **MVI** | Model-View-Intent: unidirectional data flow pattern. View → Intent → Handler → State → View. |
| **WinCondition** | Enum defining how a winner is determined: `HIGHEST_SCORE`, `LOWEST_SCORE`, or `MANUAL`. |
| **Compose HTML** | JetBrains library that generates real HTML DOM elements from Kotlin, used for the web interface. |
| **Flavor** | One of the 4 Catppuccin themes — `latte` (light, default), `frappe`, `macchiato`, `mocha` (dark) — selected via `data-theme` on `<html>`. Distinct from **Accent**: a flavor sets the whole palette (surfaces, text, borders), not just the primary hue. |
| **Accent** | The app's primary hue, independently swappable from the **Flavor** — 14 Catppuccin presets (default `mauve`), selected via `data-accent` on `<html>`. Changing accent retints `--color-primary` and everything derived from it without touching surfaces/text/borders. |
| **Raw token** | A `--ctp-*` custom property (e.g. `--ctp-mauve`, `--ctp-base`) — one of the literal Catppuccin palette values for the active flavor, defined in `tokens/colors-*.css`. Never referenced directly outside `tokens/semantic.css`. |
| **Semantic token** | A `--color-*`/`--surface-*`/`--text-*`/`--border-*` custom property (e.g. `--color-primary`, `--surface-card`, `--text-body`) defined in `tokens/semantic.css` as an alias onto the active flavor's raw tokens. The only layer components and screens should read. |
