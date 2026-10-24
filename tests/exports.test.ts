import { describe, expect, it } from "vitest";
import { CAUSES, COMPORTEMENTS, ENVIES_DEPART, GENRES_SOUVENIR, ajouterSouvenir, humeurDeFond, phraseDeRetour, validerEtat, type Cause, type EtatLia, type Souvenir } from "../src/index.js";

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

  it("exporte la mémoire sur plusieurs jours et la valide dans l'état", () => {
    expect([...GENRES_SOUVENIR]).toEqual(["brusque", "ton", "panne", "gentil", "compliment", "retour", "isolement"]);
    const maintenant = Date.now();
    const s: Souvenir = { quand: maintenant - 1000, genre: "ton", poids: 0.7 };
    const liste = ajouterSouvenir([], s, maintenant);
    expect(humeurDeFond(liste, maintenant).rancune).toBeGreaterThan(0.3);
    expect(typeof phraseDeRetour(liste, 3 * 86_400_000, () => 0.2, maintenant, 0)).toBe("string");
    expect(validerEtat(etat({ souvenirs: liste }))?.souvenirs).toEqual(liste);
  });
});
