import { describe, expect, it } from "vitest";
import {
  GENRES_SOUVENIR,
  SOUVENIRS_MAX,
  SOUVENIR_DEMI_VIE_JOURS,
  ajouterSouvenir,
  humeurDeFond,
  phraseDeRetour,
  poidsActuel,
  type GenreSouvenir,
  type Souvenir,
} from "../src/souvenirs.js";

const MIN = 60_000;
const H = 3_600_000;
const J = 86_400_000;
/** Midi, heure locale : « hier » et « aujourd'hui » restent sans ambiguïté quel que soit le fuseau de la machine. */
const MAINTENANT = new Date(2026, 9, 24, 12, 0, 0).getTime();
const sv = (genre: GenreSouvenir, ilYa: number, poids = 0.8): Souvenir => ({ quand: MAINTENANT - ilYa, genre, poids });

describe("ajouterSouvenir : validation, fusion, élagage", () => {
  it("ajoute un souvenir valide sans modifier la liste d'origine", () => {
    const liste: Souvenir[] = [];
    const r = ajouterSouvenir(liste, sv("gentil", 1000), MAINTENANT);
    expect(r).toEqual([{ quand: MAINTENANT - 1000, genre: "gentil", poids: 0.8 }]);
    expect(liste).toEqual([]);
    expect(r).not.toBe(liste);
  });

  it("ignore un souvenir invalide et ne garde jamais d'autre clé", () => {
    const base = [sv("ton", H)];
    for (const mauvais of [
      { quand: MAINTENANT, genre: "inconnu", poids: 0.5 },
      { quand: Number.NaN, genre: "ton", poids: 0.5 },
      { quand: MAINTENANT, genre: "ton", poids: Number.NaN },
      { quand: MAINTENANT, genre: "ton", poids: Number.POSITIVE_INFINITY },
      { quand: -5, genre: "ton", poids: 0.5 },
      { quand: MAINTENANT, genre: "ton", poids: 0 },
      null,
    ]) {
      expect(ajouterSouvenir(base, mauvais as unknown as Souvenir, MAINTENANT)).toEqual(base);
    }
    const r = ajouterSouvenir([], { quand: MAINTENANT, genre: "gentil", poids: 0.5, texte: "secret" } as unknown as Souvenir, MAINTENANT);
    expect(Object.keys(r[0] ?? {}).sort()).toEqual(["genre", "poids", "quand"]);
  });

  it("borne le poids à [0, 1] et l'instant à maintenant", () => {
    expect(ajouterSouvenir([], sv("brusque", 0, 7), MAINTENANT)[0]?.poids).toBe(1);
    expect(ajouterSouvenir([], sv("brusque", 0, -3), MAINTENANT)).toEqual([]);
    expect(ajouterSouvenir([], { quand: MAINTENANT + 5 * J, genre: "gentil", poids: 0.4 }, MAINTENANT)[0]?.quand).toBe(MAINTENANT);
  });

  it("fusionne deux souvenirs du même genre à moins de 10 min, pas à plus, pas d'un autre genre", () => {
    const a = ajouterSouvenir([], sv("brusque", 9 * MIN, 0.5), MAINTENANT);
    const b = ajouterSouvenir(a, sv("brusque", 0, 0.5), MAINTENANT);
    expect(b).toHaveLength(1);
    expect(b[0]?.quand).toBe(MAINTENANT);
    expect(b[0]?.poids).toBeCloseTo(0.75, 10);
    expect(ajouterSouvenir(a, sv("brusque", 0, 0.5), MAINTENANT + 2 * MIN)).toHaveLength(1);
    expect(ajouterSouvenir([sv("brusque", 11 * MIN, 0.5)], sv("brusque", 0, 0.5), MAINTENANT)).toHaveLength(2);
    expect(ajouterSouvenir([sv("brusque", MIN, 0.5)], sv("ton", 0, 0.5), MAINTENANT)).toHaveLength(2);
  });

  it("la fusion sature : jamais plus de 1", () => {
    let l: Souvenir[] = [];
    for (let k = 0; k < 20; k++) l = ajouterSouvenir(l, sv("ton", k * 10_000, 0.9), MAINTENANT);
    expect(l).toHaveLength(1);
    expect(l[0]?.poids).toBeLessThanOrEqual(1);
  });

  it("garde au plus 40 souvenirs et élague d'abord les plus faibles après décroissance", () => {
    let l: Souvenir[] = [];
    // 40 souvenirs d'il y a 3 jours (une heure d'écart, donc sans fusion), tous de poids 0,5.
    for (let k = 0; k < SOUVENIRS_MAX; k++) l = ajouterSouvenir(l, sv("gentil", 3 * J + k * H, 0.5), MAINTENANT);
    expect(l).toHaveLength(SOUVENIRS_MAX);
    // Un frais et fort chasse le plus faible, c'est-à-dire le plus ancien.
    const plusAncien = Math.min(...l.map((x) => x.quand));
    l = ajouterSouvenir(l, sv("brusque", 0, 0.9), MAINTENANT);
    expect(l).toHaveLength(SOUVENIRS_MAX);
    expect(l.some((x) => x.genre === "brusque")).toBe(true);
    expect(l.some((x) => x.quand === plusAncien)).toBe(false);
    // Un souvenir minuscule et ancien n'entre pas au détriment des autres.
    const avant = l.map((x) => x.quand).join(",");
    l = ajouterSouvenir(l, { quand: MAINTENANT - 9 * J, genre: "retour", poids: 0.01 }, MAINTENANT);
    expect(l).toHaveLength(SOUVENIRS_MAX);
    expect(l.map((x) => x.quand).join(",")).toBe(avant);
  });

  it("une douleur ancienne s'élague avant une gentillesse du même âge (la demi-vie compte)", () => {
    let l: Souvenir[] = [];
    for (let k = 0; k < 20; k++) l = ajouterSouvenir(l, sv("brusque", 4 * J + k * H, 0.6), MAINTENANT);
    for (let k = 0; k < 20; k++) l = ajouterSouvenir(l, sv("gentil", 4 * J + k * H, 0.6), MAINTENANT);
    l = ajouterSouvenir(l, sv("panne", 0, 0.5), MAINTENANT);
    expect(l).toHaveLength(SOUVENIRS_MAX);
    expect(l.filter((x) => x.genre === "gentil")).toHaveLength(20);
    expect(l.filter((x) => x.genre === "brusque")).toHaveLength(19);
  });

  it("la liste rendue est triée du plus ancien au plus récent", () => {
    let l: Souvenir[] = [];
    for (const ilYa of [2 * H, 5 * H, H]) l = ajouterSouvenir(l, sv("gentil", ilYa), MAINTENANT);
    expect(l.map((x) => x.quand)).toEqual([...l.map((x) => x.quand)].sort((a, b) => a - b));
  });
});

describe("demi-vies et poids actuel", () => {
  it("les douleurs durent 2 jours, les gentillesses 5, retour et isolement 1", () => {
    for (const g of ["brusque", "ton", "panne"] as const) expect(SOUVENIR_DEMI_VIE_JOURS[g]).toBe(2);
    for (const g of ["gentil", "compliment"] as const) expect(SOUVENIR_DEMI_VIE_JOURS[g]).toBe(5);
    for (const g of ["retour", "isolement"] as const) expect(SOUVENIR_DEMI_VIE_JOURS[g]).toBe(1);
    expect(Object.keys(SOUVENIR_DEMI_VIE_JOURS).sort()).toEqual([...GENRES_SOUVENIR].sort());
  });

  it("le poids est divisé par deux à chaque demi-vie", () => {
    expect(poidsActuel(sv("brusque", 0, 0.8), MAINTENANT)).toBeCloseTo(0.8, 10);
    expect(poidsActuel(sv("brusque", 2 * J, 0.8), MAINTENANT)).toBeCloseTo(0.4, 10);
    expect(poidsActuel(sv("gentil", 5 * J, 0.8), MAINTENANT)).toBeCloseTo(0.4, 10);
    expect(poidsActuel(sv("retour", J, 0.8), MAINTENANT)).toBeCloseTo(0.4, 10);
    expect(poidsActuel(sv("isolement", J, 0.8), MAINTENANT)).toBeCloseTo(0.4, 10);
  });

  it("un souvenir du futur ne pèse pas plus que son poids, un invalide ne pèse rien, au-delà de 10 jours c'est oublié", () => {
    expect(poidsActuel({ quand: MAINTENANT + J, genre: "ton", poids: 0.6 }, MAINTENANT)).toBeCloseTo(0.6, 10);
    expect(poidsActuel({ quand: MAINTENANT, genre: "ton", poids: Number.NaN }, MAINTENANT)).toBe(0);
    expect(poidsActuel(sv("gentil", 10 * J, 1), MAINTENANT)).toBe(0);
    expect(poidsActuel(sv("gentil", 30 * J, 1), MAINTENANT)).toBe(0);
    expect(poidsActuel(sv("gentil", 9 * J, 1), MAINTENANT)).toBeGreaterThan(0);
  });

  it("le poids ne remonte jamais avec le temps", () => {
    let precedent = 2;
    for (let h = 0; h <= 11 * 24; h += 3) {
      const p = poidsActuel(sv("gentil", h * H, 1), MAINTENANT);
      expect(p).toBeLessThanOrEqual(precedent);
      precedent = p;
    }
  });
});

describe("humeurDeFond", () => {
  it("est nulle sans souvenir et reste bornée", () => {
    expect(humeurDeFond([], MAINTENANT)).toEqual({ rancune: 0, chaleur: 0 });
    const tous = GENRES_SOUVENIR.flatMap((g) => Array.from({ length: 10 }, (_, k) => sv(g, k * H, 1)));
    const f = humeurDeFond(tous, MAINTENANT);
    expect(f.rancune).toBeLessThanOrEqual(1);
    expect(f.chaleur).toBeLessThanOrEqual(1);
    expect(f.rancune).toBeGreaterThan(0.9);
  });

  it("monte après des souvenirs récents, du bon côté", () => {
    const dur = humeurDeFond([sv("brusque", H, 0.7), sv("ton", 2 * H, 0.6)], MAINTENANT);
    expect(dur.rancune).toBeGreaterThan(0.5);
    expect(dur.chaleur).toBe(0);
    const doux = humeurDeFond([sv("gentil", H, 0.7), sv("compliment", 2 * H, 0.6), sv("retour", 3 * H, 0.5)], MAINTENANT);
    expect(doux.chaleur).toBeGreaterThan(0.5);
    expect(doux.rancune).toBe(0);
    expect(humeurDeFond([sv("panne", H), sv("isolement", H)], MAINTENANT).rancune).toBeGreaterThan(0.5);
  });

  it("sature : la somme est 1 - exp(-x) des poids actuels", () => {
    const f = humeurDeFond([sv("brusque", 0, 0.5), sv("ton", 0, 0.25)], MAINTENANT);
    expect(f.rancune).toBeCloseTo(1 - Math.exp(-0.75), 10);
  });

  it("retombe sous 0,05 après 10 jours sans nouveau souvenir, pour chaque genre au poids maximal", () => {
    for (const g of GENRES_SOUVENIR) {
      expect(humeurDeFond([sv(g, 0, 1)], MAINTENANT).rancune + humeurDeFond([sv(g, 0, 1)], MAINTENANT).chaleur).toBeGreaterThan(0.5);
      const f = humeurDeFond([sv(g, 10 * J, 1)], MAINTENANT);
      expect(f.rancune).toBeLessThan(0.05);
      expect(f.chaleur).toBeLessThan(0.05);
    }
  });

  it("une rancune forte baisse jour après jour", () => {
    const l = [sv("ton", 0, 0.9), sv("brusque", MIN * 30, 0.9)];
    const parJour = [0, 1, 2, 4, 6, 8, 10].map((d) => humeurDeFond(l, MAINTENANT + d * J).rancune);
    for (let k = 1; k < parJour.length; k++) expect(parJour[k] as number).toBeLessThan(parJour[k - 1] as number);
    expect(parJour[parJour.length - 1] as number).toBeLessThan(0.05);
  });

  it("ignore les entrées invalides", () => {
    const f = humeurDeFond([{ quand: Number.NaN, genre: "ton", poids: 1 }, { quand: MAINTENANT, genre: "x" as never, poids: 1 }], MAINTENANT);
    expect(f).toEqual({ rancune: 0, chaleur: 0 });
  });
});

describe("phraseDeRetour : vraie par construction ou rien", () => {
  const dur = [sv("brusque", 20 * H, 0.8)];
  const pile = (x: number) => () => x;

  it("rien sans souvenir, rien après une absence de 6 h ou moins, rien après deux phrases du jour", () => {
    expect(phraseDeRetour([], 3 * J, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour(dur, 6 * H, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour(dur, 5 * H, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour(dur, 6 * H + 1, pile(0.3), MAINTENANT, 0)).not.toBeNull();
    expect(phraseDeRetour(dur, 2 * J, pile(0.3), MAINTENANT, 1)).not.toBeNull();
    expect(phraseDeRetour(dur, 2 * J, pile(0.3), MAINTENANT, 2)).toBeNull();
    expect(phraseDeRetour(dur, 2 * J, pile(0.3), MAINTENANT, 7)).toBeNull();
  });

  it("rien si tous les souvenirs sont oubliés ou invalides, rien pour une absence ou une date absurde", () => {
    expect(phraseDeRetour([sv("brusque", 12 * J, 1)], 3 * J, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour([{ quand: Number.NaN, genre: "ton", poids: 1 }], 3 * J, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour(dur, Number.NaN, pile(0.3), MAINTENANT, 0)).toBeNull();
    expect(phraseDeRetour(dur, 3 * J, pile(0.3), Number.NaN, 0)).toBeNull();
    expect(phraseDeRetour(dur, 3 * J, pile(0.3), MAINTENANT, Number.NaN)).toBeNull();
  });

  it("hasard fixe : toujours la même phrase, valide aux bornes (0, 1, négatif, NaN)", () => {
    const a = phraseDeRetour(dur, 2 * J, pile(0.4), MAINTENANT, 0);
    expect(phraseDeRetour(dur, 2 * J, pile(0.4), MAINTENANT, 0)).toBe(a);
    for (const r of [0, 0.999999, 1, 1.5, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const p = phraseDeRetour(dur, 2 * J, pile(r), MAINTENANT, 0);
      expect(typeof p).toBe("string");
      expect((p ?? "").length).toBeGreaterThan(3);
    }
  });

  it("parle d'hier quand la brusquerie date d'hier, et dit que ça va mieux quand c'est apaisé", () => {
    const hier = [sv("brusque", 20 * H, 0.3)];
    expect(humeurDeFond(hier, MAINTENANT).rancune).toBeLessThan(0.25);
    const toutes = new Set<string>();
    for (let k = 0; k < 50; k++) toutes.add(phraseDeRetour(hier, 8 * H, pile(k / 50), MAINTENANT, 0) ?? "");
    expect([...toutes].some((p) => p.startsWith("Hier"))).toBe(true);
    expect([...toutes].some((p) => p.includes("ça va mieux"))).toBe(true);
    expect([...toutes].every((p) => !/aujourd'hui|derniers jours/.test(p))).toBe(true);
  });

  it("ne dit pas que ça va mieux quand la rancune reste forte", () => {
    const fort = [sv("brusque", 20 * H, 0.9), sv("ton", 19 * H, 0.9), sv("brusque", 18 * H, 0.9)];
    expect(humeurDeFond(fort, MAINTENANT).rancune).toBeGreaterThan(0.25);
    for (let k = 0; k < 50; k++) expect(phraseDeRetour(fort, 8 * H, pile(k / 50), MAINTENANT, 0)).not.toMatch(/mieux/);
  });

  it("parle de gentillesse quand le souvenir dominant est gentil, et jamais de rudesse", () => {
    const l = [sv("gentil", 3 * J, 0.9), sv("gentil", 3 * J + 2 * H, 0.9)];
    const toutes = new Set<string>();
    for (let k = 0; k < 50; k++) toutes.add(phraseDeRetour(l, 2 * J, pile(k / 50), MAINTENANT, 0) ?? "");
    expect([...toutes].some((p) => /gentil/.test(p))).toBe(true);
    expect([...toutes].every((p) => !/rude|dur|mal/.test(p))).toBe(true);
  });

  it("choisit selon le souvenir dominant : la panne parle du réseau, l'isolement de solitude, le compliment de mots", () => {
    const dit = (l: Souvenir[]): string[] => {
      const s = new Set<string>();
      for (let k = 0; k < 50; k++) s.add(phraseDeRetour(l, 2 * J, pile(k / 50), MAINTENANT, 0) ?? "");
      return [...s];
    };
    expect(dit([sv("panne", 30 * H, 0.9)]).some((p) => /réseau|panne/.test(p))).toBe(true);
    expect(dit([sv("isolement", 8 * H, 0.9)]).some((p) => /seule|silence/.test(p))).toBe(true);
    expect(dit([sv("compliment", 8 * H, 0.9)]).some((p) => /mots|touchée/.test(p))).toBe(true);
    expect(dit([sv("retour", 8 * H, 0.9)]).some((p) => /revenu|revoilà/.test(p))).toBe(true);
  });

  it("la rancune l'emporte sur la chaleur quand elle est plus forte, et inversement", () => {
    const mixte = [sv("brusque", 20 * H, 0.9), sv("ton", 21 * H, 0.9), sv("gentil", 20 * H, 0.2)];
    const s = new Set<string>();
    for (let k = 0; k < 50; k++) s.add(phraseDeRetour(mixte, 2 * J, pile(k / 50), MAINTENANT, 0) ?? "");
    expect([...s].every((p) => !/gentil/.test(p))).toBe(true);
    const doux = [sv("gentil", 20 * H, 0.9), sv("compliment", 21 * H, 0.9), sv("brusque", 20 * H, 0.1)];
    const t = new Set<string>();
    for (let k = 0; k < 50; k++) t.add(phraseDeRetour(doux, 2 * J, pile(k / 50), MAINTENANT, 0) ?? "");
    expect([...t].every((p) => !/rude|dur/.test(p))).toBe(true);
  });

  it("« Ça faisait longtemps. » seulement après un jour d'absence, « Te revoilà. » sinon", () => {
    const toutes = (absence: number): string[] => Array.from({ length: 50 }, (_, k) => phraseDeRetour(dur, absence, pile(k / 50), MAINTENANT, 0) ?? "");
    expect(toutes(2 * J)).toContain("Ça faisait longtemps.");
    expect(toutes(2 * J)).not.toContain("Te revoilà.");
    expect(toutes(8 * H)).toContain("Te revoilà.");
    expect(toutes(8 * H)).not.toContain("Ça faisait longtemps.");
  });

  it("50 tirages variés : toutes les phrases de la liste sortent, sans émoji ni donnée personnelle", () => {
    const vus = new Map<string, number>();
    for (let k = 0; k < 50; k++) {
      const p = phraseDeRetour(dur, 2 * J, pile((k + 0.5) / 50), MAINTENANT, 0);
      expect(p).not.toBeNull();
      vus.set(p as string, (vus.get(p as string) ?? 0) + 1);
    }
    expect(vus.size).toBe(3);
    for (const p of vus.keys()) {
      expect(p).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(p).not.toMatch(/\d|@|http/);
    }
  });

  it("jamais deux fois de suite la même phrase quand on passe la dernière", () => {
    let derniere: string | null = null;
    for (let k = 0; k < 50; k++) {
      const p: string | null = phraseDeRetour(dur, 2 * J, pile(((k * 37) % 50) / 50), MAINTENANT, 0, derniere);
      expect(p).not.toBeNull();
      expect(p).not.toBe(derniere);
      derniere = p;
    }
  });

  it("ne dépend que des genres, jamais d'un texte : un souvenir avec un champ en plus ne change rien", () => {
    const avec = [{ ...dur[0], texte: "bonjour Jean Tremblay" } as Souvenir];
    for (let k = 0; k < 20; k++) {
      expect(phraseDeRetour(avec, 2 * J, pile(k / 20), MAINTENANT, 0)).toBe(phraseDeRetour(dur, 2 * J, pile(k / 20), MAINTENANT, 0));
      expect(phraseDeRetour(avec, 2 * J, pile(k / 20), MAINTENANT, 0)).not.toMatch(/Jean|Tremblay|bonjour/);
    }
  });
});
