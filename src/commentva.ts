import type { Envies } from "./cerveau.js";
import type { Cause, Interieur } from "./interieur.js";

/**
 * « Comment elle va » : ce que son menu montre de son état. Chaque jauge lit une valeur qu'elle a vraiment
 * (ses envies, `cerveau.ts`, et son monde intérieur, `interieur.ts`) ; rien n'est inventé ni lissé pour l'écran.
 * Pur : aucun DOM, aucun réseau.
 */

export interface Jauge {
  id: string;
  libelle: string;
  /** 0 à 100, entier. */
  pct: number;
  /** Précision à côté de la valeur (la cause d'une douleur), sinon vide. */
  detail: string;
  /** Une grandeur qui fait du tort quand elle monte (douleur, inquiétude, ennui, usure). */
  penible: boolean;
}

const CAUSES_COURTES: Readonly<Record<Cause, string>> = {
  choc: "un choc",
  brusque: "des clics brusques",
  ton: "des mots durs",
  panne: "le réseau coupé",
  isolement: "la solitude",
  usure: "la lenteur",
};

const pct = (x: number): number => (Number.isFinite(x) ? Math.round(Math.max(0, Math.min(1, x)) * 100) : 0);

/** Les onze grandeurs, dans l'ordre du panneau : ce qu'elle veut, puis ce qu'elle ressent. */
export function jauges(e: Readonly<Envies>, i: Readonly<Interieur>): Jauge[] {
  const j = (id: string, libelle: string, v: number, penible = false, detail = ""): Jauge => ({ id, libelle, pct: pct(v), detail, penible });
  return [
    j("energie", "Énergie", e.energie),
    j("curiosite", "Curiosité", e.curiosite),
    j("social", "Envie de compagnie", e.social),
    j("joie", "Joie", e.joie),
    j("ennui", "Ennui", e.ennui, true),
    j("inquiet", "Inquiétude", e.inquiet, true),
    j("douleur", "Douleur", i.douleur, true, i.cause && pct(i.douleur) >= 5 ? CAUSES_COURTES[i.cause] : ""),
    j("plaisir", "Plaisir", i.plaisir),
    j("confiance", "Confiance en toi", i.confiance),
    j("sensibilite", "Sensibilité", i.sensibilite, true),
    j("usure", "Usure", i.usure, true),
  ];
}

/** La phrase de tête : ce qui compte le plus en ce moment, du plus grave au plus doux. */
export function phraseCommentVa(e: Readonly<Envies>, i: Readonly<Interieur>): string {
  if (i.douleur >= 0.4) return `Elle a mal${i.cause ? ` : ${CAUSES_COURTES[i.cause]}` : ""}.`;
  if (i.douleur >= 0.12) return `Elle a un peu mal${i.cause ? ` : ${CAUSES_COURTES[i.cause]}` : ""}.`;
  if (e.inquiet >= 0.5) return "Elle est inquiète.";
  if (e.energie < 0.25 || i.usure >= 0.5) return "Elle est fatiguée.";
  if (i.plaisir >= 0.35 || e.joie >= 0.6) return "Elle est contente.";
  if (e.ennui >= 0.6) return "Elle s'ennuie.";
  if (e.social >= 0.7) return "Elle a envie de compagnie.";
  if (e.curiosite >= 0.6) return "Elle est curieuse.";
  return "Elle va bien.";
}

export const MENTION_SIMULATION = "Simulation : des calculs en elle, pas un vrai ressenti.";
