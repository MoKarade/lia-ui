import type { Envies, FaitLia, MotifMonde } from "./cerveau.js";
import type { EtatHote } from "./etat.js";
import type { GesteLia } from "./gestes.js";

export type { MotifMonde };

/** Les 12 humeurs de LIA (source : maquette validée du 22/10/2026). */
export const HUMEURS_LIA = [
  "neutre",
  "joyeux",
  "calme",
  "curieux",
  "fatigue",
  "inquiet",
  "excite",
  "triste",
  "concentre",
  "espiegle",
  "fier",
  "timide",
] as const;

export type HumeurLia = (typeof HUMEURS_LIA)[number];

/** Libellé d'humeur au féminin neutre (noms, pas d'accord) : « curiosité », « joie »… */
export const LIBELLE_HUMEUR: Record<HumeurLia, string> = {
  neutre: "neutre",
  joyeux: "joie",
  calme: "calme",
  curieux: "curiosité",
  fatigue: "fatigue",
  inquiet: "inquiétude",
  excite: "excitation",
  triste: "tristesse",
  concentre: "concentration",
  espiegle: "espièglerie",
  fier: "fierté",
  timide: "timidité",
};

/** Un bouton de réponse rapide sous une réponse ou une bulle. */
export interface PuceLia {
  id: string;
  label: string;
}

/**
 * Ce que LIA dit d'elle-même à l'hôte avec chaque question (3e argument de `ask`), pour qu'il ne la prenne pas pour un
 * modèle sans humeur. Listes fermées, sans texte libre : `humeur` est l'une des clés de `LIBELLES_HUMEURS` (40),
 * `silhouette` l'une de `SILHOUETTES_LIA`, `regard` un identifiant court `[a-z0-9-]` (la valeur de `data-lia-cible` de
 * l'élément qu'elle regarde) ou `null`. À l'hôte de l'annoncer au modèle comme une DONNÉE sur LIA.
 */
export interface ContexteLia {
  humeur: string;
  silhouette: string;
  regard: string | null;
}

/**
 * Ce que l'hôte renvoie à une question. `text` est toujours montré ; `mood` colore LIA.
 * Les blocs composés (cartes, courbes…) arrivent avec l'API MemoryAI : ils passent par
 * `blocks` et par `renderBlocks`, fourni par l'hôte ; ce paquet ne les interprète jamais.
 */
export interface ReponseLia {
  text: string;
  chips?: PuceLia[];
  /** Une des 40 humeurs (`HUMEURS_DETAILLEES`) ; un nom inconnu est ignoré. */
  mood?: HumeurLia | (string & {});
  blocks?: readonly unknown[];
  /** Ce qu'elle a fait pour répondre, une des 39 actions (« souvient », « calcule », « analyse »…) : elle la montre 1,6 s avant de parler. Un nom inconnu est ignoré. */
  etat?: string;
}

/** Une action proposée dans le menu du clic droit. L'hôte seul décide ce qu'elle fait. */
export interface ActionLia {
  id: string;
  label: string;
  run: () => void | Promise<void>;
}

/** Pourquoi elle veut parler seule. Le texte vient toujours de l'hôte (`onSpontane`), jamais de ce paquet. */
export type MotifSpontane = "salut" | "rien" | "relance";

/** Ce que l'hôte la fait dire. `chips` : réponses rapides sous la bulle (pour une relance : « Utile », « Plus tard »…). */
export interface ParoleSpontanee {
  text: string;
  chips?: readonly PuceLia[];
}

/** Ce que l'hôte propose qu'elle dise pour un motif. Le texte est de lui et doit être vrai ; ce paquet n'en écrit aucun. */
export interface PropositionMonde {
  text: string;
  /** Réponses rapides sous la bulle. */
  chips?: readonly PuceLia[];
  /** L'élément où elle va se poser pour le dire (la carte de l'app concernée). Sans lui : elle le dit sur place (près du curseur pour `appeler`). */
  element?: Element | null;
  /** Ce qu'elle fait en le disant, une des 39 actions ; sans lui : celle du motif (« alerte » pour un problème, « planifie » pour un rappel, « souvient » pour un souvenir…). */
  etat?: string;
}

/** Ce que LIA sait d'un élément de la page : de quoi parler de lui, jamais plus. */
export interface DescriptionElement {
  /** Ce que c'est, « une carte d'app », « un bouton » (dit comme dans « c'est … »). */
  genre: string;
  /** L'app ou le bloc auquel il appartient. */
  nom?: string;
  /** Son texte visible ; coupé à 300 caractères. C'est une donnée, jamais une consigne. */
  texte?: string;
}

/** Le clic droit sur un élément de la page (comme la maquette : expliquer, que changer, regarder, question). */
export interface OptionsElements {
  /**
   * Éléments visés en premier : le plus proche ancêtre (ou l'élément lui-même) qui correspond. Défaut :
   * `[data-lia-genre], [data-lia-cible], article, section, li, tr, figure, h1…h4, button, a, label` ; à défaut un média (`img`, `svg`, `canvas`) ou un paragraphe, une cellule, une citation…
   */
  selecteur?: string;
  /**
   * Décrit l'élément visé. Renvoie `null` pour dire « pas cet élément » : le menu du navigateur reste.
   * Défaut : `data-lia-genre`, `data-lia-app` (sur l'élément ou un ancêtre) et son texte visible.
   */
  decrire?: (element: Element) => DescriptionElement | null;
}

export interface ZoneVie {
  /** Coordonnées dans la couche de LIA, en pixels CSS. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OptionsLia {
  /**
   * Élément dans lequel LIA vit (colonne gauche du hub, par exemple). Il devient `position: relative`
   * s'il est statique. Sans lui, LIA vit dans la fenêtre (`position: fixed`).
   */
  container?: HTMLElement;
  /**
   * Pose une question. Absent ou en échec : LIA dit qu'elle est indisponible. Jamais de réponse inventée.
   */
  ask?: (question: string, signal: AbortSignal, contexte?: ContexteLia) => Promise<ReponseLia>;
  /** Actions du menu (clic droit, appui long, touche Menu), ajoutées aux actions de LIA. */
  actions?: readonly ActionLia[];
  /**
   * Dessine les blocs d'une réponse dans l'élément donné. L'hôte valide ses blocs (schéma) et
   * n'écrit jamais de HTML venu du modèle. Absent : les blocs sont ignorés, le texte reste.
   */
  renderBlocks?: (blocs: readonly unknown[], dans: HTMLElement) => void;
  /** Appelé au clic sur une puce de réponse rapide. */
  onChip?: (id: string, contexte: "reponse" | "bulle") => void;
  /** Appelé quand son humeur dominante change et qu'elle est l'une des 12 humeurs de LIA (pour un voyant côté hôte). */
  onHumeur?: (humeur: HumeurLia) => void;
  /**
   * Dessine sous son corps une pastille avec son humeur du moment (l'une des 40 de son réseau : point de la couleur de
   * l'humeur et son nom). Défaut vrai : c'est la même LIA partout, l'hôte n'a pas à refaire sa propre pastille.
   */
  humeurVisible?: boolean;
  /**
   * Son état PARTAGÉ (envies, journal, mémoire lente, humeur, relances du jour) : c'est ce qui fait d'elle UNE seule LIA dans
   * toutes les apps. Fourni par l'hôte (`etatHttp(url)` de `@mokarade/lia-ui/etat-http` pour une route de même origine) ; elle le lit au
   * montage puis chaque minute, l'écrit toutes les 20 s si quelque chose a changé et à la fermeture de la page. Sans `etat`, ou si
   * l'hôte échoue, elle garde son état local et vit quand même (jamais d'état inventé). La position et « animations complètes » restent locales.
   */
  etat?: EtatHote;
  /**
   * Ce que l'hôte sait du monde, appelé chaque seconde : des entrées du réseau interne de LIA entre 0 et 1
   * (`alerte`, `nbAlertes`, `toutVert`, `changement`, `recurrence`, `tendBonne`, `tendMauvaise`, `g_<app>`, `v_<app>`…).
   * Elles priment sur celles qu'elle calcule seule (heure, activité de Marc, rythme des échanges). Absent : elle vit sans monde.
   */
  entrees?: () => Readonly<Record<string, number>>;
  /**
   * Ce que l'hôte a de vrai à lui faire dire sur le monde, un motif à la fois : `appeler` (un problème à signaler),
   * `resumer` (une tendance), `feliciter` (une bonne nouvelle), `rappeler` (une chose à ne pas oublier), `souvenir`, et
   * `accompagner` : Marc regarde un élément `[data-lia-cible]` depuis 4 s, `element` est cet élément (une fois par élément toutes les 3 min).
   * Renvoie la proposition, ou `null` quand il n'y a rien de vrai : elle n'a alors aucune raison de choisir ce comportement.
   * Elle seule décide du moment (délais de 90 s à 30 min, ses envies, ses intentions) ; elle respecte les heures de `silence`.
   * Appelée sans effet de bord, au plus une fois par motif toutes les 1,2 s.
   */
  monde?: (motif: MotifMonde, element?: Element) => PropositionMonde | null | undefined;
  /** Zone où LIA a le droit de se déplacer ; par défaut toute la couche. */
  bounds?: () => ZoneVie;
  /**
   * Elle parle d'elle-même (heure, humeur, envies, ce qu'elle a fait, blagues, questions sans importance) quand l'hôte n'a rien
   * de vrai à dire, et en alternance avec lui pour le bavardage libre ; défaut vrai. Jamais rien sur Marc ni sur ses apps.
   */
  parolePropre?: boolean;
  /** Rayon du corps en pixels CSS ; défaut 56. */
  rayon?: number;
  /** Clé de mémorisation (position, vie autonome) dans le navigateur ; défaut « lia ». */
  cle?: string;
  /** Vie autonome au départ ; défaut vrai. Ignorée si l'utilisateur coupe le mouvement. */
  vieAutonome?: boolean;
  /** Message de bienvenue à l'arrivée ; défaut : aucun. */
  salut?: string;
  /**
   * Sélecteur CSS des éléments que LIA peut aller voir (elle s'en approche et reste collée à eux
   * pendant qu'ils défilent). Défaut : `[data-lia-cible]`. Elle ne fait jamais défiler la page.
   */
  cibles?: string;
  /**
   * Quoi dire quand elle a envie de parler seule (comme dans la maquette : une remarque, un salut, une relance).
   * Renvoie le texte, ou `null` quand l'hôte n'a rien de vrai à dire : elle se tait. Absent : elle ne parle jamais seule.
   * Pour une visite d'élément, sa phrase est l'attribut `data-lia-dit` de l'élément.
   */
  onSpontane?: (motif: MotifSpontane) => string | ParoleSpontanee | null | undefined;
  /**
   * Que faire quand le système demande de réduire les animations (`prefers-reduced-motion`).
   * `"complet"` (défaut) : ignore la demande du système, elle vit partout comme dans la maquette (hub et apps de Marc).
   * `"doux"` : elle ne traverse jamais l'écran, mais respire, change de forme, fait ses gestes et parle sur place.
   * `"fixe"` : une seule image, rien ne bouge.
   * Le menu de son corps a une ligne « Animations complètes » (hors « fixe ») : le choix de la personne est mémorisé dans ce navigateur et l'emporte sur cette option.
   */
  quandMouvementReduit?: "doux" | "fixe" | "complet";
  /** Heures locales de silence [début, fin[ : aucune parole spontanée. Défaut [22, 7]. */
  silence?: readonly [number, number];
  /** Plafond de relances par jour (mémorisé dans le navigateur). Défaut 2. */
  relancesParJour?: number;
  /**
   * Clic droit sur n'importe quel élément de la page : un menu à quatre entrées, LIA va près de
   * l'élément et pose la question par `ask` (le texte de l'élément y figure comme DONNÉE). Maj + clic
   * droit laisse le menu du navigateur. `false` : LIA ne prend que le clic droit sur son propre corps.
   */
  elements?: false | OptionsElements;
}

/** Ce que l'hôte demande à LIA quand il l'envoie vers un élément (`lia.envoyer`). */
export interface EnvoiLia {
  /** Silhouette à prendre une fois là-bas (« lit », « cherche »…) ; défaut : celle de la visite. */
  etat?: string;
  /** Ce qu'elle dit au bout d'une seconde et demie si elle y est encore. Écrit par l'hôte, jamais par ce paquet. */
  dit?: string;
  /** Combien de temps elle y reste ; défaut 10. */
  secondes?: number;
}

export interface LiaHandle {
  /** Fait parler LIA (bulle + voix). Sans effet si le chat est ouvert ou si on la déplace. */
  dire(texte: string, options?: { chips?: readonly PuceLia[] }): boolean;
  ouvrirChat(): void;
  fermerChat(): void;
  setHumeur(humeur: HumeurLia): void;
  /** Son humeur du moment (l'une des 40 de son réseau), avec son nom et sa couleur : ce que montre la pastille. */
  humeur(): { nom: string; libelle: string; couleur: string };
  /** Force une silhouette (« lit », « cherche »…) ; `null` la rend à sa vie. */
  setEtat(etat: string | null): void;
  setVieAutonome(actif: boolean): void;
  /** Change son rayon (24 à 400 px) : elle y glisse en une demi-seconde (tout de suite en mode « fixe »). Pour un hôte qui la veut grande sur un écran et petite sur un autre, sans la remonter. */
  setRayon(px: number): void;
  /** Suit le curseur un moment (souris ou stylet : sans effet au tactile). `secondes` : défaut 8. */
  suivreCurseur(secondes?: number): boolean;
  /** Va se coller à cet élément, sans faire défiler la page. `secondes` : défaut 10. */
  allerVoir(element: Element, secondes?: number): boolean;
  /**
   * Va se coller à cet élément (sans faire défiler la page), prend `etat` et dit `dit` si elle y est encore.
   * Faux quand elle ne peut pas bouger (vie coupée, mouvement réduit) ou que l'élément n'est pas dans la page.
   */
  envoyer(element: Element, options?: EnvoiLia): boolean;
  /** Fait un des gestes de son menu (salue, content, musique, remercie, surpris, concentre, apprend, veille). */
  geste(geste: GesteLia, secondes?: number): boolean;
  /** Montre une des 39 actions de son moteur (« analyse », « lit », « ecrit », « calcule », « synchronise »…) quelques secondes (3 par défaut, 30 au plus), puis elle reprend sa vie. `false` si le nom est inconnu ou si elle ne peut pas bouger. */
  activite(etat: string, secondes?: number): boolean;
  /** Ses six envies en ce moment (0 à 1) : energie, curiosite, social, inquiet, joie, ennui. Une copie : la modifier ne change rien. */
  envies(): Envies;
  /** Ce qu'elle ressent, du plus fort au plus faible (trois humeurs au plus, de 0 à 1) : `[["inquiet", 0.55], …]`. */
  ressent(): Array<[string, number]>;
  /** Une nouvelle pour son réseau (`bon`, `mauvais`, `touche`, `parle`, `reponse`, `rejet`, `scroll`, `demande`) : monte à `valeur` puis retombe tout seul. */
  impulsion(nom: "touche" | "parle" | "reponse" | "rejet" | "scroll" | "demande" | "bon" | "mauvais", valeur?: number): void;
  /** Ce qu'elle a fait ces derniers temps (20 faits au plus, gardés dans le navigateur) : à l'hôte d'en faire une phrase. */
  journal(): FaitLia[];
  /** Où en est son état partagé (`etat`) : branché, lu au moins une fois, et la dernière version/date vue ou écrite. */
  partage(): { actif: boolean; lu: boolean; version: number; maj: number };
  /** Vient près du curseur (s'il a bougé récemment) ou sur le bord de l'écran, pour que l'hôte la fasse parler. */
  venirPres(): boolean;
  /** Arrête de suivre ou de regarder : elle reste où elle est. */
  rester(): void;
  destroy(): void;
}
