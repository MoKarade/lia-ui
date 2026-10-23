import { afterEach, describe, expect, it, vi } from "vitest";
import { humanStep, regarder } from "../src/moteur/moteur.js";

afterEach(() => vi.restoreAllMocks());

/** Fait vivre son regard `secondes` secondes à 60 images par seconde, en partant de l'instant `t0` de son horloge. */
const vivre = (t0: number, secondes: number, id: string): number => {
  const P = { v: 0 } as unknown as Parameters<typeof humanStep>[3];
  let gx = 0;
  for (let t = t0; t < t0 + secondes; t += 1 / 60) gx = (humanStep(1 / 60, t, id, P) as { gx: number }).gx;
  return gx;
};

describe("son regard et l'horloge du moteur", () => {
  it("quand le curseur ne bouge plus depuis plus de 3 s, ses yeux le quittent, même dans une page ouverte depuis longtemps", () => {
    // Page ouverte depuis 20 s : performance.now() vaut 20 000 ms alors que l'horloge du moteur repart de 0 au montage.
    vi.spyOn(performance, "now").mockReturnValue(20_000);
    vivre(0, 1, "ecoute");
    regarder(0.9, 0.8, 0);
    expect(vivre(0, 1, "ecoute")).toBeGreaterThan(0.3);
    // Après 12 s sans mouvement, elle regarde ailleurs (elle dérive) : plus collée au dernier point du curseur.
    expect(vivre(1, 12, "ecoute")).toBeLessThan(0.3);
  });

  it("sans horloge donnée, regarder() garde l'ancien comportement (secondes de performance.now)", () => {
    vi.spyOn(performance, "now").mockReturnValue(5_000);
    regarder(0.5, 0.5);
    expect(vivre(5, 1, "ecoute")).toBeGreaterThan(0.1);
  });
});
