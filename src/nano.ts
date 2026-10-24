/**
 * Les nanobots : quand LIA analyse un élément de la page, ce sont ses propres traits qui sortent de son corps, vont se répartir sur
 * ce qu'elle analyse, le balayent d'une onde de lecture, puis rentrent (Marc, 24/10 : « c'est les nanobots eux-mêmes qui doivent
 * analyser le truc, pas un carré de plus »). Pur : aucun DOM, aucune horloge ; le hasard est injecté. Le dessin est dans `lia.ts`.
 *
 * Chaque nanobot a une place d'accueil sur l'élément (grille jittée, un cinquième sur le bord) et y est tiré par un ressort sous-amorti ;
 * il y tourne en petit cercle, plus large et plus lumineux quand l'onde de lecture passe sur lui.
 */

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

/** « complet » : ils sortent de son corps et voyagent ; « doux » : ils naissent sur l'élément (elle ne traverse jamais l'écran) ; « fixe » : image unique, sans mouvement. */
export type ModeEssaim = "complet" | "doux" | "fixe";

export interface Nano {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Secondes d'attente avant de quitter son corps (ils sortent en filet, pas d'un coup). */
  retard: number;
  /** A quitté son corps. */
  sorti: boolean;
  /** Rentré dans son corps (n'est plus dessiné). */
  rentre: boolean;
  /** Jitter de sa place dans sa cellule, 0..1. */
  jx: number;
  jy: number;
  /** Orbite : phase, vitesse angulaire (rad/s, signe = sens), rayon de base (px). */
  ph: number;
  om: number;
  rr: number;
}

export interface Essaim {
  bots: Nano[];
  /** Secondes depuis le début. */
  age: number;
  /** Le travail est fini : ils rentrent. */
  rentre: boolean;
  mode: ModeEssaim;
}

/** Marge autour de l'élément où ils se répartissent (les petits éléments restent lisibles). */
export const MARGE = 5;
const MIN = 18;
const MAX = 100;
/** Période de l'onde de lecture (s) et sa traîne dans la phase de sortie. */
const PERIODE_ONDE = 1.9;

export function nombreDeNano(zone: Zone): number {
  const cote = Math.sqrt(Math.max(0, zone.w) * Math.max(0, zone.h));
  return Math.max(MIN, Math.min(MAX, Math.round(cote / 2.2)));
}

export function creerEssaim(zone: Zone, source: Point, hasard: () => number, mode: ModeEssaim = "complet"): Essaim {
  const n = nombreDeNano(zone);
  const bots: Nano[] = [];
  for (let i = 0; i < n; i++) {
    const b: Nano = {
      x: source.x,
      y: source.y,
      vx: 0,
      vy: 0,
      retard: mode === "complet" ? (i / n) * 0.55 + hasard() * 0.08 : 0,
      sorti: mode !== "complet",
      rentre: false,
      jx: hasard(),
      jy: hasard(),
      ph: hasard() * Math.PI * 2,
      om: (hasard() < 0.5 ? -1 : 1) * (1.6 + hasard() * 2.4),
      rr: 1.5 + hasard() * 4,
    };
    if (mode !== "complet") {
      const a = accueil(i, n, zone, b);
      b.x = a.x;
      b.y = a.y;
    }
    bots.push(b);
  }
  return { bots, age: 0, rentre: false, mode };
}

/** La place d'accueil du nanobot `i` sur la zone : grille jittée, un sur cinq sur le bord le plus proche. */
export function accueil(i: number, n: number, zone: Zone, b: Pick<Nano, "jx" | "jy">): Point {
  const w = Math.max(1, zone.w);
  const h = Math.max(1, zone.h);
  const colonnes = Math.max(1, Math.round(Math.sqrt((n * w) / h)));
  const lignes = Math.max(1, Math.ceil(n / colonnes));
  let u = ((i % colonnes) + 0.15 + b.jx * 0.7) / colonnes;
  let v = (Math.floor(i / colonnes) + 0.15 + b.jy * 0.7) / lignes;
  if (i % 5 === 0) {
    // Le bord le plus proche : la forme de l'élément se devine sans qu'un contour soit tracé.
    const d = [u, 1 - u, v, 1 - v];
    const m = Math.min(...d);
    if (m === d[0]) u = 0;
    else if (m === d[1]) u = 1;
    else if (m === d[2]) v = 0;
    else v = 1;
  }
  return { x: zone.x - MARGE + u * (w + 2 * MARGE), y: zone.y - MARGE + v * (h + 2 * MARGE) };
}

/** Où en est l'onde de lecture (0 = bord haut-gauche, 1 = bord bas-droit ; dépasse un peu pour sortir de l'élément). */
export function positionOnde(age: number): number {
  return ((age % PERIODE_ONDE) / PERIODE_ONDE) * 1.5 - 0.25;
}

/** Combien l'onde éclaire ce nanobot, 0..1. */
export function eclat(e: Essaim, i: number, zone: Zone): number {
  const b = e.bots[i];
  if (!b) return 0;
  const w = Math.max(1, zone.w + 2 * MARGE);
  const h = Math.max(1, zone.h + 2 * MARGE);
  const d = ((b.x - (zone.x - MARGE)) / w + (b.y - (zone.y - MARGE)) / h) / 2;
  const x = (d - positionOnde(e.age)) / 0.14;
  return Math.exp(-x * x);
}

const K = 70;
const C = 2 * Math.sqrt(K) * 0.42;

/** Un pas de `dt` secondes. `source` = où est son corps (centre). Modifie `e`. */
export function avancerEssaim(e: Essaim, dt: number, zone: Zone, source: Point): void {
  const total = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
  const n = e.bots.length;
  const pas = Math.max(1, Math.ceil(total / 0.016));
  const h = total / pas;
  for (let s = 0; s < pas; s++) {
    e.age += h;
    for (let i = 0; i < n; i++) {
      const b = e.bots[i] as Nano;
      if (b.rentre) continue;
      b.ph += b.om * h;
      if (e.rentre) {
        // Retour : ils reviennent vers son corps (ressort plus raide), puis disparaissent en y entrant.
        if (!b.sorti) {
          b.rentre = true;
          continue;
        }
        b.vx += (K * 1.4 * (source.x - b.x) - C * 1.1 * b.vx) * h;
        b.vy += (K * 1.4 * (source.y - b.y) - C * 1.1 * b.vy) * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        if (Math.hypot(source.x - b.x, source.y - b.y) < 12) b.rentre = true;
        continue;
      }
      if (!b.sorti) {
        // Ils sortent de son corps en filet, chacun avec un élan dirigé vers sa place.
        b.x = source.x;
        b.y = source.y;
        if (e.age >= b.retard) {
          b.sorti = true;
          const a = accueil(i, n, zone, b);
          const dx = a.x - source.x;
          const dy = a.y - source.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const v = 380 + (b.jx + b.jy) * 160;
          b.vx = (dx / d) * v + (b.jy - 0.5) * 180;
          b.vy = (dy / d) * v + (b.jx - 0.5) * 180;
        }
        continue;
      }
      if (e.mode === "fixe") continue;
      const a = accueil(i, n, zone, b);
      const l = eclat(e, i, zone);
      const r = b.rr * (1 + 1.6 * l);
      const tx = a.x + Math.cos(b.ph) * r;
      const ty = a.y + Math.sin(b.ph) * r;
      b.vx += (K * (tx - b.x) - C * b.vx) * h;
      b.vy += (K * (ty - b.y) - C * b.vy) * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
    }
  }
}

/** Demande le retour : ils rentrent dans son corps. */
export function rappeler(e: Essaim): void {
  e.rentre = true;
}

/** Tous rentrés : l'essaim est fini. */
export function termine(e: Essaim): boolean {
  return e.bots.every((b) => b.rentre);
}

/** Part (0..1) des nanobots sortis qui sont sur l'élément (marge comprise) : la mesure de preuve. */
export function surLaCible(e: Essaim, zone: Zone): number {
  const sortis = e.bots.filter((b) => b.sorti && !b.rentre);
  if (sortis.length === 0) return 0;
  const dedans = sortis.filter(
    (b) => b.x >= zone.x - MARGE * 2 && b.x <= zone.x + zone.w + MARGE * 2 && b.y >= zone.y - MARGE * 2 && b.y <= zone.y + zone.h + MARGE * 2,
  );
  return dedans.length / sortis.length;
}
