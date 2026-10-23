import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART, candidats, type ContexteChoix } from "../src/cerveau.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, MotifMonde, PropositionMonde } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

const choix: ContexteChoix = {
  curseurRecent: false,
  cibles: 0,
  parole: false,
  relance: false,
  humeur: "neutre",
  tranquille: false,
  loinDeLaMaison: false,
  deplacement: true,
  secondesDepuisParole: 0,
};
const inquiete = { ...ENVIES_DEPART, inquiet: 0.8 };
const poids = (id: string, e = ENVIES_DEPART, c: Partial<ContexteChoix> = {}): number | undefined => candidats(e, { ...choix, ...c }).find((x) => x.id === id)?.poids;

describe("choix : les comportements du monde", () => {
  it("sans proposition de l'hôte, aucun n'est possible", () => {
    const ids = candidats(inquiete, { ...choix, present: true, intentions: { appeler: 1 } }).map((c) => c.id);
    for (const m of ["appeler", "resumer", "feliciter", "rappeler", "souvenir"]) expect(ids).not.toContain(m);
  });

  it("appeler : seulement inquiète (> 0,35) et avec de l'énergie, très fort (3,2), même si Marc n'est pas là", () => {
    expect(poids("appeler", inquiete, { monde: ["appeler"] })).toBe(3.2);
    expect(poids("appeler", { ...inquiete, inquiet: 0.3 }, { monde: ["appeler"] })).toBeUndefined();
    expect(poids("appeler", { ...inquiete, energie: 0.1 }, { monde: ["appeler"] })).toBeUndefined();
    expect(poids("appeler", ENVIES_DEPART, { monde: ["appeler"] })).toBeUndefined();
  });

  it("résumer, rappeler et souvenir demandent que Marc soit là et qu'elle ne soit pas tranquille", () => {
    const monde: MotifMonde[] = ["resumer", "rappeler", "souvenir"];
    for (const m of monde) {
      expect(poids(m, ENVIES_DEPART, { monde, present: true }), m).toBeDefined();
      expect(poids(m, ENVIES_DEPART, { monde, present: false }), m).toBeUndefined();
      expect(poids(m, ENVIES_DEPART, { monde, present: true, tranquille: true }), m).toBeUndefined();
    }
  });

  it("féliciter demande que Marc soit là, pas qu'elle soit tranquille", () => {
    expect(poids("feliciter", ENVIES_DEPART, { monde: ["feliciter"], present: true, tranquille: true })).toBeCloseTo(0.2, 10);
    expect(poids("feliciter", ENVIES_DEPART, { monde: ["feliciter"], present: false })).toBeUndefined();
  });

  it("les poids de la maquette : base + intention, résumer gagne 0,15 quand elle est curieuse", () => {
    const monde: MotifMonde[] = ["resumer", "rappeler", "souvenir", "feliciter"];
    const c = { monde, present: true, intentions: { resumer: 0.5, rappeler: 0.5, souvenir: 0.5, feliciter: 0.5 } };
    expect(poids("resumer", ENVIES_DEPART, c)).toBeCloseTo(0.15 + 0.55, 10);
    expect(poids("resumer", { ...ENVIES_DEPART, curiosite: 0.6 }, c)).toBeCloseTo(0.15 + 0.55 + 0.15, 10);
    expect(poids("rappeler", ENVIES_DEPART, c)).toBeCloseTo(0.2 + 0.55, 10);
    expect(poids("souvenir", ENVIES_DEPART, c)).toBeCloseTo(0.1 + 0.55, 10);
    expect(poids("feliciter", ENVIES_DEPART, c)).toBeCloseTo(0.2 + 0.6, 10);
  });

  it("accompagner : quand Marc regarde un élément depuis un moment, fort (2,1 + curiosité × 0,6), sans demander qu'il soit actif", () => {
    expect(poids("accompagner", ENVIES_DEPART, { monde: ["accompagner"] })).toBeCloseTo(2.1 + 0.35 * 0.6, 10);
    expect(poids("accompagner", ENVIES_DEPART, { monde: ["accompagner"], tranquille: true })).toBeUndefined();
    expect(poids("accompagner", ENVIES_DEPART, {})).toBeUndefined();
  });

  it("veiller : seulement quand la nuit ou l'absence le permet", () => {
    expect(poids("veiller", ENVIES_DEPART, {})).toBeUndefined();
    expect(poids("veiller", ENVIES_DEPART, { veille: true, intentions: { veiller: 0.5 } })).toBeCloseTo(0.1 + 0.6, 10);
  });
});

let lia: LiaHandle | null = null;
let carte: HTMLElement;
const bulle = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__bulle") as HTMLElement;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const bouger = (): void => void window.dispatchEvent(new Event("pointermove"));
const dit = (): string => (bulle().hidden ? "" : (bulle().textContent ?? ""));
/** Fait passer le temps seconde après seconde (Marc bouge si `present`) jusqu'à ce que la bulle porte ce texte. */
const attendreDit = (texte: string, secondes: number, present = false): boolean => {
  for (let i = 0; i < secondes; i++) {
    if (present && i % 5 === 0) bouger();
    seconde(1);
    if (dit().includes(texte)) return true;
  }
  return false;
};
const ALERTE = { alerte: 1, nbAlertes: 0.8, toutVert: 0 };
const PROBLEME: PropositionMonde = { text: "DriveAI ne répond plus depuis une heure.", chips: [{ id: "voir", label: "Regarder" }] };

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this.id === "carte") return rectDe({ left: 100, top: 300, right: 400, bottom: 500 });
    if (this.id === "loin") return rectDe({ left: 100, top: 700, right: 400, bottom: 780 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<section id="carte">DriveAI</section><section id="loin">JobAI</section>`;
  carte = document.getElementById("carte") as HTMLElement;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 22, 12, 0, 0));
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
});

describe("elle vient prévenir (appeler)", () => {
  it("avec une alerte et un problème vrai de l'hôte, elle dit SA phrase avec ses puces", () => {
    const monde = vi.fn((m: MotifMonde) => (m === "appeler" ? { ...PROBLEME, element: carte } : null));
    lia = mountLia({ entrees: () => ALERTE, monde });
    expect(attendreDit("DriveAI ne répond plus depuis une heure.", 40)).toBe(true);
    expect(monde).toHaveBeenCalledWith("appeler");
    expect(bulle().textContent).toContain("Regarder");
  });

  it("si la carte est hors de la bande regardée, elle ne s'y rend pas mais le dit quand même", () => {
    lia = mountLia({ entrees: () => ALERTE, monde: (m) => (m === "appeler" ? { ...PROBLEME, element: document.getElementById("loin") } : null) });
    expect(attendreDit("DriveAI ne répond plus depuis une heure.", 40)).toBe(true);
  });

  it("sans alerte, elle n'a aucune raison de venir, même si l'hôte a un problème à signaler", () => {
    lia = mountLia({ monde: (m) => (m === "appeler" ? PROBLEME : null) });
    seconde(60);
    expect(dit()).not.toContain("DriveAI ne répond plus");
  });

  it("quand l'hôte n'a rien de vrai (null), elle se tait", () => {
    lia = mountLia({ entrees: () => ALERTE, monde: () => null });
    seconde(60);
    expect(dit()).toBe("");
  });

  it("ne revient pas avant 90 s : l'hôte n'est plus interrogé sur ce motif entre-temps", () => {
    const monde = vi.fn((m: MotifMonde) => (m === "appeler" ? PROBLEME : null));
    lia = mountLia({ entrees: () => ALERTE, monde });
    seconde(30);
    const appels = monde.mock.calls.filter(([m]) => m === "appeler").length;
    seconde(30);
    expect(monde.mock.calls.filter(([m]) => m === "appeler").length).toBe(appels);
    seconde(60);
    expect(monde.mock.calls.filter(([m]) => m === "appeler").length).toBeGreaterThan(appels);
  });

  it("se tait la nuit (heures de silence) : l'hôte n'est pas même interrogé", () => {
    vi.setSystemTime(new Date(2026, 9, 22, 23, 30, 0));
    const monde = vi.fn(() => PROBLEME);
    lia = mountLia({ entrees: () => ALERTE, monde });
    seconde(60);
    expect(monde).not.toHaveBeenCalled();
    expect(dit()).toBe("");
  });

  it("la dit aussi en mouvement réduit « doux », sur place", () => {
    installerEnvironnement({ sansMouvement: true });
    lia = mountLia({ entrees: () => ALERTE, monde: (m) => (m === "appeler" ? { ...PROBLEME, element: carte } : null) });
    expect(attendreDit("DriveAI ne répond plus", 40)).toBe(true);
  });

  it("n'est jamais dite en mouvement réduit « fixe »", () => {
    installerEnvironnement({ sansMouvement: true });
    const monde = vi.fn(() => PROBLEME);
    lia = mountLia({ quandMouvementReduit: "fixe", entrees: () => ALERTE, monde });
    seconde(60);
    expect(monde).not.toHaveBeenCalled();
  });

  it("l'échec de l'hôte ne l'arrête pas : elle le dit une seule fois dans la console", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lia = mountLia({
      entrees: () => ALERTE,
      monde: () => {
        throw new Error("hors ligne");
      },
    });
    seconde(30);
    expect(err.mock.calls.filter(([m]) => String(m).includes("monde a échoué"))).toHaveLength(1);
    expect(lia.envies().inquiet).toBeGreaterThan(0.35);
  });
});

describe("ce qu'elle fait quand Marc est là", () => {
  const seule = (motif: MotifMonde, texte: string) => (m: MotifMonde): PropositionMonde | null => (m === motif ? { text: texte } : null);
  const presente = (secondes: number): void => {
    for (let i = 0; i < secondes; i += 5) {
      bouger();
      seconde(5);
    }
  };

  it.each([
    ["feliciter", "Ça fait plaisir : la synchro est de nouveau à jour."],
    ["resumer", "Côté DriveAI : le coût monte depuis 3 jours, à surveiller."],
    ["rappeler", "DriveAI : le quota approche. Je te le rappelle."],
    ["souvenir", "Il y a une heure, tu me parlais de DriveAI."],
  ] as const)("%s : elle dit le texte de l'hôte, rien d'autre", (motif, texte) => {
    // Tirage fixé : après 40 s sans bouger, « promener » pèse plus (envie de bouger) ; 0,8 tombe sur le motif de l'hôte.
    vi.spyOn(Math, "random").mockReturnValue(0.8);
    lia = mountLia({ monde: seule(motif, texte) });
    expect(attendreDit(texte, 150, true)).toBe(true);
    expect(lia.journal().some((f) => f.quoi === motif)).toBe(true);
  });

  it("si Marc ne bouge pas, elle n'en parle pas", () => {
    lia = mountLia({ monde: seule("resumer", "Côté DriveAI : ça monte.") });
    seconde(150);
    expect(lia.journal().some((f) => f.quoi === "resumer")).toBe(false);
  });

  it("une bonne nouvelle la réjouit : son réseau reçoit une impulsion « bon »", () => {
    lia = mountLia({ monde: seule("feliciter", "Ça fait plaisir : tout est vert.") });
    presente(60);
    const bon = lia.ressent().map(([nom]) => nom);
    expect(lia.journal().some((f) => f.quoi === "feliciter")).toBe(true);
    expect(bon.length).toBeGreaterThan(0);
    expect(lia.envies().joie).toBeGreaterThan(0.25);
  });
});

describe("veiller, sans l'hôte", () => {
  it("la nuit, elle veille un moment (silhouette « surveille ») et le note", () => {
    vi.setSystemTime(new Date(2026, 9, 22, 2, 0, 0));
    lia = mountLia({});
    seconde(120);
    expect(lia.journal().some((f) => f.quoi === "veiller")).toBe(true);
  });

  it("en plein jour avec Marc là, elle ne veille pas", () => {
    lia = mountLia({});
    for (let i = 0; i < 24; i++) {
      bouger();
      seconde(5);
    }
    expect(lia.journal().some((f) => f.quoi === "veiller")).toBe(false);
  });
});

describe("elle vient regarder avec Marc (accompagner)", () => {
  let regard: HTMLElement;
  beforeEach(() => {
    document.body.insertAdjacentHTML("beforeend", `<article id="regard" data-lia-cible>JobAI</article><article id="autre" data-lia-cible>CarAI</article>`);
    regard = document.getElementById("regard") as HTMLElement;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
      if (this.id === "regard" || this.id === "autre") return rectDe({ left: 500, top: 300, right: 800, bottom: 500 });
      return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
    });
  });
  const survoler = (el: Element): void => void el.dispatchEvent(new Event("pointermove", { bubbles: true }));
  const phrase = { text: "Tu regardes JobAI depuis un moment : trois offres sont arrivées." };

  it("après 4 s sur un élément, elle demande à l'hôte avec cet élément, vient et dit sa phrase", () => {
    const monde = vi.fn((m: MotifMonde, el?: Element) => (m === "accompagner" && el === regard ? phrase : null));
    lia = mountLia({ monde });
    survoler(regard);
    seconde(3);
    expect(monde.mock.calls.some(([m]) => m === "accompagner")).toBe(false);
    expect(attendreDit(phrase.text, 20)).toBe(true);
    expect(monde).toHaveBeenCalledWith("accompagner", regard);
  });

  it("marque l'élément regardé (data-regard) tant qu'elle est là, puis l'efface", () => {
    lia = mountLia({ monde: (m) => (m === "accompagner" ? phrase : null) });
    survoler(regard);
    expect(attendreDit(phrase.text, 20)).toBe(true);
    expect(regard.hasAttribute("data-regard")).toBe(true);
    lia.destroy();
    lia = null;
    expect(regard.hasAttribute("data-regard")).toBe(false);
  });

  it("n'y revient pas avant 3 minutes pour le même élément", () => {
    const monde = vi.fn((m: MotifMonde) => (m === "accompagner" ? phrase : null));
    lia = mountLia({ monde });
    survoler(regard);
    expect(attendreDit(phrase.text, 20)).toBe(true);
    const appels = monde.mock.calls.filter(([m]) => m === "accompagner").length;
    seconde(120);
    expect(monde.mock.calls.filter(([m]) => m === "accompagner").length).toBe(appels);
    seconde(80);
    expect(monde.mock.calls.filter(([m]) => m === "accompagner").length).toBeGreaterThan(appels);
  });

  it("changer d'élément remet le compte à zéro ; quitter les éléments l'arrête", () => {
    const monde = vi.fn((m: MotifMonde) => (m === "accompagner" ? phrase : null));
    lia = mountLia({ monde });
    survoler(regard);
    seconde(3);
    survoler(document.getElementById("autre") as Element);
    seconde(3);
    expect(monde.mock.calls.some(([m]) => m === "accompagner")).toBe(false);
    survoler(document.body);
    seconde(10);
    expect(monde.mock.calls.some(([m]) => m === "accompagner")).toBe(false);
  });

  it("l'hôte qui n'a rien à dire (null) : elle ne vient pas", () => {
    lia = mountLia({ monde: () => null });
    survoler(regard);
    seconde(30);
    expect(dit()).toBe("");
    expect(regard.hasAttribute("data-regard")).toBe(false);
  });
});
