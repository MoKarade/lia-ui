import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { CSS } from "../src/styles.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const cadre = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__cadre") as HTMLElement;

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

describe("le carré de son animation d'analyse se dessine autour de ce qu'elle analyse", () => {
  it("quand elle analyse une carte, quatre coins et un balayage encadrent la carte, qui reste intacte", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    const carte = document.getElementById("carte") as HTMLElement;
    expect(lia.envoyer(carte, { etat: "analyse", secondes: 20 })).toBe(true);
    seconde(6);
    expect(cadre().hidden).toBe(false);
    expect(cadre().classList.contains("lia-ui__cadre--pose")).toBe(true);
    expect(cadre().querySelectorAll(".lia-ui__coin").length).toBe(4);
    expect(cadre().querySelector(".lia-ui__balai")).not.toBeNull();
    // 6 px de marge tout autour de la carte (300..700 × 200..400).
    expect(cadre().style.left).toBe("294px");
    expect(cadre().style.top).toBe("194px");
    expect(cadre().style.width).toBe("412px");
    expect(cadre().style.height).toBe("212px");
    // Le cadre vit dans sa couche : la carte n'a reçu ni enfant ni style.
    expect(carte.children.length).toBe(0);
    expect(carte.getAttribute("style")).toBeNull();
  });

  it("pas d'analyse, ou rien à encadrer : pas de cadre", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(3);
    expect(cadre().hidden).toBe(true);
    lia.activite("analyse", 5);
    seconde(2);
    expect(cadre().hidden).toBe(true);
    const carte = document.getElementById("carte") as HTMLElement;
    lia.envoyer(carte, { etat: "lit", secondes: 10 });
    seconde(5);
    expect(cadre().hidden).toBe(true);
  });

  it("le CSS dessine les coins et le balayage, et les fige sous mouvement réduit", () => {
    expect(CSS).toMatch(/\.lia-ui__coin--hg\{/);
    expect(CSS).toMatch(/@keyframes lia-ui-balaye/);
    expect(CSS).toMatch(/\.lia-ui__cadre--fixe[^{]*\{transition:none;animation:none\}/);
  });
});
