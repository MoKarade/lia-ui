import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, ReponseLia } from "../src/types.js";
import { questionPourquoi, reponseHumeur } from "../src/paroles.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const ecrire = (q: string): void => {
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
  champ.value = q;
  (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const messagesLia = (): string[] => [...document.querySelectorAll(".lia-ui__msg--lia")].map((m) => m.textContent ?? "");

beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = `<section data-lia-cible="Carte Drive 2"><p>texte</p></section>`;
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("« pourquoi » : elle dit pourquoi elle va comme elle va", () => {
  it("reconnaît une question sur elle, pas une question sur autre chose", () => {
    for (const q of ["Pourquoi tu es triste ?", "pourquoi t'es comme ça", "Qu'est-ce qui ne va pas ?", "Pourquoi tu vas mal", "Qu'est-ce que tu as ?"]) expect(questionPourquoi(q), q).toBe(true);
    for (const q of ["Pourquoi le build échoue ?", "Pourquoi le hub est lent ?", "", "Pourquoi " + "x".repeat(90)]) expect(questionPourquoi(q), q).toBe(false);
  });

  it("répond elle-même, sans appeler ask, par une raison vraie ou par « rien de précis »", () => {
    const ask = vi.fn<() => Promise<ReponseLia>>().mockResolvedValue({ text: "Bilan du hub." });
    lia = mountLia({ vieAutonome: false, ask });
    lia.ouvrirChat();
    ecrire("Pourquoi tu es comme ça ?");
    expect(ask).not.toHaveBeenCalled();
    expect(messagesLia().at(-1)).toMatch(/parce qu|c'est qu|pas de raison précise/i);
  });
});

describe("un mélange d'humeurs", () => {
  it("le dit à la place de « juste derrière » quand deux humeurs se valent", () => {
    const t = reponseHumeur("serein", [["serein", 0.6], ["inquiet", 0.5]], "Un mélange de sérénité et d'inquiétude.");
    expect(t).toContain("Un mélange de sérénité et d'inquiétude.");
    expect(t).not.toContain("Juste derrière");
  });

  it("garde « juste derrière » sans mélange", () => {
    expect(reponseHumeur("inquiet", [["inquiet", 0.6], ["curieux", 0.4]], null)).toContain("Juste derrière : curiosité.");
  });
});
