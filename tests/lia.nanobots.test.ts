import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { CSS } from "../src/styles.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const toile = (): HTMLCanvasElement => document.querySelector<HTMLCanvasElement>(".lia-ui__nano") as HTMLCanvasElement;
const carte = (): HTMLElement => document.getElementById("carte") as HTMLElement;

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this.id === "carte") return rectDe({ left: 300, top: 200, right: 700, bottom: 400 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<article id="carte" data-lia-cible>Une carte</article>`;
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

describe("ses nanobots analysent eux-mêmes ce qu'elle regarde, plus de carré", () => {
  it("quand elle analyse une carte, ses nanobots sortent de son corps et se répartissent sur la carte, qui reste intacte", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    expect(lia.nanobots().actif).toBe(false);
    expect(toile().hidden).toBe(true);
    expect(lia.envoyer(carte(), { etat: "analyse", secondes: 20 })).toBe(true);
    seconde(7);
    const n = lia.nanobots();
    expect(n.actif).toBe(true);
    expect(toile().hidden).toBe(false);
    expect(n.total).toBeGreaterThan(30);
    expect(n.sortis).toBe(n.total);
    expect(n.surCible).toBeGreaterThanOrEqual(0.9);
    expect(n.cible).toEqual({ x: 300, y: 200, w: 400, h: 200 });
    // Aucun cadre, aucun coin, aucun balai : seuls les nanobots analysent.
    expect(document.querySelector(".lia-ui__cadre, .lia-ui__coin, .lia-ui__balai")).toBeNull();
    // La canvas vit dans sa couche : la carte n'a reçu ni enfant ni style.
    expect(carte().children.length).toBe(0);
    expect(carte().getAttribute("style")).toBeNull();
  });

  it("ils dessinent eux-mêmes l'animation d'analyse sur la carte : quatre coins, une ligne qui balaie de haut en bas, des points qui lisent", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    expect(lia.envoyer(carte(), { etat: "analyse", secondes: 30 })).toBe(true);
    seconde(4);
    const a = lia.nanobots().forme;
    expect(a.coins).toBe(24);
    expect(a.ligne).toBe(28);
    expect(a.points).toBe(48);
    expect(a.ligneY).not.toBeNull();
    // La ligne se déplace sur la hauteur de la carte (jamais hors d'elle, marge comprise).
    const hauteurs: number[] = [];
    for (let i = 0; i < 12; i++) {
      seconde(0.4);
      hauteurs.push(lia.nanobots().forme.ligneY as number);
    }
    expect(Math.max(...hauteurs) - Math.min(...hauteurs)).toBeGreaterThan(0.5);
    for (const y of hauteurs) {
      expect(y).toBeGreaterThan(-0.1);
      expect(y).toBeLessThan(1.1);
    }
  });

  it("pendant qu'ils travaillent, son corps ne dessine aucune scène (ni quatre coins ni balayage) et se vide ; il se remplit quand ils rentrent", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    const corps = document.querySelector<HTMLCanvasElement>(".lia-ui__corps canvas, canvas.lia-ui__toile, .lia-ui__corps > canvas") ?? document.querySelector<HTMLCanvasElement>("canvas:not(.lia-ui__nano)");
    expect(lia.nanobots().total).toBe(0);
    for (const etat of ["analyse"] as const) {
      lia.envoyer(carte(), { etat, secondes: 5 });
      seconde(3);
      const n = lia.nanobots();
      expect(n.total, etat).toBe(100);
      expect(n.corps, etat).toBe("repos");
      expect(n.vide, etat).toBeGreaterThan(0.8);
      expect(Number(corps?.style.opacity), etat).toBeLessThan(0.3);
      seconde(14);
      expect(lia.nanobots().actif, etat).toBe(false);
      expect(lia.nanobots().vide, etat).toBeLessThan(0.05);
      expect(corps?.style.opacity, etat).toBe("");
    }
  });

  it("l'analyse finie, ils rentrent dans son corps et la canvas disparaît", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    lia.envoyer(carte(), { etat: "analyse", secondes: 4 });
    seconde(3);
    expect(lia.nanobots().actif).toBe(true);
    seconde(12);
    expect(lia.nanobots().actif).toBe(false);
    expect(lia.nanobots().total).toBe(0);
    expect(toile().hidden).toBe(true);
  });

  it("pas d'analyse, ou rien à analyser : pas de nanobots", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(3);
    expect(lia.nanobots().actif).toBe(false);
    lia.activite("analyse", 5);
    seconde(2);
    expect(lia.nanobots().actif).toBe(false);
    lia.envoyer(carte(), { etat: "lit", secondes: 10 });
    seconde(5);
    expect(lia.nanobots().actif).toBe(false);
    expect(toile().hidden).toBe(true);
  });

  it("le CSS pose la canvas sans jamais prendre un clic, et le carré d'avant n'existe plus", () => {
    expect(CSS).toMatch(/\.lia-ui__nano\{[^}]*pointer-events:none/);
    expect(CSS).not.toMatch(/lia-ui__cadre|lia-ui__coin|lia-ui__balai/);
  });
});
