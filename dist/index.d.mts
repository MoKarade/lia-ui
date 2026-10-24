import { O as OptionsLia, L as LiaHandle } from './types-C3iZxVTj.mjs';
export { A as ActionLia, C as CAUSES, a as COMPORTEMENTS, b as Candidat, c as Cause, d as Comportement, e as ContexteLia, D as Decision, f as DescriptionElement, g as ENVIES_DEPART, h as Envies, i as EnvoiLia, E as EtatHote, j as EtatLia, F as FaitLia, G as GENRES_SOUVENIR, k as GESTES, l as GenreSouvenir, m as GesteLia, H as HUMEURS_LIA, n as HUMEURS_MENU, o as Hasard, p as HumeurDeFond, q as HumeurLia, I as Interieur, r as LIBELLE_HUMEUR, M as MotifMonde, s as MotifSpontane, t as OptionsElements, P as ParoleSpontanee, u as PropositionMonde, v as PuceLia, R as ReponseLia, S as SOUVENIR_DEMI_VIE_JOURS, w as Souvenir, Z as ZoneVie, x as ajouterSouvenir, y as apresComportement, z as candidats, B as choisirComportement, J as dansZone, K as humeurDeFond, N as majEnvies, Q as phraseDeRetour, T as poidsActuel, U as pointDansZone, V as prochaineDecision, W as validerEtat } from './types-C3iZxVTj.mjs';

/** Le nom de chacune des 40 humeurs (noms, pas d'accord : « Humeur : sérénité »), pour la pastille que LIA dessine. */
declare const LIBELLES_HUMEURS: Readonly<Record<string, string>>;
/** Les 40 humeurs, dans l'ordre : la liste fermée que l'hôte valide (`ContexteLia.humeur`). */
declare const HUMEURS_DETAILLEES: readonly string[];
declare const libelleHumeur: (nom: string) => string;
declare function couleurHumeur(nom: string): string;

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
/**
 * Les unités que l'hôte déclare (`data-lia-genre`, `data-lia-cible`) et les blocs courants. Le clic droit ne s'y arrête PLUS :
 * il vise l'élément précis sous le doigt (Marc, 24/10 : « ça analyse pas forcément ce que je clique »). Ce sélecteur ne sert
 * plus que de repli documenté, exporté pour les hôtes qui le lisaient.
 */
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

declare const ST: string[];

export { ACTIONS_LIA, ENTREES_MENU, FAMILLES_ACTIONS, type FamilleActions, HUMEURS_DETAILLEES, LIBELLES_HUMEURS, LiaHandle, type ModeElement, OptionsLia, SELECTEUR_ELEMENTS, ST as SILHOUETTES_LIA, composerQuestion, couleurHumeur, decrireParDefaut, libelleHumeur, mountLia };
