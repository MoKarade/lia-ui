import { describe, expect, it } from "vitest";
import { entreesLocales, type ContexteEntrees } from "../src/entrees.js";

const ENVIES = { energie: 0.8, curiosite: 0.4, social: 0.5, inquiet: 0.1, joie: 0.3, ennui: 0.2 };
// Jeudi 22 octobre 2026, midi.
const MIDI = new Date(2026, 9, 22, 12, 0, 0);
const base = (surcharge: Partial<ContexteEntrees> = {}): ContexteEntrees => ({
  maintenant: MIDI,
  envies: ENVIES,
  dernierMarc: MIDI.getTime(),
  debut: MIDI.getTime(),
  echanges: [],
  dernierPropos: 0,
  dernierMonde: 0,
  ...surcharge,
});
const a = (h: number, jour = 22): ContexteEntrees => base({ maintenant: new Date(2026, 9, jour, h, 0, 0) });

describe("entrées calculées par LIA seule", () => {
  it("reprend ses six envies telles quelles", () => {
    const e = entreesLocales(base());
    for (const [k, v] of Object.entries(ENVIES)) expect(e[k], k).toBe(v);
  });

  it("le moment de la journée : nuit, matin, midi, soir, après-midi", () => {
    expect(entreesLocales(a(2)).nuit).toBe(1);
    expect(entreesLocales(a(22)).nuit).toBe(0.5);
    expect(entreesLocales(a(8)).matin).toBe(1);
    expect(entreesLocales(a(12)).midi).toBe(1);
    expect(entreesLocales(a(16)).apresmidi).toBe(1);
    expect(entreesLocales(a(20)).soir).toBe(1);
    expect(entreesLocales(a(12)).nuit).toBe(0);
  });

  it("le jour de la semaine : vendredi, lundi, fin de semaine", () => {
    expect(entreesLocales(a(12, 23)).vendredi).toBe(1); // 23/10/2026 est un vendredi
    expect(entreesLocales(a(12, 26)).lundi).toBe(1);
    expect(entreesLocales(a(12, 24)).weekend).toBe(1);
    expect(entreesLocales(a(12, 22)).weekend).toBe(0);
  });

  it("Marc est actif tout juste après un geste, puis absent après une minute de calme", () => {
    const t = MIDI.getTime();
    expect(entreesLocales(base({ dernierMarc: t })).actif).toBe(1);
    expect(entreesLocales(base({ dernierMarc: t - 4000 })).actif).toBeCloseTo(0.5, 5);
    expect(entreesLocales(base({ dernierMarc: t - 9000 })).actif).toBe(0);
    expect(entreesLocales(base({ dernierMarc: t - 30_000 })).absent).toBe(0);
    expect(entreesLocales(base({ dernierMarc: t - 150_000 })).absent).toBeCloseTo(0.5, 5);
    expect(entreesLocales(base({ dernierMarc: t - 600_000 })).absent).toBe(1);
  });

  it("la session s'allonge jusqu'à une heure puis plafonne", () => {
    const t = MIDI.getTime();
    expect(entreesLocales(base({ debut: t - 1800e3 })).sessionLongue).toBeCloseTo(0.5, 5);
    expect(entreesLocales(base({ debut: t - 7200e3 })).sessionLongue).toBe(1);
  });

  it("le silence et le calme du monde partent du début de la page, puis de la dernière parole ou nouvelle", () => {
    const t = MIDI.getTime();
    expect(entreesLocales(base({ debut: t - 450e3 })).silence).toBeCloseTo(0.5, 5);
    expect(entreesLocales(base({ debut: t - 450e3, dernierPropos: t - 60e3 })).silence).toBeCloseTo(60 / 900, 5);
    expect(entreesLocales(base({ debut: t - 600e3 })).calmeMonde).toBe(1);
    expect(entreesLocales(base({ debut: t - 600e3, dernierMonde: t - 60e3 })).calmeMonde).toBeCloseTo(0.1, 5);
  });

  it("le rythme de la discussion : récent, questions, messages brefs ou bavards", () => {
    const t = MIDI.getTime();
    const court = (dt: number, question = false) => ({ t: t - dt, longueur: 20, question });
    const long = (dt: number) => ({ t: t - dt, longueur: 180, question: false });
    const brefs = entreesLocales(base({ echanges: [court(60e3, true), court(30e3, true), court(10e3)] }));
    expect(brefs.conv).toBeCloseTo(1 - 10 / 120, 5);
    expect(brefs.questions).toBeCloseTo(2 / 3, 5);
    expect(brefs.bref).toBeCloseTo(1 - 20 / 60, 5);
    expect(brefs.bavard).toBe(0);
    expect(brefs.rythme).toBeCloseTo(0.5, 5);
    const bavard = entreesLocales(base({ echanges: [long(60e3), long(30e3)] }));
    expect(bavard.bavard).toBeCloseTo(0.8, 5);
    expect(bavard.bref).toBe(0);
  });

  it("oublie les échanges de plus de quinze minutes et reste à zéro sans discussion", () => {
    const t = MIDI.getTime();
    const vieux = entreesLocales(base({ echanges: [{ t: t - 20 * 60e3, longueur: 20, question: true }] }));
    expect(vieux.rythme).toBe(0);
    expect(vieux.questions).toBe(0);
    expect(vieux.conv).toBe(0);
    const vide = entreesLocales(base());
    expect([vide.conv, vide.questions, vide.bref, vide.bavard, vide.rythme]).toEqual([0, 0, 0, 0, 0]);
  });

  it("toutes les valeurs restent entre 0 et 1", () => {
    for (const c of [base(), a(3), a(23), base({ dernierMarc: 0 }), base({ debut: 0, dernierPropos: 1, dernierMonde: 1 })]) {
      for (const [k, v] of Object.entries(entreesLocales(c))) {
        expect(v, k).toBeGreaterThanOrEqual(0);
        expect(v, k).toBeLessThanOrEqual(1);
      }
    }
  });
});
