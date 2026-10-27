import { beforeEach, describe, expect, it, vi } from "vitest";
import { ecrireDiscussion, ecrireMemoire, lireDiscussion, lireMemoire } from "../src/stockage.js";

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

describe("discussion de l'onglet (sessionStorage)", () => {
  const cle = "t";
  const msgs = [{ de: "moi" as const, texte: "Où en est ma recharge ?" }];
  // Le test de la mémoire locale, plus haut, laisse son stockage simulé en panne.
  beforeEach(() => vi.restoreAllMocks());

  it("range son vrai instant avec elle et le rend tel quel", () => {
    sessionStorage.clear();
    ecrireDiscussion(cle, { ouvert: true, msgs, quand: 1_700_000_000_000 });
    expect(lireDiscussion(cle)).toEqual({ ouvert: true, msgs, quand: 1_700_000_000_000 });
  });

  it("une discussion rangée sans instant (avant v0.42.1) ou avec un instant illisible est comptée très ancienne, jamais « maintenant »", () => {
    sessionStorage.clear();
    sessionStorage.setItem("lia-ui:t:discussion", JSON.stringify({ ouvert: true, msgs }));
    expect(lireDiscussion(cle)?.quand).toBe(1);
    sessionStorage.setItem("lia-ui:t:discussion", JSON.stringify({ ouvert: true, msgs, quand: "hier" }));
    expect(lireDiscussion(cle)?.quand).toBe(1);
    sessionStorage.setItem("lia-ui:t:discussion", JSON.stringify({ ouvert: true, msgs, quand: -5 }));
    expect(lireDiscussion(cle)?.quand).toBe(1);
  });

  it("fermée ou absente : rien n'est gardé", () => {
    sessionStorage.clear();
    ecrireDiscussion(cle, { ouvert: true, msgs, quand: 5 });
    ecrireDiscussion(cle, { ouvert: false, msgs: [] });
    expect(lireDiscussion(cle)).toBeNull();
  });
});
