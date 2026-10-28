# CLAUDE.md — lia-ui

## Contexte
- **Composant partagé de LIA** (l'assistant de Marc) pour le hub et les 6 apps : corps de 100 traits en canvas 2D, vie propre, discussion au clic, menu au clic droit. Marc valide, il ne code pas.
- Paquet `@mokarade/lia-ui`, installé depuis GitHub **par tag épinglé** (comme `hub-contract`), jamais publié sur npm. **`dist/` est commité** : toute modif de `src/` se committe avec son `dist/` reconstruit.
- Stack : TypeScript strict · tsup · Vitest 5 + jsdom. Une seule dépendance de pair, optionnelle : `react` (sous-chemin `/react`).
- Qui fait quoi : le cerveau, la mémoire et les outils de LIA vivent dans **MemoryAI** ; ce dépôt ne contient que le corps et l'interface. Plan et décisions : ADR « maison de LIA » (Hubperso#297).
- État : `HANDOVER.md` (à lire en premier).

## Commandes
- `npm run typecheck` · `npm run test` · `npm run build` (tsup → `dist/`).
- Gate avant commit : `npm run typecheck && npm run test && npm run build`, puis `git status` : `dist/` doit être propre.

## Règles propres au dépôt
- **Aucun réseau, aucun secret, aucune donnée** dans le paquet principal : tout ce que LIA sait passe par `options.ask` et `options.etat` fournis par l'hôte. Pas de `fetch`, pas de jeton, pas de donnée perso (maquettes et tests : données FICTIVES). Seule exception : `src/etat-http.ts` (sous-chemin `/etat-http`), un `fetch` vers la MÊME origine, refusé pour tout autre site.
- **Sa parole propre (`src/paroles.ts`)** : seules phrases écrites ici, vraies par construction (humeur, envies, journal, heure) ou sans fait ; rien sur Marc, ses apps ni ses chiffres (verrou `tests/paroles.test.ts`). Tout le reste vient de l'hôte.
- **Échec fermé** : sans `ask`, ou si `ask` échoue, LIA dit qu'elle est indisponible. Jamais de réponse inventée.
- **Texte du modèle = DONNÉE** : tout texte reçu (réponse, bulle, puces) entre par `textContent`, jamais par `innerHTML`. Les blocs composés passent par `renderBlocks`, fourni et validé par l'hôte.
- **Une seule LIA par page** (l'état du moteur est global). `mountLia` refuse un second montage ; `destroy()` libère tout.
- **Elle ne bouge jamais l'écran de Marc** : couche `pointer-events: none` hors du corps, elle ne décide jamais de parler seule (seul l'hôte appelle `dire`), avec `prefers-reduced-motion` elle ne traverse jamais l'écran (`quandMouvementReduit`, défaut « doux » : elle vit sur place).
- **Moteur `src/moteur/moteur.js` = repris tel quel de la maquette validée (22/10/2026)**, volontairement non typé ; son contrat est `moteur.d.ts`. On ne le réécrit pas à l'œil : toute retouche de silhouette ou d'humeur passe par une maquette validée par Marc.
- **Accessibilité** : cibles ≥ 44 px, champ à 16 px, focus visible, clavier complet (Entrée, Échap, flèches, touche Menu), pas d'emoji.
- **Couleurs en variables `--lia-*`** (valeurs sombres par défaut du hub), jamais de police téléchargée : `font-family: inherit`.
- **Code** : TypeScript strict, pas de `any` silencieux, erreurs jamais avalées (un `catch` vide dit pourquoi), fonctions pures d'un côté (`autonomie.ts`), I/O de l'autre.

## Git et CI
- Branches `claude/<slug>`, commits en français préfixés (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`), PR en brouillon pour itérer, `--base main` explicite, jamais `--force` sur `main`, jamais `--no-verify`.
- **Le tag annoté `vX.Y.Z` se pose tout seul** : `.github/workflows/tag.yml` (script `scripts/poser-tag.mjs`) le crée à chaque push sur `main` où la version de `package.json` change, avec le jeton du job ; jamais de tag déplacé ni de force-push (une session ne peut pas pousser de tag elle-même, HTTP 403). Les apps épinglent ce tag ; jamais de branche.
- Breaking change de l'API (props, types) : bump majeur ET nouveau tag majeur, comme `hub-contract`.
- Dépôt **privé** tant que Marc n'a pas dit « autorisé » : les apps publiques ne peuvent l'installer qu'une fois le dépôt public.
