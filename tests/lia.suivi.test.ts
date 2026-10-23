import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
let carte: HTMLElement;
let rectCarte = { left: 100, top: 300, right: 400, bottom: 500 };

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

const corps = (): HTMLElement => {
  const c = document.querySelector<HTMLElement>(".lia-ui__corps");
  if (!c) throw new Error("corps de LIA absent");
  return c;
};
const position = (): { x: number; y: number } => {
  const m = /translate\(([-\d.]+)px,([-\d.]+)px\)/.exec(corps().style.transform);
  if (!m) throw new Error(`transform inattendu : ${corps().style.transform}`);
  return { x: Number(m[1]), y: Number(m[2]) };
};
const bougerSouris = (x: number, y: number, pointerType = "mouse"): void => {
  const e = new Event("pointermove") as Event & { clientX: number; clientY: number; pointerType: string };
  e.clientX = x;
  e.clientY = y;
  e.pointerType = pointerType;
  window.dispatchEvent(e);
};

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  rectCarte = { left: 100, top: 300, right: 400, bottom: 500 };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this === carte) return rectDe(rectCarte);
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  carte = document.createElement("section");
  carte.setAttribute("data-lia-cible", "");
  document.body.appendChild(carte);
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("aller voir un élément", () => {
  it("s'en approche puis reste collée, au pixel près, quand la page défile", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    expect(lia.allerVoir(carte, 60)).toBe(true);
    // À droite de l'élément (400 + 60 × 0,85), à hauteur de son milieu (400).
    await vi.waitFor(() => {
      const p = position();
      expect(Math.abs(p.x - 451)).toBeLessThan(1);
      expect(Math.abs(p.y - 400)).toBeLessThan(1);
    }, { timeout: 4000 });
    // La page défile de 40 px : LIA est restée exactement à côté de l'élément.
    rectCarte = { left: 100, top: 260, right: 400, bottom: 460 };
    await vi.waitFor(() => expect(position().y).toBeCloseTo(360, 0), { timeout: 1000 });
    expect(position().x).toBeCloseTo(451, 0);
  });

  it("lâche l'élément quand il sort de l'écran, et reste où elle est", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    lia.allerVoir(carte, 60);
    await vi.waitFor(() => expect(Math.abs(position().y - 400)).toBeLessThan(1), { timeout: 4000 });
    rectCarte = { left: 100, top: -600, right: 400, bottom: -400 };
    await new Promise((r) => setTimeout(r, 200));
    const apres = position();
    await new Promise((r) => setTimeout(r, 200));
    expect(Math.abs(position().y - apres.y)).toBeLessThan(2); // elle flotte un peu, elle ne repart pas
    expect(Math.abs(apres.y - 400)).toBeLessThan(5);
  });

  it("refuse un élément absent de la page", () => {
    lia = mountLia({ vieAutonome: false });
    expect(lia.allerVoir(document.createElement("div"))).toBe(false);
  });

  it("refuse tout mouvement au mode « réduire les animations » réglé sur « fixe »", () => {
    installerEnvironnement({ sansMouvement: true });
    lia = mountLia({ quandMouvementReduit: "fixe" });
    expect(lia.allerVoir(carte)).toBe(false);
    expect(lia.suivreCurseur()).toBe(false);
  });

  it("ne déplace jamais l'écran de Marc", async () => {
    const defile = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const defileSur = vi.fn();
    carte.scrollIntoView = defileSur;
    lia = mountLia({ vieAutonome: false });
    lia.allerVoir(carte);
    await new Promise((r) => setTimeout(r, 150));
    expect(defile).not.toHaveBeenCalled();
    expect(defileSur).not.toHaveBeenCalled();
  });

  it("rester() la laisse où elle est", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    lia.allerVoir(carte, 60);
    await new Promise((r) => setTimeout(r, 100));
    lia.rester();
    const p = position();
    rectCarte = { left: 100, top: 420, right: 400, bottom: 620 };
    await new Promise((r) => setTimeout(r, 200));
    expect(Math.abs(position().y - p.y)).toBeLessThan(40);
  });
});

describe("suivre le curseur", () => {
  it("refuse tant que le curseur n'a pas bougé", () => {
    lia = mountLia({ vieAutonome: false });
    expect(lia.suivreCurseur()).toBe(false);
  });

  it("refuse un doigt : le suivi ne vaut que pour une souris ou un stylet", () => {
    lia = mountLia({ vieAutonome: false });
    bougerSouris(500, 400, "touch");
    expect(lia.suivreCurseur()).toBe(false);
  });

  it("vient près du curseur et le garde à distance", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    bougerSouris(600, 500);
    expect(lia.suivreCurseur(30)).toBe(true);
    await vi.waitFor(() => {
      const p = position();
      const d = Math.hypot(p.x - 600, p.y - 500);
      expect(d).toBeGreaterThan(30);
      expect(d).toBeLessThan(200);
    }, { timeout: 4000 });
  });
});

describe("venir près de Marc", () => {
  it("se met près du curseur s'il a bougé, sans rien faire défiler", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    bougerSouris(300, 600);
    expect(lia.venirPres()).toBe(true);
    await vi.waitFor(() => {
      const p = position();
      expect(Math.abs(p.x - 390)).toBeLessThan(2);
      expect(Math.abs(p.y - 540)).toBeLessThan(2);
    }, { timeout: 4000 });
  });

  it("sans curseur, va sur le bord bas-droit de l'écran", async () => {
    lia = mountLia({ vieAutonome: false, rayon: 60 });
    expect(lia.venirPres()).toBe(true);
    await vi.waitFor(() => expect(position().x).toBeGreaterThan(800), { timeout: 4000 });
  });
});

describe("vie autonome", () => {
  it("couper sa vie autonome arrête ce qu'elle suit", async () => {
    lia = mountLia({ rayon: 60 });
    lia.allerVoir(carte, 60);
    await vi.waitFor(() => expect(Math.abs(position().y - 400)).toBeLessThan(1), { timeout: 4000 });
    lia.setVieAutonome(false);
    rectCarte = { left: 100, top: 400, right: 400, bottom: 600 };
    await new Promise((r) => setTimeout(r, 200));
    expect(Math.abs(position().y - 400)).toBeLessThan(5);
  });
});
