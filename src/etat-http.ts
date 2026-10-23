/**
 * Le seul module du paquet qui appelle le réseau : un `fetch` vers la MÊME origine que la page (GET pour lire, PUT pour écrire),
 * jamais de jeton ni de cookie ajouté à la main (le navigateur joint la session de l'hôte). Contrat de la route de l'hôte :
 *  - GET  → 200 + l'état en JSON, ou 204 / 404 s'il n'y en a aucun ;
 *  - PUT  → 200 + l'état gardé ; 409 + l'état gardé (plus récent) si la version envoyée ne dépasse pas la sienne.
 */
import type { EtatHote, EtatLia } from "./etat.js";

export interface OptionsEtatHttp {
  /** Pour les tests ; défaut : `fetch` du navigateur. */
  fetch?: typeof fetch;
}

export function etatHttp(url: string, options: OptionsEtatHttp = {}): EtatHote {
  const cible = new URL(url, window.location.href);
  if (cible.origin !== window.location.origin) {
    throw new Error("etatHttp : l'adresse doit être de la même origine que la page (LIA n'envoie son état à aucun autre site)");
  }
  const appeler = options.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    async lire() {
      const r = await appeler(cible.href, { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
      if (r.status === 204 || r.status === 404) return null;
      if (!r.ok) throw new Error(`état de LIA : lecture refusée (HTTP ${r.status})`);
      return (await r.json()) as unknown;
    },
    async ecrire(etat: EtatLia) {
      const r = await appeler(cible.href, {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(etat),
      });
      if (r.status === 409) return (await r.json()) as unknown;
      if (!r.ok) throw new Error(`état de LIA : écriture refusée (HTTP ${r.status})`);
      return r.status === 204 ? null : ((await r.json()) as unknown);
    },
  };
}
