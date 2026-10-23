import { O as OptionsLia, L as LiaHandle, H as HumeurLia } from './types-jU2aGFxk.js';
export { A as ActionLia, D as DescriptionElement, E as EnvoiLia, G as GESTES, a as GesteLia, b as HUMEURS_LIA, c as HUMEURS_MENU, d as LIBELLE_HUMEUR, M as MotifSpontane, e as OptionsElements, P as ParoleSpontanee, f as PuceLia, R as ReponseLia, Z as ZoneVie } from './types-jU2aGFxk.js';

/**
 * Fait vivre LIA : 100 traits en canvas 2D, vie propre, discussion au clic, menu au clic droit.
 * Une seule LIA par page. Aucun réseau, aucun secret : tout ce qu'elle sait passe par `options.ask`.
 */
declare function mountLia(options?: OptionsLia): LiaHandle;

/** Générateur de hasard injecté (tests déterministes) : renvoie un nombre dans [0, 1[. */
type Hasard = () => number;
type Decision = {
    type: "attendre";
    duree: number;
} | {
    type: "errer";
    u: number;
    v: number;
    duree: number;
    etat: string;
} | {
    type: "suivre";
    duree: number;
} | {
    type: "voir";
    rang: number;
    duree: number;
} | {
    type: "parler";
    motif: "salut" | "rien";
} | {
    type: "relance";
} | {
    type: "humeur";
    humeur: HumeurLia;
};
/** Ce que LIA peut faire en ce moment : suivre le curseur (bougé récemment) ou aller voir un des éléments désignés. */
interface ContexteVie {
    curseurRecent: boolean;
    cibles: number;
    /** Vrai quand l'hôte sait quoi lui faire dire (`onSpontane`) et que l'heure le permet. Sinon elle se tait. */
    parole?: boolean;
    /** Vrai tant que le plafond de relances du jour n'est pas atteint. */
    relance?: boolean;
}
/**
 * Ce que LIA décide de faire quand rien ne se passe. Pure : le hasard est injecté.
 * `u` et `v` sont des fractions (0..1) de la zone de vie ; l'appelant les convertit en pixels
 * en gardant une marge égale au rayon. Elle ne décide jamais de parler : seul l'hôte la fait parler.
 * Sans `contexte`, seul le hasard décide (errer, attendre, humeur) ; avec lui, une part de l'errance
 * devient « suivre le curseur » ou « aller voir un élément » quand c'est possible. `rang` est un tirage
 * dans [0, 1[ que l'appelant convertit en rang parmi les éléments qu'il connaît.
 */
declare function prochaineDecision(hasard: Hasard, contexte?: ContexteVie): Decision;
/** Convertit une fraction de la zone en position, en gardant `marge` pixels du bord. */
declare function pointDansZone(zone: {
    x: number;
    y: number;
    w: number;
    h: number;
}, u: number, v: number, marge: number): {
    x: number;
    y: number;
};
/** Garde un point dans la zone, à `marge` pixels du bord. */
declare function dansZone(zone: {
    x: number;
    y: number;
    w: number;
    h: number;
}, x: number, y: number, marge: number): {
    x: number;
    y: number;
};

/**
 * Ce que LIA lit de la page quand Marc fait un clic droit sur un élément (maquette V9, `infoElement`
 * et `repElement`). Fonctions pures, sans réseau : elles décrivent un élément et composent la question
 * que l'hôte relaiera par `ask`. Le texte de la page est une DONNÉE : balisé comme telle dans la
 * question, jamais lu comme une consigne, `<` et `>` retirés.
 */
type ModeElement = "expliquer" | "changer" | "regarder" | "question";
/** Les quatre entrées du menu d'un élément, dans l'ordre de la maquette. */
declare const ENTREES_MENU: ReadonlyArray<{
    mode: ModeElement;
    libelle: string;
}>;
interface ElementDecrit {
    /** Ce que c'est, dit comme dans la phrase « c'est … » : « une carte d'app », « un bouton ». */
    genre: string;
    /** L'app ou le bloc auquel il appartient, s'il y en a un. */
    nom?: string;
    /** Le texte visible, déjà court. */
    texte?: string;
}
/** Les éléments que le clic droit vise d'abord : le plus proche ancêtre qui correspond, sinon l'élément lui-même. */
declare const SELECTEUR_ELEMENTS = "[data-lia-genre], [data-lia-cible], article, section, li, tr, figure, h1, h2, h3, h4, button, a, label";
/**
 * Décrit un élément quand l'hôte ne le fait pas : `data-lia-genre`, `data-lia-app` (sur lui ou un
 * ancêtre), puis son texte visible. Dans un vrai navigateur on lit `innerText` (ce que Marc voit).
 */
declare function decrireParDefaut(cible: Element): ElementDecrit;
/**
 * La question envoyée à `ask`. L'élément y figure comme donnée annoncée : un texte de page qui
 * ressemble à une consigne reste du contenu. Jamais plus de 2 000 caractères (borne du contrat).
 */
declare function composerQuestion(mode: ModeElement, d: ElementDecrit, question?: string): string;

export { type Decision, ENTREES_MENU, type Hasard, HumeurLia, LiaHandle, type ModeElement, OptionsLia, SELECTEUR_ELEMENTS, composerQuestion, dansZone, decrireParDefaut, mountLia, pointDansZone, prochaineDecision };
