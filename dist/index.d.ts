import { O as OptionsLia, L as LiaHandle } from './etat-DVFyK7Me.js';
export { A as ActionLia, C as Candidat, a as Comportement, D as Decision, b as DescriptionElement, c as ENVIES_DEPART, d as Envies, e as EnvoiLia, E as EtatHote, f as EtatLia, F as FaitLia, G as GESTES, g as GesteLia, H as HUMEURS_LIA, h as HUMEURS_MENU, i as Hasard, j as HumeurLia, k as LIBELLE_HUMEUR, M as MotifMonde, l as MotifSpontane, m as OptionsElements, P as ParoleSpontanee, n as PropositionMonde, o as PuceLia, R as ReponseLia, Z as ZoneVie, p as apresComportement, q as candidats, r as choisirComportement, s as dansZone, t as majEnvies, u as pointDansZone, v as prochaineDecision } from './etat-DVFyK7Me.js';

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

/** Le nom de chacune des 40 humeurs (noms, pas d'accord : « Humeur : sérénité »), pour la pastille que LIA dessine. */
declare const LIBELLES_HUMEURS: Readonly<Record<string, string>>;
declare const libelleHumeur: (nom: string) => string;
declare function couleurHumeur(nom: string): string;

export { ENTREES_MENU, LIBELLES_HUMEURS, LiaHandle, type ModeElement, OptionsLia, SELECTEUR_ELEMENTS, composerQuestion, couleurHumeur, decrireParDefaut, libelleHumeur, mountLia };
