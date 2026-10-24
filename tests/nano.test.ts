import { describe, expect, it } from "vitest";
import { accueil, avancerEssaim, creerEssaim, eclat, MARGE, nombreDeNano, positionOnde, rappeler, surLaCible, termine, type Zone } from "../src/nano.js";

/** Un hasard déterministe (mulberry32). */
const graine = (s: number): (() => number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const carte: Zone = { x: 300, y: 200, w: 430, h: 280 };
const corps = { x: 900, y: 600 };
const courir = (e: ReturnType<typeof creerEssaim>, secondes: number, zone: Zone = carte, source = corps): void => {
  for (let t = 0; t < secondes; t += 0.016) avancerEssaim(e, 0.016, zone, source);
};

describe("nanobots : l'essaim qui analyse", () => {
  it("ils sont toujours cent, comme les traits de son corps, quelle que soit la taille de l'élément", () => {
    expect(nombreDeNano()).toBe(100);
    expect(creerEssaim({ x: 0, y: 0, w: 20, h: 14 }, corps, graine(1)).bots).toHaveLength(100);
    expect(creerEssaim({ x: 0, y: 0, w: 0, h: 0 }, corps, graine(2)).bots).toHaveLength(100);
    expect(creerEssaim(carte, corps, graine(3)).bots).toHaveLength(100);
  });

  it("ils sortent de son corps en filet, puis se répartissent sur l'élément (au moins 90 % dessus après 2 s)", () => {
    const e = creerEssaim(carte, corps, graine(1));
    expect(e.bots.every((b) => !b.sorti && b.x === corps.x && b.y === corps.y)).toBe(true);
    courir(e, 0.3);
    const sortis = e.bots.filter((b) => b.sorti).length;
    expect(sortis).toBeGreaterThan(5);
    expect(sortis).toBeLessThan(e.bots.length);
    courir(e, 1.9);
    expect(e.bots.every((b) => b.sorti)).toBe(true);
    expect(surLaCible(e, carte)).toBeGreaterThanOrEqual(0.9);
  });

  it("ils couvrent la surface : des nanobots dans chacun des quatre quarts de l'élément", () => {
    const e = creerEssaim(carte, corps, graine(2));
    courir(e, 3);
    for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const n = e.bots.filter((b) => (b.x > carte.x + carte.w / 2 ? 1 : 0) === qx && (b.y > carte.y + carte.h / 2 ? 1 : 0) === qy).length;
      expect(n, `quart ${qx},${qy}`).toBeGreaterThan(4);
    }
  });

  it("ils suivent l'élément quand il bouge (défilement)", () => {
    const e = creerEssaim(carte, corps, graine(3));
    courir(e, 2);
    const plusBas = { ...carte, y: carte.y + 300 };
    courir(e, 2, plusBas);
    expect(surLaCible(e, plusBas)).toBeGreaterThanOrEqual(0.9);
  });

  it("un très petit élément reçoit quand même un essaim lisible, tout près de lui", () => {
    const petit: Zone = { x: 500, y: 300, w: 20, h: 14 };
    const e = creerEssaim(petit, corps, graine(4));
    courir(e, 2.5, petit);
    expect(e.bots.length).toBe(100);
    expect(surLaCible(e, petit)).toBeGreaterThanOrEqual(0.9);
  });

  it("l'onde de lecture passe sur l'élément : l'éclat se déplace d'un bord à l'autre", () => {
    const e = creerEssaim(carte, corps, graine(5), "doux");
    const eclatPres = (u: number): number => {
      e.age = 0;
      // Âge qui place l'onde en u (de -0,25 à 1,25).
      e.age = ((u + 0.25) / 1.5) * 1.9;
      const proche = e.bots.reduce((m, _b, i) => Math.max(m, eclat(e, i, carte)), 0);
      return proche;
    };
    expect(positionOnde(0)).toBeCloseTo(-0.25, 6);
    expect(eclatPres(0.5)).toBeGreaterThan(0.5);
    // Les nanobots les plus éclairés changent de côté avec l'onde.
    const moyenneX = (u: number): number => {
      e.age = ((u + 0.25) / 1.5) * 1.9;
      let s = 0;
      let w = 0;
      e.bots.forEach((b, i) => {
        const l = eclat(e, i, carte);
        s += b.x * l;
        w += l;
      });
      return s / Math.max(w, 1e-9);
    };
    expect(moyenneX(0.2)).toBeLessThan(moyenneX(0.8));
  });

  it("« doux » : ils naissent sur l'élément, sans traverser l'écran ; « fixe » : ils ne bougent plus", () => {
    const d = creerEssaim(carte, corps, graine(6), "doux");
    expect(d.bots.every((b) => b.sorti)).toBe(true);
    expect(surLaCible(d, carte)).toBe(1);
    const f = creerEssaim(carte, corps, graine(6), "fixe");
    const avant = f.bots.map((b) => [b.x, b.y]);
    courir(f, 2);
    expect(f.bots.map((b) => [b.x, b.y])).toEqual(avant);
  });

  it("rappelés, ils rentrent tous dans son corps (et un essaim jamais sorti rentre aussitôt)", () => {
    const e = creerEssaim(carte, corps, graine(7));
    courir(e, 2);
    expect(termine(e)).toBe(false);
    rappeler(e);
    courir(e, 3);
    expect(termine(e)).toBe(true);
    const neuf = creerEssaim(carte, corps, graine(8));
    rappeler(neuf);
    courir(neuf, 0.1);
    expect(termine(neuf)).toBe(true);
  });

  it("stable : un pas énorme ou NaN ne fait ni diverger ni NaN", () => {
    const e = creerEssaim(carte, corps, graine(9));
    avancerEssaim(e, 5, carte, corps);
    avancerEssaim(e, Number.NaN, carte, corps);
    courir(e, 2);
    for (const b of e.bots) {
      expect(Number.isFinite(b.x + b.y + b.vx + b.vy)).toBe(true);
      expect(Math.abs(b.x)).toBeLessThan(5000);
    }
  });

  it("les places d'accueil restent dans l'élément élargi de sa marge, et un sur cinq est sur le bord", () => {
    const e = creerEssaim(carte, corps, graine(10), "doux");
    let bord = 0;
    e.bots.forEach((b, i) => {
      const a = accueil(i, e.bots.length, carte, b);
      expect(a.x).toBeGreaterThanOrEqual(carte.x - MARGE - 0.001);
      expect(a.x).toBeLessThanOrEqual(carte.x + carte.w + MARGE + 0.001);
      expect(a.y).toBeGreaterThanOrEqual(carte.y - MARGE - 0.001);
      expect(a.y).toBeLessThanOrEqual(carte.y + carte.h + MARGE + 0.001);
      if (i % 5 === 0 && (Math.abs(a.x - (carte.x - MARGE)) < 0.01 || Math.abs(a.x - (carte.x + carte.w + MARGE)) < 0.01 || Math.abs(a.y - (carte.y - MARGE)) < 0.01 || Math.abs(a.y - (carte.y + carte.h + MARGE)) < 0.01)) bord++;
    });
    expect(bord).toBe(Math.ceil(e.bots.length / 5));
  });
});
