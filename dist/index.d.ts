import { O as OptionsLia, L as LiaHandle } from './types-fTssmHz1.js';
export { A as ActionLia, C as Candidat, a as Comportement, b as ContexteLia, D as Decision, c as DescriptionElement, d as ENVIES_DEPART, e as Envies, f as EnvoiLia, E as EtatHote, g as EtatLia, F as FaitLia, G as GESTES, h as GesteLia, H as HUMEURS_LIA, i as HUMEURS_MENU, j as Hasard, k as HumeurLia, l as LIBELLE_HUMEUR, M as MotifMonde, m as MotifSpontane, n as OptionsElements, P as ParoleSpontanee, o as PropositionMonde, p as PuceLia, R as ReponseLia, Z as ZoneVie, q as apresComportement, r as candidats, s as choisirComportement, t as dansZone, u as majEnvies, v as pointDansZone, w as prochaineDecision } from './types-fTssmHz1.js';

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

/**
 * Ce qu'elle est en train de FAIRE, dit par une silhouette de son moteur (maquette v5 : 39 actions en 8 familles).
 * Fonctions pures : elles choisissent la silhouette, jamais une phrase. Les 39 sont toutes atteignables :
 * d'après la question de Marc, l'élément qu'elle regarde, ce que l'hôte annonce ou son humeur.
 */
interface ActionMoteur {
    id: string;
    /** Au féminin, comme elle (« Elle lit »). */
    libelle: string;
}
interface FamilleActions {
    famille: string;
    actions: readonly ActionMoteur[];
}
/** Les 39 silhouettes du moteur, rangées comme dans la maquette (même ordre, mêmes familles). */
declare const FAMILLES_ACTIONS: readonly FamilleActions[];
declare const ACTIONS_LIA: readonly string[];

/** Le nom de chacune des 40 humeurs (noms, pas d'accord : « Humeur : sérénité »), pour la pastille que LIA dessine. */
declare const LIBELLES_HUMEURS: Readonly<Record<string, string>>;
/** Les 40 humeurs, dans l'ordre : la liste fermée que l'hôte valide (`ContexteLia.humeur`). */
declare const HUMEURS_DETAILLEES: readonly string[];
declare const libelleHumeur: (nom: string) => string;
declare function couleurHumeur(nom: string): string;

declare const ST: string[];

export { ACTIONS_LIA, ENTREES_MENU, FAMILLES_ACTIONS, type FamilleActions, HUMEURS_DETAILLEES, LIBELLES_HUMEURS, LiaHandle, type ModeElement, OptionsLia, SELECTEUR_ELEMENTS, ST as SILHOUETTES_LIA, composerQuestion, couleurHumeur, decrireParDefaut, libelleHumeur, mountLia };
