---
name: merge-review-pass
description: Merge les PR ouvertes de remhiit/scoreo passées en review-pass (label `automation:review-pass`), une par une par ordre d'ancienneté, en rebasant chacune sur main avant de la merger et en attendant la CI + claude/review à chaque fois. Utiliser quand on demande de merger les PR review-pass, de "passer une passe" de merge, ou après une vague de PR Dependabot/site-quality (R5) en attente. Comble le trou du pipeline documenté dans doc/technical/automation-plan.md : ces PR n'ont pas le label `automation:enabled`, donc l'auto-merge natif (auto-merge-sync.yml) ne les prend jamais automatiquement.
---

# Merge review-pass

Ce skill merge, une par une, les PR qui ont passé la review automatique (R3,
`pr-review`) mais que rien ne merge tout seul. `automation-plan.md` §4 confie
le merge à `auto-merge-sync.yml`, une Action zéro-LLM qui n'agit que sur les
PR portant le label `automation:enabled` — un label que seul `implement-task` (R2) pose,
sur ses propres PR à risque faible. Les PR de Dependabot et celles de
`site-quality` (R5) n'ont jamais ce label : review-passées, elles
s'accumulent sans que rien ne les fasse avancer. C'est le trou que ce skill
comble, à la main, jusqu'à ce que le périmètre de `auto` soit un jour élargi.

Voir `project-conventions` pour les commandes pnpm de base et la structure
du monorepo.

## Périmètre

Une PR compte si elle porte le label **exact** `automation:review-pass`,
sur ouverte (`state: open`). N'importe quelle autre étiquette de verdict —
`automation:needs-fix`, `automation:needs-human`, `in-progress` — l'exclut :
ce n'est pas un jugement à porter, c'est un filtre à respecter. Si la
recherche par label ne renvoie rien, ne pas conclure trop vite qu'il n'y a
rien à faire : les noms de label ont déjà bougé une fois dans ce repo (`review-pass`
→ `automation:review-pass`), vérifier la liste des labels du repo avant de
rapporter "rien en attente".

Traiter les PR **une par une, dans l'ordre de création croissante** (la plus
ancienne d'abord), jamais en lot. Une fois une PR mergée, main a bougé —
c'est pourquoi chaque PR suivante se rebase à nouveau juste avant son tour,
plutôt que de rebaser tout le lot d'un coup au début.

## Avant de commencer

Vérifier que le clone local n'est pas superficiel :
`git rev-parse --is-shallow-repository`. S'il répond `true`, lancer
`git fetch --unshallow origin` avant tout rebase — un clone superficiel fait
échouer un rebase sur un faux conflit dès le tout premier commit de
l'historique, ce qui n'a rien à voir avec la PR en cours et fait perdre du
temps à diagnostiquer.

## Séquence, pour chaque PR (de la plus ancienne à la plus récente)

### 1. Rebaser

```
git fetch origin main <branche-de-la-PR>
git checkout -B tmp-<numéro> origin/<branche-de-la-PR>
git rebase origin/main
```

La branche temporaire locale (`tmp-<numéro>`) évite de piétiner une branche
de travail existante et se supprime en fin de passage sur cette PR.

### 2. Conflits — résolution mécanique uniquement

Un rebase qui traîne peut entrer en conflit avec une autre PR déjà mergée
entre-temps. Ce skill ne résout que ce qui est mécanique — jamais un
arbitrage fonctionnel :

- **`package.json`** (racine, `apps/scoreo/`, ou `packages/*/`) : le conflit
  est presque toujours une version de dépendance déjà bumpée par une autre
  PR mergée dans l'intervalle. Garder la version la plus haute des deux
  côtés du conflit, nettoyer les marqueurs `<<<<<<<`/`=======`/`>>>>>>>`.
- **`pnpm-lock.yaml`** : ne jamais l'éditer à la main — un lockfile modifié
  à la main dérive silencieusement du contenu réel des paquets.
  `git checkout --ours pnpm-lock.yaml`, puis `pnpm install --lockfile-only`
  pour le régénérer proprement, puis `git add pnpm-lock.yaml`.
- **Tout le reste** (un conflit dans du code applicatif, une logique de
  reducer, un test) : ce n'est pas à ce skill de trancher. `git rebase
  --abort`, laisser cette PR de côté sans la merger, noter la raison pour le
  résumé final, et passer à la suivante. Un skill de merge qui se met à
  arbitrer du code perd la propriété qui le rend sûr à lancer sans
  supervision.

Une fois les fichiers en conflit résolus (ou aucun conflit) :
`git rebase --continue` jusqu'à ce que le rebase se termine.

### 3. Valider le lockfile

`pnpm install --frozen-lockfile` — jamais `pnpm install` seul, qui peut
modifier le lockfile en silence si une résolution a dérivé. Un
`--frozen-lockfile` qui échoue après un rebase signale presque toujours un
conflit `pnpm-lock.yaml` mal résolu à l'étape précédente ; le corriger avant
de continuer.

Un bump touchant l'outillage de build ou de test (`vite`, `vitest`,
`typescript`, `eslint`, un `@types/*` de poids) mérite en plus un
`pnpm lint && pnpm typecheck` avant de pousser — un bump majeur (ex. vitest
4→5) justifie carrément un `pnpm test && pnpm build` complet en local avant
de pousser, exactement comme `site-quality` le fait déjà à l'ouverture de
ce type de PR.

### 4. Pousser

`git push --force-with-lease origin tmp-<numéro>:<branche-de-la-PR>` —
jamais un force tout court, qui écraserait sans prévenir un commit poussé
entre-temps par quelqu'un (ou quelque chose) d'autre.

### 5. Attendre la CI et la review

Le push déclenche `needs-review-label.yml`, qui repasse la PR par R3 sur le
nouveau SHA. Attendre que tous les check-runs soient au vert **et** que le
statut `claude/review` soit `success` avant de merger — ne jamais merger sur
la seule apparence "PR verte" dans l'UI, qui peut retarder d'un cycle sur un
check encore en cours.

Ne pas interroger l'API en boucle serrée. Utiliser `scripts/wait_pr.py` de
ce skill, lancé en arrière-plan :

```
python3 <chemin-du-skill>/scripts/wait_pr.py <sha> 90
```

Il rend un code de sortie 0 (tout vert), 1 (un check a vraiment échoué), 2
(CI verte mais `claude/review` pas encore `success`) ou 3 (timeout à 45
min). Le lancer en tâche de fond et reprendre la main quand la notification
arrive plutôt que de sonder soi-même en boucle.

Le script s'authentifie automatiquement auprès de l'API GitHub si
`GITHUB_TOKEN` (ou `GH_TOKEN`) est présent dans l'environnement — sans ça,
le quota anonyme (60 requêtes/heure) peut s'épuiser en une seule attente
quand on enchaîne plusieurs PR dans la même passe, chacune relançant le
script.

### 6. Si la CI échoue — ce n'est pas le rôle de ce skill de corriger

Un code de sortie 1 (ou une review qui redevient `needs-fix`) signifie
qu'un check a vraiment échoué, pas seulement qu'il tourne encore. Dans ce
cas, **ne pas diagnostiquer ni corriger** : ce n'est pas cette étape du
pipeline. Laisser la PR ouverte, non mergée — elle porte déjà (ou reprendra
via `needs-review-label.yml`) le label qui la fait retomber dans le circuit
R3/R4, et `address-feedback` (R4) est le skill dont c'est le travail de la
corriger. Noter dans le résumé final pourquoi cette PR a été laissée de
côté, avec le check qui a échoué, puis passer à la PR suivante — un échec
CI sur une PR n'a aucune raison de bloquer les autres, sans rapport entre
elles.

Exemple vécu dans ce repo : une PR de bump `@playwright/test` a fait
échouer le job `visual`, qui épingle volontairement la version d'image
Docker attendue et refuse un mismatch — un vrai garde-fou, pas un flake.
Cette PR est restée ouverte, une autre PR a corrigé le pin séparément, et le
bump a pu être re-tenté (et fusionné) ensuite. C'est exactement le
comportement attendu : constater, ne pas forcer, passer à la suivante.

### 7. Race avec Dependabot

Dependabot peut repousser un nouveau commit sur sa propre branche pendant
qu'on rebase, ou juste après qu'on ait poussé — par exemple si une version
plus récente du paquet sort entretemps. Les symptômes : un
`--force-with-lease` rejeté ("stale info"), ou des check-runs qui
apparaissent `cancelled` sur le SHA qu'on vient de pousser. Dans ce cas, ce
n'est pas une erreur à contourner : re-`git fetch` la branche, reconstruire
`tmp-<numéro>` depuis la nouvelle tête distante, refaire le rebase depuis le
début pour cette PR, et reprendre la séquence à l'étape 1.

### 8. Merger

Juste avant de merger, relire l'état actuel de la PR (SHA de tête, labels,
`mergeable_state`) plutôt que de faire confiance à ce qu'on savait il y a
quelques minutes — un autre push a pu arriver entretemps (Dependabot,
`needs-review-label.yml`, ou un humain). Merger en squash, avec un titre de
commit `<titre de la PR> (#<numéro>)`.

Une erreur transitoire au moment du merge (502, timeout réseau) ne veut pas
dire que le merge a échoué côté serveur — GitHub peut avoir traité la
requête avant que la réponse ne revienne. Avant de retenter, relire l'état
réel de la PR (`merged: true/false`) : merger deux fois la même PR n'est pas
possible côté GitHub, mais retenter sur une fausse hypothèse d'échec fait
perdre du temps et peut semer le doute sur ce qui s'est vraiment passé.

### 9. Nettoyer

Supprimer la branche temporaire locale (`git branch -D tmp-<numéro>`),
revenir sur la branche de travail avant de passer à la PR suivante.

## Répéter

Reprendre à l'étape 1 pour la PR suivante par ordre d'ancienneté, jusqu'à
épuisement de la liste des PR `automation:review-pass` ouvertes.

## Résumé final

Toujours en français (convention du repo, voir `CLAUDE.md` racine). Un
tableau : numéro de PR, sujet, résultat du rebase (à jour / sans conflit /
conflit résolu / abandonné), résultat CI, et statut final (mergée, ou
laissée de côté avec la raison précise).
