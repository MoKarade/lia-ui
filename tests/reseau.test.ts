import { describe, expect, it } from "vitest";
import { HUMEURS } from "../src/moteur/moteur.js";
import { PROFILS_V9 } from "../src/humeurs.js";
import { INTK, L2K, MOODS } from "../src/poids.js";
import { TAU_LENT, creerReseau, etatLent, impulsion, melange, multIntention, pousserHumeur, reseauPas, top3, type Reseau } from "../src/reseau.js";
import { ecrireLente, lireLente } from "../src/stockage.js";

const profils = { ...(HUMEURS as object), ...PROFILS_V9 } as Record<string, never>;
const milieu = (): number => 0.5; // hasard sans bruit : (0,5 − 0,5) = 0
const base = { energie: 0.85, curiosite: 0.35, social: 0.45, joie: 0.3, ennui: 0.15, midi: 1, actif: 1 };

const vivre = (r: Reseau, e: Record<string, number>, secondes: number, depart = 0): void => {
  for (let i = 0; i < secondes; i++) reseauPas(r, e, 1, milieu, depart + i * 1000);
};
const neuf = (): Reseau => creerReseau(profils);

describe("réseau interne : mêmes résultats que la maquette V9", () => {
  // Valeurs de référence : le port a été comparé pas à pas au code de `reseau.js` de la maquette sur ce scénario
  // (hasard à 0,5 ; act, int, mémoire lente, mélange : identiques à 1e-10 près), puis ses valeurs figées ici.
  it("scénario de 140 s : journée calme, alerte, retour au calme, nuit loin de Marc", () => {
    const r = neuf();
    // [secondes, entrées, humeur dominante, activation, peur, joie lente, envie de dormir]
    const plan: Array<[number, Record<string, number>, string, number[]]> = [
      [40, base, "concentre", [0.17895724, 0, 0.02683818, 0.09534947]],
      [40, { ...base, alerte: 0.9, nbAlertes: 0.66, recurrence: 0.5 }, "inquiet", [0.55119666, 0.70896076, 0.02795778, 0.09534946]],
      [30, { ...base, toutVert: 1, calmeMonde: 1, soir: 1, midi: 0 }, "serein", [0.17324675, 0.01029765, 0.0484358, 0.10760017]],
      [30, { ...base, nuit: 1, energie: 0.2, absent: 1, actif: 0 }, "triste", [0.42825404, 0.18784685, 0.05115209, 0.62785008]],
    ];
    let pas = 0;
    for (const [n, e, humeur, [part, peur, joieLente, dormir]] of plan) {
      for (let i = 0; i < n; i++, pas++) {
        if (pas === 10) impulsion(r, "bon");
        if (pas === 75) impulsion(r, "touche");
        reseauPas(r, e, 1, milieu, pas * 1000);
      }
      expect(r.dom).toBe(humeur);
      expect(r.act[humeur], humeur).toBeCloseTo(part ?? 0, 7);
      expect(r.V["e_peur"], "peur").toBeCloseTo(peur ?? 0, 7);
      expect(r.slow["e_joie"], "joie lente").toBeCloseTo(joieLente ?? 0, 7);
      expect(r.int["dormir"], "dormir").toBeCloseTo(dormir ?? 0, 7);
    }
  });
});

describe("réseau interne : ce qu'elle ressent", () => {
  it("part neutre et complet : 40 humeurs, 17 intentions à 0,3, un corps neutre", () => {
    const r = neuf();
    expect(Object.keys(r.act)).toHaveLength(40);
    expect(r.act["neutre"]).toBe(1);
    expect(Object.keys(r.int)).toHaveLength(17);
    expect(Object.values(r.int).every((v) => v === 0.3)).toBe(true);
    expect(r.dom).toBe("neutre");
    expect(r.mix).toEqual({ bs: 1, ba: 1, blr: 1, ga: 1, en: 1, tint: 0, sag: 0, jit: 1 });
  });

  it("une alerte la rend inquiète, puis elle se calme quand tout est vert", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 0.9, nbAlertes: 0.66 }, 40);
    expect(r.dom).toBe("inquiet");
    expect(multIntention(r, "appeler")).toBeGreaterThan(1.5);
    vivre(r, { ...base, toutVert: 1, calmeMonde: 1 }, 90, 40_000);
    expect(r.dom).not.toBe("inquiet");
  });

  it("une bonne nouvelle la rend fière ou joyeuse un instant, puis l'impulsion retombe", () => {
    const r = neuf();
    impulsion(r, "bon");
    vivre(r, base, 9);
    expect(["fier", "joyeux", "euphorique"]).toContain(r.dom);
    expect(r.imp["bon"]).toBeLessThan(1);
    vivre(r, base, 40, 9000);
    expect(r.imp["bon"]).toBeLessThan(0.05);
  });

  it("une mauvaise nouvelle l'inquiète ; un geste de Marc l'amuse", () => {
    const a = neuf();
    impulsion(a, "mauvais");
    vivre(a, base, 9);
    expect(a.dom).toBe("inquiet");
    const b = neuf();
    impulsion(b, "touche");
    vivre(b, base, 9);
    expect(["amuse", "espiegle", "taquin"]).toContain(b.dom);
  });

  it("la nuit, sans énergie, elle est fatiguée et veut dormir", () => {
    const r = neuf();
    vivre(r, { nuit: 1, energie: 0.2 }, 60);
    expect(r.dom).toBe("fatigue");
    expect(r.int["dormir"] ?? 0).toBeGreaterThan(0.5);
  });

  it("l'humeur dominante ne change pas à la légère", () => {
    const r = neuf();
    vivre(r, base, 20);
    const depart = r.dom;
    const depuis = r.domDepuis;
    reseauPas(r, { ...base, nuit: 1 }, 1, milieu, 21_000);
    expect(r.dom === depart || r.domDepuis > depuis).toBe(true);
  });

  it("une humeur poussée de l'extérieur domine, puis cesse après cent secondes", () => {
    const r = neuf();
    pousserHumeur(r, "euphorique", 0);
    vivre(r, base, 30);
    expect(r.dom).toBe("euphorique");
    vivre(r, base, 80, 120_000);
    expect(Object.keys(r.pousse)).toHaveLength(0);
    expect(r.dom).not.toBe("euphorique");
    pousserHumeur(r, "inconnue", 0);
    expect(Object.keys(r.pousse)).toHaveLength(0);
  });

  it("le bruit du hasard change les valeurs sans changer le sens", () => {
    const a = neuf();
    const b = neuf();
    for (let i = 0; i < 40; i++) {
      reseauPas(a, { ...base, alerte: 0.9, nbAlertes: 0.66 }, 1, () => 0.1, i * 1000);
      reseauPas(b, { ...base, alerte: 0.9, nbAlertes: 0.66 }, 1, () => 0.9, i * 1000);
    }
    expect(a.act["inquiet"]).not.toBe(b.act["inquiet"]);
    expect(a.dom).toBe("inquiet");
    expect(b.dom).toBe("inquiet");
  });
});

describe("réseau interne : le corps qu'elle prend", () => {
  it("le mélange reste borné, complet et fini", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 1, nbAlertes: 1, nuit: 1 }, 50);
    const m = melange(r);
    for (const k of ["bs", "ba", "blr", "ga", "en", "tint", "sag", "jit"] as const) expect(Number.isFinite(m[k]), k).toBe(true);
    expect(m.bs).toBeGreaterThan(0.5);
    expect(m.bs).toBeLessThan(1.9);
    expect(m.en).toBeGreaterThan(0.5);
    expect(m.en).toBeLessThan(1.5);
    if (m.tc) expect(m.tc.every((c) => c >= 0 && c <= 255)).toBe(true);
  });

  it("inquiète, elle frissonne ; fatiguée, elle bâille", () => {
    const peur = neuf();
    vivre(peur, { ...base, alerte: 1, nbAlertes: 1 }, 50);
    expect(melange(peur).shivI).toBeGreaterThan(0);
    const dort = neuf();
    vivre(dort, { nuit: 1, energie: 0.1 }, 80);
    expect(melange(dort).yawnI).toBeGreaterThan(0);
  });

  it("l'activation des 40 humeurs fait environ 1 en tout", () => {
    const r = neuf();
    vivre(r, base, 30);
    const total = MOODS.reduce((s, m) => s + (r.act[m] ?? 0), 0);
    expect(total).toBeGreaterThan(0.95);
    expect(total).toBeLessThan(1.05);
  });

  it("top3 rend au plus trois humeurs, de la plus forte à la plus faible, au-delà de 6 %", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 0.9, nbAlertes: 0.66 }, 40);
    const t = top3(r);
    expect(t.length).toBeGreaterThan(0);
    expect(t.length).toBeLessThanOrEqual(3);
    expect(t[0]?.[0]).toBe("inquiet");
    for (let i = 1; i < t.length; i++) expect(t[i - 1]?.[1] ?? 0).toBeGreaterThanOrEqual(t[i]?.[1] ?? 0);
    expect(t.every(([, v]) => v > 0.06)).toBe(true);
  });
});

describe("réseau interne : les intentions", () => {
  it("pèsent entre 0,6 et 2 sur le choix d'un comportement, et 1 pour un inconnu", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 1, nbAlertes: 1 }, 60);
    for (const k of INTK) {
      const m = multIntention(r, k);
      expect(m).toBeGreaterThan(0.6);
      expect(m).toBeLessThan(2.05);
    }
    expect(multIntention(r, "inconnu")).toBe(1);
  });

  it("l'envie d'appeler monte avec le danger et celle de dormir avec la fatigue", () => {
    const calme = neuf();
    vivre(calme, base, 60);
    const danger = neuf();
    vivre(danger, { ...base, alerte: 1, nbAlertes: 1 }, 60);
    expect(multIntention(danger, "appeler")).toBeGreaterThan(multIntention(calme, "appeler"));
    const nuit = neuf();
    vivre(nuit, { nuit: 1, energie: 0.1 }, 60);
    expect(multIntention(nuit, "dormir")).toBeGreaterThan(multIntention(calme, "dormir"));
  });
});

describe("réseau interne : mémoire lente d'une visite à l'autre", () => {
  it("garde l'état lent, le rend à la visite suivante et l'estompe avec le temps", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 1, nbAlertes: 1 }, 600);
    const lent = etatLent(r);
    expect(Object.keys(lent).sort()).toEqual([...L2K].sort());
    const maxDepart = Math.max(...Object.values(lent));
    expect(maxDepart).toBeGreaterThan(0.1);
    const tout_de_suite = creerReseau(profils, lent, 0);
    expect(tout_de_suite.slow["e_peur"]).toBeCloseTo(lent["e_peur"] ?? 0, 10);
    expect(tout_de_suite.fast["e_peur"]).toBeCloseTo((lent["e_peur"] ?? 0) * 0.5, 10);
    const apres20min = creerReseau(profils, lent, TAU_LENT * 1000);
    expect(apres20min.slow["e_peur"]).toBeCloseTo((lent["e_peur"] ?? 0) * Math.exp(-1), 10);
    const apresUnJour = creerReseau(profils, lent, 24 * 3600 * 1000);
    expect(apresUnJour.slow["e_peur"]).toBeLessThan(1e-6);
  });

  it("une mémoire lente rend la peur plus facile à retrouver", () => {
    const r = neuf();
    vivre(r, { ...base, alerte: 1, nbAlertes: 1 }, 900);
    const lente = etatLent(r);
    const marque = creerReseau(profils, lente, 0);
    const vierge = neuf();
    const petit = { ...base, alerte: 0.3 };
    vivre(marque, petit, 5);
    vivre(vierge, petit, 5);
    expect(marque.V["e_peur"] ?? 0).toBeGreaterThan(vierge.V["e_peur"] ?? 0);
  });

  it("ignore une mémoire absente, invalide ou hors bornes", () => {
    expect(creerReseau(profils, null).slow["e_peur"]).toBe(0);
    const r = creerReseau(profils, { e_peur: Number.NaN, e_joie: 7, e_peine: -1, e_serenite: 0.4 }, 0);
    expect(r.slow["e_peur"]).toBe(0);
    expect(r.slow["e_joie"]).toBe(1);
    expect(r.slow["e_peine"]).toBe(0);
    expect(r.slow["e_serenite"]).toBeCloseTo(0.4, 10);
  });

  it("s'écrit et se relit dans le navigateur, sinon rien", () => {
    expect(lireLente("hub")).toBeNull();
    ecrireLente("hub", { t: 1234, slow: { e_peur: 0.5 } });
    expect(lireLente("hub")).toEqual({ t: 1234, slow: { e_peur: 0.5 } });
    for (const brut of ["{pas du json", "42", JSON.stringify({ t: "hier", slow: {} }), JSON.stringify({ t: 1 })]) {
      localStorage.setItem("lia-ui:x:reseau", brut);
      expect(lireLente("x"), brut).toBeNull();
    }
    localStorage.setItem("lia-ui:y:reseau", JSON.stringify({ t: 5, slow: { e_peur: 0.2, e_joie: 4, e_peine: "x" } }));
    expect(lireLente("y")).toEqual({ t: 5, slow: { e_peur: 0.2 } });
  });
});

describe("réseau interne : pureté", () => {
  it("ne modifie pas le vecteur d'entrées et ne touche pas au réseau sans le dire", () => {
    const e = Object.freeze({ ...base, alerte: 0.4 });
    const r = neuf();
    expect(() => reseauPas(r, e, 1, milieu, 0)).not.toThrow();
    expect(r.pas).toBe(1);
  });

  it("deux réseaux identiques et un même hasard donnent le même résultat", () => {
    const a = neuf();
    const b = neuf();
    vivre(a, { ...base, alerte: 0.5 }, 30);
    vivre(b, { ...base, alerte: 0.5 }, 30);
    expect(a.act).toEqual(b.act);
    expect(a.mix).toEqual(b.mix);
  });

  it("les entrées hors bornes sont ramenées entre 0 et 1", () => {
    const a = neuf();
    const b = neuf();
    vivre(a, { ...base, alerte: 50, nbAlertes: -3 }, 20);
    vivre(b, { ...base, alerte: 1, nbAlertes: 0 }, 20);
    expect(a.act).toEqual(b.act);
  });
});
