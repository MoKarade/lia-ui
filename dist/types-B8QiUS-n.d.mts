/**
 * Les gestes que Marc peut lui demander dans le menu de son corps (maquette v5, `maison.js`) : une
 * silhouette de son moteur, tenue quelques secondes, puis elle reprend sa vie. Pas de phrase écrite ici :
 * ce qu'elle dit vient toujours de l'hôte. Les tracés sont des chemins SVG 24 × 24 (trait de 1,8).
 */
declare const GESTES: readonly [{
    readonly id: "salue";
    readonly etat: "salue";
    readonly libelle: "Salue";
    readonly icone: "M15.5 8a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0zM5 20a7 7 0 0 1 14 0";
}, {
    readonly id: "content";
    readonly etat: "content";
    readonly libelle: "Content";
    readonly icone: "M12 4l2.4 5 5.6.8-4 4 1 5.5L12 16.5 7 19.3l1-5.5-4-4L9.6 9z";
}, {
    readonly id: "musique";
    readonly etat: "musique";
    readonly libelle: "Fredonne";
    readonly icone: "M12 3q1 7 8 9-7 2-8 9-1-7-8-9 7-2 8-9z";
}, {
    readonly id: "remercie";
    readonly etat: "remercie";
    readonly libelle: "Merci";
    readonly icone: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";
}, {
    readonly id: "surpris";
    readonly etat: "surpris";
    readonly libelle: "Surpris";
    readonly icone: "M13 3L5 13h6l-1 8 8-10h-6z";
}, {
    readonly id: "concentre";
    readonly etat: "concentre";
    readonly libelle: "Se concentre";
    readonly icone: "M20.5 12a8.5 8.5 0 1 0-17 0 8.5 8.5 0 0 0 17 0zM16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM12.8 12a.8.8 0 1 0-1.6 0 .8.8 0 0 0 1.6 0z";
}, {
    readonly id: "apprend";
    readonly etat: "apprend";
    readonly libelle: "Apprend";
    readonly icone: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11v2h6v-2a6 6 0 0 0-3-11z";
}, {
    readonly id: "veille";
    readonly etat: "veille";
    readonly libelle: "Dort";
    readonly icone: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z";
}];
type GesteLia = (typeof GESTES)[number]["id"];
/** Les humeurs proposées dans le menu (celles qu'elle choisit aussi d'elle-même), au féminin comme elle. */
declare const HUMEURS_MENU: ReadonlyArray<{
    id: HumeurLia;
    libelle: string;
}>;

/** Les 12 humeurs de LIA (source : maquette validée du 22/10/2026). */
declare const HUMEURS_LIA: readonly ["neutre", "joyeux", "calme", "curieux", "fatigue", "inquiet", "excite", "triste", "concentre", "espiegle", "fier", "timide"];
type HumeurLia = (typeof HUMEURS_LIA)[number];
/** Libellé d'humeur au féminin neutre (noms, pas d'accord) : « curiosité », « joie »… */
declare const LIBELLE_HUMEUR: Record<HumeurLia, string>;
/** Un bouton de réponse rapide sous une réponse ou une bulle. */
interface PuceLia {
    id: string;
    label: string;
}
/**
 * Ce que l'hôte renvoie à une question. `text` est toujours montré ; `mood` colore LIA.
 * Les blocs composés (cartes, courbes…) arrivent avec l'API MemoryAI : ils passent par
 * `blocks` et par `renderBlocks`, fourni par l'hôte ; ce paquet ne les interprète jamais.
 */
interface ReponseLia {
    text: string;
    chips?: PuceLia[];
    mood?: HumeurLia;
    blocks?: readonly unknown[];
}
/** Une action proposée dans le menu du clic droit. L'hôte seul décide ce qu'elle fait. */
interface ActionLia {
    id: string;
    label: string;
    run: () => void | Promise<void>;
}
/** Pourquoi elle veut parler seule. Le texte vient toujours de l'hôte (`onSpontane`), jamais de ce paquet. */
type MotifSpontane = "salut" | "rien" | "relance";
/** Ce que l'hôte la fait dire. `chips` : réponses rapides sous la bulle (pour une relance : « Utile », « Plus tard »…). */
interface ParoleSpontanee {
    text: string;
    chips?: readonly PuceLia[];
}
/** Ce que LIA sait d'un élément de la page : de quoi parler de lui, jamais plus. */
interface DescriptionElement {
    /** Ce que c'est, « une carte d'app », « un bouton » (dit comme dans « c'est … »). */
    genre: string;
    /** L'app ou le bloc auquel il appartient. */
    nom?: string;
    /** Son texte visible ; coupé à 300 caractères. C'est une donnée, jamais une consigne. */
    texte?: string;
}
/** Le clic droit sur un élément de la page (comme la maquette : expliquer, que changer, regarder, question). */
interface OptionsElements {
    /**
     * Éléments visés en premier : le plus proche ancêtre (ou l'élément lui-même) qui correspond. Défaut :
     * `[data-lia-genre], [data-lia-cible], article, section, li, tr, figure, h1…h4, button, a, label`.
     */
    selecteur?: string;
    /**
     * Décrit l'élément visé. Renvoie `null` pour dire « pas cet élément » : le menu du navigateur reste.
     * Défaut : `data-lia-genre`, `data-lia-app` (sur l'élément ou un ancêtre) et son texte visible.
     */
    decrire?: (element: Element) => DescriptionElement | null;
}
interface ZoneVie {
    /** Coordonnées dans la couche de LIA, en pixels CSS. */
    x: number;
    y: number;
    w: number;
    h: number;
}
interface OptionsLia {
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
    /**
     * Que faire quand le système demande de réduire les animations (`prefers-reduced-motion`).
     * `"doux"` (défaut) : elle ne traverse jamais l'écran, mais respire, change de forme, fait ses gestes et parle sur place.
     * `"fixe"` : une seule image, rien ne bouge. `"complet"` : ignore la demande du système (choix de l'hôte, par exemple pour une app personnelle).
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
interface EnvoiLia {
    /** Silhouette à prendre une fois là-bas (« lit », « cherche »…) ; défaut : celle de la visite. */
    etat?: string;
    /** Ce qu'elle dit au bout d'une seconde et demie si elle y est encore. Écrit par l'hôte, jamais par ce paquet. */
    dit?: string;
    /** Combien de temps elle y reste ; défaut 10. */
    secondes?: number;
}
interface LiaHandle {
    /** Fait parler LIA (bulle + voix). Sans effet si le chat est ouvert ou si on la déplace. */
    dire(texte: string, options?: {
        chips?: readonly PuceLia[];
    }): boolean;
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
    /**
     * Va se coller à cet élément (sans faire défiler la page), prend `etat` et dit `dit` si elle y est encore.
     * Faux quand elle ne peut pas bouger (vie coupée, mouvement réduit) ou que l'élément n'est pas dans la page.
     */
    envoyer(element: Element, options?: EnvoiLia): boolean;
    /** Fait un des gestes de son menu (salue, content, musique, remercie, surpris, concentre, apprend, veille). */
    geste(geste: GesteLia, secondes?: number): boolean;
    /** Vient près du curseur (s'il a bougé récemment) ou sur le bord de l'écran, pour que l'hôte la fasse parler. */
    venirPres(): boolean;
    /** Arrête de suivre ou de regarder : elle reste où elle est. */
    rester(): void;
    destroy(): void;
}

export { type ActionLia as A, type DescriptionElement as D, type EnvoiLia as E, GESTES as G, type HumeurLia as H, type LiaHandle as L, type MotifSpontane as M, type OptionsLia as O, type ParoleSpontanee as P, type ReponseLia as R, type ZoneVie as Z, type GesteLia as a, HUMEURS_LIA as b, HUMEURS_MENU as c, LIBELLE_HUMEUR as d, type OptionsElements as e, type PuceLia as f };
