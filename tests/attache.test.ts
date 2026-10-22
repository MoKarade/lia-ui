import { describe, expect, it } from "vitest";
import { estRegarde, pointPresDeLElement, pointPresDuCurseur, rangDe } from "../src/attache.js";

const fenetre = { w: 1000, h: 800 };
const rect = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe("pointPresDuCurseur", () => {
  it("reste près du curseur, au-dessus, sans le couvrir", () => {
    const p = pointPresDuCurseur({ x: 500, y: 400 }, 0, 60, fenetre);
    expect(p.x).toBeCloseTo(578);
    expect(p.y).toBeCloseTo(337);
    expect(Math.hypot(p.x - 500, p.y - 400)).toBeGreaterThan(60);
  });

  it("tourne avec le temps", () => {
    const a = pointPresDuCurseur({ x: 500, y: 400 }, 0, 60, fenetre);
    const b = pointPresDuCurseur({ x: 500, y: 400 }, 2, 60, fenetre);
    expect(b).not.toEqual(a);
  });

  it("reste dans la fenêtre, même curseur dans un coin", () => {
    for (const c of [{ x: 0, y: 0 }, { x: 1000, y: 800 }, { x: 0, y: 800 }, { x: 1000, y: 0 }]) {
      for (const t of [0, 1, 2, 3, 4, 5]) {
        const p = pointPresDuCurseur(c, t, 60, fenetre);
        expect(p.x).toBeGreaterThanOrEqual(33);
        expect(p.x).toBeLessThanOrEqual(967);
        expect(p.y).toBeGreaterThanOrEqual(33);
        expect(p.y).toBeLessThanOrEqual(767);
      }
    }
  });
});

describe("pointPresDeLElement", () => {
  it("se met à droite de l'élément, à hauteur de son milieu", () => {
    const p = pointPresDeLElement(rect(100, 300, 400, 500), 60, fenetre);
    expect(p).toEqual({ x: 451, y: 400 });
  });

  it("passe à gauche quand la droite sort de la fenêtre", () => {
    const p = pointPresDeLElement(rect(600, 300, 950, 500), 60, fenetre);
    expect(p.x).toBe(549);
  });

  it("se met sur l'élément quand il n'y a de place ni à droite ni à gauche", () => {
    const p = pointPresDeLElement(rect(10, 300, 990, 500), 60, fenetre);
    expect(p.x).toBe(500);
  });

  it("suit l'élément qui défile : le point bouge exactement comme lui", () => {
    const avant = pointPresDeLElement(rect(100, 300, 400, 500), 60, fenetre);
    const apres = pointPresDeLElement(rect(100, 250, 400, 450), 60, fenetre);
    expect(apres.x).toBe(avant.x);
    expect(apres.y - avant.y).toBe(-50);
  });

  it("reste dans la fenêtre en hauteur", () => {
    expect(pointPresDeLElement(rect(100, -300, 400, -100), 60, fenetre).y).toBe(36);
    expect(pointPresDeLElement(rect(100, 900, 400, 1100), 60, fenetre).y).toBe(764);
  });
});

describe("estRegarde", () => {
  it("accepte un élément dans la bande centrale de la fenêtre", () => {
    expect(estRegarde(rect(100, 300, 400, 500), fenetre)).toBe(true);
  });

  it("refuse un élément hors écran, tout en haut, tout en bas ou vide", () => {
    expect(estRegarde(rect(100, -500, 400, -10), fenetre)).toBe(false);
    expect(estRegarde(rect(100, 0, 400, 100), fenetre)).toBe(false);
    expect(estRegarde(rect(100, 700, 400, 900), fenetre)).toBe(false);
    expect(estRegarde(rect(100, 300, 100, 500), fenetre)).toBe(false);
    expect(estRegarde(rect(1100, 300, 1400, 500), fenetre)).toBe(false);
  });
});

describe("rangDe", () => {
  it("convertit un tirage en rang, sans sortir de la liste", () => {
    expect(rangDe(0, 3)).toBe(0);
    expect(rangDe(0.5, 3)).toBe(1);
    expect(rangDe(0.999999, 3)).toBe(2);
    expect(rangDe(1, 3)).toBe(2);
  });

  it("rend -1 quand il n'y a rien à voir", () => {
    expect(rangDe(0.4, 0)).toBe(-1);
  });
});
