# lia-ui

LIA vivante pour le hub et les apps : un corps de 100 traits, une vie propre, une discussion au clic, un menu d'actions au clic droit. Le cerveau est ailleurs (MemoryAI) : ce paquet ne fait que dessiner et relayer.

## Installer

Par tag épinglé, comme `hub-contract` (jamais une branche) :

```
npm i github:MoKarade/lia-ui#v0.2.1
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
| `ask(question, signal)` | Répond à une question. Absent ou en échec : LIA dit qu'elle est indisponible. |
| `actions` | Entrées du menu (clic droit, appui long, touche Menu). L'hôte vérifie les droits : LIA n'exécute rien d'elle-même. |
| `container` | Élément où elle vit (colonne du hub). Sans lui : la fenêtre. |
| `bounds()` | Zone où elle a le droit de se déplacer. |
| `onChip`, `onHumeur`, `renderBlocks` | Réponses rapides, voyant d'humeur, blocs composés (validés par l'hôte ; rendu prêt : `rendreBlocs` de `@mokarade/lia-ui/blocs`). |
| `cibles` | Sélecteur des éléments qu'elle peut aller voir (défaut `[data-lia-cible]`). Elle s'en approche, reste collée dessus quand la page défile, et ne fait **jamais** défiler la page. |
| `onSpontane(motif)` | Ce qu'elle dit quand elle a envie de parler seule (`rien`, `salut`, `relance`). Renvoie le texte (ou `{ text, chips }`), ou `null` si l'hôte n'a rien de vrai à dire : elle se tait. Absent : jamais de parole spontanée. |
| `silence`, `relancesParJour` | Heures sans parole spontanée (défaut `[22, 7]`) et plafond de relances par jour (défaut 2, mémorisé dans le navigateur). |
| `rayon`, `cle`, `vieAutonome`, `salut` | Taille, clé de mémorisation locale, vie autonome, message d'arrivée. |

## Elle te suit, elle vit seule

Sans rien lui demander, LIA décide d'elle-même de rester là, d'errer, de suivre le curseur un moment (souris ou stylet, jamais au doigt) ou d'aller voir un des éléments `[data-lia-cible]` visibles, puis s'y colle exactement (écart de 0 px mesuré pendant le défilement). L'hôte peut aussi la guider : `lia.suivreCurseur(secondes)`, `lia.allerVoir(element, secondes)`, `lia.venirPres()` (près du curseur ou sur le bord, avant de la faire parler) et `lia.rester()`. Tout est coupé par « Couper sa vie autonome » et par `prefers-reduced-motion`. Sa tirette est celle de la maquette validée, toutes les 1,2 s : 28 % elle reste, 18 % elle erre, 22 % elle veut parler, 18 % elle va voir un élément (et dit son `data-lia-dit` au bout d'une seconde et demie), 7 % son humeur change, 7 % relance (2 par jour au plus) ; l'humeur dérive aussi d'elle-même toutes les 40 s. Elle ne parle seule que par `onSpontane` : le texte vient toujours de l'hôte, jamais de ce paquet, et jamais entre 22 h et 7 h.

Les couleurs se surchargent avec les variables `--lia-bg`, `--lia-surface`, `--lia-text`, `--lia-accent`… sur `.lia-ui`.

## Garanties

- Aucun réseau, aucun secret, aucune donnée dans le paquet.
- Tout texte reçu est montré comme du texte, jamais comme du HTML.
- Une seule LIA par page ; mouvement coupé avec `prefers-reduced-motion`.

Détail des règles : `CLAUDE.md`. État du chantier : `HANDOVER.md`.
