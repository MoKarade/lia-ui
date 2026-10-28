import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import type { EtatHote, EtatLia } from "../src/etat.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const jour = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const etat = (): EtatLia => ({
  version: 3,
  maj: Date.now() + 1000,
  envies: { ...ENVIES_DEPART },
  journal: [],
  lente: {},
  humeur: "joyeux",
  relances: { jour: jour(), n: 0 },
});

/** Simule un onglet caché ou à l'écran (jsdom est toujours « visible »). */
function cacher(oui: boolean): void {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => oui });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (oui ? "hidden" : "visible") });
}

beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = "<p>Une page</p>";
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 9, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  cacher(false);
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  cacher(false);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Un hôte dont on compte les lectures (chaque lecture est un appel au hub). */
function hoteCompteur(): { hote: EtatHote; lectures: () => number } {
  let n = 0;
  return {
    hote: {
      lire: async () => {
        n++;
        return etat();
      },
      ecrire: async () => null,
    },
    lectures: () => n,
  };
}

describe("lecture de l'état partagé (lia-ui#162)", () => {
  it("une page à l'écran lit à l'arrivée, puis toutes les 120 s (pas 60)", async () => {
    const { hote, lectures } = hoteCompteur();
    lia = mountLia({ vieAutonome: false, cle: "lecture-visible", etat: hote });
    await vi.advanceTimersByTimeAsync(500);
    expect(lectures()).toBe(1);
    // À 90 s : l'ancienne cadence (60 s) aurait déjà relu une fois.
    await vi.advanceTimersByTimeAsync(90_000);
    expect(lectures()).toBe(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(lectures()).toBe(2);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(lectures()).toBe(3);
  });

  it("un onglet caché ne relit pas pendant dix minutes", async () => {
    const { hote, lectures } = hoteCompteur();
    lia = mountLia({ vieAutonome: false, cle: "lecture-cachee", etat: hote });
    await vi.advanceTimersByTimeAsync(500);
    expect(lectures()).toBe(1);
    cacher(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(lectures()).toBe(1);
  });

  it("en revenant à l'écran, l'onglet relit tout de suite", async () => {
    const { hote, lectures } = hoteCompteur();
    lia = mountLia({ vieAutonome: false, cle: "lecture-retour", etat: hote });
    await vi.advanceTimersByTimeAsync(500);
    cacher(true);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    const avant = lectures();
    cacher(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(50);
    expect(lectures()).toBe(avant + 1);
  });
});
