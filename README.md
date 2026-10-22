# lia-ui

LIA vivante pour le hub et les apps : un corps de 100 traits, une vie propre, une discussion au clic, un menu d'actions au clic droit. Le cerveau est ailleurs (MemoryAI) : ce paquet ne fait que dessiner et relayer.

## Installer

Par tag épinglé, comme `hub-contract` (jamais une branche) :

```
npm i github:MoKarade/lia-ui#v0.1.0
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
| `onChip`, `onHumeur`, `renderBlocks` | Réponses rapides, voyant d'humeur, blocs composés (validés par l'hôte). |
| `rayon`, `cle`, `vieAutonome`, `salut` | Taille, clé de mémorisation locale, vie autonome, message d'arrivée. |

Les couleurs se surchargent avec les variables `--lia-bg`, `--lia-surface`, `--lia-text`, `--lia-accent`… sur `.lia-ui`.

## Garanties

- Aucun réseau, aucun secret, aucune donnée dans le paquet.
- Tout texte reçu est montré comme du texte, jamais comme du HTML.
- Une seule LIA par page ; mouvement coupé avec `prefers-reduced-motion`.

Détail des règles : `CLAUDE.md`. État du chantier : `HANDOVER.md`.
