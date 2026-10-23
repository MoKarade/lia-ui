import type { HumeurLia } from "./types.js";

/**
 * Les gestes que Marc peut lui demander dans le menu de son corps (maquette v5, `maison.js`) : une
 * silhouette de son moteur, tenue quelques secondes, puis elle reprend sa vie. Pas de phrase écrite ici :
 * ce qu'elle dit vient toujours de l'hôte. Les tracés sont des chemins SVG 24 × 24 (trait de 1,8).
 */
export const GESTES = [
  { id: "salue", etat: "salue", libelle: "Salue", icone: "M15.5 8a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0zM5 20a7 7 0 0 1 14 0" },
  { id: "content", etat: "content", libelle: "Content", icone: "M12 4l2.4 5 5.6.8-4 4 1 5.5L12 16.5 7 19.3l1-5.5-4-4L9.6 9z" },
  { id: "musique", etat: "musique", libelle: "Fredonne", icone: "M12 3q1 7 8 9-7 2-8 9-1-7-8-9 7-2 8-9z" },
  { id: "remercie", etat: "remercie", libelle: "Merci", icone: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" },
  { id: "surpris", etat: "surpris", libelle: "Surpris", icone: "M13 3L5 13h6l-1 8 8-10h-6z" },
  {
    id: "concentre",
    etat: "concentre",
    libelle: "Se concentre",
    icone: "M20.5 12a8.5 8.5 0 1 0-17 0 8.5 8.5 0 0 0 17 0zM16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM12.8 12a.8.8 0 1 0-1.6 0 .8.8 0 0 0 1.6 0z",
  },
  { id: "apprend", etat: "apprend", libelle: "Apprend", icone: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11v2h6v-2a6 6 0 0 0-3-11z" },
  { id: "veille", etat: "veille", libelle: "Dort", icone: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" },
] as const;

export type GesteLia = (typeof GESTES)[number]["id"];

/** Combien de secondes un geste dure quand on ne le précise pas. */
export const DUREE_GESTE = 3;
const DUREE_GESTE_MAX = 30;

export function trouverGeste(id: string): (typeof GESTES)[number] | undefined {
  return GESTES.find((g) => g.id === id);
}

/** Une durée valable : défaut 3 s, jamais négative ni au-delà de 30 s. */
export function dureeGeste(secondes: number | undefined): number {
  if (secondes === undefined || !Number.isFinite(secondes) || secondes <= 0) return DUREE_GESTE;
  return Math.min(secondes, DUREE_GESTE_MAX);
}

/** Les humeurs proposées dans le menu (celles qu'elle choisit aussi d'elle-même), au féminin comme elle. */
export const HUMEURS_MENU: ReadonlyArray<{ id: HumeurLia; libelle: string }> = [
  { id: "curieux", libelle: "Curieuse" },
  { id: "calme", libelle: "Calme" },
  { id: "joyeux", libelle: "Joyeuse" },
  { id: "concentre", libelle: "Concentrée" },
  { id: "espiegle", libelle: "Espiègle" },
  { id: "fatigue", libelle: "Fatiguée" },
];
