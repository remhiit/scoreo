# Plan d'automatisation — Scoreo

Document de référence pour l'automatisation du développement de `remhiit/scoreo`
via les **routines Claude Code**.

> **Comment utiliser ce document.** Il est la source de vérité de l'architecture
> d'automatisation. Toute session Claude Code travaillant sur ce sujet doit le
> lire en premier. Il indique la phase en cours et le critère de passage à la
> suivante. Ne pas sauter de phase : chaque gate protège la suivante.

**Phase en cours : 4 — R2, l'implémentation (routine opérationnelle depuis le 2026-07-15, gate 1/5 — premier ticket #96/PR #97 traité de bout en bout). Phases 0 à 3 closes : gate Phase 2 franchi (2026-07-14, PR #90) et premier run réel de R5 observé (2026-07-14, PR #84-89).**

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

```
Issue créée
   │
   ▼
[R1 — GROOMING : session interactive, PAS une routine]
   │  skill issue-to-spec → critères d'acceptation, fichiers, catégorie de risque
   │  pose le label `ready`
   ▼
      GitHub trigger `issues.labeled`, filtre `ready`
                                                 ▼
                                     [R2 — IMPLÉMENTATION]
                                                 │ skill implement-task
                                                 │ 1 run = 1 issue
                                                 │ branche + code + tests + PR
                                                 │ pose `auto` si risque faible
                                                 ▼
                                          PR ouverte
                                                 │
      GitHub trigger `pull_request.opened|synchronize`
                                                 ▼
                                         [R3 — REVIEW]
                                          │ skill pr-review
                                          │ commentaires inline
                                          │ commit status claude/review ✅/❌
                                          ▼
                      ┌──────────────────┴──────────────────┐
                   ❌ failure                            ✅ success
                      │ label `needs-fix`                    │
                      ▼                                      │
   Action `pull_request.labeled` ──/fire──► [R4 — FIX]       │
                      │ skill address-feedback               │
                      │ attempt-1 → 2 → 3                    │
                      │ à attempt-3 : STOP, `needs-human`    │
                      └──────────► repush ──► R3 (boucle)    │
                                                             ▼
                                          Tous les checks verts + label `auto`
                                                             │
                                              `gh pr merge --auto --squash`
                                                             ▼
                                                      main → deploy.yml
                                                             ▼
                                          Project : carte → Done (workflow intégré)
```

**En parallèle, sur planification :**

- **R5 — Hygiène** (hebdo) : deps, liens de doc, Lighthouse, sitemap. Ouvre une
  PR par catégorie. Passe par R3 comme n'importe quelle PR.
- **R6 — Rapport** (lundi) : PR ouvertes > 3 jours, tickets `needs-human`, taux
  d'échec de `claude/review`, runs consommés. C'est ce rapport qui décide de
  l'élargissement du périmètre `auto`.

### Le merge n'est pas une routine

Branch protection + checks requis + `gh pr merge --auto --squash`. La PR se
merge seule quand la CI est verte et que le label `auto` est présent. Aucun LLM
dans la boucle.

---

## 5. Labels (le bus d'événements)

| Label | Rôle |
|---|---|
| `ready` | Spec validée → déclenche R2 |
| `in-progress` | Une routine travaille dessus |
| `needs-review` | File d'attente pour `pr-review` (R3) — seul trigger GitHub possible sur une Routine, posé automatiquement à l'ouverture d'une PR, retiré une fois la review faite |
| `review-pass` | Verdict `pr-review` (R3) : conforme → traduit en commit status `claude/review` succès |
| `needs-fix` | Verdict `pr-review` (R3) : à corriger → traduit en commit status `claude/review` échec, déclenche R4 |
| `needs-human` | Escalade : plafond d'itérations ou hors périmètre |
| `blocked` | Dépendance externe |
| `auto` | Autorisé à l'auto-merge une fois les checks verts |
| `attempt-1/2/3` | Compteur anti-boucle. **À `attempt-3` : stop.** |
| `P0`…`P3` | Priorité (reprise de la sémantique de `.task/`) |

### Liste blanche `auto` (à élargir par la donnée, pas à l'intuition)

**Autorisé au départ :** contenu, documentation, dépendances, refacto local sans
changement de comportement public.
**Exclu :** modèles sérialisés et migrations, ports/adapters, `public/`
(manifest, `sw.js`), config Vite/TS, navigation.

> Cohérent avec les règles du `CLAUDE.md` : tout modèle sérialisé doit rester
> backward-compatible, toute suppression/renommage exige une migration. Ce n'est
> pas un terrain pour une IA autonome.

---

## 6. Skills (`.claude/skills/`)

| Skill | Contenu |
|---|---|
| `project-conventions` | Délègue au `CLAUDE.md` : stack, commandes pnpm, arbo, architecture hexagonale, conventions de commit |
| `issue-to-spec` | Format de spec : contexte, critères d'acceptation testables, fichiers impactés, hors-scope, **catégorie de risque** (détermine le label `auto`) |
| `implement-task` | Branche `feat/<issue>-<slug>`, tests d'abord, `pnpm lint typecheck test build` vert, vérif visuelle, PR avec `Closes #N`, mise à jour de `doc/` (pre-commit checklist du `CLAUDE.md`) |
| `pr-review` | Checklist **subjective uniquement** : conformité à la spec, respect de l'archi hexagonale, backward-compat des schémas zod, doc à jour, dette introduite. Le mécanisable est déjà en CI |
| `address-feedback` | Corriger le périmètre signalé. Ne pas refondre |
| `site-quality` | Deps, liens de doc, Lighthouse, PWA. Utilisée par R5 |

**Règle :** une skill non éprouvée en interactif ne passe pas en autonome.

---

## 7. Phases et critères de passage

### Phase 0 — Fondations CI ⬅️ *en cours*

Le repo n'a **aucune CI de PR** : les tests tournent dans `deploy.yml`, donc
après le merge. Le site est cassé sur `main` au moment où on l'apprend.

- [x] `.github/workflows/ci.yml` — jobs `build`, `test`, `lint`, `doc-links`,
      `lighthouse` (non bloquant au départ)
- [x] `lighthouserc.json` — assertions en `warn` le temps de mesurer la baseline
      (baseline mesurée : performance 0.96, accessibilité 0.95, bonnes pratiques
      0.96, SEO 0.90 — catégorie `pwa` retirée des assertions, Lighthouse 12 ne
      la calcule plus par défaut)
- [x] `gh secret set GOOGLE_CLIENT_ID` (le build en dépend) — exécuté par Rémi
      via `setup-repo.sh`
- [x] `setup-repo.sh` — labels, `allow_auto_merge`, branch protection
      (`enforce_admins: true`, 0 approbation). Script écrit et **exécuté par
      Rémi** ; checks requis actuels : `lint`/`test`/`build`/`doc-links`/
      `claude/review` (ce dernier ajouté au script le 2026-07-14, gate Phase 2
      franchi — voir Phase 2 ci-dessous). Toujours hors de portée d'une
      session Claude Code : modifie la config partagée du repo, nécessite un
      `gh` authentifié en admin.
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
      Se déclenche sur `issues`/`pull_request` `labeled`/`unlabeled`, plus un
      cron toutes les 6h en filet de sécurité. Sens unique (labels → champ
      `Status`), jamais l'inverse — cohérent avec le principe directeur
      « les labels sont le bus d'événements ». Nécessite le secret
      `PROJECT_TOKEN` (PAT classique, scope `project`) via `setup-repo.sh` ;
      tant qu'il est absent, le job se termine proprement sans erreur (pas de
      check rouge en boucle)

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
   reposé (la dernière étape de `pr-review` le retire). Reposer ce label plus
   tard (une fois R4 construit) redéclenche une review — le mécanisme sert
   aussi de boucle de re-review pour la Phase 5.
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

### Phase 4 — R2, l'implémentation ⬅️ *en cours*

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
| #96 | #97 | Bouton Disconnect visible quand la synchro échoue après connexion — `review-pass`, mergé sans intervention manuelle |

Compteur : 1/5.

### Phase 5 — R4 et auto-merge

R3 en échec → label `needs-fix` → Action → `/fire` R4. R4 incrémente
`attempt-N`. **À `attempt-3` : stop, retire `auto`, pose `needs-human`.**
Sans ce plafond, une seule PR brûle le quota journalier en une nuit.

Auto-merge conditionné au label `auto` uniquement.

**Gate :** 2 semaines, zéro merge qu'on aurait refusé.

### Phase 6 — Observabilité

R6 hebdo. C'est le rapport qui pilote l'élargissement de la liste blanche `auto`.

---

## 8. Risques identifiés

| Risque | Mitigation |
|---|---|
| Boucle R3 ↔ R4 infinie | Plafond `attempt-3`, puis `needs-human` |
| Quota de runs épuisé par une seule PR | Même plafond + `concurrency` dans la CI |
| Review sans mordant (le modèle relit son propre travail) | Le mécanisable sort de la review et devient un job CI. `claude/review` ne juge que le subjectif |
| Budget Lighthouse désactivé à la première PR rouge | Mesurer la baseline avant de le rendre bloquant |
| Régression de backward-compat sur les schémas zod | Hors liste blanche `auto` : merge manuel obligatoire |
| `pull_request_target` expose les secrets | Ne jamais y exécuter le code de la PR |

## 9. Décisions ouvertes

- **Identité distincte pour les routines.** Une GitHub App ouvrant les PR à la
  place de R2 redonnerait un approbateur légitime. Complexité non justifiée tant
  que le commit status requis fait le travail. À reconsidérer si le repo
  s'ouvre à des contributions externes.
- **Seuils Lighthouse définitifs** — à figer après mesure de la baseline.
