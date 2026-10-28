import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

const clicDroit = (cible: Element, init: MouseEventInit = {}): MouseEvent => {
  const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 500, clientY: 300, ...init });
  cible.dispatchEvent(e);
  return e;
};
const menu = (): HTMLElement | null => document.querySelector<HTMLElement>(".lia-ui__menu");
const titre = (): string => menu()?.querySelector(".lia-ui__menu-titre")?.textContent ?? "";
const couche = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui") as HTMLElement;

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this.id === "cadre") return rectDe({ left: 200, top: 100, right: 800, bottom: 500 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.title = "Chantier";
  document.body.innerHTML = `<p id="para">Un paragraphe</p><button id="tenir">Tenir</button><iframe id="cadre"></iframe><input id="champ">`;
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("le clic droit marche partout", () => {
  it("dans un conteneur de l'hôte, le menu d'un élément s'ouvre dans sa propre couche, au-dessus de toute fenêtre de l'hôte, et se retire à la fermeture", () => {
    const hote = document.createElement("div");
    hote.id = "hote";
    document.body.appendChild(hote);
    lia = mountLia({ vieAutonome: false, container: hote });
    const para = document.getElementById("para") as Element;
    clicDroit(para);
    const m = menu() as HTMLElement;
    expect(m).not.toBeNull();
    expect(hote.contains(m)).toBe(false); // pas dans le conteneur (z-index 5, sous une fenêtre de z-index 10)
    const couche = m.closest(".lia-ui") as HTMLElement;
    expect(couche.parentElement).toBe(document.body);
    expect(couche.classList.contains("lia-ui--conteneur")).toBe(false); // la couche pleine page, au-dessus de tout
    // le menu n'est pas lui-même une cible pour LIA : un clic droit dessus n'ouvre pas un second menu
    const titreMenu = m.querySelector(".lia-ui__menu-titre") as Element;
    clicDroit(titreMenu);
    expect(document.querySelectorAll(".lia-ui__menu").length).toBe(1);
    // fermer le menu retire aussi sa couche
    m.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu()).toBeNull();
    expect(document.querySelectorAll(".lia-ui").length).toBe(1); // reste la couche de LIA dans son conteneur
  });

  it("la page a pris le menu natif ou arrêté la propagation : LIA ouvre quand même son menu", () => {
    lia = mountLia({ vieAutonome: false });
    const tenir = document.getElementById("tenir") as Element;
    tenir.addEventListener("contextmenu", (e) => e.preventDefault());
    expect(clicDroit(tenir).defaultPrevented).toBe(true);
    expect(titre()).toContain("Un bouton");
    lia.fermerChat();
    menu()?.remove();
    const para = document.getElementById("para") as Element;
    para.addEventListener("contextmenu", (e) => e.stopPropagation());
    clicDroit(para);
    expect(titre()).toContain("Un paragraphe");
  });

  it("le fond de la page (body, html) est « la page », avec le titre du document", () => {
    lia = mountLia({ vieAutonome: false });
    expect(clicDroit(document.body).defaultPrevented).toBe(true);
    expect(titre()).toBe("La page : « Chantier »");
    menu()?.remove();
    expect(clicDroit(document.documentElement).defaultPrevented).toBe(true);
    expect(titre()).toBe("La page : « Chantier »");
  });

  it("un champ de saisie garde le menu du navigateur", () => {
    lia = mountLia({ vieAutonome: false });
    expect(clicDroit(document.getElementById("champ") as Element).defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it("un élément dans un shadow DOM est vu, pas son hôte", () => {
    const hote = document.createElement("div");
    hote.id = "hote";
    document.body.appendChild(hote);
    const ombre = hote.attachShadow({ mode: "open" });
    ombre.innerHTML = `<p id="dedans">Texte caché dans l'ombre</p>`;
    lia = mountLia({ vieAutonome: false });
    const e = new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true, clientX: 500, clientY: 300 });
    ombre.getElementById("dedans")?.dispatchEvent(e);
    expect(titre()).toContain("Texte caché dans l'ombre");
  });
});

describe("une fenêtre modale", () => {
  it("la couche de LIA s'y pose tant qu'elle est ouverte, puis revient dans la page", () => {
    const dialogue = document.createElement("dialog");
    dialogue.innerHTML = `<p id="fiche">Une recette</p>`;
    document.body.appendChild(dialogue);
    const modale = vi.spyOn(Document.prototype, "querySelectorAll");
    lia = mountLia({ vieAutonome: false });
    expect(couche().parentElement).toBe(document.body);
    // jsdom n'a pas `:modal` : on le lui apprend, comme un navigateur qui a une fenêtre modale ouverte.
    let ouverte = true;
    modale.mockImplementation(function (this: Document, sel: string) {
      if (sel === "dialog:modal") return (ouverte ? [dialogue] : []) as unknown as NodeListOf<Element>;
      return Document.prototype.querySelectorAll.call(this, sel) as NodeListOf<Element>;
    });
    clicDroit(dialogue.querySelector("#fiche") as Element);
    expect(couche().parentElement).toBe(dialogue);
    expect(titre()).toContain("Une recette");
    ouverte = false;
    dialogue.dispatchEvent(new Event("close"));
    expect(couche().parentElement).toBe(document.body);
    modale.mockRestore();
  });
});

describe("la zone où LIA vit ne borne pas le menu d'un élément", () => {
  it("un panneau de l'hôte hors de `bounds` : le menu s'ouvre sous le clic, pas ramené dans la zone de LIA", () => {
    // MemoryAI : `bounds` exclut le panneau « Sa journée » à droite ; un clic droit DANS le panneau doit ouvrir le menu là.
    lia = mountLia({ vieAutonome: false, bounds: () => ({ x: 0, y: 0, w: 400, h: 800 }) });
    clicDroit(document.getElementById("para") as Element, { clientX: 800, clientY: 300 });
    expect(menu()?.style.left).toBe("800px");
    expect(menu()?.style.top).toBe("300px");
  });
});

describe("un cadre", () => {
  it("menuExterne : le menu s'ouvre à la bonne place de la page, la cible est le cadre", () => {
    const surMode = vi.fn();
    lia = mountLia({ vieAutonome: false, elements: { surMode } });
    const cadre = document.getElementById("cadre") as Element;
    expect(lia.menuExterne({ cadre, x: 50, y: 30, description: { genre: "une barre du Gantt", texte: "Tâche 12" } })).toBe(true);
    expect(titre()).toBe("Une barre du Gantt : « Tâche 12 »");
    // (200 + 50, 100 + 30) dans la page.
    expect(menu()?.style.left).toBe("250px");
    expect(menu()?.style.top).toBe("130px");
    (document.querySelector(".lia-ui__menu [role=menuitem]") as HTMLElement).click();
    expect(surMode).toHaveBeenCalledWith("expliquer", cadre, { genre: "une barre du Gantt", texte: "Tâche 12" });
  });

  it("menuExterne refuse un cadre absent, des coordonnées folles, ou elements: false", () => {
    lia = mountLia({ vieAutonome: false });
    const cadre = document.getElementById("cadre") as Element;
    expect(lia.menuExterne({ cadre, x: Number.NaN, y: 3, description: { genre: "x" } })).toBe(false);
    expect(lia.menuExterne({ cadre: document.createElement("iframe"), x: 1, y: 1, description: { genre: "x" } })).toBe(false);
    lia.destroy();
    lia = mountLia({ vieAutonome: false, elements: false });
    expect(lia.menuExterne({ cadre, x: 1, y: 1, description: { genre: "x" } })).toBe(false);
    expect(menu()).toBeNull();
  });

  it("un cadre de même origine : LIA l'écoute seule et ouvre le menu à la place du clic dans la page", async () => {
    const cadre = document.getElementById("cadre") as HTMLIFrameElement;
    const doc = cadre.contentDocument as Document;
    doc.body.innerHTML = `<p id="interne">Texte du cadre</p>`;
    lia = mountLia({ vieAutonome: false });
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 20 });
    doc.getElementById("interne")?.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(titre()).toContain("Texte du cadre");
    expect(menu()?.style.left).toBe("240px");
    expect(menu()?.style.top).toBe("120px");
  });
});
