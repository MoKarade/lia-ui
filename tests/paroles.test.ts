import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENVIES_DEPART } from "../src/cerveau.js";
import { LIBELLES_HUMEURS } from "../src/humeurs.js";
import { ACTIONS_LIA } from "../src/activite.js";
import { BLAGUES, PHRASES_HUMEUR, SILHOUETTE_PAROLE, SUITES, choisirParole, estPuceLia, resumeJournal, suiteParole, type ContexteParole } from "../src/paroles.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

const ctx = (c: Partial<ContexteParole> = {}): ContexteParole => ({ heure: 15, humeur: "curieux", envies: ENVIES_DEPART, faits: [], maintenant: Date.UTC(2026, 9, 23, 20, 0, 0), recentes: [], ...c });
const suite = (xs: number[]): (() => number) => {
  let i = 0;
  return () => xs[i++ % xs.length] ?? 0;
};

describe("ce qu'elle dit d'elle-même", () => {
  it("une phrase pour chacune des 40 humeurs", () => {
    expect(Object.keys(PHRASES_HUMEUR).sort()).toEqual(Object.keys(LIBELLES_HUMEURS).sort());
  });

  it("elle dit son humeur réelle", () => {
    // Le tirage le plus bas tombe sur « heure » (1), le suivant (> 1) sur l'humeur.
    const dits = new Set<string>();
    for (let i = 0; i < 100; i++) dits.add(choisirParole(ctx({ humeur: "triste" }), () => i / 100).text);
    expect(dits).toContain(PHRASES_HUMEUR["triste"]);
  });

  it("ses envies parlent : l'ennui, la solitude, la fatigue ne sortent que si elles sont vraies", () => {
    const toutes = (c: Partial<ContexteParole>): Set<string> => {
      const ids = new Set<string>();
      for (let i = 0; i < 200; i++) ids.add(choisirParole(ctx(c), () => i / 200).id);
      return ids;
    };
    expect(toutes({}).has("ennui")).toBe(false);
    expect(toutes({ envies: { ...ENVIES_DEPART, ennui: 0.8 } }).has("ennui")).toBe(true);
    expect(toutes({ envies: { ...ENVIES_DEPART, social: 0.1 } }).has("solitude")).toBe(true);
    expect(toutes({ envies: { ...ENVIES_DEPART, energie: 0.2 } }).has("fatigue")).toBe(true);
    expect(toutes({}).has("fatigue")).toBe(false);
  });

  it("elle ne propose de raconter ce qu'elle a fait que si son journal a quelque chose", () => {
    const ids = (c: Partial<ContexteParole>): Set<string> => new Set(Array.from({ length: 300 }, (_, i) => choisirParole(ctx(c), () => i / 300).id));
    expect(ids({}).has("resume")).toBe(false);
    const faits = [1, 2, 3].map((n) => ({ t: Date.UTC(2026, 9, 23, 19, n, 0), quoi: "promener" as const }));
    expect(ids({ faits }).has("resume")).toBe(true);
  });

  it("une phrase dite récemment sort 8 fois moins", () => {
    const part = (recentes: string[]): number => {
      let n = 0;
      for (let i = 0; i < 1000; i++) if (choisirParole(ctx({ recentes }), () => (i + 0.5) / 1000).id === "poulpe") n++;
      return n;
    };
    expect(part(["poulpe"])).toBeLessThan(part([]) / 4);
  });

  it("aucune phrase ne parle d'un projet, d'un lieu ou d'un chiffre : elle ne dit que ce qu'elle sait d'elle", () => {
    const interdits = /\d|JobAI|CarAI|DriveAI|FinanceAI|BatchChef|MemoryAI|Julie|bail|\$|°/;
    const toutes = [...Object.values(PHRASES_HUMEUR), ...BLAGUES, ...Object.values(SUITES).filter((x): x is string => !!x)];
    for (let i = 0; i < 400; i++) toutes.push(choisirParole(ctx({ envies: { ...ENVIES_DEPART, ennui: 0.9, social: 0.1, energie: 0.2, joie: 0.9, curiosite: 0.9, inquiet: 0.9 }, faits: [{ t: 1, quoi: "voir" }, { t: 2, quoi: "jouer" }, { t: 3, quoi: "voir" }] }), () => i / 400).text);
    for (const t of toutes) expect(t, t).not.toMatch(interdits);
  });

  it("chaque silhouette qu'elle prend après une phrase existe dans son moteur", () => {
    for (const [id, silhouette] of Object.entries(SILHOUETTE_PAROLE)) expect(ACTIONS_LIA, id).toContain(silhouette);
  });

  it("les réponses rapides sont à elle (lia:…), et ses suites répondent", () => {
    const p = choisirParole(ctx(), suite([0.4]));
    expect(p.text.length).toBeGreaterThan(5);
    for (let i = 0; i < 300; i++) {
      const x = choisirParole(ctx({ faits: [{ t: 1, quoi: "voir" }, { t: 2, quoi: "jouer" }, { t: 3, quoi: "voir" }] }), () => i / 300);
      for (const c of x.chips ?? []) {
        expect(estPuceLia(c.id)).toBe(true);
        expect(suiteParole(c.label, ctx(), () => 0.1), c.label).not.toBe(undefined);
      }
    }
    expect(estPuceLia("autre")).toBe(false);
    expect(suiteParole("Haha", ctx(), () => 0)?.text).toBe(SUITES["Haha"]);
    expect(suiteParole("Une autre", ctx(), () => 0)?.chips?.map((c) => c.label)).toEqual(["Haha", "Bof"]);
    expect(suiteParole("Inconnu", ctx(), () => 0)).toBeNull();
  });

  it("ce qu'elle raconte vient de son journal et de rien d'autre", () => {
    const maintenant = Date.UTC(2026, 9, 23, 20, 0, 0);
    expect(resumeJournal([], maintenant)).toBe("Rien de marquant depuis tout à l'heure.");
    const faits = [
      { t: maintenant - 60_000, quoi: "promener" as const },
      { t: maintenant - 120_000, quoi: "promener" as const },
      { t: maintenant - 180_000, quoi: "jouer" as const },
      { t: maintenant - 5 * 3600_000, quoi: "voir" as const },
    ];
    expect(resumeJournal(faits, maintenant)).toBe("Depuis tout à l'heure : je me suis promenée 2 fois, j'ai joué.");
    expect(suiteParole("Oui", ctx({ faits, maintenant, recentes: ["resume"] }), () => 0)?.text).toContain("promenée");
  });
});

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;
let lia: LiaHandle | null = null;
const bulle = (): string => document.querySelector<HTMLElement>(".lia-ui__bulle")?.textContent ?? "";
const monter = (opts: Parameters<typeof mountLia>[0]): LiaHandle => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 23, 15, 0, 0));
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 1000 / 30) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  lia = mountLia({ quandMouvementReduit: "complet", ...opts });
  return lia;
};
beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1400, bottom: 900 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

describe("elle parle seule, même quand l'hôte n'a rien à dire", () => {
  const dits = (secondes: number): string[] => {
    const vus: string[] = [];
    for (let i = 0; i < secondes * 2; i++) {
      vi.advanceTimersByTime(500);
      const b = bulle();
      const derniere = vus[vus.length - 1];
      // La bulle s'écrit lettre par lettre : un texte qui prolonge le précédent est la même bulle.
      if (b && derniere !== undefined && b.startsWith(derniere)) vus[vus.length - 1] = b;
      else if (b && (derniere === undefined || !derniere.startsWith(b))) vus.push(b);
    }
    return vus;
  };

  it("sans onSpontane : au moins 4 bulles différentes en 5 minutes, jamais un mot sur un projet", () => {
    monter({ entrees: () => ({ alerte: 0.37, nbAlertes: 0.5 }) });
    const vus = dits(300);
    expect(vus.length, vus.join(" | ")).toBeGreaterThanOrEqual(4);
    for (const v of vus) expect(v).not.toMatch(/JobAI|CarAI|DriveAI|FinanceAI|BatchChef|MemoryAI/);
  });

  it("avec un onSpontane qui ne dit que des projets : elle alterne, un tiers au moins de ses bulles sont d'elle", () => {
    const projets = vi.fn(() => "DriveAI : le quota approche.");
    monter({ onSpontane: projets });
    const vus = dits(600);
    const siens = vus.filter((v) => !v.includes("DriveAI"));
    expect(projets).toHaveBeenCalled();
    expect(siens.length, vus.join(" | ")).toBeGreaterThanOrEqual(3);
    expect(vus.some((v) => v.includes("DriveAI"))).toBe(true);
  });

  it("sur un vrai hub (alertes, motifs du monde, relances) : jamais deux bulles de projet de suite, la moitié est à elle", () => {
    let n = 0;
    const lettre = (): string => String.fromCharCode(65 + (n++ % 26));
    monter({
      entrees: () => ({ alerte: 0.9, nbAlertes: 1 }),
      monde: (motif) => (motif === "accompagner" ? null : { text: `${lettre()}DriveAI : le quota approche.` }),
      onSpontane: () => `${lettre()}CarAI : une relance.`,
    });
    const vus = dits(900);
    const projet = vus.map((v) => /DriveAI|CarAI/.test(v));
    expect(vus.length, vus.join(" | ")).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < projet.length; i++) expect(projet[i - 1] && projet[i], `deux projets de suite : ${vus[i - 1]} | ${vus[i]}`).toBe(false);
    expect(projet.filter((x) => !x).length, vus.join(" | ")).toBeGreaterThanOrEqual(Math.floor(vus.length / 2) - 1);
  });

  it("parolePropre: false : elle se tait quand l'hôte n'a rien (comme avant)", () => {
    monter({ parolePropre: false });
    expect(dits(300)).toEqual([]);
  });

  it("cliquer sur l'une de ses réponses rapides : elle répond, sans déranger l'hôte", () => {
    const onChip = vi.fn();
    const l = monter({ onChip, parolePropre: false });
    l.dire("Question sans importance : tu préfères le matin ou le soir ?", { chips: [{ id: "lia:Le soir", label: "Le soir" }] });
    vi.advanceTimersByTime(2000);
    document.querySelector<HTMLButtonElement>(".lia-ui__puce")?.click();
    vi.advanceTimersByTime(2500);
    expect(bulle()).toContain("Le soir. Je m'en doutais");
    expect(onChip).not.toHaveBeenCalled();
  });

  it("les réponses rapides de l'hôte, elles, lui sont transmises", () => {
    const onChip = vi.fn();
    const l = monter({ onChip });
    l.dire("Regarder ?", { chips: [{ id: "regarder", label: "Regarder" }] });
    vi.advanceTimersByTime(2000);
    document.querySelector<HTMLButtonElement>(".lia-ui__puce")?.click();
    expect(onChip).toHaveBeenCalledWith("regarder", "bulle");
  });
});
