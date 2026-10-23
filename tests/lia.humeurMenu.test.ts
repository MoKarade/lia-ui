import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { CSS } from "../src/styles.js";
import { HUMEURS_DETAILLEES, PHRASES_MENU } from "../src/humeurs.js";
import { ACTIVITES_JEU, ACTIONS_LIA } from "../src/activite.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

beforeEach(() => {
  installerEnvironnement();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
});

const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const pastille = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__etat-humeur") as HTMLElement;
const bulle = (): string => document.querySelector<HTMLElement>(".lia-ui__bulle")?.textContent ?? "";

describe("humeurs visibles", () => {
  it("les 40 humeurs ont chacune un lot de silhouettes de jeu, toutes réelles", () => {
    for (const h of HUMEURS_DETAILLEES) {
      const lot = ACTIVITES_JEU[h];
      expect(lot?.length, h).toBeGreaterThan(0);
      for (const a of lot ?? []) expect(ACTIONS_LIA, `${h} → ${a}`).toContain(a);
    }
  });

  it("la pastille se colore de l'humeur et se cache vraiment quand le chat s'ouvre", () => {
    expect(CSS).toMatch(/\.lia-ui__etat-humeur\[hidden\]\{display:none\}/);
    expect(CSS).toMatch(/\.lia-ui__etat-humeur\{[^}]*color:color-mix\([^}]*var\(--lia-point/);
    expect(CSS).toMatch(/\.lia-ui__etat-humeur\{[^}]*border:1px solid color-mix\([^}]*var\(--lia-point/);
    lia = mountLia({ vieAutonome: false });
    expect(getComputedStyle(pastille()).display).not.toBe("none");
    lia.ouvrirChat();
    vi.advanceTimersByTime(100);
    expect(pastille().hidden).toBe(true);
    expect(getComputedStyle(pastille()).display).toBe("none");
  });

  it("choisir une humeur au menu la fait dire en une phrase", () => {
    lia = mountLia({ vieAutonome: false });
    hit().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
    const calme = [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__humeur")].find((b) => b.textContent === "Calme");
    expect(calme).toBeTruthy();
    calme?.click();
    vi.advanceTimersByTime(3000);
    expect(PHRASES_MENU["calme"]).toBe("On respire.");
    expect(bulle()).toContain("On respire.");
    expect(lia.humeur().nom).toBe("calme");
  });

  it("une réponse du modèle peut imposer n'importe laquelle des 40 humeurs, un nom inconnu est ignoré", async () => {
    vi.useRealTimers();
    let nom = "serein";
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "ok", mood: nom }) });
    lia.ouvrirChat();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    const envoyer = async (q: string): Promise<void> => {
      champ.value = q;
      champ.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    };
    await envoyer("bonjour");
    expect(lia.humeur().nom).toBe("serein");
    nom = "inventee";
    await envoyer("encore");
    expect(lia.humeur().nom).toBe("serein");
  });
});
