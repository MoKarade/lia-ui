import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, ReponseLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const hit = (): HTMLButtonElement => {
  const b = document.querySelector<HTMLButtonElement>(".lia-ui__hit");
  if (!b) throw new Error("bouton de LIA absent");
  return b;
};
const touche = (cible: Element, key: string, init: KeyboardEventInit = {}): void => {
  cible.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
};
const soumettre = async (question: string): Promise<void> => {
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ");
  const form = document.querySelector<HTMLFormElement>(".lia-ui__form");
  if (!champ || !form) throw new Error("discussion fermée");
  champ.value = question;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(document.querySelector(".lia-ui__points")).toBeNull());
};
const messages = (): string[] => [...document.querySelectorAll(".lia-ui__msg")].map((m) => m.textContent ?? "");

beforeEach(() => installerEnvironnement());
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("montage", () => {
  it("crée sa couche, un bouton accessible, et la retire au démontage", () => {
    lia = mountLia();
    expect(document.querySelector(".lia-ui")).not.toBeNull();
    expect(hit().getAttribute("aria-label")).toBe("LIA : ouvrir la discussion");
    expect(document.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
    lia.destroy();
    expect(document.querySelector(".lia-ui")).toBeNull();
    expect(document.head.querySelectorAll("style[data-lia-ui]")).toHaveLength(1);
  });

  it("refuse une deuxième LIA, puis en accepte une après destroy", () => {
    lia = mountLia();
    expect(() => mountLia()).toThrow(/une seule LIA/);
    lia.destroy();
    lia = mountLia();
    expect(document.querySelectorAll(".lia-ui")).toHaveLength(1);
  });

  it("vit dans le conteneur donné, qui devient positionné", () => {
    const zone = document.createElement("div");
    document.body.appendChild(zone);
    lia = mountLia({ container: zone });
    expect(zone.style.position).toBe("relative");
    expect(zone.querySelector(".lia-ui--conteneur")).not.toBeNull();
  });
});

describe("discussion", () => {
  it("s'ouvre au clavier, se ferme avec Échap et rend le focus", () => {
    lia = mountLia();
    hit().focus();
    touche(hit(), "Enter");
    const dialogue = document.querySelector('[role="dialog"]');
    expect(dialogue?.getAttribute("aria-label")).toBe("Discussion avec LIA");
    expect(document.activeElement?.className).toContain("lia-ui__champ");
    touche(dialogue as Element, "Escape");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(hit());
  });

  it("sans ask : dit qu'elle est indisponible, n'invente rien", async () => {
    lia = mountLia();
    touche(hit(), "Enter");
    expect(messages()).toEqual(["Je ne suis pas disponible pour le moment."]);
    await soumettre("Où étais-je mardi ?");
    expect(messages().at(-1)).toBe("Je ne suis pas disponible pour le moment.");
  });

  it("montre la réponse de l'hôte comme du TEXTE, jamais comme du HTML", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({
      text: '<img src=x onerror="window.pwned=1"> Bonjour',
    });
    lia = mountLia({ ask });
    touche(hit(), "Enter");
    await soumettre("Salut");
    expect(ask).toHaveBeenCalledWith("Salut", expect.any(AbortSignal));
    expect(document.querySelector(".lia-ui img")).toBeNull();
    expect(messages()).toContain('<img src=x onerror="window.pwned=1"> Bonjour');
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });

  it("affiche une erreur honnête quand ask échoue", async () => {
    lia = mountLia({ ask: () => Promise.reject(new Error("réseau")) });
    touche(hit(), "Enter");
    await soumettre("Salut");
    expect(messages().at(-1)).toBe("Je n'arrive pas à répondre pour le moment.");
    expect(document.querySelector(".lia-ui__msg--erreur")).not.toBeNull();
  });

  it("transmet les puces de réponse à l'hôte et passe les blocs à renderBlocks", async () => {
    const onChip = vi.fn();
    const renderBlocks = vi.fn();
    lia = mountLia({
      onChip,
      renderBlocks,
      ask: () => Promise.resolve({ text: "Voilà", chips: [{ id: "plus", label: "Plus tard" }], blocks: [{ k: "carte" }] }),
    });
    touche(hit(), "Enter");
    await soumettre("Dis-moi");
    const puce = [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__puce")].find((b) => b.textContent === "Plus tard");
    puce?.click();
    expect(onChip).toHaveBeenCalledWith("plus", "reponse");
    expect(renderBlocks).toHaveBeenCalledWith([{ k: "carte" }], expect.any(HTMLElement));
  });

  it("annule la question en cours quand on ferme la discussion", async () => {
    let signal: AbortSignal | undefined;
    lia = mountLia({
      ask: (_q, s) => {
        signal = s;
        return new Promise<ReponseLia>(() => undefined);
      },
    });
    touche(hit(), "Enter");
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ");
    if (champ) champ.value = "Lente";
    document.querySelector<HTMLFormElement>(".lia-ui__form")?.dispatchEvent(new Event("submit", { cancelable: true }));
    expect(signal?.aborted).toBe(false);
    lia.fermerChat();
    expect(signal?.aborted).toBe(true);
  });

  it("ne parle pas par-dessus la discussion ouverte", () => {
    lia = mountLia();
    expect(lia.dire("Coucou")).toBe(true);
    lia.ouvrirChat();
    expect(lia.dire("Encore")).toBe(false);
  });
});

describe("menu", () => {
  it("propose ses actions et celles de l'hôte, et les exécute", async () => {
    const run = vi.fn();
    lia = mountLia({ actions: [{ id: "bail", label: "Voir le bail", run }] });
    hit().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    const libelles = [...document.querySelectorAll('[role="menuitem"]')].map((i) => i.textContent).filter(Boolean);
    expect(libelles).toEqual(["Lui parler", "La laisser tranquille", "Voir le bail"]);
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent === "Voir le bail")?.click();
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("se ferme avec Échap et se navigue aux flèches", () => {
    lia = mountLia();
    touche(hit(), "ContextMenu");
    const menu = document.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    const items = document.querySelectorAll<HTMLElement>('[role^="menuitem"]');
    expect(items[0]?.textContent).toBe("Lui parler");
    expect(document.activeElement).toBe(items[0]);
    touche(items[0] as Element, "ArrowDown");
    expect(document.activeElement).toBe(items[1]);
    touche(items[1] as Element, "Escape");
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });

  it("mémorise la vie autonome coupée", () => {
    lia = mountLia({ cle: "test" });
    touche(hit(), "ContextMenu");
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find((b) => b.textContent === "La laisser tranquille")?.click();
    expect(JSON.parse(localStorage.getItem("lia-ui:test") ?? "{}")).toMatchObject({ choixVie: false });
  });
});

describe("mouvement réduit", () => {
  it("en mode « fixe », ne lance aucune animation en continu", () => {
    installerEnvironnement({ sansMouvement: true });
    const raf = vi.spyOn(window, "requestAnimationFrame");
    lia = mountLia({ quandMouvementReduit: "fixe" });
    expect(raf).not.toHaveBeenCalled();
  });
});
