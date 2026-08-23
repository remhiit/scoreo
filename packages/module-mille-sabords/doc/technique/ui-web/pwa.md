# UI Web — PWA & service worker

Fichiers `jsMain/resources/manifest.json` et `jsMain/resources/sw.js`.
Ils sont copiés tels quels dans la distribution par `jsBrowserDistribution`.

L'enregistrement du service worker se fait depuis `index.html` :

```js
navigator.serviceWorker.register('./sw.js');
```

## Cycle de vie du service worker

| Événement | Rôle |
|---|---|
| `install` | Ouvre le cache `CACHE_NAME` et y précharge `ASSETS` (`./`, `./index.html`, `./app.js`) |
| `activate` | Purge les anciens caches de l'application |
| `fetch` | Stratégie **cache-first** : la réponse en cache si elle existe, sinon le réseau |

`skipWaiting()` et `clients.claim()` sont appelés **en dehors** de
`event.waitUntil(...)`, donc de façon synchrone : ils s'exécutent sans
attendre la fin du préchargement ni celle de la purge.

## Purge des caches : préfixe obligatoire

L'API `caches` est partagée **par origine**, pas par scope de service
worker. Les autres PWA du compte (Scoreo, Torī Valley Scoreboard) sont
déployées sur la même origine `remhiit.github.io` et y stockent aussi
leurs caches.

La purge de `activate` ne doit donc **jamais** supprimer tous les caches
de l'origine : elle ne cible que ceux de 1000 Sabords, reconnaissables à
leur préfixe.

```js
const CACHE_NAME = 'ksabord-v1';
const PREFIXE_CACHE = CACHE_NAME.replace(/-v[^-]*$/, '') + '-';

keys.filter(k => k.startsWith(PREFIXE_CACHE) && k !== CACHE_NAME)
```

`PREFIXE_CACHE` vaut donc `ksabord-`.

Le préfixe est **dérivé** de `CACHE_NAME` (partie avant le `-v` final)
et non réécrit en dur : un changement de version (`ksabord-v2`) suffit,
il n'y a qu'une seule constante à modifier.

### Contraintes de nommage

Deux règles à respecter en modifiant `CACHE_NAME` :

1. **Format `<prefixe>-v<n>`**, `<n>` sans tiret. Si la regex ne matche
   pas (`ksabord-v1-beta`, `ksabord`), le préfixe retombe sur
   `CACHE_NAME + '-'` : la purge des anciennes versions devient
   inopérante — mais elle reste sans danger pour les autres apps, le
   préfixe dégradé étant plus restrictif, jamais plus large.
2. **Préfixe unique sur l'origine.** Une future app dont le cache
   s'appellerait `ksabord-pro-v1` serait purgée par 1000 Sabords.

Effet du filtre :

| Cache présent | Sort à l'activation de `ksabord-v1` |
|---|---|
| `ksabord-v1` | conservé (version courante) |
| `ksabord-v0` | **supprimé** (ancienne version de l'app) |
| `scoreo-v3` | conservé (autre app de l'origine) |
| `tori-valley-v1` | conservé (autre app de l'origine) |

## Vérification

Le dépôt n'a pas d'infrastructure de test JS pour `sw.js` (`jsNodeTest`
couvre le domaine Kotlin). La vérification est manuelle : installer deux
des trois PWA, ouvrir la seconde, puis contrôler dans DevTools →
Application → Cache Storage que les deux caches coexistent.

-
