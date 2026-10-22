import { describe, expect, it } from "vitest";
import { dansZone, pointDansZone, prochaineDecision } from "../src/autonomie.js";

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
