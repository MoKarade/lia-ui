import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const bas = (): void => {
  hit().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
  hit().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
};
const ouvrirMenuCorps = (): void => {
  hit().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
};
const bascule = (): HTMLButtonElement | undefined =>
  [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__menu .lia-ui__item")].find((b) => b.textContent === "Comment elle va");
const jauge = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`.lia-ui__jauge[data-jauge="${id}"]`);

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

describe("« Comment elle va » dans son menu", () => {
  it("déplie onze jauges qui lisent ses vraies valeurs, avec la mention de simulation, sans fermer le menu", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(2);
    ouvrirMenuCorps();
    const b = bascule();
    expect(b).toBeDefined();
    expect(b?.getAttribute("aria-expanded")).toBe("false");
    b?.click();
    expect(document.querySelector(".lia-ui__menu")).not.toBeNull();
    expect(b?.getAttribute("aria-expanded")).toBe("true");
    const panneau = document.querySelector<HTMLElement>(".lia-ui__commentva");
    expect(panneau?.hidden).toBe(false);
    const metres = [...document.querySelectorAll<HTMLElement>(".lia-ui__commentva [role=meter]")];
    expect(metres).toHaveLength(11);
    const energie = Math.round(lia.envies().energie * 100);
    expect(jauge("energie")?.getAttribute("aria-valuenow")).toBe(String(energie));
    expect(jauge("confiance")?.getAttribute("aria-valuenow")).toBe(String(Math.round(lia.interieur().confiance * 100)));
    expect(document.querySelector(".lia-ui__cv-phrase")?.textContent).toBe("Elle va bien.");
    expect(panneau?.textContent).toContain("pas un vrai ressenti");
    // Le texte entre par textContent : aucun HTML.
    expect(panneau?.querySelector("script")).toBeNull();
  });

  it("la douleur monte dans le panneau après une rafale de clics, avec sa cause, puis retombe", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(2);
    for (let k = 0; k < 4; k++) {
      bas();
      seconde(0.2);
    }
    // La rafale a pu ouvrir la discussion : on la ferme avant d'ouvrir le menu.
    lia.fermerChat();
    ouvrirMenuCorps();
    bascule()?.click();
    seconde(1.1);
    const d = Number(jauge("douleur")?.getAttribute("aria-valuenow"));
    expect(d).toBeGreaterThan(15);
    expect(jauge("douleur")?.getAttribute("aria-valuetext")).toContain("des clics brusques");
    expect(document.querySelector(".lia-ui__cv-phrase")?.textContent).toMatch(/^Elle a (un peu )?mal : des clics brusques\.$/);
    seconde(400);
    expect(Number(jauge("douleur")?.getAttribute("aria-valuenow"))).toBeLessThan(d);
  });

  it("se referme avec le menu et n'est plus mis à jour ensuite", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(2);
    ouvrirMenuCorps();
    expect(bascule()).toBeDefined();
    bascule()?.click();
    expect(document.querySelector(".lia-ui__commentva")).not.toBeNull();
    document.querySelector<HTMLElement>(".lia-ui__menu")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(document.querySelector(".lia-ui__commentva")).toBeNull();
    expect(() => seconde(3)).not.toThrow();
  });
});
