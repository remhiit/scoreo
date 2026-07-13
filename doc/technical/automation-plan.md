# Plan d'automatisation — Scoreo

Document de référence pour l'automatisation du développement de `remhiit/scoreo`
via les **routines Claude Code**.

> **Comment utiliser ce document.** Il est la source de vérité de l'architecture
> d'automatisation. Toute session Claude Code travaillant sur ce sujet doit le
> lire en premier. Il indique la phase en cours et le critère de passage à la
> suivante. Ne pas sauter de phase : chaque gate protège la suivante.

**Phase en cours : 2 — R3, la review (mécanisme révisé, Routine à créer manuellement).**

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
  GitHub (PR, release). Rien d'autre.
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
Action `issues.labeled: ready` ──POST /fire──► [R2 — IMPLÉMENTATION]
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
- [ ] `gh secret set GOOGLE_CLIENT_ID` (le build en dépend) — à exécuter par un
      admin via `setup-repo.sh` (nécessite un token `gh` non disponible en
      session Claude Code)
- [x] `setup-repo.sh` — labels, `allow_auto_merge`, branch protection
      (`enforce_admins: true`, 0 approbation, checks requis :
      `lint`/`test`/`build`/`doc-links`). Script écrit, **pas encore exécuté** :
      il modifie la config partagée du repo et nécessite un `gh` authentifié en
      admin, hors de portée d'une session Claude Code.
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
   `pull_request.opened`/`ready_for_review`) pose le label `needs-review` —
   la file d'attente qui contourne la limite « un seul trigger ».
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
- [ ] **La Routine elle-même reste à créer manuellement** sur
      https://claude.ai/code/routines — les triggers GitHub et API d'une
      Routine ne sont configurables que depuis cette UI web, aucun outil
      disponible ici ne le permet (même limitation que le GitHub Project en
      Phase 0 bis). Voir `deployment.md` pour la configuration exacte
      (prompt, repo, trigger) à saisir.

Laisser tourner ~10 PR **sans** que `claude/review` soit requis.
**Gate :** le check dit « non » au moins une fois à raison, et ne crie pas au
loup. Alors seulement, l'ajouter aux checks requis (`setup-repo.sh`).

### Phase 3 — R5, hygiène hebdo

Routine planifiée → `site-quality` → une PR par catégorie. Risque nul, et ça rode
le chemin *routine → PR → R3* avant d'y injecter du code généré.

### Phase 4 — R2, l'implémentation

Token API sur la routine, secrets `ROUTINE_ID` / `ROUTINE_TOKEN`, Action
`dispatch-ready.yml` sur `issues.labeled == ready` :

```yaml
curl -sf -X POST \
  https://api.anthropic.com/v1/claude_code/routines/${{ secrets.ROUTINE_ID }}/fire \
  -H "Authorization: Bearer ${{ secrets.ROUTINE_TOKEN }}" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: experimental-cc-routine-2026-04-01" \
  -H "content-type: application/json" \
  -d '{"text":"Implémente l'\''issue #${{ github.event.issue.number }} en suivant .claude/skills/implement-task"}'
```

> Vérifier la valeur courante du header beta dans la doc avant de figer.

**Gate :** 5 tickets faciles traités, PR lisibles, **merge encore manuel**.

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
