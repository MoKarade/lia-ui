import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

/** Les humeurs vues toutes les 5 s pendant `secondes`, avec les entrées que le hub envoie vraiment (alerte 0,37, nbAlertes 0,5). */
const humeursVues = (secondes: number, entrees: () => Record<string, number>, present = false): string[] => {
  lia = mountLia({ quandMouvementReduit: "complet", entrees });
  const vues: string[] = [];
  for (let s = 0; s < secondes; s += 5) {
    vi.advanceTimersByTime(5000);
    if (present && s % 20 === 0) window.dispatchEvent(new Event("pointermove"));
    vues.push(lia.humeur().nom);
  }
  return vues;
};

describe("l'humeur vit même avec des alertes affichées en continu", () => {
  it.each([false, true])("elle ne reste pas inquiète : une autre humeur après 4 minutes (Marc présent : %s)", (present) => {
    const vues = humeursVues(600, () => ({ alerte: 0.37, nbAlertes: 0.5, toutVert: 0 }), present);
    expect(vues[0]).toBe("inquiet");
    expect(new Set(vues).size).toBeGreaterThanOrEqual(2);
    expect(vues.slice(48).some((h) => h !== "inquiet")).toBe(true);
  });

  it("un changement des alertes la rend de nouveau inquiète", () => {
    let nb = 0.5;
    lia = mountLia({ quandMouvementReduit: "complet", entrees: () => ({ alerte: 0.37, nbAlertes: nb, toutVert: 0 }) });
    vi.advanceTimersByTime(300_000);
    expect(lia.humeur().nom).not.toBe("inquiet");
    nb = 1;
    vi.advanceTimersByTime(60_000);
    expect(lia.humeur().nom).toBe("inquiet");
  });
});
