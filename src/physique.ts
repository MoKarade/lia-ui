/**
 * La physique de LIA quand elle est lancée : un corps avec de l'élan, de la gravité, un frottement de l'air et des rebonds
 * sur les bords de sa zone de vie. Pur : aucun DOM, aucun hasard, aucune horloge ; le résultat ne dépend pas de la taille
 * du pas (le temps est découpé en pas fixes de 8 ms au plus).
 */

export interface Corps {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ParamsBalle {
  /** px/s², vers le bas. */
  gravite: number;
  /** 1/s : la vitesse est multipliée par exp(-frottement·dt). */
  frottement: number;
  /** Part de la vitesse normale rendue par le sol et le plafond. */
  restitutionSol: number;
  /** Part de la vitesse normale rendue par les murs. */
  restitutionMur: number;
  /** Marge entre le centre du corps et le bord de la zone. */
  marge: number;
}

export const BALLE_DEFAUT: Readonly<Omit<ParamsBalle, "marge">> = { gravite: 1400, frottement: 0.25, restitutionSol: 0.55, restitutionMur: 0.7 };

/** Une collision : de quel côté, et la vitesse normale qu'avait le corps juste avant. */
export interface Impact {
  cote: "gauche" | "droite" | "haut" | "bas";
  /** px/s, toujours positive. */
  vitesse: number;
}

/** Au-dessous de cette vitesse normale un rebond n'en est plus un : le corps se pose. */
const SEUIL_REBOND = 60;
const PAS_MAX = 0.008;

/** Un pas de `dt` secondes ; rend les impacts survenus (dans l'ordre). Modifie `c`. */
export function avancerBalle(c: Corps, dt: number, zone: Zone, p: ParamsBalle): Impact[] {
  const impacts: Impact[] = [];
  const total = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
  const n = Math.max(1, Math.ceil(total / PAS_MAX));
  const h = total / n;
  const minX = zone.x + p.marge;
  const maxX = Math.max(minX, zone.x + zone.w - p.marge);
  const minY = zone.y + p.marge;
  const maxY = Math.max(minY, zone.y + zone.h - p.marge);
  const amorti = Math.exp(-p.frottement * h);
  for (let i = 0; i < n; i++) {
    c.vy += p.gravite * h;
    c.vx *= amorti;
    c.vy *= amorti;
    c.x += c.vx * h;
    c.y += c.vy * h;
    if (c.x < minX) {
      c.x = minX;
      if (c.vx < 0) {
        impacts.push({ cote: "gauche", vitesse: -c.vx });
        c.vx = -c.vx * p.restitutionMur;
        if (c.vx < SEUIL_REBOND) c.vx = 0;
      }
    } else if (c.x > maxX) {
      c.x = maxX;
      if (c.vx > 0) {
        impacts.push({ cote: "droite", vitesse: c.vx });
        c.vx = -c.vx * p.restitutionMur;
        if (-c.vx < SEUIL_REBOND) c.vx = 0;
      }
    }
    if (c.y < minY) {
      c.y = minY;
      if (c.vy < 0) {
        impacts.push({ cote: "haut", vitesse: -c.vy });
        c.vy = -c.vy * p.restitutionSol;
      }
    } else if (c.y > maxY) {
      c.y = maxY;
      if (c.vy > 0) {
        impacts.push({ cote: "bas", vitesse: c.vy });
        c.vy = c.vy < SEUIL_REBOND ? 0 : -c.vy * p.restitutionSol;
      }
      // Au sol : un frottement de roulement, sinon elle glisserait sans fin.
      if (Math.abs(c.vy) < 1) c.vx *= Math.exp(-3 * h);
    }
  }
  return impacts;
}

/** Posée : plus d'élan notable, et au sol (ou sans gravité). */
export function auRepos(c: Readonly<Corps>, zone: Zone, p: ParamsBalle): boolean {
  const maxY = Math.max(zone.y + p.marge, zone.y + zone.h - p.marge);
  return Math.hypot(c.vx, c.vy) < 25 && c.y >= maxY - 1.5;
}

/** La normale (unitaire, vers l'intérieur de la zone) d'un côté, pour orienter l'écrasement. */
export function normaleDe(cote: Impact["cote"]): { x: number; y: number } {
  switch (cote) {
    case "gauche":
      return { x: 1, y: 0 };
    case "droite":
      return { x: -1, y: 0 };
    case "haut":
      return { x: 0, y: 1 };
    default:
      return { x: 0, y: -1 };
  }
}

/** L'énergie mécanique spécifique (par unité de masse) au-dessus du sol : pour vérifier qu'elle ne croît jamais. */
export function energie(c: Readonly<Corps>, zone: Zone, p: ParamsBalle): number {
  const sol = Math.max(zone.y + p.marge, zone.y + zone.h - p.marge);
  return 0.5 * (c.vx * c.vx + c.vy * c.vy) + p.gravite * (sol - c.y);
}

/**
 * L'écrasement sur ressort sous-amorti : `s` est l'écrasement (0 = rond), `v` sa vitesse. Un impact le pousse
 * de `vitesse/1800` (28 % au plus). Rend le nouvel état.
 */
export interface Ecrasement {
  s: number;
  v: number;
  /** Direction de la normale de l'impact (angle, radians). */
  angle: number;
}

export const ECRASEMENT_MAX = 0.28;

export function frapper(e: Ecrasement, vitesse: number, normale: { x: number; y: number }): void {
  const f = Math.min(ECRASEMENT_MAX, Math.max(0, vitesse) / 1800);
  if (f <= e.s * 0.6) return;
  e.angle = Math.atan2(normale.y, normale.x);
  e.s = Math.max(e.s, f);
  e.v = 0;
}

export function relacherEcrasement(e: Ecrasement, dt: number): void {
  const K = 260;
  const AMORT = 2 * 0.28 * Math.sqrt(K);
  const n = Math.max(1, Math.ceil(Math.max(0, dt) / 0.008));
  const h = Math.max(0, dt) / n;
  for (let i = 0; i < n; i++) {
    e.v += (-K * e.s - AMORT * e.v) * h;
    e.s += e.v * h;
  }
  if (Math.abs(e.s) < 0.002 && Math.abs(e.v) < 0.05) e.s = e.v = 0;
  e.s = Math.max(-0.12, Math.min(ECRASEMENT_MAX, e.s));
}

/**
 * La vitesse de départ d'un bond : de `depart` à `but` en `duree` secondes sous la même gravité et le même frottement que le vol.
 * On part de la solution sans frottement et on corrige trois fois par l'écart mesuré en simulant (sans bords).
 */
export function vitessePourBond(depart: Readonly<{ x: number; y: number }>, but: Readonly<{ x: number; y: number }>, duree: number, p: ParamsBalle): { vx: number; vy: number } {
  const T = Math.max(0.2, duree);
  let vx = (but.x - depart.x) / T;
  let vy = (but.y - depart.y) / T - 0.5 * p.gravite * T;
  const libre: Zone = { x: -1e7, y: -1e7, w: 2e7, h: 2e7 };
  for (let i = 0; i < 4; i++) {
    const c: Corps = { x: depart.x, y: depart.y, vx, vy };
    for (let t = 0; t < T - 1e-9; t += 0.1) avancerBalle(c, Math.min(0.1, T - t), libre, { ...p, marge: 0 });
    vx += (but.x - c.x) / T;
    vy += (but.y - c.y) / T;
  }
  return { vx, vy };
}
