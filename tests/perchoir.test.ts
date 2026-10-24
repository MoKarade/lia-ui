import { describe, expect, it } from "vitest";
import { avancerBalle, BALLE_DEFAUT, type Corps, type ParamsBalle } from "../src/physique.js";
import { atterrir, carteToujoursPerchable, choisirPerchoir, poseeSurSurface, surfaceDeCarte, type ParamsPerchoir, type RectCarte } from "../src/perchoir.js";

const zone = { x: 0, y: 0, w: 1200, h: 800 };
const rayon = 56;
const marge = rayon * 0.6;
const params: ParamsPerchoir = { ...BALLE_DEFAUT, marge, rayon };
const phys: ParamsBalle = { ...BALLE_DEFAUT, marge };
const depart = { x: 1100, y: 740 };
/** Une carte large, à 350 px de haut : à portée d'un bond. */
const carte: RectCarte = { left: 300, top: 350, right: 700, bottom: 520 };

describe("choisirPerchoir : où peut-elle se poser ?", () => {
  it("une carte valide rend un point d'appui sur son bord haut, dans son étendue", () => {
    const p = choisirPerchoir(zone, [carte], depart, params);
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.index).toBe(0);
    expect(p.appui.y).toBe(carte.top);
    expect(p.appui.x).toBeGreaterThanOrEqual(carte.left);
    expect(p.appui.x).toBeLessThanOrEqual(carte.right);
    // Son centre, posée, est une marge au-dessus du bord.
    expect(p.but.y).toBeCloseTo(carte.top - marge, 6);
    expect(p.but.x).toBe(p.appui.x);
    // Elle vise le point du bord le plus proche d'elle (elle vient de la droite).
    expect(p.but.x).toBeCloseTo(carte.right - marge, 6);
    expect(p.duree).toBeGreaterThanOrEqual(0.6);
    expect(Math.hypot(p.vx, p.vy)).toBeLessThan(2600);
    expect(p.sommet).toBeGreaterThanOrEqual(zone.y + marge);
    expect(p.arrivee).toBeGreaterThan(0);
  });

  it("le bond rendu arrive vraiment sur le point d'appui, en retombant (simulation avec les mêmes bords)", () => {
    const p = choisirPerchoir(zone, [carte], depart, params);
    expect(p).not.toBeNull();
    if (!p) return;
    const c: Corps = { x: depart.x, y: depart.y, vx: p.vx, vy: p.vy };
    let plusHaut = c.y;
    for (let t = 0; t < p.duree - 1e-9; t += 0.016) {
      avancerBalle(c, Math.min(0.016, p.duree - t), zone, phys);
      plusHaut = Math.min(plusHaut, c.y);
    }
    expect(Math.abs(c.x - p.but.x)).toBeLessThan(6);
    expect(Math.abs(c.y - p.but.y)).toBeLessThan(6);
    expect(c.vy).toBeGreaterThan(0);
    expect(plusHaut).toBeGreaterThanOrEqual(zone.y + marge - 1e-6);
  });

  it("refuse une carte trop étroite", () => {
    const etroite: RectCarte = { left: 300, top: 350, right: 300 + rayon * 3, bottom: 520 };
    expect(choisirPerchoir(zone, [etroite], depart, params)).toBeNull();
    // À peine assez large : acceptée (le seuil est de 3,2 rayons).
    const juste: RectCarte = { left: 300, top: 350, right: 300 + rayon * 3.2, bottom: 520 };
    expect(choisirPerchoir(zone, [juste], depart, params)).not.toBeNull();
  });

  it("refuse une carte hors écran (au-dessus, ou entièrement à côté de la zone)", () => {
    const dessus: RectCarte = { left: 300, top: -200, right: 700, bottom: -20 };
    const aCheval: RectCarte = { left: 300, top: -40, right: 700, bottom: 200 };
    const aCote: RectCarte = { left: 1300, top: 350, right: 1700, bottom: 520 };
    expect(choisirPerchoir(zone, [dessus], depart, params)).toBeNull();
    // Son bord haut est hors de l'écran : elle ne s'y poserait pas.
    expect(choisirPerchoir(zone, [aCheval], depart, params)).toBeNull();
    expect(choisirPerchoir(zone, [aCote], depart, params)).toBeNull();
  });

  it("refuse une carte plus bas que le sol de sa zone", () => {
    const sous: RectCarte = { left: 300, top: 830, right: 700, bottom: 900 };
    expect(choisirPerchoir(zone, [sous], { x: 900, y: 300 }, params)).toBeNull();
  });

  it("refuse une carte trop haute : hors de portée du bond (vitesse ou sommet)", () => {
    // Le bord haut est à 70 px du haut de l'écran, alors qu'elle part du sol : l'arc sortirait de l'écran ou dépasserait 2 600 px/s.
    const haute: RectCarte = { left: 300, top: 70, right: 700, bottom: 200 };
    expect(choisirPerchoir(zone, [haute], depart, params)).toBeNull();
    // Une limite de vitesse très basse refuse aussi la carte valide.
    expect(choisirPerchoir(zone, [carte], depart, { ...params, vitesseMax: 500 })).toBeNull();
  });

  it("refuse une carte trop proche d'elle (elle y est déjà)", () => {
    expect(choisirPerchoir(zone, [carte], { x: 500, y: carte.top - marge + 10 }, params)).toBeNull();
  });

  it("une liste vide, ou des rectangles non finis, ne donnent rien (sans lever)", () => {
    expect(choisirPerchoir(zone, [], depart, params)).toBeNull();
    expect(choisirPerchoir(zone, [{ left: Number.NaN, top: 350, right: 700, bottom: 520 }], depart, params)).toBeNull();
  });

  it("parmi plusieurs cartes, ne garde que celles qui conviennent ; le tirage choisit entre elles", () => {
    const etroite: RectCarte = { left: 100, top: 350, right: 140, bottom: 520 };
    const autre: RectCarte = { left: 750, top: 450, right: 1100, bottom: 600 };
    const cartes = [etroite, carte, autre];
    const premiere = choisirPerchoir(zone, cartes, depart, { ...params, choix: 0 });
    const derniere = choisirPerchoir(zone, cartes, depart, { ...params, choix: 0.999 });
    expect(premiere).not.toBeNull();
    expect(derniere).not.toBeNull();
    expect(premiere?.index).not.toBe(0);
    expect(derniere?.index).not.toBe(0);
    expect(new Set([premiere?.index, derniere?.index]).size).toBe(2);
  });

  it("est déterministe", () => {
    expect(choisirPerchoir(zone, [carte], depart, params)).toEqual(choisirPerchoir(zone, [carte], depart, params));
  });
});

describe("atterrir : un sens unique, sur le bord haut", () => {
  const surface = surfaceDeCarte(carte, marge);

  it("le bord de la carte est à une marge sous le centre posé, avec une marge de chaque côté", () => {
    expect(surface).toEqual({ y: carte.top - marge, gauche: carte.left + marge, droite: carte.right - marge });
  });

  it("retombant sur la carte, elle est posée sur le bord, rebondit amorti et perd son élan horizontal", () => {
    const c: Corps = { x: 500, y: surface.y + 4, vx: 300, vy: 800 };
    const imp = atterrir(c, surface.y - 6, surface, phys);
    expect(imp).toEqual({ cote: "bas", vitesse: 800 });
    expect(c.y).toBe(surface.y);
    expect(c.vy).toBeCloseTo(-800 * BALLE_DEFAUT.restitutionSol, 6);
    expect(c.vx).toBeCloseTo(60, 6);
  });

  it("une retombée très lente ne rebondit plus", () => {
    const c: Corps = { x: 500, y: surface.y + 0.2, vx: 0, vy: 30 };
    expect(atterrir(c, surface.y, surface, phys)?.vitesse).toBe(30);
    expect(c.vy).toBe(0);
  });

  it("montant, elle traverse le bord par en dessous : pas de contact", () => {
    const c: Corps = { x: 500, y: surface.y - 3, vx: 0, vy: -900 };
    expect(atterrir(c, surface.y + 10, surface, phys)).toBeNull();
    expect(c.y).toBe(surface.y - 3);
  });

  it("à côté de la carte, elle ne se pose pas dessus", () => {
    const c: Corps = { x: 900, y: surface.y + 4, vx: 0, vy: 800 };
    expect(atterrir(c, surface.y - 6, surface, phys)).toBeNull();
    expect(c.y).toBe(surface.y + 4);
  });

  it("encore au-dessus du bord : pas de contact", () => {
    const c: Corps = { x: 500, y: surface.y - 20, vx: 0, vy: 800 };
    expect(atterrir(c, surface.y - 30, surface, phys)).toBeNull();
  });

  it("une chute simulée image par image finit posée sur la carte, sans jamais la traverser ni en sortir", () => {
    const c: Corps = { x: 520, y: 150, vx: 200, vy: 0 };
    let posee = false;
    let atterri = false;
    for (let i = 0; i < 300 && !posee; i++) {
      const avant = c.y;
      avancerBalle(c, 1 / 60, zone, phys);
      if (atterrir(c, avant, surface, phys)) atterri = true;
      if (atterri) {
        expect(c.y).toBeLessThanOrEqual(surface.y + 1e-6);
        expect(c.x).toBeGreaterThanOrEqual(carte.left);
        expect(c.x).toBeLessThanOrEqual(carte.right);
        posee = poseeSurSurface(c, surface);
      }
    }
    expect(atterri).toBe(true);
    expect(posee).toBe(true);
    expect(Math.abs(c.y - surface.y)).toBeLessThan(1.5);
  });
});

describe("carteToujoursPerchable : quand la carte ne la porte plus", () => {
  const p = { marge, rayon };
  const page = { x: 300, y: 350 };

  it("la même carte, au même endroit de la page, la porte", () => {
    expect(carteToujoursPerchable(carte, page, page, zone, p)).toBe(true);
  });

  it("le défilement ne compte pas : la carte monte à l'écran mais reste en place dans la page", () => {
    const defilee: RectCarte = { left: 300, top: 250, right: 700, bottom: 420 };
    expect(carteToujoursPerchable(defilee, page, page, zone, p)).toBe(true);
  });

  it("une carte qui bouge de plus de 40 px dans la page ne la porte plus ; 40 px au plus, si", () => {
    expect(carteToujoursPerchable(carte, { x: 300, y: 391 }, page, zone, p)).toBe(false);
    expect(carteToujoursPerchable(carte, { x: 300, y: 389 }, page, zone, p)).toBe(true);
    expect(carteToujoursPerchable(carte, { x: 341, y: 350 }, page, zone, p)).toBe(false);
  });

  it("une carte disparue (dimensions nulles), trop étroite, ou dont le bord haut quitte l'écran, ne la porte plus", () => {
    expect(carteToujoursPerchable({ left: 0, top: 0, right: 0, bottom: 0 }, page, page, zone, p)).toBe(false);
    expect(carteToujoursPerchable({ ...carte, right: carte.left + 100 }, page, page, zone, p)).toBe(false);
    expect(carteToujoursPerchable({ ...carte, top: 10, bottom: 180 }, page, page, zone, p)).toBe(false);
    expect(carteToujoursPerchable({ ...carte, top: 900, bottom: 1100 }, page, page, zone, p)).toBe(false);
    expect(carteToujoursPerchable(carte, { x: Number.NaN, y: 350 }, page, zone, p)).toBe(false);
  });
});
