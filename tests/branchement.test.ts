import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { lireHumeur } from "../src/moteur/moteur.js";
import type { HumeurLia, LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const premiere = (): string | undefined => lia?.ressent()[0]?.[0];
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const ALERTE = { alerte: 1, nbAlertes: 0.8, toutVert: 0 };

beforeEach(() => {
  installerEnvironnement();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 22, 12, 0, 0));
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
});

describe("son réseau d'humeurs, branché sur le corps", () => {
  it("le corps suit le mélange du réseau (humeur « auto »), pas une humeur figée", () => {
    lia = mountLia({ vieAutonome: false });
    expect(lireHumeur()).toBe("auto");
  });

  it("une alerte de l'hôte la rend inquiète, et elle le dit par onHumeur", () => {
    const vues: HumeurLia[] = [];
    lia = mountLia({ vieAutonome: false, entrees: () => ALERTE, onHumeur: (h) => vues.push(h) });
    seconde(30);
    expect(premiere()).toBe("inquiet");
    expect(vues).toContain("inquiet");
  });

  it("sans nouvelle du monde, elle n'est pas inquiète", () => {
    lia = mountLia({ vieAutonome: false });
    seconde(30);
    expect(premiere()).not.toBe("inquiet");
  });

  it("ses humeurs au-delà des douze du menu ne sont pas annoncées à l'hôte", () => {
    const vues: string[] = [];
    lia = mountLia({ vieAutonome: false, entrees: () => ALERTE, onHumeur: (h) => vues.push(h) });
    seconde(120);
    expect(vues.length).toBeGreaterThan(0);
    for (const v of vues) expect(["neutre", "joyeux", "calme", "curieux", "fatigue", "inquiet", "excite", "triste", "concentre", "espiegle", "fier", "timide"]).toContain(v);
  });

  it("une humeur donnée par l'hôte tient cent secondes, puis le réseau reprend la main", () => {
    const vues: HumeurLia[] = [];
    lia = mountLia({ vieAutonome: false, onHumeur: (h) => vues.push(h) });
    lia.setHumeur("triste");
    expect(lireHumeur()).toBe("triste");
    expect(vues).toEqual(["triste"]);
    seconde(60);
    expect(lireHumeur()).toBe("triste");
    seconde(45);
    expect(lireHumeur()).toBe("auto");
  });

  it("une humeur poussée domine le réseau pendant qu'elle dure", () => {
    lia = mountLia({ vieAutonome: false });
    lia.setHumeur("joyeux");
    seconde(10);
    expect(premiere()).toBe("joyeux");
  });

  it("une mauvaise nouvelle de l'hôte change ce qu'elle ressent", () => {
    lia = mountLia({ vieAutonome: false });
    seconde(10);
    const avant = JSON.stringify(lia.ressent());
    lia.impulsion("mauvais");
    seconde(3);
    expect(JSON.stringify(lia.ressent())).not.toBe(avant);
  });

  it("parler à Marc compte comme une nouvelle : dire() fait réagir son réseau", () => {
    lia = mountLia({ vieAutonome: false });
    seconde(10);
    const avant = JSON.stringify(lia.ressent());
    lia.dire("Bonjour.");
    seconde(3);
    expect(JSON.stringify(lia.ressent())).not.toBe(avant);
  });

  it("une erreur de l'hôte dans entrees() ne l'arrête pas : elle le dit et continue", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lia = mountLia({
      vieAutonome: false,
      entrees: () => {
        throw new Error("hors ligne");
      },
    });
    seconde(5);
    expect(err).toHaveBeenCalled();
    expect(lia.ressent()).toBeInstanceOf(Array);
  });

  it("garde sa mémoire lente d'une visite à l'autre, et l'arrête à la fermeture", () => {
    const entrees = vi.fn(() => ALERTE);
    lia = mountLia({ vieAutonome: false, entrees });
    seconde(30);
    lia.destroy();
    const lente = JSON.parse(localStorage.getItem("lia-ui:lia:reseau") ?? "{}") as { t?: number; slow?: Record<string, number> };
    expect(lente.t).toBeGreaterThan(0);
    expect(Object.keys(lente.slow ?? {}).length).toBeGreaterThan(0);
    const appels = entrees.mock.calls.length;
    seconde(30);
    expect(entrees.mock.calls.length).toBe(appels);
    lia = null;
  });

  it("une seconde visite hérite de la mémoire lente de la première", () => {
    const lente = (): number => Object.values((JSON.parse(localStorage.getItem("lia-ui:lia:reseau") ?? "{}") as { slow?: Record<string, number> }).slow ?? {}).reduce((s, v) => s + v, 0);
    lia = mountLia({ vieAutonome: false, entrees: () => ALERTE });
    seconde(60);
    lia.destroy();
    lia = mountLia({ vieAutonome: false });
    seconde(1);
    lia.destroy();
    const heritee = lente();
    localStorage.clear();
    lia = mountLia({ vieAutonome: false });
    seconde(1);
    lia.destroy();
    lia = null;
    expect(heritee).toBeGreaterThan(lente());
  });
});

describe("mouvement réduit « fixe » : pas de réseau", () => {
  it("garde l'image unique, ne ressent rien et ne demande rien à l'hôte", () => {
    installerEnvironnement({ sansMouvement: true });
    const entrees = vi.fn(() => ALERTE);
    lia = mountLia({ quandMouvementReduit: "fixe", entrees });
    seconde(30);
    expect(lia.ressent()).toEqual([]);
    expect(entrees).not.toHaveBeenCalled();
    expect(lireHumeur()).not.toBe("auto");
  });

  it("« doux » garde le réseau : elle ressent sur place", () => {
    installerEnvironnement({ sansMouvement: true });
    lia = mountLia({ entrees: () => ALERTE });
    seconde(30);
    expect(premiere()).toBe("inquiet");
  });
});
