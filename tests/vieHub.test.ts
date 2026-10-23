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

beforeEach(() => {
  // Le navigateur de Marc annonce prefers-reduced-motion ; le hub passe quandMouvementReduit="complet".
  installerEnvironnement({ sansMouvement: true });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1400, bottom: 900 });
    if (this.id === "carte") return rectDe({ left: 700, top: 300, right: 1000, bottom: 420 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

/** Monte LIA comme le hub (alertes affichées, mouvement « complet ») et compte ses déplacements sur `secondes` à `fps` images par seconde. */
const deplacements = (secondes: number, fps: number): number => {
  vi.useFakeTimers();
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  // Le navigateur fournit les images au rythme `fps` (une page lourde ou une fenêtre masquée en donne bien moins que 60).
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 1000 / fps) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  lia = mountLia({
    quandMouvementReduit: "complet",
    entrees: () => ({ alerte: 1, nbAlertes: 3 }),
    monde: (motif) => (motif === "appeler" ? { text: "Trois alertes sont affichées." } : null),
    onSpontane: () => null,
  });
  let n = 0;
  vi.advanceTimersByTime(1000);
  let ancre = position();
  for (let s = 0; s < secondes; s++) {
    vi.advanceTimersByTime(1000);
    const p = position();
    if (Math.hypot(p[0] - ancre[0], p[1] - ancre[1]) > 40) {
      n++;
      ancre = p;
    }
  }
  return n;
};

describe("le hub avec des alertes : elle ne reste pas immobile", () => {
  it.each([60, 20, 8, 4])("au moins un déplacement par minute à %i images par seconde", (fps) => {
    const n = deplacements(300, fps);
    expect(n, `${fps} i/s`).toBeGreaterThanOrEqual(5);
  });
});

describe("à la demande : elle arrive près de l'élément même quand l'écran est lent", () => {
  it.each([60, 8, 4])("à %i images par seconde, elle est posée en 3 s", (fps) => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 1000 / fps) as unknown as number);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
    document.body.innerHTML = `<section id="carte" data-lia-cible>Alertes</section>`;
    lia = mountLia({ quandMouvementReduit: "complet", vieAutonome: false });
    vi.advanceTimersByTime(1000);
    const carte = document.getElementById("carte") as HTMLElement;
    expect(lia.allerVoir(carte, 12)).toBe(true);
    vi.advanceTimersByTime(3000);
    const a3 = position();
    vi.advanceTimersByTime(7000);
    const fin = position();
    expect(Math.hypot(a3[0] - fin[0], a3[1] - fin[1]), `${fps} i/s`).toBeLessThan(150);
  });
});
