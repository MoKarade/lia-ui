import { describe, expect, it } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { INTERIEUR_DEPART } from "../src/interieur.js";
import { ambivalence, pourquoi, raisons, reponsePourquoi, rythmeDuJour, teinter, type ContextePensee } from "../src/pensee.js";

const calme: ContextePensee = {
  humeur: "neutre",
  actives: [["neutre", 0.8]],
  envies: { ...ENVIES_DEPART, social: 0.5, ennui: 0.1, energie: 0.8, joie: 0.3, inquiet: 0 },
  interieur: { ...INTERIEUR_DEPART },
  fond: { rancune: 0, chaleur: 0 },
  heure: 14,
  faits: [],
  maintenant: Date.UTC(2026, 9, 24, 14),
};
const avec = (o: Partial<ContextePensee>): ContextePensee => ({ ...calme, ...o });
const fixe = (...v: number[]) => {
  let k = 0;
  return () => v[Math.min(k++, v.length - 1)] ?? 0;
};

describe("raisons : une raison n'existe que si elle est vraie", () => {
  it("rien à dire quand tout est calme", () => {
    expect(raisons(calme)).toEqual([]);
    expect(pourquoi(calme, () => 0)).toBeNull();
  });

  it("la douleur dit sa cause, et seulement quand elle est assez forte", () => {
    const mal = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.5, cause: "brusque" } });
    expect(raisons(mal)[0]).toMatchObject({ id: "douleur", phrase: "on m'a un peu brusquée tout à l'heure" });
    const peu = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.1, cause: "brusque" } });
    expect(raisons(peu).find((r) => r.id === "douleur")).toBeUndefined();
    const sansCause = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.9, cause: null } });
    expect(raisons(sansCause).find((r) => r.id === "douleur")).toBeUndefined();
  });

  it("chaque cause de douleur a sa phrase", () => {
    for (const cause of ["choc", "brusque", "ton", "panne", "isolement", "usure"] as const) {
      const r = raisons(avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.6, cause } }));
      expect(r[0]?.id).toBe("douleur");
      expect(r[0]?.phrase.length).toBeGreaterThan(10);
    }
  });

  it("ses souvenirs pèsent quand ils comptent", () => {
    expect(raisons(avec({ fond: { rancune: 0.5, chaleur: 0 } }))[0]?.id).toBe("rancune");
    expect(raisons(avec({ fond: { rancune: 0, chaleur: 0.6 } }))[0]?.id).toBe("chaleur");
    expect(raisons(avec({ fond: { rancune: 0.1, chaleur: 0.1 } }))).toEqual([]);
    expect(raisons(avec({ fond: null }))).toEqual([]);
  });

  it("ses envies, l'heure et son état donnent leurs raisons", () => {
    expect(raisons(avec({ envies: { ...calme.envies, social: 0.05 } }))[0]?.id).toBe("compagnie");
    expect(raisons(avec({ envies: { ...calme.envies, ennui: 0.9 } }))[0]?.id).toBe("ennui");
    expect(raisons(avec({ envies: { ...calme.envies, energie: 0.1 } }))[0]?.id).toBe("fatigue");
    expect(raisons(avec({ envies: { ...calme.envies, joie: 0.95 } }))[0]?.id).toBe("joie");
    expect(raisons(avec({ envies: { ...calme.envies, inquiet: 0.8 } }))[0]?.id).toBe("inquietude");
    expect(raisons(avec({ heure: 23 }))[0]?.phrase).toBe("il est tard");
    expect(raisons(avec({ heure: 2 }))[0]?.phrase).toBe("il est tard");
    expect(raisons(avec({ heure: 6 }))[0]?.phrase).toBe("il est tôt");
    expect(raisons(avec({ heure: 9 }))).toEqual([]);
    expect(raisons(avec({ interieur: { ...INTERIEUR_DEPART, confiance: 0.95 } }))[0]?.id).toBe("confiance");
    expect(raisons(avec({ interieur: { ...INTERIEUR_DEPART, plaisir: 0.6 } }))[0]?.id).toBe("plaisir");
    expect(raisons(avec({ interieur: { ...INTERIEUR_DEPART, sensibilite: 0.7 } }))[0]?.id).toBe("sensible");
  });

  it("trie de la plus pesante à la plus légère", () => {
    const r = raisons(avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.8, cause: "ton" }, envies: { ...calme.envies, ennui: 0.7 }, heure: 23 }));
    expect(r.map((x) => x.id)).toEqual(["douleur", "ennui", "heure"]);
    for (let k = 1; k < r.length; k++) expect((r[k - 1] as { force: number }).force).toBeGreaterThanOrEqual((r[k] as { force: number }).force);
  });

  it("des nombres non finis ne produisent ni raison ni plantage", () => {
    const fou = avec({ envies: { ...calme.envies, social: Number.NaN, energie: Number.NaN, ennui: Number.NaN }, interieur: { ...INTERIEUR_DEPART, douleur: Number.NaN, cause: "choc" } });
    expect(() => raisons(fou)).not.toThrow();
    expect(raisons(fou).every((r) => Number.isFinite(r.force))).toBe(true);
  });
});

describe("pourquoi", () => {
  const mal = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.7, cause: "panne" } });

  it("dit sa raison la plus pesante avec une introduction d'une liste fermée", () => {
    expect(pourquoi(mal, fixe(0))).toBe("Je crois que c'est parce que le réseau a lâché tout à l'heure.");
    expect(pourquoi(mal, fixe(0.99))).toBe("C'est que le réseau a lâché tout à l'heure.");
  });

  it("une raison presque aussi forte peut passer devant, pas une raison faible", () => {
    const deux = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.5, cause: "ton" }, envies: { ...calme.envies, ennui: 0.82 } });
    expect(raisons(deux).map((r) => r.id).slice(0, 2)).toEqual(["douleur", "ennui"]);
    expect(pourquoi(deux, fixe(0.1, 0))).toContain("je m'ennuie un peu");
    expect(pourquoi(deux, fixe(0.9, 0))).toContain("le ton de tout à l'heure");
    const loin = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.9, cause: "ton" }, envies: { ...calme.envies, ennui: 0.65 } });
    expect(pourquoi(loin, fixe(0.1, 0))).toContain("le ton de tout à l'heure");
  });

  it("élide « que » devant une voyelle : « parce qu'il », « parce qu'on », « c'est qu'une »", () => {
    const brusque = avec({ interieur: { ...INTERIEUR_DEPART, douleur: 0.6, cause: "brusque" } });
    expect(pourquoi(brusque, fixe(0))).toBe("Je crois que c'est parce qu'on m'a un peu brusquée tout à l'heure.");
    expect(pourquoi(brusque, fixe(0.99))).toBe("C'est qu'on m'a un peu brusquée tout à l'heure.");
  });

  it("un hasard non fini ne casse rien", () => {
    expect(pourquoi(mal, () => Number.NaN)).toMatch(/^Je crois que c'est parce que /);
  });
});

describe("reponsePourquoi", () => {
  it("dit que tout est calme quand il n'y a aucune raison, jamais une raison inventée", () => {
    expect(reponsePourquoi(calme, () => 0)).toBe("Pas de raison précise, je crois. Tout est calme.");
  });

  it("donne sa raison quand il y en a une", () => {
    expect(reponsePourquoi(avec({ heure: 23 }), () => 0)).toBe("Je crois que c'est parce qu'il est tard.");
  });
});

describe("ambivalence", () => {
  it("rien quand une humeur domine ou qu'il n'y en a qu'une", () => {
    expect(ambivalence([])).toBeNull();
    expect(ambivalence([["serein", 0.8]])).toBeNull();
    expect(ambivalence([["serein", 0.8], ["inquiet", 0.2]])).toBeNull();
    expect(ambivalence([["serein", 0.8], ["serein", 0.8]])).toBeNull();
  });

  it("deux familles différentes : un mélange, avec l'élision", () => {
    expect(ambivalence([["serein", 0.8], ["inquiet", 0.7]])).toBe("Un mélange de sérénité et d'inquiétude.");
    expect(ambivalence([["inquiet", 0.8], ["joyeux", 0.7]])).toBe("Un mélange d'inquiétude et de joie.");
  });

  it("deux humeurs de même famille : l'une domine, l'autre colore", () => {
    expect(ambivalence([["joyeux", 0.8], ["excite", 0.6]])).toBe("Surtout un fond de joie, avec un peu d'excitation.");
    expect(ambivalence([["triste", 0.8], ["fatigue", 0.6]])).toBe("Surtout un fond de tristesse, avec un peu de fatigue.");
  });
});

describe("teinter : une couleur d'humeur sur sa propre phrase, jamais un changement de sens", () => {
  it("une humeur hésitante peut ouvrir par une hésitation, la majuscule tombe", () => {
    expect(teinter("Je ne sais pas.", "timide", fixe(0.1, 0))).toBe("Hum… je ne sais pas.");
    expect(teinter("Je ne sais pas.", "dubitatif", fixe(0.1, 0.4))).toBe("Euh… je ne sais pas.");
    expect(teinter("Je ne sais pas.", "timide", fixe(0.9))).toBe("Je ne sais pas.");
  });

  it("garde la majuscule d'un sigle et ne double pas une hésitation", () => {
    expect(teinter("LIA est là.", "gene", fixe(0.1, 0))).toBe("Hum… LIA est là.");
    expect(teinter("Hum… oui.", "timide", fixe(0.1, 0))).toBe("Hum… oui.");
  });

  it("une humeur lasse laisse la fin de la phrase traîner", () => {
    expect(teinter("Je reste là.", "fatigue", fixe(0.1))).toBe("Je reste là…");
    expect(teinter("Je reste là…", "fatigue", fixe(0.1))).toBe("Je reste là…");
    expect(teinter("Je reste là.", "fatigue", fixe(0.9))).toBe("Je reste là.");
  });

  it("les autres humeurs et une phrase vide ne changent pas", () => {
    expect(teinter("Ça va !", "joyeux", () => 0)).toBe("Ça va !");
    expect(teinter("", "timide", () => 0)).toBe("");
  });
});

describe("rythmeDuJour", () => {
  it("creux vers 4 h, pointe vers 15 h, toujours entre 0,7 et 1,05", () => {
    expect(rythmeDuJour(15)).toBeCloseTo(1.05, 2);
    expect(rythmeDuJour(3)).toBeCloseTo(0.7, 2);
    expect(rythmeDuJour(15)).toBeGreaterThan(rythmeDuJour(9));
    expect(rythmeDuJour(9)).toBeGreaterThan(rythmeDuJour(3));
    for (let h = -30; h < 60; h += 0.5) {
      expect(rythmeDuJour(h)).toBeGreaterThanOrEqual(0.7 - 1e-9);
      expect(rythmeDuJour(h)).toBeLessThanOrEqual(1.05 + 1e-9);
    }
    expect(Number.isFinite(rythmeDuJour(Number.NaN))).toBe(true);
  });

  it("revient sur elle-même au bout de 24 h", () => {
    expect(rythmeDuJour(7)).toBeCloseTo(rythmeDuJour(31), 9);
  });
});
