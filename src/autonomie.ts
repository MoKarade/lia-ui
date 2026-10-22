import type { HumeurLia } from "./types.js";

/** Générateur de hasard injecté (tests déterministes) : renvoie un nombre dans [0, 1[. */
export type Hasard = () => number;

export type Decision =
  | { type: "attendre"; duree: number }
  | { type: "errer"; u: number; v: number; duree: number; etat: string }
  | { type: "suivre"; duree: number }
  | { type: "voir"; rang: number; duree: number }
  | { type: "parler"; motif: "salut" | "rien" }
  | { type: "relance" }
  | { type: "humeur"; humeur: HumeurLia };

/** Ce que LIA peut faire en ce moment : suivre le curseur (bougé récemment) ou aller voir un des éléments désignés. */
export interface ContexteVie {
  curseurRecent: boolean;
  cibles: number;
  /** Vrai quand l'hôte sait quoi lui faire dire (`onSpontane`) et que l'heure le permet. Sinon elle se tait. */
  parole?: boolean;
  /** Vrai tant que le plafond de relances du jour n'est pas atteint. */
  relance?: boolean;
}

const ETATS_ERRANCE = ["repos", "musique", "content", "repos", "surpris"] as const;
const HUMEURS_DERIVE: readonly HumeurLia[] = ["curieux", "calme", "joyeux", "concentre", "espiegle", "fatigue"];

const HUMEURS_ECHEANCE: readonly HumeurLia[] = ["curieux", "calme", "joyeux", "concentre", "espiegle"];
/** Toutes les 40 s, une fois sur trois environ, son humeur dérive d'elle-même (maquette, maison.js). */
export const PERIODE_DERIVE_HUMEUR_MS = 40_000;
export const CHANCE_DERIVE_HUMEUR = 0.35;

/** L'humeur vers laquelle elle dérive, ou `null` ce coup-ci. */
export function deriveHumeur(hasard: Hasard): HumeurLia | null {
  return hasard() < CHANCE_DERIVE_HUMEUR ? choisir(HUMEURS_ECHEANCE, hasard) : null;
}

/** Vrai si `heure` (0..23, locale) tombe dans [debut, fin[, en passant minuit si debut > fin (22 → 7). */
export function enSilence(heure: number, [debut, fin]: readonly [number, number]): boolean {
  if (debut === fin) return false;
  return debut < fin ? heure >= debut && heure < fin : heure >= debut || heure < fin;
}

/** Date locale AAAA-MM-JJ : clé du compteur de relances du jour. */
export function jourLocal(d: Date): string {
  const deux = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
}

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
  if (contexte) return decisionMaquette(hasard, contexte);
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

const SALUT_SUR_PAROLE = 0.2;
/** Part des tirages où, curseur bougé récemment, elle vient le suivre (propriété de l'accueil v2, absente de la maquette v5). */
const PART_SUIVRE = 0.35;

/**
 * Sa tirette de décisions, reprise de `penser()` de la maquette validée (maison.js) : 28 % rester,
 * 18 % errer, 22 % parler, 18 % aller voir un élément, 7 % changer d'humeur, 7 % relance.
 * Ce qu'elle ne peut pas faire (se taire si l'hôte n'a rien à dire, rien à voir, plafond de relances)
 * devient « rester » : jamais de phrase inventée ici.
 */
function decisionMaquette(hasard: Hasard, contexte: ContexteVie): Decision {
  if (contexte.curseurRecent && hasard() < PART_SUIVRE) return { type: "suivre", duree: 6 + hasard() * 5 };
  const r = hasard();
  const rester: Decision = { type: "attendre", duree: 3 };
  if (r < 0.28) return rester;
  if (r < 0.46) {
    return {
      type: "errer",
      u: hasard(),
      v: hasard(),
      duree: 4 + hasard() * 3,
      etat: choisir(ETATS_ERRANCE, hasard),
    };
  }
  if (r < 0.68) {
    if (!contexte.parole) return rester;
    return { type: "parler", motif: hasard() < SALUT_SUR_PAROLE ? "salut" : "rien" };
  }
  if (r < 0.86) {
    if (contexte.cibles <= 0) return rester;
    return { type: "voir", rang: hasard(), duree: 6.5 };
  }
  if (r < 0.93) return { type: "humeur", humeur: choisir(HUMEURS_DERIVE, hasard) };
  return contexte.parole && contexte.relance ? { type: "relance" } : rester;
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
