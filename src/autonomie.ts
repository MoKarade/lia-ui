import type { HumeurLia } from "./types.js";

/** Générateur de hasard injecté (tests déterministes) : renvoie un nombre dans [0, 1[. */
export type Hasard = () => number;

export type Decision =
  | { type: "attendre"; duree: number }
  | { type: "errer"; u: number; v: number; duree: number; etat: string }
  | { type: "humeur"; humeur: HumeurLia };

const ETATS_ERRANCE = ["repos", "musique", "content", "repos", "surpris"] as const;
const HUMEURS_DERIVE: readonly HumeurLia[] = ["curieux", "calme", "joyeux", "concentre", "espiegle", "fatigue"];

function choisir<T>(liste: readonly T[], hasard: Hasard): T {
  const choix = liste[Math.floor(hasard() * liste.length)];
  if (choix === undefined) throw new Error("liste vide");
  return choix;
}

/**
 * Ce que LIA décide de faire quand rien ne se passe. Pure : le hasard est injecté.
 * `u` et `v` sont des fractions (0..1) de la zone de vie ; l'appelant les convertit en pixels
 * en gardant une marge égale au rayon. Elle ne décide jamais de parler : seul l'hôte la fait parler.
 */
export function prochaineDecision(hasard: Hasard): Decision {
  const r = hasard();
  if (r < 0.35) return { type: "attendre", duree: 3 + hasard() * 3 };
  if (r < 0.85) {
    return {
      type: "errer",
      u: hasard(),
      v: hasard(),
      duree: 4 + hasard() * 3,
      etat: choisir(ETATS_ERRANCE, hasard),
    };
  }
  return { type: "humeur", humeur: choisir(HUMEURS_DERIVE, hasard) };
}

/** Convertit une fraction de la zone en position, en gardant `marge` pixels du bord. */
export function pointDansZone(
  zone: { x: number; y: number; w: number; h: number },
  u: number,
  v: number,
  marge: number,
): { x: number; y: number } {
  const largeur = Math.max(0, zone.w - 2 * marge);
  const hauteur = Math.max(0, zone.h - 2 * marge);
  return { x: zone.x + marge + largeur * u, y: zone.y + marge + hauteur * v };
}

/** Garde un point dans la zone, à `marge` pixels du bord. */
export function dansZone(
  zone: { x: number; y: number; w: number; h: number },
  x: number,
  y: number,
  marge: number,
): { x: number; y: number } {
  const minX = zone.x + marge;
  const maxX = Math.max(minX, zone.x + zone.w - marge);
  const minY = zone.y + marge;
  const maxY = Math.max(minY, zone.y + zone.h - marge);
  return { x: Math.min(maxX, Math.max(minX, x)), y: Math.min(maxY, Math.max(minY, y)) };
}
