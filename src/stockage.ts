/** Mémoire locale de LIA (position, vie autonome, envies). Jamais indispensable : tout est en try/catch. */
import { COMPORTEMENTS, JOURNAL_MAX, type Envies, type FaitLia } from "./cerveau.js";
import { validerSouvenirs, type Souvenir } from "./souvenirs.js";

export interface MemoireLia {
  /** Position en fractions (0..1) de la zone de vie. */
  u: number;
  v: number;
  /**
   * Ce que la PERSONNE a choisi (« La laisser tranquille » / « La laisser vivre »), jamais ce que l'hôte ou le mode « fixe » impose.
   * Absent : elle vit. L'ancien champ `vie` (v0.5.0 et avant) mélangeait choix et contraintes : il restait à faux dans le navigateur
   * de Marc et coupait sa vie pour toujours ; il est ignoré.
   */
  choixVie?: boolean;
}

const PREFIXE = "lia-ui:";

function estFraction(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
}

export function lireMemoire(cle: string): MemoireLia | null {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    if (brut === null) return null;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return null;
    const { u, v, choixVie } = j as Record<string, unknown>;
    if (!estFraction(u) || !estFraction(v)) return null;
    return typeof choixVie === "boolean" ? { u, v, choixVie } : { u, v };
  } catch {
    return null;
  }
}

export function ecrireMemoire(cle: string, m: MemoireLia): void {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(m));
  } catch {
    /* navigateur sans stockage : LIA fonctionne pareil, sans mémoire */
  }
}

/** Relances du jour (plafond côté LIA, au cas où l'hôte l'oublierait). `jour` = date locale AAAA-MM-JJ. */
export interface RelancesLia {
  jour: string;
  n: number;
}

export function lireRelances(cle: string, jour: string): number {
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:relances`);
    if (brut === null) return 0;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return 0;
    const { jour: jr, n } = j as Record<string, unknown>;
    return jr === jour && typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function ecrireRelances(cle: string, r: RelancesLia): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:relances`, JSON.stringify(r));
  } catch {
    /* sans stockage, le plafond ne vaut que pour cette page : mieux que rien */
  }
}

/** Ce que le cerveau garde entre deux pages : ses envies et le journal de ce qu'elle a fait. */
export interface CerveauLia {
  envies: Envies;
  journal: FaitLia[];
}

const NOMS_ENVIES = ["energie", "curiosite", "social", "inquiet", "joie", "ennui"] as const;

export function lireCerveau(cle: string): CerveauLia | null {
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:cerveau`);
    if (brut === null) return null;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return null;
    const { envies, journal } = j as Record<string, unknown>;
    if (typeof envies !== "object" || envies === null || !Array.isArray(journal)) return null;
    const e = envies as Record<string, unknown>;
    if (!NOMS_ENVIES.every((k) => estFraction(e[k]))) return null;
    const faits = journal.filter(
      (f): f is FaitLia =>
        typeof f === "object" &&
        f !== null &&
        Number.isFinite((f as FaitLia).t) &&
        COMPORTEMENTS.includes((f as FaitLia).quoi),
    );
    return { envies: e as unknown as Envies, journal: faits.slice(-JOURNAL_MAX) };
  } catch {
    return null;
  }
}

export function ecrireCerveau(cle: string, c: CerveauLia): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:cerveau`, JSON.stringify(c));
  } catch {
    /* sans stockage, elle repart de ses envies de départ à chaque page */
  }
}

/** La mémoire lente du réseau interne : à garder d'une visite à l'autre, elle s'estompe avec le temps écoulé. */
export interface MemoireLente {
  /** Millisecondes depuis 1970. */
  t: number;
  slow: Record<string, number>;
}

export function lireLente(cle: string): MemoireLente | null {
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:reseau`);
    if (brut === null) return null;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return null;
    const { t, slow } = j as Record<string, unknown>;
    if (!Number.isFinite(t) || typeof slow !== "object" || slow === null) return null;
    const propre: Record<string, number> = {};
    for (const [k, v] of Object.entries(slow)) if (estFraction(v)) propre[k] = v;
    return { t: t as number, slow: propre };
  } catch {
    return null;
  }
}

export function ecrireLente(cle: string, m: MemoireLente): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:reseau`, JSON.stringify(m));
  } catch {
    /* sans stockage, la mémoire lente repart de zéro à chaque page */
  }
}

/** Le choix de Marc quand le système réduit les animations : il l'emporte sur l'option de l'hôte. */
export type MouvementLia = "doux" | "complet";

export function lireMouvement(cle: string): MouvementLia | null {
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:mouvement`);
    return brut === "doux" || brut === "complet" ? brut : null;
  } catch {
    return null;
  }
}

export function ecrireMouvement(cle: string, m: MouvementLia): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:mouvement`, m);
  } catch {
    /* navigateur sans stockage : le choix vaut jusqu'au prochain montage */
  }
}

/** Sa discussion en cours, gardée le temps de l'onglet (sessionStorage) : une page qui se recharge ne la ferme pas. */
export interface DiscussionLia {
  ouvert: boolean;
  msgs: Array<{ de: "lia" | "moi"; texte: string }>;
}

const MAX_MSGS = 20;

export function lireDiscussion(cle: string): DiscussionLia | null {
  try {
    const brut = sessionStorage.getItem(`${PREFIXE}${cle}:discussion`);
    if (brut === null) return null;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return null;
    const { ouvert, msgs } = j as Record<string, unknown>;
    if (ouvert !== true || !Array.isArray(msgs)) return null;
    const propres = msgs
      .filter((m): m is { de: "lia" | "moi"; texte: string } => {
        const x = m as Record<string, unknown> | null;
        return !!x && (x["de"] === "lia" || x["de"] === "moi") && typeof x["texte"] === "string";
      })
      .slice(-MAX_MSGS)
      .map((m) => ({ de: m.de, texte: m.texte.slice(0, 4000) }));
    return { ouvert: true, msgs: propres };
  } catch {
    return null;
  }
}

export function ecrireDiscussion(cle: string, d: DiscussionLia | null): void {
  try {
    if (!d || !d.ouvert) sessionStorage.removeItem(`${PREFIXE}${cle}:discussion`);
    else sessionStorage.setItem(`${PREFIXE}${cle}:discussion`, JSON.stringify({ ouvert: true, msgs: d.msgs.slice(-MAX_MSGS) }));
  } catch {
    /* sans stockage de session : la discussion ne survit pas au rechargement, rien d'autre ne change */
  }
}

/** Ce que le monde intérieur garde d'une page à l'autre : sa sensibilité et sa confiance (voir `interieur.ts`). */
export interface MemoireInterieure {
  /** Millisecondes depuis 1970. */
  t: number;
  sensibilite: number;
  confiance: number;
}

export function lireInterieur(cle: string): MemoireInterieure | null {
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:interieur`);
    if (brut === null) return null;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return null;
    const { t, sensibilite, confiance } = j as Record<string, unknown>;
    if (!Number.isFinite(t) || !estFraction(sensibilite) || !estFraction(confiance)) return null;
    return { t: t as number, sensibilite, confiance };
  } catch {
    return null;
  }
}

export function ecrireInterieur(cle: string, m: MemoireInterieure): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:interieur`, JSON.stringify(m));
  } catch {
    /* sans stockage, sa sensibilité et sa confiance repartent du départ à chaque page */
  }
}

/** Ses souvenirs sur plusieurs jours (voir `souvenirs.ts`) et combien de phrases de retour elle a déjà dites aujourd'hui. */
export interface MemoireSouvenirs {
  souvenirs: Souvenir[];
  retour: { jour: string; n: number };
}

export function lireSouvenirs(cle: string): MemoireSouvenirs {
  const vide: MemoireSouvenirs = { souvenirs: [], retour: { jour: "", n: 0 } };
  try {
    const brut = localStorage.getItem(`${PREFIXE}${cle}:souvenirs`);
    if (brut === null) return vide;
    const j: unknown = JSON.parse(brut);
    if (typeof j !== "object" || j === null) return vide;
    const { souvenirs, retour } = j as Record<string, unknown>;
    const r = typeof retour === "object" && retour !== null ? (retour as Record<string, unknown>) : {};
    const n = typeof r["n"] === "number" && Number.isInteger(r["n"]) && r["n"] >= 0 && r["n"] <= 1000 ? r["n"] : 0;
    return { souvenirs: validerSouvenirs(souvenirs), retour: { jour: typeof r["jour"] === "string" ? r["jour"].slice(0, 10) : "", n } };
  } catch {
    return vide;
  }
}

export function ecrireSouvenirs(cle: string, m: MemoireSouvenirs): void {
  try {
    localStorage.setItem(`${PREFIXE}${cle}:souvenirs`, JSON.stringify(m));
  } catch {
    /* sans stockage, elle ne se souvient pas d'une page à l'autre (l'état partagé de l'hôte, s'il existe, les garde) */
  }
}
