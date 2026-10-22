# HANDOVER — lia-ui

*État au 22/10/2026, fin de la première PR.*

## Fait
- Moteur de 100 traits repris de la maquette v5 validée par Marc (38 silhouettes, 12 humeurs).
- API : `mountLia(options)` et `<Lia />` (`/react`) ; discussion, menu, bulle, vie autonome, mémoire locale de la position, mouvement réduit.
- 32 tests (jsdom) + essai réel dans Chromium (clic, discussion, menu, mobile).

## À faire
1. **Marc pose le tag `v0.1.0`** après merge (une session ne peut pas pousser de tag).
2. **« autorisé » de Marc** avant de passer le dépôt en public (sinon les apps publiques ne peuvent pas l'installer).
3. **Socle CI posé et fusionné le 22/10/2026** (lia-ui#3, tâche lia-ui#2) : `ci.yml` (Gate, Sécurité, sécurité commune), `garde-fou.yml`, `reacteur.yml`, `graphe.yml`, `.mergify.yml`, `dependabot.yml` (actions seulement : `dist/` est commité). **Manque, dit et non simulé** : le job « Qualité » (lint, couverture, code mort, architecture) n'existe pas, le dépôt n'a ni ESLint ni seuil de couverture ; Mergify n'exige donc que Garde-fou, Gate et Sécurité. `scripts/graphe.sh` manquait au premier passage (le workflow `Graphe` était rouge sur `main`), il est ajouté avec `graphify-out/` dans `.gitignore`. **Protection de `main` posée** par le fil PC le 22/10/2026 (ruleset 25676963, Garde-fou, Gate et Sécurité exigés). **Gestes restants** : secret `REVEIL_TOKEN` du dépôt (sa valeur n'est pas sur le PC, geste de Marc) ; **Marc, dans l'interface web** : dépôt ajouté au jeton à portée fine `RELECTURE_PAT`.
4. Blocs de réponse composés (22 formes) : le rendu vient de MemoryAI via `renderBlocks` ; rien à faire ici tant que l'API MemoryAI n'est pas là.
5. Intégration : accueil du hub (colonne gauche, fil Refonte) puis chaque app ; l'hôte fournit `ask` (vers MemoryAI) et `actions`.

## Limites connues
- `moteur.js` n'est pas typé (voir `CLAUDE.md`).
- Une seule LIA par page.
- Pas de réponses en blocs tant que `renderBlocks` n'est pas fourni.
