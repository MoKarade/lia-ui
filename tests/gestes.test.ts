import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GESTES, HUMEURS_MENU, dureeGeste, trouverGeste } from "../src/gestes.js";
import { HUMEURS_LIA } from "../src/types.js";
import { mountLia } from "../src/lia.js";
import type { HumeurLia, LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

describe("gestes et humeurs du menu", () => {
  it("chaque geste a une silhouette du moteur, un libellé et un tracé", async () => {
    const { ST } = await import("../src/moteur/moteur.js");
    for (const g of GESTES) {
      expect(ST, g.id).toContain(g.etat);
      expect(g.libelle.length).toBeGreaterThan(2);
      expect(g.icone).toMatch(/^M/);
    }
    expect(new Set(GESTES.map((g) => g.id)).size).toBe(GESTES.length);
  });

  it("les humeurs du menu sont de vraies humeurs, une seule fois chacune", () => {
    for (const h of HUMEURS_MENU) expect(HUMEURS_LIA).toContain(h.id);
    expect(new Set(HUMEURS_MENU.map((h) => h.id)).size).toBe(HUMEURS_MENU.length);
  });

  it("trouve un geste par son nom, rien pour un nom inconnu", () => {
    expect(trouverGeste("salue")?.libelle).toBe("Salue");
    expect(trouverGeste("danse")).toBeUndefined();
  });

  it("la durée vaut 3 s par défaut, jamais négative, jamais plus de 30 s", () => {
    expect(dureeGeste(undefined)).toBe(3);
    expect(dureeGeste(-5)).toBe(3);
    expect(dureeGeste(Number.NaN)).toBe(3);
    expect(dureeGeste(0)).toBe(3);
    expect(dureeGeste(8)).toBe(8);
    expect(dureeGeste(900)).toBe(30);
  });
});

let lia: LiaHandle | null = null;
let carte: HTMLElement;

const hit = (): HTMLButtonElement => document.querySelector<HTMLButtonElement>(".lia-ui__hit") as HTMLButtonElement;
const ouvrir = (): void => {
  hit().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
};
const bouton = (sel: string): HTMLButtonElement => {
  const b = document.querySelector<HTMLButtonElement>(sel);
  if (!b) throw new Error(`absent : ${sel}`);
  return b;
};
const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

/** La bulle s'écrit lettre par lettre puis s'efface : on garde le texte le plus long vu pendant `ms`. */
const plusLongTexte = (ms: number): string => {
  let max = "";
  for (let i = 0; i < ms / 100; i++) {
    vi.advanceTimersByTime(100);
    const t = document.querySelector(".lia-ui__bulle")?.textContent ?? "";
    if (t.length > max.length) max = t;
  }
  return max;
};

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this === carte) return rectDe({ left: 100, top: 300, right: 400, bottom: 500 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<section id="carte">Hors ligne</section>`;
  carte = document.getElementById("carte") as HTMLElement;
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

describe("menu de son corps", () => {
  it("a un titre, six humeurs (la sienne cochée), huit gestes et la vie autonome", () => {
    lia = mountLia({ vieAutonome: false });
    ouvrir();
    expect(document.querySelector(".lia-ui__menu-titre")?.textContent).toBe("LIA");
    const humeurs = [...document.querySelectorAll<HTMLElement>("[role=menuitemradio]")];
    expect(humeurs.map((h) => h.textContent)).toEqual(HUMEURS_MENU.map((h) => h.libelle));
    expect(humeurs.filter((h) => h.getAttribute("aria-checked") === "true").map((h) => h.textContent)).toEqual(["Curieuse"]);
    const gestes = [...document.querySelectorAll<HTMLElement>(".lia-ui__geste")];
    expect(gestes.map((g) => g.getAttribute("aria-label"))).toEqual(GESTES.map((g) => g.libelle));
    expect(gestes.every((g) => g.querySelector("svg path"))).toBe(true);
    expect(document.body.textContent).toContain("La laisser vivre");
  });

  it("choisir une humeur la change, prévient l'hôte et ferme le menu", () => {
    const onHumeur = vi.fn<(h: HumeurLia) => void>();
    lia = mountLia({ vieAutonome: false, onHumeur });
    ouvrir();
    const joyeuse = [...document.querySelectorAll<HTMLButtonElement>("[role=menuitemradio]")].find((b) => b.textContent === "Joyeuse");
    joyeuse?.click();
    expect(onHumeur).toHaveBeenCalledWith("joyeux");
    expect(document.querySelector(".lia-ui__menu")).toBeNull();
    ouvrir();
    const cochees = [...document.querySelectorAll("[role=menuitemradio][aria-checked=true]")].map((b) => b.textContent);
    expect(cochees).toEqual(["Joyeuse"]);
  });

  it("un geste ferme le menu et se règle en 3 secondes", () => {
    vi.useFakeTimers();
    lia = mountLia({ vieAutonome: false });
    ouvrir();
    bouton('.lia-ui__geste[aria-label="Salue"]').click();
    expect(document.querySelector(".lia-ui__menu")).toBeNull();
    // Le menu ne bloque plus rien et un autre geste remplace le premier sans erreur.
    expect(lia.geste("content")).toBe(true);
    vi.advanceTimersByTime(3100);
    expect(lia.geste("musique", 1)).toBe(true);
    vi.advanceTimersByTime(1100);
  });

  it("sans mouvement (prefers-reduced-motion) : pas de gestes, mais les humeurs restent", () => {
    installerEnvironnement({ sansMouvement: true });
    lia = mountLia();
    ouvrir();
    expect(document.querySelectorAll(".lia-ui__geste")).toHaveLength(0);
    expect(document.querySelectorAll("[role=menuitemradio]")).toHaveLength(HUMEURS_MENU.length);
    expect(lia.geste("salue")).toBe(false);
  });

  it("les flèches droite et gauche parcourent aussi les rangées", () => {
    lia = mountLia({ vieAutonome: false });
    ouvrir();
    const tous = [...document.querySelectorAll<HTMLElement>("[role^=menuitem]")];
    expect(document.activeElement).toBe(tous[0]);
    tous[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(tous[1]);
    tous[1]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(tous[0]);
  });

  it("le défilement de la page ne ferme pas le menu de son corps", () => {
    lia = mountLia({ vieAutonome: false });
    ouvrir();
    window.dispatchEvent(new Event("scroll"));
    expect(document.querySelector(".lia-ui__menu")).not.toBeNull();
  });

  it("geste inconnu, discussion ouverte ou lia détruite : faux, rien ne casse", () => {
    lia = mountLia({ vieAutonome: false });
    expect(lia.geste("danse" as never)).toBe(false);
    lia.ouvrirChat();
    expect(lia.geste("salue")).toBe(false);
    lia.fermerChat();
    expect(lia.geste("salue")).toBe(true);
    lia.destroy();
    lia = null;
  });
});

describe("envoyer(element)", () => {
  it("va près de l'élément et dit ce que l'hôte a écrit, au bout d'une seconde et demie", () => {
    vi.useFakeTimers();
    lia = mountLia({ vieAutonome: false });
    expect(lia.envoyer(carte, { dit: "  Regarde cette carte.  ", etat: "lit" })).toBe(true);
    expect(document.querySelector(".lia-ui__bulle")?.textContent ?? "").not.toContain("Regarde");
    vi.advanceTimersByTime(1600);
    expect(document.querySelector(".lia-ui__bulle")?.textContent ?? "").not.toBe("");
    expect(plusLongTexte(2000)).toContain("Regarde cette carte."); // la bulle s'écrit lettre par lettre
  });

  it("ne dit rien si elle n'y est plus (rester) ni sans texte", () => {
    vi.useFakeTimers();
    lia = mountLia({ vieAutonome: false });
    lia.envoyer(carte, { dit: "Salut" });
    lia.rester();
    vi.advanceTimersByTime(1600);
    expect(document.querySelector(".lia-ui__bulle")?.textContent ?? "").not.toContain("Salut");
    lia.envoyer(carte);
    vi.advanceTimersByTime(1600);
    expect(document.querySelector(".lia-ui__bulle")?.textContent ?? "").not.toContain("Salut");
  });

  it("refuse un élément absent de la page ou qui est à elle, et la discussion ouverte", () => {
    lia = mountLia({ vieAutonome: false });
    expect(lia.envoyer(document.createElement("div"))).toBe(false);
    expect(lia.envoyer(hit())).toBe(false);
    lia.ouvrirChat();
    expect(lia.envoyer(carte)).toBe(false);
  });

  it("l'hôte décide de la parole : même entre 22 h et 7 h, mais bornée à 280 caractères", () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 23, 23, 30) });
    lia = mountLia({ vieAutonome: false });
    lia.envoyer(carte, { dit: "x".repeat(500) });
    vi.advanceTimersByTime(1500);
    const texte = plusLongTexte(12_000);
    expect(texte.length).toBeGreaterThan(100);
    expect(texte.length).toBeLessThanOrEqual(280);
  });
});
