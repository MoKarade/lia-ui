/**
 * Ce que LIA lit d'un graphique dessiné en HTML (Marc, 28/10/2026 : « l'assistant voit toujours pas les graphes, il devrait »).
 * Un entonnoir, une ventilation ou une jauge faits de `<span style="width: 76%">` n'ont ni SVG ni texte propre : la barre est
 * une marque vide, `aria-hidden`, et le nom et la valeur sont dans le texte de sa ligne (`li`, `tr`). On lit donc, ligne par
 * ligne, le texte de la ligne et la largeur dessinée de sa barre, sans rien calculer ni deviner : la largeur est une proportion
 * (souvent celle de la plus grande barre), jamais la valeur mesurée, et on le dit.
 * Les faits écrits par l'hôte (`data-lia-donnees`) et la lecture d'un SVG (`lireGraphique`) passent avant.
 * Pur : lit l'élément qu'on lui passe, ni réseau ni horloge.
 */

/** Une barre native ou ARIA : sa valeur est dans ses attributs. */
const BARRES_NATIVES = "progress, meter, [role='progressbar'], [role='meter']";
/** Une marque vide dont la largeur ou la hauteur est un pourcentage écrit en ligne. */
const MARQUES_EN_LIGNE = "[style*='%']";
/** Une ligne d'une liste ou d'un tableau : l'unité qui porte le nom et la valeur de sa barre. */
export const LIGNES = "li, tr, [role='listitem'], [role='row']";
const LISTES = "ol, ul, table, [role='list'], [role='table'], [role='grid']";
/** Ce qui n'est jamais une barre même avec un pourcentage en ligne. */
const PAS_UNE_BARRE = "img, svg, canvas, picture, video, input, textarea, select, hr, br, iframe";

const MAX_LIGNES = 14;
const MAX_LIBELLE_VISEE = 120;
const MAX_LIBELLE = 70;
/** Sous la borne des faits d'un élément (1 200 dans `ecran.ts`), avec la mise en garde en tête. */
const MAX_TOTAL = 1100;

function propre(brut: string | null | undefined, max: number): string {
  const t = (brut ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Le pourcentage écrit en ligne (`width: 76%` ou `height: 40%`), tel quel ; `undefined` si la largeur et la hauteur n'en sont pas un. */
function pourcentageEnLigne(e: Element): string | undefined {
  const style = (e as HTMLElement).style;
  if (!style) return undefined;
  for (const brut of [style.width, style.height]) {
    const m = /^(\d+(?:\.\d+)?)%$/.exec((brut ?? "").trim());
    if (m) return `${Number(m[1])} %`;
  }
  return undefined;
}

function nombre(brut: string | null): number | undefined {
  if (brut === null || brut.trim() === "") return undefined;
  const n = Number(brut);
  return Number.isFinite(n) ? n : undefined;
}

/** La part dessinée par une barre native ou ARIA, d'après ses attributs ; `undefined` quand elle est indéterminée. */
function pourcentageNatif(e: Element): string | undefined {
  const tag = e.tagName.toLowerCase();
  const valeur = tag === "progress" || tag === "meter" ? nombre(e.getAttribute("value")) : nombre(e.getAttribute("aria-valuenow"));
  if (valeur === undefined) return undefined;
  const vide = tag === "meter" ? (nombre(e.getAttribute("min")) ?? 0) : tag === "progress" ? 0 : (nombre(e.getAttribute("aria-valuemin")) ?? 0);
  const plein = tag === "meter" ? (nombre(e.getAttribute("max")) ?? 1) : tag === "progress" ? (nombre(e.getAttribute("max")) ?? 1) : (nombre(e.getAttribute("aria-valuemax")) ?? 100);
  if (plein <= vide) return undefined;
  const part = Math.min(100, Math.max(0, ((valeur - vide) / (plein - vide)) * 100));
  return `${Math.round(part)} %`;
}

/** La largeur dessinée d'une barre (« 76 % »), ou `undefined` quand l'élément n'en est pas une. */
function proportion(e: Element): string | undefined {
  if (e.matches(PAS_UNE_BARRE)) return undefined;
  if (e.matches(BARRES_NATIVES)) return pourcentageNatif(e);
  // Une marque en ligne est une feuille vide : un conteneur qui a la largeur d'un pourcentage n'est pas une barre.
  if (e.children.length > 0 || (e.textContent ?? "").trim() !== "") return undefined;
  return pourcentageEnLigne(e);
}

/** Vrai quand l'élément est une barre de graphique HTML (marque vide à pourcentage en ligne, `<progress>`, `<meter>`, `role=progressbar|meter`). */
export function estBarre(e: Element): boolean {
  return proportion(e) !== undefined;
}

function barresDe(racine: Element): Element[] {
  const trouvees = [...racine.querySelectorAll(`${BARRES_NATIVES}, ${MARQUES_EN_LIGNE}`)];
  if (racine.matches(`${BARRES_NATIVES}, ${MARQUES_EN_LIGNE}`)) trouvees.unshift(racine);
  return trouvees.filter(estBarre);
}

/** Les morceaux de texte d'un élément, séparés par une espace : « Loyer » et « 1 200 $ » de deux cellules ne se soudent pas. */
function morceaux(racine: Element): string {
  const ecrits: string[] = [];
  const marche = racine.ownerDocument.createTreeWalker(racine, 4 /* NodeFilter.SHOW_TEXT */);
  for (let n = marche.nextNode(); n; n = marche.nextNode()) ecrits.push(n.textContent ?? "");
  return ecrits.join(" ");
}

/** Le texte visible d'une ligne (dans un navigateur `innerText`, ce que Marc voit). */
function texteDe(ligne: Element, max: number): string {
  const visible = (ligne as HTMLElement).innerText;
  return propre(typeof visible === "string" ? visible : morceaux(ligne), max);
}

/** La ligne d'une barre : son `li`/`tr`, sinon son parent direct (colonne d'un histogramme en `div`). */
function ligneDe(barre: Element): Element | null {
  return barre.closest(LIGNES) ?? barre.parentElement;
}

/**
 * Ce que dessinent les barres HTML de la liste ou du tableau visé, ligne visée d'abord ; `undefined` quand il n'y a pas de barre
 * (une liste ordinaire se lit comme avant). La cible peut être la barre, sa ligne ou la liste entière.
 */
export function lireBarres(cible: Element): string | undefined {
  const vise = estBarre(cible) ? ligneDe(cible) : (cible.closest(LIGNES) ?? cible);
  if (!vise) return undefined;
  const conteneur = vise.closest(LISTES) ?? vise.parentElement;
  if (!conteneur) return undefined;

  const lignes: Array<{ el: Element; barres: string[] }> = [];
  for (const barre of barresDe(conteneur)) {
    const el = ligneDe(barre);
    const p = proportion(barre);
    if (!el || p === undefined) continue;
    const deja = lignes.find((l) => l.el === el);
    if (deja) deja.barres.push(p);
    else lignes.push({ el, barres: [p] });
  }
  if (lignes.length === 0) return undefined;

  const dit = (l: { el: Element; barres: string[] }, max: number): string => {
    const libelle = texteDe(l.el, max);
    const forme = l.barres.length === 1 ? `barre de ${l.barres[0]} de largeur` : `barres de ${l.barres.join(", ")}`;
    return `« ${libelle === "" ? "sans texte" : libelle} » : ${forme}`;
  };

  const visee = lignes.find((l) => l.el === vise || l.el.contains(vise));
  const autres = lignes.filter((l) => l !== visee);
  const tete =
    "Lu dans les barres de la page (la largeur d'une barre est une proportion dessinée, pas la valeur mesurée : la valeur est dans le texte de sa ligne ; ne rien calculer ni deviner) —";
  const debut = `${tete}${visee ? ` ligne visée ${dit(visee, MAX_LIBELLE_VISEE)} ;` : ""} ${visee ? "autres lignes" : "lignes"} :`;
  const listees: string[] = [];
  for (const l of autres) {
    if (listees.length >= MAX_LIGNES) break;
    const bout = dit(l, MAX_LIBELLE);
    if (debut.length + listees.join(" | ").length + bout.length + 4 > MAX_TOTAL) break;
    listees.push(bout);
  }
  const reste = autres.length - listees.length;
  const suite = reste > 0 ? [...listees, `… et ${reste} ligne${reste > 1 ? "s" : ""} de plus`] : listees;
  return `${debut}${suite.length > 0 ? ` ${suite.join(" | ")}` : " aucune"}.`;
}
