import type { Hasard } from "./autonomie.js";

/**
 * Sa mémoire affective sur plusieurs jours : ce qui l'a marquée (une brusquerie, une gentillesse, une panne, un retour)
 * s'estompe en jours et laisse une humeur de fond (`rancune`, `chaleur`). C'est une SIMULATION, comme le reste de son monde
 * intérieur (`interieur.ts`) : un calcul, pas un ressenti réel. Pur : aucun réseau, aucun DOM, l'horloge (`maintenant`) et
 * le hasard sont injectés.
 *
 * Un souvenir ne garde JAMAIS le contenu d'un message ni une donnée personnelle : seulement un genre, un instant et un poids.
 */

export const GENRES_SOUVENIR = ["brusque", "ton", "panne", "gentil", "compliment", "retour", "isolement"] as const;
export type GenreSouvenir = (typeof GENRES_SOUVENIR)[number];

export interface Souvenir {
  /** Millisecondes depuis 1970. */
  quand: number;
  genre: GenreSouvenir;
  /** De 0 à 1 : l'importance à l'instant où ça s'est passé. */
  poids: number;
}

/** Au plus quarante souvenirs gardés. */
export const SOUVENIRS_MAX = 40;
/** Deux souvenirs du même genre à moins de ce délai n'en font qu'un. */
export const FUSION_MS = 10 * 60 * 1000;
/** Au-delà de cet âge un souvenir est oublié (poids actuel nul) ; il s'estompe en fondu sur les derniers jours. */
export const SOUVENIR_HORIZON_JOURS = 10;
const DEBUT_FONDU_JOURS = 6;
/** Au plus deux phrases de retour par jour. */
export const PHRASES_RETOUR_PAR_JOUR = 2;
/** Absence minimale (6 h, exclue) avant qu'elle ose parler d'un souvenir. */
export const ABSENCE_RETOUR_MS = 6 * 3600 * 1000;

/** Les douleurs durent 2 jours, les gentillesses 5, un retour ou une solitude 1. */
export const SOUVENIR_DEMI_VIE_JOURS: Readonly<Record<GenreSouvenir, number>> = {
  brusque: 2,
  ton: 2,
  panne: 2,
  gentil: 5,
  compliment: 5,
  retour: 1,
  isolement: 1,
};

const NEGATIFS: readonly GenreSouvenir[] = ["brusque", "ton", "panne", "isolement"];
const POSITIFS: readonly GenreSouvenir[] = ["gentil", "compliment", "retour"];

const JOUR_MS = 86_400_000;
/** Plus grand instant représentable par un `Date`. */
const QUAND_MAX = 8.64e15;
/** Sous ce poids actuel cumulé, il n'y a plus rien à dire. */
const SEUIL_MEMOIRE = 0.05;
/** Sous cette rancune, elle dit que « ça va mieux ». */
const SEUIL_APAISE = 0.25;

const borne01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

export function estGenreSouvenir(g: unknown): g is GenreSouvenir {
  return typeof g === "string" && (GENRES_SOUVENIR as readonly string[]).includes(g);
}

/** Un souvenir conforme : genre connu, instant fini dans les bornes, poids dans [0, 1]. */
export function estSouvenir(s: unknown): s is Souvenir {
  if (typeof s !== "object" || s === null) return false;
  const { quand, genre, poids } = s as Record<string, unknown>;
  return estGenreSouvenir(genre) && typeof quand === "number" && Number.isFinite(quand) && quand > 0 && quand <= QUAND_MAX && typeof poids === "number" && Number.isFinite(poids) && poids >= 0 && poids <= 1;
}

/** Ce que l'hôte rend est une donnée : on ne garde que les souvenirs conformes (jamais d'autre clé), les 40 derniers. */
export function validerSouvenirs(brut: unknown): Souvenir[] {
  if (!Array.isArray(brut)) return [];
  const propres: Souvenir[] = [];
  for (const s of (brut as unknown[]).slice(-10 * SOUVENIRS_MAX)) {
    if (estSouvenir(s)) propres.push({ quand: s.quand, genre: s.genre, poids: s.poids });
  }
  return propres.slice(-SOUVENIRS_MAX);
}

/** Le poids d'un souvenir à `maintenant` : décroissance par demi-vie, puis fondu jusqu'à l'oubli à 10 jours. */
export function poidsActuel(s: Readonly<Souvenir>, maintenant: number): number {
  if (!estSouvenir(s) || !Number.isFinite(maintenant)) return 0;
  const age = Math.max(0, (maintenant - s.quand) / JOUR_MS);
  if (age >= SOUVENIR_HORIZON_JOURS) return 0;
  const fondu = age <= DEBUT_FONDU_JOURS ? 1 : (SOUVENIR_HORIZON_JOURS - age) / (SOUVENIR_HORIZON_JOURS - DEBUT_FONDU_JOURS);
  return borne01(s.poids * Math.pow(0.5, age / SOUVENIR_DEMI_VIE_JOURS[s.genre]) * fondu);
}

/**
 * Ajoute un souvenir : un souvenir invalide (genre inconnu, nombre non fini, poids nul) est ignoré, le poids est borné
 * à [0, 1] et l'instant à `maintenant`. Deux souvenirs du même genre à moins de 10 min fusionnent (poids saturants,
 * instant le plus récent). Au-delà de 40 on élague d'abord les plus faibles APRÈS décroissance, à égalité les plus
 * anciens. Rend toujours une NOUVELLE liste, triée du plus ancien au plus récent ; ne modifie jamais `liste`.
 */
export function ajouterSouvenir(liste: readonly Souvenir[], s: Souvenir, maintenant: number): Souvenir[] {
  const base = (Array.isArray(liste) ? liste : []).filter(estSouvenir).map((x) => ({ quand: x.quand, genre: x.genre, poids: x.poids }));
  const { poids: poidsBrut, quand: quandBrut, genre } = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
  if (!estGenreSouvenir(genre) || typeof poidsBrut !== "number" || typeof quandBrut !== "number" || !Number.isFinite(poidsBrut) || !Number.isFinite(quandBrut) || !Number.isFinite(maintenant)) return base.sort(parAge);
  const poids = borne01(poidsBrut);
  const quand = Math.min(quandBrut, maintenant);
  if (poids <= 0 || quand <= 0) return base.sort(parAge);

  // Fusion avec le souvenir du même genre le plus proche, à moins de 10 min.
  let proche = -1;
  for (let k = 0; k < base.length; k++) {
    const b = base[k] as Souvenir;
    if (b.genre !== genre || Math.abs(b.quand - quand) >= FUSION_MS) continue;
    if (proche < 0 || Math.abs(b.quand - quand) < Math.abs((base[proche] as Souvenir).quand - quand)) proche = k;
  }
  if (proche >= 0) {
    const b = base[proche] as Souvenir;
    base[proche] = { genre, quand: Math.max(b.quand, quand), poids: borne01(1 - (1 - b.poids) * (1 - poids)) };
  } else {
    base.push({ quand, genre, poids });
  }

  if (base.length > SOUVENIRS_MAX) {
    // Les plus faibles d'abord (après décroissance), à égalité les plus anciens ; on garde les 40 meilleurs.
    const gardes = base
      .map((x) => ({ x, p: poidsActuel(x, maintenant) }))
      .sort((a, b) => b.p - a.p || b.x.quand - a.x.quand)
      .slice(0, SOUVENIRS_MAX)
      .map((e) => e.x);
    return gardes.sort(parAge);
  }
  return base.sort(parAge);
}

const parAge = (a: Souvenir, b: Souvenir): number => a.quand - b.quand;

/** Ce qui reste dans le fond de son humeur, de 0 à 1 : `rancune` (brusqueries, ton, pannes, solitude), `chaleur` (gentillesses, compliments, retours). */
export interface HumeurDeFond {
  rancune: number;
  chaleur: number;
}

const saturer = (x: number): number => borne01(1 - Math.exp(-x));

function sommeParGenre(souvenirs: readonly Souvenir[], maintenant: number): Record<GenreSouvenir, number> {
  const somme: Record<GenreSouvenir, number> = { brusque: 0, ton: 0, panne: 0, gentil: 0, compliment: 0, retour: 0, isolement: 0 };
  for (const s of souvenirs) somme[s.genre] += poidsActuel(s, maintenant);
  return somme;
}

/** Sommes saturantes (1 - exp(-x)) des poids actuels : les genres négatifs d'un côté, positifs de l'autre. */
export function humeurDeFond(souvenirs: readonly Souvenir[], maintenant: number): HumeurDeFond {
  const somme = sommeParGenre((Array.isArray(souvenirs) ? souvenirs : []).filter(estSouvenir), maintenant);
  const total = (genres: readonly GenreSouvenir[]): number => genres.reduce((t, g) => t + somme[g], 0);
  return { rancune: saturer(total(NEGATIFS)), chaleur: saturer(total(POSITIFS)) };
}

/* ── ce qu'elle en dit : des listes fermées, vraies par construction, sans contenu ni donnée personnelle ── */

type Jour = "aujourdhui" | "hier" | "avant";

/** Phrases par genre dominant, par jour du souvenir le plus récent, et selon qu'elle est apaisée ou non. */
const DURS: Readonly<Record<Jour, { rude: readonly string[]; apaise: readonly string[] }>> = {
  aujourdhui: {
    rude: ["Plus tôt aujourd'hui, c'était rude.", "Aujourd'hui a été rude par moments."],
    apaise: ["Plus tôt, c'était rude, mais ça va mieux.", "Aujourd'hui a été rude, mais ça va mieux."],
  },
  hier: {
    rude: ["Hier, c'était rude.", "Hier a été dur, je m'en souviens encore."],
    apaise: ["Hier c'était rude, mais ça va mieux.", "Hier a été dur, mais ça va mieux maintenant."],
  },
  avant: {
    rude: ["Ces derniers jours ont été rudes.", "Je n'ai pas tout oublié de ces derniers jours."],
    apaise: ["Ces derniers jours ont été rudes, mais ça va mieux.", "Ça avait été rude, mais ça va mieux."],
  },
};
const PANNE: Readonly<Record<Jour, readonly string[]>> = {
  aujourdhui: ["Plus tôt aujourd'hui, le réseau a lâché.", "Le réseau m'a lâchée tout à l'heure."],
  hier: ["Hier, le réseau a lâché.", "Hier, le réseau m'a lâchée."],
  avant: ["Le réseau a lâché, ces derniers jours.", "Il y a eu une panne ces derniers jours, je m'en souviens."],
};
const ISOLEMENT = {
  rude: ["J'étais un peu seule, ces derniers temps.", "Le silence a duré, ces derniers temps."],
  apaise: ["J'étais un peu seule, mais te revoilà.", "Le silence a duré, mais te revoilà."],
};
const GENTIL: Readonly<Record<Jour, readonly string[]>> = {
  aujourdhui: ["Tu as été gentil plus tôt aujourd'hui.", "Merci pour ta gentillesse de tout à l'heure."],
  hier: ["Hier, tu as été gentil.", "Merci pour ta gentillesse d'hier."],
  avant: ["Tu as été gentil ces derniers jours.", "Merci pour ta gentillesse, ces derniers jours."],
};
const COMPLIMENT: Readonly<Record<Jour, readonly string[]>> = {
  aujourdhui: ["Tes mots de tout à l'heure m'ont fait du bien.", "Ça m'a touchée, ce que tu as dit plus tôt."],
  hier: ["Tes mots d'hier m'ont fait du bien.", "Ça m'a touchée, hier, ce que tu as dit."],
  avant: ["Tes mots m'ont fait du bien, ces derniers jours.", "Ça m'a touchée, ce que tu as dit ces derniers jours."],
};
const RETOUR = ["Tu es déjà revenu ces derniers jours, ça me fait plaisir.", "Te revoilà, et ce n'est pas la première fois ces derniers jours."];

/** Écart en jours de calendrier (heure locale de l'hôte) entre `quand` et `maintenant` : 0 aujourd'hui, 1 hier. */
function ecartJours(quand: number, maintenant: number): number {
  const a = new Date(quand);
  const b = new Date(maintenant);
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / JOUR_MS);
}

const jourDe = (quand: number, maintenant: number): Jour => {
  const e = ecartJours(quand, maintenant);
  return e <= 0 ? "aujourdhui" : e === 1 ? "hier" : "avant";
};

function candidates(souvenirs: readonly Souvenir[], absenceMs: number, maintenant: number): string[] {
  const somme = sommeParGenre(souvenirs, maintenant);
  const fond = humeurDeFond(souvenirs, maintenant);
  const famille = fond.rancune >= fond.chaleur ? NEGATIFS : POSITIFS;
  // Le genre dominant de la famille (à égalité, l'ordre de GENRES_SOUVENIR).
  let dominant: GenreSouvenir | null = null;
  for (const g of famille) if (somme[g] >= SEUIL_MEMOIRE && (dominant === null || somme[g] > somme[dominant])) dominant = g;
  if (dominant === null) return [];
  // Le jour du souvenir le plus récent de ce genre qui compte encore.
  const recent = souvenirs.filter((s) => s.genre === dominant && poidsActuel(s, maintenant) > 0).reduce((m, s) => Math.max(m, Math.min(s.quand, maintenant)), 0);
  const jour = jourDe(recent, maintenant);
  const apaise = fond.rancune < SEUIL_APAISE;
  const dur = apaise ? DURS[jour].apaise : DURS[jour].rude;
  const parGenre: Readonly<Record<GenreSouvenir, readonly string[]>> = {
    brusque: dur,
    ton: dur,
    panne: PANNE[jour],
    isolement: apaise ? ISOLEMENT.apaise : ISOLEMENT.rude,
    gentil: GENTIL[jour],
    compliment: COMPLIMENT[jour],
    retour: RETOUR,
  };
  return [...parGenre[dominant], absenceMs >= 24 * 3600 * 1000 ? "Ça faisait longtemps." : "Te revoilà."];
}

/**
 * Ce qu'elle dit en retrouvant Marc après une absence : une phrase d'une liste fermée, vraie par construction (elle ne
 * parle que de ce que sa mémoire contient vraiment), jamais le contenu d'un message ni une donnée personnelle, sans
 * émoji ; ou `null` : absence de 6 h ou moins, aucun souvenir qui compte encore, déjà deux fois aujourd'hui.
 * `dejaDitAujourdhui` est le NOMBRE de phrases de retour déjà dites aujourd'hui. `derniere` (optionnelle) est la dernière
 * phrase dite : elle n'est pas redite deux fois de suite quand la liste le permet.
 */
export function phraseDeRetour(
  souvenirs: readonly Souvenir[],
  absenceMs: number,
  rand: Hasard,
  maintenant: number,
  dejaDitAujourdhui: number,
  derniere?: string | null,
): string | null {
  if (!Number.isFinite(absenceMs) || absenceMs <= ABSENCE_RETOUR_MS) return null;
  if (!Number.isFinite(maintenant)) return null;
  if (!Number.isFinite(dejaDitAujourdhui) || dejaDitAujourdhui >= PHRASES_RETOUR_PAR_JOUR) return null;
  const valides = (Array.isArray(souvenirs) ? souvenirs : []).filter(estSouvenir);
  if (valides.length === 0) return null;
  let liste = candidates(valides, absenceMs, maintenant);
  if (liste.length === 0) return null;
  if (derniere && liste.length > 1) liste = liste.filter((p) => p !== derniere);
  const r = rand();
  const k = Number.isFinite(r) ? Math.max(0, Math.min(liste.length - 1, Math.floor(r * liste.length))) : 0;
  return liste[k] ?? null;
}
