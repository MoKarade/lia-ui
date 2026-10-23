/** Mémoire locale de LIA (position, vie autonome, envies). Jamais indispensable : tout est en try/catch. */
import { COMPORTEMENTS, JOURNAL_MAX, type Envies, type FaitLia } from "./cerveau.js";

export interface MemoireLia {
  /** Position en fractions (0..1) de la zone de vie. */
  u: number;
  v: number;
  vie: boolean;
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
    const { u, v, vie } = j as Record<string, unknown>;
    if (!estFraction(u) || !estFraction(v) || typeof vie !== "boolean") return null;
    return { u, v, vie };
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
