import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { validerDiscussion, validerEtat, empreinte, type DiscussionPartagee, type EtatHote, type EtatLia } from "../src/etat.js";
import { mountLia } from "../src/lia.js";
import { ecrireDiscussion, lireDiscussion } from "../src/stockage.js";
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
    expect(d?.msgs[d.msgs.length - 1]?.texte.length).toBe(600);
  });

  it("le total reste sous 4 000 caractères : les plus anciens messages tombent, l'état tient sous 16 Ko", () => {
    const longs = Array.from({ length: 20 }, (_, i) => ({ de: i % 2 ? ("lia" as const) : ("moi" as const), texte: `${i}:`.padEnd(600, "é") }));
    const d = validerDiscussion({ ouvert: true, quand: 5, msgs: longs });
    const total = d?.msgs.reduce((t, m) => t + m.texte.length, 0) ?? 0;
    expect(total).toBeLessThanOrEqual(4000);
    expect(d?.msgs[d.msgs.length - 1]?.texte.startsWith("19:")).toBe(true);
    expect(d?.msgs[0]?.texte.startsWith("14:")).toBe(true);
    const octets = new TextEncoder().encode(JSON.stringify(etat(d ? { discussion: d } : {}))).length;
    expect(octets).toBeLessThan(16 * 1024);
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

describe("la plus récente des deux discussions gagne (onglet ou état partagé)", () => {
  const DEPUIS_UN_QUART_D_HEURE = 15 * 60_000;
  const deLOnglet = [
    { de: "moi" as const, texte: "Où en est la batterie ?" },
    { de: "lia" as const, texte: "Elle est à 64 %." },
  ];
  const duHub = [
    { de: "moi" as const, texte: "Quand est mon prochain rendez-vous ?" },
    { de: "lia" as const, texte: "Demain à 9 h." },
  ];

  it("(a) onglet avec une vieille discussion + état partagé plus récent : la partagée s'affiche et reste dans l'état", async () => {
    ecrireDiscussion("a", { ouvert: true, msgs: deLOnglet, quand: Date.now() - DEPUIS_UN_QUART_D_HEURE });
    const quandHub = Date.now() - 60_000;
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: quandHub, msgs: duHub }) });
    const ecrits: EtatLia[] = [];
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => (ecrits.push(e), (garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "a", etat: hote, ask });
    // Avant la première lecture, c'est la discussion de l'onglet qui est rouverte, avec son vrai âge.
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    await vi.advanceTimersByTimeAsync(60_000);
    for (const e of ecrits) expect(e.discussion?.msgs.map((m) => m.texte)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    expect((garde as EtatLia | null)?.discussion?.msgs.map((m) => m.texte)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    // L'onglet garde maintenant la bonne discussion, avec l'instant de l'état partagé.
    expect(lireDiscussion("a")?.msgs.map((m) => m.texte)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    expect(lireDiscussion("a")?.quand).toBe(quandHub);
  });

  it("(b) onglet plus récent que l'état : l'onglet gagne et c'est lui que l'état reçoit", async () => {
    const quandOnglet = Date.now() - 60_000;
    ecrireDiscussion("b", { ouvert: true, msgs: deLOnglet, quand: quandOnglet });
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: Date.now() - DEPUIS_UN_QUART_D_HEURE, msgs: duHub }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "b", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    await vi.advanceTimersByTimeAsync(25_000);
    const ecrit = garde as EtatLia | null;
    expect(ecrit?.discussion?.msgs.map((m) => m.texte)).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    expect(ecrit?.discussion?.quand).toBe(quandOnglet);
  });

  it("(c) restauration sans nouvelle parole : l'instant ne bouge pas, ni dans l'onglet ni dans ce qui est écrit", async () => {
    const quandOnglet = Date.now() - DEPUIS_UN_QUART_D_HEURE;
    ecrireDiscussion("c", { ouvert: true, msgs: deLOnglet, quand: quandOnglet });
    const ecrits: EtatLia[] = [];
    const hote: EtatHote = { lire: async () => null, ecrire: async (e) => (ecrits.push(e), null) };
    lia = mountLia({ vieAutonome: false, cle: "c", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(25_000);
    expect(lireDiscussion("c")?.quand).toBe(quandOnglet);
    expect(ecrits.length).toBeGreaterThan(0);
    for (const e of ecrits) expect(e.discussion?.quand).toBe(quandOnglet);
  });

  it("(c bis) sans hôte d'état, la restauration ne renouvelle pas non plus l'instant", async () => {
    const quandOnglet = Date.now() - DEPUIS_UN_QUART_D_HEURE;
    ecrireDiscussion("c2", { ouvert: true, msgs: deLOnglet, quand: quandOnglet });
    lia = mountLia({ vieAutonome: false, cle: "c2", ask });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    expect(lireDiscussion("c2")?.quand).toBe(quandOnglet);
  });

  it("une vraie nouvelle parole la re-date, et l'onglet l'emporte alors sur un état partagé plus ancien", async () => {
    ecrireDiscussion("n", { ouvert: true, msgs: deLOnglet, quand: Date.now() - DEPUIS_UN_QUART_D_HEURE });
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: Date.now() - 60_000, msgs: duHub }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "n", etat: hote, ask });
    // Marc répond dans l'onglet avant que l'état arrive : sa parole est la plus récente.
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Et demain ?";
    document.querySelector<HTMLFormElement>(".lia-ui__form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(500);
    expect(messages().slice(0, 3)).toEqual(["Où en est la batterie ?", "Elle est à 64 %.", "Et demain ?"]);
    expect(lireDiscussion("n")?.quand).toBe(Date.now() - 500);
  });

  it("(d) une discussion fermée dans l'état partagé ne se rouvre jamais, même plus récente que l'onglet", async () => {
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion({ ouvert: false, msgs: [], quand: Date.now() - 1_000 }) }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "d", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
    expect(lireDiscussion("d")).toBeNull();
  });

  it("la partagée ne remplace pas la discussion de l'onglet par-dessus un champ où Marc écrit", async () => {
    document.body.innerHTML = "<p>Une page</p>";
    ecrireDiscussion("f", { ouvert: true, msgs: deLOnglet, quand: Date.now() - DEPUIS_UN_QUART_D_HEURE });
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion({ quand: Date.now() - 60_000, msgs: duHub }) }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "f", etat: hote, ask });
    document.body.insertAdjacentHTML("beforeend", '<input id="recherche">');
    document.querySelector<HTMLInputElement>("#recherche")?.focus();
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
  });

  it("l'onglet d'avant v0.42.1 (sans instant) cède devant une discussion partagée récente", async () => {
    sessionStorage.setItem("lia-ui:g:discussion", JSON.stringify({ ouvert: true, msgs: deLOnglet }));
    const hote: EtatHote = { lire: async () => etat({ discussion: discussion({ quand: Date.now() - 60_000, msgs: duHub }) }), ecrire: async () => null };
    lia = mountLia({ vieAutonome: false, cle: "g", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
  });
});

describe("la plus récente gagne à CHAQUE lecture de l'état, fermée ou ouverte (lia-ui#144)", () => {
  const UN_QUART_D_HEURE = 15 * 60_000;
  const deLOnglet = [
    { de: "moi" as const, texte: "Où en est la batterie ?" },
    { de: "lia" as const, texte: "Elle est à 64 %." },
  ];
  const duHub = [
    { de: "moi" as const, texte: "Quand est mon prochain rendez-vous ?" },
    { de: "lia" as const, texte: "Demain à 9 h." },
  ];
  const textes = (e: EtatLia | null): string[] | undefined => e?.discussion?.msgs.map((m) => m.texte);

  it("(a) état partagé fermé plus récent que l'onglet : l'onglet se ferme et l'état reste fermé, l'ancienne n'est jamais écrite", async () => {
    ecrireDiscussion("a1", { ouvert: true, msgs: deLOnglet, quand: Date.now() - UN_QUART_D_HEURE });
    const quandFermee = Date.now() - 1_000;
    let garde: EtatLia | null = etat({ discussion: discussion({ ouvert: false, msgs: [], quand: quandFermee }) });
    const ecrits: EtatLia[] = [];
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => (ecrits.push(e), (garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "a1", etat: hote, ask });
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
    expect(lireDiscussion("a1")).toBeNull();
    await vi.advanceTimersByTimeAsync(70_000);
    for (const e of ecrits) expect(e.discussion).toMatchObject({ ouvert: false, msgs: [], quand: quandFermee });
    expect((garde as EtatLia | null)?.discussion).toMatchObject({ ouvert: false, msgs: [], quand: quandFermee });
  });

  it("(a bis) une fermeture plus récente ne ferme pas un chat où Marc a déjà tapé une réponse", async () => {
    ecrireDiscussion("a2", { ouvert: true, msgs: deLOnglet, quand: Date.now() - UN_QUART_D_HEURE });
    let garde: EtatLia | null = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "a2", etat: hote, ask });
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Un brouillon";
    garde = etat({ discussion: discussion({ ouvert: false, msgs: [], quand: Date.now() - 1_000 }) });
    await vi.advanceTimersByTimeAsync(500);
    expect(document.querySelector(".lia-ui__chat")).not.toBeNull();
    expect(champ.value).toBe("Un brouillon");
  });

  it("(b) à une lecture suivante, une discussion ouverte plus récente est adoptée et jamais réécrasée", async () => {
    const quandOnglet = Date.now() - 5 * 60_000;
    ecrireDiscussion("b1", { ouvert: true, msgs: deLOnglet, quand: quandOnglet });
    let garde: EtatLia | null = null;
    // Comme l'hôte : une écriture qui ne dépasse pas sa version est refusée, il rend alors l'état qu'il garde.
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => (garde && e.version <= garde.version ? garde : ((garde = e), null)) };
    lia = mountLia({ vieAutonome: false, cle: "b1", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(25_000);
    expect(textes(garde)).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    // Pendant ce temps, Marc parle sur le hub : l'état partagé porte sa discussion, plus récente.
    const quandHub = Date.now() - 1_000;
    garde = etat({ version: ((garde as EtatLia | null)?.version ?? 0) + 50, maj: Date.now() + 1_000, discussion: discussion({ quand: quandHub, msgs: duHub }) });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(messages()).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect((garde as EtatLia | null)?.discussion).toMatchObject({ ouvert: true, quand: quandHub });
    expect(textes(garde)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    expect(lireDiscussion("b1")?.quand).toBe(quandHub);
  });

  it("(b bis) même si l'affichage n'est pas remplacé (champ où Marc écrit), l'état partagé garde la plus récente", async () => {
    document.body.innerHTML = "<p>Une page</p>";
    ecrireDiscussion("b2", { ouvert: true, msgs: deLOnglet, quand: Date.now() - UN_QUART_D_HEURE });
    const quandHub = Date.now() - 60_000;
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: quandHub, msgs: duHub }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "b2", etat: hote, ask });
    document.body.insertAdjacentHTML("beforeend", '<input id="recherche">');
    document.querySelector<HTMLInputElement>("#recherche")?.focus();
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    await vi.advanceTimersByTimeAsync(25_000);
    expect(textes(garde)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    expect((garde as EtatLia | null)?.discussion?.quand).toBe(quandHub);
  });

  it("(c) à une lecture suivante, une discussion partagée plus ancienne que celle de l'onglet ne la remplace pas", async () => {
    const quandOnglet = Date.now() - 60_000;
    ecrireDiscussion("c1", { ouvert: true, msgs: deLOnglet, quand: quandOnglet });
    let garde: EtatLia | null = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "c1", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(25_000);
    garde = etat({ version: 900, maj: Date.now() + 1_000, discussion: discussion({ quand: Date.now() - UN_QUART_D_HEURE, msgs: duHub }) });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(messages()).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    await vi.advanceTimersByTimeAsync(25_000);
    expect(textes(garde)).toEqual(["Où en est la batterie ?", "Elle est à 64 %."]);
    expect((garde as EtatLia | null)?.discussion?.quand).toBe(quandOnglet);
  });

  it("(d) une vraie parole après l'adoption la re-date à l'instant présent", async () => {
    ecrireDiscussion("d1", { ouvert: true, msgs: deLOnglet, quand: Date.now() - UN_QUART_D_HEURE });
    const quandHub = Date.now() - 60_000;
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: quandHub, msgs: duHub }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "d1", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    expect(messages()).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h."]);
    const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
    champ.value = "Et après-demain ?";
    document.querySelector<HTMLFormElement>(".lia-ui__form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await vi.advanceTimersByTimeAsync(25_000);
    const ecrit = garde as EtatLia | null;
    expect(textes(ecrit)?.slice(0, 3)).toEqual(["Quand est mon prochain rendez-vous ?", "Demain à 9 h.", "Et après-demain ?"]);
    expect(ecrit?.discussion?.quand).toBeGreaterThan(quandHub + 60_000);
  });

  it("une discussion fermée ici plus récemment que celle de l'état n'est pas rouverte par une lecture suivante", async () => {
    let garde: EtatLia | null = etat({ discussion: discussion({ quand: Date.now() - 60_000, msgs: duHub }) });
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), null) };
    lia = mountLia({ vieAutonome: false, cle: "e1", etat: hote, ask });
    await vi.advanceTimersByTimeAsync(500);
    document.querySelector<HTMLButtonElement>('[aria-label="Fermer la discussion"]')?.click();
    await vi.advanceTimersByTimeAsync(25_000);
    expect((garde as EtatLia | null)?.discussion).toMatchObject({ ouvert: false, msgs: [] });
    await vi.advanceTimersByTimeAsync(70_000);
    expect(document.querySelector(".lia-ui__chat")).toBeNull();
    expect((garde as EtatLia | null)?.discussion?.ouvert).toBe(false);
  });
});
