// tests/blocs.test.ts — le rendu des 22 formes de réponse. Données FICTIVES.
// Les exemples valides sont ceux de MemoryAI (`tests/liaBlocs.test.ts`), validés là-bas par le schéma.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CSS_BLOCS, MAX_BLOCS, TYPES_BLOCS, rendreBlocs } from "../src/blocs/index";

const F1 = "0f0e0d0c-0b0a-4908-8706-050403020100";
const s = { sources: [F1] };

const EXEMPLES: Record<string, Record<string, unknown>> = {
  carte: { type: "carte", ...s, points: [{ lat: 46.81, lon: -71.21, libelle: "Lieu fictif" }, { lat: 46.8, lon: -71.3, libelle: "Autre lieu" }] },
  chrono: { type: "chrono", ...s, evenements: [{ date: "2030-01-31", libelle: "Fin du bail" }, { date: "2030-02-01", libelle: "Déménagement" }], actuel: 1 },
  liste: { type: "liste", ...s, elements: [{ libelle: "Renouveler le permis", fait: false }, { libelle: "Payer", fait: true }] },
  chat: { type: "chat", ...s, messages: [{ de: "Personne A", texte: "On se voit mardi ?", quand: "2030-03-01T10:00:00Z" }] },
  courbe: { type: "courbe", ...s, unite: "kWh", series: [{ nom: "Recharge", points: [{ x: "lun", y: 12 }, { x: "mar", y: 9 }] }] },
  barres: { type: "barres", ...s, barres: [{ libelle: "Janvier", valeur: 3 }, { libelle: "Février", valeur: -1 }] },
  camembert: { type: "camembert", ...s, parts: [{ libelle: "A", valeur: 1 }, { libelle: "B", valeur: 3 }] },
  jauge: { type: "jauge", ...s, libelle: "Batterie", unite: "%", valeur: 60, min: 0, max: 100 },
  chiffre: { type: "chiffre", ...s, libelle: "Faits validés", valeur: 42, variation: 3 },
  tableau: { type: "tableau", ...s, colonnes: ["Papier", "Année"], lignes: [["Avis fictif", "2029"]] },
  calendrier: { type: "calendrier", ...s, jours: [{ date: "2030-03-01", intensite: 0.5, libelle: "Souper" }] },
  reseau: { type: "reseau", ...s, noeuds: [{ id: "a", libelle: "A" }, { id: "b", libelle: "B" }], liens: [{ a: "a", b: "b" }] },
  comparaison: { type: "comparaison", ...s, colonnes: [{ libelle: "Offre 1", lignes: [{ cle: "Prix", valeur: "10" }] }, { libelle: "Offre 2", lignes: [{ cle: "Prix", valeur: "12" }] }] },
  radar: { type: "radar", ...s, axes: ["x", "y", "z"], series: [{ nom: "S", valeurs: [1, 2, 3] }] },
  entonnoir: { type: "entonnoir", ...s, etapes: [{ libelle: "Vues", valeur: 10 }, { libelle: "Envoyées", valeur: 2 }] },
  flux: { type: "flux", ...s, unite: "$", liens: [{ de: "Revenu", vers: "Loyer", valeur: 5 }] },
  heatmap: { type: "heatmap", ...s, lignes: ["L"], colonnes: ["a", "b"], valeurs: [[1, 2]] },
  kanban: { type: "kanban", ...s, colonnes: [{ libelle: "À faire", cartes: ["x"] }, { libelle: "Fait", cartes: [] }] },
  arbre: { type: "arbre", ...s, racine: { libelle: "Racine", enfants: [{ libelle: "Feuille" }] } },
  document: { type: "document", ...s, libelle: "Avis fictif", emetteur: "Émetteur fictif", date: "2029-05-01", lien: "https://drive.example.com/fictif" },
  cadran: { type: "cadran", ...s, segments: [{ debut: "22:00", fin: "06:00", libelle: "Sommeil" }, { debut: "09:00", fin: "17:00", libelle: "Travail" }], maintenant: "10:30" },
  confirmation: { type: "confirmation", action: { id: "batchchef.creer_batch", libelle: "Créer le batch" }, resume: "Créer le batch de la semaine.", niveau: 2 },
};

/** Pour chaque forme, une variante MAL FORMÉE : elle ne doit rien dessiner. */
const FAUX: Record<string, Record<string, unknown>> = {
  carte: { ...EXEMPLES.carte, points: [{ lat: 120, lon: 0, libelle: "x" }] },
  chrono: { ...EXEMPLES.chrono, actuel: 5 },
  liste: { ...EXEMPLES.liste, elements: [] },
  chat: { ...EXEMPLES.chat, messages: [{ de: "A" }] },
  courbe: { ...EXEMPLES.courbe, series: [{ nom: "S", points: [{ x: "a", y: 1 }] }] },
  barres: { ...EXEMPLES.barres, barres: [{ libelle: "x", valeur: "3" }] },
  camembert: { ...EXEMPLES.camembert, parts: [{ libelle: "A", valeur: 0 }, { libelle: "B", valeur: 0 }] },
  jauge: { ...EXEMPLES.jauge, valeur: 200 },
  chiffre: { ...EXEMPLES.chiffre, valeur: Number.NaN },
  tableau: { ...EXEMPLES.tableau, lignes: [["une seule cellule"]] },
  calendrier: { ...EXEMPLES.calendrier, jours: [{ date: "demain" }] },
  reseau: { ...EXEMPLES.reseau, liens: [{ a: "a", b: "zz" }] },
  comparaison: { ...EXEMPLES.comparaison, colonnes: [{ libelle: "Seule", lignes: [{ cle: "k", valeur: "v" }] }] },
  radar: { ...EXEMPLES.radar, series: [{ nom: "S", valeurs: [1] }] },
  entonnoir: { ...EXEMPLES.entonnoir, etapes: [{ libelle: "x", valeur: -1 }, { libelle: "y", valeur: 1 }] },
  flux: { ...EXEMPLES.flux, liens: [{ de: "a", vers: "b", valeur: 0 }] },
  heatmap: { ...EXEMPLES.heatmap, valeurs: [[1]] },
  kanban: { ...EXEMPLES.kanban, colonnes: [{ libelle: "Seule", cartes: [] }] },
  arbre: { ...EXEMPLES.arbre, racine: { libelle: "1", enfants: [{ libelle: "2", enfants: [{ libelle: "3", enfants: [{ libelle: "4", enfants: [{ libelle: "5" }] }] }] }] } },
  document: { ...EXEMPLES.document, lien: "javascript:alert(1)" },
  cadran: { ...EXEMPLES.cadran, maintenant: "25:00" },
  confirmation: { ...EXEMPLES.confirmation, niveau: 4 },
};

const rendre = (blocs: unknown[], o = {}) => {
  const dans = document.createElement("div");
  return { dans, bilan: rendreBlocs(blocs, dans, o) };
};

describe("les 22 formes", () => {
  it("couvre exactement le catalogue de MemoryAI", () => {
    expect(TYPES_BLOCS).toHaveLength(22);
    expect([...TYPES_BLOCS].sort()).toEqual(Object.keys(EXEMPLES).sort());
    expect(Object.keys(FAUX).sort()).toEqual(Object.keys(EXEMPLES).sort());
  });

  it.each(Object.keys(EXEMPLES))("%s : un bloc valide est dessiné", (type) => {
    const { dans, bilan } = rendre([EXEMPLES[type]]);
    expect(bilan).toEqual({ rendus: 1, ignores: 0 });
    expect(dans.querySelector(`figure.lia-bloc--${type}`)).not.toBeNull();
  });

  it.each(Object.keys(FAUX))("%s : un bloc mal formé n'est pas dessiné, sans exception", (type) => {
    const erreur = vi.spyOn(console, "error");
    const { dans, bilan } = rendre([FAUX[type]]);
    expect(bilan).toEqual({ rendus: 0, ignores: 1 });
    expect(dans.childElementCount).toBe(0);
    expect(erreur).not.toHaveBeenCalled();
  });
});

describe("rendreBlocs", () => {
  it("un type inconnu est ignoré, un bloc faux ne tue pas les autres, au-delà de 20 rien", () => {
    const { dans, bilan } = rendre([{ type: "iframe", ...s }, EXEMPLES.liste, null, "texte", FAUX.jauge]);
    expect(bilan).toEqual({ rendus: 1, ignores: 4 });
    expect(dans.querySelectorAll("figure")).toHaveLength(1);
    expect(rendre(Array.from({ length: MAX_BLOCS + 3 }, () => EXEMPLES.chiffre)).bilan).toEqual({ rendus: MAX_BLOCS, ignores: 3 });
    expect(rendreBlocs("pas une liste" as unknown as unknown[], document.createElement("div"))).toEqual({ rendus: 0, ignores: 0 });
  });

  it("⚠ le texte du modèle reste du texte, jamais du HTML", () => {
    const piege = "<img src=x onerror=alert(1)>";
    const { dans } = rendre([{ ...EXEMPLES.tableau, titre: piege, lignes: [[piege, "2029"]] }]);
    expect(dans.querySelector("img")).toBeNull();
    expect(dans.querySelector("figcaption")?.textContent).toBe(piege);
  });

  it("⚠ aucun innerHTML dans src/blocs", () => {
    const dir = join(__dirname, "../src/blocs");
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), "utf8")).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
  });

  it("les sources deviennent des liens https seulement si l'hôte les donne", () => {
    expect(rendre([EXEMPLES.chiffre]).dans.querySelector(".lia-bloc__sources a")).toBeNull();
    const ok = rendre([EXEMPLES.chiffre], { lienSource: (id: string) => `https://memoire.example.com/fait/${id}` }).dans;
    expect(ok.querySelector<HTMLAnchorElement>(".lia-bloc__sources a")?.href).toBe(`https://memoire.example.com/fait/${F1}`);
    const faux = rendre([EXEMPLES.chiffre], { lienSource: () => "javascript:alert(1)" }).dans;
    expect(faux.querySelector(".lia-bloc__sources a")).toBeNull();
  });

  it("le lien d'un papier est https, ouvert à part", () => {
    const a = rendre([EXEMPLES.document]).dans.querySelector<HTMLAnchorElement>(".lia-bloc__doc a");
    expect(a?.href).toBe("https://drive.example.com/fictif");
    expect(a?.rel).toBe("noopener noreferrer");
  });

  it("une confirmation n'agit que par l'hôte, et une seule fois", () => {
    expect(rendre([EXEMPLES.confirmation]).dans.querySelector("button")).toBeNull();
    const onConfirmer = vi.fn();
    const { dans } = rendre([EXEMPLES.confirmation], { onConfirmer });
    const [ok, non] = [...dans.querySelectorAll("button")];
    ok!.click();
    ok!.click();
    expect(onConfirmer).toHaveBeenCalledTimes(1);
    expect(onConfirmer).toHaveBeenCalledWith({ id: "batchchef.creer_batch", niveau: 2 });
    expect(non!.disabled).toBe(true);
  });

  it("la frise marque l'événement actuel ; un graphique a un résumé lisible", () => {
    const { dans } = rendre([EXEMPLES.chrono, EXEMPLES.camembert]);
    expect(dans.querySelector('[aria-current="step"]')?.textContent).toContain("Déménagement");
    expect(dans.querySelector("svg[role=img]")?.getAttribute("aria-label")).toBe("A 25 %, B 75 %");
  });

  it("les styles s'injectent une fois, couleurs en variables --lia-*, cibles de 44 px", () => {
    rendre([EXEMPLES.liste]);
    rendre([EXEMPLES.liste]);
    expect(document.head.querySelectorAll("style[data-lia-blocs]")).toHaveLength(1);
    expect(CSS_BLOCS).toContain("min-height:44px");
    expect(CSS_BLOCS.replace(/--lia-[a-z0-9-]+:[^;}]+/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
