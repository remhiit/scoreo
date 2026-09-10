# Plan d'automatisation — Scoreo

Document de référence pour l'automatisation du développement de `remhiit/scoreo`
via les **routines Claude Code**.

> **Comment utiliser ce document.** Il est la source de vérité de l'architecture
> d'automatisation. Toute session Claude Code travaillant sur ce sujet doit le
> lire en premier. Il indique la phase en cours et le critère de passage à la
> suivante. Ne pas sauter de phase : chaque gate protège la suivante.

**Phase en cours : 5 bis — Coordinateur R2+R3+R4 (#469 livre le skill ; mise en service non faite, préalable de durée de run non documenté — voir §7 Phase 5 bis), en parallèle de la Phase 5 — R4 et auto-merge (routine opérationnelle depuis le 2026-07-16, gate de 2 semaines démarré). Tranche 4/4 de #430 (#470, séparation en deux relecteurs) livrée en avance sur le gate normalement posé en §7 Phase 5 bis (« un lot de tickets réels traités... avant d'envisager la tranche 4 ») — décision explicite portée par l'issue #470 elle-même (readiness `READY_FOR_IMPLEMENTATION`, dépendance #469 seule, close), pas un contournement silencieux ; même mise en service non faite que la tranche 3, pour la même raison (préalable de durée de run non documenté). Premier cycle needs-fix→R4 observé et corrigé le jour même (chaîne de déclenchements sur PR #111, cf. §4 « claim the run » et Phase 5). Phase 4 close : gate franchi (2026-07-16, 5/5 tickets mergés). Phases 0 à 3 closes : gate Phase 2 franchi (2026-07-14, PR #90) et premier run réel de R5 observé (2026-07-14, PR #84-89).**

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
`issues` `opened`/`edited` et **réconcilie** le lien natif GitHub `blocked_by`
avec cette section, via `scripts/sync-issue-dependencies.mjs` : il lit l'état
courant (`GET .../dependencies/blocked_by`), calcule la différence avec les
`Dépend de #N` déclarés, puis pose ce qui manque (`POST
.../dependencies/blocked_by`, GA depuis août 2025) et retire ce qui n'est
plus déclaré (`DELETE .../dependencies/blocked_by/{issue_id}`) — retirer une
ligne du corps retire donc le lien natif correspondant, et vider la section
retire tous ses liens. Une issue **sans** section `## Dépendances` n'est
jamais touchée, dans aucune direction : c'est ce qui protège les liens posés
à la main. Le repérage de la section est ancré en début de ligne (une
mention en prose de son nom, entre backticks ou dans un bloc de code — y
compris l'exemple de format documenté dans `issue-to-spec/SKILL.md` lui-même
— ne détourne pas le match) ; si plusieurs titres `## Dépendances` existent
dans un même corps, le premier (de haut en bas) fait autorité, les suivants
sont ignorés. Idempotent (un lien déjà posé renvoie 422, ignoré ; un lien
déjà absent renvoie 404 au DELETE, ignoré) et tolérant aux numéros invalides
(un bloqueur introuvable est journalisé et ignoré, sans faire échouer le job
pour les autres). Ce lien natif est le préalable au déblocage automatique :
une fois interrogeable par API, une automatisation peut détecter qu'une
issue n'a plus de bloqueur ouvert et la faire passer en `automation:queued`.

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
`automation:in-progress` est inférieur à `MAX_IN_FLIGHT` (1), passe en
revue les issues `automation:queued`, triées par priorité (`P0` > `P1` >
`P2` > `P3`) puis date de création croissante, retire `automation:queued`
de la première **éligible** puis pose `automation:ready` **seul, dans son
propre appel, en dernier** (leçon #99, §4 « claim the run »).

L'éligibilité (`decideDispatchPromotion`, testée dans
`scripts/dispatch-ready.test.mjs`) se décide en deux temps pour borner le
nombre d'appels API (#432) : d'abord les labels, gratuits — jamais promue si
elle porte `automation:needs-human` ou `automation:in-progress` — puis,
seulement pour les issues encore candidates après ce filtre, une lecture de
leur lien natif `GET .../dependencies/blocked_by` (posé par
`sync-issue-dependencies.yml`), dans l'ordre de priorité, avec arrêt à la
première dont tous les bloqueurs sont fermés. Le label `blocked` n'est
**jamais** lu par cette décision : c'est un signal d'affichage dérivé
(`doc/automation/state-machine.md` §2), pas la source de vérité — celle-ci
est le lien natif, dans les deux sens (un `blocked` obsolète sans lien
n'empêche rien ; un lien ouvert sans label bloque quand même). Une réponse
404 ou une liste vide sur `blocked_by` vaut « non bloquée », jamais
« bloquée » par défaut (même convention que `unblock-issues.mjs`) ; un échec
d'appel (5xx, rate limit) fait remonter l'erreur et n'aboutit sur aucune
promotion ce run plutôt que de promouvoir à l'aveugle — le rattrapage se
fait au passage horaire suivant. Chaque candidate écartée (label ou
dépendance) est journalisée avec le motif retenu.

Garde anti-rafale R5 : si plus de `MAX_NEEDS_REVIEW_BACKLOG` (2) PR ouvertes
portent `automation:needs-review`, ne dispatche pas à ce run — laisse R3
absorber la file d'abord. Par construction, le débit d'événements vers R2 ne
dépasse plus jamais le quota.

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

`requeue-lost-events.mjs` porte un second rôle, distinct du rejeu
ci-dessus : une routine qui a bien claim le run (`automation:in-progress`
posé) peut mourir sans jamais reprendre — limite d'usage, compaction, crash
— et laisser l'item gelé indéfiniment, sans aucun signal (#379). Contrairement
à un label déclencheur orphelin, rejouer aveuglément serait dangereux ici :
la routine a pu laisser un état partiel (une branche, une PR ouverte), et une
deuxième session reprenant le même item pousserait sur la même branche.
`sweepStaleOwnership()` (même script, exécuté après les deux sweeps
ci-dessus dans `main()`) traite donc toute possession `automation:in-progress`
posée depuis plus de `STALE_OWNERSHIP_THRESHOLD_MINUTES` (180 min, mesurée
sur le dernier événement `labeled` de la timeline, comme `minutesSinceLabeled`
ci-dessus) comme périmée et escalade : sur une issue, `automation:needs-human`
puis `automation:queued` sont posés avant que `automation:in-progress` ne
soit retiré, dans cet ordre (§6, même règle que R2/R4) ; sur une PR,
`automation:needs-human` seul. Le label déclencheur, s'il est encore présent
sur le même item, n'est jamais touché — ni retiré ni reposé, l'escalade
l'emporte sur le rejeu. Un item déjà porteur de `automation:needs-human` est
laissé strictement intact (état terminal). L'exécution après les deux sweeps
existants garantit l'ordre : `requeueIfOrphaned` a déjà sauté l'item tant que
`automation:in-progress` y était encore posé, donc aucun rejeu du
déclencheur ne peut avoir lieu avant l'escalade. Un commentaire idempotent
(marqueur `<!-- automation-log:stale-ownership -->`, via le mécanisme
générique de `scripts/automation-log.mjs`) nomme le label périmé, son âge et
l'action effectuée.

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

### `TaskContext` : le contexte d'exécution commun des routines (#401)

Les décisions de complexité, de risque et de modèle (#402, #404, #405) ont
besoin d'une vue stable de l'issue ou de la PR déclenchante — sans dépendre
directement de la forme brute d'un événement GitHub. `TaskContext` est ce
document versionné, documenté comme contrat dans
`schemas/automation/task-context.schema.json` (même statut que
`routines.schema.json` : référence lisible, pas branchée sur un moteur JSON
Schema générique) et construit par `scripts/task-context.mjs`
(`buildTaskContext`), un script déterministe et **zéro appel réseau**
(principe directeur §2.2) : chaque champ vient soit du payload de
l'événement `issues`/`pull_request` du dispatcher, soit d'un paramètre déjà
en main de l'appelant (routine, run id, éventuellement une liste de
fichiers modifiés ou les bloqueurs natifs déjà lus) — jamais d'un appel API
supplémentaire depuis ce script. Il inclut : identifiants de run/routine/
tentative/trigger, l'entité GitHub (issue ou PR, labels, corps borné et
passé à la redaction), les métadonnées du dépôt, les fichiers pertinents
(section `## Fichiers impactés` du corps) et modifiés (si fournis), les
paquets affectés qui s'en déduisent (`derivePackages` : `apps/scoreo/` →
`scoreo`, `packages/<nom>/` → `<nom>`, sinon `root`), les dépendances
connues (section `## Dépendances`, même parseur que
`sync-issue-dependencies.mjs`), un résumé de diff quand il existe, et les
contraintes de taille appliquées.

Donnée indisponible plutôt qu'inventée : chaque sous-section porte un champ
`available`/`unavailableReason` explicite plutôt que d'omettre le champ —
une issue sans PR, une liste de fichiers modifiés jamais fournie à ce run,
ou une PR trop volumineuse pour être résumée (`changed_files` du payload
webhook dépassant `constraints.maxChangedFiles`) donnent tous
`diff.available: false` avec une raison, jamais un champ manquant. Un
événement GitHub incomplet ou d'un type non géré (ni `issues` avec une
issue, ni `pull_request` avec une PR) fait échouer `buildTaskContext`
explicitement — aucun contexte partiel n'est produit ni écrit.

Redaction : avant qu'ils n'entrent dans le contexte, le titre et le corps de
l'entité passent par `redactSecrets`, qui retire les motifs de secrets
usuels (jetons GitHub, clés AWS, blocs de clé privée PEM, en-têtes
`Bearer`, et toute affectation `MA_CLE_SECRET=valeur`/`TOKEN: valeur`) —
seul le nom de la variable reste visible, jamais la valeur. Le contexte
n'expose que le compteur d'occurrences redactées (`redaction.occurrences`),
jamais les valeurs retirées, y compris dans les logs de la CLI. Le corps est
en plus borné à `constraints.maxBodyChars` (troncature signalée dans
`truncation.fields`, jamais silencieuse) — même logique de stratégie de
troncature observable que pour les listes de fichiers.

`.github/workflows/automation-dispatch.yml` construit ce contexte juste
après avoir résolu la routine (une routine résolue → `task-context.mjs`
tourne, produit l'artefact JSON, publié via `actions/upload-artifact`) ;
`scripts/automation-log.mjs` (§ ci-dessous) sait référencer cet artefact
depuis le journal d'une routine via son champ optionnel `contextUrl`
(rendu en ligne `- Contexte :` du commentaire), reliant ainsi une décision
d'automatisation à son contexte source. Support uniquement pour l'instant :
aucune routine ne consomme encore ce contexte pour router une décision
(câblage réel hors scope de #401, dépend de #402/#404/#405) — cette brique
reste déterministe et garde sa valeur d'observabilité quelle que soit
l'option retenue pour ce câblage.

### `ComplexityAssessment` : évaluation déterministe de complexité (#402)

Attribuer un modèle à une routine (#404) ne peut pas reposer sur un mapping
fixe `trivial → modèle économique`, `complexe → modèle premium` : une tâche
courte peut être risquée, une tâche longue surtout mécanique. `ComplexityAssessment`
mesure l'effort de raisonnement et de mise en œuvre — dispersion dans le
monorepo, volume de changement, ambiguïté de la spec — et reste une échelle
**distincte** de `change-risk` (#387, gravité potentielle d'une erreur) :
il ne les fusionne pas, ne les recalcule pas l'un depuis l'autre, et ne doit
jamais servir à masquer ou contourner un niveau de risque `high`.

Zéro LLM, zéro appel réseau (principe directeur §2, même statut que
`task-context.mjs`) : `scripts/complexity-assessment.mjs#assessComplexity`
prend en entrée un `TaskContext` déjà construit (#401) — dont il dérive
chaque signal, sans jamais interroger l'API GitHub lui-même — et produit un
`ComplexityAssessment` documenté comme contrat dans
`schemas/automation/complexity-assessment.schema.json` (même statut de
référence lisible que `task-context.schema.json`/`routines.schema.json`).

Huit dimensions auditées, chacune bornée et justifiée (`dimensions.<clé>.reason`) :
dispersion dans le monorepo (nombre de paquets touchés, `TaskContext.packages`),
volume de fichiers pertinents/modifiés, ambiguïté de la spec (sections requises
manquantes, section « Critères d'acceptation » vide de case à cocher),
dépendances connues (déclarées + bloqueurs natifs), volume de changement
estimé (résumé de diff du payload webhook), charge de validation
(nombre de surfaces sensibles touchées — approximation grossière, propre à
ce script, qui ne prétend pas produire un niveau de risque), nouveauté
(fichiers marqués « (nouveau) » dans « ## Fichiers impactés ») et surfaces
transverses (nombre de couches d'architecture distinctes touchées :
domain/application/infrastructure/ui/scripts/schemas-doc/config-root).
Chaque dimension porte un score et un maximum (somme des maximums = 100) et,
quand le signal source manque (aucun fichier fourni, diff indisponible),
`available: false` et un motif explicite plutôt qu'un score nul silencieux
— la confiance globale (`high`/`medium`/`low`, même échelle que les findings
de `pr-review`) en tient compte : elle descend d'un cran par signal
indisponible, et tombe à `low` quand la spec n'apporte aucun critère
d'acceptation exploitable (corps vide, section absente, ou section présente
sans case à cocher).

Bandes de score versionnées séparément du calcul, `.automation/complexity-thresholds.yml`
(même sous-ensemble minimal de YAML — mappings imbriqués de scalaires, pas de
listes — analysé par le même parseur générique que `.automation/routines.yml`,
`scripts/automation-dispatch.mjs#parseRoutinesYaml`) : `trivial` (score ≥ 0),
`standard` (≥ 20), `complex` (≥ 45), `very-complex` (≥ 70). Règle d'arrondi
fixée, pas laissée à l'implémentation : un score exactement égal au `min`
d'une bande appartient à cette bande, jamais à la précédente. Cas limite
documenté et testé (issue #402) : une spec vide ou sans critère d'acceptation
exploitable ne peut jamais ressortir `trivial`, quel que soit le score — un
plancher explicite la fait remonter à `standard` au minimum, journalisé dans
`limits`.

Override humain via un label `complexity:<niveau>` sur l'issue/PR (déjà
présent dans `TaskContext.entity.labels`, aucun appel API supplémentaire) :
un label reconnu bascule `level`/`provenance` (`heuristic` → `manual`) sans
jamais toucher `score`/`dimensions`/`confidence`/`reasons`, qui restent
l'évaluation heuristique d'origine — visible à côté de l'override
(`override.heuristicLevel`), jamais détruite. Plusieurs labels
`complexity:*` contradictoires sur la même entité désactivent l'override
(la spec ne tranche pas laquelle retenir) et le signalent dans `limits`
plutôt que d'en choisir un arbitrairement.

Publié dans le journal idempotent d'une routine (§ ci-dessous) via le champ
optionnel `complexity` de `renderAutomationLog`/`upsertAutomationLog`
(`scripts/automation-log.mjs`) — une ligne `- Complexité : `<niveau>` (score
.../100, confiance ..., provenance ...)`, plus l'override et les raisons
quand présents — même statut « support uniquement » que `contextUrl` pour
`TaskContext` : aucune routine ne consomme encore cette évaluation pour
router une décision (câblage réel hors scope de #402, dépend de #404/#405).

### Fallback LLM de complexité, sous-agent classifieur (#403)

L'heuristique déterministe (#402) décroche sur les issues peu structurées ou
transverses : sa `confidence` tombe à `low`, ou plusieurs dimensions
ressortent `available: false`. `scripts/complexity-llm.mjs` ajoute une
seconde lecture, sémantique, pour ces cas-là — jamais un remplacement, jamais
la voie par défaut. Spec révisée après l'arbitrage de #423 (option C, § ci-
dessous) : ce n'est pas une Action appelant une API de fournisseur, mais un
**sous-agent classifieur** (`.claude/agents/complexity-classifier.md`) lancé
par le futur skill coordinateur (#430) — ce câblage reste hors scope de
#403, qui ne fournit que les règles et le contrat qu'il consommera.

Trois fonctions pures, zéro effet de bord, zéro réseau, comme le reste de
`scripts/complexity-*.mjs` :

- `shouldRunLlmFallback(assessment, labels)` — vrai exactement dans trois
  cas (`confidence === 'low'` ; au moins deux dimensions `available: false` ;
  le label `complexity:llm` posé sur l'entité), faux sinon, et **jamais**
  vrai quand `assessment.override` est non nul : un humain a déjà tranché,
  le fallback ne le contredit pas.
- `validateLlmComplexityResponse(response)` — valide la réponse du
  classifieur contre `schemas/automation/complexity-llm-response.schema.json`
  (`level`, `confidence`, `reasons`, `uncertainties`, `promptVersion`), même
  précédent que `validateComplexityAssessment`/`validateTaskContext` : une
  réponse non conforme, absente (sous-agent indisponible) ou partielle (run
  interrompu) n'est jamais consommée — l'heuristique fait foi, et l'incident
  est consigné dans `limits`.
- `consolidateComplexity(heuristic, llm)` — fusionne les deux lectures sans
  jugement discrétionnaire : même niveau des deux côtés → `level` inchangé,
  `provenance` reste `heuristic`, `confidence` = la plus basse des deux ;
  écart d'exactement une bande → `level` = celui du LLM, `provenance` =
  `llm`, `confidence` = la plus basse des deux ; écart de deux bandes ou
  plus → `confidence` forcée à `low` **et** `escalationRequired` forcé à
  `true`, `level` restant celui de l'heuristique. `score`/`dimensions`/
  `reasons`/`override`/`thresholds`/`generatedAt` ne bougent jamais, comme
  pour un override manuel ; seuls `level`/`provenance`/`confidence`/
  `escalationRequired` peuvent changer.
  `escalationRequired` (booléen, `complexity-assessment.schema.json`) est le
  signal structuré que ce désaccord franc exige une escalade vers
  `automation:needs-human` plutôt qu'une décision de modèle silencieuse —
  **distinct** d'une `confidence: 'low'` ordinaire (celle que l'heuristique
  #402 produit nativement sur une spec ambiguë, où `escalationRequired`
  reste `false` : `assessComplexity` ne le pose jamais à `true` par
  elle-même). C'est la distinction qui manquait à la première version de ce
  contrat : `scripts/model-router.mjs#routeModel` traite déjà tout
  `confidence === 'low'` comme « majorer la bande, prudence, continuer »
  (`bumpBandForLowConfidence`), jamais comme un arrêt — un futur appelant
  (#430) doit tester `escalationRequired === true` explicitement pour
  distinguer ce cas, jamais grep-parser le texte libre de `limits`. Le
  détail du passage (niveau heuristique, niveau LLM, niveau consolidé,
  confiance finale, version de prompt) reste, lui, journalisé comme une
  entrée de plus dans `limits` — pas de champ dédié pour ce détail narratif,
  seul le booléen d'escalade en a un. `scripts/automation-log.mjs` publie
  `limits` sous la ligne Complexité du journal idempotent
  (`- Limites : ...`) et, quand `escalationRequired` est vrai, une ligne
  dédiée (`- ⚠️ Escalade requise : ...`) distincte de cette confiance basse
  ordinaire.
- `resolveClassifierModel(routingPolicy, modelCatalog)` — résout le modèle
  de sous-agent déclaré par `.automation/routing-policy.yml` pour la clé
  `routines.classification` (une entrée hors du jeu des routines dispatchées,
  voir `doc/automation/model-routing.md`) : un seul candidat par bande, à
  poids 100, **jamais** une escalade par bande de complexité (circulaire :
  le classifieur existe pour déterminer cette bande). Cas limite spécifié
  (#403) : une politique ne nommant aucun modèle de classification est un
  refus explicite nommant le fichier et la clé manquante, jamais un repli
  implicite sur le modèle du coordinateur.

Le sous-agent lui-même (`.claude/agents/complexity-classifier.md`) déclare
son modèle en frontmatter (`model: haiku`, résolu ci-dessus), n'a que des
outils en lecture seule (`Read`, `Grep`, `Glob` — aucune écriture GitHub,
aucun outil d'édition), et un prompt versionné (`CLASSIFIER_PROMPT_VERSION`)
qui répond en un seul JSON conforme au schéma ci-dessus, sans poser de
question, sans démarrer d'implémentation. Au plus un appel par run, y
compris après une réponse invalide — pas de seconde tentative (garantie du
futur appelant, #430, pas de ce fichier lui-même, qui n'orchestre rien).

### Routage par sous-agent : où s'applique le choix de modèle (#423)

**Tranché le 2026-09-07 : option C — routage par sous-agent, à l'intérieur du
coordinateur (#430).** Les routines restent des Routines Claude Code
déclenchées par un événement GitHub ; rien ne bascule vers une exécution par
GitHub Actions appelant des APIs de fournisseurs (option B), et le dispatcher
déclaratif (#378) reste ce qu'il dit être : une couche d'observabilité et de
validation, pas le mécanisme d'exécution.

**L'hypothèse dont dépend l'option a été vérifiée concrètement** (2026-09-07,
session interactive) : depuis une session tournant sur Opus 5, un sous-agent
lancé avec un modèle déclaré rapporte bien ce modèle dans son propre prompt
système — « You are powered by the model named Haiku 4.5. The exact model ID is
`claude-haiku-4-5-20251001` ». Le modèle est donc une propriété du sous-agent,
pas de la session : un coordinateur sur modèle fort peut déléguer une étape
légère à un modèle moins cher, **sans clé API et sans réécrire l'exécution**.

Deux façons de le déclarer, toutes deux disponibles :

- le frontmatter `model:` d'une définition d'agent, `.claude/agents/<nom>.md` —
  c'est le fichier qui déclare le modèle d'un sous-agent ;
- le paramètre `model` de l'outil `Agent`, qui prime sur le frontmatter et
  permet de choisir à l'exécution, en fonction de la bande de complexité.

**Point d'insertion.** Le composant qui lit `.automation/routing-policy.yml`
(#400) et applique le choix est le **skill du coordinateur** (#430,
`.claude/skills/`) : il tient déjà `TaskContext` (#401) et
`ComplexityAssessment` (#402), il est le seul à lancer des sous-agents, et il
est donc le seul appelant du routeur pur `scripts/model-router.mjs` (#404). La
politique associe `routine` × bande de complexité → modèle de sous-agent, et
elle est validée en CI par le job `automation-config` comme le reste de
`.automation/`. Aucun secret, aucun fichier de workflow modifié.

**Conformité aux principes §2 et aux contraintes §3.** Le prompt d'une routine
reste une ligne pointant vers une skill versionnée (principe 5) : c'est la
skill du coordinateur qui route, pas la configuration de la Routine. Le choix
de modèle est déterministe et sans LLM (principe 2, comme `ComplexityAssessment`).
Le déclenchement reste événementiel (principe 3) et le bus de labels est
inchangé (principe 4), donc les contraintes §3 — pas d'auto-approbation, verdict
par commit status via label, déclencheurs disponibles — ne bougent pas.

**Périmètre de l'épic après arbitrage** (2026-09-07) :

| Issue | Sort | Raison |
|---|---|---|
| #400 catalogue + politique | Livrée | Le contrat reste valable ; le catalogue se réduit d'abord aux modèles de sous-agent disponibles dans Claude Code, sans champ de secret ni endpoint |
| #401 `TaskContext` | Livrée | Inchangée, consommée par le coordinateur |
| #402 `ComplexityAssessment` | Livrée | Inchangée, entrée du routage |
| #403 fallback LLM de complexité | Conservée, spec révisée, non prioritaire | Sous C l'appel devient un sous-agent classifieur : plus de secret, plus d'adapter, plus de budget fournisseur — la spec actuelle (API, `Secrets`) est caduque |
| #404 moteur de routage | Livrée | `scripts/model-router.mjs#routeModel` — voir `doc/automation/model-routing.md` § Algorithme du routeur. Fonction pure inchangée dans son principe ; la dimension « disponibilité fournisseur » reste dans le score/les filtres pour rester générique au contrat #400, mais reste neutre (défaut : disponible) tant qu'aucun appelant ne fournit de signal réel sous le routage par sous-agent |
| #405 adapters multi-provider | **Fermée** | Sous C, aucun appelant dans le dépôt. À rouvrir avec le mode API ou le chantier d'extraction, pas avant |
| #406 dry-run | Livrée | Le chaînage appartient au coordinateur, pas au dispatcher : le dry-run journalise la décision de modèle sans changer le sous-agent réellement lancé — voir § « Mode dry-run » ci-dessous |
| #407 activation progressive | Conservée, à découper après #430 | Reste `NEEDS_CLARIFICATION` : huit chantiers, dimensionnement conditionné par le coordinateur |

**Échéance de l'option B.** B n'est plus un préalable au routage. Elle est
rattachée à l'**objectif d'extraction de l'automatisation hors de Scoreo**, et
n'a de sens qu'au moment où l'un des deux déclencheurs suivants se présente :
le passage à la consommation de crédits API pour dépasser le plafond de
l'abonnement, ou le premier utilisateur externe sans abonnement Claude Code.
Tant qu'aucun des deux n'existe, B ne s'instruit pas.

**Coût de B, estimé grossièrement**, pour que ce report soit argumenté et pas
implicite : la boucle agentique (outils fichiers, git, GitHub, reprise sur
erreur) est aujourd'hui fournie gratuitement par le harnais Claude Code et
devrait être réécrite ; s'y ajoutent la gestion des secrets et sa revue de
sécurité, les adapters et leurs tests contractuels, le portage des skills en
prompts d'API avec sorties structurées, et la reprise des phases 0 à 5 du
présent plan. Ordre de grandeur : **15 à 25 PR et plusieurs semaines**, plus un
coût récurrent facturé au token — contre une poignée de PR pour C, qui réutilise
l'existant. Le rapport est d'environ un ordre de grandeur, ce qui suffit à
justifier l'ordre C puis B.

### `ModelCatalog` et `RoutingPolicy` : le contrat de routage (#400)

Livre le socle de configuration décrit ci-dessus : `.automation/model-catalog.yml`
(un modèle de sous-agent par entrée — `provider`/`model` génériques,
capacités, paliers de qualité/coût/latence, limites de risque/complexité,
`fallback` optionnel) et `.automation/routing-policy.yml` (une politique par
routine — capacités requises, candidats pondérés par bande de complexité,
`min_score`, `fallback` de bande, `risk_overrides`). `.automation/routines.yml`
référence désormais une `routing_policy` par routine plutôt que de dupliquer
la politique. Contrat documenté dans `doc/automation/model-routing.md`
(exemple multi-provider, exemple de fallback circulaire) et en JSON Schema
(`schemas/automation/model-catalog.schema.json`,
`schemas/automation/routing-policy.schema.json`), validé en pratique par
`scripts/automation-dispatch.mjs#validateModelCatalog`/`#validateRoutingPolicy`/
`#validateRoutingPolicyCoverage` — même précédent « validateur écrit à la
main » que `validateRoutinesConfig`, et même sous-ensemble minimal de YAML
(`parseRoutinesYaml`, désormais étendu aux scalaires booléens `true`/`false`
qu'aucun fichier `.automation/` n'utilisait avant ce contrat).

Zéro appel fournisseur, zéro secret versionné : conforme au périmètre révisé
par #423 (§ ci-dessus), le catalogue ne décrit que des modèles de sous-agent
Claude Code aujourd'hui. Même statut « support uniquement » que `TaskContext`
et `ComplexityAssessment` — le job `automation-config` de `ci.yml` valide les
trois fichiers `.automation/*.yml` à chaque exécution. Le skill coordinateur
résout désormais une politique à chaque run (§ « Mode dry-run » ci-dessous,
#406), mais toujours sans en appliquer la décision — router une décision
réelle reste le périmètre de #407.

### Le coordinateur : R2+R3+R4 fusionnés en un run (#469)

Tranche 3/4 de #430, livrée par `.claude/skills/coordinator/SKILL.md`. Un
run remplace la chaîne R2 → (R3 ↔ R4)* qui coûte aujourd'hui jusqu'à six
runs de routine pour deux tours de correction (§4 « claim the run » ci-
dessus documente déjà pourquoi cette chaîne existe) : implémentation,
review, correctif tournent comme trois sous-agents d'une seule session
(`Agent` tool), chacun exécutant, procédure inchangée, le skill qui portait
déjà ce rôle — `implement-task`, `pr-review`, `address-feedback`. La
déclaration `.automation/routines.yml` reflète ce remplacement : l'entrée
`coordinator` occupe désormais le couple `issue`/`automation:ready` qu'
`implement-task` occupait seule (un même couple ne peut être déclaré deux
fois — validé par `scripts/automation-dispatch.mjs`, la garde anti-double-
fire de l'incident #99) ; les trois skills restent invocables directement
(interactif, ou comme sous-agent du coordinateur), simplement sans leur
propre entrée de déclenchement séparée pour ce couple.

**Isolation des sous-agents de review.** Le point dur de la fusion : la
review doit rester indépendante du récit que l'implémenteur fait de son
propre travail, pas seulement de son code. Depuis la tranche 4 (#470), elle
est en plus scindée en **deux** sous-agents aux corpus disjoints — un
relecteur **fonctionnel** (spec de l'issue, diff, `doc/functional/`) et un
relecteur **technique** (diff, `doc/technical/architecture.md`,
`project-conventions`, jamais la spec de l'issue). Le découpage ne se
justifie que par cette disjonction : deux relecteurs lisant les mêmes
entrées ne seraient qu'un seul relecteur en double. Le coordinateur lance
**deux** sous-agents **frais** (jamais une reprise du sous-agent
d'implémentation, jamais l'un lisant l'autre) et ne transmet à chacun que ce
que son propre corpus autorise — jamais le plan, le raisonnement ou la
description de PR de l'implémenteur, jamais un commentaire posté pendant ce
même run, et jamais la sortie de l'autre relecteur. La ligne de partage est
la provenance du contexte, pas son volume : un résumé du raisonnement de
l'implémenteur (ou de l'autre relecteur) est aussi interdit que sa sortie
brute. L'interdiction est écrite des deux côtés — `coordinator/SKILL.md` (ce
que le coordinateur transmet à chacun) et `pr-review/SKILL.md` § « Context
isolation (coordinator sub-agent only) », qui porte désormais une variante
par corpus — pour qu'un sous-agent de review qui irait chercher plus de
contexte de sa propre initiative ne perce pas l'isolation par la porte de
derrière. Un finding formé hors du corpus assigné (le relecteur technique
commentant la conformité à la spec, par exemple) est journalisé mais tagué
`corpus: out` — il n'entre jamais dans l'arbitrage, faute d'avoir été formé
sur les bonnes entrées.

**Le verdict découle mécaniquement des findings**, comme pour R3 (§ « R3
idempotent » ci-dessous), mais calculé maintenant à partir des **deux**
relecteurs par une fonction pure et testée, `scripts/review-verdict.mjs`
(`computeReviewVerdict`) : au moins un finding `blocking`/`important` en
corpus, une fois les deux relecteurs combinés et un éventuel doublon
dédupliqué → un tour de correctif ; aucun → convergé. Un désaccord entre les
deux relecteurs (l'un passe, l'autre bloque) est tranché par ce « ou »
mécanique, jamais par une lecture des deux review par le coordinateur. Si
l'un des deux relecteurs échoue ou ne rend rien, le verdict n'est **jamais**
calculé sur le seul relecteur restant — la fonction rend `needs-human` et
nomme le ou les relecteurs manquants, ce qui déclenche l'escalade
(`coordinator/SKILL.md` § Escalade) plutôt qu'une conclusion hâtive. Le
coordinateur n'arbitre jamais ce verdict lui-même dans les deux cas.

**Labels réutilisés, et un piège structurel évité.** Le coordinateur pose
`automation:coordinator-owned` sur sa PR dès sa création (garde
`needs-review-label.yml`, #468, déjà livrée) et le retire à la fin de son
run, succès ou escalade. Pour le compteur de tours de correctif, il pose
`automation:attempt-N` (label sûr — aucun déclencheur GitHub n'y filtre) et,
une fois convergé, `automation:review-pass` (ce qui fait tourner
`review-status-sync.yml` normalement : statut `claude/review`, journal
`pr-review`). Il ne pose en revanche **jamais** `automation:needs-review` ni
`automation:needs-fix` sur une PR qu'il possède — ces deux labels sont les
déclencheurs GitHub natifs de R3 et R4 respectivement, configurés au niveau
de la Routine elle-même (pas d'une Action qu'on pourrait garder par une
condition `if:`, à la différence de `needs-review-label.yml`) ; les poser
démarrerait une session R3 ou R4 indépendante, non coordonnée, sur la même
branche — exactement la classe de double-fire que « claim the run »
(§4 ci-dessus) documente déjà pour R2/R3/R4 entre eux. C'est pour cette
raison structurelle, pas seulement par choix de conception, que le
coordinateur gère son propre compteur de tentatives et son propre verdict
plutôt que de les faire transiter par les labels déclencheurs existants.

**Reprise après un run mort.** Le coordinateur tient
`automation:in-progress` sur l'**issue** pendant toute la durée du run
(implémentation + jusqu'à trois tours de review/correctif), exactement
comme R2 le fait aujourd'hui pour la durée du cycle R3 ↔ R4 (§1 de
`doc/automation/state-machine.md`). Un crash en cours de run se lit donc
dans l'état des labels de la même façon qu'un R2/R4 mort aujourd'hui, et se
rattrape par le même mécanisme, sans rien construire de nouveau : le
balayeur de possession périmée (`requeue-lost-events.mjs`,
`STALE_OWNERSHIP_THRESHOLD_MINUTES`, #467, déjà livré) escalade vers
`automation:needs-human` après 180 minutes. La reprise passe donc toujours
par l'escalade, jamais par un re-déclenchement automatique — cohérent avec
le hors-scope explicite de #469 sur #429 (libération du pipeline à
l'escalade).

**Journaux par rôle.** Aucun outil MCP disponible à une session ne permet
d'éditer un commentaire existant (§ « R3 idempotent » ci-dessous) — le
coordinateur ne peut donc pas tenir lui-même un commentaire marqué mis à
jour en place. Comme pour R3, ce travail reste celui d'une Action
déterministe : `.github/workflows/coordinator-log-sync.yml` (nouveau)
observe les mêmes labels que le coordinateur pose déjà ci-dessus —
`automation:coordinator-owned` (une fois, à l'ouverture de la PR : journal
de rôle « implémentation ») et `automation:attempt-1/2/3` sur une PR
`coordinator-owned` (à chaque tour : journal de rôle « correctif ») — et
appelle `scripts/automation-log.mjs` avec un nom de routine distinct par
rôle (`coordinator-implement`, `coordinator-fix`), donc un marqueur HTML
distinct par rôle via son mécanisme existant (`markerFor`). Le rôle
« review » réutilise tel quel le journal `pr-review` existant
(`review-status-sync.yml`, déclenché par la pose d'`automation:review-pass`
que le coordinateur effectue lui-même à la convergence) — aucun nouveau
mécanisme nécessaire pour ce rôle-là.

Depuis #470, `scripts/automation-log.mjs` porte en plus deux marqueurs par
relecteur (`coordinator-review-functional`, `coordinator-review-technical`)
et un champ optionnel `findings` qui rend chaque finding avec sa sévérité,
le ou les relecteurs qui l'ont rendu, et un tag « hors corpus » le cas
échéant — ce qui permet au journal d'une PR d'attribuer chaque finding à
son relecteur (critère d'acceptation #470). Comme pour `metrics`
ci-dessous, ces deux marqueurs et ce champ sont testés unitairement mais ne
sont **pas encore** alimentés par un workflow réel : aucune Action ne les
pose aujourd'hui, faute d'événement de label dédié à « ce relecteur a
terminé son tour ». Le canal actuellement disponible pour l'attribution est
le commentaire de synthèse du coordinateur (`coordinator/SKILL.md` §
« Attribution des findings ») ; le câblage d'une Action réelle vers ces deux
marqueurs reste un suivi, pas une régression de cette livraison.

`automation:attempt-N` étant posé *avant* que le sous-agent de correctif
démarre, le journal « correctif » s'ouvre en `running` : il ne peut pas
annoncer une réussite que personne n'a encore constatée. Il faut donc un
événement pour le refermer, et le tour de correctif lui-même n'en produit
aucun — la convergence pose `automation:review-pass` (en retirant les
labels `attempt-*`), l'escalade `automation:needs-human`, jamais un nouvel
`attempt-N`. Ces deux labels de fin de run, observés tant que la PR porte
encore `automation:coordinator-owned`, closent donc le journal en
`succeeded`/`failed` ; l'option `onlyIfRunning` de `automation-log.mjs`
reprend l'itération du journal ouvert (l'événement de clôture ne la porte
pas) et ne fait rien du tout quand il n'y a aucun journal à clore — un run
convergé dès la première review n'a eu aucun tour de correctif et n'en
inventera pas un. Sans cela, toute PR coordinateur ayant eu au moins un
tour de correctif laisserait un journal « correctif en cours » visible
indéfiniment après le merge.

**Métriques**, collectées dès #469 : nombre de tours de review/correctif
réellement exécutés (0 à 3), et deux signaux auto-déclarés par la session
elle-même (compaction de contexte observée, run approchant une limite
d'usage). #469 en nommait une quatrième, les tokens par run, **retirée des
critères d'acceptation par arbitrage humain sur #473** : à la différence des
trois ci-dessus, rien de disponible aujourd'hui côté session n'expose un
décompte de tokens fiable pour son propre run. Si un tel signal apparaît, il
fera l'objet d'un ticket dédié, pas d'un ajout silencieux. Le champ
optionnel `metrics` de `scripts/automation-log.mjs` (ces trois valeurs
brutes) reste tel quel, publié uniquement dans le commentaire de synthèse du
coordinateur — inchangé par ce qui suit.

**`RunMetrics` : l'enregistrement structuré par run (#477).** Trois valeurs
auto-déclarées ne suffisent pas à confronter une décision de routage (#404)
à l'issue réelle du run qu'elle a proposé de router — la donnée sans
laquelle ni l'activation (#476) ni un budget ne peuvent être calibrés.
`scripts/run-metrics.mjs#buildRunMetrics(input)` assemble, à partir de ce
qu'un run du coordinateur connaît déjà en fin de course (routine, entité,
`ComplexityAssessment.level`/`provenance`, niveau de risque, `RoutingDecision
.selectedModel`/`fallbacks`, mode résolu par la matrice d'activation, modèle
avec lequel le sous-agent a réellement tourné, versions de TaskContext/
RoutingPolicy/ModelCatalog, durée, statut final, itérations de correctif,
CI verte au premier passage, escalade éventuelle, nombre de findings par
relecteur, et les deux signaux d'usage déjà auto-déclarés ci-dessus), un
`RunMetrics` (schemas/automation/run-metrics.schema.json) — un enregistrement
par run, jamais une agrégation (hors scope ici, § « Calibration du routage
(#481) » plus bas pour l'agrégation elle-même). Le coût n'y est jamais
collecté en unité monétaire :
le mode sous-agent consomme un abonnement, pas une facturation au token —
`durationSeconds` et les indicateurs d'usage en tiennent lieu, documentés
comme tels dans le schéma.

Toute donnée indisponible pour ce run (un `RoutingDecision` non calculable
en mode observe sans section `## Catégorie de risque` exploitable, un
modèle réellement utilisé inconnu, un tour de review qui n'a jamais eu
lieu...) est nommée dans `missingFields` plutôt que devinée ou omise, et
`complete` retombe à `false` en conséquence — jamais un enregistrement
présenté comme complet pour un run interrompu avant la fin. `buildRunMetrics`
valide systématiquement (`validateRunMetrics`, miroir à la main du schéma,
même précédent que `scripts/model-router.mjs#validateRoutingDecision`) ce
qu'il assemble avant de le renvoyer : une entrée non conforme (type erroné,
niveau hors énumération, version manquante) est rejetée explicitement
(`{ valid: false, errors, metrics: null }`) plutôt que publiée tronquée —
l'incomplétude d'un run (`missingFields`) et la non-conformité d'un
enregistrement (rejet) restent deux cas distincts. Le seul champ texte libre
de l'enregistrement, la raison d'escalade éventuelle, passe par
`scripts/task-context.mjs#redactSecrets` avant écriture — aucun secret ni
contenu d'issue n'entre autrement dans l'enregistrement, qui ne porte
sinon que des identifiants, des niveaux et des compteurs.

Publié dans le journal existant du coordinateur, pas dans un commentaire
séparé : `scripts/automation-log.mjs#renderAutomationLog`/`upsertAutomationLog`
portent désormais un champ optionnel `runMetrics`, rendu en bloc lisible
(statut, durée, complexité, risque, modèle proposé/réellement utilisé,
activation, fallbacks, itérations, CI au premier passage, findings, usage,
versions de config, et la liste des champs manquants quand `complete` est
faux) juste après le bloc `metrics` existant ci-dessus. Contrairement à
`metrics`/`findings` (toujours alimentés par aucun workflow réel, cf.
ci-dessus et § « Le coordinateur »), ce canal-ci n'a pas besoin d'Action
séparée : le coordinateur appelle déjà `upsertAutomationLog` lui-même,
directement depuis la session, sur le journal `coordinator-implement` de
l'**issue** (§ « Routage » étape 5, § « Converged » étape 4, § Escalade
étape 3) — il lui suffit de construire son `RunMetrics` juste avant ce même
appel et de le lui passer. Une relance sur la même entité met donc à jour
ce même commentaire marqué au lieu d'en publier un second, exactement comme
pour `complexity`/`routing` déjà journalisés par ces mêmes appels
(`upsertAutomationLog` est idempotent par marqueur, § « Journal d'exécution
idempotent » ci-dessous — aucun mécanisme nouveau requis pour cette
garantie-là).

**Deux préalables vérifiés avant mise en service, résultat consigné dans la
PR de #469** (`coordinator/SKILL.md` § « Préalables vérifiés ») :

1. Une session peut lancer un sous-agent (`Agent` tool) et lire sa réponse —
   **vérifié empiriquement**, une session tournant sous le même déclencheur
   webhook qu'une Routine a lancé un sous-agent de test et reçu sa réponse.
2. Ce qui se produit au dépassement de durée d'un run — **non vérifié,
   non documenté** : la documentation publique des Routines Claude Code les
   qualifie de « research preview » sans énoncer de plafond de durée, de
   comportement de coupure, ni de signal permettant de distinguer après
   coup un run coupé d'un run terminé normalement.

Conséquence directe (cas d'arrêt explicite de #469, pas un détail à
contourner) : cette livraison écrit le skill, les règles d'isolation dans
les trois skills enveloppés, et la config déclarative, mais **ne bascule
pas** elle-même un déclencheur GitHub réel dessus — exactement comme pour
R2/R3/R4/R5 historiquement (§7, « Routine créée/finalisée par Rémi » à
chaque phase), l'activation reste un geste manuel séparé, avec la question
du plafond de durée non résolue signalée ici pour que ce geste soit informé
plutôt que découvert en incident.

### Mode dry-run (#406) : le coordinateur calcule et journalise, sans appliquer

Câble la chaîne existante — `TaskContext` (#401) → `ComplexityAssessment`
(#402) → fallback LLM (#403) → `RoutingDecision` (#404) → matrice
d'activation (#476, ci-dessous) — à l'intérieur du skill du coordinateur (§
ci-dessus) : chaque `Agent` lancé par ce skill (§ 1-3 de
`coordinator/SKILL.md`) ne part avec un override `model` que si la matrice
d'activation de `.automation/routing-policy.yml#activation` résout `apply`
pour le triplet (routine × bande de complexité × niveau de risque) de ce
run ; il continue de partir sur le modèle courant tant qu'elle résout
`observe` — le cas par défaut, y compris quand la section `activation` est
simplement absente (traitée comme une matrice vide, `observe` partout,
jamais `apply` implicite). Voir « Matrice d'activation (#476) » ci-dessous
pour cette résolution.

Le chaînage lui-même vit dans `scripts/routing-dry-run.mjs`, deux fonctions
pures, zéro effet de bord, zéro appel réseau — même précédent que les
modules qu'elles composent :

- `extractRiskLevel(issueBody)` lit la section `## Catégorie de risque` du
  corps d'une issue (même format que celui produit par
  `issue-to-spec/SKILL.md` : `**Faible**`/`**Élevé**` en tête de section) et
  renvoie `{ level, source }` — section absente, vide, ou portant un
  libellé qui n'est ni l'un ni l'autre → `null`, jamais un niveau deviné.
- `resolveRoutingDryRun({ taskContext, issueBody, labels, routines,
  routingPolicy, modelCatalog, llmResponse })` enchaîne `assessComplexity`,
  puis `shouldRunLlmFallback`/`consolidateComplexity` quand un `llmResponse`
  est fourni (le skill du coordinateur n'en fournit pas encore lui-même —
  le câblage d'un véritable sous-agent classifieur dans cette étape reste un
  chantier séparé, #403 restant support), puis `routeModel`, et renvoie
  `{ complexity, routing, applied, escalation, missing, limits }`. Une
  entrée amont manquante (`taskContext` absent, ou `extractRiskLevel`
  renvoyant `null`) court-circuite tout : `routeModel` n'est jamais appelé,
  `missing` nomme ce qui manquait. Une configuration invalide (version de
  catalogue/politique inattendue, politique ou bande absente) fait échouer
  `routeModel` avec son propre message explicite, qui remonte tel quel —
  jamais traduit en décision partielle. Un `status: 'no-candidate'` produit
  systématiquement `escalation: 'automation:needs-human'`, jamais un modèle
  par défaut.

Le skill du coordinateur (`coordinator/SKILL.md` § « Routage (dry-run,
#406) ») appelle cette fonction une fois par run, juste après avoir claim
l'issue et avant de lancer le premier sous-agent d'implémentation, puis
journalise la décision (`scripts/automation-log.mjs#upsertAutomationLog`,
sur l'**issue**, routine `coordinator-implement`) — un relancement sur la
même issue met à jour ce même commentaire via son marqueur, jamais un
second. Le journal publie, en plus des lignes déjà existantes pour
`complexity`/`routing`, les trois versions de configuration lues
(`TASK_CONTEXT_VERSION`, la version de politique et de catalogue — ces deux
dernières déjà portées par `RoutingDecision.input`), le mode d'activation
résolu par la matrice (§ « Matrice d'activation (#476) » ci-dessous) et sa
raison, et une mention explicite que le modèle proposé n'a pas été appliqué
(`scripts/automation-log.mjs`, champs optionnels `taskContextVersion`/
`routingApplied`/`activation` de `renderAutomationLog`/`upsertAutomationLog`
— comme `metrics`/`findings` avant eux, exercés pour l'instant par leurs
seuls tests unitaires, aucun workflow ne les alimentant encore), pour qu'un
opérateur puisse comparer modèle proposé, mode d'activation résolu, modèle
réel et résultat de la routine sans deviner aucun des quatre.

Ce journal s'ouvre en `status: 'running'` et ne le reste pas jusqu'à la fin
du run : `coordinator/SKILL.md` § « Converged » et § Escalade referment ce
même commentaire (`upsertAutomationLog`, `onlyIfRunning: true`, même
`number`/routine) avec le résultat réel — `succeeded`/`failed` — une fois le
run convergé ou escaladé, exactement le même mécanisme `onlyIfRunning` que
`coordinator-log-sync.yml` (§ ci-dessous) utilise déjà pour clore le journal
`coordinator-fix` côté PR. Sans cette fermeture, ce commentaire afficherait
indéfiniment `Statut : running`, même une fois la routine terminée — ce qui
viderait de son sens la comparaison que ce journal existe pour permettre.
`upsertAutomationLog` réécrit le corps entier à chaque appel sans jamais le
fusionner avec la version précédente : les deux fermetures ci-dessus
re-transmettent donc les mêmes `complexity`/`routing`/`taskContextVersion`/
`routingApplied`/`activation` capturés à l'ouverture, sous peine de faire
disparaître les lignes Complexité/Routage/Configuration/Activation/Modèle
appliqué au moment `succeeded`/`failed` — l'état que cette comparaison
regarde en pratique le plus souvent.

Protocole de passage vers l'activation contrôlée : voir §5, « Passage du
dry-run à l'activation contrôlée (#406 → #407) ».

### Matrice d'activation (#476) : par routine, bande et risque plutôt qu'un drapeau global

Passer d'un coup à l'activation réelle, pour toutes les routines et toutes
les bandes, serait exactement ce que le plan interdit : l'activation doit
commencer par les tâches réversibles et peu risquées, puis s'étendre.
`scripts/routing-activation.mjs#resolveActivation(policy, { routine, band,
riskLevel })` remplace donc le drapeau global `dry_run` de #406 par une
résolution fine, déclarée dans `.automation/routing-policy.yml#activation` —
même espace de noms que `routines:` du même fichier, jamais celui de
`.automation/routines.yml` — et renvoie `{ mode: 'observe' | 'apply',
reason }`, `reason` nommant toujours la règle qui a tranché. Fonction pure,
zéro effet de bord.

Deux garde-fous non contournables par la déclaration de la matrice
elle-même : un triplet non couvert (routine absente, bande absente pour une
routine présente, ou section `activation` entièrement absente) résout
toujours `observe` ; un risque `high` résout toujours `observe`, quelle que
soit la déclaration — même une déclaration `apply` explicite est écartée et
la `reason` le dit. L'activation sur risque élevé a sa propre tranche de
#407, avec ses propres garde-fous, hors scope ici. Une matrice incohérente
— mode inconnu, routine absente de `routines`, bande absente de
`.automation/complexity-thresholds.yml` — est refusée avec une erreur
nommant le fichier et la clé fautive, à deux niveaux : le job CI
`automation-config` refuse toute la matrice à la validation de
configuration (`scripts/automation-dispatch.mjs#validateRoutingPolicy`,
schéma `schemas/automation/routing-policy.schema.json`), et
`resolveActivation` revalide en défense en profondeur le seul triplet qu'on
lui demande de résoudre.

`scripts/routing-dry-run.mjs#resolveRoutingDryRun` (#406) est le seul
appelant prévu : son `applied` reflète désormais le mode résolu par cette
matrice plutôt que l'ancien drapeau, et le résultat porte aussi ce détail
complet sous un nouveau champ `activation`. La matrice livrée par cette
tranche déclare `observe` partout : elle ne change le modèle d'aucune
routine, elle remplace uniquement le mécanisme — voir §5 ci-dessous pour le
protocole de passage réel d'un triplet à `apply`.

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
lien vers le run GitHub Actions, et — optionnel — lien vers l'artefact
`TaskContext` de ce run via `contextUrl` (§ ci-dessus, #401), rendu en
ligne `- Contexte :` quand fourni), suivi d'une synthèse en texte libre
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

### R3 idempotent : dédup par SHA et synthèse classifiée (#379)

`.automation/routines.yml` déclare `deduplicate_by: head_sha` pour
`pr-review` depuis #378, mais le dispatcher qui le valide reste
observationnel (§ ci-dessus, « Ce nouveau workflow ne remplace pas le
déclenchement réel des routines ») — le champ ne faisait donc rien tant
qu'aucun composant ne le lisait. `pr-review/SKILL.md` § « Skip a duplicate
review » est ce composant : en tout premier geste après avoir « claim » le
run (avant même le checklist), R3 relit le journal idempotent `pr-review`
de la PR (§ ci-dessus) et compare son `Commit analysé` au HEAD SHA courant.
Même SHA et statut déjà terminal (`succeeded`/`failed`, pas `running`) →
cette review a déjà eu lieu, R3 repose juste le label correspondant sans
rejouer le checklist ni poster une seconde review. Ça couvre la classe de
double-fire des incidents #94/#99 (`doc/automation/state-machine.md` §5)
même quand deux déclenchements `automation:needs-review` sur le même commit
survivent tous les deux au « claim the run » (livraison de webhook
dupliquée, ou une relance de `requeue-lost-events.mjs` qui recouvre un run
en fait toujours en vol).

Le journal reste écrit uniquement par `review-status-sync.yml`, une fois le
verdict posé (§ ci-dessus) — R3 le lit, ne l'écrit ni ne l'édite jamais
lui-même. Une première tentative (PR #419) s'était fait imposer, via un
finding de review, l'écriture par R3 d'une entrée `Statut: running` en
tout début de run pour couvrir la fenêtre où sa propre review est en cours ;
`address-feedback` a montré que c'est infaisable (aucun outil MCP
disponible à une session ne permet d'**éditer** un commentaire existant),
ce qui a mené à une escalade `automation:needs-human` et à la fermeture de
la PR sans merge. Ce n'a jamais fait partie de ce ticket et reste
explicitement hors scope : la déduplication lit le journal, elle ne
l'écrit pas.

Le format de sortie change en même temps : R3 ne rend plus un verdict
binaire conforme/à corriger par point de checklist, mais une liste de
*findings* classés par sévérité (`blocking`/`important`/`suggestion`/
`uncertain`), chacun avec une recommandation concrète
(`pr-review/SKILL.md` § Output). Le verdict global en découle
mécaniquement : `automation:needs-fix` seulement s'il existe au moins un
finding `blocking`/`important` — une PR qui n'a que des `suggestion`/
`uncertain` reste `automation:review-pass`, ces findings restant visibles
dans la review pour un humain sans déclencher R4 (`address-feedback` ne
lit d'ailleurs que les findings `blocking`/`important` de la review,
`address-feedback/SKILL.md` § Workflow). R3 publie cette synthèse comme une
vraie review PR (`pull_request_review_write`, `event: COMMENT` — jamais
`APPROVE`/`REQUEST_CHANGES`, §3) plutôt qu'un commentaire libre : les
findings localisés et actionnables deviennent des commentaires inline,
tout le reste (conformité à la spec, doc à jour, dette) reste dans le corps
de la review. Une seule review par SHA, garantie par le dédup ci-dessus —
c'est ça, la « synthèse de review unique » de #379, pas un mécanisme
séparé.

### Fiche de finding complète : preuve, impact, confiance (#385)

#379 posait les quatre niveaux de sévérité et la recommandation ; #385
complète la fiche avec trois champs supplémentaires, exigés pour chaque
finding : la **preuve** (ce qui, dans le diff ou la spec, établit le
problème — une ligne de diff, ou à défaut la section de spec ou l'absence
constatée quand le finding ne porte pas sur une ligne précise), l'**impact**
(la conséquence concrète si ce n'est pas corrigé) et le **niveau de
confiance** (`high`/`medium`/`low`, indépendant de la sévérité). Ces trois
champs et un exemple complet imitable sont dans `pr-review/SKILL.md` §
Output.

La confiance n'ajoute pas un cinquième niveau : elle contraint la sévérité
plutôt que de s'y ajouter. Un finding `blocking`/`important` exige au moins
une confiance `medium` — en dessous, c'est `uncertain`, pas « `blocking`
avec confiance basse » (`uncertain` étant déjà le niveau « ne peut pas être
tranché depuis le diff seul »). Conséquence directe : `address-feedback`
n'a jamais besoin de lire le champ confiance, la sévérité seule reste
l'unique signal qui détermine son périmètre — inchangé depuis #379/#380
(`address-feedback/SKILL.md` § Workflow).

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
| `automation:queued` | Spec validée, en attente d'un créneau de routine — promue en `automation:ready` une à la fois par le dispatcher (`scripts/dispatch-ready.mjs`). Peut coexister avec `automation:needs-human` sur une issue (état escaladée-puis-remise-en-file, issue #429, voir `state-machine.md` §6) : un humain qui retire seulement `automation:needs-human` suffit alors à la redispatcher, sans reposer `automation:queued` |
| `automation:ready` | Spec validée → déclenche R2 |
| `automation:in-progress` | Une routine travaille dessus. Sur une issue, tient tout le cycle de vie de la PR liée (posé une fois par R2) jusqu'à la fermeture — ou jusqu'à ce qu'une escalade (R2 directement, ou R4 en miroir depuis la PR) la libère, toujours en dernier, après avoir posé `automation:needs-human` puis `automation:queued` (issue #429, `state-machine.md` §6) |
| `automation:needs-review` | File d'attente pour `pr-review` (R3) — seul trigger GitHub possible sur une Routine, posé automatiquement à l'ouverture d'une PR, retiré par R3 en tout premier geste (« claim the run », §4) |
| `automation:review-pass` | Verdict `pr-review` (R3) : conforme → traduit en commit status `claude/review` succès |
| `automation:needs-fix` | Verdict `pr-review` (R3) : à corriger → traduit en commit status `claude/review` échec, déclenche R4 |
| `automation:needs-human` | Escalade : plafond d'itérations ou hors périmètre. Quand l'escalade part d'une PR (R4), posée aussi sur l'issue liée, accompagnée de `automation:queued`, pour libérer le pipeline sans geler tout le backlog (issue #429) |
| `blocked` | Dépendance externe — signal d'affichage dérivé, jamais lu par le dispatcher (celui-ci décide sur le lien natif `blocked_by`, #432) ; retiré automatiquement par `unblock-issues.yml` une fois tous les bloqueurs natifs fermés |
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

Cette liste blanche reste la seule porte d'entrée de `automation:enabled` ;
le skill `change-risk` (§6) ne la remplace ni ne la recalcule — il opère sur
une échelle à trois niveaux (`low`/`medium`/`high`), évaluée sur le diff
réel plutôt que sur les seuls fichiers impactés prévus, dont le seul point
de recoupement documenté est : toute surface listée « Exclu » ci-dessus fait
toujours au moins `medium` chez `change-risk`, jamais `low`.

### Garde-fous du risque élevé (#479) : la revue humaine n'est jamais contournée

Tranche 4/6 de l'épic #407. La liste blanche ci-dessus et le jugement de
`implement-task`/`coordinator` sur `automation:enabled` existaient déjà en
prose ; rien ne les vérifiait mécaniquement avant ce ticket, alors même que
l'activation progressive du routage par sous-agent (#476…#481) ajoute des
axes de configuration (mode d'activation, budgets, retour au mono-modèle)
qui ne doivent jamais, même indirectement, rouvrir la porte du merge
autonome sur un changement à risque élevé.

`scripts/risk-controls.mjs#requiredControls({ riskLevel, activationMode })`
est la fonction pure qui tranche, à partir du niveau de risque d'une issue
et du mode d'activation résolu pour ce triplet
(`scripts/routing-activation.mjs#resolveActivation`, #476), quels contrôles
sont obligatoires. Un seul garde-fou compte pour ce ticket : `riskLevel`
`high` impose toujours la revue humaine et interdit toujours
`automation:enabled`, **quel que soit** `activationMode` — le mode
d'activation du routage par sous-agent porte sur un axe complètement
différent (quel modèle exécute la routine, jamais si son résultat peut
merger seul) et ne peut donc jamais assouplir ce garde-fou. Une section
`## Catégorie de risque` absente ou illisible est traitée comme `high` par
la même fonction — le mode le plus contraignant, jamais le plus permissif,
même règle que celle déjà établie par `resolveActivation` (#476) pour un
triplet non couvert par sa propre matrice.

`checkEnabledLabelAllowed({ labels, riskLevel, issueNumber })` applique la
même règle à une combinaison de labels réellement observée plutôt qu'à une
déclaration, à deux points d'application :

- **Le coordinateur**, avant de poser lui-même `automation:enabled` en fin
  de run (`coordinator/SKILL.md` § « Converged ») — jamais son propre
  jugement sur le diff final seul, toujours confirmé par cette fonction ;
  `implement-task/SKILL.md` step 11 (R2 solo) fait de même.
- **Le job CI `risk-controls`** (`.github/workflows/risk-controls.yml`, un
  workflow dédié plutôt qu'un job de `ci.yml` — voir plus bas pourquoi), sur
  `opened`/`synchronize`/`reopened`/`labeled` : si la PR porte
  `automation:enabled`, il résout le risque de chaque issue qu'elle referme
  (`Closes #N`) et fait échouer la CI, nommant l'issue et la règle violée,
  dès que la combinaison est interdite — y compris quand `automation:enabled`
  a été posé à la main par un humain sur une PR liée à une issue à risque
  élevé (le garde-fou existe justement pour ce cas-là : un humain qui veut
  passer outre retire le label plutôt que de contourner la garde) et y
  compris quand l'issue liée est introuvable ou sa section de risque
  illisible (traité comme `high`, jamais comme « rien à vérifier »). Ce job
  vit dans son propre workflow, pas dans le `pull_request:` (sans `types:`,
  donc limité par défaut à `opened`/`synchronize`/`reopened`) de `ci.yml` :
  `automation:enabled` est posé via un événement `labeled` séparé
  (`implement-task/SKILL.md` step 11, `coordinator/SKILL.md` §
  « Converged », ou un humain), jamais dans le même événement qui a fait
  tourner `ci.yml` — un job resté dans `ci.yml` ne se serait donc jamais
  redéclenché sur le cas réel qu'il est censé couvrir, laissant
  `auto-merge-sync.yml` merger sur le statut « absent — rien à vérifier »
  d'avant le label (#485).

Zéro appel réseau côté fonctions pures (`requiredControls`,
`checkEnabledLabelAllowed`) — même précédent que le reste de
`.automation/`. Le point d'entrée CLI de `scripts/risk-controls.mjs`, lui,
fait un appel réseau minimal (une lecture par issue liée), même précédent
que `scripts/close-linked-issues.mjs`, dont il réutilise
`extractClosedIssueNumbers` ; il réutilise aussi `extractRiskLevel` de
`scripts/routing-dry-run.mjs` (#406) plutôt que de reparser
`## Catégorie de risque` une deuxième fois.

L'escalade des trois tours de correctif du coordinateur (`coordinator/
SKILL.md` § Escalade) nomme désormais un motif distinct parmi trois plutôt
qu'un « le tour de correctif a échoué » générique : **tentatives épuisées**
(le plafond de 3 est atteint sans dérive ni suite rouge), **dérive de
périmètre constatée par un relecteur** (le correctif révèle un changement
plus large que ce que la review avait anticipé), et **échec de validation
après le budget d'itérations** (la suite reste rouge après un tour qui a
consommé le budget de tentatives) — trois causes distinctes du même
plafond, pour qu'un humain qui parcourt plusieurs escalades les distingue
sans ouvrir chacune d'elles.

### Passage du dry-run à l'activation contrôlée (#406 → #407)

Le routage par sous-agent (§4, « Mode dry-run », #406) n'est pas gardé par
un label du tableau ci-dessus — la bascule n'est pas un événement du bus,
c'est de la configuration versionnée, revue comme n'importe quel autre
changement de `.automation/` (validé en CI par le job `automation-config`,
jamais posée ni retirée par une routine elle-même). Jusqu'à #476 (tranche
1/6 de #407, livrée), cette configuration était un seul drapeau global,
`dry_run` — activer une routine, même une seule bande de complexité d'une
seule routine, aurait forcé à activer les trois autres bandes et toutes les
autres routines du même geste, exactement ce que ce protocole interdit.

**#476 remplace ce drapeau par la matrice d'activation** (§4, « Matrice
d'activation (#476) » ci-dessus) : `.automation/routing-policy.yml#activation`
déclare, par routine et par bande de complexité, `observe` ou `apply`
séparément — le passage à `apply` d'un seul triplet (une routine, une bande)
ne bascule plus les autres. La matrice livrée par #476 déclare `observe`
partout : cette tranche livre uniquement le mécanisme de résolution fine et
ses deux garde-fous (triplet non couvert → `observe` ; risque `high` →
`observe` toujours), elle n'active elle-même aucune routine.

Le passage réel de tel triplet à `apply` reste le périmètre des tranches
suivantes de #407, pas de ce fichier : à décider après une lecture des
journaux de dry-run accumulés sur de vraies issues (les décisions qu'un
opérateur aurait vues, comparées au modèle réellement utilisé et au résultat
de la routine), palier par palier plutôt que d'un coup — une routine ou une
bande de complexité à la fois, jamais les quatre bandes de toutes les
routines simultanément, et jamais sur un risque `high` (garde-fou propre à
sa propre tranche, hors #476). Ce protocole n'est pas encore écrit en
détail au-delà de ce que #476 livre : #407 reste `NEEDS_CLARIFICATION`
(§4, tableau « Périmètre de l'épic après arbitrage ») précisément parce que
le dimensionnement de ses tranches restantes dépend de ce que ces journaux
de dry-run auront montré, pas d'une estimation a priori.

### Rollback vers le mono-modèle (#480)

Activer par paliers (§4, « Matrice d'activation (#476) ») n'a de sens que si
revenir en arrière est immédiat et sûr. Depuis l'arbitrage de #423
(option C), il n'y a plus de fournisseur à désactiver : le rollback se
réduit à **revenir à un modèle unique pour tous les sous-agents**, sans
toucher ni aux skills ni au code — un unique interrupteur plutôt qu'un retour
matrice-par-matrice.

`.automation/routing-policy.yml#rollback` : booléen, optionnel, absent
valant `false` (cas nominal, aucune entrée dans `limits`). À `true`, force
tous les triplets de `activation` en `observe`, sans qu'aucune de ses lignes
n'ait à être modifiée — la matrice reste intacte, prête à reprendre effet
dès que l'interrupteur repasse à `false`. Résolu par
`scripts/routing-activation.mjs#resolveActivation` avec la priorité la plus
haute : évalué avant même le garde-fou de risque `high` de #476, aucune
déclaration de la matrice ne peut le contredire, et la `reason` renvoyée
cite toujours le rollback plutôt que la matrice — c'est ce qui permet à un
opérateur de distinguer, dans le journal, un `observe` de rollback d'un
`observe` de matrice ordinaire. Une valeur non booléenne est refusée au
démarrage, à deux niveaux comme le reste de ce contrat (le job CI
`automation-config` et `resolveActivation` en défense en profondeur),
nommant le fichier et la clé, jamais interprétée comme `false`.

Un run déjà en vol au moment du changement n'est pas réévalué :
`resolveActivation` n'est appelée qu'une fois par run, à l'ouverture du
journal, et la fermeture de ce même journal re-transmet la décision
capturée plutôt que d'en recalculer une nouvelle (§4, « Mode dry-run »,
dernier paragraphe) — ce run-là termine donc sur le modèle qu'il a déjà
retenu, sans qu'aucun sous-agent déjà lancé ne soit interrompu. Le champ
optionnel `activation.rollbackDuringRun` de `scripts/automation-log.mjs`
rend ce cas explicite dans le journal de ce run précis (une ligne dédiée),
plutôt que de laisser un opérateur le déduire du seul fait que le run
suivant parte en observation — même patron que `metrics`/`findings` avant
lui : optionnel, exercé pour l'instant par ses seuls tests unitaires, aucun
workflow ne le renseignant encore.

**Travail de suivi, pas un detail d'implémentation déjà couvert** : tant
que rien ne calcule et ne transmet `activation.rollbackDuringRun` depuis un
vrai run (`scripts/routing-dry-run.mjs#resolveRoutingDryRun` ne le fait pas
aujourd'hui), le critère d'acceptation « le journal signale que le rollback
est intervenu pendant le run » reste vérifié uniquement par
`scripts/automation-log.test.mjs`, jamais observable sur un run réel.
Brancher ce calcul — comparer le `rollback` capturé à l'ouverture du
journal à sa valeur au moment de la fermeture — reste explicitement hors
scope de #480 et à faire dans une tranche ultérieure, pas un gap implicite
qu'un futur lecteur devrait redécouvrir.

Procédure complète (fichier et clé à changer, délai avant effet — le run
suivant — et vérification) : `doc/automation/model-routing.md` § « Rollback ».
Testable entièrement sans exécuter de routine :
`scripts/routing-activation.test.mjs` (priorité de l'interrupteur, absence,
valeur invalide, distinction de `reason`) et
`scripts/automation-log.test.mjs` (ligne dédiée d'un run en vol).

### Budgets de consommation (#478)

Le routage par sous-agent (§4) et sa matrice d'activation (#476) ouvrent la
porte à un run qui consomme davantage qu'aujourd'hui — plus de sous-agents,
des modèles plus coûteux sur les bandes hautes. #478 (tranche 3/6 de #407)
plafonne cette consommation plutôt que de la laisser croître sans garde-fou :
`scripts/routing-budget.mjs#checkBudget(budgets, counters, { routine, scope })`,
fonction pure, renvoie `{ status: 'ok' | 'exceeded', limit, observed, reason,
limits }` pour un plafond par run (sous-agents lancés, itérations de
correctif) ou de période glissante (runs par jour), déclaré dans
`.automation/routing-policy.yml#budgets` — un espace de noms de routine de
**dispatch** (`.automation/routines.yml`), distinct de `routines`/
`activation` du même fichier malgré la coïncidence de nom sur
`pr-review`/`address-feedback`.

**Un dépassement n'a qu'une seule issue : l'arrêt.** Jamais un basculement
vers un modèle moins coûteux — y compris sur un risque `high`, où § « Passage
du dry-run » ci-dessus force déjà `observe` — et jamais une relance
automatique : le run s'arrête proprement (aucun sous-agent de plus lancé),
pose `automation:needs-human`, et journalise le plafond franchi avec la
valeur observée (`scripts/automation-log.mjs`, champ optionnel `budget`,
même patron que `routing`/`activation`/`runMetrics` avant lui). La reprise
passe par le cycle normal de dispatch une fois l'escalade levée par un
humain, jamais par une file d'attente ou un report interne au run (hors
scope explicite de #478).

Deux garde-fous symétriques à ceux de l'activation et du rollback ci-dessus :
un plafond absent de la configuration est **non contraignant** (`status:
'ok'`, journalisé dans `limits`, jamais deviné) ; un plafond nul, négatif ou
non numérique est **refusé au chargement**
(`scripts/routing-budget.mjs#loadBudgets`), nommant le fichier et la clé, à
deux niveaux comme le reste de ce contrat — le job CI `automation-config`
(qui appelle `loadBudgets` lui-même plutôt que de dupliquer sa validation,
`scripts/automation-dispatch.mjs#validateRoutingPolicy`) et tout appelant
runtime. Un plafond franchi exactement à l'égalité reste `ok` — la borne est
inclusive.

Les compteurs de période (`runsPerDay`) n'ont pas de source dédiée : ils se
lisent depuis les enregistrements `RunMetrics` (#477) déjà publiés dans le
journal du coordinateur, sans nouvelle persistance — une recherche GitHub
(`search_issues`) documentée et assumée comme approximation dans
`.claude/skills/coordinator/SKILL.md` § « Budgets (#478) », le même
compromis que `weekly-report/SKILL.md` § « Verdicts R3 » accepte déjà pour un
décompte comparable. Des compteurs de période indisponibles (métriques
illisibles ou absentes) sautent seulement le plafond de période — les
plafonds par run, évalués indépendamment, continuent de s'appliquer.

`.claude/skills/coordinator/SKILL.md` § « Budgets (#478) » appelle
`loadBudgets` une fois par run juste après § « Routage », maintient les
compteurs par-run en mémoire de session (incrémentés avant, jamais après,
chaque lancement de sous-agent), et vérifie `checkBudget` à quatre points de
contrôle : avant chaque lancement de sous-agent, avant chaque nouveau tour de
correctif, et une fois pour le plafond de période avant que § 1 ne lance quoi
que ce soit. Un dépassement à n'importe lequel de ces points rejoint la
séquence d'escalade déjà documentée (§ Escalade du skill, nouvelle condition
6), qui pose les mêmes labels que toute autre escalade de ce skill et
journalise le `checkBudget` exact qui a arrêté le run.

Procédure complète et contrat détaillé : `doc/automation/model-routing.md`
§ « Budgets ». Testable entièrement sans exécuter de routine :
`scripts/routing-budget.test.mjs` (décision, portées indépendantes, absence,
compteurs indisponibles, refus au chargement) et
`scripts/automation-log.test.mjs` (ligne `Budget` d'un dépassement).

### Calibration du routage (#481)

Tranche 6/6 de #407, la dernière : les `RunMetrics` (#477) ne servent à rien
tant que personne ne les confronte à la politique de routage courante.
`scripts/routing-calibration.mjs#aggregateRunMetrics(records, { since })`
groupe les enregistrements par routine (de dispatch, § « Budgets »
ci-dessus pour la même distinction d'espace de noms) et par bande de
complexité, et calcule pour chaque groupe le nombre de runs, la part de CI
verte au premier passage, les itérations de correctif moyennes, la part de
runs escaladés, et la distribution des modèles proposés/réellement
utilisés — en excluant toujours un enregistrement `complete: false` de ces
moyennes (compté séparément, `incompleteRuns`), et en renvoyant
`insufficientData: true` plutôt qu'une moyenne calculée sur zéro run pour
une période sans aucun enregistrement complet.

`#proposeCalibration(aggregate, policy, { minSampleSize })` en tire une
liste de propositions d'ajustement, chacune portant la clé de configuration
visée, sa valeur actuelle, la valeur proposée, la mesure qui la motive et un
identifiant de version de proposition — **jamais appliquées** : cette
fonction ne lit ni n'écrit `.automation/routing-policy.yml` elle-même, et le
test le vérifie en comparant le fichier avant/après appel. Un groupe sous le
seuil d'échantillon minimal, sans politique associée pour sa routine, ou
dont aucun signal ne franchit les seuils de calibration, ne produit aucune
proposition — le motif est nommé (`skipped`), jamais omis.

Consommé uniquement par `weekly-report/SKILL.md` (R6, § ci-dessous) sous
forme d'une section de rapport supplémentaire — aucune routine ni
déclencheur créé pour cette tranche, le principe directeur explicite de
#481. Procédure complète : `doc/automation/model-routing.md` §
« Calibration ». Testable entièrement sans exécuter de routine :
`scripts/routing-calibration.test.mjs` (agrégation, période vide, rejets,
propositions, non-application).

---

## 6. Skills (`.claude/skills/`)

> Contrat de forme (template `SKILL.md`, format de sortie structuré des
> routines, checklist de conformité, conditions d'escalade
> `automation:needs-human`) : `doc/automation/skill-contract.md`. Appliqué
> aux skills interactifs (#426) puis aux cinq skills de routine (#427).

| Skill | Contenu |
|---|---|
| `project-conventions` | Délègue au `CLAUDE.md` : stack, commandes pnpm, arbo, architecture hexagonale, conventions de commit |
| `issue-to-spec` | Format de spec : contexte, périmètre/hors-scope, critères d'acceptation testables, comportements d'erreur/cas limites, stratégie de tests, fichiers impactés, risques/questions ouvertes, **catégorie de risque** (détermine le label `automation:enabled`), **verdict de readiness** (`READY_FOR_IMPLEMENTATION`/`NEEDS_CLARIFICATION`, obligatoire, n'affirme que la complétude de la spec — l'état de blocage par dépendance est porté exclusivement par le label `blocked` et le lien natif `blocked_by`, #449) |
| `implement-task` | Vérifie le verdict `READY_FOR_IMPLEMENTATION` avant de commencer, plan écrit avant tout code (fichiers, tests prévus, risques), recherche d'une abstraction existante avant d'en créer une nouvelle, budget de changement (aucun refactor hors périmètre sans justification explicite), branche `feat/<issue>-<slug>`, tests d'abord, `pnpm lint typecheck test build` vert, vérif visuelle, PR structurée en 5 champs (`doc/automation/skill-contract.md` §2) avec `Closes #N`, mise à jour de `doc/` (pre-commit checklist du `CLAUDE.md`), escalade vers `automation:needs-human` sur spec non prête, divergence majeure avec le plan ou validation qui reste rouge |
| `pr-review` | Checklist **subjective uniquement** : conformité à la spec, respect de l'archi hexagonale, backward-compat des schémas zod, doc à jour, dette introduite. Le mécanisable est déjà en CI. Chaque finding porte gravité, preuve, impact, niveau de confiance et recommandation (#385) ; la confiance basse force la gravité `uncertain` plutôt que de coexister avec `blocking`/`important`, et `address-feedback` continue de ne lire que la gravité. Comme sous-agent du coordinateur, tourne en deux instances aux corpus disjoints — fonctionnelle (spec + `doc/functional/`) et technique (`doc/technical/architecture.md` + `project-conventions`, jamais la spec) — chaque finding portant alors un sixième champ `corpus` (`in`/`out`, #470) |
| `address-feedback` | Corriger le périmètre signalé. Ne pas refondre. Ne retraite jamais un thread de review déjà résolu, priorise `blocking` avant `important`, ignore `suggestion`/`uncertain` (#379), bascule sur `automation:needs-human` en cas de retour contradictoire/ambigu ou de suite de checks qui reste rouge, publie une synthèse (corrigé / non appliqué / arbitrage requis) à chaque run (issue #380) |
| `site-quality` | Deps, liens de doc, Lighthouse, PWA. Utilisée par R5 |
| `weekly-report` | Rapport hebdo : PR ouvertes > 3 jours, issues `automation:needs-human`, taux `automation:review-pass`/`automation:needs-fix`, incidents depuis le dernier rapport, recommandation sur la liste blanche `automation:enabled`, et calibration du routage (#481 : agrégat par routine/bande des `RunMetrics` de la période et propositions d'ajustement de poids/seuils, jamais appliquées). Utilisée par R6 |
| `test-strategy` | Traduit les critères d'acceptation d'une spec en scénarios de test par niveau (unitaire/intégration/composant/e2e), classés nominal/erreur/limite/régression/invariant, séparés en obligatoires/recommandés/hors de proportion. Support skill, appelée en interactif ou depuis la procédure d'une autre skill — pas encore câblée dans `implement-task`/`pr-review`/`site-quality` (câblage réel hors scope, #386) |
| `change-risk` | Détecte, depuis la spec et le diff, les surfaces à risque touchées (persistance/migrations, scoring, API/contrats, auth, secrets, configuration, déploiement, concurrence, aggravé par toute rupture de compat) et assigne un niveau `low`/`medium`/`high` (le plus sévère des surfaces touchées, jamais une moyenne) avec preuves et mitigations (tests renforcés, revue humaine, security/architecture review, blocage merge). Échelle distincte de la catégorie binaire **Faible**/**Élevé** d'`issue-to-spec` (qui gouverne `automation:enabled`) — les deux se recoupent (une surface Élevé ne peut jamais produire un `low` ici) sans fusionner. Support skill, appelée en interactif ou depuis la procédure d'une autre skill — pas encore câblée dans `implement-task`/`test-strategy`/`site-quality`/`pr-review` (câblage réel hors scope, #387) |
| `merge-review-pass` | Merge les PR `automation:review-pass` une par une (rebase, résolution mécanique des conflits, attente CI), pour les PR sans label `automation:enabled` (Dependabot, R5) que l'auto-merge natif ne prend jamais. Interactif, pas encore une routine |
| `coordinator` | Fusionne implémentation/review/correctif (#469) en sous-agents d'un même run — délègue à `implement-task`/`pr-review`/`address-feedback` sans en changer la procédure. La review tourne en **deux** sous-agents `pr-review` isolés aux corpus disjoints, fonctionnel et technique, qui ne se lisent jamais l'un l'autre (#470) ; chacun ne reçoit du coordinateur que ce que son propre corpus autorise — jamais la sortie de l'implémenteur ni celle de l'autre relecteur (§4 « Le coordinateur »). Verdict mécanique calculé par `scripts/review-verdict.mjs` depuis les findings combinés des deux relecteurs, jamais discrétionnaire — `automation:needs-human` si l'un des deux manque, jamais conclu sur le seul relecteur restant. Déclarée dans `.automation/routines.yml` sur le couple `issue`/`automation:ready` (remplace `implement-task` sur ce couple) ; activation du déclencheur GitHub réel non faite par cette livraison (préalable de durée de run non vérifié — §4) |

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

### Phase 5 bis — Coordinateur R2+R3+R4 (#430/#469)

Tranches 1 et 2 de #430 livrées et mergées avant celle-ci : #467 (balayeur —
escalade la possession périmée au lieu de geler l'item) et #468 (garde
`automation:coordinator-owned` sur `needs-review-label.yml`). Tranche 3
(#469, ce ticket) livre le skill coordinateur lui-même — détail complet en
§4 « Le coordinateur : R2+R3+R4 fusionnés en un run ».

- [x] `.claude/skills/coordinator/SKILL.md` écrite.
- [x] Isolation du sous-agent de review écrite des deux côtés
      (`coordinator/SKILL.md` et `pr-review/SKILL.md` § « Context isolation
      (coordinator sub-agent only) »), et les deltas de sous-agent écrits
      dans `implement-task/SKILL.md`/`address-feedback/SKILL.md`.
- [x] `.automation/routines.yml` : `coordinator` déclaré sur le couple
      `issue`/`automation:ready`, en remplacement de l'entrée
      `implement-task` sur ce même couple.
- [x] `scripts/automation-log.mjs` : marqueurs de journal distincts par rôle
      (`coordinator-implement`/`coordinator-fix`, réutilisation du marqueur
      `pr-review` existant pour le rôle review), champ `metrics` optionnel
      (testé, mais pas encore alimenté par un workflow réel — voir §4
      « Métriques »). `.github/workflows/coordinator-log-sync.yml` (nouveau)
      pose ces marqueurs de journal par rôle, pas encore les métriques, et
      referme le journal « correctif » sur le label de fin de run
      (`automation:review-pass`/`automation:needs-human`) plutôt que de le
      laisser en `running`.
- [x] Les deux préalables de mise en service vérifiés, résultat consigné en
      §4 : sous-agents lançables depuis une session — oui, vérifié ;
      comportement au dépassement de durée d'un run — non documenté.
- [ ] **Mise en service non faite par cette livraison** (préalable 2
      non vérifié — cas d'arrêt explicite de #469, pas un détail à
      contourner). Reste à la main d'un humain : configurer le déclencheur
      GitHub réel de la Routine coordinateur (comme pour R2/R3/R4/R5
      historiquement), après lecture de la question de durée non résolue
      ci-dessus.
- [ ] Rodage interactif ou en conditions réelles avant de considérer la
      skill éprouvée (règle §6 « une skill non éprouvée en interactif ne
      passe pas en autonome ») — non commencé, dépend du point précédent.

**Gate :** identique dans l'esprit à celui de R2 (Phase 4) — un lot de
tickets réels traités de bout en bout par le coordinateur, sans réveil de R3
sur ses propres push, avant d'envisager la tranche 4 (#430 : séparation en
deux relecteurs). Non commencé — voir le point de mise en service ci-dessus.

### Phase 5 ter — Deux relecteurs (#430/#470)

Tranche 4/4 de #430, livrée par cette même modification, **avant** que le
gate ci-dessus soit franchi — décision explicite portée par l'issue #470
(readiness `READY_FOR_IMPLEMENTATION`, seule dépendance #469 déjà close et
mergée) plutôt qu'un contournement du gate. Le gate reste néanmoins
pertinent pour la **mise en service** : tant qu'un lot réel n'a pas validé
le coordinateur à un seul relecteur, activer le déclencheur GitHub avec deux
relecteurs n'est pas plus justifié qu'avec un seul (même préalable non
vérifié qu'en Phase 5 bis, voir ci-dessous).

- [x] `.claude/skills/pr-review/SKILL.md` : la section « Context isolation
      (coordinator sub-agent only) » porte désormais une variante
      **fonctionnelle** (spec + diff + `doc/functional/`) et une variante
      **technique** (diff + `doc/technical/architecture.md` +
      `project-conventions`, jamais la spec) ; le checklist §1 tague chaque
      item par corpus ; chaque finding porte un sixième champ, `corpus`
      (`in`/`out`), pour qu'un finding hors corpus reste journalisé sans
      entrer dans l'arbitrage.
- [x] `.claude/skills/coordinator/SKILL.md` § 2 : lance les deux sous-agents
      de review isolés (jamais l'un lisant l'autre), collecte leurs findings
      structurés, et calcule le verdict via `scripts/review-verdict.mjs` —
      jamais par sa propre lecture des deux review. Un HEAD déplacé pendant
      l'un des deux tours relance les **deux** sous-agents, jamais un seul.
      Escalade étendue au cas « relecteur manquant ».
- [x] `scripts/review-verdict.mjs` (nouveau) : règle d'arbitrage pure,
      testée unitairement (`scripts/review-verdict.test.mjs`) sur les quatre
      combinaisons de sévérité, la déduplication d'un finding identique
      rendu par les deux relecteurs, le finding hors corpus qui n'influe pas
      sur le verdict, et le relecteur manquant qui escalade plutôt que de
      conclure sur le seul relecteur restant.
- [x] `scripts/automation-log.mjs` : marqueurs `coordinator-review-functional`/
      `coordinator-review-technical` (§4 « Journaux par rôle » ci-dessus) et
      champ `findings` optionnel attribuant chaque finding à son ou ses
      relecteurs — testés (`scripts/automation-log.test.mjs`), pas encore
      alimentés par un workflow réel (même statut que `metrics`, #469).
- [x] R3 (PR humaines/R5) continue d'utiliser `pr-review/SKILL.md` sans
      changement de comportement — les deux nouvelles variantes ne
      s'activent que sous instruction explicite « as the coordinator's
      functional/technical-corpus review sub-agent ».
- [ ] **Mise en service non faite par cette livraison**, pour la même raison
      qu'en Phase 5 bis (préalable de durée de run non documenté) — reste à
      la main d'un humain, après le gate de la Phase 5 bis.
- [ ] Vérification d'isolation en relecture humaine de la PR (propriété de
      prompt, pas de code — non commencé, à faire lors de la review de la PR
      qui livre cette tranche).
- [ ] Run réel sur une PR de test portant un défaut fonctionnel et un défaut
      technique, chacun trouvé par le relecteur dont c'est le corpus — non
      commencé, dépend de la mise en service du coordinateur lui-même.

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
| Review sans mordant (le modèle relit son propre travail) | Le mécanisable sort de la review et devient un job CI. `claude/review` ne juge que le subjectif. Dans le coordinateur, la review est en plus scindée en deux relecteurs aux corpus disjoints, arbitrés par une règle mécanique (« ou », #470) plutôt que par un seul relecteur ou par le jugement du coordinateur lui-même |
| Budget Lighthouse désactivé à la première PR rouge | Seuils `error` fixés depuis la baseline (accessibilité/bonnes pratiques/SEO, marge anti-bruit inter-runs) ou depuis des mesures directes sur le runner CI (performance, écart bien trop grand avec la baseline — voir §9), job toujours hors checks requis (#147) |
| Régression de backward-compat sur les schémas zod | Hors liste blanche `automation:enabled` : merge manuel obligatoire |
| `pull_request_target` expose les secrets | Ne jamais y exécuter le code de la PR |
| Événement de routine perdu par plafond de runs | Balayeur horaire (`requeue-lost-events.yml`) qui rejoue tout label déclencheur orphelin |
| Possession (`automation:in-progress`) figée par une routine morte sans reprendre (#379) | Même balayeur horaire, escalade vers `automation:needs-human` (+ `automation:queued` sur une issue) au lieu de rejouer — rejouer collisionnerait avec l'état partiel (branche/PR) laissé par la routine morte |
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

- **Qui exécute les routines, et où s'applique le choix de modèle — tranché
  (#423, 2026-09-07).** Option C : routage par sous-agent à l'intérieur du
  coordinateur (#430). Les Routines Claude Code restent l'exécutant, le
  dispatcher déclaratif reste une couche d'observabilité, et le choix de
  modèle devient une propriété du sous-agent lancé par le coordinateur.
  L'hypothèse a été vérifiée concrètement avant d'être retenue (§4, « Routage
  par sous-agent »). L'option B (Actions appelant des APIs de fournisseurs)
  n'est pas abandonnée mais cesse d'être un préalable : elle est rattachée à
  l'extraction de l'automatisation hors de Scoreo, avec un coût estimé à 15-25
  PR. Détail de l'arbitrage, point d'insertion et sort de chaque issue de
  l'épic : §4.
