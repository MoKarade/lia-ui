/**
 * Le perchoir : se poser sur le bord supérieur d'une carte de la page. Fonctions pures : les rectangles, la zone et la position de
 * départ sont fournis par l'appelant, dans le même repère (celui de sa zone de vie) ; aucun DOM, aucun hasard, aucune horloge.
 *
 * Le « point d'appui » est sur le bord haut de la carte ; le centre de son corps, posée, est une marge plus haut (la même marge
 * de 0,6 rayon que celle qui la tient au-dessus du sol de sa zone).
 */
import { avancerBalle, vitessePourBond, type Corps, type Impact, type ParamsBalle, type Zone } from "./physique.js";

export interface RectCarte {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ParamsPerchoir extends ParamsBalle {
  /** Son rayon : une carte plus étroite que `largeurMin` (par défaut 3,2 rayons) ne la porte pas. */
  rayon: number;
  largeurMin?: number;
  /** px/s : au-delà, le bond est hors de portée (par défaut 2 600). */
  vitesseMax?: number;
  /** Tirage dans [0, 1[ entre les perchoirs possibles (le hasard est fourni par l'appelant) ; par défaut, le plus proche. */
  choix?: number;
}

export interface Perchoir {
  /** Rang de la carte dans la liste fournie. */
  index: number;
  /** Le point d'appui, sur le bord haut de la carte. */
  appui: { x: number; y: number };
  /** Où est le centre de son corps, posée (une marge au-dessus de l'appui). */
  but: { x: number; y: number };
  /** Durée du vol, en secondes. */
  duree: number;
  /** Vitesse de départ du bond. */
  vx: number;
  vy: number;
  /** Le point le plus haut de l'arc (y le plus petit). */
  sommet: number;
  /** Vitesse verticale à l'arrivée, vers le bas (px/s) : elle retombe sur la carte, elle ne la frôle pas en montant. */
  arrivee: number;
}

/** La surface d'atterrissage d'une carte : la hauteur de son centre posée, et l'étendue où elle peut se tenir. */
export interface Surface {
  y: number;
  gauche: number;
  droite: number;
}

export const LARGEUR_MIN_RAYONS = 3.2;
export const VITESSE_BOND_MAX = 2600;
/** Une carte qui bouge de plus que cela dans la page (hors défilement) : elle redescend. */
export const DEPLACEMENT_MAX = 40;
/** Au-dessous de cette vitesse d'arrivée (px/s), ce n'est plus une retombée. */
const ARRIVEE_MIN = 150;
const SEUIL_REBOND = 60;

/** La surface où se poser sur cette carte : son bord haut, et le centre du corps reste à une marge de chaque bout. */
export function surfaceDeCarte(carte: Readonly<RectCarte>, marge: number): Surface {
  return { y: carte.top - marge, gauche: carte.left + marge, droite: carte.right - marge };
}

interface Trajet {
  vx: number;
  vy: number;
  sommet: number;
  arrivee: number;
}

/** Le bond de `depart` à `but` en `duree` secondes, simulé sans bords : sa vitesse de départ, son sommet et sa vitesse d'arrivée. */
function trajet(depart: Readonly<{ x: number; y: number }>, but: Readonly<{ x: number; y: number }>, duree: number, p: ParamsBalle): Trajet {
  const v = vitessePourBond(depart, but, duree, p);
  const libre: Zone = { x: -1e7, y: -1e7, w: 2e7, h: 2e7 };
  const sans = { ...p, marge: 0 };
  const c: Corps = { x: depart.x, y: depart.y, vx: v.vx, vy: v.vy };
  let sommet = c.y;
  const pas = 0.008;
  for (let t = 0; t < duree - 1e-9; t += pas) {
    avancerBalle(c, Math.min(pas, duree - t), libre, sans);
    sommet = Math.min(sommet, c.y);
  }
  return { vx: v.vx, vy: v.vy, sommet, arrivee: c.vy };
}

/** Les durées essayées pour un même bond, de la plus courte à la plus longue : une carte haute demande un vol plus long. */
const ALLONGEMENTS = [0, 0.15, 0.3, 0.45];

/**
 * Sur quelle carte, et comment, peut-elle se poser ? Refuse une carte trop étroite, hors de la zone, plus bas que le sol de sa zone,
 * trop proche de là où elle est, ou hors de portée du bond (vitesse de départ de 2 600 px/s au plus, sommet de l'arc dans la zone,
 * arrivée vers le bas). Rend `null` si aucune ne convient.
 */
export function choisirPerchoir(zone: Readonly<Zone>, cartes: ReadonlyArray<Readonly<RectCarte>>, depart: Readonly<{ x: number; y: number }>, params: Readonly<ParamsPerchoir>): Perchoir | null {
  const marge = params.marge;
  const largeurMin = params.largeurMin ?? params.rayon * LARGEUR_MIN_RAYONS;
  const vitesseMax = params.vitesseMax ?? VITESSE_BOND_MAX;
  const minX = zone.x + marge;
  const maxX = zone.x + zone.w - marge;
  const hautMin = zone.y + marge;
  const sol = zone.y + zone.h - marge;
  const physique: ParamsBalle = { gravite: params.gravite, frottement: params.frottement, restitutionSol: params.restitutionSol, restitutionMur: params.restitutionMur, marge };
  const possibles: Perchoir[] = [];
  cartes.forEach((carte, index) => {
    if (![carte.left, carte.top, carte.right, carte.bottom].every(Number.isFinite)) return;
    if (carte.right - carte.left < largeurMin || carte.bottom <= carte.top) return;
    const s = surfaceDeCarte(carte, marge);
    // Son centre, posée, doit être dans la zone : un bord haut hors de l'écran, ou plus bas que le sol de la zone, ne porte personne.
    if (s.y < hautMin || s.y > sol) return;
    const gauche = Math.max(s.gauche, minX);
    const droite = Math.min(s.droite, maxX);
    if (droite <= gauche) return;
    // Elle vise le point du bord le plus proche d'elle : le saut le plus court.
    const but = { x: Math.min(droite, Math.max(gauche, depart.x)), y: s.y };
    const d = Math.hypot(but.x - depart.x, but.y - depart.y);
    if (d < params.rayon * 2.5) return;
    const base = Math.min(1, Math.max(0.6, 0.55 + d / 1500));
    for (const plus of ALLONGEMENTS) {
      const duree = base + plus;
      const tr = trajet(depart, but, duree, physique);
      if (Math.hypot(tr.vx, tr.vy) >= vitesseMax) continue;
      if (tr.sommet < hautMin) continue;
      if (tr.arrivee < ARRIVEE_MIN) continue;
      possibles.push({ index, appui: { x: but.x, y: carte.top }, but, duree, vx: tr.vx, vy: tr.vy, sommet: tr.sommet, arrivee: tr.arrivee });
      break;
    }
  });
  if (possibles.length === 0) return null;
  possibles.sort((a, b) => Math.hypot(a.but.x - depart.x, a.but.y - depart.y) - Math.hypot(b.but.x - depart.x, b.but.y - depart.y));
  const u = Number.isFinite(params.choix) ? Math.min(0.999999, Math.max(0, params.choix ?? 0)) : 0;
  return possibles[Math.floor(u * possibles.length)] ?? null;
}

/**
 * L'atterrissage : un sens unique, on traverse le bord par en dessous mais on se pose dessus par en haut. `yAvant` est la hauteur
 * avant le pas. Si le corps vient de franchir la surface en tombant, au-dessus de la carte, on le pose dessus : rebond amorti (la
 * restitution du sol), élan horizontal presque absorbé. Rend l'impact (sa vitesse normale), ou `null` s'il n'y a pas eu de contact.
 * Modifie `c`.
 */
export function atterrir(c: Corps, yAvant: number, surface: Readonly<Surface>, p: Readonly<ParamsBalle>): Impact | null {
  if (c.x < surface.gauche - 1 || c.x > surface.droite + 1) return null;
  if (yAvant > surface.y + 0.001 || c.y < surface.y || c.vy <= 0) return null;
  const vitesse = c.vy;
  c.y = surface.y;
  c.vy = vitesse < SEUIL_REBOND ? 0 : -vitesse * p.restitutionSol;
  c.vx *= 0.2;
  return { cote: "bas", vitesse };
}

/** Posée sur la surface : plus d'élan notable, et à sa hauteur. */
export function poseeSurSurface(c: Readonly<Corps>, surface: Readonly<Surface>): boolean {
  return Math.hypot(c.vx, c.vy) < 25 && Math.abs(c.y - surface.y) < 1.5;
}

/**
 * La carte porte-t-elle encore ? Faux quand elle disparaît (dimensions nulles, hors de la fenêtre), devient trop étroite, sort de la zone,
 * ou bouge de plus de 40 px dans la PAGE. Le défilement ne compte pas : `page` est la position de la carte dans la page (position à l'écran
 * plus le défilement), comparée à celle qu'elle avait quand elle l'a choisie.
 */
export function carteToujoursPerchable(
  carte: Readonly<RectCarte>,
  page: Readonly<{ x: number; y: number }>,
  reference: Readonly<{ x: number; y: number }>,
  zone: Readonly<Zone>,
  params: Readonly<Pick<ParamsPerchoir, "marge" | "rayon" | "largeurMin">>,
): boolean {
  if (![carte.left, carte.top, carte.right, carte.bottom, page.x, page.y].every(Number.isFinite)) return false;
  if (carte.right <= carte.left || carte.bottom <= carte.top) return false;
  if (carte.right - carte.left < (params.largeurMin ?? params.rayon * LARGEUR_MIN_RAYONS)) return false;
  if (Math.hypot(page.x - reference.x, page.y - reference.y) > DEPLACEMENT_MAX) return false;
  const s = surfaceDeCarte(carte, params.marge);
  if (s.y < zone.y + params.marge || s.y > zone.y + zone.h - params.marge) return false;
  return Math.min(s.droite, zone.x + zone.w - params.marge) > Math.max(s.gauche, zone.x + params.marge);
}
