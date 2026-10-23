import { E as EtatHote } from './etat-e-fS3ns2.mjs';

/**
 * Le seul module du paquet qui appelle le réseau : un `fetch` vers la MÊME origine que la page (GET pour lire, PUT pour écrire),
 * jamais de jeton ni de cookie ajouté à la main (le navigateur joint la session de l'hôte). Contrat de la route de l'hôte :
 *  - GET  → 200 + l'état en JSON, ou 204 / 404 s'il n'y en a aucun ;
 *  - PUT  → 200 + l'état gardé ; 409 + l'état gardé (plus récent) si la version envoyée ne dépasse pas la sienne.
 */

interface OptionsEtatHttp {
    /** Pour les tests ; défaut : `fetch` du navigateur. */
    fetch?: typeof fetch;
}
declare function etatHttp(url: string, options?: OptionsEtatHttp): EtatHote;

export { type OptionsEtatHttp, etatHttp };
