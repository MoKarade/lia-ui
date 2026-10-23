/**
 * Où LIA se met quand elle suit Marc ou va voir un élément. Fonctions pures : les rectangles et
 * le curseur sont fournis par l'appelant, en pixels de la fenêtre. Elle ne déplace jamais l'écran
 * de Marc : on ne calcule que SA position.
 */

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Fenetre {
  w: number;
  h: number;
}

const limiter = (v: number, min: number, max: number): number => Math.min(Math.max(max, min), Math.max(min, v));

/** Elle tourne doucement près du curseur, un peu au-dessus, sans jamais le couvrir. */
export function pointPresDuCurseur(
  curseur: { x: number; y: number },
  t: number,
  rayon: number,
  fenetre: Fenetre,
): { x: number; y: number } {
  const a = t * 0.7;
  return {
    x: limiter(curseur.x + Math.cos(a) * rayon * 1.3, rayon * 0.55, fenetre.w - rayon * 0.55),
    y: limiter(curseur.y + Math.sin(a) * rayon * 0.9 - rayon * 1.05, rayon * 0.55, fenetre.h - rayon * 0.55),
  };
}

/**
 * À côté d'un élément : à sa droite, sinon à sa gauche, sinon sur lui. À hauteur de son milieu, dans la fenêtre.
 * Avec l'élément qui défile, le point suit exactement : appelée à chaque image, elle le « colle » à l'élément.
 */
export function pointPresDeLElement(rect: Rect, rayon: number, fenetre: Fenetre): { x: number; y: number } {
  let x = rect.right + rayon * 0.85;
  if (x + rayon * 0.6 > fenetre.w) x = rect.left - rayon * 0.85;
  if (x - rayon * 0.6 < 0) x = (rect.left + rect.right) / 2;
  const y = limiter((rect.top + rect.bottom) / 2, rayon * 0.6, fenetre.h - rayon * 0.6);
  return { x, y };
}

/** Un élément est visible quand une part de lui est dans la fenêtre : assez pour aller vers lui quand on le lui demande. */
export function estVisible(rect: Rect, fenetre: Fenetre): boolean {
  if (rect.right <= rect.left || rect.bottom <= rect.top) return false;
  return rect.top < fenetre.h && rect.bottom > 0 && rect.right > 0 && rect.left < fenetre.w;
}

/** Un élément est « regardé » quand sa partie visible touche la bande centrale de la fenêtre (comme sur l'accueil v2). */
export function estRegarde(rect: Rect, fenetre: Fenetre): boolean {
  if (rect.right <= rect.left || rect.bottom <= rect.top) return false;
  return rect.top < fenetre.h * 0.78 && rect.bottom > fenetre.h * 0.22 && rect.right > 0 && rect.left < fenetre.w;
}

/** Rang (0..n-1) tiré dans [0, 1[ ; -1 s'il n'y a rien à voir. */
export function rangDe(u: number, n: number): number {
  return n > 0 ? Math.min(n - 1, Math.floor(u * n)) : -1;
}
