import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { adopter, empreinte, validerEtat, type EtatHote, type EtatLia } from "../src/etat.js";
import { INTERIEUR_DEPART } from "../src/interieur.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

const jour = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const etat = (o: Partial<EtatLia> = {}): EtatLia => ({
  version: 3,
  maj: Date.now() + 1000,
  envies: { ...ENVIES_DEPART, joie: 0.9, ennui: 0.1 },
  journal: [{ t: Date.now() - 5000, quoi: "jouer" }],
  lente: { calme: 0.4 },
  humeur: "joyeux",
  relances: { jour: jour(), n: 1 },
  ...o,
});

describe("validerEtat : ce que l'hôte rend est une donnée", () => {
  it("accepte un état complet et retire les clés inconnues", () => {
    const e = validerEtat({ ...etat(), secret: "x", journal: [{ t: 5, quoi: "jouer", contenu: "texte de Marc" }] });
    expect(e).not.toBeNull();
    expect(e).not.toHaveProperty("secret");
    expect(e?.journal).toEqual([{ t: 5, quoi: "jouer" }]);
  });

  it("refuse ce qui n'est pas un état", () => {
    for (const x of [null, 3, "x", {}, { ...etat(), version: -1 }, { ...etat(), version: 1.5 }, { ...etat(), maj: 0 }, { ...etat(), envies: { joie: 2 } }, { ...etat(), humeur: "<img src=x>" }, { ...etat(), relances: { jour: "hier", n: 1 } }, { ...etat(), relances: { jour: jour(), n: 1000 } }]) {
      expect(validerEtat(x)).toBeNull();
    }
  });

  it("borne les nombres : une mémoire lente hors de [0, 1] ou à clé douteuse est écartée, les faits inconnus aussi", () => {
    const e = validerEtat(etat({ lente: { calme: 0.5, mauvais: 7, "a b": 0.2, "<x>": 0.3 }, journal: [{ t: 1, quoi: "jouer" }, { t: 2, quoi: "inconnu" as never }, { t: Number.NaN, quoi: "repos" }] }));
    expect(e?.lente).toEqual({ calme: 0.5 });
    expect(e?.journal).toEqual([{ t: 1, quoi: "jouer" }]);
  });
});

describe("son monde intérieur dans l'état partagé", () => {
  const dedans = { douleur: 0.5, cause: "brusque" as const, sensibilite: 0.3, plaisir: 0.1, confiance: 0.6, usure: 0 };
  it("garde un intérieur conforme", () => {
    expect(validerEtat(etat({ interieur: dedans }))?.interieur).toEqual(dedans);
    expect(validerEtat(etat({ interieur: { ...dedans, cause: null } }))?.interieur?.cause).toBeNull();
  });

  it("retire un intérieur douteux sans faire tomber l'état, et tolère son absence", () => {
    for (const x of [{ ...dedans, douleur: 3 }, { ...dedans, cause: "<script>" }, { ...dedans, confiance: Number.NaN }, "mal", null]) {
      const e = validerEtat({ ...etat(), interieur: x });
      expect(e).not.toBeNull();
      expect(e).not.toHaveProperty("interieur");
    }
    expect(validerEtat(etat())).not.toHaveProperty("interieur");
    expect(validerEtat({ ...etat(), interieur: { ...dedans, note: "x" } })?.interieur).not.toHaveProperty("note");
  });

  it("l'empreinte change quand la douleur change, pas pour un millième", () => {
    const a = etat({ interieur: dedans });
    expect(empreinte({ ...a, interieur: { ...dedans, douleur: 0.501 } })).toBe(empreinte(a));
    expect(empreinte({ ...a, interieur: { ...dedans, douleur: 0.2 } })).not.toBe(empreinte(a));
    expect(empreinte({ ...a, interieur: { ...dedans, cause: "ton" } })).not.toBe(empreinte(a));
    const { interieur: _sans, ...sansInterieur } = a;
    expect(empreinte(sansInterieur)).not.toBe(empreinte(a));
    expect(empreinte({ ...a, interieur: { ...INTERIEUR_DEPART } })).not.toBe(empreinte(a));
  });
});

describe("sa mémoire sur plusieurs jours dans l'état partagé", () => {
  const il = Date.now();
  const bons = [
    { quand: il - 3_600_000, genre: "gentil" as const, poids: 0.6 },
    { quand: il - 60_000, genre: "brusque" as const, poids: 0.9 },
  ];

  it("garde des souvenirs valides, sans autre clé", () => {
    const e = validerEtat({ ...etat(), souvenirs: [{ ...bons[0], texte: "secret" }, bons[1]] });
    expect(e?.souvenirs).toEqual(bons);
    expect(Object.keys(e?.souvenirs?.[0] ?? {}).sort()).toEqual(["genre", "poids", "quand"]);
  });

  it("borne la liste à 40 en gardant les plus récents de la liste", () => {
    const beaucoup = Array.from({ length: 130 }, (_, k) => ({ quand: il - 1000 * (130 - k), genre: "gentil", poids: 0.5 }));
    const e = validerEtat({ ...etat(), souvenirs: beaucoup });
    expect(e?.souvenirs).toHaveLength(40);
    expect(e?.souvenirs?.[39]).toEqual(beaucoup[129]);
    expect(e?.souvenirs?.[0]).toEqual(beaucoup[90]);
  });

  it("retire un souvenir invalide sans rejeter l'état ni les autres souvenirs", () => {
    const mauvais = [
      { quand: il, genre: "inconnu", poids: 0.5 },
      { quand: Number.NaN, genre: "ton", poids: 0.5 },
      { quand: il, genre: "ton", poids: 1.5 },
      { quand: il, genre: "ton", poids: -0.1 },
      { quand: il, genre: "ton", poids: Number.POSITIVE_INFINITY },
      { quand: -1, genre: "ton", poids: 0.5 },
      { quand: 1e300, genre: "ton", poids: 0.5 },
      { quand: "hier", genre: "ton", poids: 0.5 },
      "souvenir",
      null,
      7,
    ];
    const e = validerEtat({ ...etat(), souvenirs: [...mauvais, bons[0]] });
    expect(e).not.toBeNull();
    expect(e?.souvenirs).toEqual([bons[0]]);
  });

  it("tolère l'absence, un champ qui n'est pas un tableau ou une liste entièrement invalide : le champ disparaît", () => {
    expect(validerEtat(etat())).not.toHaveProperty("souvenirs");
    for (const x of ["mal", 3, null, {}, [], [{ genre: "x" }]]) {
      const e = validerEtat({ ...etat(), souvenirs: x });
      expect(e).not.toBeNull();
      expect(e).not.toHaveProperty("souvenirs");
    }
  });

  it("un état ancien (sans souvenirs) et un état neuf restent lisibles ensemble", () => {
    const ancien = validerEtat(etat({ interieur: INTERIEUR_DEPART }));
    const neuf = validerEtat(etat({ souvenirs: bons }));
    expect(ancien?.interieur).toBeDefined();
    expect(neuf?.souvenirs).toHaveLength(2);
  });

  it("l'empreinte change avec un nouveau souvenir ou un poids qui bouge d'un palier, pas pour un millième", () => {
    const a = etat({ souvenirs: bons });
    expect(empreinte({ ...a, souvenirs: bons.map((s) => ({ ...s, poids: s.poids + 0.001 })) })).toBe(empreinte(a));
    expect(empreinte({ ...a, souvenirs: [...bons, { quand: il, genre: "retour", poids: 0.5 }] })).not.toBe(empreinte(a));
    expect(empreinte({ ...a, souvenirs: [bons[0] as (typeof bons)[number], { ...(bons[1] as (typeof bons)[number]), quand: il }] })).not.toBe(empreinte(a));
    expect(empreinte({ ...a, souvenirs: bons.map((s) => ({ ...s, poids: s.poids * 0.4 })) })).not.toBe(empreinte(a));
    const { souvenirs: _sans, ...sansSouvenirs } = a;
    expect(empreinte(sansSouvenirs)).not.toBe(empreinte(a));
    expect(empreinte({ ...a, souvenirs: [] })).toBe(empreinte(sansSouvenirs));
  });
});

describe("adopter et empreinte", () => {
  it("adopte seulement un état plus récent (ou de même date et de version plus haute)", () => {
    const d = etat({ maj: 1000, version: 5 });
    expect(adopter(null, 0, 0)).toBe(false);
    expect(adopter(d, 999, 9)).toBe(true);
    expect(adopter(d, 1000, 4)).toBe(true);
    expect(adopter(d, 1000, 5)).toBe(false);
    expect(adopter(d, 1001, 0)).toBe(false);
  });

  it("l'empreinte ignore les variations minuscules des envies et réagit à l'humeur ou au journal", () => {
    const a = etat();
    expect(empreinte({ ...a, envies: { ...a.envies, joie: a.envies.joie + 0.01 } })).toBe(empreinte(a));
    expect(empreinte({ ...a, humeur: "triste" })).not.toBe(empreinte(a));
    expect(empreinte({ ...a, journal: [...a.journal, { t: 9, quoi: "repos" }] })).not.toBe(empreinte(a));
  });
});

describe("LIA avec un état partagé", () => {
  let lia: LiaHandle | null = null;
  beforeEach(() => {
    installerEnvironnement();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 23, 14, 0, 0));
  });
  afterEach(() => {
    lia?.destroy();
    lia = null;
    vi.useRealTimers();
  });
  const monter = (hote: EtatHote): LiaHandle => (lia = mountLia({ etat: hote, vieAutonome: false, cle: "etat" }));

  it("lit au montage et prend l'humeur, les envies et le journal de l'état partagé", async () => {
    const distant = etat({ humeur: "inquiet" });
    const l = monter({ lire: async () => distant, ecrire: async () => null });
    await vi.advanceTimersByTimeAsync(10);
    expect(l.humeur().nom).toBe("inquiet");
    expect(l.envies().joie).toBeCloseTo(0.9, 1);
    expect(l.journal().map((f) => f.quoi)).toContain("jouer");
    expect(l.partage()).toMatchObject({ actif: true, lu: true, version: 3 });
  });

  it("garde l'humeur de l'autre page malgré son propre réseau", async () => {
    const l = monter({ lire: async () => etat({ humeur: "triste" }), ecrire: async () => null });
    await vi.advanceTimersByTimeAsync(15_000);
    expect(l.humeur().nom).toBe("triste");
  });

  it("n'écrit jamais avant d'avoir lu : un hôte en panne ne fait pas effacer l'état d'une autre page", async () => {
    const ecrire = vi.fn(async () => null);
    const erreur = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const l = monter({ lire: async () => Promise.reject(new Error("hors ligne")), ecrire });
    await vi.advanceTimersByTimeAsync(50_000);
    expect(ecrire).not.toHaveBeenCalled();
    expect(l.partage()).toMatchObject({ actif: true, lu: false });
    expect(erreur).toHaveBeenCalledTimes(1);
    expect(l.humeur().nom.length).toBeGreaterThan(0);
  });

  it("ignore un état invalide et garde le sien", async () => {
    const l = monter({ lire: async () => ({ version: "x" }), ecrire: async () => null });
    const avant = l.envies().joie;
    await vi.advanceTimersByTimeAsync(10);
    expect(l.envies().joie).toBeCloseTo(avant, 1);
    expect(l.partage().version).toBe(0);
  });

  it("écrit son état à la version suivante au plus tard 20 s après quand il a changé", async () => {
    const ecrire = vi.fn(async (e: EtatLia) => e);
    const l = monter({ lire: async () => null, ecrire });
    await vi.advanceTimersByTimeAsync(10);
    l.setHumeur("fier");
    await vi.advanceTimersByTimeAsync(21_000);
    expect(ecrire).toHaveBeenCalled();
    const e = ecrire.mock.calls[0]?.[0] as EtatLia;
    expect(e.version).toBe(1);
    expect(e.humeur).toBe("fier");
    expect(Object.keys(e).sort()).toEqual(["envies", "humeur", "interieur", "journal", "lente", "maj", "relances", "version"]);
    expect(l.partage().version).toBeGreaterThanOrEqual(1);
  });

  it("si l'hôte rend un état plus récent (conflit), elle le prend", async () => {
    const plusRecent = etat({ version: 40, humeur: "excite", maj: Date.now() + 60_000 });
    const l = monter({ lire: async () => null, ecrire: async () => plusRecent });
    await vi.advanceTimersByTimeAsync(21_000);
    expect(l.partage().version).toBe(40);
    expect(l.humeur().nom).toBe("excite");
  });

  it("relit chaque minute : l'état d'une autre page arrive en une minute au plus", async () => {
    let distant: EtatLia | null = null;
    // L'autre page écrit au moment où on la lit : son état est plus récent que le nôtre (qui s'est écrit à 20 s).
    const l = monter({ lire: async () => (distant ? { ...distant, maj: Date.now() } : null), ecrire: async () => null });
    await vi.advanceTimersByTimeAsync(10);
    distant = etat({ humeur: "fier" });
    await vi.advanceTimersByTimeAsync(61_000);
    expect(l.humeur().nom).toBe("fier");
  });

  it("UNE seule LIA : la douleur prise dans une page arrive dans l'autre, retombée du temps écoulé, sans cri", async () => {
    let garde: unknown = null;
    const hote: EtatHote = { lire: async () => garde, ecrire: async (e) => ((garde = e), e) };
    const hit = (): HTMLElement => document.querySelector<HTMLElement>(".lia-ui__hit") as HTMLElement;
    const a = monter(hote);
    await vi.advanceTimersByTimeAsync(2000);
    for (let k = 0; k < 4; k++) {
      hit().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
      hit().dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
      await vi.advanceTimersByTimeAsync(200);
    }
    const mal = a.interieur().douleur;
    expect(mal).toBeGreaterThan(0.3);
    await vi.advanceTimersByTimeAsync(21_000);
    expect((garde as EtatLia | null)?.interieur?.cause).toBe("brusque");
    const ecrite = (garde as EtatLia).interieur?.douleur ?? 0;
    a.destroy();
    lia = null;
    document.body.innerHTML = "";
    // La deuxième page s'ouvre 30 s plus tard.
    await vi.advanceTimersByTimeAsync(30_000);
    const b = monter(hote);
    await vi.advanceTimersByTimeAsync(20);
    const i = b.interieur();
    expect(i.cause).toBe("brusque");
    expect(i.douleur).toBeGreaterThan(0.1);
    expect(i.douleur).toBeLessThan(ecrite);
    expect(i.sensibilite).toBeGreaterThan(0.2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.querySelector(".lia-ui__bulle")?.textContent ?? "").not.toMatch(/Aïe|Un à la fois|Ça pique/);
  });

  it("sans `etat`, rien ne part et elle vit comme avant", async () => {
    const l = (lia = mountLia({ vieAutonome: false, cle: "sans" }));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(l.partage()).toEqual({ actif: false, lu: false, version: 0, maj: 0 });
  });
});
