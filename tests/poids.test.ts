import { describe, expect, it } from "vitest";
import { HUMEURS } from "../src/moteur/moteur.js";
import { PROFILS_V9 } from "../src/humeurs.js";
import { ENTREES, INTENT, INTK, L1, L1B, L1BK, L1K, L2, L2K, MOODS, SORTIES, TAILLE_RESEAU, type Poids } from "../src/poids.js";

const nomsDeCouche = new Set<string>([...ENTREES, ...L1K, ...L1BK, ...L2K]);
const liens = (t: Record<string, Poids>): Array<[string, string, number]> =>
  Object.entries(t).flatMap(([neurone, w]) => Object.entries(w).filter(([k]) => k !== "_b").map(([k, v]): [string, string, number] => [neurone, k, v]));

describe("les poids du réseau (maquette V9)", () => {
  it("compte les mêmes couches que la maquette : 62, 52, 18, 36, 40 et 17", () => {
    expect([ENTREES.length, L1K.length, L1BK.length, L2K.length, MOODS.length, INTK.length]).toEqual([62, 52, 18, 36, 40, 17]);
    expect(TAILLE_RESEAU).toEqual({ neurones: 225, liens: 595 });
  });

  it("n'a pas deux entrées ni deux neurones du même nom", () => {
    expect(new Set(ENTREES).size).toBe(ENTREES.length);
    expect(nomsDeCouche.size).toBe(ENTREES.length + L1K.length + L1BK.length + L2K.length);
  });

  it.each([
    ["appréciations", L1],
    ["interprétations", L1B],
    ["émotions", L2],
    ["humeurs", SORTIES],
    ["intentions", INTENT],
  ])("chaque lien des %s lit un neurone qui existe", (_nom, table) => {
    const inconnus = liens(table).filter(([, lu]) => !nomsDeCouche.has(lu));
    expect(inconnus).toEqual([]);
  });

  it("les appréciations ne lisent que des entrées ; les interprétations, des entrées ou des appréciations", () => {
    const entrees = new Set(ENTREES);
    expect(liens(L1).filter(([, lu]) => !entrees.has(lu))).toEqual([]);
    const permis = new Set([...ENTREES, ...L1K]);
    expect(liens(L1B).filter(([, lu]) => !permis.has(lu))).toEqual([]);
  });

  it("les émotions lisent les couches du dessous et les autres émotions, jamais les humeurs", () => {
    const permis = new Set([...ENTREES, ...L1K, ...L1BK, ...L2K]);
    expect(liens(L2).filter(([, lu]) => !permis.has(lu))).toEqual([]);
  });

  it("chaque poids est un nombre fini, et aucune sortie ne dépasse 2 en valeur absolue", () => {
    for (const t of [L1, L1B, L2, SORTIES, INTENT]) {
      for (const w of Object.values(t)) {
        for (const v of Object.values(w)) {
          expect(Number.isFinite(v)).toBe(true);
          expect(Math.abs(v)).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("les émotions d'origine lisent aussi les interprétations (ajouts de la maquette)", () => {
    expect(L2["e_peur"]).toMatchObject({ i_urgenceReelle: 0.5, i_inquietudeFond: 0.3 });
    expect(L2["e_solitude"]).toMatchObject({ i_besoinPresence: 0.5 });
    expect(L2["e_vigilance"]).toMatchObject({ i_vigilanceLongue: 0.5, i_urgenceReelle: 0.3 });
  });

  it("les 40 humeurs ont chacune un profil de corps : 12 dans le moteur, 28 ajoutés", () => {
    const base = Object.keys(HUMEURS);
    expect(base).toHaveLength(12);
    expect(Object.keys(PROFILS_V9)).toHaveLength(28);
    expect(base.filter((h) => h in PROFILS_V9)).toEqual([]);
    expect([...MOODS].sort()).toEqual([...base, ...Object.keys(PROFILS_V9)].sort());
  });

  it("chaque profil donne un corps complet et plausible", () => {
    for (const [nom, p] of Object.entries(PROFILS_V9)) {
      for (const k of ["bs", "ba", "blr", "ga", "en", "tint", "sag", "jit"] as const) {
        expect(Number.isFinite(p[k]), `${nom}.${k}`).toBe(true);
      }
      expect(p.bs, nom).toBeGreaterThan(0);
      expect(Math.abs(p.tint), nom).toBeLessThan(0.5);
      if (p.tc) expect(p.tc.every((c) => c >= 0 && c <= 255), nom).toBe(true);
    }
  });
});
