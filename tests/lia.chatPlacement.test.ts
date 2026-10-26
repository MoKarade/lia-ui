import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { CSS } from "../src/styles.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
let largeur = 0;
let hauteur = 0;
let lecturesLargeur = 0;
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const corps = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__corps") as HTMLElement;
const chat = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__chat") as HTMLElement;
const journal = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__journal") as HTMLElement;
const position = (): { x: number; y: number } => {
  const m = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(corps().style.transform);
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};
const evt = (type: string, x: number, y: number): void =>
  void hit().dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));
/** Un geste lent : appui sur elle, déplacement jusqu'en (x1, y1), relâchement, puis le temps de se poser. */
const poser = (x1: number, y1: number): void => {
  const d = position();
  evt("pointerdown", d.x, d.y);
  const pas = 120;
  for (let k = 1; k <= pas; k++) {
    evt("pointermove", d.x + ((x1 - d.x) * k) / pas, d.y + ((y1 - d.y) * k) / pas);
    vi.advanceTimersByTime(25);
  }
  evt("pointerup", x1, y1);
  vi.advanceTimersByTime(3000);
};
const place = (): { x: number; y: number } => ({ x: parseFloat(chat().style.left), y: parseFloat(chat().style.top) });
const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
const monter = (o: Parameters<typeof mountLia>[0] = {}): LiaHandle =>
  (lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", bounds: () => ({ x: 0, y: 0, w: 900, h: 600 }), ask: () => Promise.resolve({ text: "ok" }), ...o }));

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  largeur = 440;
  hauteur = 300;
  lecturesLargeur = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 26, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("lia-ui") ? rectDe({ left: 0, top: 0, right: 900, bottom: 600 }) : rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    if (!this.classList.contains("lia-ui__chat")) return 0;
    lecturesLargeur++;
    return largeur;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("lia-ui__chat") ? hauteur : 0;
  });
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "visualViewport");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("la discussion reste entièrement dans l'écran", () => {
  it("aux quatre coins de la zone, bureau", () => {
    monter();
    vi.advanceTimersByTime(500);
    for (const [x, y] of [
      [60, 60],
      [840, 60],
      [60, 540],
      [840, 540],
    ] as const) {
      poser(x, y);
      lia?.ouvrirChat();
      vi.advanceTimersByTime(200);
      const p = place();
      expect(p.x).toBeGreaterThanOrEqual(8);
      expect(p.y).toBeGreaterThanOrEqual(8);
      expect(p.x + largeur).toBeLessThanOrEqual(900 - 8);
      expect(p.y + hauteur).toBeLessThanOrEqual(600 - 8);
      lia?.fermerChat();
    }
  });

  it("avec le clavier du téléphone, la discussion reste au-dessus de lui, puis suit quand il se ferme", () => {
    const vv = Object.assign(new EventTarget(), { offsetLeft: 0, offsetTop: 0, width: 900, height: 320 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    monter();
    vi.advanceTimersByTime(500);
    poser(450, 300);
    lia?.ouvrirChat();
    vi.advanceTimersByTime(200);
    let p = place();
    expect(p.y).toBeGreaterThanOrEqual(8);
    expect(p.y + hauteur).toBeLessThanOrEqual(320 - 8);
    expect(parseFloat(chat().style.maxHeight)).toBeLessThanOrEqual(320 - 16);
    // Le clavier se ferme : l'écran visible grandit, la discussion reste dedans et ne dépasse plus le plafond de 720 px.
    vv.height = 600;
    vv.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(100);
    p = place();
    expect(p.y + hauteur).toBeLessThanOrEqual(600 - 8);
    expect(parseFloat(chat().style.maxHeight)).toBeLessThanOrEqual(584);
  });
});

describe("la discussion ne bouge pas pour rien", () => {
  it("pas de recalcul à chaque image : LIA immobile, la place n'est pas relue", () => {
    monter();
    vi.advanceTimersByTime(500);
    poser(450, 300);
    lia?.ouvrirChat();
    vi.advanceTimersByTime(200);
    const avant = lecturesLargeur;
    const posAvant = place();
    vi.advanceTimersByTime(2000); // une centaine d'images
    expect(lecturesLargeur).toBe(avant);
    expect(place()).toEqual(posAvant);
  });

  it("quand le texte arrive, elle garde sa place et grandit vers le bas", () => {
    const observateurs: Array<() => void> = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          observateurs.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    monter();
    vi.advanceTimersByTime(500);
    poser(450, 300);
    largeur = 300; // assez étroite pour se poser à côté d'elle : le haut reste fixe
    hauteur = 120;
    lia?.ouvrirChat();
    vi.advanceTimersByTime(200);
    expect(observateurs.length).toBe(1);
    const avant = place();
    hauteur = 260; // une réponse est arrivée
    observateurs[0]?.();
    vi.advanceTimersByTime(100);
    const apres = place();
    expect(apres.x).toBe(avant.x);
    expect(apres.y).toBe(avant.y);
    // Si elle n'a plus la place en bas, elle remonte juste ce qu'il faut.
    hauteur = 580;
    observateurs[0]?.();
    vi.advanceTimersByTime(100);
    expect(place().y + 580).toBeLessThanOrEqual(600 - 8);
    expect(place().x).toBe(avant.x);
  });

  it("posée au-dessus d'elle (écran étroit), c'est son bord du bas qui reste fixe", () => {
    const observateurs: Array<() => void> = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          observateurs.push(cb);
        }
        observe(): void {}
        disconnect(): void {}
      },
    );
    monter();
    vi.advanceTimersByTime(500);
    poser(450, 400);
    hauteur = 120;
    lia?.ouvrirChat();
    vi.advanceTimersByTime(200);
    const avant = place();
    hauteur = 200;
    observateurs[0]?.();
    vi.advanceTimersByTime(100);
    const apres = place();
    expect(apres.x).toBe(avant.x);
    expect(apres.y + 200).toBeCloseTo(avant.y + 120, 5);
  });

  it("elle ne suit LIA que d'un vrai déplacement, pas d'un souffle", () => {
    monter();
    vi.advanceTimersByTime(500);
    poser(450, 300);
    lia?.ouvrirChat();
    vi.advanceTimersByTime(200);
    const avant = place();
    poser(458, 304); // quelques pixels
    expect(place()).toEqual(avant);
    poser(120, 120); // un vrai déplacement
    expect(place()).not.toEqual(avant);
  });

  it("elle glisse vers sa nouvelle place sans glisser à l'ouverture, et pas du tout si le mouvement est réduit", () => {
    monter();
    expect(CSS).toContain(".lia-ui__chat--glisse{transition:left");
    expect(CSS).toMatch(/prefers-reduced-motion:reduce\)\{[^}]*\}[^@]*\.lia-ui__chat--glisse\{transition:none\}|\.lia-ui__chat--glisse\{transition:none\}/);
    lia?.ouvrirChat();
    // La classe de glissement arrive après la première pose : pas de trajet depuis le coin à l'ouverture.
    expect(chat().classList.contains("lia-ui__chat--glisse")).toBe(true);
    expect(chat().style.left).toMatch(/px$/);
  });
});

describe("le journal reste collé en bas, sauf si Marc remonte lire", () => {
  const brancher = (): { haut: () => number; fixer: (v: number) => void } => {
    let st = 0;
    Object.defineProperty(journal(), "scrollHeight", { configurable: true, get: () => 1000 });
    Object.defineProperty(journal(), "clientHeight", { configurable: true, get: () => 300 });
    Object.defineProperty(journal(), "scrollTop", { configurable: true, get: () => st, set: (v: number) => (st = v) });
    return { haut: () => st, fixer: (v) => (st = v) };
  };
  const envoyer = async (q: string): Promise<void> => {
    (document.querySelector(".lia-ui__champ") as HTMLInputElement).value = q;
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.advanceTimersByTimeAsync(50);
  };

  it("une réponse recolle le journal en bas quand il y était ; pas quand Marc a remonté ; son propre message toujours", async () => {
    monter();
    lia?.ouvrirChat();
    const s = brancher();
    await envoyer("Bonjour ?");
    expect(s.haut()).toBe(1000);
    // Marc remonte lire un ancien message.
    s.fixer(100);
    journal().dispatchEvent(new Event("scroll"));
    lia?.dire("Un message de plus");
    lia?.activite("lit", 1);
    // La réponse à une nouvelle question arrive : Marc a écrit (recolle), puis la réponse suit en bas.
    s.fixer(100);
    journal().dispatchEvent(new Event("scroll"));
    await envoyer("Et encore ?");
    expect(s.haut()).toBe(1000);
  });
});
