import { describe, expect, it } from "vitest";
import { auRepos, avancerBalle, BALLE_DEFAUT, ECRASEMENT_MAX, energie, frapper, normaleDe, relacherEcrasement, vitessePourBond, type Corps, type Ecrasement, type ParamsBalle } from "../src/physique.js";

const zone = { x: 0, y: 0, w: 1000, h: 700 };
const p: ParamsBalle = { ...BALLE_DEFAUT, marge: 60 };
const simuler = (c: Corps, secondes: number, pas: number): { impacts: ReturnType<typeof avancerBalle>; trace: Corps[] } => {
  const impacts: ReturnType<typeof avancerBalle> = [];
  const trace: Corps[] = [];
  for (let t = 0; t < secondes; t += pas) {
    impacts.push(...avancerBalle(c, pas, zone, p));
    trace.push({ ...c });
  }
  return { impacts, trace };
};

describe("la balle : élan, gravité, rebonds", () => {
  it("ne sort jamais de sa zone, et son énergie ne croît jamais", () => {
    const c: Corps = { x: 300, y: 200, vx: 1800, vy: -900 };
    let e = energie(c, zone, p);
    for (let i = 0; i < 1200; i++) {
      avancerBalle(c, 1 / 60, zone, p);
      expect(c.x).toBeGreaterThanOrEqual(zone.x + p.marge - 1e-6);
      expect(c.x).toBeLessThanOrEqual(zone.x + zone.w - p.marge + 1e-6);
      expect(c.y).toBeGreaterThanOrEqual(zone.y + p.marge - 1e-6);
      expect(c.y).toBeLessThanOrEqual(zone.y + zone.h - p.marge + 1e-6);
      const suivante = energie(c, zone, p);
      expect(suivante).toBeLessThanOrEqual(e + 1e-6);
      e = suivante;
    }
  });

  it("un rebond renverse la vitesse normale et en rend la restitution", () => {
    const c: Corps = { x: 900, y: 300, vx: 1000, vy: 0 };
    const sans: ParamsBalle = { ...p, gravite: 0, frottement: 0 };
    const impacts = avancerBalle(c, 0.25, zone, sans);
    expect(impacts).toHaveLength(1);
    expect(impacts[0]?.cote).toBe("droite");
    expect(impacts[0]?.vitesse).toBeCloseTo(1000, 3);
    expect(c.vx).toBeCloseTo(-1000 * p.restitutionMur, 3);
    const s: Corps = { x: 500, y: 600, vx: 0, vy: 800 };
    const sol = avancerBalle(s, 0.2, zone, { ...p, gravite: 0, frottement: 0 });
    expect(sol[0]?.cote).toBe("bas");
    expect(s.vy).toBeCloseTo(-800 * p.restitutionSol, 3);
  });

  it("rebondit plusieurs fois puis se pose en moins de 8 s", () => {
    const c: Corps = { x: 200, y: 150, vx: 1400, vy: -600 };
    const { impacts, trace } = simuler(c, 8, 1 / 60);
    expect(impacts.length).toBeGreaterThanOrEqual(4);
    expect(impacts.some((i) => i.cote === "bas")).toBe(true);
    expect(impacts.some((i) => i.cote === "droite")).toBe(true);
    expect(auRepos(c, zone, p)).toBe(true);
    // Posée, elle ne bouge plus.
    const fin = trace[trace.length - 1] as Corps;
    avancerBalle(c, 1, zone, p);
    expect(Math.hypot(c.x - fin.x, c.y - fin.y)).toBeLessThan(2);
  });

  it("ne dépend pas de la taille du pas", () => {
    const a: Corps = { x: 200, y: 200, vx: 900, vy: -300 };
    const b: Corps = { ...a };
    simuler(a, 1.5, 1 / 30);
    simuler(b, 1.5, 1 / 240);
    expect(Math.abs(a.x - b.x)).toBeLessThan(25);
    expect(Math.abs(a.y - b.y)).toBeLessThan(25);
  });

  it("un pas absurde (NaN, négatif, énorme) ne la fait pas diverger", () => {
    const c: Corps = { x: 500, y: 300, vx: 100, vy: 0 };
    for (const dt of [Number.NaN, -1, 1e9]) {
      avancerBalle(c, dt, zone, p);
      expect(Number.isFinite(c.x + c.y + c.vx + c.vy)).toBe(true);
      expect(c.y).toBeLessThanOrEqual(zone.h);
    }
  });

  it("une zone plus petite que ses marges la garde au centre sans erreur", () => {
    const c: Corps = { x: 5, y: 5, vx: 500, vy: 500 };
    expect(() => avancerBalle(c, 0.1, { x: 0, y: 0, w: 50, h: 50 }, p)).not.toThrow();
    expect(Number.isFinite(c.x + c.y)).toBe(true);
  });

  it("les normales regardent vers l'intérieur de la zone", () => {
    expect(normaleDe("gauche")).toEqual({ x: 1, y: 0 });
    expect(normaleDe("droite")).toEqual({ x: -1, y: 0 });
    expect(normaleDe("haut")).toEqual({ x: 0, y: 1 });
    expect(normaleDe("bas")).toEqual({ x: 0, y: -1 });
  });
});

describe("l'écrasement à l'impact", () => {
  const neuf = (): Ecrasement => ({ s: 0, v: 0, angle: 0 });

  it("un impact fort écrase jusqu'à 28 %, un impact faible à peine, un tout petit pas du tout", () => {
    const fort = neuf();
    frapper(fort, 5000, { x: 0, y: -1 });
    expect(fort.s).toBeCloseTo(ECRASEMENT_MAX, 5);
    expect(fort.angle).toBeCloseTo(-Math.PI / 2, 5);
    const moyen = neuf();
    frapper(moyen, 360, { x: 1, y: 0 });
    expect(moyen.s).toBeCloseTo(0.2, 5);
    const rien = neuf();
    frapper(rien, 0, { x: 1, y: 0 });
    expect(rien.s).toBe(0);
  });

  it("se détend en se balançant un peu (sous-amorti), puis revient à zéro", () => {
    const e = neuf();
    frapper(e, 1800, { x: 0, y: -1 });
    let min = e.s;
    for (let i = 0; i < 180; i++) {
      relacherEcrasement(e, 1 / 60);
      min = Math.min(min, e.s);
    }
    expect(min).toBeLessThan(0);
    expect(min).toBeGreaterThanOrEqual(-0.12);
    expect(e.s).toBe(0);
    expect(e.v).toBe(0);
  });
});

describe("le bond : arriver au point voulu à l'heure dite", () => {
  const libre = { x: -1e6, y: -1e6, w: 2e6, h: 2e6 };
  it("part avec la vitesse qui la dépose sur le but à moins de 2 px, vers le haut, le bas, la gauche ou la droite", () => {
    for (const [dx, dy, T] of [[400, -150, 0.8], [-600, 220, 0.9], [90, -300, 0.7], [-30, 40, 0.6]] as const) {
      const depart = { x: 500, y: 400 };
      const but = { x: depart.x + dx, y: depart.y + dy };
      const v = vitessePourBond(depart, but, T, { ...BALLE_DEFAUT, marge: 0 });
      const c: Corps = { ...depart, ...v };
      for (let t = 0; t < T - 1e-9; t += 0.1) avancerBalle(c, Math.min(0.1, T - t), libre, { ...BALLE_DEFAUT, marge: 0 });
      expect(Math.hypot(c.x - but.x, c.y - but.y)).toBeLessThan(2);
    }
  });

  it("monte d'abord : l'arc passe au-dessus du but quand il est loin sur le côté", () => {
    const depart = { x: 100, y: 500 };
    const but = { x: 700, y: 500 };
    const v = vitessePourBond(depart, but, 0.9, { ...BALLE_DEFAUT, marge: 0 });
    expect(v.vy).toBeLessThan(-200);
    expect(v.vx).toBeGreaterThan(600);
  });

  it("une durée absurde ne donne ni NaN ni vitesse infinie", () => {
    const v = vitessePourBond({ x: 0, y: 0 }, { x: 300, y: 0 }, -5, { ...BALLE_DEFAUT, marge: 0 });
    expect(Number.isFinite(v.vx + v.vy)).toBe(true);
  });
});
