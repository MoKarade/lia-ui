import type { Hasard } from "./autonomie.js";
import type { ProfilHumeur } from "./humeurs.js";
import { ENTREES, INTENT, INTK, L1, L1B, L1BK, L1K, L2, L2K, MOODS, SORTIES, type Poids } from "./poids.js";

/**
 * Le calcul du réseau interne de LIA, repris de la maquette V9 (`reseauPas`, `melange`, `multIntention` de
 * `reseau.js`) : les entrées montent d'une couche à l'autre (appréciations, interprétations, émotions), les émotions
 * s'inhibent entre elles et gardent deux mémoires (rapide ≈ 3 s, lente ≈ 20 min, gardée d'une visite à l'autre),
 * les 40 humeurs se partagent l'activation (softmax) et le corps qu'elle prend est leur mélange. Les poids sont dans
 * `poids.ts`. Pur : aucun réseau, aucun coût, aucun texte ; le hasard et l'horloge sont injectés.
 */

/** Combien de secondes une impulsion (un geste de Marc, une nouvelle) met à retomber. */
const TAU_IMP: Readonly<Record<string, number>> = { touche: 12, parle: 6, reponse: 10, rejet: 25, scroll: 2.5, demande: 10, bon: 12, mauvais: 20 };
/** Constante de temps de la mémoire lente des émotions : 20 minutes. */
export const TAU_LENT = 20 * 60;

export type Impulsion = "touche" | "parle" | "reponse" | "rejet" | "scroll" | "demande" | "bon" | "mauvais";

/** Le corps qu'elle prend : un mélange pondéré des profils des humeurs actives (même forme qu'un profil). */
export type Melange = ProfilHumeur;

export interface Reseau {
  /** Les profils de corps des 40 humeurs (les 12 du moteur et les 28 de `humeurs.ts`). */
  profils: Readonly<Record<string, ProfilHumeur>>;
  /** Impulsions en cours de retombée (voir `impulsion`). */
  imp: Record<string, number>;
  /** Activation de chaque neurone des couches intermédiaires. */
  V: Record<string, number>;
  /** Mémoire rapide (≈ 3 s) et lente (≈ 20 min) des émotions. */
  fast: Record<string, number>;
  slow: Record<string, number>;
  noise: Record<string, number>;
  /** Activation de chaque humeur (somme ≈ 1) et ses scores bruts. */
  act: Record<string, number>;
  Z: Record<string, number>;
  /** Envie (0 à 1) de chaque intention. */
  int: Record<string, number>;
  /** Humeurs poussées de l'extérieur (jusqu'à une heure donnée). */
  pousse: Record<string, { v: number; until: number }>;
  /** Niveau de danger d'il y a une vingtaine de secondes (pour sentir le soulagement). */
  tref: number;
  /** Humeur dominante (elle ne change pas à la légère) et depuis quand (ms). */
  dom: string;
  domDepuis: number;
  mix: Melange;
  pas: number;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const somme = (w: Poids, V: Readonly<Record<string, number>>): number => {
  let s = w["_b"] ?? 0;
  for (const k in w) {
    if (k !== "_b") s += (w[k] ?? 0) * (V[k] ?? 0);
  }
  return s;
};

/**
 * Un réseau neuf. `lente` est la mémoire lente gardée d'une visite à l'autre (`etatLent`) et `ageMs` le temps
 * écoulé depuis ; elle s'est estompée d'autant (demi-oubli en 20 minutes).
 */
export function creerReseau(profils: Readonly<Record<string, ProfilHumeur>>, lente?: Readonly<Record<string, number>> | null, ageMs = 0): Reseau {
  const r: Reseau = {
    profils,
    imp: { touche: 0, parle: 0, reponse: 0, rejet: 0, scroll: 0, demande: 0, bon: 0, mauvais: 0 },
    V: {},
    fast: {},
    slow: {},
    noise: {},
    act: {},
    Z: {},
    int: {},
    pousse: {},
    tref: 0,
    dom: "neutre",
    domDepuis: 0,
    mix: { bs: 1, ba: 1, blr: 1, ga: 1, en: 1, tint: 0, sag: 0, jit: 1 },
    pas: 0,
  };
  for (const k of ENTREES) r.V[k] = 0;
  for (const k of L1K) (r.V[k] = 0), (r.noise[k] = 0);
  for (const k of L1BK) (r.V[k] = 0), (r.noise[k] = 0);
  const oubli = Math.exp(-Math.max(0, ageMs) / 1000 / TAU_LENT);
  for (const k of L2K) {
    const v = lente?.[k];
    r.slow[k] = Number.isFinite(v) ? clamp01(v as number) * oubli : 0;
    r.fast[k] = (r.slow[k] ?? 0) * 0.5;
    r.V[k] = 0;
  }
  for (const m of MOODS) r.act[m] = m === "neutre" ? 1 : 0;
  for (const k of INTK) r.int[k] = 0.3;
  r.mix = melange(r);
  return r;
}

/** Un geste de Marc ou une nouvelle : monte tout de suite à `valeur` puis retombe tout seul. */
export function impulsion(r: Reseau, nom: Impulsion, valeur = 1): void {
  r.imp[nom] = clamp01(Math.max(r.imp[nom] ?? 0, valeur));
}

/** Pousse une humeur de l'extérieur pendant cent secondes (comme la maquette quand l'hôte la lui souffle). */
export function pousserHumeur(r: Reseau, humeur: string, maintenant: number, v = 1.5): void {
  if (SORTIES[humeur]) r.pousse[humeur] = { v, until: maintenant + 100_000 };
}

/**
 * Fait avancer le réseau de `dt` secondes (au plus une seconde à la fois, comme la maquette). `entrees` est le
 * vecteur COMPLET des entrées (0 à 1 ; une entrée absente vaut 0) ; `maintenant` est l'heure en millisecondes.
 */
export function reseauPas(r: Reseau, entrees: Readonly<Record<string, number>>, dt: number, hasard: Hasard, maintenant: number): void {
  const V = r.V;
  for (const k of ENTREES) V[k] = clamp01(entrees[k] ?? 0);
  for (const k in r.imp) V[k] = r.imp[k] ?? 0;
  for (const k in r.imp) r.imp[k] = (r.imp[k] ?? 0) * Math.exp(-dt / (TAU_IMP[k] ?? 10));
  const l1 = 1 - Math.exp(-dt / 1.5);
  const l2 = 1 - Math.exp(-dt / 3);
  const ls = dt / TAU_LENT;
  const bruit = (k: string, amplitude: number): number => {
    const n = (r.noise[k] ?? 0) + (-(r.noise[k] ?? 0) * dt) / 8 + (hasard() - 0.5) * amplitude * Math.sqrt(dt);
    r.noise[k] = n;
    return n;
  };
  for (const k of L1K) {
    if (k === "a_soulagement") continue;
    const n = bruit(k, 0.09);
    V[k] = (V[k] ?? 0) + (Math.tanh(1.3 * Math.max(0, somme(L1[k] ?? {}, V) + n)) - (V[k] ?? 0)) * l1;
  }
  for (const k of L1BK) {
    const n = bruit(k, 0.06);
    V[k] = (V[k] ?? 0) + (Math.tanh(1.3 * Math.max(0, somme(L1B[k] ?? {}, V) + n)) - (V[k] ?? 0)) * l1;
  }
  const danger = V["a_danger"] ?? 0;
  r.tref += ((danger - r.tref) * dt) / 20;
  V["a_soulagement"] = (V["a_soulagement"] ?? 0) + (clamp01((r.tref - danger) * 5) - (V["a_soulagement"] ?? 0)) * l1;
  const prev: Record<string, number> = {};
  for (const k of L2K) prev[k] = V[k] ?? 0;
  for (const k of L2K) {
    const w = L2[k] ?? {};
    let s = w["_b"] ?? 0;
    for (const j in w) {
      if (j !== "_b") s += (w[j] ?? 0) * (j.startsWith("e") ? (prev[j] ?? 0) : (V[j] ?? 0));
    }
    const rapide = (r.fast[k] ?? 0) + (Math.tanh(1.9 * Math.max(0, s)) - (r.fast[k] ?? 0)) * l2;
    const lente = (r.slow[k] ?? 0) + (rapide - (r.slow[k] ?? 0)) * ls;
    r.fast[k] = rapide;
    r.slow[k] = lente;
    V[k] = 0.7 * rapide + 0.3 * lente;
  }
  const T = 0.2;
  let mx = -9;
  for (const m of MOODS) {
    let z = somme(SORTIES[m] ?? {}, V);
    const p = r.pousse[m];
    if (p) {
      if (p.until > maintenant) z += p.v;
      else delete r.pousse[m];
    }
    r.Z[m] = z;
    if (z > mx) mx = z;
  }
  const ex: Record<string, number> = {};
  let tot = 0;
  for (const m of MOODS) {
    ex[m] = Math.exp(((r.Z[m] ?? 0) - mx) / T);
    tot += ex[m] ?? 0;
  }
  const la = 1 - Math.exp(-dt / 2);
  let meilleure = r.dom;
  let bv = -1;
  for (const m of MOODS) {
    r.act[m] = (r.act[m] ?? 0) + ((ex[m] ?? 0) / tot - (r.act[m] ?? 0)) * la;
    if ((r.act[m] ?? 0) > bv) {
      bv = r.act[m] ?? 0;
      meilleure = m;
    }
  }
  if (meilleure !== r.dom && ((r.act[meilleure] ?? 0) > (r.act[r.dom] ?? 0) + 0.06 || maintenant - r.domDepuis > 8000)) {
    r.dom = meilleure;
    r.domDepuis = maintenant;
  }
  for (const k of INTK) r.int[k] = (r.int[k] ?? 0) + (1 / (1 + Math.exp(-2.5 * somme(INTENT[k] ?? {}, V))) - (r.int[k] ?? 0)) * la;
  r.mix = melange(r);
  r.pas++;
}

const CLES_CORPS = ["bs", "ba", "blr", "ga", "en", "tint", "sag", "jit", "hopV"] as const;
const CLES_TICS = ["hopI", "yawnI", "shivI", "wigI"] as const;

/** Le corps du moment : la moyenne des profils des humeurs actives, pondérée par leur activation (^1,4). */
export function melange(r: Reseau): Melange {
  const W: Record<string, number> = {};
  let s = 0;
  for (const m of MOODS) {
    const w = Math.pow(r.act[m] ?? 0, 1.4);
    if (w > 0.01) {
      W[m] = w;
      s += w;
    }
  }
  const o = { bs: 0, ba: 0, blr: 0, ga: 0, en: 0, tint: 0, sag: 0, jit: 0, hopV: 0 } as Record<string, number>;
  const rythme: Record<string, number> = { hopI: 0, yawnI: 0, shivI: 0, wigI: 0 };
  const tc = [0, 0, 0];
  let tcw = 0;
  for (const m in W) {
    const w = (W[m] ?? 0) / s;
    const P = r.profils[m];
    if (!P) continue;
    const p = P as unknown as Record<string, number | undefined>;
    for (const k of CLES_CORPS) o[k] = (o[k] ?? 0) + w * (p[k] ?? 0);
    for (const k of CLES_TICS) if (p[k]) rythme[k] = (rythme[k] ?? 0) + w / (p[k] as number);
    const a = Math.abs(P.tint || 0);
    if (a > 0.01) {
      const c = P.tc ?? (P.tint > 0 ? [255, 190, 140] : [140, 170, 255]);
      tc[0] = (tc[0] ?? 0) + w * a * (c[0] ?? 0);
      tc[1] = (tc[1] ?? 0) + w * a * (c[1] ?? 0);
      tc[2] = (tc[2] ?? 0) + w * a * (c[2] ?? 0);
      tcw += w * a;
    }
  }
  for (const k of CLES_TICS) {
    const v = rythme[k] ?? 0;
    if (v > 1 / 200) o[k] = 1 / v;
  }
  if (o["hopV"] === 0) delete o["hopV"];
  const m = o as unknown as Melange;
  if (tcw > 0.005) m.tc = [Math.round((tc[0] ?? 0) / tcw), Math.round((tc[1] ?? 0) / tcw), Math.round((tc[2] ?? 0) / tcw)];
  return m;
}

/** Combien l'envie d'une intention pèse sur le choix d'un comportement (maquette : `multIntention`, de 0,6 à 2). */
export function multIntention(r: Reseau, id: string): number {
  const v = r.int[id];
  return v === undefined ? 1 : Math.exp(1.2 * (v - 0.4));
}

/** Les humeurs les plus actives, de la plus forte à la plus faible (au-delà de 6 %). */
export function top3(r: Reseau): Array<[string, number]> {
  return MOODS.map((m): [string, number] => [m, r.act[m] ?? 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter((x) => x[1] > 0.06);
}

/** Ce qu'il faut garder d'une visite à l'autre : la mémoire lente des émotions. */
export function etatLent(r: Reseau): Record<string, number> {
  return { ...r.slow };
}
