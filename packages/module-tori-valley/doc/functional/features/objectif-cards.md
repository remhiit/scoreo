# Objectif cards — transcription

**Status: transcribed and scored by the app.** The variant dealt per landscape is recorded on the Match setup screen (`Match.objectifCards`), and score entry asks for the counts the selected card needs, computing the points via `src/domain/model/objectifCard.ts`. See [`scoring.md`](scoring.md) for how that entry behaves, including the manual override.

**Which cards are computed.** All except **Village variante A** and **Eau variante C**, which score against the _neighbouring players'_ boards and so need a seating order the app doesn't model; they stay on manual entry. Each computable card declares the counts it needs (e.g. Bambou A asks only "how many groups of exactly 2 tiles?"), so no tile-by-tile board model is required.

Each landscape (Bamboo, Cherry Blossom, Mountain, Water, Village) has 3 difficulty variants (A/B/C) — **15 Objectif cards**, all transcribed below.

`doc/functional/features/scoring.md` mentions "16 cards": the deck also contains a Torī scoring reference card (transcribed in the annex at the end), which most likely accounts for the 16th. To confirm once the physical deck is counted; if a 16th Objectif card exists, it is still missing here.

## Bamboo

### Variante A

> ? selon le nombre de groupe de [tuile Bambou] de formes suivantes* :
> [2 tuiles] ou [2 tuiles, orientation miroir]
>
> \* Un groupe de plus de 2 tuiles n'est pas pris en compte.

Le score dépend du nombre de groupes de **exactement 2 tuiles** Bambou, dans l'une des 2 orientations illustrées. Une zone contiguë de plus de 2 tuiles Bambou ne compte pour aucun groupe.

| Nombre de groupes | 1   | 2   | 3   | 4   | 5   |
| ----------------- | --- | --- | --- | --- | --- |
| Points            | 4   | 9   | 15  | 22  | 30  |

(0 groupe → 0 point, implicite)

### Variante B

> 4 par groupe de cette forme : [2 tuiles] ou [2 tuiles] ou [2 tuiles]
>
> 10 par groupe de cette forme : [3 tuiles] ou [3 tuiles]
>
> 16 par groupe de cette forme : [4 tuiles]
>
> Un groupe doit strictement respecter les formes indiquées.

Trois paliers, cumulables sur des groupes différents :

| Taille du groupe | Orientations illustrées | Points par groupe |
| ---------------- | ----------------------- | ----------------- |
| 2 tuiles         | 3                       | 4                 |
| 3 tuiles         | 2                       | 10                |
| 4 tuiles         | 1                       | 16                |

Un groupe qui ne correspond strictement à aucune des formes illustrées (mauvaise orientation, ou taille non couverte) ne rapporte rien.

📌 À préciser si l'on automatise : les orientations exactes de chaque forme ne sont pas décrites en toutes lettres ici — se référer au scan de la carte (voir « Scans des cartes » plus bas).

### Variante C

> 3 par [tuile Bambou] sur les diagonales indiquées
>
> +1 si dans un des quatre coins
>
> +3 si au croisement des deux diagonales

Seules les tuiles Bambou posées sur l'une des deux diagonales du plateau (tracées sur l'illustration de la carte) rapportent des points : 3 VP chacune. Deux bonus cumulables s'y ajoutent selon la position exacte de la tuile :

| Position sur la diagonale      | Points    |
| ------------------------------ | --------- |
| Case ordinaire                 | 3         |
| Un des quatre coins            | 3 + 1 = 4 |
| Croisement des deux diagonales | 3 + 3 = 6 |

Une tuile Bambou hors diagonales ne rapporte rien.

Exemple illustré sur la carte : 5 tuiles Bambou sur les diagonales → trois cases ordinaires (3 + 3 + 3), une dans un coin (4) et une au croisement (6). Total : 19 VP.

## Cherry Blossom

### Variante A

> 2 par [tuile Cerisier]
>
> Bonus +6 par colonne de 4 [tuiles Cerisier]

Chaque tuile Cerisier du joueur rapporte 2 VP, où qu'elle soit placée. En plus, chaque colonne du plateau entièrement composée de 4 tuiles Cerisier rapporte 6 VP de bonus.

Exemple illustré sur la carte : 6 tuiles Cerisier → 6 × 2 = 12 VP, dont 4 alignées formant une colonne de 4 → +6 VP. Total : 18 VP.

### Variante B

> 3 par colonne d'au moins 1 [tuile Cerisier]

Chaque colonne du plateau contenant au moins une tuile Cerisier rapporte 3 VP. Le score dépend donc du nombre de colonnes occupées, pas du nombre de tuiles : une colonne avec 3 Cerisier rapporte autant qu'une colonne avec une seule.

Exemple illustré sur la carte : 3 colonnes contiennent au moins une tuile Cerisier (l'une en contient 3, les deux autres une chacune) → 3 × 3 = 9 VP.

### Variante C

> ? par [tuile Cerisier] — ? : nombre de [tuiles Village] dans votre tableau

La valeur de chaque tuile Cerisier n'est pas fixe : elle vaut autant de VP que le joueur possède de tuiles Village dans son tableau. Le score total est donc `nombre de Cerisier × nombre de Village`.

⚠️ Cette carte croise deux paysages : le score des Cerisier dépend du nombre de tuiles Village. Un calcul automatique aurait besoin du décompte des tuiles Village même quand l'Objectif sélectionné est celui du Cerisier.

Exemple illustré sur la carte : le tableau contient 3 tuiles Village (encadrées en rouge) → chaque tuile Cerisier vaut 3 VP ; les 2 tuiles Cerisier rapportent donc 3 + 3 = 6 VP.

## Mountain

### Variante A

> 3 par [tuile Montagne] seule dans sa ligne, sinon 0

Chaque ligne du plateau est examinée séparément : si elle contient exactement une tuile Montagne, cette tuile rapporte 3 VP. Si une ligne contient 2 tuiles Montagne ou plus, aucune d'entre elles ne rapporte de point (0 VP pour cette ligne).

Exemple illustré sur la carte : deux lignes contenant chacune une seule Montagne → 3 + 3 = 6 VP ; une ligne contenant deux Montagnes → 0 VP. Total : 6 VP.

### Variante B

> 6 par groupe d'au moins 2 tuiles [Montagne]

Chaque groupe de tuiles Montagne contiguës comptant au moins 2 tuiles rapporte 6 VP, quelle que soit sa taille au-delà de 2. Une tuile Montagne isolée ne rapporte rien.

Exemple illustré sur la carte : deux groupes de 2 tuiles Montagne → 6 + 6 = 12 VP ; une tuile Montagne isolée → 0 VP. Total : 12 VP.

### Variante C

> 1 par [tuile Montagne]
>
> +1 par [tuile Eau] qui lui est adjacente

Chaque tuile Montagne rapporte 1 VP de base, auquel s'ajoute 1 VP pour chacune des tuiles Eau qui lui sont adjacentes. Une Montagne entourée de 2 tuiles Eau vaut donc 3 VP.

⚠️ Comme Cerisier variante C, cette carte croise deux paysages : le score des Montagne dépend de la position des tuiles Eau.

Exemple illustré sur la carte : une Montagne sans Eau adjacente → 1 VP ; une Montagne avec 2 tuiles Eau adjacentes → 1 + 2 = 3 VP ; une Montagne avec 1 tuile Eau adjacente → 1 + 1 = 2 VP. Total : 6 VP.

## Village

### Variante A

> 3 par [tuile Village]
>
> Bonus +4 par tableau voisin qui a strictement moins de [tuiles Village]

Chaque tuile Village du joueur rapporte 3 VP. En plus, on compare le nombre de tuiles Village du joueur à celui de chacun de ses tableaux voisins : chaque voisin qui en a strictement moins rapporte 4 VP de bonus.

⚠️ Cette carte est la première rencontrée dont le score dépend des **autres joueurs** (les tableaux voisins), et pas uniquement du plateau du joueur. Un calcul automatique nécessiterait donc de connaître le nombre de tuiles Village de chaque joueur ainsi que l'ordre des places autour de la table.

Exemple illustré sur la carte : le joueur a 3 tuiles Village → 3 × 3 = 9 VP ; ses deux voisins en ont respectivement 2 et 1, tous deux strictement moins que 3 → +4 + 4 = 8 VP. Total : 17 VP.

### Variante B

> 4 par [tuile Village] d'un de vos plus grands groupes

Seul un des plus grands groupes de tuiles Village du joueur rapporte des points : 4 VP par tuile de ce groupe. Tout autre groupe Village rapporte 0 VP. Même structure que la carte Eau variante A, mais à 4 VP/tuile et sans bonus de bord.

Exemple illustré sur la carte : un groupe de 5 tuiles Village → 5 × 4 = 20 VP ; un autre groupe de 2 tuiles (non retenu) → 0 VP. Total : 20 VP.

### Variante C

> 2 par [tuile] de types différents autour de [tuile Village] (tuiles Villages exclues)

Le score se calcule **tuile Village par tuile Village** : pour chacune, on compte le nombre de types de paysage _distincts_ parmi ses tuiles adjacentes, en ignorant les tuiles Village. Chaque type distinct rapporte 2 VP. Deux tuiles adjacentes du même type ne comptent donc qu'une fois.

Exemple illustré sur la carte : deux tuiles Village adjacentes à une même tuile Bambou → 1 type distinct chacune → 2 + 2 = 4 VP (elles sont voisines l'une de l'autre, mais les Villages sont exclus du décompte) ; une tuile Village adjacente à des tuiles Eau et Bambou → 2 types distincts → 4 VP. Total : 8 VP.

## Water

### Variante A

> 3 par [tuile Eau] d'un de vos plus grands groupes
>
> Bonus +1 par [tuile Eau] du groupe, s'il touche les bords haut et bas du tableau

Seul un des plus grands groupes de tuiles Eau du joueur rapporte des points (3 VP par tuile de ce groupe) ; tout autre groupe Eau ne rapporte rien. Si ce groupe touche à la fois le bord haut et le bord bas du plateau, chaque tuile du groupe rapporte 1 VP supplémentaire (donc 4 VP/tuile au lieu de 3).

En cas d'égalité entre plusieurs groupes de même taille maximale, le choix du groupe n'a pas d'impact sur le score (peu importe lequel est retenu, le total est identique).

Exemple illustré sur la carte : un groupe de 5 tuiles touchant les bords haut et bas → 5 × 3 = 15 VP de base + 5 × 1 = 5 VP de bonus = 20 VP ; un autre groupe de 3 tuiles (non retenu, pas le plus grand) → 0 VP.

### Variante B

> 4 par [tuile Eau] isolée qui touche le bord du plateau

Une tuile Eau rapporte 4 VP si elle remplit **les deux** conditions : être isolée (aucune autre tuile Eau adjacente) **et** toucher le bord du plateau. Toute tuile Eau qui échoue à l'une des deux conditions rapporte 0 VP.

Exemple illustré sur la carte : 5 tuiles Eau au total → 2 tuiles isolées et au bord → 4 + 4 = 8 VP ; une paire de deux tuiles Eau adjacentes → 0 VP (non isolées) ; une tuile isolée mais ne touchant pas le bord → 0 VP. Total : 8 VP.

### Variante C

> 3 par groupe d'au moins 1 [tuile Eau]
>
> Bonus +10 si l'un de vos groupes est strictement plus grand que ceux des tableaux voisins

Chaque groupe de tuiles Eau rapporte 3 VP quelle que soit sa taille — une tuile Eau isolée forme à elle seule un groupe et rapporte donc 3 VP. Le score de base est ainsi `nombre de groupes × 3`.

S'y ajoute un bonus unique de 10 VP si le plus grand groupe du joueur compte strictement plus de tuiles que le plus grand groupe de **chacun** de ses tableaux voisins. Le bonus est de +10 au total, pas +10 par voisin.

⚠️ Comme Village variante A, le bonus dépend des **autres joueurs** : il faudrait connaître la taille du plus grand groupe Eau de chaque voisin et l'ordre des places autour de la table.

Exemple illustré sur la carte : le joueur a 2 groupes (un de 3 tuiles, un de 1 tuile) → 2 × 3 = 6 VP ; son plus grand groupe (3 tuiles) dépasse strictement ceux de ses deux voisins → +10 VP. Total : 16 VP.

## Annexe — carte de référence Torī

Cette carte n'est **pas** une carte Objectif : c'est le rappel du barème des Torī, déjà implémenté dans `src/domain/model/torii.ts`. Elle est transcrite ici parce qu'elle se trouve dans le même paquet.

> ? par [Torī] — ? : nombre de Torī de couleurs différentes*
>
> \* Vous pouvez marquer les points de plusieurs séries.

| Torī de couleurs différentes | 1   | 2   | 3   | 4   | 5   |
| ---------------------------- | --- | --- | --- | --- | --- |
| Points                       | 0   | 2   | 4   | 7   | 10  |

Les 5 couleurs illustrées (avec leur symbole) : vert ▲, rouge ◆, bleu 💧, jaune ★, violet 🌀.

✅ Concorde exactement avec `SERIES_SCORE = [0, 0, 2, 4, 7, 10]` (`src/domain/model/torii.ts`), et la note sur les séries multiples correspond à la boucle de `scoreTorii()`. Rien à corriger côté code.

## Scans des cartes

Des photos recadrées des 16 cartes sont versionnées dans [`../../resources/objectif-cards/`](../../resources/objectif-cards/), une par carte — c'est la référence à ouvrir quand ce document ne suffit pas :

```
bambou-a.jpg     cerisier-a.jpg   montagne-a.jpg   village-a.jpg   eau-a.jpg
bambou-b.jpg     cerisier-b.jpg   montagne-b.jpg   village-b.jpg   eau-b.jpg
bambou-c.jpg     cerisier-c.jpg   montagne-c.jpg   village-c.jpg   eau-c.jpg
tori-reference.jpg
```

⚠️ Ce répertoire est **gitignoré et n'est jamais commité** — même règle que le PDF des règles (`LVDT_Rules*.pdf`) : matériel sous copyright Origames, conservé en local pour référence, pas pour distribution. Le dépôt étant public, les scans ne doivent pas y être poussés.

Ils servent de source de vérité pour cette transcription : en cas de doute sur une forme ou un barème, se référer au scan plutôt qu'au texte ci-dessus. Si le répertoire est absent (nouveau clone), il faut re-photographier les cartes.
