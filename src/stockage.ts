/** Mémoire locale de LIA (position, vie autonome). Jamais indispensable : tout est en try/catch. */

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
