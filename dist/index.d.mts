import { O as OptionsLia, L as LiaHandle } from './types-D6J-xkEC.mjs';
export { A as ActionLia, C as CAUSES, a as COMPORTEMENTS, b as Candidat, c as Cause, d as Comportement, e as ContexteLia, D as Decision, f as DescriptionElement, g as ENTREES_MENU, h as ENVIES_DEPART, i as Envies, j as EnvoiLia, E as EtatHote, k as EtatLia, F as FaitLia, G as GENRES_SOUVENIR, l as GESTES, m as GenreSouvenir, n as GesteLia, H as HUMEURS_LIA, o as HUMEURS_MENU, p as Hasard, q as HumeurDeFond, r as HumeurLia, I as Interieur, s as LIBELLE_HUMEUR, M as ModeElement, t as MotifMonde, u as MotifSpontane, v as OptionsElements, P as ParoleSpontanee, w as PropositionMonde, x as PuceLia, R as ReponseLia, S as SELECTEUR_ELEMENTS, y as SOUVENIR_DEMI_VIE_JOURS, z as Souvenir, Z as ZoneVie, B as ajouterSouvenir, J as apresComportement, K as candidats, N as choisirComportement, Q as composerQuestion, T as dansZone, U as decrireParDefaut, V as humeurDeFond, W as majEnvies, X as phraseDeRetour, Y as poidsActuel, _ as pointDansZone, $ as prochaineDecision, a0 as validerEtat } from './types-D6J-xkEC.mjs';

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
