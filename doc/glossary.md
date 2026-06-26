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
