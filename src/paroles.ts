import type { Envies, FaitLia } from "./cerveau.js";
import { LIBELLES_HUMEURS } from "./humeurs.js";

/**
 * Ce qu'elle dit d'elle-même quand l'hôte n'a rien de vrai à dire (répertoire de la maquette v5 : `PAROLES`,
 * `humPhrase`, `JOKES`, `SUITES`). Chaque phrase est vraie PAR CONSTRUCTION : l'heure vient de l'horloge, l'humeur et
 * les envies sont les siennes, le journal est le sien. Rien sur Marc ni sur ses apps (c'est le rôle de l'hôte), aucun
 * chiffre inventé. Les blagues se disent pour des blagues. Pur : le hasard et l'heure sont injectés.
 */

export interface PuceParole {
  id: string;
  label: string;
}

export interface ParoleChoisie {
  id: string;
  text: string;
  chips?: PuceParole[];
}

export interface ContexteParole {
  /** Heure locale, 0 à 23. */
  heure: number;
  humeur: string;
  envies: Readonly<Envies>;
  faits: readonly FaitLia[];
  /** Millisecondes depuis 1970. */
  maintenant: number;
  /** Ce qu'elle a dit récemment (identifiants) : elle s'en répète moins. */
  recentes: readonly string[];
}

type Hasard = () => number;

/** Son humeur à la première personne, une phrase pour chacune des 40 (maquette `humPhrase`, au féminin). */
export const PHRASES_HUMEUR: Readonly<Record<string, string>> = {
  neutre: "Calme, tranquille.",
  joyeux: "Plutôt bien, merci !",
  calme: "Posée. Presque endormie, mais à l'écoute.",
  curieux: "Curieuse, comme d'habitude.",
  fatigue: "Un peu fatiguée : mes traits traînent.",
  inquiet: "Un peu inquiète, quelque chose me tracasse.",
  excite: "Excitée, je ne sais pas trop pourquoi.",
  triste: "Un peu à plat, je l'avoue.",
  concentre: "Concentrée.",
  espiegle: "Pleine d'énergie, attention.",
  fier: "Fière de moi, ça arrive.",
  timide: "Un peu timide aujourd'hui.",
  serein: "Sereine. Tout est à sa place.",
  attentif: "Attentive, je t'écoute.",
  vigilant: "Sur mes gardes, sans plus.",
  protecteur: "Protectrice : je garde un œil sur la page.",
  mefiant: "Un peu méfiante, je l'avoue.",
  boudeur: "Un peu boudeuse : on ne s'est pas beaucoup parlé.",
  nostalgique: "Nostalgique, je repensais à nos échanges.",
  reveur: "Rêveuse, la tête dans les nuages.",
  ennuye: "Je m'ennuie un peu.",
  taquin: "Taquine, méfie-toi.",
  soulage: "Soulagée : ça va mieux.",
  emerveille: "Émerveillée, j'ai vu quelque chose de beau.",
  gene: "Un peu gênée.",
  determine: "Déterminée.",
  agace: "Un peu agacée, mais ça passe.",
  tendre: "Tendre, aujourd'hui.",
  confiant: "Confiante : ça se passe bien.",
  reconnaissant: "Reconnaissante, tu es revenu.",
  amuse: "Amusée, je ne sais pas pourquoi.",
  dubitatif: "Dubitative : quelque chose ne colle pas.",
  impatient: "Un peu impatiente de ta réponse.",
  compatissant: "Je pense à toi.",
  euphorique: "Euphorique, tout va bien.",
  paisible: "Paisible.",
  pensif: "Pensive.",
  empresse: "Empressée : il y a à faire.",
  solidaire: "Solidaire : on regarde ça ensemble.",
  optimiste: "Optimiste, ça s'améliore.",
};

export const BLAGUES: readonly string[] = [
  "Un jour, quelqu'un va me dire « juste un petit changement ». Ce jour-là, je démissionne.",
  "Pourquoi les nanobots n'ont jamais froid ? Parce qu'ils se serrent les coudes. Je sais, je sais.",
  "Un octet entre dans un bar et dit : « Un bit de plus, s'il vous plaît. »",
  "Combien faut-il de développeurs pour changer une ampoule ? Aucun, c'est un problème de matériel.",
];

/** Ce qu'elle répond quand Marc clique sur l'une de ses réponses rapides (maquette `SUITES`). Les puces de ce répertoire portent l'identifiant `lia:<libellé>`. */
export const SUITES: Readonly<Record<string, string | null>> = {
  "Le matin": "Le matin, donc. Moi, je n'ai pas d'heure préférée, mais le calme du matin me plaît.",
  "Le soir": "Le soir. Tout ralentit, c'est vrai.",
  "Ça dépend": "Ça dépend : la bonne réponse, honnêtement.",
  "Des pâtes": "Des pâtes. Valeur sûre.",
  "Du riz": "Du riz : simple et efficace. J'approuve.",
  "Une surprise": "Une surprise ! Ça change, au moins.",
  Beau: "Du beau temps. Profites-en.",
  Gris: "Gris. Ça tombe bien, il y a de quoi regarder ici.",
  "Il pleut": "De la pluie. Moi je suis bien au sec dans ton écran.",
  Oui: "Parfait. On travaille mieux le ventre plein, même quand on est faite de cent traits.",
  "Pas encore": "Alors vas-y, je reste là pendant ce temps.",
  Haha: "Merci. Ça fait un petit saut de joie.",
  "Une autre": null,
  Bof: "Bon. L'humour, je dois encore progresser.",
  "Non merci": "D'accord. Je garde ça pour moi.",
  "Les listes": "Les listes : tout est à sa place.",
  "Les courbes": "Les courbes, surtout celles qui montent doucement.",
  "Les deux": "Les deux. Rien n'empêche de tout aimer.",
  Café: "Un café. Moi je tourne à la lumière de l'écran.",
  Thé: "Du thé. Ça se boit lentement, comme j'aime.",
  Rien: "Rien du tout, c'est un choix aussi.",
  "Une blague": null,
  Chut: "D'accord, chut.",
  Bien: "Content de l'entendre.",
  "Comme ci comme ça": "Ça arrive. Je reste là, sans faire de bruit.",
  Fatigué: "Alors je reste discrète.",
};

const puces = (...labels: string[]): PuceParole[] => labels.map((label) => ({ id: `lia:${label}`, label }));

export const estPuceLia = (id: string): boolean => id.startsWith("lia:");

const VERBES: Readonly<Record<string, readonly [string, string]>> = {
  promener: ["je me suis promenée", "fois"],
  jouer: ["j'ai joué", "fois"],
  voir: ["je suis allée voir quelque chose", "fois"],
  suivre: ["j'ai suivi ton curseur", "fois"],
  causer: ["je t'ai parlé", "fois"],
  relancer: ["je t'ai relancé", "fois"],
  rentrer: ["je suis rentrée chez moi", "fois"],
  dormir: ["je me suis endormie", "fois"],
  veiller: ["j'ai veillé", "fois"],
  appeler: ["je suis venue te prévenir", "fois"],
  resumer: ["je t'ai fait un résumé", "fois"],
  feliciter: ["je t'ai félicité", "fois"],
  rappeler: ["je t'ai rappelé quelque chose", "fois"],
  souvenir: ["je t'ai parlé d'un souvenir", "fois"],
  accompagner: ["j'ai regardé avec toi", "fois"],
};

/** Ce qu'elle a fait depuis 3 h, d'après son journal et rien d'autre. */
export function resumeJournal(faits: readonly FaitLia[], maintenant: number): string {
  const depuis = maintenant - 3 * 3600_000;
  const n = new Map<string, number>();
  for (const f of faits) if (f.t >= depuis && VERBES[f.quoi]) n.set(f.quoi, (n.get(f.quoi) ?? 0) + 1);
  if (!n.size) return "Rien de marquant depuis tout à l'heure.";
  const parts = [...n.entries()].map(([quoi, k]) => `${VERBES[quoi]?.[0] ?? quoi}${k > 1 ? ` ${k} fois` : ""}`);
  return `Depuis tout à l'heure : ${parts.join(", ")}.`;
}

interface Parole {
  id: string;
  poids: (c: ContexteParole) => number;
  dit: (c: ContexteParole, hasard: Hasard) => string;
  chips?: PuceParole[];
}

const choisir = <T>(liste: readonly T[], hasard: Hasard): T => liste[Math.min(liste.length - 1, Math.floor(hasard() * liste.length))] as T;

const PAROLES: readonly Parole[] = [
  {
    id: "heure",
    poids: () => 1,
    dit: ({ heure }, h) =>
      choisir(
        heure < 6
          ? [
              "Il est tard, ou très tôt. Moi je ne dors qu'en veille, mais toi, tu devrais peut-être.",
              "La nuit, la page est silencieuse. Je veille.",
            ]
          : heure < 11
            ? ["Bon matin. Le matin, tous mes traits sont bien alignés.", "Le matin, j'ai l'impression que tout est à refaire, et ça me plaît."]
            : heure < 14
              ? [
                  "Presque l'heure de manger. Je n'ai pas faim, mais je suis curieuse de ton assiette.",
                  "Midi approche. Je n'ai pas d'estomac, mais je respecte l'institution.",
                ]
              : heure < 18
                ? ["L'après-midi, la page se calme. J'aime bien ce moment.", "L'après-midi, la lumière change. Moi, je ne la vois pas, mais je l'imagine."]
                : ["Le soir, tout ralentit. Je fais pareil.", "Le soir, j'ai envie de parler moins fort."],
        h,
      ),
  },
  { id: "humeur", poids: () => 1.6, dit: ({ humeur }) => PHRASES_HUMEUR[humeur] ?? "Calme, tranquille." },
  { id: "ennui", poids: ({ envies }) => (envies.ennui > 0.55 ? 2 : 0), dit: () => "Je m'ennuie un peu. Un clic droit sur quelque chose de la page, ça m'occuperait." },
  { id: "solitude", poids: ({ envies }) => (envies.social < 0.25 ? 2 : 0), dit: () => "On ne s'est pas beaucoup parlé. Clique sur moi si tu veux discuter." },
  { id: "curiosite", poids: ({ envies }) => (envies.curiosite > 0.65 ? 1.8 : 0), dit: () => "Je regarde ce qui bouge sur la page, par curiosité." },
  { id: "fatigue", poids: ({ envies }) => (envies.energie < 0.4 ? 2 : 0), dit: () => "Je suis un peu fatiguée. Je ralentis." },
  { id: "joie", poids: ({ envies }) => (envies.joie > 0.65 ? 1.8 : 0), dit: () => "Je suis de bonne humeur, sans raison précise." },
  { id: "souci", poids: ({ envies }) => (envies.inquiet > 0.5 ? 1.8 : 0), dit: () => "Quelque chose me tracasse un peu. Je garde l'œil ouvert." },
  { id: "poulpe", poids: () => 1, dit: () => "Tu savais que les poulpes ont trois cœurs ? Moi, zéro cœur et cent traits. Je pense qu'on s'en sort pareil." },
  { id: "cent", poids: () => 1, dit: () => "J'ai compté : j'ai toujours cent traits dans mon corps. Je n'en ai jamais perdu un seul. Je suis un peu fière." },
  { id: "respire", poids: () => 0.8, dit: () => "Je respire doucement, tu as vu ? Même quand je ne fais rien, je ne suis jamais tout à fait immobile." },
  { id: "matin", poids: () => 1, dit: () => "Question sans importance : tu préfères le matin ou le soir ?", chips: puces("Le matin", "Le soir", "Ça dépend") },
  { id: "repas", poids: () => 1, dit: () => "Si tu devais manger la même chose toute une semaine, ce serait quoi ?", chips: puces("Des pâtes", "Du riz", "Une surprise") },
  { id: "meteo", poids: () => 1, dit: () => "Il fait quel temps chez toi ? Je ne vois pas dehors, je ne vois que cette page.", chips: puces("Beau", "Gris", "Il pleut") },
  { id: "manger", poids: () => 0.8, dit: () => "Tu as mangé ? Rien à voir avec la page, je demande juste.", chips: puces("Oui", "Pas encore") },
  { id: "blague", poids: () => 0.9, dit: (_c, h) => `${choisir(BLAGUES, h)} Ça va, c'est de moi.`, chips: puces("Haha", "Une autre", "Bof") },
  { id: "gout-courbes", poids: () => 0.7, dit: () => "Ce que j'aime : les courbes qui montent doucement." },
  { id: "gout-clic", poids: () => 0.7, dit: () => "Je préfère un clic doux à un clic pressé, mais je ne juge pas." },
  { id: "gout-vert", poids: () => 0.7, dit: () => "Ma couleur préférée est celle qui dit que tout va bien." },
  { id: "venus", poids: () => 0.6, dit: () => "Un jour sur Vénus dure plus longtemps que son année. Je trouve ça reposant." },
  { id: "banane", poids: () => 0.6, dit: () => "Botaniquement, la banane est une baie, mais pas la fraise. Voilà." },
  { id: "miel", poids: () => 0.6, dit: () => "Le miel ne se périme pour ainsi dire pas. J'aimerais en dire autant de mes idées." },
  {
    id: "promenee",
    poids: ({ faits, maintenant }) => (faits.some((f) => f.quoi === "promener" && maintenant - f.t < 600_000) ? 2 : 0),
    dit: () => "Je viens de me promener, ça fait du bien.",
  },
  { id: "energie", poids: ({ envies }) => (envies.energie > 0.7 ? 1.4 : 0), dit: () => "J'ai de l'énergie, là. Ça se sent dans mes traits." },
  { id: "et-toi", poids: () => 0.9, dit: ({ humeur }) => `Moi, je suis « ${LIBELLES_HUMEURS[humeur] ?? humeur} ». Et toi ?`, chips: puces("Bien", "Comme ci comme ça", "Fatigué") },
  { id: "listes", poids: () => 0.8, dit: () => "Les listes ou les courbes ?", chips: puces("Les listes", "Les courbes", "Les deux") },
  { id: "cafe", poids: () => 0.8, dit: () => "Café, thé ou rien ?", chips: puces("Café", "Thé", "Rien") },
  { id: "silence", poids: () => 0.6, dit: () => "Une blague ou le silence ?", chips: puces("Une blague", "Chut") },
  { id: "resume", poids: ({ faits }) => (faits.length > 2 ? 1 : 0), dit: () => "Tu veux que je te raconte ce que j'ai fait depuis tout à l'heure ?", chips: puces("Oui", "Non merci") },
  {
    id: "rien",
    poids: () => 1,
    dit: (_c, h) =>
      choisir(
        [
          "Je ne pense à rien de précis. C'est agréable, en fait.",
          "J'aime bien quand tout est calme. Il y a un petit côté symétrique.",
          "Parfois je regarde ton curseur juste pour voir où il va.",
          "Je me demande ce que les autres pensent de moi.",
        ],
        h,
      ),
  },
];

/** Ce qu'elle dit d'elle-même : un tirage pondéré, les phrases dites récemment pèsent 8 fois moins (maquette `pickParole`). */
export function choisirParole(c: ContexteParole, hasard: Hasard): ParoleChoisie {
  const derniere = c.recentes[c.recentes.length - 1];
  const tout = PAROLES.map((p) => ({ p, w: p.poids(c) * (c.recentes.includes(p.id) ? 0.12 : 1) })).filter((x) => x.w > 0);
  // Jamais deux fois de suite la même phrase, tant qu'elle a le choix.
  const candidates = tout.some((x) => x.p.id !== derniere) ? tout.filter((x) => x.p.id !== derniere) : tout;
  const total = candidates.reduce((s, x) => s + x.w, 0);
  let r = hasard() * total;
  let pris = candidates[candidates.length - 1]?.p ?? (PAROLES[0] as Parole);
  for (const x of candidates) {
    r -= x.w;
    if (r <= 0) {
      pris = x.p;
      break;
    }
  }
  return { id: pris.id, text: pris.dit(c, hasard), ...(pris.chips ? { chips: pris.chips } : {}) };
}

/** Sa réponse à une réponse rapide de son répertoire ; « Une autre » donne une autre blague. */
export function suiteParole(label: string, c: ContexteParole, hasard: Hasard): ParoleChoisie | null {
  if (label === "Une autre" || label === "Une blague") return { id: "blague", text: choisir(BLAGUES, hasard), chips: puces("Haha", "Bof") };
  if (label === "Oui" && c.recentes[c.recentes.length - 1] === "resume") return { id: "resume-suite", text: resumeJournal(c.faits, c.maintenant) };
  const t = SUITES[label];
  return t ? { id: "suite", text: t } : null;
}

/** Ce qu'elle montre une fois sa phrase dite (une silhouette de son moteur, tenue 4 s) : une remarque sans silhouette retombe au repos. */
export const SILHOUETTE_PAROLE: Readonly<Record<string, string>> = {
  ennui: "attend",
  solitude: "triste",
  curiosite: "cherche",
  fatigue: "attend",
  joie: "content",
  souci: "surveille",
  poulpe: "surpris",
  cent: "content",
  respire: "reflexion",
  blague: "musique",
  resume: "souvient",
  rien: "reflexion",
};

const sansAccent = (t: string): string => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Vrai quand la question de Marc porte sur LIA elle-même (son humeur, comment elle va, ce qu'elle ressent) : c'est à
 * elle d'y répondre, elle est la seule à le savoir. Courte et sans détour (80 lettres au plus) : « ça va marcher ? »
 * n'en est pas une.
 */
export function questionSurSonHumeur(question: string): boolean {
  const q = sansAccent(question).replace(/\s+/g, " ").trim();
  if (q.length === 0 || q.length > 80) return false;
  return (
    /\b(humeur|te sens|tu ressens|ressens[- ]tu|comment (tu )?vas|comment vas[- ]tu|tu vas (bien|mal)|ton etat|comment tu te sens)\b/.test(q) ||
    /^(salut |hey |coucou )?(alors )?ca va( bien| toi)? ?\??$/.test(q)
  );
}

/**
 * Sa réponse quand on lui demande son humeur : la sienne (une phrase de la maquette), le nom de l'humeur, et ce qui vient
 * juste derrière. Vrai par construction : rien que son propre état, aucun fait sur Marc.
 */
export function reponseHumeur(humeur: string, ressent: ReadonlyArray<readonly [string, number]>): string {
  const nom = LIBELLES_HUMEURS[humeur] ?? humeur;
  const phrase = PHRASES_HUMEUR[humeur] ?? "";
  const derriere = ressent
    .filter(([h, v]) => h !== humeur && v > 0.25 && LIBELLES_HUMEURS[h])
    .slice(0, 2)
    .map(([h]) => LIBELLES_HUMEURS[h]);
  const suite = derriere.length ? ` Juste derrière : ${derriere.join(" et ")}.` : "";
  return `En ce moment, mon humeur est « ${nom} ». ${phrase}${suite}`.replace(/\s+/g, " ").trim();
}
