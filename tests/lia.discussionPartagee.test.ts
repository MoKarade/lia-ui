import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { validerDiscussion, validerEtat, empreinte, type DiscussionPartagee, type EtatHote, type EtatLia } from "../src/etat.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const jour = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const etat = (o: Partial<EtatLia> = {}): EtatLia => ({
  version: 3,
  maj: Date.now() + 1000,
  envies: { ...ENVIES_DEPART },
  journal: [],
  lente: {},
  humeur: "joyeux",
  relances: { jour: jour(), n: 0 },
  ...o,
});
const discussion = (o: Partial<DiscussionPartagee> = {}): DiscussionPartagee => ({
  ouvert: true,
  quand: Date.now() - 60_000,
  msgs: [
    { de: "moi", texte: "Où en est ma recharge ?" },
    { de: "lia", texte: "Elle est à 80 %." },
  ],
  ...o,
});
const ask = async (): Promise<{ text: string }> => ({ text: "Elle est à 80 %." });
const messages = (): string[] => [...document.querySelectorAll(".lia-ui__msg")].map((m) => m.textContent ?? "");

beforeEach(() => {
  installerEnvironnement();
  localStorage.clear();
  sessionStorage.clear();
  document.body.innerHTML = "<p>Une page</p>";
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 26, 9, 0, 0));
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

describe("validerDiscussion : ce que l'hôte rend est une donnée", () => {
  it("garde la fin de la discussion, borne les messages et le texte, retire les messages douteux", () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) => ({ de: "moi" as const, texte: `m${i}` }));
    const d = validerDiscussion({ ouvert: true, quand: 5, msgs: [...beaucoup, { de: "pirate", texte: "x" }, { de: "lia", texte: "   " }, { de: "lia", texte: "y".repeat(9000) }, 3, null] });
    expect(d?.msgs.length).toBe(20);
    expect(d?.msgs.every((m) => m.de === "moi" || m.de === "lia")).toBe(true);
    expect(d?.msgs[d.msgs.length - 1]?.texte.length).toBe(4000);
  });

  it("rejette ce qui n'est pas une discussion (l'état, lui, reste valide sans elle)", () => {
    for (const x of [null, 3, "x", {}, { ouvert: "oui", quand: 5, msgs: [] }, { ouvert: true, quand: 0, msgs: [] }, { ouvert: true, quand: 5, msgs: "x" }]) {
      expect(validerDiscussion(x)).toBeUndefined();
      const e = validerEtat({ ...etat(), discussion: x });
      expect(e).not.toBeNull();
      expect(e).not.toHaveProperty("discussion");
    }
  });

  it("une discussion fermée ne porte aucun texte", () => {
    expect(validerDiscussion({ ouvert: false, quand: 5, msgs: [{ de: "moi", texte: "secret" }] })).toEqual({ ouvert: false, quand: 5, msgs: [] });
  });

  it("un hôte qui ne la garde pas reste compatible, et les clés inconnues de la discussion sont retirées", () => {
    expect(validerEtat(etat())).not.toHaveProperty("discussion");
    const e = validerEtat({ ...etat(), discussion: { ...discussion(), note: "x", msgs: [{ de: "moi", texte: "a", id: 7 }] } });
    expect(e?.discussion).not.toHaveProperty("note");
    expect(e?.discussion?.msgs[0]).toEqual({ de: "moi", texte: "a" });
  });

  it("l'empreinte change quand la discussion change, pas sinon", () => {
    const a = etat({ discussion: discussion() });
    expect(empreinte(a)).toBe(empreinte(etat({ discussion: discussion({ quand: a.discussion?.quand ?? 0 }) })));
    expect(empreinte(a)).not.toBe(empreinte(etat()));
    expect(empreinte(a)).not.toBe(empreinte(etat({ discussion: discussion({ msgs: [{ de: "moi", texte: "une seule" }] }) })));
    expect(empreinte(a)).not.toBe(empreinte(etat({ discussion: discussion({ ouvert: false, msgs: [] }) })));
  });
});

describe("la discussion suit Marc d'une app à l'autre", () => {
  it("une discussion récente de l'état partagé se rouvre à la première lecture, avec ses messages", async () => {
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion() }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).not.toBeNull();
    expect(messages()).toEqual(["Où en est ma recharge ?", "Elle est à 80 %."]);
  });

  it("une discussion vieille de plus d'une demi-heure ne se rouvre pas", async () => {
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion({ quand: Date.now() - 31 * 60_000 }) }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
  });

  it("une discussion fermée ailleurs ne se rouvre pas", async () => {
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion({ ouvert: false, msgs: [] }) }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
  });

  it("ne vole pas le champ où Marc est en train d'écrire", async () => {
    document.body.innerHTML = '<input id="recherche">';
    document.querySelector<HTMLInputElement>("#recherche")?.focus();
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion() }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
  });

  it("ne reprend qu'à la première lecture : la relecture d'une minute n'ouvre rien de force", async () => {
    let garde: EtatLia | null = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    garde = etat({ discussion: discussion({ quand: Date.now() }) });
    await vi.advanceTimersByTimeAsync(130_000);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
  });

  it("ce que Marc dit est écrit dans l'état partagé, et la fermeture l'efface", async () => {
    let garde: EtatLia | null = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({
      vieAutonome: false,
      cle: "a",
      etat: hote,
      ask: async () => ({ text: "Elle est à 80 %." }),
    });
    await vi.advanceTimersByTimeAsync(500);
    lia.ouvrirChat();
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Où en est ma recharge ?";
    document.querySelector<HTMLFormElement>(".lia-ui__form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(25_000);
    const ecrit = garde as EtatLia | null;
    expect(ecrit?.discussion?.ouvert).toBe(true);
    expect(ecrit?.discussion?.msgs.map((m) => m.texte)).toEqual(["Où en est ma recharge ?", "Elle est à 80 %."]);
    document.querySelector<HTMLButtonElement>('[aria-label="Fermer la discussion"]')?.click();
    await vi.advanceTimersByTimeAsync(25_000);
    expect((garde as EtatLia | null)?.discussion).toMatchObject({ ouvert: false, msgs: [] });
  });

  it("une page qui n'a pas touché à la discussion renvoie celle qu'elle a lue (elle ne l'efface pas)", async () => {
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: Date.now() - 40 * 60_000 }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "c", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    // Un changement d'humeur oblige l'écriture de l'état.
    lia.ouvrirChat();
    lia.destroy();
    lia = mountLia({ vieAutonome: false, cle: "c", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(25_000);
    expect((garde as EtatLia | null)?.discussion).toBeDefined();
  });
});
