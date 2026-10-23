import { describe, expect, it } from "vitest";
import {
  COMPORTEMENTS,
  ENVIES_DEPART,
  JOURNAL_MAX,
  SILHOUETTES_JEU,
  ajouterFait,
  apresComportement,
  candidats,
  choisirComportement,
  entre,
  envieDeBouger,
  majEnvies,
  type ContexteChoix,
  type ContexteEnvies,
} from "../src/cerveau.js";
import { ST } from "../src/moteur/moteur.js";
import { ecrireCerveau, lireCerveau } from "../src/stockage.js";

const repos: ContexteEnvies = { dort: false, occupee: false, auRepos: true, secondesDepuisDecision: 0, inquietude: 0 };
const choix: ContexteChoix = {
  curseurRecent: false,
  cibles: 0,
  parole: false,
  relance: false,
  humeur: "curieux",
  tranquille: false,
  loinDeLaMaison: false,
  deplacement: true,
  secondesDepuisParole: 999,
};
const ids = (c: ContexteChoix, e = ENVIES_DEPART): string[] => candidats(e, c).map((x) => x.id);

describe("majEnvies", () => {
  it("au repos l'énergie remonte, la curiosité et le besoin de compagnie aussi", () => {
    const e = majEnvies(ENVIES_DEPART, 10, repos);
    expect(e.energie).toBeCloseTo(0.85 + 0.014, 5);
    expect(e.curiosite).toBeCloseTo(0.35 + 0.03, 5);
    expect(e.social).toBeCloseTo(0.45 + 0.024, 5);
    expect(e.ennui).toBeCloseTo(0.15 + 0.03, 5);
  });

  it("le besoin de compagnie monte plus vite après 30 s sans rien décider", () => {
    const vite = majEnvies(ENVIES_DEPART, 10, { ...repos, secondesDepuisDecision: 31 });
    expect(vite.social).toBeCloseTo(0.45 + 0.064, 5);
  });

  it("occupée, elle se fatigue et s'ennuie moins ; endormie, elle récupère vite", () => {
    const occupee = majEnvies(ENVIES_DEPART, 10, { ...repos, auRepos: false, occupee: true });
    expect(occupee.energie).toBeCloseTo(0.85 - 0.025, 5);
    expect(occupee.ennui).toBeCloseTo(0.15 - 0.03, 5);
    const dort = majEnvies({ ...ENVIES_DEPART, energie: 0.2 }, 2, { ...repos, dort: true });
    expect(dort.energie).toBeCloseTo(0.3, 5);
  });

  it("reste toujours entre 0 et 1", () => {
    const e = majEnvies({ ...ENVIES_DEPART, energie: 0.999, social: 0.999 }, 100, repos);
    expect(e.energie).toBe(1);
    expect(e.social).toBe(1);
    const bas = majEnvies({ ...ENVIES_DEPART, energie: 0.001, ennui: 0.001 }, 100, { ...repos, auRepos: false, occupee: true });
    expect(bas.energie).toBe(0);
    expect(bas.ennui).toBe(0);
  });

  it("l'inquiétude suit celle de l'hôte, la joie revient vers 0,25", () => {
    const e = majEnvies({ ...ENVIES_DEPART, joie: 1 }, 1, { ...repos, inquietude: 1 });
    expect(e.inquiet).toBeCloseTo(0.35, 5);
    expect(e.joie).toBeCloseTo(1 - 0.75 * 0.02, 5);
  });

  it("ne modifie pas ses entrées", () => {
    const avant = { ...ENVIES_DEPART };
    majEnvies(ENVIES_DEPART, 5, repos);
    expect(ENVIES_DEPART).toEqual(avant);
  });
});

describe("apresComportement", () => {
  it("promener soulage l'ennui, suivre la compagnie, causer aussi", () => {
    expect(apresComportement(ENVIES_DEPART, "promener").ennui).toBe(0);
    expect(apresComportement(ENVIES_DEPART, "suivre").social).toBeCloseTo(0.2, 5);
    expect(apresComportement(ENVIES_DEPART, "causer").social).toBeCloseTo(0.1, 5);
    expect(apresComportement(ENVIES_DEPART, "relancer").social).toBeCloseTo(0.1, 5);
    expect(apresComportement(ENVIES_DEPART, "voir").curiosite).toBeCloseTo(0.15, 5);
    expect(apresComportement(ENVIES_DEPART, "jouer").joie).toBeCloseTo(0.25, 5);
  });

  it("repos ne change rien", () => {
    expect(apresComportement(ENVIES_DEPART, "repos")).toEqual(ENVIES_DEPART);
  });
});

describe("candidats", () => {
  it("sans rien autour, elle peut jouer ou se reposer, et se promener si elle a le droit", () => {
    expect(ids(choix)).toEqual(["promener", "jouer", "repos"]);
    expect(ids({ ...choix, deplacement: false })).toEqual(["jouer", "repos"]);
  });

  it("voir demande un élément et de la curiosité", () => {
    expect(ids({ ...choix, cibles: 2 })).not.toContain("voir");
    expect(ids({ ...choix, cibles: 2 }, { ...ENVIES_DEPART, curiosite: 0.6 })).toContain("voir");
    expect(ids({ ...choix, cibles: 0 }, { ...ENVIES_DEPART, curiosite: 0.6 })).not.toContain("voir");
  });

  it("suivre demande un curseur récent, et pas la fatigue", () => {
    expect(ids({ ...choix, curseurRecent: true })).toContain("suivre");
    expect(ids({ ...choix, curseurRecent: true, humeur: "fatigue" })).not.toContain("suivre");
  });

  it("causer et relancer attendent 90 s depuis sa dernière parole", () => {
    const parle = { ...choix, parole: true, relance: true };
    expect(ids({ ...parle, secondesDepuisParole: 89 })).not.toContain("causer");
    expect(ids(parle)).toEqual(expect.arrayContaining(["causer", "relancer"]));
    expect(ids({ ...parle, relance: false })).not.toContain("relancer");
    expect(ids({ ...choix, secondesDepuisParole: 999 })).not.toContain("causer");
  });

  it("rentrer seulement quand elle est loin et pas tranquille", () => {
    expect(ids({ ...choix, loinDeLaMaison: true })).toContain("rentrer");
    expect(ids({ ...choix, loinDeLaMaison: true, tranquille: true })).not.toContain("rentrer");
    expect(ids({ ...choix, loinDeLaMaison: true, deplacement: false })).not.toContain("rentrer");
  });

  it("tranquille : plus de déplacement", () => {
    expect(ids({ ...choix, tranquille: true, cibles: 3, curseurRecent: true }, { ...ENVIES_DEPART, curiosite: 0.8 })).toEqual(["jouer", "repos"]);
  });

  it("dormir apparaît quand l'énergie est basse, avec un poids qui grandit", () => {
    expect(ids(choix)).not.toContain("dormir");
    const peu = candidats({ ...ENVIES_DEPART, energie: 0.25 }, choix).find((c) => c.id === "dormir");
    const rien = candidats({ ...ENVIES_DEPART, energie: 0.05 }, choix).find((c) => c.id === "dormir");
    expect(peu?.poids).toBeCloseTo(1.25, 5);
    expect(rien?.poids).toBeGreaterThan(peu?.poids ?? 99);
  });

  it("toutes les clés sont des comportements connus", () => {
    const tout = ids(
      { ...choix, cibles: 1, curseurRecent: true, parole: true, relance: true, loinDeLaMaison: true },
      { ...ENVIES_DEPART, curiosite: 0.8, energie: 0.1 },
    );
    for (const id of tout) expect(COMPORTEMENTS).toContain(id);
    expect(new Set(tout).size).toBe(tout.length);
  });
});

describe("envie de bouger avec l'immobilité", () => {
  it("rien avant 40 s, puis elle monte jusqu'à 1,2", () => {
    expect(envieDeBouger(undefined)).toBe(0);
    expect(envieDeBouger(40)).toBe(0);
    expect(envieDeBouger(65)).toBeCloseTo(0.5);
    expect(envieDeBouger(1000)).toBe(1.2);
  });

  it("après 100 s sans bouger, se promener pèse plus que se reposer ; avant 40 s, non", () => {
    const poids = (s: number, id: string): number => candidats(ENVIES_DEPART, { ...choix, secondesImmobile: s }).find((c) => c.id === id)?.poids ?? 0;
    expect(poids(10, "promener")).toBeLessThan(poids(10, "repos"));
    expect(poids(100, "promener")).toBeGreaterThan(poids(100, "repos"));
  });

  it("elle ne s'applique pas quand elle n'a pas le droit de se déplacer", () => {
    expect(ids({ ...choix, deplacement: false, secondesImmobile: 200 })).not.toContain("promener");
  });
});

describe("choisirComportement", () => {
  const liste = [
    { id: "jouer" as const, poids: 0.5 },
    { id: "repos" as const, poids: 0.5 },
  ];

  it("est déterministe avec un hasard injecté", () => {
    expect(choisirComportement(liste, () => 0)).toBe("jouer");
    expect(choisirComportement(liste, () => 0.99)).toBe("repos");
    expect(choisirComportement(liste, () => 0.3)).toBe(choisirComportement(liste, () => 0.3));
  });

  it("la pesée de ses intentions multiplie chaque poids : ce qu'elle veut faire passe devant", () => {
    const pesee = (id: string): number => (id === "repos" ? 20 : 1);
    expect(choisirComportement(liste, () => 0.3)).toBe("jouer");
    expect(choisirComportement(liste, () => 0.3, null, pesee)).toBe("repos");
    expect(choisirComportement(liste, () => 0.3, null, () => 1)).toBe("jouer");
  });

  it("un poids plus fort passe plus souvent", () => {
    const forte = [
      { id: "jouer" as const, poids: 3 },
      { id: "repos" as const, poids: 0 },
    ];
    expect(choisirComportement(forte, () => 0.9)).toBe("jouer");
  });

  it("le comportement en cours pèse 0,5 de moins", () => {
    expect(choisirComportement(liste, () => 0.5)).toBe("jouer");
    expect(choisirComportement(liste, () => 0.5, "jouer")).toBe("repos");
  });

  it("une liste vide rend le repos", () => {
    expect(choisirComportement([], () => 0.5)).toBe("repos");
  });
});

describe("journal et silhouettes de jeu", () => {
  it("ajouterFait garde les derniers faits, sans modifier la liste d'origine", () => {
    let j: ReturnType<typeof ajouterFait> = [];
    const depart = j;
    for (let i = 0; i < JOURNAL_MAX + 5; i++) j = ajouterFait(j, { t: i, quoi: "repos" });
    expect(j).toHaveLength(JOURNAL_MAX);
    expect(j[0]?.t).toBe(5);
    expect(j.at(-1)?.t).toBe(JOURNAL_MAX + 4);
    expect(depart).toEqual([]);
  });

  it("entre reste dans l'intervalle", () => {
    expect(entre(() => 0, 3.6, 5.6)).toBe(3.6);
    expect(entre(() => 0.5, 8, 16)).toBe(12);
  });

  it("chaque silhouette de jeu existe dans le moteur", () => {
    for (const [humeur, liste] of Object.entries(SILHOUETTES_JEU)) {
      for (const s of liste) expect(ST, `${humeur} : ${s}`).toContain(s);
    }
  });
});

describe("mémoire du cerveau", () => {
  it("relit ce qu'elle a écrit", () => {
    const c = { envies: { ...ENVIES_DEPART, joie: 0.7 }, journal: [{ t: 5, quoi: "jouer" as const }] };
    ecrireCerveau("hub", c);
    expect(lireCerveau("hub")).toEqual(c);
  });

  it.each([
    ["JSON cassé", "{pas du json"],
    ["pas un objet", "42"],
    ["envie hors bornes", JSON.stringify({ envies: { ...ENVIES_DEPART, joie: 2 }, journal: [] })],
    ["envie absente", JSON.stringify({ envies: { energie: 1 }, journal: [] })],
    ["journal absent", JSON.stringify({ envies: ENVIES_DEPART })],
  ])("ignore une valeur invalide (%s)", (_nom, valeur) => {
    localStorage.setItem("lia-ui:x:cerveau", valeur);
    expect(lireCerveau("x")).toBeNull();
  });

  it("écarte les faits invalides et garde les 20 derniers", () => {
    const journal = [
      { t: "hier", quoi: "jouer" },
      { t: 1, quoi: "danser" },
      ...Array.from({ length: 30 }, (_, i) => ({ t: i, quoi: "repos" })),
    ];
    localStorage.setItem("lia-ui:y:cerveau", JSON.stringify({ envies: ENVIES_DEPART, journal }));
    const lu = lireCerveau("y");
    expect(lu?.journal).toHaveLength(JOURNAL_MAX);
    expect(lu?.journal.every((f) => f.quoi === "repos")).toBe(true);
  });
});
