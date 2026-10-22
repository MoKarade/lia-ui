import type { HumeurLia } from "./types.js";

/** Générateur de hasard injecté (tests déterministes) : renvoie un nombre dans [0, 1[. */
export type Hasard = () => number;

export type Decision =
  | { type: "attendre"; duree: number }
  | { type: "errer"; u: number; v: number; duree: number; etat: string }
  | { type: "suivre"; duree: number }
  | { type: "voir"; rang: number; duree: number }
  | { type: "humeur"; humeur: HumeurLia };

/** Ce que LIA peut faire en ce moment : suivre le curseur (bougé récemment) ou aller voir un des éléments désignés. */
export interface ContexteVie {
  curseurRecent: boolean;
  cibles: number;
}

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
 * Sans `contexte`, seul le hasard décide (errer, attendre, humeur) ; avec lui, une part de l'errance
 * devient « suivre le curseur » ou « aller voir un élément » quand c'est possible. `rang` est un tirage
 * dans [0, 1[ que l'appelant convertit en rang parmi les éléments qu'il connaît.
 */
export function prochaineDecision(hasard: Hasard, contexte?: ContexteVie): Decision {
  const r = hasard();
  if (r < 0.35) return { type: "attendre", duree: 3 + hasard() * 3 };
  if (r < 0.85) {
    if (contexte) {
      const s = hasard();
      if (s < 0.3 && contexte.curseurRecent) return { type: "suivre", duree: 6 + hasard() * 5 };
      if (s < 0.55 && contexte.cibles > 0) return { type: "voir", rang: hasard(), duree: 8 + hasard() * 6 };
    }
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
