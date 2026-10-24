import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { cibleSousSurcouche } from "../src/ecran.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

type Boite = { left: number; top: number; right: number; bottom: number };
const rectDe = (r: Boite): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

let lia: LiaHandle | null = null;
let boites: Record<string, Boite> = {};
let dessous: string[] = [];
let couche: HTMLElement;

const el = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
const sous = (): Element[] => dessous.map(el);

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  // La carte (400×520), son lien étiré (70×44 en haut à droite, mais son ::after couvre la carte) et le chiffre dessous.
  boites = {
    carte: { left: 100, top: 100, right: 500, bottom: 620 },
    lien: { left: 420, top: 110, right: 490, bottom: 154 },
    chiffre: { left: 120, top: 300, right: 300, bottom: 360 },
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    const b = boites[this.id];
    return rectDe(b ?? { left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `
    <section id="carte"><a id="lien" href="#d">Détail</a><span id="chiffre">128 kWh</span></section>
    <div id="couche"><i id="dans-couche"></i></div>`;
  couche = el("couche");
  dessous = ["chiffre", "carte"];
  (document as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint = () => sous();
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
  vi.restoreAllMocks();
});

describe("cibleSousSurcouche : un lien étiré ne vole pas le clic de ce qui est dessous", () => {
  it("le point est hors de la boîte du lien : c'est l'élément dessous qui est visé", () => {
    expect(cibleSousSurcouche(el("lien"), 200, 320, couche)).toBe(el("chiffre"));
  });

  it("le point est dans la boîte propre de la cible : elle ne change jamais", () => {
    expect(cibleSousSurcouche(el("lien"), 450, 130, couche)).toBe(el("lien"));
  });

  it("saute le lien lui-même, sa couche et les éléments dont la boîte ne contient pas le point", () => {
    dessous = ["lien", "dans-couche", "chiffre", "carte"];
    expect(cibleSousSurcouche(el("lien"), 200, 320, couche)).toBe(el("chiffre"));
    dessous = ["lien", "dans-couche", "carte"];
    expect(cibleSousSurcouche(el("lien"), 200, 450, couche)).toBe(el("carte"));
  });

  it("ne vise jamais la racine ni le corps de la page", () => {
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => [document.body, document.documentElement];
    expect(cibleSousSurcouche(el("lien"), 200, 450, couche)).toBe(el("lien"));
  });

  it("rien de convenable dessous : la cible du clic reste la cible", () => {
    dessous = [];
    expect(cibleSousSurcouche(el("lien"), 200, 320, couche)).toBe(el("lien"));
  });

  it("sans elementsFromPoint, ou si elle lève : la cible du clic reste la cible", () => {
    delete (document as unknown as { elementsFromPoint?: unknown }).elementsFromPoint;
    expect(cibleSousSurcouche(el("lien"), 200, 320, couche)).toBe(el("lien"));
    (document as unknown as { elementsFromPoint: () => Element[] }).elementsFromPoint = () => {
      throw new Error("boum");
    };
    expect(cibleSousSurcouche(el("lien"), 200, 320, couche)).toBe(el("lien"));
  });

  it("une cible qui n'est pas un élément passe telle quelle", () => {
    expect(cibleSousSurcouche(null, 200, 320, couche)).toBeNull();
    expect(cibleSousSurcouche(window, 200, 320, couche)).toBe(window);
  });
});

describe("clic droit sur une carte au lien étiré", () => {
  const clicDroit = (cible: Element, x: number, y: number): void => {
    cible.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  };
  const titre = (): string => document.querySelector(".lia-ui__menu-titre")?.textContent ?? "";

  it("le clic reçu par le lien sur le chiffre vise le chiffre, pas le lien", () => {
    lia = mountLia({ vieAutonome: false });
    clicDroit(el("lien"), 200, 320);
    expect(titre()).toContain("128 kWh");
    expect(titre()).not.toContain("Détail");
  });

  it("le clic sur le lien lui-même vise le lien", () => {
    lia = mountLia({ vieAutonome: false });
    clicDroit(el("lien"), 450, 130);
    expect(titre()).toContain("Détail");
  });
});
