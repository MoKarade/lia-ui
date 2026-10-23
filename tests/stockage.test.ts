import { describe, expect, it, vi } from "vitest";
import { ecrireMemoire, lireMemoire } from "../src/stockage.js";

describe("mémoire locale", () => {
  it("relit ce qu'elle a écrit", () => {
    ecrireMemoire("hub", { u: 0.25, v: 0.5, choixVie: false });
    expect(lireMemoire("hub")).toEqual({ u: 0.25, v: 0.5, choixVie: false });
  });

  it("sépare les clés", () => {
    ecrireMemoire("a", { u: 0, v: 0 });
    expect(lireMemoire("b")).toBeNull();
  });

  it.each([
    ["JSON cassé", "{pas du json"],
    ["pas un objet", "42"],
    ["fraction hors bornes", JSON.stringify({ u: 2, v: 0.5 })],
    ["texte au lieu d'un nombre", JSON.stringify({ u: "0.1", v: 0.5 })],
  ])("ignore une valeur invalide (%s)", (_nom, valeur) => {
    localStorage.setItem("lia-ui:x", valeur);
    expect(lireMemoire("x")).toBeNull();
  });

  it("ignore l'ancien champ `vie`, qui mélangeait choix et contraintes", () => {
    localStorage.setItem("lia-ui:hub", JSON.stringify({ u: 0.2, v: 0.3, vie: false }));
    expect(lireMemoire("hub")).toEqual({ u: 0.2, v: 0.3 });
  });

  it("ne plante pas quand le navigateur refuse le stockage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    expect(lireMemoire("hub")).toBeNull();
    expect(() => ecrireMemoire("hub", { u: 0, v: 0 })).not.toThrow();
  });
});
