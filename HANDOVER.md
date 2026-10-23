# HANDOVER — lia-ui

*État au 23/10/2026, tâche lia-ui#15 (mouvement réduit doux).*

## Fait
- Moteur de 100 traits repris de la maquette v5 validée par Marc (38 silhouettes, 12 humeurs).
- API : `mountLia(options)` et `<Lia />` (`/react`) ; discussion, menu, bulle, vie autonome, mémoire locale de la position, mouvement réduit.
- 32 tests (jsdom) + essai réel dans Chromium (clic, discussion, menu, mobile).

- **v0.2.0 (lia-ui#5)** : suit le curseur, va voir un élément `[data-lia-cible]` et s'y colle (0 px d'écart au défilement, mesuré dans Chromium), vient près de Marc (`venirPres`), sans jamais faire défiler la page ; 62 tests. Cause de la plainte de Marc (22/10 22:08Z) : v0.1.0 n'avait que l'errance au hasard et les yeux au curseur ; les envies, la mémoire et les remarques spontanées de l'accueil v2 sont la tâche lia-ui#6.
- **v0.2.1 (lia-ui#6)** : sa tirette de décisions et sa parole sont celles de la maquette v5 (`maison.js`, `penser`) : 28 % rester, 18 % errer, 22 % parler, 18 % visiter un élément (phrase `data-lia-dit`), 7 % humeur, 7 % relance ; dérive d'humeur toutes les 40 s ; `onSpontane` (texte de l'hôte), silence 22 h-7 h, 2 relances par jour. Marc, 22/10 22:35Z : « exactement pareil que la maquette ». Reste : envies et mémoire de l'accueil v2, voir lia-ui#6.
- **v0.4.0 (lia-ui#11)** : clic droit sur n'importe quel élément (option `elements`, quatre entrées de la maquette V9, LIA vient se poser près de l'élément et le cadre, la question part par `ask` avec l'élément comme donnée annoncée). Marc, 23/10 12:15Z : « manque le clique droit ». Corrigé en passant : `<Lia />` (React) ne transmettait ni `onSpontane`, ni `cibles`, ni `silence`, ni `relancesParJour` à `mountLia` (v0.2.0 à v0.3.0) : une app qui les passait en React n'avait aucun effet ; tests ajoutés. Écart complet avec la maquette V9 : mission .github#557 ; reste à faire dans lia-ui : envies et mémoire (lia-ui#6), réseau V9 (225 neurones, 40 humeurs mélangées, crochet `HUM_MIX` dans le moteur), comportements riches et interface `monde` (avec la vue de l'écran : survol et centre, que le clic droit de cette version ne fournit pas).
- **v0.5.0 (lia-ui#13)** : le menu de son corps est celui de la maquette v5 (titre, six humeurs avec la sienne cochée, huit gestes, « La laisser tranquille / La laisser vivre »), `lia.geste(nom, secondes)` et `lia.envoyer(element, { etat, dit, secondes })` pour l'hôte (futur « monde »). Marc, 23/10 12:15Z : « manque le clique droit, sa personnalité, mouvements ». Le défilement ne ferme plus que le menu d'un élément de la page, pas celui de son corps. Aucune phrase écrite dans ce paquet. Reste : lia-ui#6 (envies, mémoire), réseau V9, comportements riches et interface `monde`.
- **v0.5.1 (lia-ui#15)** : `prefers-reduced-motion` ne fige plus LIA. Le PC de Marc a mesuré que son Chrome l'annonce : lia-ui coupait sa vie, ses gestes et ses déplacements, d'où « elle vit pas seule » (relevé du Coordinateur, 23/10 13:18Z). Nouvelle option `quandMouvementReduit` : « doux » (défaut, elle vit sur place : respire, gestes, humeur, parole seule, jamais de déplacement ni de suivi du curseur), « fixe » (image unique, comme avant), « complet » (ignore la demande du système). Marc peut aussi activer les effets d'animation de Windows.
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
