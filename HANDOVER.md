# HANDOVER — lia-ui

*État au 22/10/2026, fin de la première PR.*

## Fait
- Moteur de 100 traits repris de la maquette v5 validée par Marc (38 silhouettes, 12 humeurs).
- API : `mountLia(options)` et `<Lia />` (`/react`) ; discussion, menu, bulle, vie autonome, mémoire locale de la position, mouvement réduit.
- 32 tests (jsdom) + essai réel dans Chromium (clic, discussion, menu, mobile).

## À faire
1. **Marc pose le tag `v0.1.0`** après merge (une session ne peut pas pousser de tag).
2. **« autorisé » de Marc** avant de passer le dépôt en public (sinon les apps publiques ne peuvent pas l'installer).
3. **Socle CI posé** (tâche lia-ui#2) : `ci.yml` (Gate, Sécurité, sécurité commune), `garde-fou.yml`, `reacteur.yml`, `graphe.yml`, `.mergify.yml`, `dependabot.yml` (actions seulement : `dist/` est commité). **Manque, dit et non simulé** : le job « Qualité » (lint, couverture, code mort, architecture) n'existe pas, le dépôt n'a ni ESLint ni seuil de couverture ; Mergify n'exige donc que Garde-fou, Gate et Sécurité. **Gestes de Marc** : secret `REVEIL_TOKEN` du dépôt, dépôt ajouté au jeton `RELECTURE_PAT`, protection de `main` (contrôles exigés Garde-fou, Gate, Sécurité).
4. Blocs de réponse composés (22 formes) : le rendu vient de MemoryAI via `renderBlocks` ; rien à faire ici tant que l'API MemoryAI n'est pas là.
5. Intégration : accueil du hub (colonne gauche, fil Refonte) puis chaque app ; l'hôte fournit `ask` (vers MemoryAI) et `actions`.

## Limites connues
- `moteur.js` n'est pas typé (voir `CLAUDE.md`).
- Une seule LIA par page.
- Pas de réponses en blocs tant que `renderBlocks` n'est pas fourni.
