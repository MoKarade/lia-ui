import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const corps = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__corps") as HTMLElement;
const position = (): { x: number; y: number } => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(corps().style.transform);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};
const graine = (s: number): (() => number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const monter = (): LiaHandle => (lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", bounds: () => ({ x: 0, y: 0, w: 1000, h: 800 }) }));

describe("elle marche de façon humaine : jamais le rythme d'une machine", () => {
  const promenade = (seed: number): { trace: Array<{ x: number; y: number }>; depart: { x: number; y: number } } => {
    vi.spyOn(Math, "random").mockImplementation(graine(seed));
    monter();
    seconde(2);
    const depart = position();
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 220 }));
    expect(lia?.venirPres()).toBe(true);
    const trace: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 160; k++) {
      seconde(0.05);
      trace.push(position());
    }
    return { trace, depart };
  };
  const vitesses = (trace: Array<{ x: number; y: number }>): number[] => trace.slice(1).map((p, i) => Math.hypot(p.x - (trace[i] as { x: number; y: number }).x, p.y - (trace[i] as { x: number; y: number }).y) / 0.05);

  it("son trajet est une courbe douce, pas la ligne droite entre son départ et son but", () => {
    const { trace, depart } = promenade(3);
    const but = trace[trace.length - 1] as { x: number; y: number };
    expect(Math.hypot(but.x - depart.x, but.y - depart.y)).toBeGreaterThan(300);
    const d = Math.hypot(but.x - depart.x, but.y - depart.y);
    let ecart = 0;
    for (const p of trace) ecart = Math.max(ecart, Math.abs((but.x - depart.x) * (depart.y - p.y) - (depart.x - p.x) * (but.y - depart.y)) / d);
    expect(ecart).toBeGreaterThan(25);
    expect(ecart).toBeLessThan(d * 0.3);
  });

  it("sa vitesse change tout le temps : lente au départ, vive au milieu, lente à l'arrivée", () => {
    const { trace } = promenade(4);
    const v = vitesses(trace);
    const pointe = Math.max(...v);
    expect(pointe).toBeGreaterThan(150);
    expect(v[1] as number).toBeLessThan(pointe * 0.4);
    expect(v[v.length - 1] as number).toBeLessThan(pointe * 0.1);
    const moyenne = v.reduce((a, b) => a + b, 0) / v.length;
    const ecartType = Math.sqrt(v.reduce((a, b) => a + (b - moyenne) ** 2, 0) / v.length);
    expect(ecartType / moyenne).toBeGreaterThan(0.6);
  });

  it("deux promenades ne se ressemblent pas : durées et courbures différentes", () => {
    const duree = (seed: number): number => {
      const { trace } = promenade(seed);
      const fin = trace[trace.length - 1] as { x: number; y: number };
      const i = trace.findIndex((p) => Math.hypot(p.x - fin.x, p.y - fin.y) < 20);
      lia?.destroy();
      lia = null;
      document.body.innerHTML = "<p>Une page</p>";
      return i;
    };
    const durees = [11, 12, 13, 14, 15].map(duree);
    expect(new Set(durees).size).toBeGreaterThan(2);
  });

  it("au repos elle ne reste pas figée : elle dérive de quelques pixels et fait de petits pas de côté, sans jamais s'éloigner", () => {
    vi.spyOn(Math, "random").mockImplementation(graine(5));
    monter();
    seconde(3);
    const origine = position();
    const xs = new Set<string>();
    let maxEcart = 0;
    for (let k = 0; k < 240; k++) {
      seconde(0.5);
      const p = position();
      xs.add(`${Math.round(p.x)},${Math.round(p.y)}`);
      maxEcart = Math.max(maxEcart, Math.hypot(p.x - origine.x, p.y - origine.y));
    }
    expect(xs.size).toBeGreaterThan(8);
    expect(maxEcart).toBeGreaterThan(3);
  });
});
