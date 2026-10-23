import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, MotifMonde } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const phrase = { text: "Tu regardes cette carte depuis un moment." };

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 412 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 915 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 412, bottom: 915 });
    if (this.id === "haut") return rectDe({ left: 16, top: 80, right: 396, bottom: 240 });
    if (this.id === "milieu") return rectDe({ left: 16, top: 400, right: 396, bottom: 560 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<article id="haut" data-lia-cible>Haut</article><article id="milieu" data-lia-cible>Milieu</article>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sur un téléphone, sans curseur", () => {
  it("1,5 s après le dernier défilement, ce que Marc regarde est la carte au centre de l'écran", () => {
    const vues: Element[] = [];
    const monde = vi.fn((m: MotifMonde, el?: Element) => {
      if (m === "accompagner" && el) vues.push(el);
      return m === "accompagner" ? phrase : null;
    });
    lia = mountLia({ parolePropre: false, monde });
    // Un doigt qui fait défiler : jamais de pointermove à la souris.
    window.dispatchEvent(new Event("scroll"));
    for (let i = 0; i < 40 && !vues.length; i++) seconde(1);
    expect(vues[0]?.id).toBe("milieu");
  });

  it("un doigt posé sur une carte vaut survol, et le défilement ne le remplace pas", () => {
    const vues: Element[] = [];
    const monde = vi.fn((m: MotifMonde, el?: Element) => {
      if (m === "accompagner" && el) vues.push(el);
      return m === "accompagner" ? phrase : null;
    });
    lia = mountLia({ parolePropre: false, monde });
    const touche = Object.assign(new MouseEvent("pointerdown", { bubbles: true }), { pointerType: "touch", isPrimary: true });
    (document.getElementById("haut") as HTMLElement).dispatchEvent(touche);
    (document.getElementById("haut") as HTMLElement).dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    window.dispatchEvent(new Event("scroll"));
    for (let i = 0; i < 40 && !vues.length; i++) seconde(1);
    expect(vues[0]?.id).toBe("haut");
  });

  it("le clavier qui prend le focus sur une carte vaut survol", () => {
    const vues: Element[] = [];
    const monde = vi.fn((m: MotifMonde, el?: Element) => {
      if (m === "accompagner" && el) vues.push(el);
      return m === "accompagner" ? phrase : null;
    });
    document.body.insertAdjacentHTML("beforeend", `<button id="b" data-lia-cible>Ok</button>`);
    lia = mountLia({ parolePropre: false, monde });
    (document.getElementById("b") as HTMLElement).dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    for (let i = 0; i < 40 && !vues.length; i++) seconde(1);
    expect(vues[0]?.id).toBe("b");
  });
});
