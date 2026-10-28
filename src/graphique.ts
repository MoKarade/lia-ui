/**
 * Ce que LIA lit d'un graphique SVG (Marc, 28/10/2026 : « l'assistant voit toujours pas les graphes, il devrait »).
 * Un graphique dessiné en SVG (Recharts, tracé maison) n'a presque pas de texte visible pour le navigateur, mais son DOM
 * porte ce que l'auteur a écrit : titre, étiquettes d'axes, légende, valeurs en infobulle (`<title>`, `aria-label`, `data-tip`).
 * On les rassemble, sans rien calculer ni inventer : un point sans étiquette n'a pas de valeur lisible, et on le dit.
 * Les faits écrits par l'hôte (`data-lia-donnees`) passent avant : ils sont plus complets (la série elle-même).
 * Pur : lit l'élément qu'on lui passe, ni réseau ni horloge.
 */

/** Le graphique visé : le SVG qui contient la cible, ou celui d'une figure ou d'un conteneur de graphique. */
function svgDe(cible: Element): Element | null {
  const dedans = cible.closest("svg");
  if (dedans) return dedans;
  return cible.matches("figure, [class*='chart'], [class*='graph'], [class*='recharts']") ? cible.querySelector("svg") : null;
}

function propre(brut: string | null | undefined, max: number): string {
  const t = (brut ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Les textes distincts d'une liste d'éléments, dans l'ordre du document, au plus `n`, chacun borné à `max`. */
function distincts(els: Iterable<Element>, lire: (e: Element) => string, n: number, max: number): string[] {
  const vus = new Set<string>();
  for (const e of els) {
    const t = propre(lire(e), max);
    if (t !== "" && !vus.has(t)) vus.add(t);
    if (vus.size >= n) break;
  }
  return [...vus];
}

/** Ce que le graphique écrit, ou `undefined` quand il n'écrit rien de lisible (canvas, SVG sans texte ni repère). */
export function lireGraphique(cible: Element): string | undefined {
  const svg = svgDe(cible);
  if (!svg) return undefined;
  const racine = svg.closest(".recharts-wrapper, figure") ?? svg;

  const nom = propre(
    svg.getAttribute("aria-label") ?? svg.querySelector(":scope > title")?.textContent ?? racine.querySelector("figcaption")?.textContent,
    120,
  );
  const textes = distincts(svg.querySelectorAll("text"), (e) => e.textContent ?? "", 30, 32);
  const legende = distincts(racine.querySelectorAll(".recharts-legend-item-text"), (e) => e.textContent ?? "", 12, 40);
  const reperes = distincts(
    racine.querySelectorAll("[aria-label], [data-tip], svg title"),
    (e) => (e.tagName.toLowerCase() === "title" ? e.textContent : (e.getAttribute("data-tip") ?? e.getAttribute("aria-label"))) ?? "",
    20,
    80,
  ).filter((r) => r !== nom);

  if (textes.length === 0 && legende.length === 0 && reperes.length === 0) return undefined;
  const parties = [
    nom !== "" && `nom : ${nom}`,
    textes.length > 0 && `textes du graphique (axes, étiquettes) : ${textes.join(" · ")}`,
    legende.length > 0 && `légende : ${legende.join(" · ")}`,
    reperes.length > 0 && `repères (valeurs en infobulle) : ${reperes.join(" | ")}`,
  ].filter(Boolean);
  // La mise en garde d'abord : si le total dépasse la borne des faits, c'est la fin de la liste qui est coupée, pas elle.
  return `Lu dans le graphique (une valeur qu'il n'écrit pas n'est pas lisible : ne pas la deviner) — ${parties.join(" ; ")}.`;
}
