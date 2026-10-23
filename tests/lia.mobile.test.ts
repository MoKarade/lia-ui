import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 412 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 915 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 412, bottom: 915 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("lia-ui__chat") ? 396 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("lia-ui__chat") ? 500 : 0;
  });
  document.body.innerHTML = `<p id="para">Un paragraphe de la page</p>`;
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.restoreAllMocks();
});

describe("sur un écran de téléphone", () => {
  it("la discussion ne couvre jamais son corps : elle se pose au-dessus ou en dessous", () => {
    vi.useFakeTimers();
    try {
      const base = Date.now();
      vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
      lia = mountLia({ quandMouvementReduit: "complet", vieAutonome: false, ask: () => Promise.resolve({ text: "ok" }) });
      vi.advanceTimersByTime(1000);
      lia.ouvrirChat();
      vi.advanceTimersByTime(500);
      const chat = document.querySelector<HTMLElement>(".lia-ui__chat") as HTMLElement;
      const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/.exec(document.querySelector<HTMLElement>(".lia-ui__corps")?.style.transform ?? "");
      const cy = Number(m?.[2]);
      expect(Number.isFinite(cy)).toBe(true);
      const haut = parseFloat(chat.style.top);
      const bas = haut + Math.min(500, parseFloat(chat.style.maxHeight || "500"));
      // Le centre de son corps n'est pas dans la bande verticale de la discussion.
      expect(cy < haut || cy > bas).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("un appui long (0,65 s) sur un paragraphe ouvre le menu de l'élément, un appui qui bouge non", () => {
    vi.useFakeTimers();
    try {
      lia = mountLia({ vieAutonome: false });
      const para = document.getElementById("para") as HTMLElement;
      const pointeur = (type: string, x: number): Event =>
        Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: 200 }), { pointerType: "touch", isPrimary: true });
      const appui = (x: number): void => {
        para.dispatchEvent(pointeur("pointerdown", x));
      };
      appui(100);
      document.dispatchEvent(pointeur("pointermove", 160));
      vi.advanceTimersByTime(800);
      expect(document.querySelector(".lia-ui__menu")).toBeNull();
      appui(100);
      vi.advanceTimersByTime(800);
      const titre = document.querySelector(".lia-ui__menu .lia-ui__menu-titre")?.textContent ?? "";
      expect(titre).toContain("Un paragraphe");
      expect(titre).toContain("Un paragraphe de la page");
    } finally {
      vi.useRealTimers();
    }
  });
});
