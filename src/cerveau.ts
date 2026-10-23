import type { Hasard } from "./autonomie.js";

/**
 * Le cerveau local de LIA, repris de la maquette (`majEnvies` et `penser`, tail.js) : six envies qui montent
 * et descendent avec le temps et ce qu'elle fait, et un choix pondéré parmi ce qu'elle peut faire en ce moment.
 * Pur : aucun réseau, aucun coût, aucun texte ; le hasard est injecté. Ce que « faire » veut dire (se déplacer,
 * parler) reste dans `lia.ts` ; ce qui est propre à l'hôte (une app en panne, un rappel) viendra par l'interface `monde`.
 */

export interface Envies {
  energie: number;
  curiosite: number;
  social: number;
  inquiet: number;
  joie: number;
  ennui: number;
}

export const ENVIES_DEPART: Readonly<Envies> = { energie: 0.85, curiosite: 0.35, social: 0.45, inquiet: 0, joie: 0.3, ennui: 0.15 };

/** Ce qu'elle choisit de faire quand rien ne se passe. `relancer` : une remarque que l'hôte voulait lui voir répéter (2 par jour au plus). */
export type Comportement = "repos" | "suivre" | "promener" | "causer" | "relancer" | "jouer" | "voir" | "rentrer" | "dormir" | MotifMonde | "veiller";

/** Ce que l'hôte sait lui faire dire de vrai : `appeler` (un problème), `resumer` (une tendance), `feliciter`, `rappeler`, `souvenir`, `accompagner` (ce que Marc regarde). */
export type MotifMonde = "appeler" | "resumer" | "feliciter" | "rappeler" | "souvenir" | "accompagner";
export const MOTIFS_MONDE: readonly MotifMonde[] = ["appeler", "resumer", "feliciter", "rappeler", "souvenir", "accompagner"];

export const COMPORTEMENTS: readonly Comportement[] = ["voir", "suivre", "promener", "causer", "relancer", "jouer", "rentrer", "dormir", "repos", ...MOTIFS_MONDE, "veiller"];

const borne = (x: number): number => Math.max(0, Math.min(1, x));

export interface ContexteEnvies {
  /** Elle dort (veille) : l'énergie remonte. */
  dort: boolean;
  /** Elle est occupée par un comportement (pas au repos). */
  occupee: boolean;
  /** Elle est au repos. */
  auRepos: boolean;
  /** Secondes depuis sa dernière décision : au-delà de 30 s sans rien faire, le besoin de compagnie monte plus vite. */
  secondesDepuisDecision: number;
  /** Gravité (0..1) d'un problème que l'hôte voudrait annoncer ; 0 sans `monde`. */
  inquietude: number;
}

/** Fait avancer les envies de `dt` secondes (appelée chaque seconde, comme dans la maquette). */
export function majEnvies(e: Readonly<Envies>, dt: number, c: ContexteEnvies): Envies {
  const energie = c.dort ? e.energie + 0.05 * dt : e.energie + (c.auRepos ? 0.0014 : c.occupee ? -0.0025 : 0.0006) * dt;
  const social = e.social + 0.004 * dt * (c.secondesDepuisDecision > 30 ? 1.6 : 0.6);
  const retour = Math.min(1, dt * 0.35);
  return {
    energie: borne(energie),
    curiosite: borne(e.curiosite + 0.003 * dt),
    social: borne(social),
    inquiet: e.inquiet + (borne(c.inquietude) - e.inquiet) * retour,
    joie: e.joie + (0.25 - e.joie) * Math.min(1, dt * 0.02),
    ennui: borne(e.ennui + (c.occupee && !c.auRepos ? -0.003 : 0.003) * dt),
  };
}

/** Ce que faire coûte ou rapporte aux envies (valeurs de la maquette). */
export function apresComportement(e: Readonly<Envies>, id: Comportement): Envies {
  switch (id) {
    case "jouer":
      return { ...e, joie: borne(e.joie - 0.05) };
    case "promener":
      return { ...e, ennui: borne(e.ennui - 0.4), energie: borne(e.energie - 0.03) };
    case "suivre":
      return { ...e, social: borne(e.social - 0.25), ennui: borne(e.ennui - 0.25) };
    case "causer":
    case "relancer":
      return { ...e, social: borne(e.social - 0.35) };
    case "voir":
      return { ...e, curiosite: borne(e.curiosite - 0.2) };
    case "feliciter":
      return { ...e, joie: borne(e.joie + 0.1) };
    default:
      return { ...e };
  }
}

export interface ContexteChoix {
  /** Le curseur (souris ou stylet) a bougé il y a moins de 2,5 s. */
  curseurRecent: boolean;
  /** Combien d'éléments `[data-lia-cible]` elle voit. */
  cibles: number;
  /** L'hôte a quelque chose à lui faire dire et l'heure le permet. */
  parole: boolean;
  /** Le plafond de relances du jour n'est pas atteint. */
  relance: boolean;
  /** Ce qu'elle ressent (l'une des 40 humeurs de son réseau). */
  humeur: string;
  /** Elle vient de se déplacer ou de suivre Marc : elle se tient tranquille un moment. */
  tranquille: boolean;
  /** Elle est loin de sa maison. */
  loinDeLaMaison: boolean;
  /** Elle a le droit de traverser l'écran (faux avec « mouvement réduit doux »). */
  deplacement: boolean;
  /** Secondes depuis qu'elle a parlé seule : pas de remarque avant 90 s. */
  secondesDepuisParole: number;
  /** Les motifs pour lesquels l'hôte a une proposition vraie et dont le délai est passé ; absent = aucun. */
  monde?: readonly MotifMonde[];
  /** Marc est là (il a bougé il y a moins d'une minute). */
  present?: boolean;
  /** C'est la nuit ou Marc est parti depuis un moment : elle peut veiller, et le délai de 4 min est passé. */
  veille?: boolean;
  /** Ses intentions (0 à 1) ; absent = aucune. */
  intentions?: Readonly<Record<string, number>>;
  /** Secondes depuis son dernier déplacement ; absent = 0. Au-delà de 40 s, l'envie de bouger monte. */
  secondesImmobile?: number;
}

/** Envie de bouger qui monte avec l'immobilité : rien avant 40 s, puis jusqu'à +1,2 à 100 s (promener devient alors le choix le plus probable). */
export const envieDeBouger = (secondesImmobile: number | undefined): number => Math.min(1.2, Math.max(0, ((secondesImmobile ?? 0) - 40) / 50));

export interface Candidat {
  id: Comportement;
  poids: number;
}

/** Les comportements possibles maintenant, avec leur poids (formules de `penser()` de la maquette). */
export function candidats(e: Readonly<Envies>, c: ContexteChoix): Candidat[] {
  const liste: Candidat[] = [];
  const bouge = c.deplacement && !c.tranquille;
  if (bouge && c.cibles > 0 && e.curiosite > 0.35) liste.push({ id: "voir", poids: e.curiosite * 0.9 + 0.2 });
  if (bouge && c.curseurRecent && c.humeur !== "fatigue") {
    liste.push({ id: "suivre", poids: e.social * 0.9 + (c.humeur === "espiegle" ? 0.3 : 0) - 0.2 });
  }
  if (bouge) liste.push({ id: "promener", poids: e.ennui * 0.7 + 0.05 + (c.humeur === "excite" ? 0.3 : 0) + envieDeBouger(c.secondesImmobile) });
  if (c.parole && c.secondesDepuisParole > 90) liste.push({ id: "causer", poids: e.social * 1.5 + 0.35 });
  if (c.parole && c.relance && c.secondesDepuisParole > 90) liste.push({ id: "relancer", poids: 0.15 });
  const monde = c.monde ?? [];
  const veut = (id: string): number => c.intentions?.[id] ?? 0;
  if (monde.includes("appeler") && e.energie > 0.15 && e.inquiet > 0.35) liste.push({ id: "appeler", poids: 3.2 });
  if (!c.tranquille && c.present) {
    if (monde.includes("resumer")) liste.push({ id: "resumer", poids: 0.15 + veut("resumer") * 1.1 + (e.curiosite > 0.5 ? 0.15 : 0) });
    if (monde.includes("rappeler")) liste.push({ id: "rappeler", poids: 0.2 + veut("rappeler") * 1.1 });
    if (monde.includes("souvenir")) liste.push({ id: "souvenir", poids: 0.1 + veut("souvenir") * 1.1 });
  }
  if (!c.tranquille && monde.includes("accompagner")) liste.push({ id: "accompagner", poids: 2.1 + e.curiosite * 0.6 });
  if (c.present && monde.includes("feliciter")) liste.push({ id: "feliciter", poids: 0.2 + veut("feliciter") * 1.2 });
  if (c.veille) liste.push({ id: "veiller", poids: 0.1 + veut("veiller") * 1.2 });
  liste.push({ id: "jouer", poids: e.joie * 0.8 + 0.1 + (c.humeur === "joyeux" || c.humeur === "espiegle" ? 0.2 : 0) });
  if (c.deplacement && c.loinDeLaMaison && !c.tranquille) liste.push({ id: "rentrer", poids: 1.6 });
  if (e.energie < 0.3) liste.push({ id: "dormir", poids: (0.5 - e.energie) * 5 });
  liste.push({ id: "repos", poids: 0.9 });
  return liste;
}

/**
 * Tirage pondéré (exponentielle de 2,4 × le poids) ; le comportement en cours est un peu moins probable (−0,5).
 * `pesee` multiplie le poids de chacun (ses intentions : ce qu'elle a envie de faire).
 */
export function choisirComportement(liste: readonly Candidat[], hasard: Hasard, courant: Comportement | null = null, pesee?: (id: Comportement) => number): Comportement {
  const w = liste.map((c) => Math.exp((c.poids - (c.id === courant ? 0.5 : 0)) * 2.4) * (pesee?.(c.id) ?? 1));
  const total = w.reduce((s, x) => s + x, 0);
  let r = hasard() * total;
  for (let i = 0; i < liste.length; i++) {
    r -= w[i] ?? 0;
    const c = liste[i];
    if (r <= 0 && c) return c.id;
  }
  return liste[liste.length - 1]?.id ?? "repos";
}

/** Les silhouettes qu'elle prend pour jouer, selon l'humeur (POOL de la maquette). */
export const SILHOUETTES_JEU: Readonly<Record<string, readonly string[]>> = {
  joyeux: ["musique", "content", "salue"],
  excite: ["content", "musique", "surpris"],
  espiegle: ["musique", "salue", "cherche"],
  curieux: ["cherche", "surveille", "lit", "apprend"],
  calme: ["reflexion", "souvient", "musique", "attend"],
  neutre: ["reflexion", "attend", "surveille"],
  fatigue: ["attend", "reflexion"],
  inquiet: ["surveille", "attend", "securise"],
  triste: ["triste", "souvient", "attend"],
  concentre: ["concentre", "code", "calcule"],
  fier: ["content", "reussi"],
  timide: ["reflexion", "attend"],
};

/** Une durée entre `a` et `b` secondes (maquette : `rr`). */
export const entre = (hasard: Hasard, a: number, b: number): number => a + hasard() * (b - a);

/** Un fait gardé de ce qu'elle a fait (le texte, c'est à l'hôte de le choisir). */
export interface FaitLia {
  /** Millisecondes depuis 1970. */
  t: number;
  quoi: Comportement;
}

export const JOURNAL_MAX = 20;

/** Ajoute un fait au journal, en gardant les `JOURNAL_MAX` derniers. */
export function ajouterFait(journal: readonly FaitLia[], fait: FaitLia): FaitLia[] {
  return [...journal, fait].slice(-JOURNAL_MAX);
}
