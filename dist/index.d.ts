import { O as OptionsLia, L as LiaHandle, H as HumeurLia } from './types-CSbitNRl.js';
export { A as ActionLia, a as HUMEURS_LIA, b as LIBELLE_HUMEUR, P as PuceLia, R as ReponseLia, Z as ZoneVie } from './types-CSbitNRl.js';

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
    type: "humeur";
    humeur: HumeurLia;
};
/**
 * Ce que LIA décide de faire quand rien ne se passe. Pure : le hasard est injecté.
 * `u` et `v` sont des fractions (0..1) de la zone de vie ; l'appelant les convertit en pixels
 * en gardant une marge égale au rayon. Elle ne décide jamais de parler : seul l'hôte la fait parler.
 */
declare function prochaineDecision(hasard: Hasard): Decision;
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

export { type Decision, type Hasard, HumeurLia, LiaHandle, OptionsLia, dansZone, mountLia, pointDansZone, prochaineDecision };
