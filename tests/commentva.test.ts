import { describe, expect, it } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { jauges, MENTION_SIMULATION, phraseCommentVa } from "../src/commentva.js";
import { INTERIEUR_DEPART, stimuler } from "../src/interieur.js";

describe("comment elle va", () => {
  it("rend onze jauges entières bornées à [0, 100]", () => {
    const j = jauges({ ...ENVIES_DEPART, energie: 1.7, ennui: -2 }, { ...INTERIEUR_DEPART, douleur: Number.NaN });
    expect(j.map((x) => x.id)).toEqual(["energie", "curiosite", "social", "joie", "ennui", "inquiet", "douleur", "plaisir", "confiance", "sensibilite", "usure"]);
    for (const x of j) {
      expect(Number.isInteger(x.pct)).toBe(true);
      expect(x.pct).toBeGreaterThanOrEqual(0);
      expect(x.pct).toBeLessThanOrEqual(100);
    }
    expect(j.find((x) => x.id === "energie")?.pct).toBe(100);
    expect(j.find((x) => x.id === "ennui")?.pct).toBe(0);
    expect(j.find((x) => x.id === "douleur")?.pct).toBe(0);
  });

  it("lit les vraies valeurs, sans les arrondir au-delà du pour cent", () => {
    const j = jauges({ ...ENVIES_DEPART, curiosite: 0.424 }, { ...INTERIEUR_DEPART, confiance: 0.505 });
    expect(j.find((x) => x.id === "curiosite")?.pct).toBe(42);
    expect(j.find((x) => x.id === "confiance")?.pct).toBe(51);
  });

  it("nomme la cause d'une douleur, et seulement quand elle compte", () => {
    const mal = stimuler(INTERIEUR_DEPART, "brusque");
    expect(jauges(ENVIES_DEPART, mal).find((x) => x.id === "douleur")?.detail).toBe("des clics brusques");
    expect(jauges(ENVIES_DEPART, { ...mal, douleur: 0.01 }).find((x) => x.id === "douleur")?.detail).toBe("");
    expect(jauges(ENVIES_DEPART, INTERIEUR_DEPART).find((x) => x.id === "douleur")?.penible).toBe(true);
  });

  it("dit d'abord ce qui compte le plus", () => {
    expect(phraseCommentVa(ENVIES_DEPART, INTERIEUR_DEPART)).toBe("Elle va bien.");
    expect(phraseCommentVa(ENVIES_DEPART, { ...INTERIEUR_DEPART, douleur: 0.6, cause: "choc" })).toBe("Elle a mal : un choc.");
    expect(phraseCommentVa(ENVIES_DEPART, { ...INTERIEUR_DEPART, douleur: 0.2, cause: "panne" })).toBe("Elle a un peu mal : le réseau coupé.");
    expect(phraseCommentVa({ ...ENVIES_DEPART, inquiet: 0.8 }, INTERIEUR_DEPART)).toBe("Elle est inquiète.");
    expect(phraseCommentVa({ ...ENVIES_DEPART, energie: 0.1 }, INTERIEUR_DEPART)).toBe("Elle est fatiguée.");
    expect(phraseCommentVa(ENVIES_DEPART, { ...INTERIEUR_DEPART, plaisir: 0.5 })).toBe("Elle est contente.");
    // La douleur passe avant la joie.
    expect(phraseCommentVa({ ...ENVIES_DEPART, joie: 0.9 }, { ...INTERIEUR_DEPART, douleur: 0.5, cause: "ton" })).toBe("Elle a mal : des mots durs.");
  });

  it("dit que c'est une simulation", () => {
    expect(MENTION_SIMULATION).toMatch(/simulation/i);
    expect(MENTION_SIMULATION).toMatch(/pas un vrai ressenti/);
  });
});
