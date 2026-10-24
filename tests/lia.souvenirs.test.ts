import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { EtatHote } from "../src/etat.js";
import type { EtatLia } from "../src/etat.js";
import { lireSouvenirs } from "../src/stockage.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const bas = (): void => {
  hit().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
  hit().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
};
const rafale = (): void => {
  for (let k = 0; k < 4; k++) {
    bas();
    seconde(0.2);
  }
};
const JOUR = 24 * 3600 * 1000;
const dit = (): string => document.querySelector(".lia-ui__bulle")?.textContent ?? "";

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 14, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sa mémoire affective sur plusieurs jours, dans la page", () => {
  it("une rafale qui lui fait mal laisse un souvenir, gardé d'une page à l'autre, et une sensibilité de fond le lendemain", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "souv" });
    seconde(2);
    expect(lia.souvenirs()).toEqual([]);
    rafale();
    seconde(2);
    const s = lia.souvenirs();
    expect(s.length).toBe(1);
    expect(s[0]?.genre).toBe("brusque");
    expect(s[0]?.poids).toBeGreaterThan(0.3);
    // Jamais le contenu d'un message : seulement un genre, un instant, un poids.
    expect(Object.keys(s[0] ?? {}).sort()).toEqual(["genre", "poids", "quand"]);
    expect(lireSouvenirs("souv").souvenirs.length).toBe(1);
    lia.destroy();
    vi.setSystemTime(Date.now() + JOUR);
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "souv" });
    expect(lia.souvenirs().length).toBe(1);
    const i = lia.interieur();
    expect(i.rancune).toBeGreaterThan(0.1);
    expect(i.sensibilite).toBeGreaterThan(0.2);
    expect(i.douleur).toBe(0);
    // Sans souvenir, la même page un jour après repart de sa sensibilité de départ.
    lia.destroy();
    localStorage.clear();
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "autre" });
    expect(lia.interieur().sensibilite).toBeLessThan(0.16);
    expect(lia.interieur().rancune).toBe(0);
  });

  it("une gentillesse laisse un souvenir de chaleur", async () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", ask: () => Promise.resolve({ text: "ok" }), cle: "gentil" });
    seconde(2);
    lia.ouvrirChat();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "merci beaucoup";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.advanceTimersByTimeAsync(50);
    expect(lia.souvenirs().map((s) => s.genre)).toContain("gentil");
    expect(lia.interieur().chaleur).toBeGreaterThan(0.05);
  });

  it("en revenant après un jour, elle dit un mot vrai tiré de ses souvenirs, une seule fois, et se tait sans souvenir", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "retour" });
    seconde(2);
    rafale();
    seconde(2);
    lia.destroy();
    vi.setSystemTime(Date.now() + JOUR);
    lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", cle: "retour" });
    seconde(8);
    expect(dit()).toMatch(/rude|dur|longtemps|souviens|plus tôt|hier|derniers/i);
    expect(lireSouvenirs("retour").retour.n).toBe(1);
    // Une page vierge, après un jour d'absence : aucun souvenir, aucune phrase.
    lia.destroy();
    localStorage.clear();
    document.body.innerHTML = `<p>Une page</p>`;
    lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", cle: "neuve" });
    seconde(1);
    vi.setSystemTime(Date.now() + JOUR);
    lia.destroy();
    lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", cle: "neuve" });
    seconde(8);
    expect(lireSouvenirs("neuve").retour.n).toBe(0);
    expect(dit()).not.toMatch(/rude|longtemps|souviens|revoilà|gentil/i);
  });

  it("jamais pendant son silence", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "nuit" });
    seconde(2);
    rafale();
    seconde(2);
    lia.destroy();
    vi.setSystemTime(new Date(2026, 9, 24, 23, 30, 0));
    lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", cle: "nuit" });
    seconde(3);
    expect(dit()).toBe("");
    expect(lireSouvenirs("nuit").retour.n).toBe(0);
  });

  it("ses souvenirs voyagent dans l'état partagé et ne comptent pas deux fois quand l'hôte les rend", async () => {
    let garde: EtatLia | null = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "a", etat: hote });
    await vi.advanceTimersByTimeAsync(2000);
    rafale();
    await vi.advanceTimersByTimeAsync(25_000);
    const ecrit = garde as EtatLia | null;
    expect(ecrit?.souvenirs?.length).toBe(1);
    const poids = ecrit?.souvenirs?.[0]?.poids ?? 0;
    lia.destroy();
    // Une autre page (autre clé locale : rien en commun que l'état partagé) retrouve le souvenir.
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "b", etat: hote });
    await vi.advanceTimersByTimeAsync(2000);
    expect(lia.souvenirs().length).toBe(1);
    expect(lia.souvenirs()[0]?.poids).toBeCloseTo(poids, 5);
    // Relue chaque minute, elle ne le double pas.
    await vi.advanceTimersByTimeAsync(130_000);
    expect(lia.souvenirs().length).toBe(1);
    expect(lia.souvenirs()[0]?.poids).toBeCloseTo(poids, 5);
  });
});
