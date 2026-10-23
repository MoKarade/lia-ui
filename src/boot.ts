import { mountLia } from "./lia.js";
import type { LiaHandle, OptionsLia } from "./types.js";

/**
 * Monter LIA HORS du rendu de l'app (Marc, 23/10/2026 : « présente tout le temps, même si quelque chose charge, même si une
 * page bug »). À appeler une fois, au chargement d'un module du layout racine (jamais dans un effet ni un composant) : elle
 * se pose dans `document.body` dès qu'il existe, donc avant l'hydratation, hors des écrans de chargement et des error
 * boundaries. Si la page retire sa couche, `mountLia` la remet (veille de 0,5 s). Idempotent : un second appel (rechargement
 * à chaud, deux modules) rend le même démarrage.
 */
export interface DemarrageLia {
  /** La LIA montée, ou `null` tant qu'elle n'est pas encore là (page qui charge) ou si le montage a échoué cinq fois. */
  poignee(): LiaHandle | null;
  /** La retire pour de bon (le seul cas où elle quitte la page). */
  arreter(): void;
}

const ESSAIS_MAX = 5;
let courant: DemarrageLia | null = null;

export function demarrerLia(options: OptionsLia = {}): DemarrageLia {
  if (courant) return courant;
  if (typeof document === "undefined") return { poignee: () => null, arreter: () => undefined };
  let lia: LiaHandle | null = null;
  let essais = 0;
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  let arrete = false;

  const monter = (): void => {
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
      // Une page qui charge peut ne pas être prête : on réessaie, de plus en plus tard (0,5 s, 1 s, 2 s, 4 s).
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
    },
  };
  return courant;
}
