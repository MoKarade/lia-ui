/**
 * Où poser la boîte de discussion quand elle parle d'un élément de la page : jamais par-dessus lui
 * (Marc, 24/10 : « la popup n'est pas sur le bon endroit »). Fonction pure, sans DOM : coordonnées de la couche.
 */

export interface Boite {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Surface commune de deux boîtes, marge comprise sur la seconde (0 = elles ne se touchent pas). */
export function surfaceRecouverte(a: Boite, b: Boite, marge = 6): number {
  const l = Math.min(a.x + a.w, b.x + b.w + marge) - Math.max(a.x, b.x - marge);
  const h = Math.min(a.y + a.h, b.y + b.h + marge) - Math.max(a.y, b.y - marge);
  return l > 0 && h > 0 ? l * h : 0;
}

/**
 * Le premier candidat (déjà dans l'ordre de préférence) qui ne recouvre pas l'élément ; sinon celui qui en recouvre le moins ;
 * sans élément, le premier. `candidats` n'est jamais vide.
 */
export function placeSansRecouvrir<T extends Boite>(candidats: readonly T[], element: Boite | null): T {
  const premier = candidats[0];
  if (!premier) throw new Error("placeSansRecouvrir : aucun candidat");
  if (!element) return premier;
  let meilleur = premier;
  let surface = surfaceRecouverte(premier, element);
  for (const c of candidats) {
    const s = surfaceRecouverte(c, element);
    if (s === 0) return c;
    if (s < surface) {
      meilleur = c;
      surface = s;
    }
  }
  return meilleur;
}
