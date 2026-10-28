import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import type { EntreeHistorique, LiaHandle, OptionAtelier, ReponseLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
let page: HTMLElement;

const envoyer = (texte: string): void => {
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
  champ.value = texte;
  (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
};
const messages = (): string[] => [...document.querySelectorAll(".lia-ui__msg")].map((m) => m.textContent ?? "");
const entrees: readonly EntreeHistorique[] = [
  { id: "a", titre: "Budget de la maison", quand: "hier" },
  { id: "b", titre: "Plan de la semaine" },
];

beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = `<main id="page"></main>`;
  page = document.getElementById("page") as HTMLElement;
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("mode atelier : la discussion en pleine page", () => {
  it("s'affiche d'elle-même dans le conteneur de l'hôte, avec un titre, sans bouton de fermeture", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, titre: "Assistant" }, ask: () => Promise.resolve({ text: "ok" }) });
    const chat = page.querySelector(".lia-ui__chat--atelier") as HTMLElement;
    expect(chat).not.toBeNull();
    expect(page.querySelector(".lia-ui--atelier")?.hasAttribute("data-lia-ignorer")).toBe(true);
    expect(chat.getAttribute("aria-label")).toBe("Assistant");
    expect(chat.querySelector(".lia-ui__atelier-titre")?.textContent).toBe("Assistant");
    expect(chat.querySelector("[aria-label='Fermer la discussion']")).toBeNull();
    // Le champ est à 16 px et le corps de LIA a sa place dans l'en-tête.
    expect(chat.querySelector(".lia-ui__atelier-corps")).not.toBeNull();
  });

  it("ni Échap, ni fermerChat, ni le toucher de son corps ne la ferment", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page } });
    const chat = page.querySelector(".lia-ui__chat--atelier") as HTMLElement;
    chat.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    lia.fermerChat();
    const hit = document.querySelector(".lia-ui__hit") as HTMLElement;
    hit.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    hit.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
    expect(page.querySelector(".lia-ui__chat--atelier")).not.toBeNull();
  });

  it("une question part par ask, la réponse s'affiche, et rien n'est écrit dans l'état partagé de la bulle", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal) => Promise<ReponseLia>>().mockResolvedValue({ text: "Voici." });
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page }, ask });
    envoyer("Salut");
    await vi.waitFor(() => expect(messages()).toEqual(["Salut", "Voici."]));
    expect(ask.mock.calls[0]?.[0]).toBe("Salut");
    // La page de l'hôte garde son historique : la bulle des autres pages ne rouvre pas cette discussion.
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("Salut");
  });

  it("destroy retire tout du conteneur", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page } });
    lia.destroy();
    lia = null;
    expect(page.children.length).toBe(0);
  });
});

describe("atelier : historique fourni par l'hôte", () => {
  it("liste les discussions, rouvre celle qu'on choisit, puis « Nouvelle discussion » repart de zéro", async () => {
    const nouveau = vi.fn().mockResolvedValue(undefined);
    const ouvrir = vi.fn().mockResolvedValue([
      { de: "moi", texte: "Où en est le budget ?" },
      { de: "lia", texte: "À jour." },
      { de: "x", texte: "ignoré : rôle inconnu" },
      { de: "lia", texte: 12 },
    ]);
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, historique: { liste: () => entrees, ouvrir, nouveau } }, ask: () => Promise.resolve({ text: "ok" }) });
    await vi.waitFor(() => expect(page.querySelectorAll(".lia-ui__atelier-entree").length).toBe(2));
    expect(page.querySelector(".lia-ui__atelier-entree-quand")?.textContent).toBe("hier");
    (page.querySelector("[data-id='a']") as HTMLElement).click();
    await vi.waitFor(() => expect(messages()).toEqual(["Où en est le budget ?", "À jour."]));
    expect(ouvrir).toHaveBeenCalledWith("a");
    expect(page.querySelector("[data-id='a']")?.getAttribute("aria-current")).toBe("true");
    (page.querySelector(".lia-ui__atelier-nouvelle") as HTMLElement).click();
    await vi.waitFor(() => expect(messages()).toEqual([]));
    expect(nouveau).toHaveBeenCalledTimes(1);
    expect(page.querySelector("[aria-current=true]")).toBeNull();
  });

  it("relit la liste après chaque réponse (l'hôte a gardé la discussion)", async () => {
    const liste = vi.fn().mockResolvedValue(entrees);
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, historique: { liste, ouvrir: () => [], nouveau: () => undefined } }, ask: () => Promise.resolve({ text: "ok" }) });
    await vi.waitFor(() => expect(liste).toHaveBeenCalledTimes(1));
    envoyer("Une question");
    await vi.waitFor(() => expect(liste).toHaveBeenCalledTimes(2));
  });

  it("une liste ou une réouverture qui échoue : message honnête, jamais une discussion inventée", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    lia = mountLia({
      vieAutonome: false,
      atelier: { conteneur: page, historique: { liste: () => Promise.reject(new Error("boum")), ouvrir: () => Promise.reject(new Error("boum")), nouveau: () => undefined } },
    });
    await vi.waitFor(() => expect(page.querySelector(".lia-ui__atelier-vide")?.textContent).toContain("pas disponible"));
    expect(erreur).toHaveBeenCalled();
  });

  it("sans historique : pas de liste, pas de bouton, la mise en page tient en une colonne", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page } });
    expect(page.querySelector(".lia-ui__atelier-historique")).toBeNull();
    expect(page.querySelector(".lia-ui__atelier-nouvelle")).toBeNull();
    expect(page.querySelector(".lia-ui__chat--sans-historique")).not.toBeNull();
  });
});

describe("atelier : réglages de l'hôte", () => {
  const reglages: readonly OptionAtelier[] = [
    { id: "n2", libelle: "Niveau 2", type: "case", aide: "Données sensibles" },
    { id: "n3", libelle: "Niveau 3", type: "case", desactive: true },
    { id: "modele", libelle: "Modèle", type: "liste", choix: [{ valeur: "rapide", libelle: "Rapide" }, { valeur: "pose", libelle: "Posé" }], valeur: "pose" },
  ];

  it("leurs valeurs courantes sont rendues à ask en 4e argument, à chaque question", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal, c?: unknown, r?: unknown) => Promise<ReponseLia>>().mockResolvedValue({ text: "ok" });
    const surOption = vi.fn();
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, options: reglages, surOption }, ask });
    envoyer("Première");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    expect(ask.mock.calls[0]?.[3]).toEqual({ n2: false, n3: false, modele: "pose" });
    const case2 = page.querySelector<HTMLInputElement>(".lia-ui__atelier-reglage input[type=checkbox]") as HTMLInputElement;
    case2.checked = true;
    case2.dispatchEvent(new Event("change"));
    const liste = page.querySelector<HTMLSelectElement>("select") as HTMLSelectElement;
    liste.value = "rapide";
    liste.dispatchEvent(new Event("change"));
    expect(surOption).toHaveBeenCalledWith("n2", true);
    expect(surOption).toHaveBeenCalledWith("modele", "rapide");
    await vi.waitFor(() => expect((document.querySelector(".lia-ui__champ") as HTMLInputElement).disabled).toBe(false));
    envoyer("Seconde");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(2));
    expect(ask.mock.calls[1]?.[3]).toEqual({ n2: true, n3: false, modele: "rapide" });
  });

  it("un réglage verrouillé par l'hôte est grisé, et le paquet ne décide d'aucun verrou", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, options: reglages } });
    const cases = [...page.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    expect(cases.map((c) => c.disabled)).toEqual([false, true]);
    expect(page.querySelector(".lia-ui__atelier-options")?.getAttribute("aria-label")).toBe("Réglages de la discussion");
  });

  it("un choix de départ inconnu retombe sur le premier choix", () => {
    lia = mountLia({ vieAutonome: false, atelier: { conteneur: page, options: [{ id: "m", libelle: "M", type: "liste", choix: [{ valeur: "a", libelle: "A" }, { valeur: "b", libelle: "B" }], valeur: "zzz" }] } });
    expect((page.querySelector("select") as HTMLSelectElement).value).toBe("a");
  });
});

describe("sans atelier : la bulle est inchangée", () => {
  it("la discussion est dans la couche, avec son bouton de fermeture, et ask ne reçoit pas de réglages", async () => {
    const ask = vi.fn<(q: string, s: AbortSignal, c?: unknown, r?: unknown) => Promise<ReponseLia>>().mockResolvedValue({ text: "ok" });
    lia = mountLia({ vieAutonome: false, ask });
    lia.ouvrirChat();
    expect(document.querySelector(".lia-ui--atelier")).toBeNull();
    expect(document.querySelector(".lia-ui > .lia-ui__chat")).not.toBeNull();
    expect(document.querySelector("[aria-label='Fermer la discussion']")).not.toBeNull();
    envoyer("Salut");
    await vi.waitFor(() => expect(ask).toHaveBeenCalledTimes(1));
    expect(ask.mock.calls[0]?.[3]).toBeUndefined();
  });
});
