# HANDOVER — lia-ui

*État au 22/10/2026, tâche lia-ui#5 (elle te suit).*

## Fait
- Moteur de 100 traits repris de la maquette v5 validée par Marc (38 silhouettes, 12 humeurs).
- API : `mountLia(options)` et `<Lia />` (`/react`) ; discussion, menu, bulle, vie autonome, mémoire locale de la position, mouvement réduit.
- 32 tests (jsdom) + essai réel dans Chromium (clic, discussion, menu, mobile).

- **v0.2.0 (lia-ui#5)** : suit le curseur, va voir un élément `[data-lia-cible]` et s'y colle (0 px d'écart au défilement, mesuré dans Chromium), vient près de Marc (`venirPres`), sans jamais faire défiler la page ; 62 tests. Cause de la plainte de Marc (22/10 22:08Z) : v0.1.0 n'avait que l'errance au hasard et les yeux au curseur ; les envies, la mémoire et les remarques spontanées de l'accueil v2 sont la tâche lia-ui#6.
- **v0.2.1 (lia-ui#6)** : sa tirette de décisions et sa parole sont celles de la maquette v5 (`maison.js`, `penser`) : 28 % rester, 18 % errer, 22 % parler, 18 % visiter un élément (phrase `data-lia-dit`), 7 % humeur, 7 % relance ; dérive d'humeur toutes les 40 s ; `onSpontane` (texte de l'hôte), silence 22 h-7 h, 2 relances par jour. Marc, 22/10 22:35Z : « exactement pareil que la maquette ». Reste : envies et mémoire de l'accueil v2, voir lia-ui#6.
- Corrigé en passant : un pas de temps négatif (horloge rAF en avance sur `performance.now()`) pouvait faire diverger le ressort.

## À faire
1. **Le fil PC pose le tag `v0.2.0`** après merge de lia-ui#5 (une session cloud ne peut pas pousser de tag ; le v0.1.0 a été posé ainsi, pas par Marc), puis le hub et les apps bumpent leur épingle.
2. **« autorisé » de Marc** avant de passer le dépôt en public (sinon les apps publiques ne peuvent pas l'installer).
3. **Socle CI posé** (tâche lia-ui#2) : `ci.yml` (Gate, Sécurité, sécurité commune), `garde-fou.yml`, `reacteur.yml`, `graphe.yml`, `.mergify.yml`, `dependabot.yml` (actions seulement : `dist/` est commité). **Manque, dit et non simulé** : le job « Qualité » (lint, couverture, code mort, architecture) n'existe pas, le dépôt n'a ni ESLint ni seuil de couverture ; Mergify n'exige donc que Garde-fou, Gate et Sécurité. **Gestes de Marc** : secret `REVEIL_TOKEN` du dépôt, dépôt ajouté au jeton `RELECTURE_PAT`, protection de `main` (contrôles exigés Garde-fou, Gate, Sécurité).
4. Blocs de réponse composés (22 formes) : dessinés par `@mokarade/lia-ui/blocs` (v0.3.0, lia-ui#8) ; l'hôte branche `renderBlocks: (b, dans) => rendreBlocs(b, dans, { lienSource, onConfirmer })`. Catalogue : MemoryAI `lib/lia/blocs.ts`.
5. Intégration : accueil du hub (colonne gauche, fil Refonte) puis chaque app ; l'hôte fournit `ask` (vers MemoryAI) et `actions`.

## Limites connues
- `moteur.js` n'est pas typé (voir `CLAUDE.md`).
- Une seule LIA par page.
- Pas de réponses en blocs tant que l'hôte ne branche pas `renderBlocks` (`rendreBlocs`).
