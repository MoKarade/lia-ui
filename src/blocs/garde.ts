/**
 * Gardes de forme des blocs. PUR. MemoryAI valide déjà chaque bloc (`lib/lia/blocs.ts`) ; ces
 * gardes ne la remplacent pas, elles empêchent seulement le rendu d'inventer ou de lever : un champ
 * absent ou mal typé fait tomber le bloc entier, jamais une valeur par défaut.
 */

export type Obj = Record<string, unknown>;

export const estObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
export const estTexte = (v: unknown, max = 500): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export const estNombre = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Une liste dont CHAQUE élément passe la garde, entre `min` et `max` éléments ; sinon `null`. */
export function liste<T>(v: unknown, garde: (x: unknown) => x is T, min = 1, max = 100): T[] | null {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  return v.every((x) => garde(x)) ? (v as T[]) : null;
}

/** Garde d'objet : chaque clé requise passe sa garde ; une clé optionnelle absente est permise. */
export function forme<T extends Obj>(
  requis: Record<string, (x: unknown) => boolean>,
  optionnels: Record<string, (x: unknown) => boolean> = {},
): (v: unknown) => v is T {
  return (v: unknown): v is T =>
    estObj(v) &&
    Object.entries(requis).every(([k, g]) => g(v[k])) &&
    Object.entries(optionnels).every(([k, g]) => v[k] === undefined || g(v[k]));
}

export const libelle = (v: unknown): v is string => estTexte(v, 200);

/** `https://` seulement, sans espace : un autre schéma (javascript:, data:…) n'est jamais un lien. */
export function lienSur(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 500 || !/^https:\/\/[^\s]+$/.test(v)) return null;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    // URL illisible : pas de lien plutôt qu'un lien deviné.
    return null;
  }
}

export const heure = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const minutes = (h: string): number => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
