import {
  mountLia
} from "./chunk-X6O5HJ76.mjs";

// src/boot.ts
var ESSAIS_MAX = 5;
var courant = null;
function demarrerLia(options = {}) {
  if (courant) return courant;
  if (typeof document === "undefined") return { poignee: () => null, arreter: () => void 0 };
  let lia = null;
  let essais = 0;
  let minuterie;
  let arrete = false;
  const monter = () => {
    if (arrete || lia) return;
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", monter, { once: true });
      return;
    }
    try {
      lia = mountLia(options);
    } catch (e) {
      essais++;
      if (essais >= ESSAIS_MAX) {
        console.error("[lia-ui] elle n'a pas pu se monter", e);
        return;
      }
      minuterie = setTimeout(monter, 500 * 2 ** (essais - 1));
    }
  };
  monter();
  courant = {
    poignee: () => lia,
    arreter() {
      arrete = true;
      clearTimeout(minuterie);
      document.removeEventListener("DOMContentLoaded", monter);
      lia?.destroy();
      lia = null;
      courant = null;
    }
  };
  return courant;
}
export {
  demarrerLia
};
//# sourceMappingURL=boot.mjs.map