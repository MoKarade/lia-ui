import { O as OptionsLia, L as LiaHandle } from './types-CfdXzaQ_.js';
export { A as ActionLia, C as CAUSES, a as COMPORTEMENTS, b as Candidat, c as Cause, d as Comportement, e as ContexteLia, D as Decision, f as DescriptionElement, g as DiscussionPartagee, h as ENTREES_MENU, i as ENVIES_DEPART, j as EntreeHistorique, k as Envies, l as EnvoiLia, E as EtatHote, m as EtatLia, F as FaitLia, G as GENRES_SOUVENIR, n as GESTES, o as GenreSouvenir, p as GesteLia, H as HUMEURS_LIA, q as HUMEURS_MENU, r as Hasard, s as HistoriqueAtelier, t as HumeurDeFond, u as HumeurLia, I as Interieur, v as LIBELLE_HUMEUR, M as ModeElement, w as MotifMonde, x as MotifSpontane, y as OptionAtelier, z as OptionsAtelier, B as OptionsElements, P as ParoleSpontanee, J as PropositionMonde, K as PuceLia, R as ReglagesAtelier, N as ReponseLia, S as SELECTEUR_ELEMENTS, Q as SOUVENIR_DEMI_VIE_JOURS, T as Souvenir, Z as ZoneVie, U as ajouterSouvenir, V as apresComportement, W as candidats, X as choisirComportement, Y as composerQuestion, _ as dansZone, $ as decrireParDefaut, a0 as humeurDeFond, a1 as majEnvies, a2 as phraseDeRetour, a3 as poidsActuel, a4 as pointDansZone, a5 as prochaineDecision, a6 as validerEtat } from './types-CfdXzaQ_.js';

/** Le nom de chacune des 40 humeurs (noms, pas d'accord : « Humeur : sérénité »), pour la pastille que LIA dessine. */
declare const LIBELLES_HUMEURS: Readonly<Record<string, string>>;
/** Les 40 humeurs, dans l'ordre : la liste fermée que l'hôte valide (`ContexteLia.humeur`). */
declare const HUMEURS_DETAILLEES: readonly string[];
declare const libelleHumeur: (nom: string) => string;
declare function couleurHumeur(nom: string): string;

declare function mountLia(options?: OptionsLia): LiaHandle;

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

export { ACTIONS_LIA, FAMILLES_ACTIONS, type FamilleActions, HUMEURS_DETAILLEES, LIBELLES_HUMEURS, LiaHandle, OptionsLia, ST as SILHOUETTES_LIA, couleurHumeur, libelleHumeur, mountLia };
