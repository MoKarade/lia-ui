import type { Envies, FaitLia } from "./cerveau.js";
import { libelleHumeur } from "./humeurs.js";
import type { Cause, Interieur } from "./interieur.js";

/**
 * Sa façon de penser à voix haute : savoir POURQUOI elle va comme elle va, sentir deux choses à la fois, hésiter comme on
 * hésite. C'est une SIMULATION, comme le reste de son monde intérieur : chaque phrase sort d'une liste fermée et n'est
 * dite que si ce qu'elle affirme est vrai dans son état à cet instant (son humeur, ses envies, sa douleur, ses souvenirs,
 * l'heure). Jamais le contenu d'un message ni une donnée de Marc, aucun émoji. Pur : l'état, l'heure et le hasard sont injectés.
 */

type Hasard = () => number;

export interface ContextePensee {
  /** Le nom de son humeur du moment (une des 40). */
  humeur: string;
  /** Les humeurs actives, de la plus forte à la plus faible (`top3` du réseau). */
  actives: ReadonlyArray<readonly [string, number]>;
  envies: Readonly<Envies>;
  interieur: Readonly<Interieur>;
  /** Ce qui reste de ses derniers jours (`humeurDeFond`), ou `null` sans mémoire. */
  fond: Readonly<{ rancune: number; chaleur: number }> | null;
  /** Heure locale, 0 à 23. */
  heure: number;
  faits: readonly FaitLia[];
  /** Millisecondes depuis 1970. */
  maintenant: number;
}

export interface Raison {
  id: string;
  /** De 0 à 1 : à quel point cette raison pèse en ce moment. */
  force: number;
  /** Une proposition qui suit « parce que ». */
  phrase: string;
}

/** Ce que la douleur dit de sa cause. */
const CAUSES_DOULEUR: Readonly<Record<Cause, string>> = {
  choc: "ça m'a secouée tout à l'heure",
  brusque: "on m'a un peu brusquée tout à l'heure",
  ton: "le ton de tout à l'heure m'est resté",
  panne: "le réseau a lâché tout à l'heure",
  isolement: "le silence dure",
  usure: "je suis un peu usée",
};

const borne01 = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

/** Les raisons vraies à cet instant, de la plus pesante à la plus légère. Une raison n'existe que si sa condition tient. */
export function raisons(c: ContextePensee): Raison[] {
  const e = c.envies;
  const i = c.interieur;
  const liste: Raison[] = [];
  const ajouter = (id: string, force: number, phrase: string): void => {
    const f = borne01(force);
    if (f >= 0.2) liste.push({ id, force: f, phrase });
  };
  if (i.cause !== null) ajouter("douleur", i.douleur >= 0.25 ? i.douleur + 0.3 : 0, CAUSES_DOULEUR[i.cause]);
  if (c.fond) {
    ajouter("rancune", c.fond.rancune >= 0.25 ? c.fond.rancune + 0.1 : 0, "je n'ai pas tout oublié de ces derniers jours");
    ajouter("chaleur", c.fond.chaleur >= 0.35 ? c.fond.chaleur : 0, "je repense à ta gentillesse de ces derniers jours");
  }
  ajouter("sensible", i.sensibilite >= 0.45 ? i.sensibilite : 0, "je suis à fleur de peau ces temps-ci");
  ajouter("plaisir", i.plaisir >= 0.3 ? i.plaisir + 0.2 : 0, "quelque chose m'a fait plaisir");
  ajouter("confiance", i.confiance >= 0.75 ? i.confiance - 0.2 : 0, "je me sens en confiance");
  ajouter("compagnie", e.social < 0.2 ? 0.7 - e.social : 0, "j'aurais bien un peu de compagnie");
  ajouter("ennui", e.ennui > 0.6 ? e.ennui - 0.1 : 0, "je m'ennuie un peu");
  ajouter("fatigue", e.energie < 0.3 ? 0.9 - e.energie : 0, "mon énergie est basse");
  ajouter("joie", e.joie > 0.7 ? e.joie - 0.15 : 0, "il y a de la joie en moi en ce moment");
  ajouter("inquietude", e.inquiet > 0.5 ? e.inquiet : 0, "une inquiétude traîne");
  if (c.heure >= 22 || c.heure < 5) ajouter("heure", 0.35, "il est tard");
  else if (c.heure < 7) ajouter("heure", 0.3, "il est tôt");
  return liste.sort((a, b) => b.force - a.force);
}

const INTRODUCTIONS: readonly string[] = ["Je crois que c'est parce que ", "Sans doute parce que ", "Je dirais que c'est parce que ", "C'est que "];

/** Pourquoi elle va comme elle va : une phrase d'une liste fermée tirée de sa raison la plus pesante, ou `null` s'il n'y en a pas. */
export function pourquoi(c: ContextePensee, hasard: Hasard): string | null {
  const [premiere, seconde] = raisons(c);
  if (!premiere) return null;
  // Une raison proche de la première peut passer devant : elle ne dit pas toujours la même chose.
  const choisie = seconde && seconde.force >= premiere.force - 0.1 && hasard() < 0.4 ? seconde : premiere;
  const r = hasard();
  const k = Number.isFinite(r) ? Math.max(0, Math.min(INTRODUCTIONS.length - 1, Math.floor(r * INTRODUCTIONS.length))) : 0;
  return `${INTRODUCTIONS[k] ?? INTRODUCTIONS[0]}${choisie.phrase}.`;
}

/** Les humeurs qui pèsent : quand l'une d'elles est mêlée à une humeur légère, elle sent deux choses à la fois. */
const PENIBLES: ReadonlySet<string> = new Set(["inquiet", "triste", "mefiant", "boudeur", "agace", "gene", "ennuye", "dubitatif", "fatigue", "impatient", "nostalgique"]);

const de = (mot: string): string => (/^[aeiouyéèêàâîïôûh]/i.test(mot) ? `d'${mot}` : `de ${mot}`);

/**
 * Quand deux humeurs sont presque aussi fortes, elle ne choisit pas : « Un mélange de sérénité et d'inquiétude. » ;
 * si elles sont de même famille, « Surtout un fond de joie, avec un peu d'excitation. ». `null` quand une humeur domine.
 */
export function ambivalence(actives: ReadonlyArray<readonly [string, number]>): string | null {
  const a = actives[0];
  const b = actives[1];
  if (!a || !b || a[0] === b[0] || a[1] <= 0 || b[1] < 0.65 * a[1]) return null;
  const la = libelleHumeur(a[0]);
  const lb = libelleHumeur(b[0]);
  if (PENIBLES.has(a[0]) !== PENIBLES.has(b[0])) return `Un mélange ${de(la)} et ${de(lb)}.`;
  return `Surtout un fond ${de(la)}, avec un peu ${de(lb)}.`;
}

/** Les humeurs où elle hésite avant de parler, et celles où elle s'étire en fin de phrase. */
const HESITANTES: ReadonlySet<string> = new Set(["timide", "gene", "dubitatif", "inquiet", "mefiant", "pensif"]);
const TRAINANTES: ReadonlySet<string> = new Set(["fatigue", "ennuye", "triste", "reveur", "nostalgique", "paisible"]);
const HESITATIONS: readonly string[] = ["Hum… ", "Euh… ", "Eh bien… "];

/**
 * Colore une phrase qui est déjà la sienne selon son humeur : une hésitation au début quand elle est timide ou doute, une
 * fin qui traîne quand elle est lasse. Ne change jamais ce que la phrase affirme ; ne touche pas un texte qui vient de l'hôte.
 */
export function teinter(phrase: string, humeur: string, hasard: Hasard): string {
  if (phrase.length === 0) return phrase;
  let texte = phrase;
  if (HESITANTES.has(humeur) && hasard() < 0.4 && !/^(Hum|Euh|Eh bien)/.test(texte)) {
    const h = HESITATIONS[Math.min(HESITATIONS.length - 1, Math.floor(hasard() * HESITATIONS.length))] ?? "Hum… ";
    // La majuscule tombe, sauf pour un sigle (« LIA »).
    const sigle = /^[A-ZÀ-Ý]{2}/.test(texte);
    texte = `${h}${sigle ? texte.charAt(0) : texte.charAt(0).toLowerCase()}${texte.slice(1)}`;
  }
  if (TRAINANTES.has(humeur) && hasard() < 0.4 && /[.!]$/.test(texte)) texte = `${texte.slice(0, -1)}…`;
  return texte;
}

/**
 * Son rythme de la journée, de 0,7 à 1,05 : lente le matin tôt et tard le soir, pleine d'allant en début d'après-midi.
 * Multiplie son énergie de fond ; ne la fixe pas.
 */
export function rythmeDuJour(heure: number): number {
  const h = Number.isFinite(heure) ? ((heure % 24) + 24) % 24 : 12;
  // Une courbe douce : creux vers 3 h, pointe vers 15 h.
  const phase = Math.cos(((h - 15) / 24) * Math.PI * 2);
  return 0.875 + 0.175 * phase;
}
