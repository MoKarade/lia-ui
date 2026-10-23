import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { demarrerLia } from "../src/boot.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

beforeEach(() => {
  installerEnvironnement();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  lia?.destroy();
  lia = null;
});

const couche = (): Element | null => document.querySelector(".lia-ui");

describe("présente tout le temps", () => {
  it("se remet dans la page quand le rendu de la page la retire", () => {
    lia = mountLia({ vieAutonome: false });
    expect(couche()).not.toBeNull();
    document.body.innerHTML = "<main>La page vient de se remplacer</main>";
    expect(couche()).toBeNull();
    vi.advanceTimersByTime(600);
    expect(couche()?.isConnected).toBe(true);
  });

  it("revient aussi quand tout `body` est remplacé", () => {
    lia = mountLia({ vieAutonome: false });
    const neuf = document.createElement("body");
    document.documentElement.replaceChild(neuf, document.body);
    vi.advanceTimersByTime(600);
    expect(neuf.querySelector(".lia-ui")).not.toBeNull();
  });

  it("quand son conteneur disparaît, elle vit dans la fenêtre au lieu de disparaître avec", () => {
    const colonne = document.createElement("div");
    document.body.appendChild(colonne);
    lia = mountLia({ vieAutonome: false, container: colonne });
    expect(colonne.querySelector(".lia-ui--conteneur")).not.toBeNull();
    colonne.remove();
    vi.advanceTimersByTime(600);
    const c = couche();
    expect(c?.isConnected).toBe(true);
    expect(c?.classList.contains("lia-ui--conteneur")).toBe(false);
  });

  it("une exception dans une image ne l'arrête pas : elle continue, et le dit", () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let appels = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      appels++;
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
    lia = mountLia({ vieAutonome: false, quandMouvementReduit: "complet" });
    // Le canvas se met à casser : chaque image lève.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => {
      throw new Error("page cassée");
    });
    const avant = appels;
    vi.advanceTimersByTime(500);
    expect(appels - avant).toBeGreaterThan(10);
    expect(erreur).toHaveBeenCalled();
    expect(erreur.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("sa discussion ouverte se rouvre sur la page suivante, avec ce qui s'y est dit", () => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "x" }) });
    lia.ouvrirChat();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Quelle est ton humeur ?";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    lia.destroy(); // la page change : la couche part avec elle
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "x" }) });
    const textes = [...document.querySelectorAll(".lia-ui__msg")].map((m) => m.textContent ?? "");
    expect(document.querySelector(".lia-ui__chat")).not.toBeNull();
    expect(textes[0]).toBe("Quelle est ton humeur ?");
    expect(textes.length).toBe(2);
  });

  it("une discussion fermée ne revient pas", () => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: "x" }) });
    lia.ouvrirChat();
    lia.fermerChat();
    lia.destroy();
    lia = mountLia({ vieAutonome: false });
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
  });
});

describe("démarrage hors du rendu (boot)", () => {
  it("monte dès que body existe, une seule fois, et s'arrête pour de bon", () => {
    const a = demarrerLia({ vieAutonome: false });
    const b = demarrerLia({ vieAutonome: false });
    expect(b).toBe(a);
    expect(a.poignee()).not.toBeNull();
    expect(document.querySelectorAll(".lia-ui").length).toBe(1);
    a.arreter();
    expect(couche()).toBeNull();
  });

  it("réessaie si le montage échoue d'abord (page qui charge), puis se pose", () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mauvais = mountLia({ vieAutonome: false });
    const boot = demarrerLia({ vieAutonome: false });
    expect(boot.poignee()).toBeNull();
    mauvais.destroy();
    vi.advanceTimersByTime(600);
    expect(boot.poignee()).not.toBeNull();
    expect(erreur).not.toHaveBeenCalled();
    boot.arreter();
  });
});
