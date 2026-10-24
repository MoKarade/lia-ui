import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { DescriptionElement, LiaHandle, ReponseLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
let carte: HTMLElement;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

const clicDroit = (cible: Element, init: MouseEventInit = {}): MouseEvent => {
  const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 500, clientY: 300, ...init });
  cible.dispatchEvent(e);
  return e;
};
const menu = (): HTMLElement | null => document.querySelector<HTMLElement>(".lia-ui__menu");
const entrees = (): string[] =>
  [...document.querySelectorAll<HTMLElement>(".lia-ui__menu [role=menuitem]")].map((b) => b.textContent ?? "");
const choisir = (libelle: string): void => {
  const b = [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__menu [role=menuitem]")].find(
    (x) => x.textContent === libelle,
  );
  if (!b) throw new Error(`entrée absente : ${libelle}`);
  b.click();
};

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this === carte) return rectDe({ left: 100, top: 300, right: 400, bottom: 500 });
    if (this.id === "dedans") return rectDe({ left: 120, top: 320, right: 300, bottom: 340 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `
    <section id="carte" data-lia-genre="une carte d'app" data-lia-app="DriveAI"><span id="dedans">Hors ligne depuis 2 h</span></section>
    <input id="champ"><p id="para">Un paragraphe</p>`;
  carte = document.getElementById("carte") as HTMLElement;
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("clic droit sur un élément de la page", () => {
  it("ouvre le menu à quatre entrées avec ce que LIA a compris, et garde le clic droit", () => {
    lia = mountLia({ vieAutonome: false });
    const e = clicDroit(document.getElementById("dedans") as Element);
    expect(e.defaultPrevented).toBe(true);
    expect(entrees()).toEqual(["Explique-moi ça", "Que peut-on changer ici ?", "Regarde ça avec moi", "Poser une question…"]);
    expect(menu()?.querySelector(".lia-ui__menu-titre")?.textContent).toBe(
      "Un texte · DriveAI : « Hors ligne depuis 2 h »",
    );
  });

  it("« Explique-moi ça » ouvre la discussion et envoie à ask l'élément comme donnée", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({ text: "C'est la carte de DriveAI." });
    lia = mountLia({ vieAutonome: false, ask });
    clicDroit(document.getElementById("dedans") as Element);
    choisir("Explique-moi ça");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1), { timeout: 8000 });
    const envoye = ask.mock.calls[0]?.[0] ?? "";
    expect(envoye).toContain("Explique-moi cet élément de la page");
    expect(envoye).toContain("genre : un texte ; app : DriveAI ; texte : « Hors ligne depuis 2 h »");
    // La discussion montre l'entrée choisie, pas le texte technique envoyé.
    await vi.waitFor(() => {
      const msgs = [...document.querySelectorAll(".lia-ui__msg")].map((m) => m.textContent);
      expect(msgs).toContain("Explique-moi ça : « Hors ligne depuis 2 h »");
      expect(msgs).toContain("C'est la carte de DriveAI.");
    });
  });

  it("« Explique-moi ça » sur le texte d'une carte : ses nanobots analysent CE texte, pas la carte (Marc : « ça analyse pas forcément ce que je clique »)", () => {
    lia = mountLia({ vieAutonome: false, ask: vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockReturnValue(new Promise(() => undefined)) });
    clicDroit(document.getElementById("dedans") as Element);
    choisir("Explique-moi ça");
    // Dès le clic, avant même qu'elle soit arrivée : la cible est le texte (120..300 × 320..340), jamais la carte (100..400 × 300..500).
    expect(lia.nanobots().cible).toEqual({ x: 120, y: 320, w: 180, h: 20 });
    expect(lia.nanobots().total).toBeGreaterThanOrEqual(18);
    // Le titre du menu et la question disent la même chose : ce texte.
    expect(document.querySelector(".lia-ui__cadre")).toBeNull();
  });

  it("« Explique-moi ça » sur la carte elle-même (son fond) : la cible est la carte", () => {
    lia = mountLia({ vieAutonome: false, ask: vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockReturnValue(new Promise(() => undefined)) });
    clicDroit(carte);
    choisir("Explique-moi ça");
    expect(lia.nanobots().cible).toEqual({ x: 100, y: 300, w: 300, h: 200 });
  });

  it("ne dessine aucun cadre autour de l'élément dont elle parle (seuls ses nanobots analysent) et ne touche pas à la page", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({ text: "Voilà." });
    lia = mountLia({ vieAutonome: false, ask });
    clicDroit(carte);
    choisir("Regarde ça avec moi");
    await vi.waitFor(() => expect(ask).toHaveBeenCalled());
    // Ni cadre, ni carré : Marc (24/10) veut seulement les 100 nanobots.
    expect(document.querySelector(".lia-ui__repere")).toBeNull();
    expect(document.querySelector(".lia-ui__cadre")).toBeNull();
    // Le seul ajout est le marqueur que l'hôte peut styler tant que la discussion est posée sur l'élément.
    expect(carte.getAttributeNames().sort()).toEqual(["data-lia-app", "data-lia-genre", "data-regard", "id"]);
    lia.fermerChat();
    // Le marqueur part quand elle cesse de regarder l'élément (fin de l'attention, quelques secondes).
    await vi.waitFor(() => expect(carte.hasAttribute("data-regard")).toBe(false), { timeout: 12000 });
  });

  it("« Explique-moi ça » : les nanobots partent tout de suite, sans attendre qu'elle arrive ni la réponse, puis rentrent après elle", async () => {
    let repondre: (r: ReponseLia) => void = () => undefined;
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockReturnValue(new Promise((ok) => (repondre = ok)));
    lia = mountLia({ vieAutonome: false, ask });
    expect(lia.nanobots().actif).toBe(false);
    clicDroit(carte);
    choisir("Explique-moi ça");
    // Dès le clic : l'essaim existe autour de la carte (100..400 × 300..500), alors que la question n'est même pas partie.
    expect(lia.nanobots().actif).toBe(true);
    expect(lia.nanobots().cible).toEqual({ x: 100, y: 300, w: 300, h: 200 });
    expect(ask).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(ask).toHaveBeenCalled(), { timeout: 8000 });
    // Pendant qu'elle attend le modèle, ils travaillent encore sur la carte.
    await vi.waitFor(() => expect(lia?.nanobots().surCible).toBeGreaterThanOrEqual(0.9), { timeout: 4000 });
    expect(lia.nanobots().actif).toBe(true);
    repondre({ text: "Voilà." });
    await vi.waitFor(() => expect(lia?.nanobots().actif).toBe(false), { timeout: 8000 });
  }, 30000);

  it("pendant qu'elle réfléchit à l'élément, elle garde l'air de lire et son marqueur reste posé", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockReturnValue(new Promise(() => undefined));
    lia = mountLia({ vieAutonome: false, ask });
    clicDroit(carte);
    choisir("Regarde ça avec moi");
    await vi.waitFor(() => expect(ask).toHaveBeenCalled());
    const etat = (): string | undefined => document.querySelector<HTMLElement>(".lia-ui__corps")?.dataset["etat"];
    // Une fois posée près de l'élément (la fin de son déplacement la remettait « au repos »), elle lit encore.
    await vi.waitFor(() => expect(etat()).toBe("lit"), { timeout: 3000 });
    await new Promise((r) => setTimeout(r, 1300));
    expect(etat()).toBe("lit");
    expect(carte.hasAttribute("data-regard")).toBe(true);
  });

  it("« Poser une question… » attend la question de Marc, puis l'envoie avec l'élément", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({ text: "Parce que…" });
    lia = mountLia({ vieAutonome: false, ask });
    clicDroit(carte);
    choisir("Poser une question…");
    await vi.waitFor(() => expect(document.querySelector(".lia-ui__chat")).not.toBeNull());
    expect(ask).not.toHaveBeenCalled();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    expect(champ.placeholder).toContain("Ta question sur « Hors ligne depuis 2 h »");
    champ.value = "Pourquoi hors ligne ?";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1), { timeout: 8000 });
    const envoye = ask.mock.calls[0]?.[0] ?? "";
    expect(envoye.startsWith("Pourquoi hors ligne ?\n")).toBe(true);
    expect(envoye).toContain("app : DriveAI");
    // La question suivante part seule : l'élément n'est joint qu'une fois.
    await vi.waitFor(() => expect(champ.disabled).toBe(false));
    champ.value = "Et demain ?";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(2));
    expect(ask.mock.calls[1]?.[0]).toBe("Et demain ?");
  });

  it("sans ask : elle dit qu'elle est indisponible, n'invente rien", async () => {
    lia = mountLia({ vieAutonome: false });
    clicDroit(carte);
    choisir("Explique-moi ça");
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain("Je ne suis pas disponible pour le moment.");
    });
  });

  it("laisse le menu du navigateur sur un champ, avec Maj, ou si la page l'a déjà pris", () => {
    lia = mountLia({ vieAutonome: false });
    expect(clicDroit(document.getElementById("champ") as Element).defaultPrevented).toBe(false);
    expect(clicDroit(carte, { shiftKey: true }).defaultPrevented).toBe(false);
    const dejaPris = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.getElementById("para")?.addEventListener("contextmenu", (e) => e.preventDefault(), { once: true });
    document.getElementById("para")?.dispatchEvent(dejaPris);
    expect(menu()).toBeNull();
  });

  it("le clic droit sur son propre corps garde son menu à elle", () => {
    lia = mountLia({ vieAutonome: false });
    clicDroit(document.querySelector(".lia-ui__hit") as Element);
    expect(entrees().filter(Boolean)).toEqual(["Lui parler", "Comment elle va", "Toutes ses actions", "La laisser vivre"]);
  });

  it("l'hôte décrit ses éléments, ou dit « pas celui-là » avec null", () => {
    const decrire = vi.fn((e: Element): DescriptionElement | null =>
      e.id === "carte" ? { genre: "la carte de l'app", nom: "Drive", texte: "<b>hors ligne</b>" } : null,
    );
    lia = mountLia({ vieAutonome: false, elements: { decrire } });
    clicDroit(carte);
    expect(menu()?.querySelector(".lia-ui__menu-titre")?.textContent).toBe("La carte de l'app · Drive : « b hors ligne /b »");
    lia.fermerChat();
    document.querySelector(".lia-ui__menu")?.remove();
    expect(clicDroit(document.getElementById("para") as Element).defaultPrevented).toBe(false);
  });

  it("une description de l'hôte qui plante : le menu du navigateur reste et la page continue", () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lia = mountLia({
      vieAutonome: false,
      elements: {
        decrire: () => {
          throw new Error("boum");
        },
      },
    });
    expect(clicDroit(carte).defaultPrevented).toBe(false);
    expect(erreur).toHaveBeenCalled();
  });

  it("elements: false coupe tout, destroy retire l'écoute", () => {
    lia = mountLia({ vieAutonome: false, elements: false });
    expect(clicDroit(carte).defaultPrevented).toBe(false);
    lia.destroy();
    lia = mountLia({ vieAutonome: false });
    lia.destroy();
    expect(clicDroit(carte).defaultPrevented).toBe(false);
    lia = null;
  });

  it("Échap ferme le menu, le défilement aussi", () => {
    lia = mountLia({ vieAutonome: false });
    clicDroit(carte);
    menu()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu()).toBeNull();
    clicDroit(carte);
    expect(menu()).not.toBeNull();
    window.dispatchEvent(new Event("scroll"));
    expect(menu()).toBeNull();
  });
});
