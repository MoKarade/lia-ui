// src/etat-http.ts
function etatHttp(url, options = {}) {
  const cible = new URL(url, window.location.href);
  if (cible.origin !== window.location.origin) {
    throw new Error("etatHttp : l'adresse doit \xEAtre de la m\xEAme origine que la page (LIA n'envoie son \xE9tat \xE0 aucun autre site)");
  }
  const appeler = options.fetch ?? ((...a) => fetch(...a));
  return {
    async lire() {
      const r = await appeler(cible.href, { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
      if (r.status === 204 || r.status === 404) return null;
      if (!r.ok) throw new Error(`\xE9tat de LIA : lecture refus\xE9e (HTTP ${r.status})`);
      return await r.json();
    },
    async ecrire(etat) {
      const r = await appeler(cible.href, {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(etat)
      });
      if (r.status === 409) return await r.json();
      if (!r.ok) throw new Error(`\xE9tat de LIA : \xE9criture refus\xE9e (HTTP ${r.status})`);
      return r.status === 204 ? null : await r.json();
    }
  };
}
export {
  etatHttp
};
//# sourceMappingURL=etat-http.mjs.map