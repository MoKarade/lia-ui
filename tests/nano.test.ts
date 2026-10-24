import { describe, expect, it } from "vitest";
import { accueil, avancerEssaim, COINS, creerEssaim, eclat, LIGNE, longueurCoin, MARGE, nombreDeNano, place, positionOnde, rappeler, roleDe, surLaCible, termine, type Zone } from "../src/nano.js";

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

  it("le balayage descend de haut en bas puis remonte : la ligne et les points qu'elle croise s'allument", () => {
    const e = creerEssaim(carte, corps, graine(5), "doux");
    expect(positionOnde(0)).toBe(0);
    expect(positionOnde(1 / 0.45 / 2)).toBeCloseTo(0.5, 6);
    expect(positionOnde(1 / 0.45)).toBeCloseTo(1, 6);
    // Il remonte ensuite sans sauter : jamais plus de 3 % d'écart entre deux images à 60 Hz.
    for (let t = 0; t < 10; t += 0.016) expect(Math.abs(positionOnde(t + 0.016) - positionOnde(t))).toBeLessThan(0.03);
    const centreY = (u: number): number => {
      e.age = (Math.acos(1 - 2 * u) * (2 / 0.45)) / (2 * Math.PI);
      let s = 0;
      let w = 0;
      e.bots.forEach((b, i) => {
        const l = eclat(e, i, carte);
        if (b.role !== "point") return;
        s += b.y * l;
        w += l;
      });
      return s / Math.max(w, 1e-9);
    };
    expect(centreY(0.2)).toBeLessThan(centreY(0.5));
    expect(centreY(0.5)).toBeLessThan(centreY(0.8));
    // À mi-course, les points proches de la ligne sont éclairés, ceux qui en sont loin non.
    e.age = 1 / 0.45 / 2;
    const lumiere = e.bots.map((b, i) => ({ b, l: eclat(e, i, carte) })).filter((x) => x.b.role === "point");
    expect(lumiere.some((x) => x.l > 0.6)).toBe(true);
    expect(lumiere.some((x) => x.l === 0)).toBe(true);
  });

  it("ils dessinent l'animation d'analyse : 24 tiennent les quatre coins, 28 forment la ligne, les autres sont des points de lecture", () => {
    expect(roleDe(0)).toBe("coin");
    expect(roleDe(COINS - 1)).toBe("coin");
    expect(roleDe(COINS)).toBe("ligne");
    expect(roleDe(COINS + LIGNE)).toBe("point");
    const e = creerEssaim(carte, corps, graine(11), "doux");
    courir(e, 3);
    const l = longueurCoin(carte) + 2;
    // Chaque coin de l'élément a six nanobots collés à lui, sur ses deux branches.
    for (const [cx, cy] of [[carte.x - MARGE, carte.y - MARGE], [carte.x + carte.w + MARGE, carte.y - MARGE], [carte.x + carte.w + MARGE, carte.y + carte.h + MARGE], [carte.x - MARGE, carte.y + carte.h + MARGE]] as const) {
      const proches = e.bots.filter((b) => b.role === "coin" && Math.abs(b.x - cx) <= l && Math.abs(b.y - cy) <= l);
      expect(proches.length, `coin ${cx},${cy}`).toBe(6);
    }
    // La ligne court sur toute la largeur, à une même hauteur.
    const ligne = e.bots.filter((b) => b.role === "ligne");
    expect(ligne).toHaveLength(LIGNE);
    const ys = ligne.map((b) => b.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(10);
    const xs = ligne.map((b) => b.x);
    expect(Math.min(...xs)).toBeLessThan(carte.x + carte.w * 0.1);
    expect(Math.max(...xs)).toBeGreaterThan(carte.x + carte.w * 0.9);
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

  it("les places restent sur l'élément élargi de sa marge : coins au contour, ligne dans la largeur, points dedans", () => {
    const e = creerEssaim(carte, corps, graine(10), "doux");
    e.bots.forEach((b, i) => {
      const a = place(i, e.bots.length, carte, b, 0.5);
      expect(a.x).toBeGreaterThanOrEqual(carte.x - MARGE - 0.001);
      expect(a.x).toBeLessThanOrEqual(carte.x + carte.w + MARGE + 0.001);
      expect(a.y).toBeGreaterThanOrEqual(carte.y - MARGE - 0.001);
      expect(a.y).toBeLessThanOrEqual(carte.y + carte.h + MARGE + 0.001);
      if (b.role === "point") {
        const p = accueil(i, e.bots.length, carte, b);
        expect(p.x).toBeGreaterThanOrEqual(carte.x);
        expect(p.x).toBeLessThanOrEqual(carte.x + carte.w);
        expect(p.y).toBeGreaterThanOrEqual(carte.y);
        expect(p.y).toBeLessThanOrEqual(carte.y + carte.h);
      }
    });
  });

  it("un très petit élément garde ses quatre coins distincts et une longueur de branche bornée", () => {
    const petit: Zone = { x: 500, y: 300, w: 20, h: 14 };
    expect(longueurCoin(petit)).toBe(5);
    expect(longueurCoin({ x: 0, y: 0, w: 4000, h: 3000 })).toBe(28);
  });
});
