import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { CSS } from "../src/styles.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const chat = (): HTMLElement | null => document.querySelector<HTMLElement>(".lia-ui__chat");
const journal = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__journal") as HTMLElement;

beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = "";
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.restoreAllMocks();
});

describe("la discussion est fine : elle ne cache plus la page", () => {
  it("vide, ce n'est qu'une pilule de saisie : ni en-tête, ni journal visible, la fermeture est dans la pilule", () => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "ok" }) });
    lia.ouvrirChat();
    const c = chat() as HTMLElement;
    expect(c.querySelector(".lia-ui__entete")).toBeNull();
    expect(c.querySelector(".lia-ui__titre")).toBeNull();
    expect(getComputedStyle(journal()).display).toBe("none");
    const fermer = c.querySelector<HTMLButtonElement>(".lia-ui__form button[aria-label='Fermer la discussion']");
    expect(fermer).not.toBeNull();
    fermer?.click();
    expect(chat()).toBeNull();
  });

  it("le journal n'apparaît qu'avec le premier message, et sa hauteur est plafonnée", async () => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "Bonjour" }) });
    lia.ouvrirChat();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Salut";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(document.querySelectorAll(".lia-ui__msg").length).toBeGreaterThan(1));
    const st = getComputedStyle(journal());
    expect(st.display).not.toBe("none");
    expect(st.maxHeight).toMatch(/min\(62vh,\s*540px\)/);
    expect(st.overflowY).toBe("auto");
    expect(CSS).toContain("touch-action:pan-y");
  });

  it("fenêtre assez grande pour lire (440 px, jusqu'à 720 px de haut) et jamais d'ombre lourde", () => {
    lia = mountLia({ vieAutonome: false });
    lia.ouvrirChat();
    const st = getComputedStyle(chat() as HTMLElement);
    expect(st.width).toMatch(/440px/);
    expect(CSS).toContain(".lia-ui__chat{width:min(440px,calc(100% - 16px));display:flex;flex-direction:column;max-height:min(720px,");
    expect(st.boxShadow).not.toMatch(/40px/);
  });

  it("l'historique se fait défiler au clavier : le journal est focusable et nommé", () => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "ok" }) });
    lia.ouvrirChat();
    expect(journal().tabIndex).toBe(0);
    expect(journal().getAttribute("aria-label")).toBe("Historique de la discussion");
    expect(journal().getAttribute("role")).toBe("log");
  });
});
