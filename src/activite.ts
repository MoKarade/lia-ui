/**
 * Ce qu'elle est en train de FAIRE, dit par une silhouette de son moteur (maquette v5 : 39 actions en 8 familles).
 * Fonctions pures : elles choisissent la silhouette, jamais une phrase. Les 39 sont toutes atteignables :
 * d'après la question de Marc, l'élément qu'elle regarde, ce que l'hôte annonce ou son humeur.
 */

export interface ActionMoteur {
  id: string;
  /** Au féminin, comme elle (« Elle lit »). */
  libelle: string;
}

export interface FamilleActions {
  famille: string;
  actions: readonly ActionMoteur[];
}

/** Les 39 silhouettes du moteur, rangées comme dans la maquette (même ordre, mêmes familles). */
export const FAMILLES_ACTIONS: readonly FamilleActions[] = [
  {
    famille: "Présence",
    actions: [
      { id: "repos", libelle: "Au repos" },
      { id: "ecoute", libelle: "Elle écoute" },
      { id: "reponse", libelle: "Elle répond" },
      { id: "demande", libelle: "Elle demande" },
      { id: "confus", libelle: "Elle ne comprend pas" },
      { id: "indispo", libelle: "Indisponible" },
      { id: "reveille", libelle: "Elle se réveille" },
    ],
  },
  {
    famille: "Pensée",
    actions: [
      { id: "reflexion", libelle: "Elle réfléchit" },
      { id: "apprend", libelle: "Elle apprend" },
      { id: "souvient", libelle: "Elle se souvient" },
    ],
  },
  {
    famille: "Recherche",
    actions: [
      { id: "consulte", libelle: "Elle consulte tes apps" },
      { id: "cherche", libelle: "Elle cherche" },
      { id: "lit", libelle: "Elle lit" },
      { id: "surveille", libelle: "Elle surveille" },
    ],
  },
  {
    famille: "Création",
    actions: [
      { id: "ecrit", libelle: "Elle écrit" },
      { id: "code", libelle: "Elle programme" },
      { id: "image", libelle: "Elle dessine" },
      { id: "traduit", libelle: "Elle traduit" },
    ],
  },
  {
    famille: "Calcul",
    actions: [
      { id: "calcule", libelle: "Elle calcule" },
      { id: "planifie", libelle: "Elle planifie" },
      { id: "organise", libelle: "Elle range" },
      { id: "synchronise", libelle: "Elle synchronise" },
      { id: "envoie", libelle: "Elle envoie" },
    ],
  },
  {
    famille: "Alerte",
    actions: [
      { id: "securise", libelle: "Elle sécurise" },
      { id: "alerte", libelle: "Elle prévient" },
      { id: "reussi", libelle: "C'est fait" },
      { id: "veille", libelle: "Elle dort" },
    ],
  },
  {
    famille: "Émotion",
    actions: [
      { id: "salue", libelle: "Elle salue" },
      { id: "content", libelle: "Elle est contente" },
      { id: "triste", libelle: "Elle est triste" },
      { id: "surpris", libelle: "Elle est surprise" },
      { id: "remercie", libelle: "Elle te remercie" },
      { id: "musique", libelle: "Elle fredonne" },
    ],
  },
  {
    famille: "Travail",
    actions: [
      { id: "concentre", libelle: "Elle se concentre" },
      { id: "attend", libelle: "Elle attend" },
      { id: "telecharge", libelle: "Elle télécharge" },
      { id: "verifie", libelle: "Elle vérifie" },
      { id: "appelle", libelle: "Elle t'appelle" },
      { id: "analyse", libelle: "Elle analyse" },
    ],
  },
];

export const ACTIONS_LIA: readonly string[] = FAMILLES_ACTIONS.flatMap((f) => f.actions.map((a) => a.id));

export const estAction = (id: string | null | undefined): id is string => !!id && ACTIONS_LIA.includes(id);

/**
 * Sans lettre, ou d'une ou deux lettres : elle ne comprend pas, et le montre (elle envoie quand même la
 * question, c'est à l'hôte de répondre).
 */
const floue = (q: string): boolean => (q.match(/\p{L}/gu) ?? []).length < 3;

/** Ordre voulu : le plus précis d'abord. */
const SUJETS: ReadonlyArray<readonly [string, RegExp]> = [
  ["traduit", /traduis|traduction|en (anglais|fran[cç]ais|espagnol|allemand)/i],
  ["image", /dessine|illustration|\blogo\b|sch[ée]ma|photo|\bimage\b/i],
  ["code", /\bcode\b|script|fonction|\bbug\b|programmer|programme-moi|requ[êe]te|\bsql\b|regex|d[ée]ploie/i],
  ["ecrit", /[ée]cris|[ée]crire|r[ée]dige|lettre|courriel|\bmail\b|brouillon|\bcv\b|message pour/i],
  ["souvient", /souvien|m[ée]moire|rappelle-toi|tu te rappelles|d[ée]j[àa] dit|derni[èe]re fois|qu'est-ce que (je|tu) /i],
  ["planifie", /planifi|agenda|calendrier|rendez-vous|t[âa]ches?\b|[àa] faire|demain|semaine prochaine/i],
  ["organise", /\brange|\btrie|classe|dossiers?|fichiers?|doublons|renomme/i],
  ["synchronise", /synchro|mets? [àa] jour|actualise|rafra[îi]chi/i],
  ["envoie", /\benvoie|envoyer|transmets|partage/i],
  ["telecharge", /t[ée]l[ée]charge|r[ée]cup[èe]re|importe|exporte/i],
  ["securise", /s[ée]curit|mot de passe|\bjeton|\bsecret|prot[èe]ge|piratage/i],
  ["verifie", /v[ée]rifie|contr[ôo]le|assure-toi|tout va bien|tout est (ok|bon)|sant[ée]\b/i],
  ["appelle", /appelle[- ]moi|contacte|t[ée]l[ée]phone/i],
  ["analyse", /analyse|compare|tendance|diagnostic|bilan|pourquoi|explique|que penses|qu'en penses/i],
  ["calcule", /combien|calcul|total|moyenne|co[ûu]t|budget|pourcent|%|projection|\d{2,}/i],
  ["consulte", /\bapps?\b|alertes?|[ée]tat|statut|jobai|carai|financeai|driveai|batchchef|memoryai|hub\b/i],
  ["cherche", /cherche|trouve|recherche|\bo[ùu] (est|sont|se)\b|y a-t-il|existe/i],
  ["lit", /\blis\b|\blire\b|lecture|document|article|r[ée]sume|texte/i],
];

/** La silhouette de « elle réfléchit à cette question » : celle de son sujet, ou la réflexion simple. */
export function activiteQuestion(question: string): string {
  const q = question.trim();
  if (floue(q)) return "confus";
  for (const [id, re] of SUJETS) if (re.test(q)) return id;
  return "reflexion";
}

/** Plus la réponse tarde, plus elle se concentre, puis elle attend (maquette : `attend` = traitement lent). */
export function suiteReflexion(base: string, secondes: number): string {
  if (secondes < 6) return base;
  if (secondes < 15) return "concentre";
  return "attend";
}

export interface GeometrieElement {
  largeur: number;
  hauteur: number;
}

/**
 * Ce qu'elle fait en regardant un élément de la page (maquette `B_pointer` : une alerte → surveille, la mesure
 * clé → consulte, une jauge → calcule, sinon lit ; un bloc entier → analyse). L'hôte peut le dicter avec
 * `data-lia-activite="analyse"`.
 */
export function activiteElement(el: Element, geo?: GeometrieElement): string {
  const dicte = el.getAttribute("data-lia-activite")?.trim();
  if (estAction(dicte)) return dicte;
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") ?? "";
  const classes = `${el.className && typeof el.className === "string" ? el.className : ""} ${el.id}`;
  if (tag === "textarea" || tag === "input" || el.hasAttribute("contenteditable") || role === "textbox") return "ecrit";
  if (tag === "pre" || tag === "code" || /\b(code|snippet|terminal)\b/i.test(classes)) return "code";
  if (tag === "meter" || tag === "progress" || /^(meter|progressbar)$/.test(role) || /jauge|barre|gauge|progress/i.test(classes)) return "calcule";
  if (role === "alert" || role === "status" || /alert|alerte|warning|erreur|incident/i.test(classes)) return "surveille";
  if (tag === "canvas" || tag === "svg" || role === "img" || /graph|courbe|chart|sparkline/i.test(classes)) return "calcule";
  if (tag === "img" || tag === "picture" || tag === "video") return "lit";
  if (tag === "table" || role === "table" || role === "grid") return "analyse";
  if (/cl[ée]|metric|mesure|kpi|chiffre/i.test(classes)) return "consulte";
  const gros = geo ? geo.largeur > 420 || geo.hauteur > 240 : false;
  if (gros || tag === "section" || tag === "article" || /carte|card|bloc/i.test(classes)) return "analyse";
  return "lit";
}

/**
 * Ce qu'elle fait quand elle « joue » : selon son humeur (maquette `POOL`), et toutes les actions de travail
 * y passent à leur tour. Les 40 humeurs ont leur lot (`POOL` de la maquette) ; une humeur inconnue prend le neutre.
 */
export const ACTIVITES_JEU: Readonly<Record<string, readonly string[]>> = {
  joyeux: ["musique", "content", "salue", "image", "remercie"],
  excite: ["content", "musique", "surpris", "synchronise", "telecharge"],
  espiegle: ["musique", "salue", "cherche", "image", "surpris"],
  curieux: ["cherche", "surveille", "lit", "apprend", "analyse", "consulte"],
  calme: ["reflexion", "souvient", "musique", "attend", "planifie", "organise"],
  neutre: ["reflexion", "attend", "surveille", "verifie", "lit"],
  fatigue: ["attend", "reflexion", "souvient"],
  inquiet: ["surveille", "attend", "securise", "verifie", "consulte"],
  triste: ["triste", "souvient", "attend"],
  concentre: ["concentre", "code", "calcule", "analyse", "verifie", "ecrit", "traduit"],
  fier: ["content", "reussi", "envoie", "remercie"],
  timide: ["reflexion", "attend", "lit", "apprend"],
  serein: ["reflexion", "attend", "musique"],
  attentif: ["surveille", "lit", "attend"],
  vigilant: ["surveille", "securise", "attend"],
  protecteur: ["securise", "surveille", "verifie"],
  mefiant: ["surveille", "verifie"],
  boudeur: ["triste", "attend"],
  nostalgique: ["souvient", "reflexion"],
  reveur: ["reflexion", "souvient", "musique"],
  ennuye: ["attend", "cherche", "musique"],
  taquin: ["musique", "salue", "cherche"],
  soulage: ["content", "reussi"],
  emerveille: ["surpris", "content", "apprend"],
  gene: ["attend", "reflexion"],
  determine: ["concentre", "planifie", "verifie"],
  agace: ["attend", "securise"],
  tendre: ["salue", "content", "remercie"],
  confiant: ["content", "reussi", "attend"],
  reconnaissant: ["remercie", "content"],
  amuse: ["musique", "salue", "content"],
  dubitatif: ["verifie", "reflexion", "surveille"],
  impatient: ["attend", "cherche"],
  compatissant: ["remercie", "attend", "reflexion"],
  euphorique: ["musique", "content", "reussi"],
  paisible: ["reflexion", "attend", "musique"],
  pensif: ["reflexion", "souvient"],
  empresse: ["planifie", "organise", "cherche"],
  solidaire: ["salue", "content", "verifie"],
  optimiste: ["content", "reussi", "musique"],
};
