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
 * Ce que l'hôte renvoie à une question. `text` est toujours montré ; `mood` colore LIA.
 * Les blocs composés (cartes, courbes…) arrivent avec l'API MemoryAI : ils passent par
 * `blocks` et par `renderBlocks`, fourni par l'hôte ; ce paquet ne les interprète jamais.
 */
export interface ReponseLia {
  text: string;
  chips?: PuceLia[];
  mood?: HumeurLia;
  blocks?: readonly unknown[];
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
  ask?: (question: string, signal: AbortSignal) => Promise<ReponseLia>;
  /** Actions du menu (clic droit, appui long, touche Menu), ajoutées aux actions de LIA. */
  actions?: readonly ActionLia[];
  /**
   * Dessine les blocs d'une réponse dans l'élément donné. L'hôte valide ses blocs (schéma) et
   * n'écrit jamais de HTML venu du modèle. Absent : les blocs sont ignorés, le texte reste.
   */
  renderBlocks?: (blocs: readonly unknown[], dans: HTMLElement) => void;
  /** Appelé au clic sur une puce de réponse rapide. */
  onChip?: (id: string, contexte: "reponse" | "bulle") => void;
  /** Appelé quand l'humeur change (pour un voyant côté hôte). */
  onHumeur?: (humeur: HumeurLia) => void;
  /** Zone où LIA a le droit de se déplacer ; par défaut toute la couche. */
  bounds?: () => ZoneVie;
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
  /** Heures locales de silence [début, fin[ : aucune parole spontanée. Défaut [22, 7]. */
  silence?: readonly [number, number];
  /** Plafond de relances par jour (mémorisé dans le navigateur). Défaut 2. */
  relancesParJour?: number;
}

export interface LiaHandle {
  /** Fait parler LIA (bulle + voix). Sans effet si le chat est ouvert ou si on la déplace. */
  dire(texte: string, options?: { chips?: readonly PuceLia[] }): boolean;
  ouvrirChat(): void;
  fermerChat(): void;
  setHumeur(humeur: HumeurLia): void;
  /** Force une silhouette (« lit », « cherche »…) ; `null` la rend à sa vie. */
  setEtat(etat: string | null): void;
  setVieAutonome(actif: boolean): void;
  /** Suit le curseur un moment (souris ou stylet : sans effet au tactile). `secondes` : défaut 8. */
  suivreCurseur(secondes?: number): boolean;
  /** Va se coller à cet élément, sans faire défiler la page. `secondes` : défaut 10. */
  allerVoir(element: Element, secondes?: number): boolean;
  /** Vient près du curseur (s'il a bougé récemment) ou sur le bord de l'écran, pour que l'hôte la fasse parler. */
  venirPres(): boolean;
  /** Arrête de suivre ou de regarder : elle reste où elle est. */
  rester(): void;
  destroy(): void;
}
