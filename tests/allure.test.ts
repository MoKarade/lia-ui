import { describe, expect, it } from "vitest";
import { deriveAuRepos, jerkMinimal, planifierTrajet, pointDuTrajet, prochainPetitPas, type Point } from "../src/allure.js";

const graine = (s: number): (() => number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const calme = { energie: 0.5, nervosite: 0.2 };
const A: Point = { x: 100, y: 500 };
const B: Point = { x: 800, y: 300 };
/** Le trajet échantillonné toutes les 20 ms jusqu'à la fin. */
const echantillons = (tr: ReturnType<typeof planifierTrajet>): Array<Point & { fini: boolean }> => {
  const o = [];
  for (let t = 0; t <= tr.total + 0.05; t += 0.02) o.push(pointDuTrajet(tr, t));
  return o;
};
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
/** Écart (px) de ce point à la droite AB. */
const ecartDroite = (p: Point, a: Point, b: Point): number => Math.abs((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / distance(a, b);

describe("jerk minimal", () => {
  it("part et arrive à vitesse nulle, monte sans à-coup, borné", () => {
    expect(jerkMinimal(0)).toBe(0);
    expect(jerkMinimal(1)).toBe(1);
    expect(jerkMinimal(0.5)).toBeCloseTo(0.5, 9);
    expect(jerkMinimal(-3)).toBe(0);
    expect(jerkMinimal(9)).toBe(1);
    expect(jerkMinimal(0.02)).toBeLessThan(0.001);
    let prec = 0;
    for (let u = 0; u <= 1; u += 0.01) {
      const v = jerkMinimal(u);
      expect(v).toBeGreaterThanOrEqual(prec - 1e-12);
      prec = v;
    }
  });
});

describe("un trajet naturel", () => {
  it("part de son départ, arrive exactement à son but et s'y arrête", () => {
    for (let s = 1; s <= 30; s++) {
      const tr = planifierTrajet(A, B, graine(s), calme);
      const e = echantillons(tr);
      expect(distance(e[0] as Point, A)).toBeLessThan(0.5);
      const dernier = pointDuTrajet(tr, tr.total + 5);
      expect(dernier.fini).toBe(true);
      expect(dernier.x).toBe(B.x);
      expect(dernier.y).toBe(B.y);
    }
  });

  it("n'est pas une ligne droite : un arc qui s'écarte d'un côté ou de l'autre, jamais de plus de 17 % de la distance", () => {
    const d = distance(A, B);
    let gauche = 0;
    let droite = 0;
    let maxEcart = 0;
    for (let s = 1; s <= 60; s++) {
      const tr = planifierTrajet(A, B, graine(s), calme);
      let signe = 0;
      for (const p of echantillons(tr)) {
        const e = ecartDroite(p, A, B);
        maxEcart = Math.max(maxEcart, e);
        if (e > 8 && signe === 0) signe = (B.x - A.x) * (p.y - A.y) - (B.y - A.y) * (p.x - A.x) > 0 ? 1 : -1;
      }
      if (signe > 0) gauche++;
      else if (signe < 0) droite++;
    }
    expect(maxEcart).toBeGreaterThan(20);
    expect(maxEcart).toBeLessThan(d * 0.2);
    expect(gauche).toBeGreaterThan(10);
    expect(droite).toBeGreaterThan(10);
  });

  it("sa vitesse est en cloche : lente au départ et à l'arrivée, plus vive au milieu", () => {
    const tr = planifierTrajet(A, B, graine(11), { energie: 0.5, nervosite: 0 });
    const sansAleas = { ...tr, pause: null, correction: 0, fin: tr.but, total: tr.duree };
    const e = echantillons(sansAleas);
    const vit = (i: number): number => distance(e[i] as Point, e[i - 1] as Point) / 0.02;
    const milieu = Math.floor(e.length / 2);
    expect(vit(3)).toBeLessThan(vit(milieu) * 0.35);
    expect(vit(e.length - 3)).toBeLessThan(vit(milieu) * 0.35);
  });

  it("chaque trajet a sa vitesse et sa durée : jamais deux pareils, durée bornée de 0,55 à 4,2 s", () => {
    const durees = Array.from({ length: 80 }, (_, i) => planifierTrajet(A, B, graine(i + 100), calme).duree);
    expect(Math.min(...durees)).toBeGreaterThanOrEqual(0.55);
    expect(Math.max(...durees)).toBeLessThanOrEqual(4.2);
    const moyenne = durees.reduce((a, b) => a + b, 0) / durees.length;
    const ecartType = Math.sqrt(durees.reduce((a, b) => a + (b - moyenne) ** 2, 0) / durees.length);
    expect(ecartType / moyenne).toBeGreaterThan(0.12);
    expect(new Set(durees.map((d) => d.toFixed(3))).size).toBeGreaterThan(60);
  });

  it("l'énergie l'accélère, la nervosité la fait hésiter et corriger", () => {
    const moyenneDuree = (p: { energie: number; nervosite: number }): number => {
      let s = 0;
      for (let i = 0; i < 80; i++) s += planifierTrajet(A, B, graine(i + 500), p).duree;
      return s / 80;
    };
    expect(moyenneDuree({ energie: 1, nervosite: 0 })).toBeLessThan(moyenneDuree({ energie: 0, nervosite: 0 }) * 0.85);
    const compte = (p: { energie: number; nervosite: number }, f: (t: ReturnType<typeof planifierTrajet>) => boolean): number =>
      Array.from({ length: 200 }, (_, i) => planifierTrajet(A, B, graine(i + 900), p)).filter(f).length;
    expect(compte({ energie: 0.5, nervosite: 1 }, (t) => t.pause !== null)).toBeGreaterThan(compte({ energie: 0.5, nervosite: 0 }, (t) => t.pause !== null) + 15);
    expect(compte({ energie: 0.5, nervosite: 1 }, (t) => t.correction > 0)).toBeGreaterThan(compte({ energie: 0.5, nervosite: 0 }, (t) => t.correction > 0) + 10);
  });

  it("une hésitation fige sa position ; un dépassement passe le but puis revient", () => {
    let pause = null as ReturnType<typeof planifierTrajet> | null;
    let depasse = null as ReturnType<typeof planifierTrajet> | null;
    for (let s = 1; s < 400 && !(pause && depasse); s++) {
      const tr = planifierTrajet(A, B, graine(s), { energie: 0.3, nervosite: 1 });
      if (tr.pause && !pause) pause = tr;
      if (tr.correction > 0 && !depasse) depasse = tr;
    }
    expect(pause).not.toBeNull();
    expect(depasse).not.toBeNull();
    const p = pause as ReturnType<typeof planifierTrajet>;
    const debut = p.pause!.a * p.duree;
    const avant = pointDuTrajet(p, debut + 0.01);
    const apres = pointDuTrajet(p, debut + p.pause!.duree - 0.01);
    expect(distance(avant, apres)).toBeLessThan(0.5);
    expect(pointDuTrajet(p, debut + p.pause!.duree + 0.3).x).not.toBe(apres.x);
    const d = depasse as ReturnType<typeof planifierTrajet>;
    // Au bout du trajet principal elle est au-delà de son but (sur l'axe de la marche), puis la correction la ramène dessus.
    const finPrincipale = pointDuTrajet(d, d.duree + (d.pause?.duree ?? 0) - 0.001);
    expect(distance(finPrincipale, d.depart)).toBeGreaterThan(distance(d.but, d.depart));
    expect(pointDuTrajet(d, d.total + 1)).toMatchObject({ x: B.x, y: B.y, fini: true });
  });

  it("un trajet court reste presque droit, sans hésitation ni dépassement", () => {
    for (let s = 1; s <= 50; s++) {
      const tr = planifierTrajet(A, { x: A.x + 30, y: A.y + 10 }, graine(s), { energie: 0.1, nervosite: 1 });
      expect(tr.pause).toBeNull();
      expect(tr.correction).toBe(0);
      for (const p of echantillons(tr)) expect(ecartDroite(p, A, { x: A.x + 30, y: A.y + 10 })).toBeLessThan(0.01);
    }
  });

  it("jamais de NaN : but = départ, valeurs absurdes", () => {
    const tr = planifierTrajet(A, A, graine(1), calme);
    expect(pointDuTrajet(tr, 0).fini).toBe(true);
    const fou = planifierTrajet(A, B, graine(2), { energie: Number.NaN, nervosite: 99 });
    expect(Number.isFinite(fou.total)).toBe(true);
    expect(Number.isFinite(pointDuTrajet(fou, Number.NaN).x)).toBe(true);
    expect(pointDuTrajet(fou, -4)).toMatchObject({ x: A.x, y: A.y });
  });
});

describe("au repos", () => {
  it("elle dérive doucement sans jamais se figer ni s'éloigner de plus de l'amplitude", () => {
    let max = 0;
    const xs = new Set<string>();
    for (let t = 0; t < 120; t += 0.5) {
      const d = deriveAuRepos(t, 3.7, 4);
      max = Math.max(max, Math.hypot(d.x, d.y));
      xs.add(d.x.toFixed(2));
    }
    expect(max).toBeGreaterThan(1.5);
    expect(max).toBeLessThanOrEqual(4 * 1.3);
    expect(xs.size).toBeGreaterThan(150);
    expect(deriveAuRepos(10, 1, 0).x).toBeCloseTo(0, 9);
    expect(deriveAuRepos(10, 1, 0).y).toBeCloseTo(0, 9);
  });

  it("ses petits pas de côté sont très inégaux dans le temps : de moins de 4 s à plus de 30 s", () => {
    const h = graine(42);
    const delais = Array.from({ length: 400 }, () => prochainPetitPas(h, 0.5).delai);
    expect(Math.min(...delais)).toBeLessThan(4);
    expect(Math.max(...delais)).toBeGreaterThan(30);
    expect(Math.min(...delais)).toBeGreaterThanOrEqual(1.6);
    expect(Math.max(...delais)).toBeLessThanOrEqual(70);
    const triees = [...delais].sort((a, b) => a - b);
    const mediane = triees[200] as number;
    expect(mediane).toBeGreaterThan(4);
    expect(mediane).toBeLessThan(14);
  });

  it("plus d'énergie, des pas plus fréquents ; chaque pas fait de 7 à 22 px", () => {
    const h = graine(7);
    const moy = (e: number): number => Array.from({ length: 300 }, () => prochainPetitPas(h, e).delai).reduce((a, b) => a + b, 0) / 300;
    expect(moy(1)).toBeLessThan(moy(0) * 0.7);
    for (let i = 0; i < 100; i++) {
      const p = prochainPetitPas(h, 0.5);
      const r = Math.hypot(p.dx, p.dy / 0.6);
      expect(r).toBeGreaterThanOrEqual(6.99);
      expect(r).toBeLessThanOrEqual(22.01);
    }
  });
});
