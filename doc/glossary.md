# Glossaire

| Terme | Définition |
|---|---|
| **Handler** | Classe MVI en `commonMain` qui reçoit des **Intents** et produit un **State** via `mutableStateOf`. Contient la logique métier d'un écran. |
| **Intent** | Classe scellée (sealed class) représentant une action utilisateur (clic, saisie, etc.). Envoyée au Handler via `handle()`. |
| **State** | Data class immuable représentant l'état complet d'un écran à un instant T. Produite par le Handler, lue par la View. |
| **Use Case** | Classe dans `application/` qui encapsule une opération métier (ex: `AddPlayerUseCase`, `CreateMatchUseCase`). Sans dépendance framework. |
| **Port** | Interface Kotlin dans `domain/port/` définissant un contrat d'accès aux données (ex: `PlayerRepository`). |
| **Adapter** | Implémentation concrète d'un Port dans `jsMain/infrastructure/` (ex: `LocalStoragePlayerRepository`). |
| **MVI** | Model-View-Intent : pattern de flux de données unidirectionnel. View → Intent → Handler → State → View. |
| **WinCondition** | Enum définissant comment un gagnant est déterminé : `HIGHEST_SCORE`, `LOWEST_SCORE`, ou `MANUAL`. |
| **Compose HTML** | Bibliothèque JetBrains qui génère du DOM HTML réel depuis Kotlin, utilisée pour l'interface web. |
