/** Contrat typé du moteur JS (`moteur.js`). Seul `lia.ts` l'utilise. */

export interface Souffle {
  gx: number;
  gy: number;
  b: number;
  blink: number;
  kick: number;
  sq: number;
  mag: number;
  nod: number;
  hes: number;
  tilt: number;
  typeA: number;
  flash: number;
  cur: number;
  hop: number;
  yawn: number;
  shiv: number;
}

export interface EtatMoteur {
  ph: number;
  /** Niveau de voix instantané, 0..1. */
  v: number;
  /** Historique du niveau de voix (160 valeurs). */
  vh: number[];
  /** Poids de chaque action (somme ~1) : le moteur fond d'une silhouette à l'autre. */
  W: Record<string, number>;
  H: Souffle;
  /** Temps propre de chaque action depuis son début. */
  lts: Record<string, number> | null;
}

export interface OptionsCorps {
  cx?: number;
  cy?: number;
  R?: number;
  asp?: number;
  fly?: { dx: number; dy: number; v: number } | null;
  /** Accélération du corps entier (px/s²) : chaque trait la subit selon sa masse, d'où la traîne, le rebond et le balancement. */
  acc?: { x: number; y: number } | null;
  snap?: boolean;
  extra?: number;
}

export type DessinerCorps = (
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  P: EtatMoteur,
  t: number,
  id: string,
  o?: OptionsCorps,
) => void;

export interface DefAction {
  id: string;
  label: string;
  fam: string;
  quand: string;
  desc: string;
  /** 1 quand le corps se transforme en scène (silhouette propre) pour cette action ; absent au repos et à la réponse. */
  sc?: number;
}

export const ACT: Record<string, DefAction>;
export const ORDRE: string[];
export const ST: string[];
export const FAMILLES: string[];
export const HUMEURS: Record<string, unknown>;
export const HZ: Souffle;
export const HK: { v: number };
/** Épaisseur des traits, en fraction du rayon. */
export const THK: { v: number };

export function setHumeur(h: string): void;
export function lireHumeur(): string;
/** En humeur « auto », le corps vient de cette fonction (le mélange du réseau) ; `null` rend la main à l'heure du jour. */
export function setMelange(f: (() => unknown) | null): void;
/** Position normalisée du regard (-1..1) dans le cadre que l'hôte choisit. */
export function regarder(nx: number, ny: number, t?: number): void;
export function construire(texte: string): void;
export function brut(secondes: number): number;
export function totalVoix(): number;
export function humanStep(dt: number, t: number, id: string, P: EtatMoteur): Souffle;
export function poke(): void;
export function corps(): DessinerCorps;
