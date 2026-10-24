import { describe, expect, it } from "vitest";
import { placeSansRecouvrir, surfaceRecouverte } from "../src/placement.js";

const b = (x: number, y: number, w = 100, h = 60) => ({ x, y, w, h });

describe("surfaceRecouverte", () => {
  it("0 quand les boîtes sont loin, la surface commune quand elles se chevauchent", () => {
    expect(surfaceRecouverte(b(0, 0), b(300, 0))).toBe(0);
    expect(surfaceRecouverte(b(0, 0), b(50, 0, 100, 60), 0)).toBe(50 * 60);
  });
  it("une boîte collée à l'autre compte comme recouverte à cause de la marge", () => {
    expect(surfaceRecouverte(b(0, 0), b(103, 0))).toBeGreaterThan(0);
    expect(surfaceRecouverte(b(0, 0), b(120, 0))).toBe(0);
  });
});

describe("placeSansRecouvrir", () => {
  const element = b(200, 100, 120, 20);

  it("sans élément, le premier candidat", () => {
    const c = [b(1, 1), b(2, 2)];
    expect(placeSansRecouvrir(c, null)).toBe(c[0]);
  });

  it("garde le premier candidat quand il ne recouvre pas l'élément (placement inchangé)", () => {
    const c = [b(400, 90), b(0, 90)];
    expect(placeSansRecouvrir(c, element)).toBe(c[0]);
  });

  it("saute un candidat qui recouvre l'élément pour le premier qui n'en recouvre pas", () => {
    const c = [b(250, 90), b(0, 90), b(400, 90)];
    expect(placeSansRecouvrir(c, element)).toBe(c[1]);
  });

  it("si tous recouvrent l'élément, prend celui qui en recouvre le moins", () => {
    const grand = b(150, 100, 300, 20);
    const c = [b(200, 100, 100, 20), b(400, 100, 100, 20), b(160, 100, 100, 20)];
    expect(placeSansRecouvrir(c, grand)).toBe(c[1]);
  });

  it("le cas mesuré : élément près du bord droit, la boîte à gauche de LIA le recouvre, celle en dessous non", () => {
    const el = { x: 773, y: 133, w: 116, h: 20 };
    const gauche = { x: 546, y: 70, w: 340, h: 154 };
    const dessous = { x: 652, y: 216, w: 340, h: 154 };
    expect(placeSansRecouvrir([gauche, dessous], el)).toBe(dessous);
  });

  it("une liste vide est une erreur claire", () => {
    expect(() => placeSansRecouvrir([], null)).toThrow("aucun candidat");
  });
});
