import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { HUMEURS_DETAILLEES, SILHOUETTES_LIA } from "../src/index.js";
import type { ContexteLia, LiaHandle, ReponseLia } from "../src/types.js";
import { questionSurSonHumeur, reponseHumeur } from "../src/paroles.js";
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

describe("ce qu'elle dit d'elle-même dans le chat", () => {
  it("transmet son humeur, sa silhouette et son regard à ask, en listes fermées", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal, c?: ContexteLia) => Promise<ReponseLia>>().mockResolvedValue({ text: "Voilà." });
    lia = mountLia({ vieAutonome: false, ask });
    lia.ouvrirChat();
    ecrire("Où en est le hub ?");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    const c = ask.mock.calls[0]?.[2];
    expect(c).toBeDefined();
    expect(HUMEURS_DETAILLEES).toContain(c?.humeur);
    expect(SILHOUETTES_LIA).toContain(c?.silhouette);
    expect(c?.regard === null || /^[a-z0-9-]{1,40}$/.test(c?.regard ?? "")).toBe(true);
  });

  it("répond elle-même à « ton humeur ? » sans appeler ask, et nomme son humeur affichée", () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({ text: "Bilan du hub, pas mon humeur." });
    lia = mountLia({ vieAutonome: false, ask });
    lia.ouvrirChat();
    ecrire("Quelle est ton humeur ?");
    expect(ask).not.toHaveBeenCalled();
    const dit = messagesLia().join(" ");
    expect(dit).toContain(`« ${lia.humeur().libelle} »`);
    expect(dit).not.toMatch(/pas mon/);
  });

  it("répond de même sans hôte (pas d'ask) : son état est le sien", () => {
    lia = mountLia({ vieAutonome: false });
    lia.ouvrirChat();
    ecrire("Comment tu te sens ?");
    expect(messagesLia().at(-1)).toContain(lia.humeur().libelle);
    expect(messagesLia().at(-1)).not.toMatch(/pas disponible/);
  });

  it("laisse passer à l'hôte ce qui n'est pas sur elle", () => {
    expect(questionSurSonHumeur("ça va marcher, le déploiement ?")).toBe(false);
    expect(questionSurSonHumeur("Quelle est la dernière humeur du marché boursier selon les analystes de la semaine dernière ?")).toBe(false);
    expect(questionSurSonHumeur("ça va ?")).toBe(true);
    expect(questionSurSonHumeur("Tu vas bien")).toBe(true);
    expect(questionSurSonHumeur("Et ton humeur ?")).toBe(true);
  });

  it("dit ce qui vient juste derrière, rien d'inventé", () => {
    const t = reponseHumeur("inquiet", [["inquiet", 0.6], ["curieux", 0.4], ["fatigue", 0.1]]);
    expect(t).toContain("« inquiétude »");
    expect(t).toContain("Juste derrière : curiosité.");
    expect(t).not.toContain("fatigue");
  });
});
