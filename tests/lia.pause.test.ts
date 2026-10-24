import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, ReponseLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const ecrire = (q: string): void => {
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
  champ.value = q;
  (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};
const bulle = (): string => document.querySelector(".lia-ui__bulle")?.textContent ?? "";

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  localStorage.clear();
  document.body.innerHTML = `<section data-lia-cible>Carte</section>`;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  lia?.destroy();
  lia = null;
});

/** Une parole spontanée de l'hôte, la plus simple à provoquer (choix pondéré : causer, motif « rien »). */
const monter = (o: Parameters<typeof mountLia>[0]): void => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.3);
  lia = mountLia({ quandMouvementReduit: "doux", parolePropre: false, silence: [3, 3], ...o });
};

describe("pause : l'hôte la coupe", () => {
  it("sans pause, elle parle seule (point de départ)", () => {
    monter({ onSpontane: () => "Il est calme ici." });
    vi.advanceTimersByTime(4_000);
    expect(bulle()).toBe("Il est calme ici.");
  });

  it("en pause, elle ne parle plus seule et ne rappelle pas onSpontane", () => {
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({ onSpontane, pause: () => true });
    vi.advanceTimersByTime(120_000);
    expect(bulle()).toBe("");
    expect(onSpontane).not.toHaveBeenCalled();
  });

  it("la pause est relue à chaque pas : levée, elle reparle", () => {
    let pause = true;
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({ onSpontane, pause: () => pause });
    vi.advanceTimersByTime(10_000);
    expect(onSpontane).not.toHaveBeenCalled();
    pause = false;
    vi.advanceTimersByTime(120_000);
    expect(onSpontane).toHaveBeenCalled();
  });

  it("une pause qui lève une erreur vaut pause (échec fermé)", () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({
      onSpontane,
      pause: () => {
        throw new Error("hôte en panne");
      },
    });
    vi.advanceTimersByTime(60_000);
    expect(bulle()).toBe("");
    expect(onSpontane).not.toHaveBeenCalled();
    expect(erreur).toHaveBeenCalled();
  });

  it("en pause, une question n'appelle jamais ask et la réponse le dit", () => {
    const ask = vi.fn<() => Promise<ReponseLia>>().mockResolvedValue({ text: "Bilan." });
    lia = mountLia({ vieAutonome: false, ask, pause: () => true });
    lia.ouvrirChat();
    ecrire("Où en est le hub ?");
    expect(ask).not.toHaveBeenCalled();
    expect(document.querySelector(".lia-ui__msg--lia")?.textContent).toContain("en pause");
  });

  it("hors pause, la même question appelle ask", async () => {
    const ask = vi.fn<() => Promise<ReponseLia>>().mockResolvedValue({ text: "Bilan." });
    lia = mountLia({ vieAutonome: false, ask, pause: () => false });
    lia.ouvrirChat();
    ecrire("Où en est le hub ?");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
  });
});

describe("plafond de paroles spontanées par jour", () => {
  it("un plafond de 1 : une seule parole spontanée, la suivante attend le lendemain", () => {
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({ onSpontane, plafondSpontaneesParJour: 1 });
    vi.advanceTimersByTime(600_000);
    expect(onSpontane).toHaveBeenCalledTimes(1);
  });

  it("sans plafond, elle continue de parler au fil du temps", () => {
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({ onSpontane });
    vi.advanceTimersByTime(600_000);
    expect(onSpontane.mock.calls.length).toBeGreaterThan(1);
  });

  it("le plafond est compté dans le navigateur : une page rechargée le même jour ne repart pas à zéro", () => {
    const onSpontane = vi.fn(() => "Il est calme ici.");
    monter({ onSpontane, plafondSpontaneesParJour: 1 });
    vi.advanceTimersByTime(300_000);
    lia?.destroy();
    lia = null;
    const deuxieme = vi.fn(() => "Encore.");
    lia = mountLia({ quandMouvementReduit: "doux", parolePropre: false, silence: [3, 3], plafondSpontaneesParJour: 1, onSpontane: deuxieme });
    vi.advanceTimersByTime(300_000);
    expect(deuxieme).not.toHaveBeenCalled();
  });
});
