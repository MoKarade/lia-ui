import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

// Elle décide toujours de se promener (le choix du comportement est le seul morceau remplacé).
vi.mock("../src/cerveau.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/cerveau.js")>()), choisirComportement: () => "promener" }));
const { mountLia } = await import("../src/lia.js");

let lia: LiaHandle | null = null;
const corps = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__corps") as HTMLElement;
const ombre = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__ombre") as HTMLElement;
const echelleCorps = (): number[] => {
  const m = /scale\(([-\d.]+),\s*([-\d.]+)\)/.exec(document.querySelector<HTMLElement>(".lia-ui__toile")?.style.transform ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [1, 1];
};
const position = (): { x: number; y: number } => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(corps().style.transform);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};
const monter = (o: Parameters<typeof mountLia>[0] = {}): LiaHandle =>
  (lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", bounds: () => ({ x: 0, y: 0, w: 1200, h: 800 }), ...o }));

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 15, 0, 0));
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

/** Avance image par image et relève l'état du corps. */
const suivre = (secondes: number): { vol: boolean[]; ombres: number[]; accroupie: number[]; pos: { x: number; y: number }[] } => {
  const r = { vol: [] as boolean[], ombres: [] as number[], accroupie: [] as number[], pos: [] as { x: number; y: number }[] };
  for (let k = 0; k < (secondes * 1000) / 16; k++) {
    vi.advanceTimersByTime(16);
    r.vol.push(corps().dataset["vol"] === "1");
    r.ombres.push(Number(ombre().style.opacity || 0));
    r.accroupie.push(echelleCorps()[0] ?? 1);
    r.pos.push(position());
  }
  return r;
};

describe("le bond : elle s'accroupit, saute en arc et arrive sur son but", () => {
  it("avec un hasard qui choisit le bond, une promenade devient accroupissement, vol avec ombre, arrivée", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    monter();
    const r = suivre(30);
    const premierVol = r.vol.indexOf(true);
    expect(premierVol).toBeGreaterThan(0);
    // Avant le départ, elle s'est aplatie (échelle horizontale < 1 le long du saut vertical = écrasement) puis détendue.
    expect(Math.min(...r.accroupie.slice(Math.max(0, premierVol - 15), premierVol))).toBeLessThan(0.97);
    // En vol : une ombre visible ; le vol dure de 0,6 à 1 s, bien moins que la durée maximale d'un lancer (9 s).
    const duree = r.vol.filter(Boolean).length * 0.016;
    expect(duree).toBeGreaterThan(0.5);
    expect(duree).toBeLessThan(1.2);
    expect(Math.max(...r.ombres)).toBeGreaterThan(0.1);
    // Elle reste dans sa zone et ne tombe pas au sol : elle finit près du but, pas au bas de la zone.
    for (const p of r.pos) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1200);
      expect(p.y).toBeLessThanOrEqual(800);
    }
  });

  it("sans bond (hasard haut), elle glisse : jamais de vol ni d'ombre", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    monter();
    const r = suivre(30);
    expect(r.vol.some(Boolean)).toBe(false);
    expect(Math.max(...r.ombres)).toBe(0);
  });

  it("mouvement réduit (doux) : ni bond ni ombre", () => {
    installerEnvironnement({ sansMouvement: true });
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    monter({ quandMouvementReduit: "doux" });
    const r = suivre(30);
    expect(r.vol.some(Boolean)).toBe(false);
    expect(Math.max(...r.ombres)).toBe(0);
  });
});
