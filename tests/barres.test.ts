import { describe, expect, it } from "vitest";
import { estBarre, lireBarres } from "../src/barres.js";
import { decrireParDefaut, elementVise, SELECTEUR_ELEMENTS } from "../src/ecran.js";

const html = (corps: string): HTMLElement => {
  document.body.innerHTML = corps;
  return document.body;
};
const el = (sel: string): Element => document.querySelector(sel)!;
const couche = { contains: () => false };

// Comme « Du Drive à la mémoire » de DriveAI : le nom et la valeur sont dans le texte de la ligne, la barre est une marque vide.
const ENTONNOIR =
  '<ol id="entonnoir">' +
  '<li id="l1"><span>Fichiers vus</span> <strong>1 240</strong><span id="b1" aria-hidden="true" style="width: 100%"></span></li>' +
  '<li id="l2"><span>Classés</span> <strong>940</strong><span id="b2" aria-hidden="true" style="width: 76%"></span></li>' +
  '<li id="l3"><span>En mémoire</span> <strong>310</strong><span id="b3" aria-hidden="true" style="width: 25.5%"></span></li>' +
  "</ol>";

describe("estBarre", () => {
  it("reconnaît une marque vide à pourcentage en ligne, <progress>, <meter> et role=progressbar", () => {
    html(
      '<span id="a" style="width: 40%"></span><span id="h" style="height: 12%"></span><progress id="p" value="3" max="4"></progress>' +
        '<meter id="m" value="5" min="0" max="10"></meter><div id="r" role="progressbar" aria-valuenow="30"></div>',
    );
    for (const id of ["a", "h", "p", "m", "r"]) expect(estBarre(document.getElementById(id)!), id).toBe(true);
  });

  it("refuse ce qui n'est pas une barre : conteneur, texte, pixels, image, champ, progression indéterminée", () => {
    html(
      '<div id="piste" style="width: 100%"><span id="f" style="width: 30%"></span></div><span id="t" style="width: 30%">30 %</span>' +
        '<span id="px" style="width: 30px"></span><img id="i" style="width: 50%" alt=""><input id="c" style="width: 100%"><progress id="ind"></progress>',
    );
    for (const id of ["piste", "t", "px", "i", "c", "ind"]) expect(estBarre(document.getElementById(id)!), id).toBe(false);
    expect(estBarre(document.getElementById("f")!)).toBe(true);
  });
});

describe("lireBarres", () => {
  it("lit chaque ligne d'un entonnoir en <ol> : son texte et la largeur de sa barre, avec la mise en garde", () => {
    html(ENTONNOIR);
    const r = lireBarres(el("#entonnoir"))!;
    expect(r).toContain("proportion dessinée, pas la valeur mesurée");
    expect(r).toContain("« Fichiers vus 1 240 » : barre de 100 % de largeur");
    expect(r).toContain("« Classés 940 » : barre de 76 % de largeur");
    expect(r).toContain("« En mémoire 310 » : barre de 25.5 % de largeur");
    expect(r.indexOf("Fichiers vus")).toBeLessThan(r.indexOf("Classés"));
  });

  it("met la ligne visée d'abord, une seule fois, puis les autres", () => {
    html(ENTONNOIR);
    const r = lireBarres(el("#l2"))!;
    expect(r).toContain("ligne visée « Classés 940 » : barre de 76 % de largeur ; autres lignes :");
    expect(r.match(/Classés 940/g)).toHaveLength(1);
    expect(r).toContain("Fichiers vus 1 240");
    expect(r).toContain("En mémoire 310");
  });

  it("une cible qui est la barre elle-même lit sa ligne", () => {
    html(ENTONNOIR);
    expect(lireBarres(el("#b3"))).toContain("ligne visée « En mémoire 310 »");
  });

  it("lit les <progress> et les role=progressbar d'après leurs attributs", () => {
    html(
      '<ul><li id="a">Import <progress value="3" max="4"></progress></li>' +
        '<li>Analyse <div role="progressbar" aria-valuenow="30" aria-valuemin="10" aria-valuemax="110"></div></li>' +
        '<li>Jauge <meter value="5" min="0" max="10"></meter></li></ul>',
    );
    const r = lireBarres(el("#a"))!;
    expect(r).toContain("ligne visée « Import » : barre de 75 % de largeur");
    expect(r).toContain("« Analyse » : barre de 20 % de largeur");
    expect(r).toContain("« Jauge » : barre de 50 % de largeur");
  });

  it("lit un tableau : une barre par ligne <tr>, plusieurs barres dans une ligne", () => {
    html(
      "<table><tbody>" +
        '<tr><td>Loyer</td><td>1 200 $</td><td><span style="width: 80%"></span><span style="width: 10%"></span></td></tr>' +
        '<tr><td>Épicerie</td><td>600 $</td><td><span style="width: 40%"></span></td></tr>' +
        "</tbody></table>",
    );
    const r = lireBarres(el("table"))!;
    expect(r).toContain("« Loyer 1 200 $ » : barres de 80 %, 10 %");
    expect(r).toContain("« Épicerie 600 $ » : barre de 40 % de largeur");
    expect(r).not.toContain("ligne visée");
  });

  it("une colonne d'histogramme en div (hauteur en %) se lit avec le texte de sa colonne", () => {
    html(
      '<div id="histo"><div class="col"><span style="height: 60%"></span><small>lun.</small></div><div class="col"><span style="height: 20%"></span><small>mar.</small></div></div>',
    );
    const r = lireBarres(el("#histo"))!;
    expect(r).toContain("« lun. » : barre de 60 % de largeur");
    expect(r).toContain("« mar. » : barre de 20 % de largeur");
  });

  it("sans barre, rien : une liste ordinaire se lit comme avant", () => {
    html('<ul id="u"><li>un</li><li>deux</li></ul><p id="p" style="width: 50%">texte</p>');
    expect(lireBarres(el("#u"))).toBeUndefined();
    expect(lireBarres(el("#p"))).toBeUndefined();
  });

  it("borne : au plus 14 lignes, 1 200 caractères, et dit combien d'autres existent", () => {
    html(
      "<ol>" +
        Array.from({ length: 40 }, (_, i) => `<li>ligne ${i} ${"x".repeat(200)}<span style="width: ${i + 1}%"></span></li>`).join("") +
        "</ol>",
    );
    const r = lireBarres(el("ol"))!;
    expect(r.length).toBeLessThan(1200);
    expect(r).toMatch(/… et \d+ lignes? de plus/);
    expect((r.match(/barre de/g) ?? []).length).toBeLessThanOrEqual(14);
  });

  it("rend des lignes sans texte honnêtement", () => {
    html('<ol><li id="v"><span style="width: 30%"></span></li></ol>');
    expect(lireBarres(el("#v"))).toContain("« sans texte » : barre de 30 % de largeur");
  });
});

describe("décrire et viser une barre", () => {
  it("un clic sur la barre vise sa ligne (comme une icône vise son bouton)", () => {
    html(ENTONNOIR);
    expect(elementVise(el("#b2"), SELECTEUR_ELEMENTS, couche)?.id).toBe("l2");
  });

  it("une barre sans ligne se vise elle-même ; une marque vide sans pourcentage garde son comportement d'avant", () => {
    html('<div><span id="seule" style="width: 40%"></span><span id="point"></span></div>');
    expect(elementVise(el("#seule"), SELECTEUR_ELEMENTS, couche)?.id).toBe("seule");
    expect(elementVise(el("#point"), SELECTEUR_ELEMENTS, couche)?.id).toBe("point");
  });

  it("une barre dans un bouton vise le bouton", () => {
    html('<button id="b">Importer<span id="x" style="width: 30%"></span></button>');
    expect(elementVise(el("#x"), SELECTEUR_ELEMENTS, couche)?.id).toBe("b");
  });

  it("la description d'une ligne porte les barres dans `donnees`", () => {
    html(ENTONNOIR);
    const d = decrireParDefaut(el("#l2"));
    expect(d.genre).toBe("une ligne de liste");
    expect(d.texte).toContain("Classés");
    expect(d.donnees).toContain("ligne visée « Classés 940 » : barre de 76 % de largeur");
  });

  it("les faits de l'hôte passent avant la lecture des barres", () => {
    html(`<ol data-lia-donnees="Faits de l'hôte : 940 classés sur 1 240"><li id="l"><span>Classés</span><span style="width: 76%"></span></li></ol>`);
    expect(decrireParDefaut(el("#l")).donnees).toBe("Faits de l'hôte : 940 classés sur 1 240");
  });
});
