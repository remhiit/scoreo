# Coordinator — adaptation pour l'agent coordinateur MCP (connected services)

Source : `.claude/skills/coordinator/SKILL.md` (inchangé, fait foi en cas de conflit).

## Périmètre

- **Cible couverte :** un agent conversationnel disposant d'un connecteur GitHub MCP
  sur `remhiit/scoreo`.
- **Non couvert :** Mammouth Code / OpenCode et mammouth.ai (mécanisme de découverte
  non vérifié, voir `../ADAPTED-SKILLS.md`).
- **Découverte :** aucune découverte automatique. L'utilisateur (ou le prompt système)
  demande à l'agent de lire ce fichier en début de session.

## Noms d'outils

Les noms d'outils MCP **varient selon le connecteur** (ex. `github_get_file_contents`
vs `get_file_contents`). Ce document décrit des **capacités** ; l'agent les associe aux
outils réellement exposés dans sa session. Si une capacité n'a pas d'outil, voir « Cas d'échec ».

| Capacité | Utilisée pour |
| --- | --- |
| Lire un fichier / lister un dossier | Charger skills, conventions, code |
| Lire une PR (détails, diff, reviews, commentaires, checks) | pr-review, address-feedback, merge-review-pass |
| Lire une issue | issue-to-spec, implement-task |
| Pousser des fichiers sur une branche | Toute écriture |
| Créer / mettre à jour une PR | Livraison |
| Fusionner une PR | Uniquement après confirmation explicite |

## Rôle et déclencheurs

Point d'entrée de toute demande sur scoreo : il qualifie la demande, choisit le ou les
skills spécialistes, exécute leurs procédures et rend un résultat vérifiable.

## Entrées et prérequis

- Demande utilisateur ; références explicites (numéro d'issue/PR, chemin) ou à rechercher.
- Accès en lecture au dépôt. L'écriture n'est utilisée que si la demande l'implique.

## Procédure

1. **Qualifier** la demande et identifier les objets GitHub concernés — les rechercher/lire,
   ne jamais deviner un numéro, un chemin ou un SHA.
2. **Choisir le spécialiste** :
   - traiter des retours de review → `address-feedback`
   - relire une PR → `pr-review` ; vérifier qu'elle est prête → `merge-review-pass`
   - issue à cadrer → `issue-to-spec` ; à implémenter → `project-conventions` puis `implement-task` (+ `test-strategy`)
   - nouveau module de scoring → `project-conventions` puis `new-scoring-module`
   - évaluer un impact → `change-risk` ; audit site → `site-quality`
   - désaccord → `arbitrate` ; bilan → `weekly-report`
   - aucune correspondance → demander une précision à l'utilisateur.
3. **Transmettre le contexte** : lire `.claude/skills/<skill>/SKILL.md` puis
   `project-conventions` si écriture ; rassembler les objets lus à l'étape 1.
4. **Exécuter** la procédure du spécialiste (voir section suivante).
5. **Récupérer et vérifier le résultat** contre les critères de réussite du skill.
6. **Escalader** à l'utilisateur si : action destructive (merge, fermeture, suppression),
   ambiguïté non levable par lecture, conflit entre retours, critère d'une review
   impossible à satisfaire avec les outils disponibles.
7. **Rendre compte** : ce qui a été fait (liens commits/PR), ce qui ne l'a pas été et pourquoi.

## Utiliser un skill Claude non adapté

Les spécialistes n'existent que sous forme Claude. L'agent : lit le `SKILL.md` ; ignore les
instructions propres à Claude Code (sous-agents, commandes shell locales, hooks) ;
si une étape exige une capacité absente (exécuter des tests, lancer la CI localement),
il le **signale explicitement** dans son compte rendu au lieu de simuler le résultat.

## Sorties

- Lecture seule : rapport structuré dans la conversation.
- Écriture : commit(s) sur une branche dédiée ou la branche de la PR, message descriptif,
  description de PR alignée sur le diff.

## Critères de réussite

Chaque point de la demande est traité ou explicitement listé comme non traité ; aucune
affirmation n'est faite sans lecture ou outil qui la prouve.

## Cas d'échec

- **Outil indisponible** : arrêter l'étape, indiquer la capacité manquante et l'alternative manuelle.
- **Écriture refusée / non autorisée** : ne pas contourner ; fournir le contenu proposé dans la conversation.
- **Fichier introuvable** : lister le dossier parent, ne pas inventer de chemin.

## Exemple de bout en bout (cible MCP)

1. Configuration : connecteur GitHub MCP autorisé sur `remhiit/scoreo`.
2. Découverte : « Lis `.claude/skills/coordinator/ADAPTED-SKILL.md` et applique-le. »
3. Invocation : « Relis la PR 549. » → le coordinateur choisit `pr-review`, lit son `SKILL.md`,
   la PR (détails, diff, reviews).
4. Sortie attendue : review classée bloquant / suggestion / nit, publiée seulement si demandé.
5. Outil indisponible (ex. pas de lecture des checks CI) : « Statut CI non vérifiable avec les outils de cette session. »
6. Écriture non autorisée : la review est rendue dans la conversation, rien n'est publié.
