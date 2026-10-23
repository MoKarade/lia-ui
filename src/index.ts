export { mountLia } from "./lia.js";
export { prochaineDecision, pointDansZone, dansZone } from "./autonomie.js";
export { HUMEURS_LIA, LIBELLE_HUMEUR } from "./types.js";
export type {
  ActionLia,
  DescriptionElement,
  EnvoiLia,
  HumeurLia,
  LiaHandle,
  MotifSpontane,
  OptionsElements,
  OptionsLia,
  ParoleSpontanee,
  PuceLia,
  ReponseLia,
  ZoneVie,
} from "./types.js";
export type { Decision, Hasard } from "./autonomie.js";
export { composerQuestion, decrireParDefaut, ENTREES_MENU, SELECTEUR_ELEMENTS } from "./ecran.js";
export { GESTES, HUMEURS_MENU } from "./gestes.js";
export { ENVIES_DEPART, apresComportement, candidats, choisirComportement, majEnvies } from "./cerveau.js";
export type { Candidat, Comportement, Envies, FaitLia } from "./cerveau.js";
export type { ModeElement } from "./ecran.js";
export type { GesteLia } from "./gestes.js";
