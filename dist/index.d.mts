import { O as OptionsLia, L as LiaHandle } from './types-Cfh-x_B3.mjs';
export { A as ActionLia, C as CAUSES, a as COMPORTEMENTS, b as Candidat, c as Cause, d as Comportement, e as ContexteLia, D as Decision, f as DescriptionElement, g as DiscussionPartagee, h as ENTREES_MENU, i as ENVIES_DEPART, j as Envies, k as EnvoiLia, E as EtatHote, l as EtatLia, F as FaitLia, G as GENRES_SOUVENIR, m as GESTES, n as GenreSouvenir, o as GesteLia, H as HUMEURS_LIA, p as HUMEURS_MENU, q as Hasard, r as HumeurDeFond, s as HumeurLia, I as Interieur, t as LIBELLE_HUMEUR, M as ModeElement, u as MotifMonde, v as MotifSpontane, w as OptionsElements, P as ParoleSpontanee, x as PropositionMonde, y as PuceLia, R as ReponseLia, S as SELECTEUR_ELEMENTS, z as SOUVENIR_DEMI_VIE_JOURS, B as Souvenir, Z as ZoneVie, J as ajouterSouvenir, K as apresComportement, N as candidats, Q as choisirComportement, T as composerQuestion, U as dansZone, V as decrireParDefaut, W as humeurDeFond, X as majEnvies, Y as phraseDeRetour, _ as poidsActuel, $ as pointDansZone, a0 as prochaineDecision, a1 as validerEtat } from './types-Cfh-x_B3.mjs';

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
