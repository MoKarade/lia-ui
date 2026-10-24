import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const corps = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__corps") as HTMLElement;
const position = (): { x: number; y: number } => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(corps().style.transform);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};
const evt = (type: string, x: number, y: number): void =>
  void hit().dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));
/** Un geste : appui en (x0, y0) puis déplacement vers (x1, y1) en `ms` millisecondes, sans lâcher. */
const tirer = (x0: number, y0: number, x1: number, y1: number, ms: number): void => {
  evt("pointerdown", x0, y0);
  const pas = Math.max(1, Math.round(ms / 16));
  for (let k = 1; k <= pas; k++) {
    evt("pointermove", x0 + ((x1 - x0) * k) / pas, y0 + ((y1 - y0) * k) / pas);
    vi.advanceTimersByTime(ms / pas);
  }
};
/** La pose au centre de la zone, lentement : pas de lancer. */
const aumilieu = (): { x: number; y: number } => {
  const d = position();
  tirer(d.x, d.y, 450, 300, 1500);
  evt("pointerup", 450, 300);
  seconde(2.5);
  return position();
};
const monter = (o: Parameters<typeof mountLia>[0] = {}): LiaHandle =>
  (lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", bounds: () => ({ x: 0, y: 0, w: 900, h: 600 }), ...o }));

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

describe("lancée par Marc : élan, gravité, rebonds", () => {
  it("lâchée en pleine course vers la droite elle vole, rebondit sur le mur et retombe au sol, puis se pose", () => {
    monter();
    seconde(2);
    const depart = aumilieu();
    tirer(depart.x, depart.y, depart.x + 300, depart.y - 120, 150);
    expect(corps().dataset["vol"]).toBe("0");
    evt("pointerup", depart.x + 300, depart.y - 120);
    seconde(0.05);
    expect(corps().dataset["vol"]).toBe("1");
    expect(corps().dataset["etat"]).toBe("surpris");
    const xs: number[] = [];
    const ys: number[] = [];
    for (let k = 0; k < 90; k++) {
      seconde(0.1);
      const p = position();
      xs.push(p.x);
      ys.push(p.y);
    }
    // Elle va vers la droite, touche le mur de droite (moins sa marge), et retombe : sa hauteur finit plus bas que son sommet.
    expect(Math.max(...xs)).toBeGreaterThan(depart.x + 250);
    expect(Math.min(...ys)).toBeLessThan(ys[ys.length - 1] ?? 0);
    // Posée : le vol s'arrête avant 9 s et elle ne dépasse jamais sa zone.
    expect(corps().dataset["vol"]).toBe("0");
    for (const x of xs) expect(x).toBeLessThanOrEqual(900);
    for (const y of ys) expect(y).toBeLessThanOrEqual(600);
  });

  it("un impact fort lui fait mal (un choc simulé, une seule fois par lancer)", () => {
    monter();
    seconde(2);
    const d = aumilieu();
    tirer(d.x, d.y, d.x + 400, d.y + 50, 90);
    evt("pointerup", d.x + 400, d.y + 50);
    seconde(4);
    expect(lia?.interieur().sensibilite).toBeGreaterThan(0.15);
  });

  it("un appui en plein vol l'arrête net et la garde où elle est", () => {
    monter();
    seconde(2);
    const d = aumilieu();
    tirer(d.x, d.y, d.x + 300, d.y, 100);
    evt("pointerup", d.x + 300, d.y);
    seconde(0.3);
    expect(corps().dataset["vol"]).toBe("1");
    const p = position();
    evt("pointerdown", p.x, p.y);
    seconde(0.1);
    expect(corps().dataset["vol"]).toBe("0");
    evt("pointerup", p.x, p.y);
  });

  it("un geste lent ne la lance pas : elle se pose là où on l'a lâchée", () => {
    monter();
    seconde(2);
    const d = aumilieu();
    tirer(d.x, d.y, d.x + 60, d.y, 1500);
    seconde(0.5);
    evt("pointerup", d.x + 60, d.y);
    seconde(0.1);
    expect(corps().dataset["vol"]).toBe("0");
  });

  it("avec prefers-reduced-motion (doux), jamais de vol", () => {
    installerEnvironnement({ sansMouvement: true });
    monter({ quandMouvementReduit: "doux" });
    seconde(2);
    const d = position();
    tirer(d.x, d.y, d.x + 400, d.y - 100, 100);
    evt("pointerup", d.x + 400, d.y - 100);
    seconde(0.1);
    expect(corps().dataset["vol"]).toBe("0");
  });
});
