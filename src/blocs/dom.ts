/**
 * Fabrique DOM et SVG des blocs. Aucun HTML injecté : tout texte entre par `textContent`
 * (verrou : `tests/blocs.test.ts`). Les couleurs passent par des variables `--lia-*`.
 */

const NS = "http://www.w3.org/2000/svg";

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, classe?: string, texte?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

/** Un élément SVG ; `couleur` va dans `style` (une variable CSS n'est pas lue dans un attribut). */
export function s(tag: string, attrs: Record<string, string | number>, couleur?: { fill?: string; stroke?: string }): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === "number" ? String(Math.round(v * 10) / 10) : v);
  if (couleur?.fill) e.style.setProperty("fill", couleur.fill);
  if (couleur?.stroke) e.style.setProperty("stroke", couleur.stroke);
  return e;
}

/** Une toile SVG lisible par un lecteur d'écran : `role="img"` et un résumé des données. */
export function toile(l: number, ht: number, resume: string): SVGSVGElement {
  const t = s("svg", { viewBox: `0 0 ${l} ${ht}`, role: "img", class: "lia-bloc__toile" }) as SVGSVGElement;
  t.setAttribute("aria-label", resume);
  return t;
}

export function texteSvg(x: number, y: number, contenu: string, classe = "lia-bloc__etiq", ancre = "middle"): SVGElement {
  const t = s("text", { x, y, class: classe, "text-anchor": ancre });
  t.textContent = contenu;
  return t;
}

/** Couleurs de séries, dans l'ordre : action de LIA, info, réussite, attention. */
export const SERIES = ["var(--lia-accent)", "var(--lia-info)", "var(--lia-ok)", "var(--lia-warn)"] as const;
export const serie = (i: number): string => SERIES[i % SERIES.length] ?? "var(--lia-accent)";

export const nombre = (n: number): string => n.toLocaleString("fr-CA", { maximumFractionDigits: 2 });
export const avecUnite = (n: number, unite?: string): string => (unite ? `${nombre(n)} ${unite}` : nombre(n));

/** Date du bloc lisible en français ; une date seule est lue en UTC pour ne pas changer de jour. */
export function jour(d: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})(T.*)?$/.exec(d);
  if (!m) return d;
  const date = new Date(m[2] ? d : `${m[1]}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return d;
  const opts: Intl.DateTimeFormatOptions = m[2]
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
  return date.toLocaleString("fr-CA", opts);
}

/** Arc de cercle (angles en radians, 0 = 3 h, sens horaire). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
}

/** Une barre horizontale en HTML : libellé, piste, valeur. `part` entre 0 et 1. */
export function ligneBarre(lib: string, part: number, valeur: string, couleur = "var(--lia-accent)"): HTMLElement {
  const l = h("div", "lia-bloc__ligne");
  l.append(h("span", "lia-bloc__lib", lib));
  const piste = h("span", "lia-bloc__piste");
  const barre = h("span", "lia-bloc__barre");
  barre.style.width = `${Math.max(0, Math.min(1, part)) * 100}%`;
  barre.style.background = couleur;
  piste.append(barre);
  l.append(piste, h("span", "lia-bloc__val", valeur));
  return l;
}
