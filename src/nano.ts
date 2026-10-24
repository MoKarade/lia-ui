/**
 * Les nanobots : quand LIA analyse un élément de la page, ce sont ses propres traits qui sortent de son corps, vont se répartir sur
 * ce qu'elle analyse, le balayent d'une onde de lecture, puis rentrent (Marc, 24/10 : « c'est les nanobots eux-mêmes qui doivent
 * analyser le truc, pas un carré de plus »). Pur : aucun DOM, aucune horloge ; le hasard est injecté. Le dessin est dans `lia.ts`.
 *
 * Ils dessinent eux-mêmes l'animation d'analyse de son corps (quatre coins, une ligne qui balaie, des points qui s'allument à son passage),
 * mais posée sur l'élément analysé (Marc, 24/10 : « l'analyse carré, je veux l'animation, mais là où il faut ») : 24 nanobots tiennent
 * les quatre coins, 28 forment la ligne de balayage, les 48 autres sont les points de lecture, qui s'allument quand la ligne les croise.
 * Chacun est tiré vers sa place par un ressort sous-amorti.
 */

export interface Zone { x: number; y: number; w: number; h: number }

export interface Point { x: number; y: number }

/** « complet » : ils sortent de son corps et voyagent ; « doux » : ils naissent sur l'élément (elle ne traverse jamais l'écran) ; « fixe » : image unique, sans mouvement. */
export type ModeEssaim = "complet" | "doux" | "fixe";

export interface Nano {
  x: number; y: number; vx: number; vy: number;
  /** Secondes d'attente avant de quitter son corps (ils sortent en filet, pas d'un coup). */
  retard: number;
  /** A quitté son corps. */
  sorti: boolean;
  /** Rentré dans son corps (n'est plus dessiné). */
  rentre: boolean;
  /** Jitter de sa place dans sa cellule, 0..1. */
  jx: number; jy: number;
  /** Orbite : phase, vitesse angulaire (rad/s, signe = sens), rayon de base (px). */
  ph: number; om: number; rr: number;
  /** Son rôle dans l'animation : un coin, la ligne de balayage ou un point de lecture. */
  role: RoleNano;
}

export type RoleNano = "coin" | "ligne" | "point";

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
/** Ils sont toujours cent, comme les traits de son corps (Marc, 24/10 : « seulement les 100 nanobots »). */
export const NOMBRE = 100;
/** Nanobots par coin (trois sur chaque branche), puis sur la ligne ; les autres sont des points de lecture. */
export const PAR_COIN = 6;
export const COINS = PAR_COIN * 4;
export const LIGNE = 28;
/** Période d'un aller-retour du balayage (s) : 0,45 passage par seconde, comme le corps. */
const PERIODE_ONDE = 2 / 0.45;
/** Plage (part de la hauteur) où un point de lecture s'allume autour de la ligne. */
const PORTEE = 0.26;

export function nombreDeNano(): number {
  return NOMBRE;
}

/** Le rôle du nanobot `i` : les 24 premiers tiennent les coins, les 28 suivants forment la ligne, les autres lisent. */
export function roleDe(i: number): RoleNano {
  return i < COINS ? "coin" : i < COINS + LIGNE ? "ligne" : "point";
}

export function creerEssaim(zone: Zone, source: Point, hasard: () => number, mode: ModeEssaim = "complet"): Essaim {
  const n = nombreDeNano();
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
      role: roleDe(i),
    };
    if (mode !== "complet") {
      const a = place(i, n, zone, b, mode === "fixe" ? 0.5 : 0);
      b.x = a.x;
      b.y = a.y;
    }
    bots.push(b);
  }
  return { bots, age: 0, rentre: false, mode };
}

/** La place du point de lecture `i` : grille jittée dans l'élément (les 48 points, rangés selon leur rang parmi eux). */
export function accueil(i: number, n: number, zone: Zone, b: Pick<Nano, "jx" | "jy">): Point {
  const w = Math.max(1, zone.w);
  const h = Math.max(1, zone.h);
  const pts = Math.max(1, n - COINS - LIGNE);
  const k = Math.max(0, i - COINS - LIGNE);
  const colonnes = Math.max(1, Math.round(Math.sqrt((pts * w) / h)));
  const lignes = Math.max(1, Math.ceil(pts / colonnes));
  const u = ((k % colonnes) + 0.15 + b.jx * 0.7) / colonnes;
  const v = (Math.floor(k / colonnes) + 0.15 + b.jy * 0.7) / lignes;
  return { x: zone.x + u * w, y: zone.y + v * h };
}

/** Longueur d'une branche de coin (px) : proportionnelle au petit côté, bornée pour rester lisible sur un bouton comme sur une carte. */
export function longueurCoin(zone: Zone): number {
  return Math.max(5, Math.min(28, 0.2 * Math.min(zone.w, zone.h)));
}

const BRANCHE_H = [0, 0.5, 1];
const BRANCHE_V = [0.35, 0.7, 1];

/**
 * Où le nanobot `i` doit être : son coin (deux branches de trois), sa place sur la ligne de balayage à la hauteur `u` (0 haut, 1 bas),
 * ou son point de lecture. Les coins et la ligne sont posés sur le contour de l'élément élargi de sa marge.
 */
export function place(i: number, n: number, zone: Zone, b: Pick<Nano, "jx" | "jy">, u: number): Point {
  const x0 = zone.x - MARGE;
  const y0 = zone.y - MARGE;
  const w = Math.max(1, zone.w) + 2 * MARGE;
  const h = Math.max(1, zone.h) + 2 * MARGE;
  const r = roleDe(i);
  if (r === "coin") {
    const coin = Math.floor(i / PAR_COIN);
    const j = i % PAR_COIN;
    const sx = coin === 0 || coin === 3 ? 1 : -1;
    const sy = coin === 0 || coin === 1 ? 1 : -1;
    const cx = sx === 1 ? x0 : x0 + w;
    const cy = sy === 1 ? y0 : y0 + h;
    const l = longueurCoin(zone);
    return j < 3 ? { x: cx + sx * (BRANCHE_H[j] as number) * l, y: cy } : { x: cx, y: cy + sy * (BRANCHE_V[j - 3] as number) * l };
  }
  if (r === "ligne") {
    const k = i - COINS;
    return { x: x0 + w * (0.04 + (0.92 * (k + 0.5 + (b.jx - 0.5) * 0.3)) / LIGNE), y: y0 + h * Math.max(0, Math.min(1, u)) };
  }
  return accueil(i, n, zone, b);
}

/** Où en est le balayage : 0 = bord haut, 1 = bord bas ; il descend, remonte, sans jamais sauter (la ligne est faite de nanobots qui ont une inertie). */
export function positionOnde(age: number): number {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * age) / PERIODE_ONDE);
}

/** Combien le balayage éclaire ce nanobot, 0..1 : la ligne est toujours claire, les coins un peu, les points quand elle les croise. */
export function eclat(e: Essaim, i: number, zone: Zone): number {
  const b = e.bots[i];
  if (!b) return 0;
  const u = e.mode === "fixe" ? 0.5 : positionOnde(e.age);
  if (b.role === "ligne") return 1;
  if (b.role === "coin") return 0.35;
  const h = Math.max(1, zone.h + 2 * MARGE);
  const ly = zone.y - MARGE + h * u;
  return Math.max(0, 1 - Math.abs(b.y - ly) / (PORTEE * h));
}

const K = 70;
const C = 2 * Math.sqrt(K) * 0.42;
const KL = K * 8;
const CL = 2 * Math.sqrt(KL) * 0.9;

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
          const a = place(i, n, zone, b, positionOnde(e.age));
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
      const a = place(i, n, zone, b, positionOnde(e.age));
      const l = eclat(e, i, zone);
      // Les coins et la ligne restent nets (petite orbite) ; les points de lecture tournent plus large quand la ligne passe.
      const r = b.role === "point" ? b.rr * (1 + 1.6 * l) : b.rr * 0.25;
      const tx = a.x + Math.cos(b.ph) * r;
      const ty = a.y + Math.sin(b.ph) * r;
      // La ligne est raide : elle suit le balayage sans retard visible ni dépassement.
      const k = b.role === "ligne" ? KL : K;
      const c = b.role === "ligne" ? CL : C;
      b.vx += (k * (tx - b.x) - c * b.vx) * h;
      b.vy += (k * (ty - b.y) - c * b.vy) * h;
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
