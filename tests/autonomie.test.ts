import { describe, expect, it } from "vitest";
import { dansZone, deriveHumeur, enSilence, jourLocal, pointDansZone, prochaineDecision } from "../src/autonomie.js";

const suite = (valeurs: number[]) => {
  let i = 0;
  return () => valeurs[i++ % valeurs.length] ?? 0;
};

describe("prochaineDecision", () => {
  it("attend quand le tirage est bas, entre 3 et 6 secondes", () => {
    const d = prochaineDecision(suite([0.1, 0.5]));
    expect(d).toEqual({ type: "attendre", duree: 4.5 });
  });

  it("erre vers un point de la zone, avec une silhouette de repos ou de joie", () => {
    const d = prochaineDecision(suite([0.5, 0.25, 0.75, 0.5, 0.2]));
    expect(d.type).toBe("errer");
    if (d.type !== "errer") return;
    expect(d.u).toBeCloseTo(0.25);
    expect(d.v).toBeCloseTo(0.75);
    expect(d.duree).toBeCloseTo(5.5);
    expect(["repos", "musique", "content", "surpris"]).toContain(d.etat);
  });

  it("change parfois d'humeur, jamais vers triste ou inquiet de son propre chef", () => {
    for (let i = 0; i < 6; i++) {
      const d = prochaineDecision(suite([0.9, i / 6]));
      expect(d.type).toBe("humeur");
      if (d.type === "humeur") expect(["triste", "inquiet", "excite"]).not.toContain(d.humeur);
    }
  });

  it("ne décide jamais de parler", () => {
    let seed = 7;
    const hasard = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 500; i++) expect(["attendre", "errer", "humeur"]).toContain(prochaineDecision(hasard).type);
  });
});

describe("zones", () => {
  const zone = { x: 10, y: 20, w: 300, h: 200 };

  it("convertit des fractions en pixels en gardant la marge", () => {
    expect(pointDansZone(zone, 0, 0, 50)).toEqual({ x: 60, y: 70 });
    expect(pointDansZone(zone, 1, 1, 50)).toEqual({ x: 260, y: 170 });
  });

  it("retient un point dans la zone", () => {
    expect(dansZone(zone, -500, 9999, 30)).toEqual({ x: 40, y: 190 });
    expect(dansZone(zone, 100, 100, 30)).toEqual({ x: 100, y: 100 });
  });

  it("reste valide quand la zone est plus petite que la marge", () => {
    const p = dansZone({ x: 0, y: 0, w: 40, h: 40 }, 20, 20, 60);
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });
});

describe("prochaineDecision avec contexte (sa tirette, reprise de la maquette)", () => {
  const plein = { curseurRecent: false, cibles: 3, parole: true, relance: true };

  it("suit le curseur quand il a bougé récemment", () => {
    const d = prochaineDecision(suite([0.1, 0.5]), { ...plein, curseurRecent: true });
    expect(d).toEqual({ type: "suivre", duree: 8.5 });
  });

  it("ne suit pas un curseur immobile ou absent", () => {
    expect(prochaineDecision(suite([0.1]), plein).type).not.toBe("suivre");
  });

  it("28 % reste là, trois secondes pile", () => {
    expect(prochaineDecision(suite([0.27]), plein)).toEqual({ type: "attendre", duree: 3 });
  });

  it("18 % erre, 4 à 7 secondes, silhouette de repos ou de joie", () => {
    const d = prochaineDecision(suite([0.3, 0.25, 0.75, 0.5, 0.2]), plein);
    expect(d.type).toBe("errer");
    if (d.type !== "errer") return;
    expect(d.u).toBeCloseTo(0.25);
    expect(d.v).toBeCloseTo(0.75);
    expect(d.duree).toBeCloseTo(5.5);
  });

  it("22 % veut parler : une fois sur cinq un salut, sinon une remarque", () => {
    expect(prochaineDecision(suite([0.5, 0.1]), plein)).toEqual({ type: "parler", motif: "salut" });
    expect(prochaineDecision(suite([0.5, 0.2]), plein)).toEqual({ type: "parler", motif: "rien" });
  });

  it("18 % va voir un élément, 6,5 secondes, avec un rang à convertir", () => {
    expect(prochaineDecision(suite([0.7, 0.75]), plein)).toEqual({ type: "voir", rang: 0.75, duree: 6.5 });
  });

  it("7 % change d'humeur, 7 % relance", () => {
    expect(prochaineDecision(suite([0.9, 0.0]), plein).type).toBe("humeur");
    expect(prochaineDecision(suite([0.95]), plein)).toEqual({ type: "relance" });
  });

  it("ne dit jamais ce qu'elle ne peut pas faire : elle reste là", () => {
    const rester = { type: "attendre", duree: 3 };
    expect(prochaineDecision(suite([0.5]), { ...plein, parole: false })).toEqual(rester);
    expect(prochaineDecision(suite([0.7]), { ...plein, cibles: 0 })).toEqual(rester);
    expect(prochaineDecision(suite([0.95]), { ...plein, relance: false })).toEqual(rester);
    expect(prochaineDecision(suite([0.95]), { ...plein, parole: false })).toEqual(rester);
  });

  it("sans contexte, rien ne change : le même tirage donne la même décision qu'avant", () => {
    expect(prochaineDecision(suite([0.5, 0.25, 0.75, 0.5, 0.2])).type).toBe("errer");
  });

  it("sur 20 000 tirages, les parts sont celles de la maquette", () => {
    let seed = 11;
    const hasard = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const n = 20000;
    const c: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const t = prochaineDecision(hasard, plein).type;
      c[t] = (c[t] ?? 0) + 1;
    }
    const part = (k: string): number => (c[k] ?? 0) / n;
    expect(Math.abs(part("attendre") - 0.28)).toBeLessThan(0.015);
    expect(Math.abs(part("errer") - 0.18)).toBeLessThan(0.015);
    expect(Math.abs(part("parler") - 0.22)).toBeLessThan(0.015);
    expect(Math.abs(part("voir") - 0.18)).toBeLessThan(0.015);
    expect(Math.abs(part("humeur") - 0.07)).toBeLessThan(0.015);
    expect(Math.abs(part("relance") - 0.07)).toBeLessThan(0.015);
  });
});

describe("silence, jour et dérive d'humeur", () => {
  it("le silence de nuit passe minuit : 22 h à 7 h", () => {
    for (const h of [22, 23, 0, 3, 6]) expect(enSilence(h, [22, 7])).toBe(true);
    for (const h of [7, 12, 21]) expect(enSilence(h, [22, 7])).toBe(false);
  });

  it("un silence dans la même journée, et un silence vide", () => {
    expect(enSilence(13, [12, 14])).toBe(true);
    expect(enSilence(14, [12, 14])).toBe(false);
    expect(enSilence(3, [5, 5])).toBe(false);
  });

  it("le jour local est AAAA-MM-JJ", () => {
    expect(jourLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("l'humeur dérive une fois sur trois, vers l'une des cinq humeurs de la maquette", () => {
    expect(deriveHumeur(suite([0.5]))).toBeNull();
    expect(deriveHumeur(suite([0.1, 0]))).toBe("curieux");
    expect(deriveHumeur(suite([0.1, 0.99]))).toBe("espiegle");
  });
});
