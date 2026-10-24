import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const ouvrirMenuCorps = (): void => {
  hit().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
};
const entree = (libelle: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__menu .lia-ui__item")].find((b) => b.textContent === libelle);
const bulle = (): string => document.querySelector(".lia-ui__bulle")?.textContent ?? "";
const attendre = async (): Promise<void> => {
  for (let k = 0; k < 6; k++) await Promise.resolve();
};

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

const monter = (o: Parameters<typeof mountLia>[0]): void => {
  lia = mountLia({ quandMouvementReduit: "doux", parolePropre: false, ...o });
};

describe("menu : « Mets-toi en pause » / « Reviens »", () => {
  it("sans basculerPause, aucune entrée", () => {
    monter({ pause: () => false });
    ouvrirMenuCorps();
    expect(entree("Mets-toi en pause")).toBeUndefined();
    expect(entree("Reviens")).toBeUndefined();
  });

  it("le libellé suit pause() : « Mets-toi en pause » hors pause, « Reviens » en pause", () => {
    let pause = false;
    monter({ pause: () => pause, basculerPause: async () => undefined });
    ouvrirMenuCorps();
    expect(entree("Mets-toi en pause")).toBeDefined();
    expect(entree("Reviens")).toBeUndefined();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    pause = true;
    ouvrirMenuCorps();
    expect(entree("Reviens")).toBeDefined();
    expect(entree("Mets-toi en pause")).toBeUndefined();
  });

  it("sans option pause, la pause vaut « non » et l'entrée propose de la mettre", () => {
    monter({ basculerPause: async () => undefined });
    ouvrirMenuCorps();
    expect(entree("Mets-toi en pause")).toBeDefined();
  });

  it("un clic appelle basculerPause avec la valeur voulue, puis elle le dit", async () => {
    let pause = false;
    const basculerPause = vi.fn(async (v: boolean) => {
      pause = v;
    });
    monter({ pause: () => pause, basculerPause });
    ouvrirMenuCorps();
    (entree("Mets-toi en pause") as HTMLButtonElement).click();
    await attendre();
    expect(basculerPause).toHaveBeenCalledExactlyOnceWith(true);
    expect(bulle()).toBe("Je me mets en pause.");
    ouvrirMenuCorps();
    (entree("Reviens") as HTMLButtonElement).click();
    await attendre();
    expect(basculerPause).toHaveBeenLastCalledWith(false);
    expect(bulle()).toBe("Me revoilà.");
  });

  it("un rejet laisse l'état tel quel et elle dit qu'elle n'a pas pu", async () => {
    const pause = false;
    monter({ pause: () => pause, basculerPause: async () => Promise.reject(new Error("réseau")) });
    ouvrirMenuCorps();
    (entree("Mets-toi en pause") as HTMLButtonElement).click();
    await attendre();
    expect(bulle()).toBe("Je n'ai pas pu changer ma pause.");
    ouvrirMenuCorps();
    expect(entree("Mets-toi en pause")).toBeDefined();
  });

  it("une erreur levée tout de suite (pas une promesse) vaut un rejet", async () => {
    monter({
      pause: () => false,
      basculerPause: () => {
        throw new Error("boum");
      },
    });
    ouvrirMenuCorps();
    (entree("Mets-toi en pause") as HTMLButtonElement).click();
    await attendre();
    expect(bulle()).toBe("Je n'ai pas pu changer ma pause.");
  });

  it("si pause() ne suit pas la promesse, elle ne prétend pas avoir changé", async () => {
    monter({ pause: () => false, basculerPause: async () => undefined });
    ouvrirMenuCorps();
    (entree("Mets-toi en pause") as HTMLButtonElement).click();
    await attendre();
    expect(bulle()).toBe("Je n'ai pas pu changer ma pause.");
  });
});
