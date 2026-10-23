"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/etat-http.ts
var etat_http_exports = {};
__export(etat_http_exports, {
  etatHttp: () => etatHttp
});
module.exports = __toCommonJS(etat_http_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  etatHttp
});
//# sourceMappingURL=etat-http.js.map