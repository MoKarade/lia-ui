import { O as OptionsLia, L as LiaHandle } from './types-Cs7SJspD.mjs';
export { A as ActionLia, C as Candidat, a as Comportement, D as Decision, b as DescriptionElement, E as ENVIES_DEPART, c as Envies, d as EnvoiLia, F as FaitLia, G as GESTES, e as GesteLia, H as HUMEURS_LIA, f as HUMEURS_MENU, g as Hasard, h as HumeurLia, i as LIBELLE_HUMEUR, M as MotifSpontane, j as OptionsElements, P as ParoleSpontanee, k as PuceLia, R as ReponseLia, Z as ZoneVie, l as apresComportement, m as candidats, n as choisirComportement, o as dansZone, p as majEnvies, q as pointDansZone, r as prochaineDecision } from './types-Cs7SJspD.mjs';

/**
 * Fait vivre LIA : 100 traits en canvas 2D, vie propre, discussion au clic, menu au clic droit.
 * Une seule LIA par page. Aucun réseau, aucun secret : tout ce qu'elle sait passe par `options.ask`.
 */
declare function mountLia(options?: OptionsLia): LiaHandle;

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

export { ENTREES_MENU, LiaHandle, type ModeElement, OptionsLia, SELECTEUR_ELEMENTS, composerQuestion, decrireParDefaut, mountLia };
