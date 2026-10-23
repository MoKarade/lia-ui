import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const position = (): [number, number] => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/.exec(document.querySelector<HTMLElement>(".lia-ui__corps")?.style.transform ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [Number.NaN, Number.NaN];
};
const toile = (): string => document.querySelector<HTMLElement>(".lia-ui__toile")?.style.transform ?? "";
/** L'angle d'inclinaison du corps (radians), lu sur la toile. */
const inclinaison = (): number => Number(/rotate\((-?[\d.]+)rad\)/.exec(toile())?.[1] ?? 0);

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true }); // comme le navigateur de Marc ; l'hôte passe « complet »
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1400, bottom: 900 });
    if (this.id === "carte") return rectDe({ left: 900, top: 500, right: 1200, bottom: 700 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<section id="carte" data-lia-cible>Une carte</section>`;
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

/** 62,5 images par seconde : une image toutes les 16 ms exactement, pour que l'échantillonnage du test ne crée pas de faux sauts. */
const PAS_MS = 16;
const monter = (opts: Parameters<typeof mountLia>[0], fps = 1000 / PAS_MS): void => {
  vi.useFakeTimers();
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 1000 / fps) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  lia = mountLia({ quandMouvementReduit: "complet", vieAutonome: false, ...opts });
  vi.advanceTimersByTime(1500);
};

/** Suit sa position image par image pendant `secondes`. */
const trace = (secondes: number): Array<{ t: number; x: number; y: number; incl: number; transformToile: string }> => {
  const points = [];
  for (let i = 0; i < (secondes * 1000) / PAS_MS; i++) {
    vi.advanceTimersByTime(PAS_MS);
    const [x, y] = position();
    points.push({ t: ((i + 1) * PAS_MS) / 1000, x, y, incl: inclinaison(), transformToile: toile() });
  }
  return points;
};

describe("quand elle va quelque part, elle a une masse", () => {
  it("elle part doucement, atteint une pointe de vitesse au milieu, ne se téléporte jamais", () => {
    monter({});
    const depart = position();
    expect(lia?.allerVoir(document.getElementById("carte") as HTMLElement, 10)).toBe(true);
    const pts = trace(4);
    const pas = pts.map((p, i) => Math.hypot(p.x - (i ? (pts[i - 1] as typeof p).x : depart[0]), p.y - (i ? (pts[i - 1] as typeof p).y : depart[1])));
    const vitesse = pas.map((d) => (d * 1000) / PAS_MS); // px/s
    expect(Math.max(...pas), "un pas de plus de 30 px en une image = une téléportation").toBeLessThan(30);
    expect(Math.max(...vitesse), "vitesse de pointe").toBeGreaterThan(400);
    expect(vitesse.slice(0, 3).every((v) => v < 250), "les trois premières images : elle démarre doucement").toBe(true);
    const iPointe = vitesse.indexOf(Math.max(...vitesse));
    expect(iPointe, "la pointe n'est ni au tout début ni à la fin").toBeGreaterThan(6);
    expect(iPointe).toBeLessThan(pts.length - 30);
  });

  it("l'accélération reste humaine : pas de saut de vitesse d'une image à l'autre", () => {
    monter({});
    lia?.allerVoir(document.getElementById("carte") as HTMLElement, 10);
    const pts = trace(4);
    const v = pts.map((p, i) => (i ? (Math.hypot(p.x - (pts[i - 1] as typeof p).x, p.y - (pts[i - 1] as typeof p).y) * 1000) / PAS_MS : 0));
    let pire = 0;
    for (let i = 2; i < v.length - 1; i++) pire = Math.max(pire, Math.abs(((v[i + 1] as number) - (v[i - 1] as number)) / ((2 * PAS_MS) / 1000)));
    expect(pire, "px/s²").toBeLessThan(9000);
  });

  it("elle se penche dans le sens de sa course, puis se redresse en arrivant", () => {
    monter({});
    lia?.allerVoir(document.getElementById("carte") as HTMLElement, 10);
    const pts = trace(9);
    const pic = Math.max(...pts.map((p) => Math.abs(p.incl)));
    expect(pic, "inclinaison maximale (rad)").toBeGreaterThan(0.03);
    expect(pic, "jamais plus de 12°").toBeLessThan(0.2);
    expect(Math.abs((pts[pts.length - 1] as { incl: number }).incl), "redressée à l'arrivée").toBeLessThan(0.02);
  });

  it("elle s'étire le long de sa course quand elle file, et reprend sa forme à l'arrêt", () => {
    monter({});
    lia?.allerVoir(document.getElementById("carte") as HTMLElement, 10);
    const pts = trace(9);
    expect(pts.some((p) => /scale\(1\.0\d+,0\.9\d+\)/.test(p.transformToile))).toBe(true);
    expect((pts[pts.length - 1] as { transformToile: string }).transformToile).not.toContain("scale(");
  });

  it("elle ne reste pas figée à l'arrivée : un léger flottement la garde vivante", () => {
    monter({ vieAutonome: true });
    lia?.allerVoir(document.getElementById("carte") as HTMLElement, 30);
    trace(8);
    const pts = trace(10);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys), "amplitude du flottement (px)").toBeGreaterThan(3);
  });

  it("« La laisser tranquille » (vie coupée) : elle ne flotte plus, elle reste posée", () => {
    monter({ vieAutonome: true });
    lia?.setVieAutonome(false);
    vi.advanceTimersByTime(8000); // le temps de se poser
    const a = position();
    trace(10);
    const b = position();
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeLessThan(1);
  });

  it("mouvement réduit « doux » : aucun effet physique, elle se pose d'un coup, droite", () => {
    vi.useFakeTimers();
    lia = mountLia({ quandMouvementReduit: "doux", vieAutonome: false });
    lia.allerVoir(document.getElementById("carte") as HTMLElement, 10);
    const pts = trace(3);
    for (const p of pts) {
      expect(Math.abs(p.incl)).toBeLessThan(1e-6);
      expect(p.transformToile).not.toContain("scale(");
    }
  });
});

describe("à très faible cadence (écran lent), la physique reste stable", () => {
  it.each([8, 4])("à %i images par seconde, elle arrive sans exploser", (fps) => {
    monter({}, fps);
    lia?.allerVoir(document.getElementById("carte") as HTMLElement, 10);
    vi.advanceTimersByTime(6000);
    const [x, y] = position();
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThan(500);
    expect(x).toBeLessThan(1500);
    expect(y).toBeGreaterThan(200);
    expect(y).toBeLessThan(950);
  });
});
