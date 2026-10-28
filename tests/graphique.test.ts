import { describe, expect, it } from "vitest";
import { decrireParDefaut } from "../src/ecran.js";
import { lireGraphique } from "../src/graphique.js";

const html = (corps: string): HTMLElement => {
  document.body.innerHTML = corps;
  return document.body;
};
const el = (sel: string): Element => document.querySelector(sel)!;

const RECHARTS =
  '<div class="recharts-wrapper"><svg class="recharts-surface" role="application"><g>' +
  '<text>0</text><text>50</text><text>100</text><text>oct. 1</text><text>oct. 15</text><text>oct. 28</text>' +
  '<path class="recharts-line-curve" d="M0,0 L1,1"/></g></svg>' +
  '<ul class="recharts-default-legend"><li><span class="recharts-legend-item-text">Dépenses</span></li><li><span class="recharts-legend-item-text">Revenus</span></li></ul></div>';

describe("lireGraphique", () => {
  it("rassemble les textes d'axes et la légende d'un graphique Recharts, sans valeur inventée", () => {
    html(RECHARTS);
    const r = lireGraphique(el(".recharts-line-curve"))!;
    expect(r).toContain("textes du graphique (axes, étiquettes) : 0 · 50 · 100 · oct. 1 · oct. 15 · oct. 28");
    expect(r).toContain("légende : Dépenses · Revenus");
    expect(r).toContain("ne pas la deviner");
  });

  it("lit le titre, l'aria-label et les infobulles (<title>, data-tip) d'un SVG maison", () => {
    html(
      '<svg role="img" aria-label="Consommation par jour"><title>Consommation par jour</title>' +
        '<rect data-tip="lun. 27 oct. : 12 minutes" width="4" height="9"/><rect data-tip="mar. 28 oct. : 30 minutes" width="4" height="20"/>' +
        '<circle><title>Pic : 30 minutes</title></circle></svg>',
    );
    const r = lireGraphique(el("rect"))!;
    expect(r).toContain("nom : Consommation par jour");
    expect(r).toContain("lun. 27 oct. : 12 minutes | mar. 28 oct. : 30 minutes | Pic : 30 minutes");
    // le nom n'est pas répété dans les repères
    expect(r.match(/Consommation par jour/g)).toHaveLength(1);
  });

  it("un SVG sans aucun texte ni repère, ou un élément qui n'est pas un graphique : rien", () => {
    html('<svg><path d="M0,0 L1,1"/></svg><p id="p">texte</p>');
    expect(lireGraphique(el("path"))).toBeUndefined();
    expect(lireGraphique(el("#p"))).toBeUndefined();
  });

  it("dédoublonne et borne : au plus 30 textes de 32 caractères", () => {
    html(`<svg>${Array.from({ length: 80 }, (_, i) => `<text>t${i % 60} ${"x".repeat(80)}</text>`).join("")}</svg>`);
    const r = lireGraphique(el("svg"))!;
    const textes = r.split("axes, étiquettes) : ")[1]!.replace(/\.$/, "").split(" · ");
    expect(textes.length).toBeLessThanOrEqual(30);
    expect(Math.max(...textes.map((t) => t.length))).toBeLessThanOrEqual(32);
    expect(r.length).toBeLessThan(1200);
  });
});

describe("decrireParDefaut et les graphiques", () => {
  it("un clic sur le graphique envoie ce qu'il écrit dans `donnees`", () => {
    html(RECHARTS);
    expect(decrireParDefaut(el(".recharts-line-curve")).donnees).toContain("légende : Dépenses · Revenus");
  });

  it("les faits écrits par l'hôte (data-lia-donnees) passent avant la lecture du graphique", () => {
    html(`<div data-lia-donnees="Série : 12 relevés, de 3 à 9">${RECHARTS}</div>`);
    expect(decrireParDefaut(el(".recharts-line-curve")).donnees).toBe("Série : 12 relevés, de 3 à 9");
  });

  it("un élément hors graphique n'a pas de `donnees`", () => {
    html("<p id='p'>bonjour</p>");
    expect(decrireParDefaut(el("#p")).donnees).toBeUndefined();
  });
});
