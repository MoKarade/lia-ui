export { mountLia } from "./lia.js";
export { prochaineDecision, pointDansZone, dansZone } from "./autonomie.js";
export { HUMEURS_LIA, LIBELLE_HUMEUR } from "./types.js";
export type {
  ActionLia,
  DescriptionElement,
  EnvoiLia,
  HumeurLia,
  LiaHandle,
  MotifMonde,
  MotifSpontane,
  OptionsElements,
  OptionsLia,
  ParoleSpontanee,
  PropositionMonde,
  PuceLia,
  ContexteLia,
  ReponseLia,
  ZoneVie,
} from "./types.js";
export type { Decision, Hasard } from "./autonomie.js";
export { composerQuestion, decrireParDefaut, ENTREES_MENU, SELECTEUR_ELEMENTS } from "./ecran.js";
export { GESTES, HUMEURS_MENU } from "./gestes.js";
export { ACTIONS_LIA, FAMILLES_ACTIONS } from "./activite.js";
export type { FamilleActions } from "./activite.js";
export { validerEtat } from "./etat.js";
export type { EtatHote, EtatLia } from "./etat.js";
export { CAUSES } from "./interieur.js";
export type { Cause, Interieur } from "./interieur.js";
export { GENRES_SOUVENIR, ajouterSouvenir, humeurDeFond, phraseDeRetour, poidsActuel, SOUVENIR_DEMI_VIE_JOURS } from "./souvenirs.js";
export type { GenreSouvenir, HumeurDeFond, Souvenir } from "./souvenirs.js";
export { HUMEURS_DETAILLEES, LIBELLES_HUMEURS, couleurHumeur, libelleHumeur } from "./humeurs.js";
export { ST as SILHOUETTES_LIA } from "./moteur/moteur.js";
export { COMPORTEMENTS, ENVIES_DEPART, apresComportement, candidats, choisirComportement, majEnvies } from "./cerveau.js";
export type { Candidat, Comportement, Envies, FaitLia } from "./cerveau.js";
export type { ModeElement } from "./ecran.js";
export type { GesteLia } from "./gestes.js";
