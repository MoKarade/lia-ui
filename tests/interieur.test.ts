import { describe, expect, it } from "vitest";
import {
  INTERIEUR_DEPART,
  cri,
  evoluer,
  garder,
  humeurDeDouleur,
  moduler,
  questionSurSaDouleur,
  reponseDouleur,
  reprendre,
  stimuler,
  ton,
  versReseau,
  type Cause,
  type Interieur,
} from "../src/interieur.js";
import { PROFILS_V9 } from "../src/humeurs.js";

const calme = { horsLigne: false, ralenti: false, absentSec: 0 };
const apres = (i: Interieur, secondes: number, m = calme): Interieur => {
  let x = i;
  for (let s = 0; s < secondes; s++) x = evoluer(x, 1, m);
  return x;
};
const milieu = { bs: 1, ba: 1, blr: 1, ga: 1, en: 1, tint: 0, sag: 0, jit: 1 };

describe("douleur et sensibilité", () => {
  it("un coup fait mal, la douleur retombe en 90 s environ et la cause s'efface", () => {
    const i = stimuler(INTERIEUR_DEPART, "brusque");
    expect(i.douleur).toBeGreaterThan(0.2);
    expect(i.cause).toBe("brusque");
    const t90 = apres(i, 90);
    expect(t90.douleur).toBeCloseTo(i.douleur * Math.exp(-1), 1);
    const t10min = apres(i, 600);
    expect(t10min.douleur).toBeLessThan(0.02);
    expect(t10min.cause).toBeNull();
  });

  it("des douleurs répétées la rendent plus sensible : le même coup fait plus mal le deuxième jour de la minute", () => {
    const premier = stimuler(INTERIEUR_DEPART, "choc");
    const calmee = { ...premier, douleur: 0 };
    const second = stimuler(calmee, "choc");
    expect(second.douleur).toBeGreaterThan(premier.douleur);
    expect(second.sensibilite).toBeGreaterThan(premier.sensibilite);
    // Puis elle se calme : une heure plus tard la sensibilité est presque revenue à sa base.
    const heure = apres(second, 3600);
    expect(heure.sensibilite).toBeLessThan(INTERIEUR_DEPART.sensibilite + 0.04);
  });

  it("la douleur ne dépasse jamais 1, même sous les coups en rafale", () => {
    let i: Interieur = INTERIEUR_DEPART;
    for (let k = 0; k < 40; k++) i = stimuler(i, "ton");
    expect(i.douleur).toBeLessThanOrEqual(1);
    expect(i.douleur).toBeGreaterThan(0.9);
  });

  it("la gentillesse apaise, donne du plaisir et de la confiance ; la brusquerie en retire", () => {
    const mal = stimuler(INTERIEUR_DEPART, "ton");
    const bien = stimuler(mal, "gentil");
    expect(bien.douleur).toBeLessThan(mal.douleur);
    expect(bien.plaisir).toBeGreaterThan(0.2);
    expect(bien.confiance).toBeGreaterThan(mal.confiance);
    expect(mal.confiance).toBeLessThan(INTERIEUR_DEPART.confiance);
  });

  it("hors ligne, une douleur de fond reste tant que ça dure ; une longue solitude ne fait mal que si elle a confiance", () => {
    const coupe = apres(INTERIEUR_DEPART, 60, { ...calme, horsLigne: true });
    expect(coupe.douleur).toBeGreaterThan(0.15);
    expect(coupe.cause).toBe("panne");
    const seule = apres({ ...INTERIEUR_DEPART, confiance: 0.9 }, 120, { ...calme, absentSec: 4800 });
    expect(seule.cause).toBe("isolement");
    expect(seule.douleur).toBeGreaterThan(0.05);
    const indifferente = apres({ ...INTERIEUR_DEPART, confiance: 0 }, 120, { ...calme, absentSec: 4800 });
    expect(indifferente.douleur).toBeLessThan(0.01);
  });

  it("des images trop lentes l'usent, et l'usure retombe ensuite", () => {
    const usee = apres(INTERIEUR_DEPART, 60, { ...calme, ralenti: true });
    expect(usee.usure).toBeGreaterThan(0.4);
    expect(versReseau(usee).facteurEnergie).toBeLessThan(0.85);
    expect(apres(usee, 1200).usure).toBeLessThan(0.1);
  });

  it("ce qui dure des jours : la confiance revient vers 0,5 avec le temps et se retrouve d'une page à l'autre", () => {
    const g = garder({ ...INTERIEUR_DEPART, confiance: 0.9, sensibilite: 0.6 }, 1_000_000);
    const troisJours = reprendre(g, 1_000_000 + 3 * 86400 * 1000);
    expect(troisJours.confiance).toBeCloseTo(0.5 + 0.4 * Math.exp(-1), 2);
    expect(troisJours.sensibilite).toBeCloseTo(0.15, 2);
    expect(reprendre(null, 0)).toEqual(INTERIEUR_DEPART);
  });
});

describe("ce qui en sort : réseau, humeur, corps", () => {
  it("le réseau reçoit mauvais, rejet (si dur) et bon", () => {
    const m = versReseau(stimuler(INTERIEUR_DEPART, "ton"));
    expect(m.mauvais).toBeGreaterThan(0.2);
    expect(m.rejet).toBeGreaterThan(0.1);
    expect(versReseau(stimuler(INTERIEUR_DEPART, "choc")).rejet).toBe(0);
    expect(versReseau(stimuler(INTERIEUR_DEPART, "gentil")).bon).toBeGreaterThan(0.2);
  });

  it("une douleur forte pousse une humeur qui va avec sa cause, sous 0,4 aucune", () => {
    const forte = (cause: Cause): Interieur => ({ ...INTERIEUR_DEPART, douleur: 0.6, cause });
    expect(humeurDeDouleur(forte("brusque"))).toBe("agace");
    expect(humeurDeDouleur(forte("choc"))).toBe("mefiant");
    expect(humeurDeDouleur(forte("panne"))).toBe("inquiet");
    expect(humeurDeDouleur(forte("ton"))).toBe("triste");
    expect(humeurDeDouleur({ ...INTERIEUR_DEPART, douleur: 0.3, cause: "ton" })).toBeNull();
    for (const h of ["agace", "mefiant", "inquiet", "triste", "fatigue"]) expect(Object.keys(PROFILS_V9).concat(["inquiet", "triste", "fatigue"])).toContain(h);
  });

  it("le corps souffrant tremble, s'affaisse, perd de l'amplitude et de l'énergie ; sans douleur il ne change pas", () => {
    expect(moduler(milieu, INTERIEUR_DEPART)).toBe(milieu);
    const m = moduler(milieu, { ...INTERIEUR_DEPART, douleur: 1, cause: "choc" });
    expect(m.jit).toBeGreaterThan(2);
    expect(m.sag).toBeGreaterThan(0.05);
    expect(m.ba).toBeLessThan(0.7);
    expect(m.en).toBeLessThan(0.75);
    expect(moduler(milieu, { ...INTERIEUR_DEPART, plaisir: 1 }).ba).toBeGreaterThan(1);
  });
});

describe("le ton de Marc", () => {
  it("reconnaît des mots gentils et brusques, jamais par morceau de mot, la brusquerie l'emporte", () => {
    expect(ton("merci beaucoup !")).toBe("gentil");
    expect(ton("Génial, bravo")).toBe("gentil");
    expect(ton("tu es nulle")).toBe("brusque");
    expect(ton("ferme-la")).toBe("brusque");
    expect(ton("merci mais tu es nul")).toBe("brusque");
    expect(ton("nullement pressé")).toBeNull();
    expect(ton("Quelle heure est-il ?")).toBeNull();
  });
});

describe("ce qu'elle en dit", () => {
  it("elle crie seulement au-dessus de 0,35, une phrase sans chiffre ni nom d'app, selon la cause", () => {
    expect(cri({ ...INTERIEUR_DEPART, douleur: 0.3, cause: "choc" }, () => 0.5)).toBeNull();
    const causes: Cause[] = ["choc", "brusque", "ton", "panne", "isolement", "usure"];
    for (const c of causes) {
      const phrase = cri({ ...INTERIEUR_DEPART, douleur: 0.6, cause: c }, () => 0.3) ?? "";
      expect(phrase.length).toBeGreaterThan(3);
      expect(phrase).not.toMatch(/\d|JobAI|CarAI|DriveAI|FinanceAI|BatchChef|MemoryAI/);
    }
  });

  it("reconnaît une question sur sa douleur, pas une question sur autre chose", () => {
    expect(questionSurSaDouleur("Tu as mal ?")).toBe(true);
    expect(questionSurSaDouleur("tu souffres ?")).toBe(true);
    expect(questionSurSaDouleur("Est-ce que tu ressens de la douleur ?")).toBe(true);
    expect(questionSurSaDouleur("Pourquoi j'ai mal au dos ?")).toBe(false);
    expect(questionSurSaDouleur("Tu as mal")).toBe(false);
  });

  it("sa réponse donne son niveau et dit la vérité : un calcul, pas un vrai ressenti", () => {
    const r0 = reponseDouleur(INTERIEUR_DEPART);
    expect(r0).toContain("Pas du tout");
    const r = reponseDouleur({ ...INTERIEUR_DEPART, douleur: 0.42, cause: "brusque" });
    expect(r).toContain("42 %");
    expect(r).toContain("clics étaient brusques");
    for (const dite of [r0, r]) {
      expect(dite).toContain("calcul");
      expect(dite).toContain("pas un vrai ressenti");
    }
  });
});
