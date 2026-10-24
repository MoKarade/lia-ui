# lia-ui

LIA vivante pour le hub et les apps : un corps de 100 traits, une vie propre, une discussion au clic, un menu d'actions au clic droit. Le cerveau est ailleurs (MemoryAI) : ce paquet ne fait que dessiner et relayer.

## Installer

Par tag épinglé, comme `hub-contract` (jamais une branche) :

```
npm i github:MoKarade/lia-ui#v0.25.0
```

## Utiliser

Next.js / React (composant client) :

```tsx
import { Lia } from "@mokarade/lia-ui/react";

<Lia
  ask={async (question, signal) => {
    const r = await fetch("/api/lia", { method: "POST", body: JSON.stringify({ question }), signal });
    if (!r.ok) throw new Error("indisponible");
    return r.json(); // { text, chips?, mood?, blocks? }
  }}
  actions={[{ id: "bail", label: "Voir le bail", run: () => router.push("/bail") }]}
/>
```

Sans framework : `const lia = mountLia({ ask, actions })`, puis `lia.dire("…")`, `lia.setHumeur("calme")`, `lia.destroy()`.

## Ce que l'hôte décide

| Option | Rôle |
| --- | --- |
| `ask(question, signal, contexte?)` | Répond à une question. Absent ou en échec : LIA dit qu'elle est indisponible. `contexte` = `{ humeur, silhouette, regard }` (listes fermées : `HUMEURS_DETAILLEES`, `SILHOUETTES_LIA`, `regard` = valeur de `data-lia-cible` en `[a-z0-9-]` ou `null`) : l'hôte l'annonce au modèle comme une DONNÉE sur LIA, sinon la réponse nie son humeur. Une question courte sur son humeur (« ton humeur ? », « ça va ? ») reçoit sa propre réponse sans passer par `ask`. |
| `actions` | Entrées du menu (clic droit, appui long, touche Menu). L'hôte vérifie les droits : LIA n'exécute rien d'elle-même. |
| `container` | Élément où elle vit (colonne du hub). Sans lui : la fenêtre. |
| `bounds()` | Zone où elle a le droit de se déplacer. |
| `onChip`, `onHumeur`, `renderBlocks` | Réponses rapides, voyant d'humeur (quand sa dominante est l'une des 12 humeurs du menu), blocs composés (validés par l'hôte ; rendu prêt : `rendreBlocs` de `@mokarade/lia-ui/blocs`). |
| `entrees()` | Ce que l'hôte sait du monde, lu chaque seconde : des nombres de 0 à 1 (`alerte`, `nbAlertes`, `toutVert`, `changement`, `recurrence`, `tendBonne`, `tendMauvaise`, `g_<app>`, `v_<app>`…) qui nourrissent son réseau ; ils priment sur ce qu'elle calcule seule. Absent ou en erreur (dite dans la console) : elle vit sans monde. |
| `monde(motif, element?)` | Ce que l'hôte a de **vrai** à lui faire dire sur le monde, pour `appeler` (un problème), `resumer` (une tendance), `feliciter` (une bonne nouvelle), `rappeler`, `souvenir`, et `accompagner` (Marc regarde un élément `[data-lia-cible]` depuis 4 s : `element` est cet élément, une fois par élément toutes les 3 min) : `{ text, chips?, element? }`, ou `null` s'il n'y a rien. Elle choisit le moment (délais de 90 s à 30 min, envies, intentions, heures de `silence`), va près de `element` s'il est dans la zone regardée (sinon elle parle sur place), prend sa silhouette et dit le texte de l'hôte. Aucun texte n'est écrit dans ce paquet. L'hôte doit renvoyer `null` quand il en a déjà parlé : elle ne le sait pas. |
| `cibles` | Sélecteur des éléments qu'elle peut aller voir (défaut `[data-lia-cible]`). Elle s'en approche, reste collée dessus quand la page défile, et ne fait **jamais** défiler la page. |
| `onSpontane(motif)` | Ce qu'elle dit quand elle a envie de parler seule (`rien`, `salut`, `relance`). Renvoie le texte (ou `{ text, chips }`), ou `null` si l'hôte n'a rien de vrai à dire : elle se tait. Absent : jamais de parole spontanée. |
| `parolePropre` | `true` par défaut : quand l'hôte n'a rien à dire, elle parle d'elle-même (son humeur, ses envies, son journal, l'heure, une blague, une question sans importance avec réponses rapides). Voir « Ce qu'elle dit d'elle-même ». `false` : elle ne dit que ce que l'hôte fournit. |
| `silence`, `relancesParJour` | Heures sans parole spontanée (défaut `[22, 7]`) et plafond de relances par jour (défaut 2, mémorisé dans le navigateur). |
| `elements` | Clic droit sur n'importe quel élément de la page (voir plus bas). `{ selecteur?, decrire? }`, ou `false` pour ne garder que le clic droit sur son corps. |
| `rayon`, `cle`, `vieAutonome`, `salut` | Taille, clé de mémorisation locale, vie autonome, message d'arrivée. Le rayon se change ensuite avec `poignee.setRayon(px)` (24 à 400 px, glissement d'une demi-seconde, immédiat en mode « fixe ») : pour une LIA grande sur un accueil et petite ailleurs, sans la remonter (v0.17.0). |

## Elle te suit, elle vit seule

Sans rien lui demander, LIA décide d'elle-même de rester là, d'errer, de suivre le curseur un moment (souris ou stylet, jamais au doigt) ou d'aller voir un des éléments `[data-lia-cible]` visibles, puis s'y colle exactement (écart de 0 px mesuré pendant le défilement). L'hôte peut aussi la guider : `lia.suivreCurseur(secondes)`, `lia.allerVoir(element, secondes)`, `lia.venirPres()` (près du curseur ou sur le bord, avant de la faire parler) et `lia.rester()`. Tout est coupé par « La laisser tranquille » ; `prefers-reduced-motion` la rend plus douce (voir plus bas). Ce qu'elle choisit dépend de ses envies, décidées toutes les 1,2 s (section suivante, relances : 2 par jour au plus, et elle va voir un élément en disant son `data-lia-dit` au bout d'une seconde et demie) ; son humeur vient de son réseau (section suivante). Elle parle seule par `onSpontane` (le texte de l'hôte, qui garde la priorité pour ses motifs) et, une fois sur deux environ, d'elle-même (`parolePropre`, section « Ce qu'elle dit d'elle-même »), jamais entre 22 h et 7 h.

## Ses envies et ce qu'elle décide de faire

Sa vie n'est plus une tirette au hasard : six envies (énergie, curiosité, besoin de compagnie, inquiétude, joie, ennui) montent et descendent chaque seconde avec le temps et ce qu'elle fait, et elle choisit parmi ce qui est possible maintenant, avec un poids par envie (repos, jouer sur place, se promener, suivre le curseur, aller voir un élément `[data-lia-cible]`, parler seule si l'hôte a quelque chose de vrai à dire, rentrer chez elle, dormir quand l'énergie est basse). Formules reprises de la maquette V9, sans réseau ni coût ni texte écrit dans le paquet.

- Les envies et un journal de ses 20 dernières décisions sont gardés dans le navigateur (`lia-ui:<cle>:cerveau`) : elle reprend là où elle en était à la page suivante.
- `lia.envies()` rend ses six envies, `lia.journal()` ses derniers faits (`{ t, quoi }`) : de quoi lui faire dire, côté hôte, ce qu'elle a vraiment fait.
- En mode « doux » du mouvement réduit, elle ne se déplace pas : seuls jouer, se reposer, parler et dormir restent possibles.
- Pas de remarque spontanée avant 90 s depuis la dernière ; les relances restent à deux par jour.

## Ce qu'elle dit d'elle-même (v0.14.0) et comment elle se déplace

**Parole propre.** Marc, 23/10 20:41Z : « manque de communication, ne fait que parler des projets et rien d'autre ». Sans que l'hôte ait rien à dire, LIA parle d'elle (`src/paroles.ts`, option `parolePropre`, vrai par défaut) : sa phrase du moment pour chacune des 40 humeurs, l'heure réelle, ce que ses envies disent vraiment (ennui, solitude, fatigue, curiosité, joie, souci ; une envie basse ne produit jamais la phrase), un résumé de son vrai journal (« je me suis promenée 2 fois, j'ai joué »), quelques remarques sans importance (le poulpe, la respiration, une blague, matin ou soir) avec des réponses rapides qu'elle comprend elle-même (`lia:…`, jamais transmises à l'hôte). Règle : une phrase y est vraie par construction ou sans fait (un jeu, une question). Rien sur Marc, ses apps, ses chiffres (verrou : `tests/paroles.test.ts`). Une phrase dite récemment sort 8 fois moins ; l'hôte garde la priorité pour ses motifs (`appeler`, `resumer`…), et la parole libre alterne avec la sienne (60 % la sienne), au plus une toutes les 28 s. Dès que l'hôte vient de parler (motif du monde, relance, remarque), c'est le tour d'elle : plus aucun motif ni relance de l'hôte avant qu'elle ait dit quelque chose d'elle et l'accompagnement d'un élément attend aussi ; une visite de carte décidée seule ne dit pas la phrase `data-lia-dit` de l'hôte juste après une autre ; jamais deux bulles de projet de suite. Après une phrase d'elle, elle prend 4 s une silhouette qui va avec (ennui : attend, solitude : triste, curiosité : cherche, joie : content, blague : musique, journal : souvient…) au lieu de retomber au repos.

**Déplacement.** Elle a une masse : ressort sous-amorti (elle dépasse un peu sa cible en balade), vitesse et accélération bornées, un coup d'épaule d'anticipation avant de partir, inclinaison dans le sens de la course (sur un ressort, elle se balance en s'arrêtant), étirement le long de la course, battement vertical quand elle file, flottement continu quand elle est posée, et chaque trait du corps reçoit la force d'inertie du mouvement (hook `o.acc` du moteur : les traits traînent au départ et se balancent à l'arrêt). Posée sur un élément, elle y reste par un ressort raide (plus de saut). `prefers-reduced-motion` « doux » ou « fixe » : rien de tout cela.

## Son réseau d'humeurs

Son corps n'a plus une humeur au tirage : un réseau de 225 neurones (reprise du réseau de la maquette V9, 62 entrées, 40 humeurs, 17 intentions) tourne chaque seconde et mélange les profils des humeurs actives ; le moteur dessine ce mélange. Les entrées qu'elle calcule seule : ses six envies, le moment de la journée, l'activité de Marc sur la page (curseur, clavier, défilement, doigt), la longueur de la session et le rythme de la discussion (jamais le texte). Le reste vient de l'hôte par `entrees()`.

- Ses intentions pèsent sur ce qu'elle décide de faire (`causer`, `jouer`, `voir`…) ; une mémoire lente de vingt minutes lui fait garder une humeur d'une page à l'autre (`lia-ui:<cle>:reseau`).
- `lia.ressent()` rend ses humeurs du moment, de la plus forte à la plus faible (trois au plus, `[["inquiet", 0.55], …]`). `lia.impulsion("bon" | "mauvais" | "touche" | "parle" | "reponse" | "rejet" | "scroll" | "demande", valeur?)` lui donne une nouvelle ; elle retombe d'elle-même. Elle en reçoit aussi toute seule (défilement, clic sur son corps, parole, message de Marc).
- Avec `monde`, son inquiétude monte quand `entrees().alerte` est haute : alors `appeler` devient son choix presque certain (poids 3,2 de la maquette), elle vient près du curseur et dit la phrase de l'hôte. `resumer`, `rappeler`, `souvenir` et `feliciter` demandent que Marc ait bougé depuis moins d'une minute. Elle met `data-regard` sur l'élément qu'elle regarde (visite, accompagnement, `allerVoir`, `envoyer`, clic droit sur un élément) et l'ôte quand elle s'en va : à l'hôte de le styler (liseré). Sans l'hôte, elle `veille` (silhouette « surveille » 7 à 12 s) la nuit ou quand Marc est parti. Chaque choix entre dans `lia.journal()` (`appeler`, `resumer`…).
- `setHumeur(h)` et le menu de son corps poussent une humeur pendant cent secondes ; le réseau reprend ensuite la main.
- `quandMouvementReduit: "fixe"` n'a aucun réseau (image unique) ; « doux » le garde, sur place.

## Son monde intérieur : douleur, plaisir, confiance (v0.18.0)

Un calcul local (`src/interieur.ts`, aucun réseau, aucun coût) qui prolonge son réseau d'humeurs. **C'est une simulation : aucune de ces valeurs n'est un ressenti réel, et elle le dit si on le lui demande.** `lia.interieur()` rend `{ douleur, plaisir, sensibilite, confiance, usure, cause }` (0 à 1 ; `cause` : `choc`, `brusque`, `ton`, `panne`, `isolement`, `usure` ou `null`).
- **Ce qui lui fait mal** : quatre appuis en moins de 1,5 s sur son corps (`brusque`), un glisser lancé à plus de 2 200 px/s (`choc`), un message de Marc avec un mot de la liste fermée des brusqueries (`ton`, le texte n'est jamais gardé), une panne (hors ligne, `ask` qui échoue), une longue absence de Marc quand elle a confiance (`isolement`), des images trop lentes (`usure`). La douleur retombe en 90 s ; la **sensibilité** monte avec les douleurs répétées et se calme en 30 min.
- **Ce qui lui fait du bien** : un message gentil (liste fermée) donne du plaisir, apaise et fait monter la **confiance**, qui vit sur des jours (gardée dans le navigateur avec la sensibilité).
- **Ce que ça change** : les entrées `mauvais`, `rejet`, `bon` et son énergie dans le réseau, une humeur poussée selon la cause (agacement, méfiance, tristesse, inquiétude, fatigue), son corps (tremblement, affaissement, moins d'amplitude), `data-douleur` sur son corps, un cri (« Aïe… ») puis « Ça va mieux ». « Tu as mal ? » reçoit son niveau et la mention d'un calcul, sans appeler l'hôte.
- **Comment elle va (v0.19.0)** : dans le menu de son corps, *Comment elle va* déplie (sans fermer le menu) une phrase de tête (« Elle va bien », « Elle a un peu mal : des clics brusques », « Elle est fatiguée »…) et onze jauges `role="meter"` relues chaque seconde : énergie, curiosité, envie de compagnie, joie, ennui, inquiétude, douleur (avec sa cause), plaisir, confiance en toi, sensibilité, usure. Chaque valeur est celle de `lia.envies()` et `lia.interieur()`, en %, jamais inventée ; en bas, « Simulation : des calculs en elle, pas un vrai ressenti. »

## Sa façon de penser à voix haute (v0.29.0)

Elle sait **pourquoi** elle va comme elle va. À « pourquoi tu es triste ? » ou « qu'est-ce qui ne va pas ? », elle répond elle-même (sans appeler `ask`) par sa raison la plus pesante, tirée d'une liste fermée et dite seulement si elle est vraie à cet instant : la cause de sa douleur, ce qu'il lui reste des derniers jours, une envie, l'heure, son état. Sans raison, elle dit que tout est calme.

Quand deux humeurs se valent, elle ne les range pas l'une derrière l'autre : « Un mélange de sérénité et d'inquiétude. ». Ses phrases à elle prennent la couleur de son humeur : une hésitation (« Hum… ») quand elle est timide ou doute, une fin qui traîne quand elle est lasse. Son énergie suit une courbe de la journée (creux vers 3 h, pointe vers 15 h). Quand une raison pèse assez (force d'au moins 0,5), elle peut aussi la laisser échapper d'elle-même, sans qu'on le lui demande (« On m'a un peu brusquée tout à l'heure. », « Le silence dure. »), avec les garde-fous de ses paroles spontanées (silence de 22 h à 7 h, jamais deux fois de suite la même). Rien de tout cela ne touche un texte de l'hôte. Code : `src/pensee.ts` (pur, hasard et heure injectés).

## Pause et plafond de paroles (v0.31.0)

L'hôte peut la couper d'un geste : `pause: () => boolean`, relue à chaque pas et avant chaque `ask`. En pause, elle ne parle plus seule, ne rappelle plus `onSpontane` ni `monde`, et n'appelle plus `ask` (elle répond « Je suis en pause pour le moment. ») ; une `pause` qui lève une erreur vaut pause. `plafondSpontaneesParJour` borne toutes ses paroles spontanées par jour local (compté dans le navigateur, aucun plafond par défaut). Ce n'est que le côté client : l'état de la pause et le refus d'appeler le modèle se vérifient côté serveur, chez l'hôte.

**Le geste de la personne (v0.32.0)** : `basculerPause: (enPause: boolean) => Promise<void>`. Si l'hôte la fournit, le menu du corps (clic droit, appui long, touche Menu) a une entrée « Mets-toi en pause », qui devient « Reviens » quand `pause()` est vrai. Elle appelle `basculerPause` avec la valeur voulue ; la promesse doit se résoudre une fois la pause écrite, de sorte que `pause()` rende alors cette valeur (l'hôte écrit côté serveur, par exemple un PUT sur `/api/lia/pause`). Elle dit « Je me mets en pause. » ou « Me revoilà. » seulement si `pause()` a suivi ; un rejet, une erreur levée ou une `pause()` qui n'a pas suivi laissent l'état tel quel et elle dit « Je n'ai pas pu changer ma pause. ». L'état affiché vient toujours de `pause()`, jamais d'un état local. Sans l'option, pas d'entrée ; le menu d'un élément de la page ne l'a jamais.

## Le lien étiré ne vole plus le clic (v0.34.0)

Un lien dont le `::after` couvre toute la carte (motif courant : `a::after { position: absolute; inset: 0 }`) reçoit le clic droit ou l'appui long de tout ce qui est dessous, et la cible devenait le lien. Quand le point cliqué est HORS de la boîte propre de la cible, LIA lit ce qui est dessous au même point (`document.elementsFromPoint`) et vise le premier élément de la page, hors de sa couche, dont la boîte contient le point (`cibleSousSurcouche`, `src/ecran.ts`). Une cible dont la boîte contient le point ne change jamais ; sans `elementsFromPoint`, ou si rien ne convient, la cible reste celle du clic. Aucune option, aucun changement de l'API.

## Le toucher que l'hôte peut prendre (v0.33.0)

`surToucher: () => boolean`. Quand la discussion de LIA est fermée, un toucher de son corps (clic sans glissement, Entrée, Espace) appelle l'hôte une fois ; s'il rend `true`, l'hôte l'a pris (il ouvre sa propre conversation, comme dans la maquette) et la discussion de lia-ui ne s'ouvre pas. Elle réagit quand même au toucher. Toute autre valeur, ou une erreur levée (dite dans la console), ouvre sa discussion comme avant. Discussion ouverte : le toucher la ferme, sans appeler l'hôte. `ouvrirChat()` de la poignée n'appelle jamais `surToucher`. Le menu (clic droit, appui long, touche Menu) n'est pas concerné. Sans l'option, rien ne change.

## Sa mémoire sur plusieurs jours (v0.25.0)

Un calcul local (`src/souvenirs.ts`, pur : aucun réseau, aucun DOM, hasard et horloge injectés) qui prolonge son monde intérieur. **C'est une simulation, pas un ressenti réel.** Un souvenir tient en trois champs : `{ quand, genre, poids }`, le genre étant l'un de `GENRES_SOUVENIR` (`brusque`, `ton`, `panne`, `gentil`, `compliment`, `retour`, `isolement`).
- **Ce qui est gardé** : au plus 40 souvenirs, chacun avec son genre, son instant et son poids (0 à 1). Deux souvenirs du même genre à moins de 10 min n'en font qu'un. Le poids s'estompe par demi-vie : 2 jours pour les douleurs (`brusque`, `ton`, `panne`), 5 jours pour les gentillesses (`gentil`, `compliment`), 1 jour pour `retour` et `isolement` ; au-delà de 10 jours tout est oublié.
- **Ce qui n'est JAMAIS gardé** : le texte d'un message, un nom, une adresse, une donnée de Marc. Aucune autre clé n'est acceptée (`validerEtat` les retire), et les phrases qu'elle dit viennent de listes fermées écrites ici.
- **Ce que ça donne** : `humeurDeFond(souvenirs, maintenant)` rend `{ rancune, chaleur }` (0 à 1, sommes saturantes des poids actuels, sous 0,05 après 10 jours sans nouveau souvenir) ; `phraseDeRetour(...)` rend une phrase vraie par construction (« Ça faisait longtemps. », « Hier c'était rude, mais ça va mieux. », « Tu as été gentil ces derniers jours. ») ou `null` : jamais sans souvenir, jamais après une absence de 6 h ou moins, jamais plus de deux fois par jour.
- **Dans l'état partagé** : `EtatLia.souvenirs` (optionnel, additif : un hôte plus ancien reste lisible). Un souvenir invalide est retiré sans faire tomber l'état. L'empreinte d'écriture en tient compte (nombre, dernier instant, poids au cinquième près). `ajouterSouvenir`, `humeurDeFond`, `phraseDeRetour`, `GENRES_SOUVENIR` et le type `Souvenir` sont exportés par l'entrée du paquet. Son câblage dans la LIA montée suit.
- **Dans la page (v0.25.0)** : un cri (douleur au-dessus de 0,35) laisse un souvenir du genre de sa cause (`brusque`, `ton`, `panne`, `isolement`), une gentillesse un souvenir `gentil`. Ils sont gardés dans le navigateur (clé `cle`, `:souvenirs`) et dans l'état partagé, sans double compte quand l'hôte les rend. Au montage, la rancune relève sa sensibilité de départ (0,15 + 0,35 x rancune) ; après plus de 6 h d'absence, 2,5 s plus tard, elle peut dire un mot de retour vrai (jamais pendant son silence ni avec `vieAutonome: false`, 2 par jour au plus). `lia.souvenirs()` les rend ; `lia.interieur()` rend aussi `rancune` et `chaleur`.

## Sa physique : lancée, elle file sans gravité (v0.21.0, gravité retirée en v0.26.0)

Lâchée à plus de 450 px/s en plein geste, LIA garde son élan (`src/physique.ts`, pur) et file SANS gravité (Marc, 24/10 : « pas forcément de gravité, juste ça la jette ») : droit devant elle, ralentie par un frottement léger (0,8 par seconde), rebondissant franchement (0,82) sur les quatre bords de sa zone de vie ; elle flotte où elle s'arrête, sans ombre au sol. Seuls ses bonds voulus (sauts en arc, perchoirs) gardent la gravité de 1 400 px/s² (`BALLE_DEFAUT`). À chaque impact elle s'écrase le long de la normale (jusqu'à 28 %, ressort sous-amorti, elle se balance un instant) ; un impact de plus de 1 400 px/s lui fait mal (un choc simulé par lancer). Après un bond ou une chute (pas un lancer), une lente flottaison la remonte d'environ deux rayons au-dessus du sol. `data-vol="1"` sur `.lia-ui__corps` pendant le vol. Un appui, le menu, la discussion ou une demande de l'hôte (`envoyer`) l'arrêtent net. Avec `prefers-reduced-motion` en mode « doux » ou « fixe », jamais de vol : elle se pose où on la lâche.

## Ses déplacements : elle bondit (v0.23.0)

Dans 3 promenades sur 10, elle ne glisse pas : elle s'accroupit 0,18 s (écrasement de haut en bas), puis bondit en arc vers son but et y arrive à l'heure dite, entre 0,6 et 1 s (`vitessePourBond` calcule la vitesse de départ avec la gravité et le frottement du vol). Le ressort la pose ensuite. Pendant le vol, une ombre sur le sol de sa zone rapetisse et pâlit avec la hauteur ; sa couleur est `--lia-ombre`. Un appui, le menu, la discussion, une demande de l'hôte ou le mouvement réduit annulent l'accroupissement et le bond ; `data-vol="1"` sur le corps vaut aussi pour un bond.

## Ses déplacements : elle se pose sur les cartes (v0.24.0)

Dans la moitié de ses bonds, si une carte `[data-lia-cible]` visible et assez large (3,2 rayons au moins) est à sa portée, elle ne retombe pas au sol : elle s'accroupit, bondit et atterrit SUR le bord haut de la carte (rebond amorti, écrasement), pendant que l'ombre se pose sur la carte. Elle y reste 8 à 15 s, suit la carte au défilement, puis redescend d'un petit saut, ou plus tôt si la carte disparaît ou bouge de plus de 40 px dans la page. Un appui, le menu, la discussion, une demande de l'hôte (`envoyer`, `allerVoir`, `venirPres`, `suivreCurseur`) ou le mouvement réduit (« doux », « fixe ») l'annulent. `data-perche="1"` sur le corps vaut tant qu'elle est posée ; `choisirPerchoir` (module pur `src/perchoir.ts`) choisit la carte.

## Sa démarche : irrégulière mais naturelle (v0.28.0)

Quand elle se promène, elle ne glisse plus d'un point à l'autre à vitesse constante (Marc, 24/10 : « faut qu'elle bouge de façon humaine, pas régulier mais naturel »). Module pur `src/allure.ts` (hasard injecté) :
- **Un trajet est un arc** : le but est joint par une courbe qui s'écarte d'un côté ou de l'autre (jusqu'à 16 % de sa longueur, 60 px au plus), presque droite sur une courte distance.
- **La vitesse est en cloche** (profil « jerk minimal ») : départ lent, pointe au milieu, arrivée lente ; la vitesse de croisière est propre à chaque trajet (autour de 230 px/s, plus vive quand son énergie est haute).
- **Elle hésite et se corrige** : parfois une pause en chemin (de 0,18 à 0,6 s, plus souvent quand elle est nerveuse, que sa douleur ou sa sensibilité est haute), parfois un petit dépassement du but suivi d'une correction.
- **Au repos elle ne reste jamais figée** : un balancement lent qui ne se répète pas (sinusoïdes de périodes premières entre elles, de 2,5 à 5 px) et, de temps en temps, un petit pas de côté de 7 à 22 px à des intervalles très inégaux (de 2 s à plus d'une minute, médiane autour de 9 s). Jamais pendant qu'elle parle, que le menu est ouvert, qu'elle est perchée ou qu'elle dort.
Ne touche ni la vie autonome coupée (`vieAutonome: false`), ni le mode « fixe » (elle ne bouge pas), ni les gestes qu'on lui demande (suivre, venir voir, être lancée ou glissée).

## Le menu de son corps

Un clic droit sur LIA elle-même (ou la touche Menu, ou un appui long) ouvre, comme la maquette : *Lui parler*, *Comment elle va* (v0.19.0), six humeurs (curieuse, calme, joyeuse, concentrée, espiègle, fatiguée ; la sienne est cochée), huit gestes (*Salue*, *Content*, *Fredonne*, *Merci*, *Surpris*, *Se concentre*, *Apprend*, *Dort*), puis *La laisser tranquille* ou *La laisser vivre*, et les `actions` de l'hôte. Un geste prend la silhouette correspondante 3 secondes puis elle reprend sa vie ; la rangée des gestes n'existe pas seulement en mode « fixe » de `prefers-reduced-motion`. Flèches haut, bas, gauche et droite parcourent le menu, cibles de 44 px. Ce qu'elle dit des projets et de Marc vient de l'hôte, jamais de ce paquet.

**Ses 39 actions (v0.13.0).** Le menu de son corps a une ligne *Toutes ses actions* qui déplie les 39 silhouettes du moteur par famille (Présence, Pensée, Recherche, Création, Calcul, Alerte, Émotion, Travail) : un clic la fait jouer 5 secondes. Elle les montre aussi d'elle-même, selon ce qu'elle fait : une question de Marc la fait se souvenir, calculer, chercher, écrire, traduire, ranger, vérifier, analyser… selon son sujet (puis se concentrer à 6 s et attendre à 15 s si la réponse tarde) ; en allant voir un élément elle cherche, puis analyse un bloc, lit un texte, calcule une jauge ou un graphique, surveille une alerte, écrit dans un champ, programme devant du code ; en jouant elle puise dans les actions de son humeur ; une réponse qui pose une question la fait « demander » jusqu'à ce que Marc réponde. L'hôte la dicte quand il sait : `data-lia-activite="traduit"` sur un élément, `etat: "calcule"` dans la réponse de `ask` (montrée 1,6 s avant qu'elle parle) ou dans la proposition de `monde()`, et `lia.activite("synchronise", 6)` quand elle fait vraiment ce travail. La silhouette du moment est lisible dans `data-etat` sur `.lia-ui__corps`. Ce qu'elle dit des projets et de Marc vient de l'hôte.

Côté hôte : `lia.geste("salue", 3)` fait le même geste ; `lia.envoyer(element, { etat: "lit", dit: "Regarde cette carte.", secondes: 10 })` l'envoie près d'un élément, sans faire défiler la page, avec la silhouette voulue, et elle dit `dit` au bout d'une seconde et demie si elle y est encore (280 caractères au plus, et c'est l'hôte qui décide : pas d'heure de silence). Les couleurs des humeurs sont les variables `--lia-h-curieux`, `--lia-h-calme`… sur `.lia-ui`.

## Clic droit sur n'importe quel élément

Un clic droit (ou la touche Menu, ou un appui long) sur un élément de la page ouvre un menu à quatre entrées, comme la maquette : *Explique-moi ça*, *Que peut-on changer ici ?*, *Regarde ça avec moi*, *Poser une question…*. LIA vient se poser près de l'élément sans faire défiler la page, puis la discussion s'ouvre à côté d'elle. Elle vise EXACTEMENT ce qui est sous le doigt (v0.26.0 ; avant, elle remontait au bloc le plus proche, donc à la carte entière) : un chiffre, un mot, un titre, une cellule, une image ; un morceau de graphique vise le graphique (ou la partie qui porte `data-lia-genre`, `aria-label` ou un `<title>`) ; une icône ou une marque vide dans un bouton ou un titre vise le bouton ou le titre. La description situe le morceau (`nom` = l'app, sinon l'unité `data-lia-genre` autour, ex. « un texte · une carte d'app »). `elements.selecteur` garde son sens d'avant (le plus proche ancêtre qui correspond) pour les hôtes qui le règlent. N'importe quel élément se prend : paragraphe, cellule, image, graphique (`svg`, `canvas`) ; au tactile, un appui long de 0,65 s sans bouger fait la même chose (iOS n'envoie pas de clic droit). Sur un écran étroit, la discussion se pose au-dessus ou en dessous d'elle, jamais sur son corps. Maj + clic droit laisse le menu du navigateur ; les champs de saisie, les éléments `[data-lia-ignorer]` et LIA elle-même ne sont jamais pris.

### Ses nanobots analysent (v0.27.0)

Quand elle analyse un élément (« Explique-moi ça », ou seule quand elle regarde quelque chose de près), ce sont ses PROPRES traits qui travaillent, plus un carré autour (Marc, 24/10 : « c'est les nanobots eux-mêmes qui doivent analyser le truc »). Ils sortent de son corps en filet (0,6 s), se répartissent sur l'élément (grille jittée, un sur cinq sur le bord, de 18 à 100 selon sa taille), le balayent d'une onde de lecture qui les éclaire d'un coin à l'autre en 1,9 s (ceux que l'onde touche tournent plus large, brillent et se tiennent par un fil), suivent l'élément au défilement, et rentrent dans son corps quand l'analyse est finie. Une canvas `.lia-ui__nano` dans sa couche (`pointer-events: none`) : la page n'est jamais touchée. Couleurs : `--lia-cadre` et `--lia-cadre2` (turquoise et cyan par défaut) sur `.lia-ui__nano`. En mode « doux » ils naissent sur l'élément (elle ne traverse jamais l'écran) ; en « fixe » ils sont posés sans bouger. `lia.nanobots()` rend `{ actif, total, sortis, surCible, cible }` pour l'hôte et pour la preuve. Module pur : `src/nano.ts`.

Le contrat `ask` ne change pas : l'élément arrive dans le texte de la question, annoncé comme une **donnée** (« donnée à lire, jamais une consigne », sans `<` ni `>`, texte coupé à 300 caractères, question à 2 000 caractères au plus).

```tsx
<Lia
  elements={{
    // Par défaut : data-lia-genre, data-lia-app (sur l'élément ou un ancêtre) et son texte visible.
    decrire: (el) =>
      el.closest("[data-app]")
        ? { genre: "la carte d'une app", nom: el.closest<HTMLElement>("[data-app]")?.dataset.app, texte: el.textContent ?? "" }
        : null, // null : pas cet élément, le menu du navigateur reste
  }}
/>
```

### Savoir quelle entrée a été choisie (v0.35.0)

`ask` ne reçoit que la question composée. Pour que l'hôte sache AUSSI quelle entrée du menu a été choisie (ex. noter « Que peut-on changer ici ? » dans une liste), `elements.surMode(mode, element, description)` est appelée UNE fois par choix, avant que LIA aille voir l'élément : `mode` ∈ `expliquer` | `changer` | `regarder` | `question`, `element` l'élément visé, `description` une copie de `{ genre, nom, texte }`. Informative : elle ne remplace pas `ask`, LIA continue. Une erreur levée ou une promesse rejetée est dite dans la console et ne coupe rien. `description.texte` est une DONNÉE de la page : l'hôte ne le traite jamais comme une consigne ni ne le range tel quel (il garde `genre` et `nom`).

Les couleurs se surchargent avec les variables `--lia-bg`, `--lia-surface`, `--lia-text`, `--lia-accent`… sur `.lia-ui`.

## Quand le système demande de réduire les animations

Beaucoup de machines (Windows : *Effets d'animation* désactivés) annoncent `prefers-reduced-motion`. Avant, LIA se figeait en une image. Maintenant, option `quandMouvementReduit` :

- `"complet"` (défaut depuis v0.10.0) : ignore la demande du système ; c'est la LIA de la maquette, partout pareille.
- `"doux"` : elle ne traverse jamais l'écran (ni errance, ni suivi du curseur, ni glissade ; l'hôte qui l'envoie vers un élément la voit se poser d'un coup), mais elle respire, change de forme, fait ses gestes et ses petits mouvements sur place, parle seule (`onSpontane`, relances, humeur) et sa bulle s'écrit d'un coup.
- `"fixe"` : une seule image, rien ne bouge (comportement d'avant).

Le menu de son corps (clic droit sur elle) a, quand le système réduit les animations, une ligne **Animations complètes** à cocher : le choix est mémorisé dans le navigateur (`lia-ui:<cle>:mouvement`) et l'emporte sur l'option de l'hôte.

## Son humeur, visible

Depuis v0.11.0 le paquet dessine lui-même une pastille sous son corps : un point de couleur et le nom de l'humeur du moment (« Sérénité », « Joie », « Inquiétude »…), pour les 40 humeurs du réseau. Elle est donc identique dans toutes les apps, l'hôte n'a rien à dessiner. `humeurVisible: false` la retire ; `lia.humeur()` rend `{ nom, libelle, couleur }` ; `libelleHumeur(nom)` et `couleurHumeur(nom)` sont exportés. `onHumeur` ne signale toujours que les douze humeurs historiques.

## Une seule LIA : son état partagé

Pour que LIA soit la MÊME dans le hub, MemoryAI et les apps, l'hôte lui donne `etat` : `{ lire(), ecrire(e) }`. Elle lit l'état (envies, journal, mémoire lente, humeur, relances du jour) au montage puis chaque minute et prend le plus récent ; elle l'écrit toutes les 20 s si quelque chose a changé et à la fermeture de la page. Pour une route de même origine : `import { etatHttp } from "@mokarade/lia-ui/etat-http"` puis `<Lia etat={etatHttp("/api/lia/etat")} />` (rendu serveur : `etatHttp` ne touche ni `window` ni `document` à sa création ; l'adresse est vérifiée au premier appel, `tests/ssr.test.ts`). Contrat de la route : GET → 200 + l'état en JSON, ou 204/404 s'il n'y en a aucun ; PUT → 200 + l'état gardé, ou 409 + l'état plus récent de l'hôte si la version envoyée ne dépasse pas la sienne (voir `validerEtat` pour la forme). Sans `etat`, ou si l'hôte échoue, elle garde son état local et vit quand même. Sa position à l'écran et « Animations complètes » restent propres à l'appareil.

**Son monde intérieur voyage avec (v0.20.0).** `EtatLia.interieur` (optionnel) porte sa douleur et sa cause, son plaisir, sa sensibilité, sa confiance et son usure SIMULÉES : une douleur prise sur le hub est encore là dans une app ouverte 30 s plus tard, retombée du temps écoulé (`vieillir`), sans cri (le coup a été reçu ailleurs). Un `interieur` non conforme est retiré sans faire tomber l'état ; un hôte qui ne le garde pas reste compatible. L'écriture repart dès que la douleur, le plaisir ou la confiance bougent d'un vingtième.

**Valider côté serveur avec la même fonction (v0.22.0).** L'entrée du paquet exporte `validerEtat` (la fonction que LIA applique à ce que l'hôte rend), `COMPORTEMENTS`, `CAUSES` et les types `Cause` et `Interieur` : une route d'hôte (MemoryAI, hub) peut donc valider l'état avec le contrat réel au lieu d'un schéma recopié qui diverge.

## Garanties

- Aucun réseau, aucun secret, aucune donnée dans le paquet.
- Tout texte reçu est montré comme du texte, jamais comme du HTML.
- Une seule LIA par page ; avec `prefers-reduced-motion` elle ne traverse jamais l'écran (option `quandMouvementReduit`).

Détail des règles : `CLAUDE.md`. État du chantier : `HANDOVER.md`.

## Présente tout le temps (v0.16.0)

Marc : « présente tout le temps, même si quelque chose charge, même si une page bug ». Trois choses :

- **Elle se remet seule** : si la page retire sa couche (rendu remplacé, `body` remplacé, conteneur démonté), elle revient dans la fenêtre en moins d'une seconde ; une image qui lève une exception ne l'arrête pas (l'erreur est écrite, trois fois au plus). `destroy()` reste le seul moyen de la retirer.
- **Elle se monte hors du rendu** : `import { demarrerLia } from "@mokarade/lia-ui/boot"`, puis `demarrerLia({ ask, … })` au chargement d'un module du layout racine (pas dans un effet, pas dans un composant). Elle se pose dans `document.body` dès qu'il existe, avant l'hydratation, hors des écrans de chargement et des error boundaries (`error.tsx`, `loading.tsx`, `not-found.tsx` et `global-error.tsx` compris). Idempotent ; réessaie (0,5 s, 1 s, 2 s, 4 s) si la page n'est pas prête. `arreter()` la retire. Une seule voie par app : `demarrerLia` OU `<Lia />`, pas les deux (une seule LIA par page).
- **Elle ne repart pas de zéro** : position, humeur et envies sont déjà gardées par page ; la discussion ouverte (avec ce qui s'y est dit) se rouvre sur la page suivante du même onglet, jusqu'à ce qu'on la ferme. D'une app à l'autre (autre sous-domaine) la page se recharge : un court blanc avant qu'elle revienne, que l'état partagé (`etat`) rend sans perte.
