import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
let carte: HTMLElement;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const position = (): [number, number] => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/.exec(document.querySelector<HTMLElement>(".lia-ui__corps")?.style.transform ?? "");
  return m ? [Number(m[1]), Number(m[2])] : [Number.NaN, Number.NaN];
};

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this === carte) return rectDe({ left: 100, top: 300, right: 400, bottom: 500 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<section id="carte" data-lia-cible>Hors ligne</section>`;
  carte = document.getElementById("carte") as HTMLElement;
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

describe("mouvement réduit : mode « doux » (choisi par l'hôte ou par Marc)", () => {
  it("garde sa boucle d'animation, sa vie autonome et ses gestes", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    lia = mountLia({ quandMouvementReduit: "doux" });
    expect(raf).toHaveBeenCalled();
    expect(lia.geste("salue")).toBe(true);
    document.querySelector(".lia-ui__hit")?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
    expect(document.querySelectorAll(".lia-ui__geste")).toHaveLength(8);
    expect(document.body.textContent).toContain("La laisser tranquille");
  });

  it("ne suit jamais le curseur, mais va se poser d'un coup près d'un élément", () => {
    lia = mountLia({ quandMouvementReduit: "doux", vieAutonome: false });
    expect(lia.suivreCurseur()).toBe(false);
    expect(lia.allerVoir(carte)).toBe(true);
    expect(lia.envoyer(carte, { dit: "Là." })).toBe(true);
  });

  it("ne glisse pas : sa position ne bouge pas tant que personne ne l'envoie", async () => {
    vi.useFakeTimers();
    lia = mountLia({ quandMouvementReduit: "doux", onSpontane: () => null });
    vi.advanceTimersByTime(100);
    const avant = position();
    vi.advanceTimersByTime(60_000);
    expect(position()).toEqual(avant);
  });

  it("parle seule et sa bulle s'écrit d'un coup", () => {
    vi.useFakeTimers();
    const hasard = vi.spyOn(Math, "random").mockReturnValue(0.3); // choix pondéré : causer, motif « rien »
    lia = mountLia({ quandMouvementReduit: "doux", onSpontane: () => "Il est calme ici.", silence: [3, 3] });
    vi.advanceTimersByTime(4_000); // sa première parole, avant le délai de 90 s entre deux remarques
    expect(document.querySelector(".lia-ui__bulle")?.textContent).toBe("Il est calme ici.");
    hasard.mockRestore();
  });

  it("elle joue sur place : jamais un déplacement", () => {
    vi.useFakeTimers();
    const hasard = vi.spyOn(Math, "random").mockReturnValue(0.1); // choix pondéré : jouer (une silhouette sur place)
    lia = mountLia({ quandMouvementReduit: "doux" });
    vi.advanceTimersByTime(100);
    const avant = position();
    vi.advanceTimersByTime(30_000);
    expect(position()).toEqual(avant);
    hasard.mockRestore();
  });
});

describe("mouvement réduit : les trois modes", () => {
  it("« complet » ignore la demande du système : elle suit le curseur et se déplace", () => {
    lia = mountLia({ quandMouvementReduit: "complet", vieAutonome: false });
    expect(lia.allerVoir(carte)).toBe(true);
    document.querySelector(".lia-ui__hit")?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    expect(document.querySelectorAll(".lia-ui__geste")).toHaveLength(8);
  });

  it("« fixe » garde l'image unique : aucune vie, aucun geste", () => {
    lia = mountLia({ quandMouvementReduit: "fixe" });
    expect(lia.geste("salue")).toBe(false);
    expect(lia.allerVoir(carte)).toBe(false);
    expect(lia.suivreCurseur()).toBe(false);
  });

  it("« fixe » place quand même sa bulle près d'elle (pas en haut à gauche)", () => {
    lia = mountLia({ quandMouvementReduit: "fixe", vieAutonome: false });
    expect(lia.dire("Bonjour.")).toBe(true);
    const bulle = document.querySelector<HTMLElement>(".lia-ui__bulle");
    expect(bulle?.hidden).toBe(false);
    expect(bulle?.style.left).toMatch(/px$/);
    expect(bulle?.style.top).toMatch(/px$/);
  });

  it("sans demande du système, l'option ne change rien", () => {
    installerEnvironnement({ sansMouvement: false });
    lia = mountLia({ quandMouvementReduit: "fixe", vieAutonome: false });
    expect(lia.geste("salue")).toBe(true);
    expect(lia.allerVoir(carte)).toBe(true);
  });
});

describe("demande explicite vers un élément hors de la bande centrale", () => {
  it("elle va jusqu'à un élément tout en haut de l'écran, au lieu d'abandonner au premier pas", () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
      if (this === carte) return rectDe({ left: 100, top: 0, right: 400, bottom: 100 });
      return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
    });
    lia = mountLia({ quandMouvementReduit: "complet", vieAutonome: false });
    expect(lia.allerVoir(carte, 20)).toBe(true);
    vi.advanceTimersByTime(4_000);
    const [x, y] = position();
    expect(Math.hypot(x - 448, y - 50)).toBeLessThan(60);
  });
});
