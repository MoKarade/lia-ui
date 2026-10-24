/**
 * L'allure de LIA quand elle se promène : irrégulière et naturelle, jamais le rythme d'une machine (Marc, 24/10 : « faut qu'elle bouge de
 * façon humaine, pas régulier mais naturel »). Pur : aucun DOM, aucune horloge, le hasard est injecté.
 *
 * Un trajet n'est pas une ligne droite à vitesse constante : une courbe douce (arc qui s'écarte d'un côté), un profil de vitesse en cloche
 * (jerk minimal : départ lent, pointe au milieu, arrivée lente), une vitesse propre à chaque trajet (son énergie), parfois une hésitation en
 * chemin (une pause, un temps de reprise) et parfois un dépassement du but suivi d'une petite correction. Au repos, elle dérive très
 * doucement (balancement du corps, 1/f) et fait de temps en temps un petit pas de côté, à des intervalles très inégaux.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ParamsAllure {
  /** 0..1 : son énergie ; plus elle est haute, plus elle va vite et moins elle hésite. */
  energie: number;
  /** 0..1 : sa nervosité (inquiétude, sensibilité) ; plus elle est haute, plus elle hésite et corrige. */
  nervosite: number;
}

export interface Trajet {
  depart: Point;
  /** Le but visé : celui qu'on lui a donné. */
  but: Point;
  /** Le point de contrôle de l'arc. */
  ctrl: Point;
  /** Où elle va d'abord quand elle dépasse son but (égal à `but` sinon). */
  fin: Point;
  /** Secondes du trajet principal, sans la pause. */
  duree: number;
  /** Hésitation : à quelle part (0..1) du trajet, et combien de secondes. `null` : aucune. */
  pause: { a: number; duree: number } | null;
  /** Secondes de la correction après le dépassement (0 : aucun dépassement). */
  correction: number;
  /** Secondes en tout. */
  total: number;
}

const limiter = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const entre = (h: () => number, a: number, b: number): number => a + (b - a) * h();

/** Le profil « jerk minimal » (0 → 1, vitesse nulle aux deux bouts, pointe au milieu). */
export function jerkMinimal(u: number): number {
  const x = limiter(u, 0, 1);
  return x * x * x * (10 - 15 * x + 6 * x * x);
}

/** Planifie un trajet de `depart` à `but`. Les petites distances restent presque droites et sans hésitation. */
export function planifierTrajet(depart: Point, but: Point, hasard: () => number, p: ParamsAllure): Trajet {
  const dx = but.x - depart.x;
  const dy = but.y - depart.y;
  const d = Math.hypot(dx, dy);
  const energie = limiter(Number.isFinite(p.energie) ? p.energie : 0.5, 0, 1);
  const nerv = limiter(Number.isFinite(p.nervosite) ? p.nervosite : 0.2, 0, 1);
  if (d < 1) {
    return { depart, but, ctrl: { ...depart }, fin: { ...but }, duree: 0.01, pause: null, correction: 0, total: 0.01 };
  }
  const nx = -dy / d;
  const ny = dx / d;
  // L'arc : plus le trajet est long, plus il s'écarte (jusqu'à 16 % de sa longueur, 60 px au plus), d'un côté ou de l'autre.
  const ecart = d < 40 ? 0 : (hasard() < 0.5 ? -1 : 1) * Math.min(60, d * entre(hasard, 0.04, 0.16));
  const ctrl = { x: (depart.x + but.x) / 2 + nx * ecart, y: (depart.y + but.y) / 2 + ny * ecart };
  // Sa vitesse de croisière : propre à ce trajet (lognormale autour de 230 px/s, plus vive quand elle a de l'énergie).
  const croisiere = 230 * (0.65 + 0.7 * energie) * Math.exp((hasard() + hasard() + hasard() - 1.5) * 0.45);
  const duree = limiter(d / croisiere, 0.55, 4.2);
  // Une hésitation : plus fréquente quand elle est nerveuse ou fatiguée, jamais sur un trajet très court.
  const pHesite = d < 90 ? 0 : 0.12 + 0.3 * nerv + 0.1 * (1 - energie);
  const pause = hasard() < pHesite ? { a: entre(hasard, 0.25, 0.65), duree: entre(hasard, 0.18, 0.6) } : null;
  // Un dépassement : on freine trop tard, puis on revient d'un petit pas.
  const pDepasse = d < 120 ? 0 : 0.14 + 0.25 * nerv;
  const depasse = hasard() < pDepasse;
  const amp = depasse ? Math.min(30, d * entre(hasard, 0.04, 0.09)) : 0;
  const fin = amp > 0 ? { x: but.x + (dx / d) * amp, y: but.y + (dy / d) * amp } : { ...but };
  const correction = amp > 0 ? entre(hasard, 0.35, 0.65) : 0;
  return { depart, but, ctrl, fin, duree, pause, correction, total: duree + (pause?.duree ?? 0) + correction };
}

/** Un point de l'arc quadratique (u de 0 à 1). */
function sur(a: Point, c: Point, b: Point, u: number): Point {
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
}

/** Où elle est au bout de `ecoule` secondes de ce trajet, et s'il est fini. */
export function pointDuTrajet(tr: Trajet, ecoule: number): Point & { fini: boolean } {
  if (tr.total <= 0.011) return { x: tr.but.x, y: tr.but.y, fini: true };
  const e = Number.isFinite(ecoule) ? Math.max(0, ecoule) : 0;
  const pause = tr.pause;
  const debutPause = pause ? pause.a * tr.duree : Infinity;
  // Le temps du profil : gelé pendant la pause.
  let tp = e;
  if (pause && e > debutPause) tp = e <= debutPause + pause.duree ? debutPause : e - pause.duree;
  const u = tp / tr.duree;
  if (u < 1) {
    const p = sur(tr.depart, tr.ctrl, tr.fin, jerkMinimal(u));
    return { ...p, fini: false };
  }
  if (tr.correction > 0) {
    const reste = tp - tr.duree;
    if (reste < tr.correction) {
      const s = jerkMinimal(reste / tr.correction);
      return { x: tr.fin.x + (tr.but.x - tr.fin.x) * s, y: tr.fin.y + (tr.but.y - tr.fin.y) * s, fini: false };
    }
  }
  return { x: tr.but.x, y: tr.but.y, fini: true };
}

/**
 * Au repos, elle ne reste jamais figée : un balancement lent (somme de sinusoïdes de périodes premières entre elles, d'amplitude
 * `amplitude` px au plus) qui varie sans jamais se répéter. `graine` fixe ses phases.
 */
export function deriveAuRepos(t: number, graine: number, amplitude: number): Point {
  const a = limiter(amplitude, 0, 20);
  const g = Number.isFinite(graine) ? graine : 0;
  const s = (f: number, ph: number): number => Math.sin(t * f + g * ph);
  return {
    x: a * (0.55 * s(0.37, 1.3) + 0.3 * s(0.91, 2.9) + 0.15 * s(2.3, 4.1)),
    y: a * 0.8 * (0.55 * s(0.29, 5.7) + 0.3 * s(0.73, 3.3) + 0.15 * s(1.9, 7.9)),
  };
}

/** Le prochain petit pas de côté au repos : dans combien de secondes (très inégal : tantôt 2 s, tantôt une minute) et de combien de pixels. */
export function prochainPetitPas(hasard: () => number, energie: number): { delai: number; dx: number; dy: number } {
  const e = limiter(Number.isFinite(energie) ? energie : 0.5, 0, 1);
  // Lognormale : médiane autour de 9 s (4 s quand elle a beaucoup d'énergie), queue longue.
  const mediane = 11 - 7 * e;
  const delai = limiter(mediane * Math.exp((hasard() + hasard() + hasard() - 1.5) * 1.1), 1.6, 70);
  const a = hasard() * Math.PI * 2;
  const r = entre(hasard, 7, 22);
  return { delai, dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.6 };
}
