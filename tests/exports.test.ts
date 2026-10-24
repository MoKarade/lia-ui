import { describe, expect, it } from "vitest";
import { CAUSES, COMPORTEMENTS, ENVIES_DEPART, validerEtat, type Cause, type EtatLia } from "../src/index.js";

const etat = (o: Partial<EtatLia> = {}): unknown => ({
  version: 2,
  maj: Date.now(),
  envies: { ...ENVIES_DEPART },
  journal: [{ t: Date.now() - 1000, quoi: COMPORTEMENTS[0] }],
  lente: {},
  humeur: "joyeux",
  relances: { jour: "2026-10-24", n: 0 },
  ...o,
});

describe("l'entrée du paquet donne à un hôte de quoi valider l'état partagé", () => {
  it("exporte les listes fermées que la validation utilise", () => {
    expect(COMPORTEMENTS.length).toBeGreaterThan(10);
    expect([...CAUSES]).toEqual(["choc", "brusque", "ton", "panne", "isolement", "usure"]);
  });

  it("valide un état avec son monde intérieur, sans le perdre", () => {
    const cause: Cause = "choc";
    const e = validerEtat(etat({ interieur: { douleur: 0.4, cause, sensibilite: 0.2, plaisir: 0.1, confiance: 0.9, usure: 0.3 } }));
    expect(e?.interieur?.cause).toBe("choc");
    expect(e?.interieur?.douleur).toBeCloseTo(0.4);
  });

  it("une cause inconnue retire `interieur` seul, l'état reste valide", () => {
    const e = validerEtat(etat({ interieur: { douleur: 0.4, cause: "autre" as never, sensibilite: 0.2, plaisir: 0.1, confiance: 0.9, usure: 0.3 } }));
    expect(e).not.toBeNull();
    expect(e).not.toHaveProperty("interieur");
  });
});
