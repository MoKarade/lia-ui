import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const seconde = (s: number): void => void vi.advanceTimersByTime(s * 1000);
const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
const bas = (): void => {
  hit().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
  hit().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
};
const ouvrirEtDemander = async (q: string): Promise<void> => {
  lia?.ouvrirChat();
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
  champ.value = q;
  (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.advanceTimersByTimeAsync(50);
};
const messages = (): string[] => [...document.querySelectorAll(".lia-ui__msg--lia")].map((m) => m.textContent ?? "");

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  document.body.innerHTML = `<p>Une page</p>`;
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("son monde intérieur dans la page", () => {
  it("quatre clics rageurs sur son corps lui font mal : elle crie, son humeur et son corps changent, puis ça passe", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", ask: () => Promise.resolve({ text: "ok" }) });
    seconde(2);
    expect(lia.interieur().douleur).toBe(0);
    for (let k = 0; k < 4; k++) {
      bas();
      seconde(0.2);
    }
    const i = lia.interieur();
    expect(i.cause).toBe("brusque");
    expect(i.douleur).toBeGreaterThan(0.2);
    seconde(2);
    // Elle crie là où elle est : dans la bulle, ou dans la discussion si elle est ouverte à ce moment.
    const dit = [document.querySelector(".lia-ui__bulle")?.textContent ?? "", ...messages()].join(" | ");
    expect(dit).toMatch(/Aïe|Un à la fois|Ça pique/);
    expect(Number(document.querySelector<HTMLElement>(".lia-ui__corps")?.dataset["douleur"])).toBeGreaterThan(0.1);
    // Des clics sans rafale ne font pas mal.
    seconde(600);
    expect(lia.interieur().douleur).toBeLessThan(0.02);
    expect(lia.interieur().cause).toBeNull();
  });

  it("trois clics lents ne lui font pas mal", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    seconde(2);
    for (let k = 0; k < 3; k++) {
      bas();
      seconde(2);
    }
    expect(lia.interieur().douleur).toBe(0);
  });

  it("« tu as mal ? » reçoit son niveau et la mention d'un calcul, sans appeler l'hôte", async () => {
    const ask = vi.fn(() => Promise.resolve({ text: "ok" }));
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", ask });
    seconde(2);
    for (let k = 0; k < 4; k++) {
      bas();
      seconde(0.2);
    }
    await ouvrirEtDemander("Tu as mal ?");
    const dite = messages().at(-1) ?? "";
    expect(dite).toMatch(/ma douleur est à \d+ %/);
    expect(dite).toContain("pas un vrai ressenti");
    expect(ask).not.toHaveBeenCalled();
  });

  it("un message injurieux lui fait mal, un message gentil lui fait du plaisir", async () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", ask: () => Promise.resolve({ text: "ok" }) });
    seconde(2);
    await ouvrirEtDemander("tu es nulle");
    expect(lia.interieur().cause).toBe("ton");
    expect(lia.interieur().douleur).toBeGreaterThan(0.2);
    await ouvrirEtDemander("merci beaucoup");
    expect(lia.interieur().plaisir).toBeGreaterThan(0.2);
    expect(lia.interieur().confiance).toBeGreaterThan(0.4);
  });

  it("une panne de réseau (hors ligne, ou l'hôte qui échoue) lui fait mal", async () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", ask: () => Promise.reject(new Error("réseau")) });
    seconde(2);
    window.dispatchEvent(new Event("offline"));
    expect(lia.interieur().cause).toBe("panne");
    seconde(10);
    expect(lia.interieur().douleur).toBeGreaterThan(0.1);
    window.dispatchEvent(new Event("online"));
    seconde(600);
    expect(lia.interieur().douleur).toBeLessThan(0.02);
    await ouvrirEtDemander("Bonjour");
    await vi.advanceTimersByTimeAsync(100);
    expect(lia.interieur().douleur).toBeGreaterThan(0.05);
  });

  it("sa sensibilité et sa confiance se gardent d'une page à l'autre", () => {
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "essai" });
    seconde(2);
    for (let k = 0; k < 4; k++) {
      bas();
      seconde(0.2);
    }
    seconde(12);
    lia.destroy();
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet", cle: "essai" });
    expect(lia.interieur().sensibilite).toBeGreaterThan(0.2);
    expect(lia.interieur().douleur).toBe(0);
  });
});
