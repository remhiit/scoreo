# Plan d'automatisation — Scoreo

Document de référence pour l'automatisation du développement de `remhiit/scoreo`
via les **routines Claude Code**.

> **Comment utiliser ce document.** Il est la source de vérité de l'architecture
> d'automatisation. Toute session Claude Code travaillant sur ce sujet doit le
> lire en premier. Il indique la phase en cours et le critère de passage à la
> suivante. Ne pas sauter de phase : chaque gate protège la suivante.

**Phase en cours : 5 — R4 et auto-merge (routine opérationnelle depuis le 2026-07-16, gate de 2 semaines démarré). Premier cycle needs-fix→R4 observé et corrigé le jour même (chaîne de déclenchements sur PR #111, cf. §4 « claim the run » et Phase 5). Phase 4 close : gate franchi (2026-07-16, 5/5 tickets mergés). Phases 0 à 3 closes : gate Phase 2 franchi (2026-07-14, PR #90) et premier run réel de R5 observé (2026-07-14, PR #84-89).**

---

## 1. Objectif

Automatiser le cycle *ticket → code → review → merge → déploiement* pour que le
travail avance sans session interactive, tout en garantissant qu'aucune
régression ne puisse atteindre `main`.

## 2. Principes directeurs

Ces principes expliquent *pourquoi* l'architecture est ce qu'elle est. Les
remettre en cause revient à refaire le plan.

1. **La CI est la seule vraie barrière.** Les routines n'ont pas de recul sur
   leur propre travail. Un check qui ne peut jamais dire « non » ne protège rien.
   La CI doit être écrite et éprouvée *avant* toute autonomie.
2. **Le déterministe ne passe pas par un LLM.** Merger, déplacer une carte,
   fermer un ticket, poser un label : GitHub Actions. Les routines ne font que
   ce qui demande du jugement : coder, reviewer.
3. **Push, pas pull.** Les runs de routine sont un budget rare (5/jour en Pro,
   15 en Max). Aucune routine ne « surveille » ni ne « poll » : elle est
   déclenchée par un événement.
4. **Les labels sont le bus d'événements.** Le GitHub Project est une vue
   humaine, pas une API. Un changement de colonne n'est pas un déclencheur
   exploitable ; un label d'issue l'est.
5. **Tout le savoir-faire vit dans les skills du repo.** Les routines tournent
   sans validation ni prompt d'approbation : leur prompt doit rester une ligne
   qui pointe vers une skill versionnée.
6. **Un run = un ticket.** Jamais de batch : une PR géante est irrevisable et
   fait exploser le contexte.

## 3. Contraintes structurelles (non négociables)

- **Pas d'auto-approbation.** GitHub interdit d'approuver sa propre PR, et
  toutes les routines agissent sous le même compte GitHub. **Conséquence :** on
  n'utilise pas le mécanisme d'approbation. La branch protection exige
  `required_approving_review_count: 0`, et le verdict de la review passe par un
  **commit status requis** (`claude/review`), que le compte a le droit de poser.
- **Déclencheurs disponibles :** planification, appel API (`/fire`), événement
  GitHub (pull request, issue, release). Rien d'autre.
- **Les events GitHub dépassant le plafond horaire d'une routine sont ignorés,
  pas mis en file.** Les filtres doivent rester étroits.
- **Tout porte l'identité GitHub de Rémi.** Commits, PR, commentaires.

---

## 4. Architecture cible

> Depuis l'issue #415, tous les labels de la machine à états portent le
> préfixe `automation:` (`automation:queued`, `automation:ready`,
> `automation:in-progress`, `automation:needs-review`,
> `automation:review-pass`, `automation:needs-fix`, `automation:needs-human`,
> `automation:attempt-1/2/3`, `automation:enabled`). Le §7 « Phases et
> critères de passage » ci-dessous est un journal historique : il documente
> des événements passés avec les noms de labels qui étaient alors en vigueur
> (souvent sans préfixe) et n'est pas mis à jour rétroactivement.

**Principe « claim the run ».** Toute routine déclenchée par un label
GitHub doit, en tout premier geste, **retirer ce label et poser
`automation:in-progress`** avant de faire quoi que ce soit d'autre — y
compris avant de poser un label intermédiaire (`automation:attempt-N`,
etc.). Un trigger GitHub filtré sur « le label X est présent » matche
n'importe quel événement `labeled` tant que X reste posé, y compris ceux
que la routine elle-même déclenche en travaillant. Ne retirer X qu'à la
toute fin (une fois le verdict final prêt) laisse une fenêtre où la routine
peut se re-déclencher sur ses propres écritures de label. C'est exactement
ce qui s'est produit sur la PR #111 (Phase 5, avec les noms de labels
d'alors) : R4 posait le compteur d'attempt sans retirer le verdict
« à corriger », donc ce dépôt de label a lui-même re-déclenché R4, qui a
reposé le compteur suivant (toujours sans retirer le verdict), etc. — le
compteur a grimpé jusqu'à l'escalade en une minute, sans trois vrais
essais de correction. R2 suivait déjà ce principe (`implement-task`
remplace `automation:ready` par `automation:in-progress` avant de
commencer) ; R3 et R4 ont été corrigés pour faire de même (voir Phase 2 et
Phase 5 ci-dessous).

```
Issue créée
   │
   ▼
[R1 — GROOMING : session interactive, PAS une routine]
   │  skill issue-to-spec → critères d'acceptation, fichiers, catégorie de risque
   │  pose le label `automation:queued`
   ▼
      Cron horaire + GitHub trigger `issues.unlabeled`/`closed`
                                                 ▼
                              [DISPATCHER — zéro LLM, scripts/dispatch-ready.mjs]
                                                 │ si 0 issue ready/in-progress (MAX_IN_FLIGHT=1)
                                                 │ et ≤2 PR needs-review (anti-rafale R5)
                                                 │ retire `automation:queued`, pose `automation:ready` seul, en dernier
                                                 ▼
      GitHub trigger `issues.labeled`, filtre `automation:ready`
                                                 ▼
                                     [R2 — IMPLÉMENTATION]
                                                 │ skill implement-task
                                                 │ retire `automation:ready`, pose `automation:in-progress`
                                                 │ garde : PR déjà ouverte sur l'issue ? → stop
                                                 │ 1 run = 1 issue
                                                 │ branche déterministe (créée ou réutilisée) + plan court + code + tests + PR
                                                 │ PR : plan + résultat des validations, ouverte seulement si verte
                                                 │ pose `automation:enabled` si risque faible
                                                 ▼
                                          PR ouverte
                                                 │
      GitHub trigger `pull_request.opened|synchronize`
                                                 ▼
                                         [R3 — REVIEW]
                                          │ skill pr-review
                                          │ retire `automation:needs-review`, pose `automation:in-progress`
                                          │ commentaires inline
                                          │ commit status claude/review ✅/❌
                                          ▼
                      ┌──────────────────┴──────────────────┐
                   ❌ failure                            ✅ success
                      │ label `automation:needs-fix`          │
                      ▼                                      │
      GitHub trigger `pull_request.labeled`, filtre          │
      `automation:needs-fix`                                 │
                      ▼                                      │
                [R4 — FIX]                                   │
                      │ skill address-feedback               │
                      │ retire `automation:needs-fix`, pose   │
                      │ `automation:in-progress`              │
                      │ attempt-1 → 2 → 3 (géré par R4)       │
                      │ à attempt-3 : STOP, retire            │
                      │ `automation:enabled`, pose            │
                      │ `automation:needs-human`              │
                      └──────────► repush ──► R3 (boucle,    │
                                    needs-review-label.yml    │
                                    requeue automatique)      │
                                                             ▼
                                          Tous les checks verts + label `automation:enabled`
                                                             │
                              Action auto-merge-sync.yml (zéro LLM)
                              → `gh pr merge --auto --squash`
                                                             ▼
                                                      main → deploy.yml
                                                             ▼
                                          Project : carte → Done (project-sync.yml, cf. #195)
```

**En parallèle, sur planification :**

- **R5 — Hygiène** (hebdo) : deps, liens de doc, Lighthouse, sitemap. Ouvre une
  PR par catégorie. Passe par R3 comme n'importe quelle PR.
- **R6 — Rapport** (lundi) : PR ouvertes > 3 jours, tickets `automation:needs-human`, taux
  d'échec de `claude/review`, runs consommés. C'est ce rapport qui décide de
  l'élargissement du périmètre `automation:enabled`.

### Le merge n'est pas une routine

Branch protection + checks requis + `gh pr merge --auto --squash`. La PR se
merge seule quand la CI est verte et que le label `automation:enabled` est présent. Aucun LLM
dans la boucle.

### Dépendances entre issues (`blocked_by`)

Les issues qui déclarent une section `## Dépendances` (format documenté dans
`issue-to-spec/SKILL.md`, une ligne `Dépend de #N (raison)` par bloqueur) le
font en texte libre — illisible par API. `.github/workflows/sync-issue-dependencies.yml`
(zéro LLM, cohérent avec le principe directeur §2.2) se déclenche sur
`issues` `opened`/`edited`, parse cette section et pose le lien natif GitHub
`blocked_by` (`POST .../dependencies/blocked_by`, GA depuis août 2025) pour
chaque bloqueur cité, via `scripts/sync-issue-dependencies.mjs`. Idempotent
(un lien déjà posé renvoie 422, ignoré) et tolérant aux numéros invalides
(un bloqueur introuvable est journalisé et ignoré, sans faire échouer le
job pour les autres). Ce lien natif est le préalable au déblocage
automatique : une fois interrogeable par API, une automatisation peut
détecter qu'une issue n'a plus de bloqueur ouvert et la faire passer en
`automation:queued`.

### Déblocage automatique des issues bloquées

Zéro LLM, cohérent avec le principe directeur §2.2. `.github/workflows/
unblock-issues.yml` se déclenche sur `issues` `closed`, et ne s'exécute que
si l'issue est fermée avec `state_reason: completed` (une fermeture « not
planned » ne débloque rien). Il liste les issues que l'issue fermée
bloquait (`GET .../dependencies/blocking`), puis pour chaque candidate
vérifie via `GET .../dependencies/blocked_by` que **tous** ses bloqueurs
natifs sont fermés avant de poser `automation:queued` et de retirer
`blocked` — c'est au dispatcher (ci-dessous) de décider quand cette issue
`automation:queued` devient `automation:ready`. N'agit jamais sur une issue
déjà `automation:queued`/`automation:ready`/`automation:in-progress` (même
classe de garde que l'incident double-fire #99, §4 « claim the run ») ni
sur une issue `automation:needs-human` : cet état est terminal pour
l'automatisation (issue escaladée, plafond `automation:attempt-3` atteint
ou hors périmètre) — seul un humain la re-queue, jamais le déblocage
automatique. Suppose que le lien
natif `blocked_by` a été posé au préalable par
`.github/workflows/sync-issue-dependencies.yml` ; sans donnée à traiter,
c'est un no-op.

### Dispatcher : promotion `automation:queued` → `automation:ready`

Poser plusieurs `automation:ready` d'un coup ferait partir autant
d'événements vers R2 simultanément — au-delà du plafond de runs (5/jour en
Pro), les événements excédentaires sont perdus (§3). Plutôt que de compter
sur le seul rattrapage a posteriori (balayeur ci-dessous), on lisse le
débit en amont : R1 pose désormais `automation:queued` (pas
`automation:ready`), et une Action déterministe (zéro LLM, §2.2) promeut en
`automation:ready` **une issue à la fois**, seulement quand rien n'est en
cours.

`scripts/dispatch-ready.mjs`, appelé par le même workflow que le balayeur
horaire (`.github/workflows/requeue-lost-events.yml` — cron + les
triggers `issues` `unlabeled`/`closed`, pour réagir vite à la fin d'un
run) : si le nombre d'issues ouvertes portant `automation:ready` ou
`automation:in-progress` est inférieur à `MAX_IN_FLIGHT` (1), sélectionne
la plus ancienne issue `automation:queued` de plus haute priorité (`P0` >
`P1` > `P2` > `P3`, puis date de création croissante), retire
`automation:queued` puis pose `automation:ready` **seul, dans son propre
appel, en dernier** (leçon #99, §4 « claim the run »). Ne promeut jamais
une issue portant `blocked`, `automation:needs-human` ou
`automation:in-progress`. Garde anti-rafale R5 : si plus de
`MAX_NEEDS_REVIEW_BACKLOG` (2) PR ouvertes portent
`automation:needs-review`, ne dispatche pas à ce run — laisse R3 absorber
la file d'abord. Par construction, le débit d'événements vers R2 ne dépasse
plus jamais le quota.

### Balayeur horaire des événements de routine perdus

Un event GitHub dépassant le plafond horaire d'une routine est ignoré, pas
mis en file (§3). Grâce au principe « claim the run » (ci-dessus), ce run
perdu se lit dans l'état des labels : le label déclencheur
(`automation:ready`, `automation:needs-review`, `automation:needs-fix`) n'a
jamais été remplacé par `automation:in-progress`. Un item qui porte encore
son label déclencheur longtemps après sa pose est donc un événement perdu.

`.github/workflows/requeue-lost-events.yml` (cron horaire `0 * * * *` +
`workflow_dispatch`) exécute `scripts/requeue-lost-events.mjs`, qui pour
chaque issue ouverte labellisée `automation:ready` et chaque PR ouverte
labellisée `automation:needs-review`/`automation:needs-fix` : lit le
dernier événement `labeled` pour ce label via l'API timeline
(`GET .../issues/{n}/timeline`) et, si posé depuis plus de
`ORPHAN_THRESHOLD_MINUTES` (30 min — le temps qu'une session démarre et
claim le run), retire le label puis le repose **seul, dans son propre
appel** (leçons #94/#99, §4 « claim the run ») pour régénérer l'événement
`labeled` qui re-matche le trigger de la routine. Ne touche jamais un item
portant `automation:in-progress` (run en cours) ou `automation:needs-human`
(état terminal) ; chaque skip et chaque re-pose est journalisé, servant de
donnée pour le rapport R6. Retry aveugle à coût nul et sans plafond : rien
ne permet d'interroger le quota Claude depuis GitHub, donc si le quota est
encore épuisé l'événement retombe dans le vide et le prochain passage
horaire réessaie ; un item qui reste coincé des jours est le signal que R6
doit remonter une routine cassée, pas un problème de quota.

Le même workflow exécute ensuite `scripts/sweep-merged-prs.mjs` (rattrapage
des issues laissées ouvertes par une PR auto-mergée dont la boucle
d'attente de `auto-merge-sync.yml` a expiré — voir Phase 5, incident PR
#264/#273), puis `scripts/dispatch-ready.mjs`, dans cet ordre précis pour
que le déblocage d'une issue profite au dispatch du même run.

### Dispatcher déclaratif : `.automation/routines.yml`

Le mapping label → routine → skill (table de `doc/automation/state-machine.md`
§2) vivait jusqu'ici dupliqué en texte libre dans cette section, dans
`state-machine.md` et dans chaque `SKILL.md`. `.automation/routines.yml`
en devient la version machine-lisible : une entrée par routine (`entity`,
`trigger_label`, `skill`, `concurrency_key`, plus `deduplicate_by`/
`max_iterations` en option pour R3/R4). Une nouvelle routine se déclare en
ajoutant une entrée ici, sans copier un workflow complet.

Le contrat est documenté en JSON Schema sous
`schemas/automation/routines.schema.json` — même statut que
`schemas/import/` : référence lisible du format, pas branchée sur un moteur
JSON Schema générique. La validation réelle est un validateur écrit à la
main, `scripts/automation-dispatch.mjs` (testé, `automation-dispatch.test.mjs`),
qui rejette entre autres deux routines déclarant le même couple
`entity`/`trigger_label` — la classe d'erreur qui a causé le double-fire de
R2 sur l'issue #99 (§4 ci-dessus). Ce script est appelé à deux endroits :

- Le job `automation-config` de `ci.yml` le lance sans variables
  d'environnement : il valide `.automation/routines.yml` et fait échouer la
  CI clairement (`::error::` par erreur trouvée) sur toute PR qui casse le
  fichier.
- `.github/workflows/automation-dispatch.yml` (nouveau workflow, trigger
  GitHub `issues`/`pull_request` `labeled`) le lance avec `EVENT_ENTITY`/
  `EVENT_LABEL` déduits de l'événement : il résout quelle routine matche et
  logue `routine`, `skill`, `entity`, `trigger_label` et `target_label`
  (toujours `automation:in-progress`, la cible du « claim the run », §4) en
  clair dans les logs du run.

Ce nouveau workflow ne remplace **pas** le déclenchement réel des routines
(toujours porté par les triggers configurés sur chaque routine
claude.ai/code/routines, cf. Phases 2/4/5) ni les workflows existants
(`requeue-lost-events.yml`, `needs-review-label.yml`, `dispatch-ready.mjs`,
...), volontairement laissés inchangés (issue #378) : c'est une couche
d'observabilité et de validation au-dessus du mapping existant, pas encore
le mécanisme de dispatch lui-même.

### Journal d'exécution idempotent

Chaque passage d'une routine sur une issue/PR doit rester traçable et
rejouable sans spammer la discussion (#376). `scripts/automation-log.mjs`
tient, pour une routine et une issue/PR donnée, **un unique commentaire**
retrouvé via un marqueur HTML caché en première ligne
(`<!-- automation-log:<routine> -->`) : `upsertAutomationLog()` cherche ce
marqueur parmi les commentaires existants et **met à jour** le commentaire
trouvé (`PATCH`) au lieu d'en créer un nouveau ; s'il n'existe pas encore,
il en poste un (`POST`). Le corps rendu suit le format cible de l'issue
(routine, date de déclenchement, commit analysé, statut
`running`/`succeeded`/`failed`/`manual-required`, itération, validations,
lien vers le run GitHub Actions), suivi d'une synthèse en texte libre
lisible par un humain. Comme `requeue-lost-events.mjs` et les autres
scripts de `scripts/`, c'est un script déterministe (zéro LLM, §2 principe
2) : `GH_TOKEN`/`REPO_OWNER`/`REPO_NAME` en entrée, `fetch()` brut vers
l'API REST, testé indépendamment (`scripts/automation-log.test.mjs`).

Comparer le SHA et le statut du journal existant à l'appel en cours
détecte qu'un même commit a déjà été traité par cette routine
(`alreadyProcessed` dans le retour de `upsertAutomationLog()`) — utile à
un appelant qui veut éviter un travail redondant sur une relance qui ne
change rien au HEAD SHA.

`review-status-sync.yml` est le premier appelant : au verdict
`automation:review-pass`/`automation:needs-fix` de R3, en plus du commit
status `claude/review` (§ ci-dessus), il tient désormais le journal
`pr-review` de la PR — itération lue depuis le label
`automation:attempt-N` courant s'il y en a un, lien
vers son propre run comme résultat. Les autres routines (R2, R4, R5)
n'écrivent pas encore leur propre journal ; les brancher suit le même
patron (une Action zéro-LLM au point où la routine traduit déjà son
verdict en signal GitHub — labels, commit status — plutôt que la routine
elle-même, qui n'a accès qu'aux outils MCP GitHub habituels et pas à un
appel script direct).

---

Table complète des transitions état → événement → routine → état cible,
catégorisation des labels (métier/contrôle/résultat) et règles de reprise/
échec/retry : voir `doc/automation/state-machine.md`, le contrat formel
dérivé de cette section et de la §4.

## 5. Labels (le bus d'événements)

Tous les labels de la machine à états portent le préfixe `automation:`
(issue #415 — table complète, catégories et combinaisons valides/interdites
dans `doc/automation/state-machine.md` §2).

| Label | Rôle |
|---|---|
| `automation:queued` | Spec validée, en attente d'un créneau de routine — promue en `automation:ready` une à la fois par le dispatcher (`scripts/dispatch-ready.mjs`) |
| `automation:ready` | Spec validée → déclenche R2 |
| `automation:in-progress` | Une routine travaille dessus |
| `automation:needs-review` | File d'attente pour `pr-review` (R3) — seul trigger GitHub possible sur une Routine, posé automatiquement à l'ouverture d'une PR, retiré par R3 en tout premier geste (« claim the run », §4) |
| `automation:review-pass` | Verdict `pr-review` (R3) : conforme → traduit en commit status `claude/review` succès |
| `automation:needs-fix` | Verdict `pr-review` (R3) : à corriger → traduit en commit status `claude/review` échec, déclenche R4 |
| `automation:needs-human` | Escalade : plafond d'itérations ou hors périmètre |
| `blocked` | Dépendance externe — retiré automatiquement par `unblock-issues.yml` une fois tous les bloqueurs natifs fermés |
| `automation:enabled` | Autorisé à l'auto-merge une fois les checks verts |
| `automation:attempt-1/2/3` | Compteur anti-boucle. **À `automation:attempt-3` : stop.** |
| `P0`…`P3` | Priorité (reprise de la sémantique de `.task/`) |

Aucun label `automation:done` : la fermeture GitHub et son `state_reason`
(`completed`/`not_planned`/`duplicate`) restent le seul signal de fin de vie
d'une issue.

### Liste blanche `automation:enabled` (à élargir par la donnée, pas à l'intuition)

**Autorisé au départ :** contenu, documentation, dépendances, refacto local sans
changement de comportement public.
**Exclu :** modèles sérialisés et migrations, ports/adapters, `apps/scoreo/public/`
(manifest, `sw.js`), config Vite/TS, navigation.

> Cohérent avec les règles du `CLAUDE.md` : tout modèle sérialisé doit rester
> backward-compatible, toute suppression/renommage exige une migration. Ce n'est
> pas un terrain pour une IA autonome.

---

## 6. Skills (`.claude/skills/`)

> Contrat de forme (template `SKILL.md`, format de sortie structuré des
> routines, checklist de conformité, conditions d'escalade
> `automation:needs-human`) : `doc/automation/skill-contract.md`. Ce
> contrat n'est pas encore appliqué aux skills existantes (#426, #427).

| Skill | Contenu |
|---|---|
| `project-conventions` | Délègue au `CLAUDE.md` : stack, commandes pnpm, arbo, architecture hexagonale, conventions de commit |
| `issue-to-spec` | Format de spec : contexte, périmètre/hors-scope, critères d'acceptation testables, comportements d'erreur/cas limites, stratégie de tests, fichiers impactés, risques/questions ouvertes, **catégorie de risque** (détermine le label `automation:enabled`), **verdict de readiness** (`READY_FOR_IMPLEMENTATION`/`NEEDS_CLARIFICATION`/`BLOCKED_BY_DEPENDENCY`, obligatoire) |
| `implement-task` | Branche `feat/<issue>-<slug>`, tests d'abord, `pnpm lint typecheck test build` vert, vérif visuelle, PR avec `Closes #N`, mise à jour de `doc/` (pre-commit checklist du `CLAUDE.md`) |
| `pr-review` | Checklist **subjective uniquement** : conformité à la spec, respect de l'archi hexagonale, backward-compat des schémas zod, doc à jour, dette introduite. Le mécanisable est déjà en CI |
| `address-feedback` | Corriger le périmètre signalé. Ne pas refondre. Ne retraite jamais un thread de review déjà résolu, priorise `blocking` avant `important`/nit, bascule sur `automation:needs-human` en cas de retour contradictoire/ambigu ou de suite de checks qui reste rouge, publie une synthèse (corrigé / non appliqué / arbitrage requis) à chaque run (issue #380) |
| `site-quality` | Deps, liens de doc, Lighthouse, PWA. Utilisée par R5 |
| `weekly-report` | Rapport hebdo : PR ouvertes > 3 jours, issues `automation:needs-human`, taux `automation:review-pass`/`automation:needs-fix`, incidents depuis le dernier rapport, recommandation sur la liste blanche `automation:enabled`. Utilisée par R6 |

**Règle :** une skill non éprouvée en interactif ne passe pas en autonome.

---

## 7. Phases et critères de passage

### Phase 0 — Fondations CI ⬅️ *en cours*

Le repo n'a **aucune CI de PR** : les tests tournent dans `deploy.yml`, donc
après le merge. Le site est cassé sur `main` au moment où on l'apprend.

- [x] `.github/workflows/ci.yml` — jobs `build`, `test`, `lint`, `doc-links`,
      `lighthouse` (rouge visible sur échec, toujours hors checks requis — voir
      §9)
- [x] `lighthouserc.json` — assertions en `error` depuis la mesure de la
      baseline (baseline mesurée : performance 0.96, accessibilité 0.95, bonnes
      pratiques 0.96, SEO 0.90 — catégorie `pwa` retirée des assertions, Lighthouse 12 ne
      la calcule plus par défaut). Seuil `performance` recalibré ensuite
      directement depuis des mesures sur le runner CI, voir §9.
- [x] `gh secret set GOOGLE_CLIENT_ID` (le build en dépend) — exécuté par Rémi
      via `setup-repo.sh`
- [x] `setup-repo.sh` — labels, `allow_auto_merge`, branch protection
      (`enforce_admins: true`, 0 approbation). Script écrit et **exécuté par
      Rémi** ; checks requis actuels : `lint`/`test`/`build`/`doc-links`/`e2e`/
      `claude/review` (`claude/review` ajouté au script le 2026-07-14, gate
      Phase 2 franchi — voir Phase 2 ci-dessous ; `e2e` ajouté le 2026-07-18,
      issue #141 — le job existe dans `ci.yml` depuis la PR #113 mais n'était
      pas déclaré requis, ce qui laissait l'auto-merge ignorer un `e2e` rouge).
      **Le script doit être ré-exécuté par Rémi pour que ce changement prenne
      effet côté branch protection.** Toujours hors de portée d'une session
      Claude Code : modifie la config partagée du repo, nécessite un `gh`
      authentifié en admin.
- [x] Alléger `deploy.yml` : retirer l'étape `Test` (doublon avec la CI de PR),
      garder le déploiement et le smoke test

**Gate :**
1. PR normale → verte.
2. PR volontairement cassée (erreur de lint + test rouge + lien mort dans
   `doc/`) → **rouge, bouton de merge grisé**.
3. `git push origin main` → refusé.

**État constaté (2026-07-13) :** 1. confirmé (PRs mergées, CI verte). 2. partiellement
confirmé : la CI existante (`lint`/`test`/`build`) a déjà bloqué une vraie PR
(dependabot #63, Vite 5→8, échec CI, jamais mergée) ; le cas combiné avec
`doc-links` reste à observer sur une prochaine PR cassée. 3. `setup-repo.sh` a
été exécuté par Rémi — **non vérifié indépendamment** depuis une session
Claude Code (aucun outil MCP GitHub ni `gh` CLI ne permet de lire l'état de la
branch protection ici). À confirmer par un test réel (`git push` direct sur
`main` refusé) avant de considérer ce point définitivement acquis.

### Phase 0 bis — Migration `.task/` → Issues

Le `CLAUDE.md` disait : *« tu prends le premier ticket P0 non fait dans
`.task/` »*. **Deux sources de vérité = R2 lira le mauvais backlog.**

- [x] Convertir les tickets `.task/` en issues (priorité → label `P0`…`P3`) —
      `.task/` était déjà vide au moment de cette phase, rien à convertir
- [x] Réécrire la section *Workflow* du `CLAUDE.md` : le backlog, ce sont les
      Issues + le Project
- [x] Supprimer `.task/` — déjà absent du repo
- [x] Créer le GitHub Project + workflows intégrés (auto-add, PR merged → Done)
      — créé manuellement par Rémi : https://github.com/users/remhiit/projects/1
      (Project utilisateur, hors de portée d'une session Claude Code : les
      Projects v2 sont une API GraphQL distincte, non exposée par les outils
      MCP GitHub disponibles ici, et aucun `gh` CLI authentifié n'est accessible)
- [x] Action cron de sync label ↔ colonne (déterministe, coût nul) —
      `.github/workflows/project-sync.yml` + `scripts/sync-project-status.mjs`.
      Se déclenche sur `issues`/`pull_request` `labeled`/`unlabeled`/`closed`,
      plus un cron toutes les 6h en filet de sécurité. Sens unique (labels →
      champ `Status`), jamais l'inverse — cohérent avec le principe directeur
      « les labels sont le bus d'événements ». Nécessite le secret
      `PROJECT_TOKEN` (PAT classique, scope `project`) via `setup-repo.sh` ;
      tant qu'il est absent, le job se termine proprement sans erreur (pas de
      check rouge en boucle)
- [x] Correctif (#195) : une issue fermée restait figée sur « In progress »
      car `in-progress` n'est jamais retiré à la fermeture
      (`close-linked-issues.mjs` ferme sans toucher aux labels) et le sync ne
      réconciliait que les items ouverts. La fermeture prime désormais sur le
      label : `desiredStatus` bascule un item fermé avec `state_reason:
      completed` (issue) — ou une PR mergée, qui n'a pas de `stateReason`
      natif mais dont `state: MERGED` porte le même signal — vers `Done`,
      quel que soit le label restant ; une fermeture `not_planned` (ou une PR
      closed sans merge) n'impose aucun statut. La réconciliation planifiée
      couvre aussi les items fermés dans les 30 derniers jours, pour que les
      issues déjà fermées avant ce correctif finissent par basculer.

### Phase 1 — Les skills (interactif uniquement)

Écrire les 6 skills. **Gate :** 2–3 tickets réels fermés en interactif en
n'utilisant *que* les skills, sans les corriger à la volée dans le chat.

- [x] Les 6 skills sont écrites dans `.claude/skills/` : `project-conventions`,
      `issue-to-spec`, `implement-task`, `pr-review`, `address-feedback`,
      `site-quality`
- [x] **Gate franchi** : 3 tickets réels fermés en interactif via
      `issue-to-spec` + `implement-task` seuls, sans correction manuelle en
      aparté — #61 (favicon), #69 (double trigger CI), #71 (icônes
      lucide-react)

### Phase 2 — R3, la review (première autonomie)

**Révisé (2026-07-13) :** deux contraintes découvertes en construisant cette
phase, aucune des deux visible avant de l'essayer réellement :

1. Aucune session Claude Code (interactive ou routine) n'a accès au CLI `gh`
   ni à un outil MCP posant un commit status brut — seulement les outils MCP
   GitHub habituels (issues/PRs/labels). Le mécanisme d'origine (la routine
   poste directement le commit status via `gh api`) n'est donc pas réalisable.
2. Une Routine n'accepte qu'**un seul** trigger GitHub, et ce trigger ne
   filtre que sur une action précise (`opened` seul, `synchronize` seul, …)
   *ou* toutes les actions de la catégorie — jamais une combinaison des deux
   qu'on visait (`opened` + `synchronize`).

Le jugement (subjectif, LLM) et la traduction en verdict machine
(déterministe) sont donc séparés en trois étapes, cohérent avec le principe
directeur « le déterministe ne passe pas par un LLM » :

1. **`.github/workflows/needs-review-label.yml`** (zéro LLM, déclenché sur
   `pull_request.opened`/`ready_for_review`/`synchronize`) retire **d'abord**
   `review-pass`/`needs-fix` s'ils traînent d'une passe précédente, **puis**
   pose `needs-review` — la file d'attente qui contourne la limite « un seul
   trigger ». Couvrir `synchronize` re-déclenche une review à chaque
   nouveau push (fix, rebase) ; retirer le verdict précédent garantit que
   GitHub émette bien un événement `labeled` même si R3 reconclut le même
   verdict sur le nouveau commit (sinon pas de transition absent→présent,
   donc `review-status-sync.yml` ne se déclenche pas — bloqué à répétition
   sur les PR #91/#93, corrigé sur #94). L'ordre compte : retirer avant de
   poser `needs-review` évite que ces retraits matchent eux-mêmes le filtre
   du trigger R3 (qui ne matche que quand `needs-review` est déjà présent) —
   dans l'autre sens, ça a déclenché R3 deux fois sur la PR #94 elle-même
   (une fois sur l'ajout, une fois sur le retrait du verdict précédent).
2. **La routine R3** a pour unique trigger GitHub `pull_request`, toutes
   actions, filtré sur `Labels is one of needs-review`. Le filtre ne matche
   que tant que le label est présent, donc ça se comporte comme un
   déclenchement one-shot plutôt qu'un vrai « toutes actions » : une review a
   lieu quand `needs-review` apparaît, puis plus rien tant qu'il n'est pas
   reposé. `pr-review` retire `needs-review` en tout premier geste (« Claim
   the run », pas à la fin — voir §4 et l'incident Phase 5/PR #111), pour
   qu'aucun label posé pendant la review elle-même ne puisse re-matcher le
   trigger. Reposer `needs-review` plus tard (par R4) redéclenche une
   review — le mécanisme sert aussi de boucle de re-review pour la Phase 5.
   Garde ajoutée (#153) : au claim, `pr-review` note le HEAD SHA de la PR ;
   juste avant de poser le verdict, il le relit et, s'il a bougé (push
   intercalé pendant la review), ne pose aucun verdict — repose
   `needs-review` seul et s'arrête, plutôt que de tamponner un commit jamais
   relu.
3. **`.github/workflows/review-status-sync.yml`** (zéro LLM, déclenché sur
   `pull_request.labeled`) traduit `review-pass`/`needs-fix` en commit status
   `claude/review` (succès/échec) via `GITHUB_TOKEN`.

- [x] Skill `pr-review` mise à jour avec l'étape de labellisation (pose
      `review-pass`/`needs-fix`, retire `needs-review`)
- [x] `needs-review-label.yml` et `review-status-sync.yml` écrits et
      testables indépendamment (pas besoin de la routine pour valider leur
      logique)
- [x] Labels `needs-review`/`review-pass` ajoutés à `setup-repo.sh`
- [x] **Routine créée** par Rémi sur https://claude.ai/code/routines — pipeline
      confirmé bout-en-bout sur PR #73 (label `review-pass` posé par la
      routine → commit status `claude/review` succès posé par
      `review-status-sync.yml`)

**Suivi du gate (~10 PR, au moins un « non » correct avant de rendre
`claude/review` requis) :**

| PR | Verdict R3 | Note |
|---|---|---|
| #73 | `review-pass` | Infra Phase 2 elle-même |
| #75 | `review-pass` | Fix bouton New Match |
| #77 | `review-pass` | Fix `client_id` manquant OAuth |
| #79 | `review-pass` | Fix endpoint upload Google Drive — diff vérifiée manuellement (2026-07-14), qualité réelle : bug identifié correctement, tests de non-régression ajoutés, doc mise à jour |
| #80 | `review-pass` | Doc : suivi de ce gate |
| #81 | `review-pass` | Doc : consigne de langue française dans `CLAUDE.md` |
| #82 | `review-pass` | Doc : création de la routine R5 |
| #83 | `review-pass` | Doc : piège `pnpm outdated` exit code 1 dans `site-quality` |
| #84 | `review-pass` | R5 : bump react/react-dom 19.2.7 |
| #85 | `review-pass` | R5 : bump vitest/jsdom |
| #86 | `review-pass` | R5 : bump eslint tooling + 2 fixes mécaniques (nouvelle règle `react-hooks/set-state-in-effect`) |
| #87 | `review-pass` | R5 : bump vite 8.1.4 (réussit là où #63 avait échoué) |
| #88 | `review-pass` | R5 : bump zod 4.4.3 |
| #89 | `review-pass` | Fix upload d'artefact Lighthouse (signalé par R5) |
| #90 | `needs-fix` → fix poussé | Ce log lui-même : R3 a relevé qu'une phrase (l'incident de contamination croisée ci-dessous) était présentée comme un fait vérifié alors qu'introuvable dans l'historique du repo — voir plus bas |

15/10+ PR passées. **Gate franchi** : #90 est le premier `needs-fix` à
raison — R3 a correctement bloqué une affirmation invérifiable (un incident
de contamination croisée entre agents, rapporté par R5 dans son propre
résumé de run mais sans trace dans aucun commit/issue/PR — recherche
`git log --all --grep` et `search_issues` infructueuse), sans crier au loup
sur le reste de l'entrée (comptage des PR et tableau jugés corrects). Le fix
consiste à reformuler la phrase pour qu'elle soit explicitement attribuée à
R5 comme auto-déclaration non vérifiée indépendamment, plutôt que présentée
comme un fait établi :

> diffs de #84-#88 vérifiées manuellement le 2026-07-14 ; R5 a signalé dans
> son propre résumé de run un incident de contamination croisée entre agents
> qu'elle dit avoir corrigé avant tout push — non vérifié indépendamment,
> aucune trace dans l'historique du repo.

Le critère qualitatif du plan est donc rempli : le check a dit « non » au
moins une fois, à raison. `claude/review` peut être ajouté aux checks
requis (`setup-repo.sh`) — changement de configuration partagée du repo,
à faire valider avant exécution.

### Phase 3 — R5, hygiène hebdo

Routine planifiée → `site-quality` → une PR par catégorie. Risque nul, et ça rode
le chemin *routine → PR → R3* avant d'y injecter du code généré.

Démarrée en parallèle du gate de la Phase 2 (pas en violation du principe
« ne pas sauter de phase » : R5 alimente elle-même le compteur de PR dont ce
gate a besoin) :

- [x] **Routine créée** (`trig_01Y4gg6E5uMfD9XWFpBBxrt8`, cron `0 6 * * 1` —
      chaque lundi 6h UTC), pointée vers `.claude/skills/site-quality`. À
      la différence de R3, un trigger planifié est créable directement par
      outil, pas seulement depuis claude.ai/code/routines — aucune étape
      manuelle ici.
- [x] **Premier run réel observé** (2026-07-14) : accès correct au repo
      depuis une session fraîche par cron confirmé, 5 PR ouvertes (une par
      catégorie concernée : #84-88 dépendances, jamais combinées), plus un
      vrai bug d'infra repéré et corrigé (upload d'artefact Lighthouse, #89).
      Prochain run planifié : 2026-07-20.

### Phase 4 — R2, l'implémentation — **Gate franchi (2026-07-16)**

**Révisé (2026-07-15) :** conçu au départ avec une Action (`dispatch-ready.yml`)
+ trigger API, sur l'hypothèse (erronée) que les triggers GitHub d'une
routine ne couvraient que Pull request/Release, pas Issues — ce que la doc
consultée alors semblait indiquer. Rémi a trouvé en pratique un déclencheur
GitHub natif sur les événements Issue dans l'interface. Même mécanisme que
R3 : trigger `issues`, action `labeled`, filtré `Labels is one of ready`.
Chaque événement qui matche démarre sa propre session avec le ticket précis
dans son contexte — cf. `implement-task/SKILL.md` § « Which issue » — donc
même avec plusieurs tickets `ready` en attente simultanément, chaque session
sait exactement lequel traiter, sans l'indirection Action + secrets
`ROUTINE_ID`/`ROUTINE_TOKEN` (supprimée, cf. `deployment.md` § Issue
Implementation (R2)).

- [x] `.claude/skills/implement-task/SKILL.md` — section « Which issue »
      ajoutée (contexte du trigger pour R2, sélection manuelle sinon)
- [x] `.github/workflows/dispatch-ready.yml` et les secrets `ROUTINE_ID`/
      `ROUTINE_TOKEN` supprimés — plus nécessaires
- [x] Coquille de la routine R2 créée par outil (`trig_01D2429DJ7p8cok2VDiCANPS`)
- [x] **Routine R2 finalisée par Rémi** : prompt court + trigger GitHub
      `issues.labeled` filtré `ready` configurés. R2 est opérationnelle.

**Gate :** 5 tickets faciles traités, PR lisibles, **merge encore manuel**.

| Issue | PR | Note |
|---|---|---|
| #96 | #97 | Bouton Disconnect visible quand la synchro échoue après connexion — `review-pass`, mergée sans intervention manuelle |
| #99 | #100 | `deleteAll()` sur les ports Player/GameType/Match pour un vrai remplacement des données au « Keep remote » — risque Élevé, mergée, voir incident double-fire ci-dessous |
| #102 | #104 | Nouvelle phase `Restoring` pour éviter le flash du bouton Connect au montage de `SyncScreen` — premier `needs-fix` de R3 sur ce ticket (piège `useEffect`/paint vs `useLayoutEffect`), corrigé, mergée |
| #106 | #107 | Nettoyage définitif des joueurs inactifs sans match enregistré (`hardDelete` sur `PlayerRepository`) — risque Élevé, mergée |
| #108 | #109 | Retrait de l'email comme signal de connexion (jamais renvoyé par l'API GIS Token Model) au profit d'un rafraîchissement silencieux systématique — risque Élevé, mergée |

**Compteur (mergées) : 5/5 — gate franchi.** Les 5 tickets ont été traités
de bout en bout par R2 (branche + code + tests + PR), passés par R3, et
mergés manuellement par Rémi (comme prévu par le gate — l'auto-merge reste
Phase 5). Le critère qualitatif tient aussi : les PR couvrent des risques
réels (dont trois **Élevé** — #100, #107 et #109 — touchant ports/adapters),
pas seulement des changements triviaux.

**Renfort (2026-09-03, issue #381) — R2 vers une exécution idempotente et
traçable :** la Phase 4 avait rodé le chemin heureux (une issue, une PR) ;
restaient trois angles morts pour un run interrompu ou rejoué sans
nettoyage manuel. `implement-task/SKILL.md` gagne :

- une garde en tout premier geste (avant même le claim du label) : si
  `closed_by_pull_requests` de l'issue liste déjà une PR ouverte, R2
  s'arrête net plutôt que d'en ouvrir une seconde ;
- la réutilisation de la branche `feat/<issue>-<slug>` si elle existe déjà
  sans PR associée (run précédent interrompu avant l'ouverture de la PR),
  au lieu d'en créer une nouvelle avec un slug différent ;
- un plan court écrit avant toute modification de code, repris tel quel
  dans le corps de la PR, à côté d'un résumé des validations (les 5
  contrôles de l'étape 6) — la PR documente désormais son propre plan et
  son propre résultat de validation, pas seulement `Closes #N` ;
- une issue de secours si la suite de contrôles reste rouge après
  implémentation : même traitement que la spec ambiguë (commentaire +
  `automation:needs-human`), plutôt qu'une PR poussée dans un état qu'on
  sait cassé ou une issue laissée bloquée en silence sur
  `automation:in-progress`.

`doc/automation/state-machine.md` §4 (rows #4-#6) documente ces gardes
comme le contrat formel ; `.automation/routines.yml` reste inchangé — la
garde « une seule PR par issue » est une vérification sémantique du
contenu de la skill, pas un critère déclaratif que le dispatcher peut
exprimer (le fichier ne connaît que le mapping label → routine, pas l'état
des PR d'une issue) ; `concurrency_key: issue` y bornait déjà l'exécution
concurrente d'un seul run R2 par issue, ce qui reste la bonne granularité
côté dispatch.

**Incident (2026-07-15) — double-fire de R2 sur l'issue #99 :** même classe
de cause que le double-fire de R3 (PR #94), côté labellisation cette fois.
`P2` et `ready` posés en un seul appel `issue_write` (`labels: ["P2",
"ready"]`) — GitHub émet un événement `labeled` par label ajouté, et le
filtre du trigger GitHub de R2 (`issues`, action `labeled`, filtré `Labels
is one of ready`) matche sur l'état courant des labels de l'issue, pas sur
le label spécifique nommé par l'événement. Les deux livraisons de webhook
(`labeled: P2` et `labeled: ready`) ont donc chacune matché le filtre,
produisant deux PR quasi identiques (#100 et #101, toutes deux `Closes
#99`). #101 fermée comme doublon, #100 conservée et mergée. Correctif :
`issue-to-spec/SKILL.md` (PR #103) exige désormais que `ready` soit posé
seul, dans son propre appel, toujours en dernier.

### Phase 5 — R4 et auto-merge ⬅️ *en cours*

R3 en échec → label `needs-fix` → trigger GitHub direct (même mécanisme que
R2/R3, pas d'indirection Action + API) → R4. R4 gère lui-même son compteur
`attempt-N` (comme R3 gère déjà `review-pass`/`needs-fix`/`needs-review`) :
**à `attempt-3` : stop, retire `auto`, pose `needs-human`.** Sans ce
plafond, une seule PR brûle le quota journalier en une nuit.

Auto-merge conditionné au label `auto` uniquement, via une Action
déterministe (`auto-merge-sync.yml`) qui active/désactive le auto-merge
natif GitHub à la pose/au retrait du label — pas une routine, zéro LLM,
cohérent avec le principe directeur §2.2.

- [x] `.claude/skills/address-feedback/SKILL.md` — section « Which PR »
      et logique du compteur `attempt-N` explicitées (mécanique identique
      à `pr-review`/`implement-task`)
- [x] `.github/workflows/auto-merge-sync.yml` écrit — active/désactive
      l'auto-merge natif GitHub sur pose/retrait du label `auto`
- [x] Coquille de la routine R4 créée par outil (`trig_014VemW9wW5MopAjDHaaiYK7`,
      poke-only)
- [x] **Routine R4 finalisée par Rémi (2026-07-16)** : trigger GitHub
      `pull_request.labeled` filtré `needs-fix` + connecteurs GitHub MCP
      configurés. R4 est opérationnelle.

**Gate :** 2 semaines, zéro merge qu'on aurait refusé. **Horloge démarrée
le 2026-07-16.**

**Incident (2026-07-16) — chaîne de déclenchements R4 sur la PR #111 :**
le premier vrai cycle `needs-fix` → R4 a mis au jour un défaut de
conception (repéré et diagnostiqué par Rémi, pas par une session Claude
Code) : `address-feedback/SKILL.md` posait `attempt-1` sans retirer
`needs-fix` au préalable. Le trigger GitHub de R4 matche tant que
`needs-fix` est présent, donc ce dépôt de `attempt-1` a lui-même
re-déclenché R4, qui a reposé `attempt-2` (toujours avec `needs-fix`
présent), puis `attempt-3` → `needs-human` — le tout en about une minute,
sans trois vrais essais de correction (le seul vrai correctif nécessaire,
la mise à jour de `deployment.md`, avait déjà été poussé par l'un des
runs). Correctif : principe général « claim the run » ajouté à l'§4 —
toute routine déclenchée par un label doit le retirer et poser
`in-progress` en tout premier geste, avant de poser quoi que ce soit
d'autre. Appliqué à `address-feedback/SKILL.md` (retire `needs-fix` avant
`attempt-N`) et rétroactivement à `pr-review/SKILL.md` (retire
`needs-review` en premier geste plutôt qu'au dernier — R3 n'avait pas
encore été prise en défaut sur ce point précis, mais partageait la même
fragilité de principe).

**Incident (2026-07-17) — auto-merge natif désactivé au niveau du repo :**
sur les PR #125 et #126 (toutes deux `auto`/`review-pass`, CI verte),
`auto-merge-sync.yml` échouait silencieusement au moment de poser le
label `auto` : `GraphQL: Auto merge is not allowed for this repository`
(repéré par Rémi, confirmé via les logs du job). Pas un problème de
timing — le réglage `allow_auto_merge` du repo (censé être posé par
`setup-repo.sh`) n'était en fait pas actif. Une fois activé manuellement
par Rémi, les deux PR ont mergé correctement — #126 automatiquement par
`github-actions[bot]` (premier auto-merge de bout en bout observé), #125
peu après. **Le mécanisme d'auto-merge est donc confirmé fonctionnel** une
fois le réglage repo en place ; à surveiller si `setup-repo.sh` doit être
corrigé pour que ce PATCH prenne effet de façon fiable la prochaine fois
qu'il tourne sur un nouveau repo.

**Cause racine identifiée et corrigée (#140) :** dans `setup-repo.sh`, le
PATCH `gh api "repos/$REPO" -X PATCH -f allow_auto_merge=true` utilisait
`-f`, qui envoie la **chaîne** `"true"` au lieu du **booléen** `true` —
contrairement au reste du script, qui utilise correctement `-F` pour les
champs booléens de la branch protection. Corrigé en `-F
allow_auto_merge=true`, avec une vérification post-PATCH (`gh api
"repos/$REPO" --jq .allow_auto_merge` doit imprimer `true`) qui fait
échouer le script explicitement (`exit 1`) plutôt que de laisser le
réglage silencieusement inactif.

**Incident (2026-07-17) — fermeture auto des issues liées cassée par un
`GITHUB_TOKEN` sous-privilégié :** `auto-merge-sync.yml` ne déclarait que
`contents: write` et `pull-requests: write`. Or `gh pr merge --auto
--squash` fait aussi office de fermeture des issues référencées par
« Closes #N » dans le corps de la PR — effet de bord qui requiert
`issues: write`. Constaté sur PR #124 (Closes #122) et PR #126 (Closes
#114), toutes deux auto-mergées par `github-actions[bot]` : les deux
issues liées sont restées ouvertes après merge, alors que PR #123 (Closes
#121), mergée manuellement par un humain, avait fermé #121 normalement.
Le bug cassait silencieusement toute fermeture auto sur les PR auto-
mergées, et bloquait en cascade `unblock-issues.yml` (#122), qui dépend
d'un vrai événement `issues.closed`. Correctif : `issues: write` ajouté
aux `permissions` de `auto-merge-sync.yml` (#128).

**Incident (2026-07-18) — le correctif de #128 était insuffisant (#139) :**
la PR #138 (Closes #120), branchée depuis `main` *après* le merge du
correctif ci-dessus, a auto-mergé avec succès (run `auto-merge-sync.yml`
vert, `issues: write` bien présent) — et #120 est pourtant restée ouverte,
comme avant le correctif. Cause probable : `gh pr merge --auto --squash`
ne fait qu'*activer* l'auto-merge natif GitHub ; le squash-merge réel a
lieu plus tard, de façon asynchrone, dès que les checks requis passent —
en dehors de l'exécution du job qui a appelé cette commande. Le bloc
`permissions:` d'un workflow ne scope le `GITHUB_TOKEN` que pendant
l'exécution de ce job précis, donc n'a vraisemblablement aucun effet sur
cette complétion différée gérée nativement par GitHub — indépendamment du
réglage repo-wide « Workflow permissions », que ni un outil MCP GitHub ni
`gh` ne permettent de lire depuis une session ici (même limite déjà notée
Phase 0 pour la branch protection). Plutôt que de dépendre de ce réglage
non vérifiable, correctif appliqué : `.github/workflows/
close-linked-issues.yml` (+ `scripts/close-linked-issues.mjs`), déclenché
sur `pull_request` `closed` filtré `merged == true`, avec son propre
`GITHUB_TOKEN` scopé `issues: write` — parse les mots-clés de fermeture
(`close(s/d)`, `fix(es/ed)`, `resolve(s/d)`) suivis de `#N` dans le corps
de la PR mergée et ferme explicitement chaque issue référencée du même
dépôt (ignore les références cross-repo `owner/repo#N`). Ce mécanisme ne
dépend plus du chemin (auto-merge natif ou merge manuel) ni du réglage
repo-wide. **Vérification bout-en-bout en attente** : nécessite qu'une
vraie PR référençant `Closes #N` merge après ce correctif — à confirmer
sur la prochaine PR mergée (y compris celle de #139 elle-même, mergée
manuellement vu son risque Élevé).

**Incident (2026-07-29) — root cause confirmé, `close-linked-issues.yml`
lui-même ne se déclenche jamais sur les auto-merges du bot (#208, #212) :**
deux PR auto-mergées par `github-actions[bot]` (#219 Closes #208, #221
Closes #212) ont laissé leurs issues liées ouvertes. Vérification dans
l'historique des runs : `close-linked-issues.yml` n'a produit **aucun**
run du tout pour ces deux merges, alors que tous les autres workflows
(`ci.yml`, `review-status-sync.yml`, `project-sync.yml`) ont bien réagi à
ces mêmes PR dans la même fenêtre — et que des dizaines d'autres issues se
sont fermées normalement sur la même période. Root cause confirmé par la
doc GitHub (concepts/security, `GITHUB_TOKEN`) : *« events triggered by the
GITHUB_TOKEN will not create a new workflow run »*, pour éviter les
déclenchements récursifs. `auto-merge-sync.yml` active l'auto-merge via
`${{ github.token }}` ; le squash-merge réel, effectué plus tard par le
service natif de GitHub, est attribué à cette même identité
(`github-actions[bot]`) — l'événement `pull_request.closed` qui en
résulte est donc supprimé pour tout déclenchement de nouveau workflow,
y compris celui d'un workflow tiers avec son propre token
(`close-linked-issues.yml`). Ce n'est donc pas un problème de permission
mais une limite structurelle de GitHub Actions : aucun nouveau
`workflow_run` ne peut naître d'un événement causé par le `GITHUB_TOKEN`.

Correctif (#223) : `auto-merge-sync.yml` attend lui-même, dans le **même
job**, que son propre auto-merge se réalise (poll `gh pr view --json
state`, ~20s d'intervalle, ~20 min de plafond), puis ferme les issues
liées directement dans ce job — en réutilisant `scripts/
close-linked-issues.mjs` (étendu d'un mode d'invocation par numéro de PR
explicite). Comme il s'agit du même run et non d'un nouveau `workflow_run`,
la restriction ci-dessus ne s'applique pas. `close-linked-issues.yml`
reste inchangé, toujours utile pour les merges manuels (non concernés par
cette limite).

**Incident (PR #264) — la boucle d'attente de `auto-merge-sync.yml` a
expiré (#273) :** la branche de la PR #264 était en retard sur `main`,
l'auto-merge natif a dû la mettre à jour, ce qui a relancé la CI et repoussé
le merge réel 6 min après la fin des ~20 min de boucle. L'issue #252 est
restée ouverte en `in-progress`, et le dispatcher (`MAX_IN_FLIGHT = 1`) a
cessé de promouvoir la moindre issue en `ready` pendant ~1 h 30 — la boucle
d'attente, bien que déjà généreuse, reste par construction une fenêtre
finie face à un merge asynchrone dont la durée n'est pas bornée côté
GitHub.

Correctif (#273) : plutôt que de rallonger cette boucle (déplacerait juste
le point de défaillance plus loin, cf. « Hors scope » de l'issue),
`scripts/sweep-merged-prs.mjs` rattrape après coup, à chaque passage du
balayeur horaire (`requeue-lost-events.yml`, **avant**
`dispatch-ready.mjs` pour que le déblocage profite au dispatch du même
run) : liste les PR récemment fermées (`GET /pulls?state=closed&sort=
updated&direction=desc`), retient celles réellement mergées dans une
fenêtre de rattrapage de `CATCHUP_WINDOW_DAYS` (7 jours), et ferme les
issues encore ouvertes qu'elles référencent — en réutilisant
`extractClosedIssueNumbers` et `closeIssue` (désormais exportée) de
`scripts/close-linked-issues.mjs`, sans dupliquer le parsing des mots-clés
de fermeture. Idempotent (une issue déjà fermée n'appelle jamais `PATCH`).
La boucle synchrone de `auto-merge-sync.yml` reste en place pour le cas
nominal (fermeture immédiate, pas d'attente jusqu'au prochain passage
horaire) ; ce rattrapage la rend simplement non critique — son expiration
n'est plus un point de défaillance unique, seulement un délai de rattrapage
d'au plus une heure.

### Phase 6 — Observabilité

R6 hebdo. C'est le rapport qui pilote l'élargissement de la liste blanche `auto`.

- [x] `.claude/skills/weekly-report/SKILL.md` écrite (issue #146) : PR
      ouvertes > 3 jours, issues `needs-human`, décompte
      `review-pass`/`needs-fix` de la semaine (approximatif — voir la
      section « Ce que ce rapport ne peut pas mesurer » de la skill),
      incidents `automation-plan.md` depuis le rapport précédent,
      recommandation explicite sur la liste blanche `auto`. Livrable :
      issue `Rapport hebdo <date>`, `P3`, sans `ready`.
- [ ] Rodage interactif (2-3 runs réels) avant de considérer la skill
      éprouvée — règle §6 « une skill non éprouvée en interactif ne passe
      pas en autonome »
- [ ] Création de la routine planifiée R6 (à la main de Rémi, après le
      rodage ci-dessus)

---

## 8. Risques identifiés

| Risque | Mitigation |
|---|---|
| Boucle R3 ↔ R4 infinie | Plafond `automation:attempt-3`, puis `automation:needs-human` |
| Quota de runs épuisé par une seule PR | Même plafond + `concurrency` dans la CI |
| Review sans mordant (le modèle relit son propre travail) | Le mécanisable sort de la review et devient un job CI. `claude/review` ne juge que le subjectif |
| Budget Lighthouse désactivé à la première PR rouge | Seuils `error` fixés depuis la baseline (accessibilité/bonnes pratiques/SEO, marge anti-bruit inter-runs) ou depuis des mesures directes sur le runner CI (performance, écart bien trop grand avec la baseline — voir §9), job toujours hors checks requis (#147) |
| Régression de backward-compat sur les schémas zod | Hors liste blanche `automation:enabled` : merge manuel obligatoire |
| `pull_request_target` expose les secrets | Ne jamais y exécuter le code de la PR |
| Événement de routine perdu par plafond de runs | Balayeur horaire (`requeue-lost-events.yml`) qui rejoue tout label déclencheur orphelin |
| Boucle d'attente de `auto-merge-sync.yml` expirée avant la fin réelle du merge (#273) | `scripts/sweep-merged-prs.mjs`, exécuté par le même balayeur horaire, rattrape les issues encore ouvertes des PR mergées dans les 7 derniers jours |

## 9. Décisions ouvertes

- **Identité distincte pour les routines.** Une GitHub App ouvrant les PR à la
  place de R2 redonnerait un approbateur légitime. Complexité non justifiée tant
  que le commit status requis fait le travail. À reconsidérer si le repo
  s'ouvre à des contributions externes.
- **Seuils Lighthouse définitifs — figés (#147, 2026-07-22 ; performance
  recalibrée le 2026-07-23 suite à la revue R3 de la PR #183).** Baseline
  mesurée en Phase 0 (performance 0.96, accessibilité 0.95, bonnes pratiques
  0.96, SEO 0.90), hors du runner CI. Seuils retenus : accessibilité ≥ 0.90,
  bonnes pratiques ≥ 0.90, SEO ≥ 0.85 (~0.05 sous la baseline, marge
  anti-bruit inter-runs — ces trois catégories restent stables sur le runner
  CI). Pour `performance`, le seuil ~0.05-sous-baseline (0.90) s'est révélé
  inapplicable : mesuré directement sur le runner CI (`treosh/lighthouse-ci-action`,
  build `apps/scoreo/dist/` servi tel que le fait le job `lighthouse`), le score varie de
  0.65 à 0.81 sur 3 exécutions consécutives du même commit — un écart de plus
  de 25 points de la baseline, dû à la variance CPU du runner GitHub Actions
  partagé et pas à une régression du site. Seuil `performance` recalibré à
  ≥ 0.60 (sous le plancher observé de 0.65) et `numberOfRuns` passé de 1 à 3
  (LHCI retient la médiane) pour réduire ce bruit inter-runs. Assertions au
  niveau `error` (`lighthouserc.json`) et `continue-on-error` retiré du job
  `lighthouse` (`ci.yml`) — un échec rend le job rouge et visible sur la PR.
  Le job reste **hors** des checks requis de la branch protection : rouge =
  signal, pas encore bloquant. Critère pour le rendre requis plus tard :
  quelques semaines de recul sans faux positif (bruit inter-runs faisant
  chuter un score sous le seuil sans régression réelle) — à revoir alors via
  `setup-repo.sh`, hors scope de #147.
