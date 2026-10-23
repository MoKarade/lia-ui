import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jourLocal } from "../src/autonomie.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, MotifSpontane } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const bulle = (): HTMLElement => {
  const b = document.querySelector<HTMLElement>(".lia-ui__bulle");
  if (!b) throw new Error("bulle absente");
  return b;
};
const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

beforeEach(() => {
  installerEnvironnement();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1000, bottom: 800 });
    if (this.hasAttribute("data-lia-cible")) return rectDe({ left: 100, top: 300, right: 400, bottom: 500 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  // Midi : hors du silence de nuit.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 22, 12, 0, 0));
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.useRealTimers();
});

describe("parole spontanée (comme dans la maquette, texte fourni par l'hôte)", () => {
  it("dit seule une remarque quand l'hôte en a une", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3); // choix pondéré : causer, motif « rien »
    const motifs: MotifSpontane[] = [];
    lia = mountLia({
      onSpontane: (m) => {
        motifs.push(m);
        return "Il est calme ici.";
      },
    });
    await vi.waitFor(() => expect(bulle().hidden).toBe(false), { timeout: 4000 });
    expect(motifs[0]).toBe("rien");
    await vi.waitFor(() => expect(bulle().textContent).toContain("Il est calme"), { timeout: 3000 });
  });

  it("se tait quand l'hôte n'a rien de vrai à dire", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const onSpontane = vi.fn(() => null);
    lia = mountLia({ onSpontane });
    await vi.waitFor(() => expect(onSpontane).toHaveBeenCalled(), { timeout: 4000 });
    expect(bulle().hidden).toBe(true);
  });

  it("ne parle jamais seule sans onSpontane", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    lia = mountLia({});
    await new Promise((r) => setTimeout(r, 3500));
    expect(bulle().hidden).toBe(true);
  });

  it("se tait la nuit, même si l'hôte a quelque chose à dire", async () => {
    vi.setSystemTime(new Date(2026, 9, 22, 23, 30, 0));
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const onSpontane = vi.fn(() => "Bonsoir.");
    lia = mountLia({ onSpontane });
    await new Promise((r) => setTimeout(r, 3500));
    expect(onSpontane).not.toHaveBeenCalled();
    expect(bulle().hidden).toBe(true);
  });

  it("l'échec de l'hôte n'arrête pas sa vie : elle se tait et le dit dans la console", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lia = mountLia({
      onSpontane: () => {
        throw new Error("hors ligne");
      },
    });
    await vi.waitFor(() => expect(err).toHaveBeenCalled(), { timeout: 4000 });
    expect(bulle().hidden).toBe(true);
  });
});

describe("relances : au plus deux par jour", () => {
  const jour = (): string => jourLocal(new Date());

  it("fait une relance et la compte", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.55); // choix pondéré : relancer
    localStorage.setItem("lia-ui:lia:relances", JSON.stringify({ jour: jour(), n: 1 }));
    const motifs: MotifSpontane[] = [];
    lia = mountLia({
      onSpontane: (m) => {
        motifs.push(m);
        return { text: "Le bail arrive. Je te le rappelle ?", chips: [{ id: "plus", label: "Plus tard" }] };
      },
    });
    await vi.waitFor(() => expect(bulle().hidden).toBe(false), { timeout: 4000 });
    expect(motifs).toEqual(["relance"]);
    await vi.waitFor(() => expect(bulle().textContent).toContain("Plus tard"), { timeout: 3000 });
    expect(JSON.parse(localStorage.getItem("lia-ui:lia:relances") ?? "{}")).toEqual({ jour: jour(), n: 2 });
  });

  it("n'en fait plus au plafond du jour", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.9); // choix pondéré : repos (jamais de relance au plafond)
    localStorage.setItem("lia-ui:lia:relances", JSON.stringify({ jour: jour(), n: 2 }));
    const onSpontane = vi.fn(() => "Relance.");
    lia = mountLia({ onSpontane });
    await new Promise((r) => setTimeout(r, 3500));
    expect(onSpontane).not.toHaveBeenCalled();
  });

  it("le compteur d'hier ne compte pas aujourd'hui", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.55);
    localStorage.setItem("lia-ui:lia:relances", JSON.stringify({ jour: "2026-10-21", n: 2 }));
    const onSpontane = vi.fn(() => "Relance.");
    lia = mountLia({ onSpontane });
    await vi.waitFor(() => expect(onSpontane).toHaveBeenCalledWith("relance"), { timeout: 4000 });
  });
});

describe("visite d'un élément : sa phrase après une seconde et demie", () => {
  beforeEach(() => {
    const envies = { energie: 0.85, curiosite: 0.6, social: 0.45, inquiet: 0, joie: 0.3, ennui: 0.15 };
    localStorage.setItem("lia-ui:lia:cerveau", JSON.stringify({ envies, journal: [] }));
  });

  it("va voir l'élément puis dit son data-lia-dit", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // choix pondéré : voir (curiosité à 0,6)
    const carte = document.createElement("section");
    carte.setAttribute("data-lia-cible", "");
    carte.setAttribute("data-lia-dit", "Le souper de 18 h approche.");
    document.body.appendChild(carte);
    lia = mountLia({});
    await vi.waitFor(() => expect(bulle().textContent).toContain("souper"), { timeout: 5000 });
  });

  it("sans data-lia-dit, elle visite en silence", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const carte = document.createElement("section");
    carte.setAttribute("data-lia-cible", "");
    document.body.appendChild(carte);
    lia = mountLia({});
    await new Promise((r) => setTimeout(r, 3800));
    expect(bulle().hidden).toBe(true);
  });
});
