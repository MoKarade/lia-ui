import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACTIONS_LIA, ACTIVITES_JEU, FAMILLES_ACTIONS, activiteElement, activiteQuestion, estAction, suiteReflexion } from "../src/activite.js";
import { ST } from "../src/moteur/moteur.js";
import { mountLia } from "../src/lia.js";
import type { LiaHandle, ReponseLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

const rectDe = (r: { left: number; top: number; right: number; bottom: number }): DOMRect =>
  ({ ...r, x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top, toJSON: () => r }) as DOMRect;

describe("les 39 actions du moteur", () => {
  it("la liste rangée par famille couvre exactement les silhouettes du moteur, une fois chacune", () => {
    expect([...ACTIONS_LIA].sort()).toEqual([...ST].sort());
    expect(ACTIONS_LIA).toHaveLength(39);
    expect(FAMILLES_ACTIONS.map((f) => f.famille)).toEqual(["Présence", "Pensée", "Recherche", "Création", "Calcul", "Alerte", "Émotion", "Travail"]);
    for (const f of FAMILLES_ACTIONS) for (const a of f.actions) expect(a.libelle.length, a.id).toBeGreaterThan(3);
  });

  it("n'accepte que des noms de silhouettes", () => {
    expect(estAction("analyse")).toBe(true);
    expect(estAction("danse")).toBe(false);
    expect(estAction(undefined)).toBe(false);
  });

  it("le jeu par humeur ne nomme que de vraies silhouettes", () => {
    for (const [humeur, liste] of Object.entries(ACTIVITES_JEU)) for (const e of liste) expect(ST, `${humeur} → ${e}`).toContain(e);
  });
});

describe("ce qu'elle fait d'une question", () => {
  it.each([
    ["Traduis ce paragraphe en anglais", "traduit"],
    ["Dessine un logo pour le hub", "image"],
    ["Il y a un bug dans ce script", "code"],
    ["Écris un courriel pour le garage", "ecrit"],
    ["Tu te souviens de ce que je t'ai dit hier ?", "souvient"],
    ["Planifie ma semaine", "planifie"],
    ["Range mes fichiers", "organise"],
    ["Synchronise les apps", "synchronise"],
    ["Envoie ce message à Julie", "envoie"],
    ["Télécharge le relevé", "telecharge"],
    ["Mon mot de passe est-il protégé ?", "securise"],
    ["Vérifie que tout va bien", "verifie"],
    ["Analyse la tendance des coûts", "analyse"],
    ["Combien j'ai dépensé en essence ?", "calcule"],
    ["Quel est l'état de JobAI ?", "consulte"],
    ["Cherche un restaurant ouvert", "cherche"],
    ["Lis ce document", "lit"],
    ["Bonjour, ça va ?", "reflexion"],
  ])("« %s » → %s", (question, attendu) => {
    expect(activiteQuestion(question)).toBe(attendu);
  });

  it("une question sans lettres ou de deux lettres la rend confuse", () => {
    expect(activiteQuestion("???")).toBe("confus");
    expect(activiteQuestion("ok")).toBe("confus");
    expect(activiteQuestion("   ")).toBe("confus");
  });

  it("plus la réponse tarde, plus elle se concentre, puis attend", () => {
    expect(suiteReflexion("calcule", 2)).toBe("calcule");
    expect(suiteReflexion("calcule", 8)).toBe("concentre");
    expect(suiteReflexion("calcule", 20)).toBe("attend");
  });
});

describe("ce qu'elle fait d'un élément qu'elle regarde", () => {
  const faire = (html: string, geo?: { largeur: number; hauteur: number }): string => {
    document.body.innerHTML = html;
    return activiteElement(document.body.firstElementChild as Element, geo);
  };
  it("une alerte la fait surveiller, une jauge calculer, un champ écrire, du code programmer", () => {
    expect(faire(`<div role="alert">Hors ligne</div>`)).toBe("surveille");
    expect(faire(`<div class="jauge">81 %</div>`)).toBe("calcule");
    expect(faire(`<meter value="3"></meter>`)).toBe("calcule");
    expect(faire(`<textarea></textarea>`)).toBe("ecrit");
    expect(faire(`<pre>npm test</pre>`)).toBe("code");
    expect(faire(`<canvas></canvas>`)).toBe("calcule");
    expect(faire(`<div class="carte__cle">9,90 $</div>`)).toBe("consulte");
  });
  it("un tableau ou un grand bloc, elle l'analyse ; un petit texte, elle le lit", () => {
    expect(faire(`<table></table>`)).toBe("analyse");
    expect(faire(`<div>Texte</div>`, { largeur: 600, hauteur: 300 })).toBe("analyse");
    expect(faire(`<section>Carte</section>`)).toBe("analyse");
    expect(faire(`<p>Quelques mots</p>`, { largeur: 200, hauteur: 40 })).toBe("lit");
  });
  it("l'hôte peut dicter l'action ; un nom inconnu est ignoré", () => {
    expect(faire(`<p data-lia-activite="traduit">Hello</p>`)).toBe("traduit");
    expect(faire(`<p data-lia-activite="danse">Hello</p>`)).toBe("lit");
  });
});

let lia: LiaHandle | null = null;
const etat = (): string => document.querySelector<HTMLElement>(".lia-ui__corps")?.dataset["etat"] ?? "";
const attente = (ms: number): void => {
  vi.advanceTimersByTime(ms);
};

beforeEach(() => {
  installerEnvironnement({ sansMouvement: true });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1400 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("lia-ui")) return rectDe({ left: 0, top: 0, right: 1400, bottom: 900 });
    if (this.id === "carte") return rectDe({ left: 700, top: 300, right: 1100, bottom: 560 });
    if (this.id === "para") return rectDe({ left: 700, top: 600, right: 900, bottom: 640 });
    return rectDe({ left: 0, top: 0, right: 0, bottom: 0 });
  });
  document.body.innerHTML = `<section id="carte" data-lia-cible>Alertes</section><p id="para" data-lia-cible>Un texte</p>`;
});
afterEach(() => {
  vi.useRealTimers();
  lia?.destroy();
  lia = null;
});

const monter = (extra: Parameters<typeof mountLia>[0] = {}): LiaHandle => {
  vi.useFakeTimers();
  const base = Date.now();
  vi.spyOn(performance, "now").mockImplementation(() => Date.now() - base);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(() => cb(performance.now()), 1000 / 30) as unknown as number);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
  lia = mountLia({ quandMouvementReduit: "complet", ...extra });
  attente(1000);
  return lia;
};
const poserQuestion = (q: string): void => {
  lia?.ouvrirChat();
  const champ = document.querySelector<HTMLInputElement>(".lia-ui__champ") as HTMLInputElement;
  champ.value = q;
  champ.form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
};

describe("elle montre ce qu'elle fait quand Marc lui parle", () => {
  it("une question de calcul la fait calculer, puis se concentrer, puis attendre si ça tarde", () => {
    monter({ vieAutonome: false, ask: () => new Promise(() => undefined) });
    poserQuestion("Combien j'ai dépensé en essence ?");
    expect(etat()).toBe("calcule");
    attente(8000);
    expect(etat()).toBe("concentre");
    attente(10000);
    expect(etat()).toBe("attend");
  });

  it("une question sur la mémoire la fait se souvenir", () => {
    monter({ vieAutonome: false, ask: () => new Promise(() => undefined) });
    poserQuestion("Tu te souviens de mon garage ?");
    expect(etat()).toBe("souvient");
  });

  it("une question floue la rend confuse", () => {
    monter({ vieAutonome: false, ask: () => new Promise(() => undefined) });
    poserQuestion("??");
    expect(etat()).toBe("confus");
  });

  it("l'hôte peut dire ce qu'elle a fait : elle le montre avant de répondre puis répond", async () => {
    const rep: ReponseLia = { text: "Tu as dépensé 212 $.", etat: "calcule" };
    monter({ vieAutonome: false, ask: () => Promise.resolve(rep) });
    poserQuestion("Bonjour");
    await vi.advanceTimersByTimeAsync(10);
    expect(etat()).toBe("calcule");
    attente(2000);
    expect(etat()).toBe("reponse");
  });

  it("un nom d'action inconnu venant de l'hôte est ignoré", async () => {
    monter({ vieAutonome: false, ask: () => Promise.resolve({ text: "Salut.", etat: "danse" }) });
    poserQuestion("Bonjour");
    await vi.advanceTimersByTimeAsync(10);
    expect(etat()).toBe("reponse");
  });

  it("une réponse qui pose une question reste « demande » jusqu'à ce que Marc réponde", async () => {
    monter({ vieAutonome: false, ask: () => Promise.resolve({ text: "Tu veux que je regarde JobAI ?" }) });
    poserQuestion("Bonjour");
    await vi.advanceTimersByTimeAsync(10);
    expect(etat()).toBe("reponse");
    attente(20000);
    expect(etat()).toBe("demande");
  });

  it("une réponse sans question la laisse à l'écoute", async () => {
    monter({ vieAutonome: false, ask: () => Promise.resolve({ text: "Rien à signaler." }) });
    poserQuestion("Bonjour");
    await vi.advanceTimersByTimeAsync(10);
    attente(20000);
    expect(etat()).toBe("ecoute");
  });
});

describe("elle montre ce qu'elle fait quand elle va voir quelque chose", () => {
  it("en route elle cherche, posée près d'un grand bloc elle l'analyse", () => {
    const l = monter({ vieAutonome: false });
    const carte = document.getElementById("carte") as HTMLElement;
    expect(l.allerVoir(carte, 12)).toBe(true);
    expect(etat()).toBe("cherche");
    attente(4000);
    expect(etat()).toBe("analyse");
  });

  it("l'hôte dicte l'action par data-lia-activite, ou par envoyer({ etat })", () => {
    const l = monter({ vieAutonome: false });
    const para = document.getElementById("para") as HTMLElement;
    para.setAttribute("data-lia-activite", "traduit");
    l.allerVoir(para, 12);
    attente(4000);
    expect(etat()).toBe("traduit");
    l.envoyer(document.getElementById("carte") as HTMLElement, { etat: "calcule", secondes: 12 });
    attente(4000);
    expect(etat()).toBe("calcule");
  });

  it("le monde de l'hôte choisit l'action qu'elle montre en venant dire sa phrase", () => {
    const carte = document.getElementById("carte") as HTMLElement;
    monter({
      entrees: () => ({ alerte: 1, nbAlertes: 3 }),
      monde: (motif) => (motif === "appeler" ? { text: "Trois alertes sont affichées.", element: carte, etat: "synchronise" } : null),
    });
    const vues = new Set<string>();
    for (let i = 0; i < 300 && !vues.has("synchronise"); i++) {
      attente(200);
      vues.add(etat());
    }
    expect(vues.has("synchronise"), [...vues].join(",")).toBe(true);
  });
});

describe("l'hôte peut montrer une action vraie : lia.activite()", () => {
  it("synchronise 4 s puis reprend sa vie ; un nom inconnu est refusé", () => {
    const l = monter({ vieAutonome: false });
    expect(l.activite("synchronise", 4)).toBe(true);
    expect(etat()).toBe("synchronise");
    attente(4500);
    expect(etat()).toBe("repos");
    expect(l.activite("danse")).toBe(false);
  });
});

describe("le menu : toutes les actions à la demande", () => {
  it("« Toutes ses actions » déplie les 39, un clic en fait jouer une 5 s sans fermer rien d'autre", () => {
    const l = monter({ vieAutonome: false });
    document.querySelector<HTMLElement>(".lia-ui__hit")?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
    const bascule = [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__item")].find((b) => b.textContent === "Toutes ses actions") as HTMLButtonElement;
    expect(bascule.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelectorAll(".lia-ui__action")).toHaveLength(0);
    bascule.click();
    expect(bascule.getAttribute("aria-expanded")).toBe("true");
    const actions = [...document.querySelectorAll<HTMLButtonElement>(".lia-ui__action")];
    expect(actions.map((b) => b.dataset["action"]).sort()).toEqual([...ST].sort());
    actions.find((b) => b.dataset["action"] === "ecrit")?.click();
    expect(etat()).toBe("ecrit");
    attente(5500);
    expect(etat()).toBe("repos");
    expect(l.activite("lit")).toBe(true);
  });
});

describe("sa vie autonome montre plusieurs actions différentes", () => {
  const vue = (secondes: number, graine: number): Map<string, number> => {
    let n = graine;
    vi.spyOn(Math, "random").mockImplementation(() => {
      n = (n * 1664525 + 1013904223) % 4294967296;
      return n / 4294967296;
    });
    monter({
      entrees: () => ({ alerte: 0.37, nbAlertes: 0.5 }),
      monde: (motif) => (motif === "appeler" ? { text: "Une alerte est affichée.", element: document.getElementById("carte") } : null),
      onSpontane: () => null,
    });
    const vues = new Map<string, number>();
    for (let i = 0; i < secondes * 5; i++) {
      attente(200);
      const e = etat();
      vues.set(e, (vues.get(e) ?? 0) + 1);
    }
    return vues;
  };

  it.each([1, 7, 42, 99, 2026])("en 5 minutes (graine %i) : au moins 6 silhouettes d'action différentes, hors repos et parole", (graine) => {
    const vues = vue(300, graine);
    const actions = [...vues.keys()].filter((e) => !["repos", "reponse", "ecoute"].includes(e));
    expect(actions.length, actions.join(",")).toBeGreaterThanOrEqual(6);
  });
});
