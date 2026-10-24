import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

// Elle décide toujours de se promener (le choix du comportement est le seul morceau remplacé).
vi.mock("../src/cerveau.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("../src/cerveau.js")>()), choisirComportement: () => "promener" }));
const { mountLia } = await import("../src/lia.js");

let lia: LiaHandle | null = null;
const corps = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__corps") as HTMLElement;
const ombre = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__ombre") as HTMLElement;
const toile = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__toile") as HTMLElement;
const echelleCorps = (): number => {
  const m = /scale\(([-\d.]+),\s*([-\d.]+)\)/.exec(toile().style.transform);
  return m ? Number(m[1]) : 1;
};
const xy = (el: HTMLElement): { x: number; y: number } => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};
const position = (): { x: number; y: number } => xy(corps());
/** Son rayon, lu sur sa toile (5 rayons de côté) : le centre, posée, est à 0,6 rayon au-dessus du bord de la carte. */
const rayon = (): number => parseFloat(toile().style.width) / 5;
const perchee = (): boolean => corps().dataset["perche"] === "1";
const enVol = (): boolean => corps().dataset["vol"] === "1";
const monter = (o: Parameters<typeof mountLia>[0] = {}): LiaHandle =>
  (lia = mountLia({ vieAutonome: true, quandMouvementReduit: "complet", bounds: () => ({ x: 0, y: 0, w: 1200, h: 800 }), ...o }));

const RECT0 = { left: 300, top: 350, right: 700, bottom: 520 };
type R = { left: number; top: number; right: number; bottom: number };
let rectCarte: R = { ...RECT0 };
const rectDe = (r: R): DOMRect => ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
/** Une carte de la page dont la place est simulée (jsdom ne fait aucune mise en page). */
const poserCarte = (): HTMLElement => {
  const el = document.createElement("section");
  el.setAttribute("data-lia-cible", "");
  el.textContent = "Une carte";
  document.body.appendChild(el);
  vi.spyOn(el, "getBoundingClientRect").mockImplementation(() => rectDe(rectCarte));
  return el;
};
const defiler = (y: number): void => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
};

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  rectCarte = { ...RECT0 };
  document.body.innerHTML = `<p>Une page</p>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  defiler(0);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

interface Image {
  vol: boolean;
  perchee: boolean;
  opacite: number;
  ombreY: number;
  accroupie: number;
  pos: { x: number; y: number };
}
const image = (): Image => ({ vol: enVol(), perchee: perchee(), opacite: Number(ombre().style.opacity || 0), ombreY: xy(ombre()).y, accroupie: echelleCorps(), pos: position() });

/** Avance image par image et relève l'état du corps. */
const suivre = (secondes: number, jusqua?: () => boolean): Image[] => {
  const r: Image[] = [];
  for (let k = 0; k < (secondes * 1000) / 16; k++) {
    vi.advanceTimersByTime(16);
    r.push(image());
    if (jusqua?.()) break;
  }
  return r;
};

describe("le perchoir : elle bondit sur une carte, s'y pose, la suit et en redescend", () => {
  it("accroupie, en vol avec son ombre, elle atterrit SUR le bord haut de la carte (à 3 px près) et s'y tient", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    monter();
    const avant = suivre(40, perchee);
    expect(perchee()).toBe(true);
    const premierVol = avant.findIndex((i) => i.vol);
    expect(premierVol).toBeGreaterThan(0);
    // Elle s'est accroupie avant de partir.
    expect(Math.min(...avant.slice(Math.max(0, premierVol - 15), premierVol).map((i) => i.accroupie))).toBeLessThan(0.97);
    // En vol, une ombre visible, portée sur la carte : près de son bord haut, pas au sol de la zone (800).
    const enVolImages = avant.filter((i) => i.vol);
    expect(Math.max(...enVolImages.map((i) => i.opacite))).toBeGreaterThan(0.1);
    const finVol = enVolImages.slice(-8);
    for (const i of finVol) {
      expect(i.ombreY).toBeGreaterThan(RECT0.top - 10);
      expect(i.ombreY).toBeLessThan(RECT0.top + rayon());
    }
    // Posée : son centre est à 0,6 rayon au-dessus du bord haut, au-dessus de la carte, et plus d'ombre.
    const p = position();
    expect(Math.abs(p.y - (RECT0.top - 0.6 * rayon()))).toBeLessThanOrEqual(3);
    expect(p.x).toBeGreaterThanOrEqual(RECT0.left);
    expect(p.x).toBeLessThanOrEqual(RECT0.right);
    expect(enVol()).toBe(false);
    expect(Number(ombre().style.opacity || 0)).toBe(0);
    // Elle y reste un moment, sans bouger.
    const reste = suivre(5);
    expect(reste.every((i) => i.perchee)).toBe(true);
    for (const i of reste) {
      expect(Math.abs(i.pos.y - p.y)).toBeLessThanOrEqual(3);
      expect(Math.abs(i.pos.x - p.x)).toBeLessThanOrEqual(3);
    }
  });

  it("elle rebondit à l'arrivée avant de se poser : l'écrasement se voit à l'atterrissage", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    monter();
    const r = suivre(40, perchee);
    const dernierVol = r.map((i) => i.vol).lastIndexOf(true);
    expect(dernierVol).toBeGreaterThan(0);
    // Pendant la fin du vol (retombée et rebonds), le corps s'aplatit au moins une fois.
    expect(Math.min(...r.slice(Math.max(0, dernierVol - 40), dernierVol + 1).map((i) => i.accroupie))).toBeLessThan(0.97);
  });

  it("elle suit sa carte au défilement : la carte monte à l'écran, elle reste dessus (à 3 px près)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    // Défilement de 120 px : la carte est 120 px plus haut à l'écran, mais au même endroit de la page.
    defiler(120);
    rectCarte = { left: RECT0.left, top: RECT0.top - 120, right: RECT0.right, bottom: RECT0.bottom - 120 };
    const r = suivre(0.5);
    expect(r.at(-1)?.perchee).toBe(true);
    expect(Math.abs(position().y - (rectCarte.top - 0.6 * rayon()))).toBeLessThanOrEqual(3);
  });

  it("si la carte bouge de plus de 40 px dans la page, elle redescend et tombe vers le sol", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    // Un petit décalage (30 px) : elle reste.
    rectCarte = { left: RECT0.left, top: RECT0.top + 30, right: RECT0.right, bottom: RECT0.bottom + 30 };
    suivre(0.3);
    expect(perchee()).toBe(true);
    // Un grand (110 px dans la page, sans défilement) : elle redescend.
    rectCarte = { left: RECT0.left, top: RECT0.top + 110, right: RECT0.right, bottom: RECT0.bottom + 110 };
    const r = suivre(2);
    expect(perchee()).toBe(false);
    expect(r.some((i) => i.vol)).toBe(true);
    expect(position().y).toBeGreaterThan(RECT0.top + 110 - 0.6 * rayon());
  });

  it("si la carte disparaît de la page, elle redescend", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    const el = poserCarte();
    monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    el.remove();
    suivre(0.3);
    expect(perchee()).toBe(false);
    suivre(2);
    // Au sol de sa zone (ou au-dessus, flottant), bien plus bas que la carte.
    expect(position().y).toBeGreaterThan(RECT0.top + 100);
  });

  it("à la fin de son temps (au plus 15 s), elle redescend d'elle-même", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    suivre(12);
    expect(perchee()).toBe(false);
  });

  it("l'hôte la fait venir près de lui : le perchoir est annulé", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    const h = monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    expect(h.venirPres()).toBe(true);
    suivre(0.1);
    expect(perchee()).toBe(false);
    const apres = suivre(3);
    // Elle quitte la carte pour venir près de lui (coin bas-droit de la zone).
    expect(apres.at(-1)?.pos.y).toBeGreaterThan(RECT0.top + 100);
  });

  it("l'hôte l'envoie voir un élément, ou Marc ouvre la discussion : le perchoir est annulé", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    const ailleurs = document.createElement("div");
    ailleurs.setAttribute("data-lia-cible", "");
    document.body.appendChild(ailleurs);
    vi.spyOn(ailleurs, "getBoundingClientRect").mockImplementation(() => rectDe({ left: 800, top: 200, right: 1000, bottom: 300 }));
    const h = monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    expect(h.envoyer(ailleurs)).toBe(true);
    suivre(0.1);
    expect(perchee()).toBe(false);
    suivre(2);
    expect(corps().dataset["perche"]).toBe("0");

    // La discussion : un second montage, posée à nouveau, puis un clic sur son corps.
    h.destroy();
    lia = null;
    document.querySelectorAll(".lia-ui").forEach((n) => n.remove());
    const h2 = monter();
    suivre(40, perchee);
    expect(perchee()).toBe(true);
    h2.ouvrirChat();
    suivre(0.1);
    expect(perchee()).toBe(false);
  });

  it("un appui sur l'accroupissement l'annule : elle ne bondit pas", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    poserCarte();
    const h = monter();
    const r = suivre(40, () => echelleCorps() < 0.97);
    expect(r.at(-1)?.accroupie).toBeLessThan(0.97);
    expect(enVol()).toBe(false);
    expect(h.venirPres()).toBe(true);
    const apres = suivre(2.5);
    expect(apres.some((i) => i.perchee)).toBe(false);
    // Elle ne s'est pas élancée vers la carte : jamais de vol de bond (venirPres la glisse, il ne la fait pas bondir).
    expect(apres.some((i) => i.vol)).toBe(false);
  });

  it("mouvement réduit (doux ou fixe) : jamais de perchoir ni de vol", () => {
    for (const mode of ["doux", "fixe"] as const) {
      installerEnvironnement({ sansMouvement: true });
      vi.spyOn(Math, "random").mockReturnValue(0.25);
      document.body.innerHTML = `<p>Une page</p>`;
      poserCarte();
      monter({ quandMouvementReduit: mode });
      const r = suivre(40);
      expect(r.some((i) => i.perchee)).toBe(false);
      expect(r.some((i) => i.vol)).toBe(false);
      expect(Math.max(...r.map((i) => i.opacite))).toBe(0);
      lia?.destroy();
      lia = null;
      document.querySelectorAll(".lia-ui").forEach((n) => n.remove());
    }
  });

  it("une carte trop étroite, ou sans carte du tout : pas de perchoir (le bond au sol reste possible)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);
    rectCarte = { left: 300, top: 350, right: 340, bottom: 520 };
    poserCarte();
    monter();
    const r = suivre(40);
    expect(r.some((i) => i.perchee)).toBe(false);
    // Ni perchée, ni posée sur la carte étroite : son bond ordinaire (accroupissement, vol) a bien lieu.
    expect(r.some((i) => i.vol)).toBe(true);
  });

  it("sans bond tiré (hasard haut), elle ne se perche pas", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.6);
    poserCarte();
    monter();
    const r = suivre(40);
    expect(r.some((i) => i.perchee)).toBe(false);
    expect(r.some((i) => i.vol)).toBe(false);
  });
});
