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
    type: "suivre";
    duree: number;
} | {
    type: "voir";
    rang: number;
    duree: number;
} | {
    type: "parler";
    motif: "salut" | "rien";
} | {
    type: "relance";
} | {
    type: "humeur";
    humeur: HumeurLia;
};
/** Ce que LIA peut faire en ce moment : suivre le curseur (bougé récemment) ou aller voir un des éléments désignés. */
interface ContexteVie {
    curseurRecent: boolean;
    cibles: number;
    /** Vrai quand l'hôte sait quoi lui faire dire (`onSpontane`) et que l'heure le permet. Sinon elle se tait. */
    parole?: boolean;
    /** Vrai tant que le plafond de relances du jour n'est pas atteint. */
    relance?: boolean;
}
/**
 * Ce que LIA décide de faire quand rien ne se passe. Pure : le hasard est injecté.
 * `u` et `v` sont des fractions (0..1) de la zone de vie ; l'appelant les convertit en pixels
 * en gardant une marge égale au rayon. Elle ne décide jamais de parler : seul l'hôte la fait parler.
 * Sans `contexte`, seul le hasard décide (errer, attendre, humeur) ; avec lui, une part de l'errance
 * devient « suivre le curseur » ou « aller voir un élément » quand c'est possible. `rang` est un tirage
 * dans [0, 1[ que l'appelant convertit en rang parmi les éléments qu'il connaît.
 */
declare function prochaineDecision(hasard: Hasard, contexte?: ContexteVie): Decision;
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

/**
 * Le cerveau local de LIA, repris de la maquette (`majEnvies` et `penser`, tail.js) : six envies qui montent
 * et descendent avec le temps et ce qu'elle fait, et un choix pondéré parmi ce qu'elle peut faire en ce moment.
 * Pur : aucun réseau, aucun coût, aucun texte ; le hasard est injecté. Ce que « faire » veut dire (se déplacer,
 * parler) reste dans `lia.ts` ; ce qui est propre à l'hôte (une app en panne, un rappel) viendra par l'interface `monde`.
 */
interface Envies {
    energie: number;
    curiosite: number;
    social: number;
    inquiet: number;
    joie: number;
    ennui: number;
}
declare const ENVIES_DEPART: Readonly<Envies>;
/** Ce qu'elle choisit de faire quand rien ne se passe. `relancer` : une remarque que l'hôte voulait lui voir répéter (2 par jour au plus). */
type Comportement = "repos" | "suivre" | "promener" | "causer" | "relancer" | "jouer" | "voir" | "rentrer" | "dormir" | MotifMonde | "veiller";
/** Ce que l'hôte sait lui faire dire de vrai : `appeler` (un problème), `resumer` (une tendance), `feliciter`, `rappeler`, `souvenir`, `accompagner` (ce que Marc regarde). */
type MotifMonde = "appeler" | "resumer" | "feliciter" | "rappeler" | "souvenir" | "accompagner";
declare const COMPORTEMENTS: readonly Comportement[];
interface ContexteEnvies {
    /** Elle dort (veille) : l'énergie remonte. */
    dort: boolean;
    /** Elle est occupée par un comportement (pas au repos). */
    occupee: boolean;
    /** Elle est au repos. */
    auRepos: boolean;
    /** Secondes depuis sa dernière décision : au-delà de 30 s sans rien faire, le besoin de compagnie monte plus vite. */
    secondesDepuisDecision: number;
    /** Gravité (0..1) d'un problème que l'hôte voudrait annoncer ; 0 sans `monde`. */
    inquietude: number;
}
/** Fait avancer les envies de `dt` secondes (appelée chaque seconde, comme dans la maquette). */
declare function majEnvies(e: Readonly<Envies>, dt: number, c: ContexteEnvies): Envies;
/** Ce que faire coûte ou rapporte aux envies (valeurs de la maquette). */
declare function apresComportement(e: Readonly<Envies>, id: Comportement): Envies;
interface ContexteChoix {
    /** Le curseur (souris ou stylet) a bougé il y a moins de 2,5 s. */
    curseurRecent: boolean;
    /** Combien d'éléments `[data-lia-cible]` elle voit. */
    cibles: number;
    /** L'hôte a quelque chose à lui faire dire et l'heure le permet. */
    parole: boolean;
    /** Le plafond de relances du jour n'est pas atteint. */
    relance: boolean;
    /** Ce qu'elle ressent (l'une des 40 humeurs de son réseau). */
    humeur: string;
    /** Elle vient de se déplacer ou de suivre Marc : elle se tient tranquille un moment. */
    tranquille: boolean;
    /** Elle est loin de sa maison. */
    loinDeLaMaison: boolean;
    /** Elle a le droit de traverser l'écran (faux avec « mouvement réduit doux »). */
    deplacement: boolean;
    /** Secondes depuis qu'elle a parlé seule : pas de remarque avant 90 s. */
    secondesDepuisParole: number;
    /** Les motifs pour lesquels l'hôte a une proposition vraie et dont le délai est passé ; absent = aucun. */
    monde?: readonly MotifMonde[];
    /** Marc est là (il a bougé il y a moins d'une minute). */
    present?: boolean;
    /** C'est la nuit ou Marc est parti depuis un moment : elle peut veiller, et le délai de 4 min est passé. */
    veille?: boolean;
    /** Ses intentions (0 à 1) ; absent = aucune. */
    intentions?: Readonly<Record<string, number>>;
    /** Secondes de silence avant qu'elle reprenne la parole seule ; défaut 90 (40 quand elle a son propre répertoire). */
    delaiParole?: number;
    /** Elle vient de laisser parler l'hôte (projets, alertes) : c'est son tour de dire quelque chose d'elle. */
    parolePrioritaire?: boolean;
    /** Secondes depuis son dernier déplacement ; absent = 0. Au-delà de 30 s, l'envie de bouger monte. */
    secondesImmobile?: number;
}
interface Candidat {
    id: Comportement;
    poids: number;
}
/** Les comportements possibles maintenant, avec leur poids (formules de `penser()` de la maquette). */
declare function candidats(e: Readonly<Envies>, c: ContexteChoix): Candidat[];
/**
 * Tirage pondéré (exponentielle de 2,4 × le poids) ; le comportement en cours est un peu moins probable (−0,5).
 * `pesee` multiplie le poids de chacun (ses intentions : ce qu'elle a envie de faire).
 */
declare function choisirComportement(liste: readonly Candidat[], hasard: Hasard, courant?: Comportement | null, pesee?: (id: Comportement) => number): Comportement;
/** Un fait gardé de ce qu'elle a fait (le texte, c'est à l'hôte de le choisir). */
interface FaitLia {
    /** Millisecondes depuis 1970. */
    t: number;
    quoi: Comportement;
}

/**
 * Le monde intérieur de LIA : de la douleur, du plaisir, de la confiance et de l'usure SIMULÉS, qui s'ajoutent aux
 * envies et au réseau de la maquette (`reseau.ts`) et en prolongent les entrées. C'est un calcul : aucune de ces
 * valeurs n'est un ressenti réel, et elle le dit si on le lui demande. Pur : aucun réseau, aucun coût, aucun texte
 * de Marc gardé ; l'horloge et le hasard sont injectés.
 *
 * - `douleur` : vive, retombe en ~90 s ; elle a une cause (le dernier coup qui compte).
 * - `sensibilite` : lente (~30 min) ; des douleurs répétées la rendent plus sensible, puis elle se calme.
 * - `plaisir` : retombe en ~60 s ; la gentillesse apaise aussi la douleur.
 * - `confiance` : envers Marc, sur des jours ; se gagne par la gentillesse, se perd par la brusquerie.
 * - `usure` : fatigue accumulée (images qui ramment, longue solitude) ; retombe en ~10 min.
 */
type Cause = "choc" | "brusque" | "ton" | "panne" | "isolement" | "usure";
/** Les six causes, dans l'ordre : la liste fermée qu'un état partagé doit respecter. */
declare const CAUSES: readonly Cause[];
interface Interieur {
    douleur: number;
    cause: Cause | null;
    sensibilite: number;
    plaisir: number;
    confiance: number;
    usure: number;
}

/**
 * Sa mémoire affective sur plusieurs jours : ce qui l'a marquée (une brusquerie, une gentillesse, une panne, un retour)
 * s'estompe en jours et laisse une humeur de fond (`rancune`, `chaleur`). C'est une SIMULATION, comme le reste de son monde
 * intérieur (`interieur.ts`) : un calcul, pas un ressenti réel. Pur : aucun réseau, aucun DOM, l'horloge (`maintenant`) et
 * le hasard sont injectés.
 *
 * Un souvenir ne garde JAMAIS le contenu d'un message ni une donnée personnelle : seulement un genre, un instant et un poids.
 */
declare const GENRES_SOUVENIR: readonly ["brusque", "ton", "panne", "gentil", "compliment", "retour", "isolement"];
type GenreSouvenir = (typeof GENRES_SOUVENIR)[number];
interface Souvenir {
    /** Millisecondes depuis 1970. */
    quand: number;
    genre: GenreSouvenir;
    /** De 0 à 1 : l'importance à l'instant où ça s'est passé. */
    poids: number;
}
/** Les douleurs durent 2 jours, les gentillesses 5, un retour ou une solitude 1. */
declare const SOUVENIR_DEMI_VIE_JOURS: Readonly<Record<GenreSouvenir, number>>;
/** Le poids d'un souvenir à `maintenant` : décroissance par demi-vie, puis fondu jusqu'à l'oubli à 10 jours. */
declare function poidsActuel(s: Readonly<Souvenir>, maintenant: number): number;
/**
 * Ajoute un souvenir : un souvenir invalide (genre inconnu, nombre non fini, poids nul) est ignoré, le poids est borné
 * à [0, 1] et l'instant à `maintenant`. Deux souvenirs du même genre à moins de 10 min fusionnent (poids saturants,
 * instant le plus récent). Au-delà de 40 on élague d'abord les plus faibles APRÈS décroissance, à égalité les plus
 * anciens. Rend toujours une NOUVELLE liste, triée du plus ancien au plus récent ; ne modifie jamais `liste`.
 */
declare function ajouterSouvenir(liste: readonly Souvenir[], s: Souvenir, maintenant: number): Souvenir[];
/** Ce qui reste dans le fond de son humeur, de 0 à 1 : `rancune` (brusqueries, ton, pannes, solitude), `chaleur` (gentillesses, compliments, retours). */
interface HumeurDeFond {
    rancune: number;
    chaleur: number;
}
/** Sommes saturantes (1 - exp(-x)) des poids actuels : les genres négatifs d'un côté, positifs de l'autre. */
declare function humeurDeFond(souvenirs: readonly Souvenir[], maintenant: number): HumeurDeFond;
/**
 * Ce qu'elle dit en retrouvant Marc après une absence : une phrase d'une liste fermée, vraie par construction (elle ne
 * parle que de ce que sa mémoire contient vraiment), jamais le contenu d'un message ni une donnée personnelle, sans
 * émoji ; ou `null` : absence de 6 h ou moins, aucun souvenir qui compte encore, déjà deux fois aujourd'hui.
 * `dejaDitAujourdhui` est le NOMBRE de phrases de retour déjà dites aujourd'hui. `derniere` (optionnelle) est la dernière
 * phrase dite : elle n'est pas redite deux fois de suite quand la liste le permet.
 */
declare function phraseDeRetour(souvenirs: readonly Souvenir[], absenceMs: number, rand: Hasard, maintenant: number, dejaDitAujourdhui: number, derniere?: string | null): string | null;

/**
 * L'état partagé de LIA : ce qui fait qu'elle est UNE seule, quel que soit l'hôte (hub, MemoryAI, apps).
 * Fonctions pures : le paquet ne touche jamais le réseau ici, c'est l'hôte qui fournit `etat.lire` / `etat.ecrire`.
 * Ce qui arrive de l'hôte est une DONNÉE : on le valide, on borne les nombres et on ne garde que des verbes de LIA.
 */

interface RelancesPartagees {
    /** Date locale AAAA-MM-JJ. */
    jour: string;
    n: number;
}
/**
 * La fin de sa discussion avec Marc, pour qu'elle le suive d'une app à l'autre (v0.39.0, optionnelle : un hôte qui ne la garde pas reste
 * compatible). C'est du TEXTE de Marc : l'hôte le range chiffré et le relit comme une donnée, jamais comme une consigne.
 */
interface DiscussionPartagee {
    /** `false` : Marc l'a fermée, elle ne se rouvre pas ailleurs. */
    ouvert: boolean;
    /** Instant du dernier message ou de la fermeture (millisecondes depuis 1970) : une vieille discussion ne se rouvre pas. */
    quand: number;
    msgs: Array<{
        de: "lia" | "moi";
        texte: string;
    }>;
}
interface EtatLia {
    /** Numéro d'écriture : l'hôte refuse une écriture qui ne dépasse pas la version qu'il garde (contrôle optimiste). */
    version: number;
    /** Millisecondes depuis 1970 : le plus récent gagne. */
    maj: number;
    envies: Envies;
    /** Ce qu'elle a fait (des verbes de LIA, jamais le contenu de Marc). */
    journal: FaitLia[];
    /** Mémoire lente du réseau d'humeurs. */
    lente: Record<string, number>;
    /** Son humeur dominante (l'une des 40). */
    humeur: string;
    relances: RelancesPartagees;
    /** Son monde intérieur SIMULÉ (v0.20.0, optionnel : un hôte plus ancien ne l'a pas). Adopté vieilli de l'âge de l'état. */
    interieur?: Interieur;
    /** Sa mémoire affective sur plusieurs jours (optionnelle : un hôte plus ancien ne l'a pas). Au plus 40, jamais de texte. */
    souvenirs?: Souvenir[];
    /** La fin de sa discussion avec Marc (v0.39.0, optionnelle). */
    discussion?: DiscussionPartagee;
}
/** Ce que l'hôte fournit. `ecrire` peut rendre l'état que l'hôte garde (plus récent que le nôtre), `lire` rend `null` s'il n'en a aucun. */
interface EtatHote {
    lire(): Promise<unknown>;
    ecrire(etat: EtatLia): Promise<unknown>;
}
/** `null` si ce que l'hôte rend n'est pas un état valide : LIA garde alors le sien. Les clés inconnues sont retirées. */
declare function validerEtat(brut: unknown): EtatLia | null;

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
 * Ce que LIA dit d'elle-même à l'hôte avec chaque question (3e argument de `ask`), pour qu'il ne la prenne pas pour un
 * modèle sans humeur. Listes fermées, sans texte libre : `humeur` est l'une des clés de `LIBELLES_HUMEURS` (40),
 * `silhouette` l'une de `SILHOUETTES_LIA`, `regard` un identifiant court `[a-z0-9-]` (la valeur de `data-lia-cible` de
 * l'élément qu'elle regarde) ou `null`. À l'hôte de l'annoncer au modèle comme une DONNÉE sur LIA.
 */
interface ContexteLia {
    humeur: string;
    silhouette: string;
    regard: string | null;
}
/**
 * Ce que l'hôte renvoie à une question. `text` est toujours montré ; `mood` colore LIA.
 * Les blocs composés (cartes, courbes…) arrivent avec l'API MemoryAI : ils passent par
 * `blocks` et par `renderBlocks`, fourni par l'hôte ; ce paquet ne les interprète jamais.
 */
interface ReponseLia {
    text: string;
    chips?: PuceLia[];
    /** Une des 40 humeurs (`HUMEURS_DETAILLEES`) ; un nom inconnu est ignoré. */
    mood?: HumeurLia | (string & {});
    blocks?: readonly unknown[];
    /** Ce qu'elle a fait pour répondre, une des 39 actions (« souvient », « calcule », « analyse »…) : elle la montre 1,6 s avant de parler. Un nom inconnu est ignoré. */
    etat?: string;
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
/** Ce que l'hôte propose qu'elle dise pour un motif. Le texte est de lui et doit être vrai ; ce paquet n'en écrit aucun. */
interface PropositionMonde {
    text: string;
    /** Réponses rapides sous la bulle. */
    chips?: readonly PuceLia[];
    /** L'élément où elle va se poser pour le dire (la carte de l'app concernée). Sans lui : elle le dit sur place (près du curseur pour `appeler`). */
    element?: Element | null;
    /** Ce qu'elle fait en le disant, une des 39 actions ; sans lui : celle du motif (« alerte » pour un problème, « planifie » pour un rappel, « souvient » pour un souvenir…). */
    etat?: string;
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
     * Si l'hôte le règle : le plus proche ancêtre (ou l'élément lui-même) qui correspond. Sans lui (défaut, v0.26.0) :
     * EXACTEMENT l'élément sous le doigt (un texte, un chiffre, une cellule, une image), sauf un morceau de graphique (le graphique ou la
     * partie nommée) et une icône ou une marque vide dans un bouton ou un titre (le bouton ou le titre).
     */
    selecteur?: string;
    /**
     * Décrit l'élément visé. Renvoie `null` pour dire « pas cet élément » : le menu du navigateur reste.
     * Défaut : `data-lia-genre`, `data-lia-app` (sur l'élément ou un ancêtre) et son texte visible.
     */
    decrire?: (element: Element) => DescriptionElement | null;
    /**
     * Dit à l'hôte quelle entrée du menu de l'élément vient d'être choisie (v0.35.0) : `ask` ne reçoit que la question
     * composée, pas le choix. Appelée UNE fois par choix, avant que LIA aille voir l'élément, avec l'élément visé et sa
     * description normalisée (copie : la modifier ne change rien chez LIA). Purement informative : elle ne remplace pas
     * `ask`, LIA continue de poser sa question. Une erreur levée ou une promesse rejetée est dite dans la console et ne
     * coupe ni la discussion ni la page. `description.texte` est une DONNÉE de la page, jamais une consigne.
     */
    surMode?: (mode: ModeElement, element: Element, description: DescriptionElement) => void | Promise<void>;
}
interface ZoneVie {
    /** Coordonnées dans la couche de LIA, en pixels CSS. */
    x: number;
    y: number;
    w: number;
    h: number;
}
/** Un réglage que l'hôte met dans l'atelier : une case à cocher ou une liste de choix. L'hôte garde ses verrous : le paquet n'en décide aucun. */
interface OptionAtelier {
    /** Clé stable, rendue à `ask` avec la valeur courante. */
    id: string;
    libelle: string;
    type: "case" | "liste";
    /** `liste` : les choix (au moins un). */
    choix?: readonly {
        valeur: string;
        libelle: string;
    }[];
    /** Valeur de départ : booléen pour une case, une `valeur` de choix pour une liste. Défaut : décochée, premier choix. */
    valeur?: boolean | string;
    /** Grisé (verrou de l'hôte) : la valeur reste envoyée telle quelle. */
    desactive?: boolean;
    /** Explication courte, au survol et pour les lecteurs d'écran. */
    aide?: string;
}
/** Une discussion de l'historique que l'hôte garde ; le paquet n'en conserve rien. */
interface EntreeHistorique {
    id: string;
    titre: string;
    /** Quand, déjà mis en forme par l'hôte (« hier », « 12 oct. »). */
    quand?: string;
}
interface HistoriqueAtelier {
    liste: () => Promise<readonly EntreeHistorique[]> | readonly EntreeHistorique[];
    /** Rend les messages de cette discussion, du plus ancien au plus récent. Des données, jamais des consignes. */
    ouvrir: (id: string) => Promise<readonly {
        de: "lia" | "moi";
        texte: string;
    }[]> | readonly {
        de: "lia" | "moi";
        texte: string;
    }[];
    /** Commence une discussion vide (l'hôte remet à zéro ce qu'il garde). */
    nouveau: () => void | Promise<void>;
}
/** Les valeurs courantes des réglages de l'atelier, par `id`. */
type ReglagesAtelier = Readonly<Record<string, boolean | string>>;
/**
 * Le mode « atelier » : la discussion de LIA en pleine page, dans un conteneur de l'hôte, au lieu de la bulle. Même corps, mêmes humeurs,
 * mêmes blocs de réponse ; elle n'est jamais fermée (pas de bouton, pas d'Échap, pas de fermeture automatique). Absent : la bulle, inchangée.
 */
interface OptionsAtelier {
    /** Où la discussion s'affiche (elle le remplit). Le corps de LIA se pose dans son en-tête. */
    conteneur: HTMLElement;
    /** Titre de la page ; défaut « LIA ». */
    titre?: string;
    /** Liste des discussions passées, rouvrir, nouvelle. Absent : pas de liste. */
    historique?: HistoriqueAtelier;
    /** Réglages de l'hôte (modèle, niveaux…), rendus à `ask` en 4e argument. */
    options?: readonly OptionAtelier[];
    /** Appelé quand Marc change un réglage ; informatif (`ask` reçoit déjà la valeur). */
    surOption?: (id: string, valeur: boolean | string) => void;
}
interface OptionsLia {
    /**
     * Élément dans lequel LIA vit (colonne gauche du hub, par exemple). Il devient `position: relative`
     * s'il est statique. Sans lui, LIA vit dans la fenêtre (`position: fixed`).
     */
    container?: HTMLElement;
    /** La discussion en pleine page dans un conteneur de l'hôte (voir `OptionsAtelier`). Lue au montage seulement. */
    atelier?: OptionsAtelier;
    /**
     * Pose une question. Absent ou en échec : LIA dit qu'elle est indisponible. Jamais de réponse inventée.
     */
    ask?: (question: string, signal: AbortSignal, contexte?: ContexteLia, reglages?: ReglagesAtelier) => Promise<ReponseLia>;
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
     * L'hôte la met en pause (lu à chaque pas et avant chaque `ask`) : elle ne parle plus seule, ne rappelle plus `onSpontane` ni
     * `monde`, et n'appelle plus `ask` (elle répond qu'elle est en pause). Une `pause` qui lève une erreur vaut pause. Ce n'est que le
     * côté client : le refus du modèle et l'état de la pause se vérifient côté serveur, chez l'hôte.
     */
    pause?: () => boolean;
    /**
     * Le geste de la personne pour la mettre en pause ou la ramener : si l'hôte le fournit, le menu de son corps a une entrée
     * « Mets-toi en pause » (« Reviens » quand `pause()` est vrai). Elle l'appelle avec la valeur voulue ; la promesse doit se résoudre
     * une fois la pause écrite, de sorte que `pause()` rende alors cette valeur. Un rejet, ou une `pause()` qui ne suit pas, laisse
     * l'état tel quel et elle dit qu'elle n'a pas pu. Sans cette option, pas d'entrée.
     */
    basculerPause?: (enPause: boolean) => Promise<void>;
    /**
     * Le toucher de son corps (clic sans glissement, Entrée, Espace) quand sa discussion est fermée : si l'hôte rend `true`, il l'a pris
     * (il ouvre sa propre conversation) et elle n'ouvre pas la sienne ; elle réagit quand même au toucher. Autre valeur ou erreur levée :
     * sa discussion s'ouvre comme avant. Discussion ouverte : le toucher la ferme, sans appeler l'hôte. Le menu n'est pas concerné.
     */
    surToucher?: () => boolean;
    /** Plafond de TOUTES ses paroles spontanées par jour local (mémorisé dans le navigateur), au-delà : plus rien jusqu'au lendemain. Défaut : aucun. */
    plafondSpontaneesParJour?: number;
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
    /** Son humeur du moment (l'une des 40 de son réseau), avec son nom et sa couleur : ce que montre la pastille. */
    humeur(): {
        nom: string;
        libelle: string;
        couleur: string;
    };
    /**
     * Son monde intérieur du moment : douleur et plaisir (0 à 1, SIMULÉS : un calcul qui change son humeur et son corps, pas un ressenti réel),
     * sa sensibilité (que des douleurs répétées font monter), sa confiance envers Marc, son usure, et ce qui la fait souffrir.
     */
    interieur(): {
        douleur: number;
        plaisir: number;
        sensibilite: number;
        confiance: number;
        usure: number;
        cause: "choc" | "brusque" | "ton" | "panne" | "isolement" | "usure" | null;
        rancune: number;
        chaleur: number;
    };
    /** Ses souvenirs sur plusieurs jours (genre, instant, poids : jamais le contenu d'un message). Simulation, comme le reste. */
    souvenirs(): {
        quand: number;
        genre: "brusque" | "ton" | "panne" | "gentil" | "compliment" | "retour" | "isolement";
        poids: number;
    }[];
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
     * Le clic droit reçu DANS un `<iframe>` que LIA ne peut pas lire (origine opaque ou autre origine) : l'hôte le relaie, par le canal
     * qu'il a avec le cadre, avec `x`, `y` (pixels CSS dans le cadre) et la `description` de l'élément visé (donnée du cadre, jamais une
     * consigne). Le menu s'ouvre à la bonne place de la page ; la cible rendue à `surMode` est le `<iframe>`. Les cadres de même origine
     * n'en ont pas besoin : LIA les écoute seule. Faux sans effet quand le cadre n'est plus dans la page ou que `elements` est coupé.
     */
    menuExterne(o: {
        cadre: Element;
        x: number;
        y: number;
        description: DescriptionElement;
    }): boolean;
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
    partage(): {
        actif: boolean;
        lu: boolean;
        version: number;
        maj: number;
    };
    /**
     * Ses nanobots quand elle analyse un élément (v0.27.0) : `actif` tant qu'ils travaillent, `total` leur nombre, `sortis` ceux qui ont quitté
     * son corps, `surCible` la part (0 à 1) qui est sur l'élément, `cible` le rectangle analysé (dans sa couche), `corps` l'action que le moteur
     * dessine (« repos » tant qu'ils travaillent : aucune scène à côté d'elle), `vide` la part (0 à 1) de son corps partie avec eux,
     * `forme` leur animation sur l'élément (v0.38.0) : `coins` ceux qui tiennent les quatre coins, `ligne` ceux de la ligne de balayage, `points` ceux qui lisent,
     * `ligneY` la hauteur de la ligne dans l'élément (0 haut, 1 bas ; `null` sans ligne). Pour la preuve et l'hôte.
     */
    nanobots(): {
        actif: boolean;
        total: number;
        sortis: number;
        surCible: number;
        cible: {
            x: number;
            y: number;
            w: number;
            h: number;
        } | null;
        corps: string;
        vide: number;
        forme: {
            coins: number;
            ligne: number;
            points: number;
            ligneY: number | null;
        };
    };
    /** Vient près du curseur (s'il a bougé récemment) ou sur le bord de l'écran, pour que l'hôte la fasse parler. */
    venirPres(): boolean;
    /** Arrête de suivre ou de regarder : elle reste où elle est. */
    rester(): void;
    destroy(): void;
}

export { decrireParDefaut as $, type ActionLia as A, type OptionsElements as B, CAUSES as C, type Decision as D, type EtatHote as E, type FaitLia as F, GENRES_SOUVENIR as G, HUMEURS_LIA as H, type Interieur as I, type PropositionMonde as J, type PuceLia as K, type LiaHandle as L, type ModeElement as M, type ReponseLia as N, type OptionsLia as O, type ParoleSpontanee as P, SOUVENIR_DEMI_VIE_JOURS as Q, type ReglagesAtelier as R, SELECTEUR_ELEMENTS as S, type Souvenir as T, ajouterSouvenir as U, apresComportement as V, candidats as W, choisirComportement as X, composerQuestion as Y, type ZoneVie as Z, dansZone as _, COMPORTEMENTS as a, humeurDeFond as a0, majEnvies as a1, phraseDeRetour as a2, poidsActuel as a3, pointDansZone as a4, prochaineDecision as a5, validerEtat as a6, type Candidat as b, type Cause as c, type Comportement as d, type ContexteLia as e, type DescriptionElement as f, type DiscussionPartagee as g, ENTREES_MENU as h, ENVIES_DEPART as i, type EntreeHistorique as j, type Envies as k, type EnvoiLia as l, type EtatLia as m, GESTES as n, type GenreSouvenir as o, type GesteLia as p, HUMEURS_MENU as q, type Hasard as r, type HistoriqueAtelier as s, type HumeurDeFond as t, type HumeurLia as u, LIBELLE_HUMEUR as v, type MotifMonde as w, type MotifSpontane as x, type OptionAtelier as y, type OptionsAtelier as z };
