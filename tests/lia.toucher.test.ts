import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const toucher = (): void => {
  hit().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
  hit().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
};
const touche = (key: string): void => void hit().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const chatOuvert = (): boolean => document.querySelector(".lia-ui__champ") !== null && !document.querySelector(".lia-ui__chat[hidden]");

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  lia?.destroy();
  lia = null;
});

const monter = (o: Parameters<typeof mountLia>[0] = {}): void => {
  lia = mountLia({ quandMouvementReduit: "doux", parolePropre: false, ...o });
};

describe("surToucher : l'hôte peut prendre le toucher", () => {
  it("sans l'option, un toucher ouvre sa discussion (inchangé)", () => {
    monter();
    toucher();
    expect(chatOuvert()).toBe(true);
  });

  it("true : l'hôte a pris le toucher, sa discussion ne s'ouvre pas, un seul appel", () => {
    const surToucher = vi.fn(() => true);
    monter({ surToucher });
    toucher();
    expect(surToucher).toHaveBeenCalledTimes(1);
    expect(chatOuvert()).toBe(false);
  });

  it("false : sa discussion s'ouvre", () => {
    const surToucher = vi.fn(() => false);
    monter({ surToucher });
    toucher();
    expect(surToucher).toHaveBeenCalledTimes(1);
    expect(chatOuvert()).toBe(true);
  });

  it("une valeur qui n'est pas exactement true ne prend pas le toucher", () => {
    monter({ surToucher: (() => 1) as unknown as () => boolean });
    toucher();
    expect(chatOuvert()).toBe(true);
  });

  it("une erreur levée : sa discussion s'ouvre et l'erreur est dite dans la console", () => {
    monter({
      surToucher: () => {
        throw new Error("boum");
      },
    });
    toucher();
    expect(chatOuvert()).toBe(true);
    expect(console.error).toHaveBeenCalled();
  });

  it("Entrée et Espace passent aussi par l'hôte", () => {
    const surToucher = vi.fn(() => true);
    monter({ surToucher });
    touche("Enter");
    touche(" ");
    expect(surToucher).toHaveBeenCalledTimes(2);
    expect(chatOuvert()).toBe(false);
  });

  it("discussion ouverte : le toucher la ferme sans appeler l'hôte", () => {
    const surToucher = vi.fn(() => false);
    monter({ surToucher });
    toucher();
    expect(chatOuvert()).toBe(true);
    surToucher.mockClear();
    toucher();
    expect(surToucher).not.toHaveBeenCalled();
    expect(chatOuvert()).toBe(false);
  });

  it("ouvrirChat de la poignée n'appelle pas surToucher (c'est un ordre de l'hôte)", () => {
    const surToucher = vi.fn(() => true);
    monter({ surToucher });
    (lia as LiaHandle).ouvrirChat();
    expect(surToucher).not.toHaveBeenCalled();
    expect(chatOuvert()).toBe(true);
  });
});
