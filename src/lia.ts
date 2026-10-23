import { estRegarde, pointPresDeLElement, pointPresDuCurseur, rangDe } from "./attache.js";
import { dansZone, enSilence, jourLocal, pointDansZone } from "./autonomie.js";
import {
  ENVIES_DEPART,
  MOTIFS_MONDE,
  SILHOUETTES_JEU,
  ajouterFait,
  apresComportement,
  candidats,
  choisirComportement,
  entre,
  majEnvies,
  type Comportement,
  type Envies,
  type FaitLia,
  type MotifMonde,
} from "./cerveau.js";
import { entreesLocales, type EchangeMarc } from "./entrees.js";
import { PROFILS_V9, couleurHumeur, libelleHumeur, type ProfilHumeur } from "./humeurs.js";
import { ajouterImpulsion, creerReseau, etatLent, impulsion, multIntention, pousserHumeur, reseauPas, top3 } from "./reseau.js";
import {
  HUMEURS as HUMEURS_MOTEUR,
  ST,
  brut,
  construire,
  corps,
  humanStep,
  poke,
  regarder,
  setHumeur as moteurHumeur,
  setMelange,
  totalVoix,
  HZ,
  THK,
  type EtatMoteur,
} from "./moteur/moteur.js";
import {
  ENTREES_MENU,
  SELECTEUR_ELEMENTS,
  composerQuestion,
  decrireParDefaut,
  elementVise,
  etiquetteMessage,
  nettoyer,
  normaliser,
  titreMenu,
  type ElementDecrit,
  type ModeElement,
} from "./ecran.js";
import { GESTES, HUMEURS_MENU, dureeGeste, trouverGeste } from "./gestes.js";
import {
  ecrireCerveau,
  ecrireLente,
  ecrireMemoire,
  ecrireMouvement,
  ecrireRelances,
  lireCerveau,
  lireLente,
  lireMemoire,
  lireMouvement,
  lireRelances,
} from "./stockage.js";
import { CSS } from "./styles.js";
import {
  HUMEURS_LIA,
  type ActionLia,
  type EnvoiLia,
  type HumeurLia,
  type LiaHandle,
  type MotifSpontane,
  type OptionsLia,
  type ParoleSpontanee,
  type PropositionMonde,
  type PuceLia,
  type ReponseLia,
  type ZoneVie,
} from "./types.js";
import type { GesteLia } from "./gestes.js";

const DELAI_APPUI_LONG = 620;
const DELAI_QUESTION = 30_000;
const NS_STYLE = "data-lia-ui";

let actif: LiaHandle | null = null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  texte?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined) e.textContent = texte;
  return e;
}

function icone(chemin: string): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", chemin);
  svg.appendChild(p);
  return svg;
}

const ICONE_FERMER = "M6 6l12 12M18 6L6 18";
const ICONE_ENVOYER = "M4 12l16-8-6 16-2-7z";

function injecterStyles(): void {
  if (document.head.querySelector(`style[${NS_STYLE}]`)) return;
  const s = document.createElement("style");
  s.setAttribute(NS_STYLE, "");
  s.textContent = CSS;
  document.head.appendChild(s);
}

const limiter = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));

/**
 * Fait vivre LIA : 100 traits en canvas 2D, vie propre, discussion au clic, menu au clic droit.
 * Une seule LIA par page. Aucun réseau, aucun secret : tout ce qu'elle sait passe par `options.ask`.
 */
/** Délai minimal entre deux fois (secondes), comme la maquette V9. */
const DELAI_MONDE: Record<MotifMonde | "veiller", number> = { appeler: 90, resumer: 720, feliciter: 1200, rappeler: 1800, souvenir: 1500, accompagner: 0, veiller: 240 };
/** Marc regarde un élément depuis ce temps (ms) : elle vient regarder avec lui, au plus une fois par élément toutes les 3 minutes. */
const SURVOL_MS = 4000;
const DELAI_ACCOMPAGNER_MS = 180_000;
const ETAT_MONDE: Record<MotifMonde, string> = { appeler: "alerte", resumer: "surveille", feliciter: "reussi", rappeler: "surveille", souvenir: "content", accompagner: "surveille" };
const etatSur = (etat: string): string => (ST.includes(etat) ? etat : "repos");

export function mountLia(options: OptionsLia = {}): LiaHandle {
  if (typeof document === "undefined") throw new Error("mountLia : à appeler dans le navigateur uniquement");
  if (actif) throw new Error("mountLia : une seule LIA par page (appeler destroy() avant d'en remonter une)");

  injecterStyles();

  const cle = options.cle ?? "lia";
  const rayonBase = options.rayon ?? 56;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const modeReduit = reduit ? (lireMouvement(cle) ?? options.quandMouvementReduit ?? "complet") : "complet";
  /** « fixe » : une seule image, comme avant. */
  const sansMouvement = modeReduit === "fixe";
  /** « doux » : elle ne traverse jamais l'écran (pas de glissade, d'errance ni de suivi du curseur), mais vit sur place. */
  let doux = modeReduit === "doux";
  const memoire = lireMemoire(cle);
  const cerveauMemoire = lireCerveau(cle);
  /** Le choix de la personne, seul mémorisé : l'option de l'hôte et le mode « fixe » ne sont jamais écrits. */
  let choixVie: boolean | undefined = memoire?.choixVie;
  let vie = (options.vieAutonome ?? true) && (choixVie ?? true) && !sansMouvement;

  /* ── couche ── */
  const conteneur = options.container ?? null;
  const posConteneur = conteneur ? getComputedStyle(conteneur).position : "";
  if (conteneur && (posConteneur === "static" || posConteneur === "")) conteneur.style.position = "relative";
  const couche = el("div", conteneur ? "lia-ui lia-ui--conteneur" : "lia-ui");
  (conteneur ?? document.body).appendChild(couche);
  const corpsEl = el("div", "lia-ui__corps");
  const toile = el("canvas", "lia-ui__toile");
  toile.setAttribute("aria-hidden", "true");
  const ctx = toile.getContext("2d");
  const hit = el("button", "lia-ui__hit");
  hit.type = "button";
  hit.setAttribute("aria-label", "LIA : ouvrir la discussion");
  hit.setAttribute("aria-haspopup", "dialog");
  corpsEl.append(toile, hit);
  /** Sa pastille d'humeur : dessinée par le paquet, donc la même dans toutes les apps (l'hôte n'a rien à refaire). */
  const puceHumeur = options.humeurVisible === false ? null : el("div", "lia-ui__etat-humeur");
  const pointHumeur = puceHumeur ? el("i") : null;
  const texteHumeur = puceHumeur ? el("span") : null;
  if (puceHumeur && pointHumeur && texteHumeur) {
    pointHumeur.setAttribute("aria-hidden", "true");
    puceHumeur.append(pointHumeur, texteHumeur);
    corpsEl.appendChild(puceHumeur);
  }
  couche.appendChild(corpsEl);
  const bulle = el("div", "lia-ui__bulle");
  bulle.hidden = true;
  bulle.setAttribute("role", "status");
  bulle.setAttribute("aria-live", "polite");
  couche.appendChild(bulle);

  /* ── état du moteur ── */
  THK.v = 0.012;
  const dessiner = corps();
  const etatMoteur: EtatMoteur = {
    ph: 0,
    v: 0,
    vh: new Array<number>(160).fill(0),
    W: Object.fromEntries(ST.map((k) => [k, k === "repos" ? 1 : 0])),
    H: HZ,
    lts: {},
  };
  const debut: Record<string, number> = {};
  let etat = "repos";
  let etatForce: string | null = null;
  let t = 0;
  let dernier = performance.now();
  /* Son réseau interne (src/reseau.ts) : ce qu'elle ressent, au-delà de ses six envies. Coupé en mode « fixe » (image unique). */
  Object.assign(HUMEURS_MOTEUR, PROFILS_V9);
  const reseauActif = !sansMouvement;
  const lente = lireLente(cle);
  const reseau = creerReseau(HUMEURS_MOTEUR as Record<string, ProfilHumeur>, lente?.slow, lente ? Date.now() - lente.t : 0);
  /** Ce qu'elle ressent (l'une des 40 humeurs de son réseau) ; `humeurId` en est la version à 12 humeurs, pour l'hôte et le menu. */
  let humeurNom = reseauActif ? "neutre" : "curieux";
  let humeurId: HumeurLia = "curieux";
  /** Humeur imposée (menu, réponse, hôte) : gardée 100 s, puis son réseau reprend la main. */
  let forcee: { jusqua: number } | null = null;
  if (reseauActif) {
    moteurHumeur("auto");
    setMelange(() => reseau.mix);
  } else moteurHumeur(humeurId);
  let dernierMarc = Date.now();
  const debutPage = dernierMarc;
  const echanges: EchangeMarc[] = [];
  let dernierPropos = 0;
  let dernierMonde = 0;

  const pos = { x: 0, y: 0, vx: 0, vy: 0 };
  let rayon = rayonBase;
  let cible = { x: 0, y: 0 };
  let errance = { jusqua: 0 };
  /** Ce qu'elle suit ou regarde en ce moment (rien = elle fait sa vie). Jamais de défilement de la page. */
  type Attention =
    | { type: "curseur"; jusqua: number }
    | { type: "element"; el: Element; jusqua: number; colle: boolean };
  let attention: Attention | null = null;
  const pointeur = { x: 0, y: 0, ms: -1e9, fin: false };
  const selecteurCibles = options.cibles ?? "[data-lia-cible]";
  /* Clic droit sur n'importe quel élément (maquette V9) : `false` le coupe, sinon l'hôte peut le régler. */
  const optElements = options.elements === false ? null : (options.elements ?? {});
  const selecteurElements = optElements?.selecteur ?? SELECTEUR_ELEMENTS;
  let contexteQuestion: { d: ElementDecrit } | null = null;
  let reperee: Element | null = null;
  let attenteElement: ReturnType<typeof setTimeout> | undefined;
  let relache = 0;
  let glisse: { x: number; y: number; x0: number; y0: number; deplace: boolean } | null = null;
  let appui: ReturnType<typeof setTimeout> | undefined;
  let parle = false;
  let voixDebut = 0;
  let voixFin = 0;
  let bulleFin = 0;
  let dernierMot = -99;
  let chatOuvert = false;
  let menuOuvert = false;
  let detruit = false;
  /* Son cerveau (src/cerveau.ts) : ses envies, ce qu'elle fait, et ce dont elle se souvient. */
  let envies: Envies = { ...(cerveauMemoire?.envies ?? ENVIES_DEPART) };
  let faits: FaitLia[] = cerveauMemoire?.journal ?? [];
  let comportement: Comportement | null = null;
  let tranquilleJusqua = 0;
  /** Quand chaque comportement du monde a eu lieu pour la dernière fois (ms) : les délais de la maquette. */
  const dernierMotif: Partial<Record<MotifMonde | "veiller", number>> = {};
  let propositions: Partial<Record<MotifMonde, PropositionMonde>> = {};
  let entreesCourantes: Record<string, number> = {};
  let erreurMondeDite = false;
  /** L'élément regardé par Marc (sous son curseur, parmi les cibles) et depuis quand. */
  let survol: { el: Element; depuis: number } | null = null;
  const dernierAccompagne = new WeakMap<Element, number>();
  let elementSurvole: Element | null = null;
  let regarde: Element | null = null;
  const retirerRegard = (): void => {
    regarde?.removeAttribute("data-regard");
    regarde = null;
  };
  const marquerRegard = (el: Element): void => {
    retirerRegard();
    el.setAttribute("data-regard", "");
    regarde = el;
  };
  let derniereDecision = -999;
  let derniereParole = -999;
  let dort = false;
  /** Quand une silhouette passagère (jeu, réveil) se termine ; 0 = aucune. */
  let finEtatTemp = 0;
  let raf = 0;

  const zoneVie = (): ZoneVie => {
    const r = couche.getBoundingClientRect();
    const z = options.bounds?.();
    return z ?? { x: 0, y: 0, w: r.width, h: r.height };
  };

  const choisir = (id: string): void => {
    const e = ST.includes(id) ? id : "repos";
    if (e !== etat) debut[e] = sansMouvement ? -1.6 : t;
    etat = e;
  };

  const afficherHumeur = (nom: string): void => {
    if (!puceHumeur || !pointHumeur || !texteHumeur) return;
    const libelle = libelleHumeur(nom);
    texteHumeur.textContent = libelle.charAt(0).toUpperCase() + libelle.slice(1);
    puceHumeur.style.setProperty("--lia-point", couleurHumeur(nom));
    puceHumeur.setAttribute("aria-label", `Humeur : ${libelle}`);
  };
  afficherHumeur(humeurNom);

  const appliquerHumeur = (nom: string): void => {
    if (nom === humeurNom) return;
    humeurNom = nom;
    afficherHumeur(nom);
    if ((HUMEURS_LIA as readonly string[]).includes(nom)) {
      humeurId = nom as HumeurLia;
      options.onHumeur?.(humeurId);
    }
    if (sansMouvement) dessinerUneFois();
  };
  const setHumeur = (h: HumeurLia): void => {
    if (reseauActif) {
      forcee = { jusqua: Date.now() + 100_000 };
      pousserHumeur(reseau, h, Date.now(), 1.6);
    }
    moteurHumeur(h);
    appliquerHumeur(h);
  };

  /* ── position initiale ── */
  {
    const z = zoneVie();
    if (memoire) {
      const p = pointDansZone(z, memoire.u, memoire.v, rayon);
      pos.x = p.x;
      pos.y = p.y;
    } else if (conteneur) {
      pos.x = z.x + z.w / 2;
      pos.y = z.y + z.h / 2;
    } else {
      const p = dansZone(z, z.x + z.w - rayon * 1.6, z.y + z.h - rayon * 1.6, rayon);
      pos.x = p.x;
      pos.y = p.y;
    }
    cible = { x: pos.x, y: pos.y };
  }
  /** Là où elle se sent chez elle : elle y revient quand elle s'est trop éloignée. */
  const maison = { x: pos.x, y: pos.y };

  const memoriser = (): void => {
    const z = zoneVie();
    const marge = rayon;
    const lw = Math.max(1, z.w - 2 * marge);
    const lh = Math.max(1, z.h - 2 * marge);
    ecrireMemoire(cle, {
      u: limiter((pos.x - z.x - marge) / lw, 0, 1),
      v: limiter((pos.y - z.y - marge) / lh, 0, 1),
      ...(choixVie === undefined ? {} : { choixVie }),
    });
  };

  /* ── voix : un coup par syllabe ── */
  const voix = (texte: string): void => {
    impulsion(reseau, "parle");
    dernierPropos = Date.now();
    construire(texte);
    voixDebut = t;
    voixFin = t + totalVoix();
    parle = true;
    choisir("reponse");
  };
  const finVoix = (): void => {
    parle = false;
    if (!chatOuvert) choisir(etatForce ?? "repos");
  };

  /* ── bulle ── */
  let bulleChips: HTMLElement | null = null;
  const tais = (): void => {
    bulle.hidden = true;
    bulle.replaceChildren();
    bulleFin = 0;
    bulleChips = null;
    parle = false;
  };
  const dire: LiaHandle["dire"] = (texte, o) => {
    if (detruit || chatOuvert || glisse) return false;
    reveiller();
    bulle.replaceChildren();
    const p = el("p");
    p.style.margin = "0";
    bulle.appendChild(p);
    const chips = o?.chips ?? [];
    if (chips.length) {
      bulleChips = el("div", "lia-ui__puces");
      for (const c of chips) bulleChips.appendChild(creerPuce(c, "bulle"));
      bulle.appendChild(bulleChips);
    }
    bulle.hidden = false;
    const t0 = performance.now();
    const duree = Math.max(600, Math.min(1400, texte.length * 22));
    const tic = (): void => {
      const u = Math.min(1, (performance.now() - t0) / duree);
      p.textContent = texte.slice(0, Math.ceil(texte.length * u));
      if (u < 1 && !bulle.hidden && !detruit) requestAnimationFrame(tic);
    };
    if (sansMouvement || doux) p.textContent = texte;
    else tic();
    voix(texte);
    bulleFin = t + Math.max(5, totalVoix() + 3) + (chips.length ? 6 : 0);
    dernierMot = t;
    // Sans boucle d'animation (mode « fixe »), rien d'autre ne place la bulle.
    if (sansMouvement) dessinerUneFois();
    return true;
  };

  function creerPuce(c: PuceLia, contexte: "reponse" | "bulle"): HTMLButtonElement {
    const b = el("button", "lia-ui__puce", c.label);
    b.type = "button";
    b.addEventListener("click", () => {
      options.onChip?.(c.id, contexte);
      if (contexte === "bulle") tais();
    });
    return b;
  }

  /* ── discussion ── */
  let chat: HTMLElement | null = null;
  let journal: HTMLElement | null = null;
  let champ: HTMLInputElement | null = null;
  let envoyer: HTMLButtonElement | null = null;
  let enCours: AbortController | null = null;
  let points: HTMLElement | null = null;
  let derniereFocus: Element | null = null;

  const ajouterMsg = (texte: string, de: "lia" | "moi", erreur = false): HTMLElement => {
    const m = el("div", `lia-ui__msg lia-ui__msg--${de}${erreur ? " lia-ui__msg--erreur" : ""}`, texte);
    journal?.appendChild(m);
    if (journal) journal.scrollTop = journal.scrollHeight;
    return m;
  };

  const montrerReflexion = (actifPts: boolean): void => {
    if (actifPts && !points && journal) {
      points = el("div", "lia-ui__msg lia-ui__msg--lia");
      points.setAttribute("aria-label", "LIA réfléchit");
      const s = el("span", "lia-ui__points");
      s.append(el("i"), el("i"), el("i"));
      points.appendChild(s);
      journal.appendChild(points);
      journal.scrollTop = journal.scrollHeight;
    } else if (!actifPts && points) {
      points.remove();
      points = null;
    }
  };

  /** `question` est ce que Marc lit dans la discussion ; `envoi` est ce que reçoit `ask` (par défaut la même chose). */
  const poser = async (question: string, envoi: string = question): Promise<void> => {
    enCours?.abort();
    ajouterMsg(question, "moi");
    if (!options.ask) {
      ajouterMsg("Je ne suis pas disponible pour le moment.", "lia", true);
      choisir("indispo");
      return;
    }
    const ctrl = new AbortController();
    enCours = ctrl;
    const minuterie = setTimeout(() => ctrl.abort(), DELAI_QUESTION);
    choisir("reflexion");
    montrerReflexion(true);
    if (envoyer) envoyer.disabled = true;
    try {
      const rep: ReponseLia = await options.ask(envoi, ctrl.signal);
      if (ctrl.signal.aborted || detruit) return;
      montrerReflexion(false);
      const m = ajouterMsg(rep.text, "lia");
      if (rep.chips?.length) {
        const ch = el("div", "lia-ui__puces");
        for (const c of rep.chips) ch.appendChild(creerPuce(c, "reponse"));
        m.appendChild(ch);
      }
      if (rep.blocks?.length && options.renderBlocks) options.renderBlocks(rep.blocks, m);
      if (rep.mood) setHumeur(rep.mood);
      voix(rep.text);
    } catch (e) {
      if (detruit) return;
      montrerReflexion(false);
      const annule = e instanceof DOMException && e.name === "AbortError";
      if (annule && enCours !== ctrl) return;
      ajouterMsg(annule ? "Je mets trop de temps : réessaie dans un instant." : "Je n'arrive pas à répondre pour le moment.", "lia", true);
      choisir("indispo");
    } finally {
      clearTimeout(minuterie);
      if (enCours === ctrl) enCours = null;
      if (envoyer) envoyer.disabled = false;
      champ?.focus();
    }
  };

  const placerAutour = (boite: HTMLElement): void => {
    const z = zoneVie();
    const w = boite.offsetWidth;
    const h = boite.offsetHeight;
    const aDroite = pos.x + rayon * 0.9 + w + 8 <= z.x + z.w;
    const x = aDroite ? pos.x + rayon * 0.9 : pos.x - rayon * 0.9 - w;
    const y = limiter(pos.y - h / 2, z.y + 8, Math.max(z.y + 8, z.y + z.h - h - 8));
    boite.style.left = `${Math.max(z.x + 8, x)}px`;
    boite.style.top = `${y}px`;
  };

  const ouvrirChat = (): void => {
    if (detruit || chatOuvert) return;
    reveiller();
    fermerMenu();
    tais();
    derniereFocus = document.activeElement;
    chatOuvert = true;
    chat = el("div", "lia-ui__chat");
    chat.setAttribute("role", "dialog");
    chat.setAttribute("aria-label", "Discussion avec LIA");
    const entete = el("div", "lia-ui__entete");
    entete.appendChild(el("span", "lia-ui__titre", "LIA"));
    const fermer = el("button", "lia-ui__btn");
    fermer.type = "button";
    fermer.setAttribute("aria-label", "Fermer la discussion");
    fermer.appendChild(icone(ICONE_FERMER));
    fermer.addEventListener("click", fermerChat);
    entete.appendChild(fermer);
    journal = el("div", "lia-ui__journal");
    journal.setAttribute("role", "log");
    journal.setAttribute("aria-live", "polite");
    const form = el("form", "lia-ui__form");
    champ = el("input", "lia-ui__champ");
    champ.type = "text";
    champ.autocomplete = "off";
    champ.enterKeyHint = "send";
    champ.maxLength = 1000;
    champ.setAttribute("aria-label", "Ta question pour LIA");
    champ.placeholder = "Pose-moi une question";
    envoyer = el("button", "lia-ui__btn lia-ui__btn--accent");
    envoyer.type = "submit";
    envoyer.setAttribute("aria-label", "Envoyer");
    envoyer.appendChild(icone(ICONE_ENVOYER));
    form.append(champ, envoyer);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = champ?.value.trim() ?? "";
      if (!q || envoyer?.disabled) return;
      if (champ) champ.value = "";
      const ctx = contexteQuestion;
      contexteQuestion = null;
      if (champ) champ.placeholder = "Pose-moi une question";
      impulsion(reseau, "reponse");
      echanges.push({ t: Date.now(), longueur: q.length, question: q.includes("?") });
      if (echanges.length > 20) echanges.shift();
      void poser(q, ctx ? composerQuestion("question", ctx.d, q) : q);
    });
    chat.append(entete, journal, form);
    chat.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fermerChat();
      }
    });
    couche.appendChild(chat);
    placerAutour(chat);
    choisir("ecoute");
    if (!options.ask) {
      ajouterMsg("Je ne suis pas disponible pour le moment.", "lia", true);
      choisir("indispo");
    }
    champ.focus();
  };

  function fermerChat(): void {
    if (!chatOuvert) return;
    enCours?.abort();
    enCours = null;
    chat?.remove();
    chat = journal = champ = envoyer = points = null;
    chatOuvert = false;
    contexteQuestion = null;
    cesserDeReperer();
    choisir(etatForce ?? "repos");
    const f = derniereFocus;
    derniereFocus = null;
    if (f instanceof HTMLElement && f.isConnected) f.focus();
    else hit.focus();
  }

  /* ── menu ── */
  let menu: HTMLElement | null = null;
  const item = (libelle: string, action: () => void): HTMLButtonElement => {
    const b = el("button", "lia-ui__item", libelle);
    b.type = "button";
    b.setAttribute("role", "menuitem");
    b.addEventListener("click", () => {
      fermerMenu();
      action();
    });
    return b;
  };

  /** Les humeurs du menu : celle d'en ce moment est cochée, un clic la change. */
  const rangeeHumeurs = (): HTMLElement => {
    const rangee = el("div", "lia-ui__rangee lia-ui__rangee--humeurs");
    rangee.setAttribute("role", "group");
    rangee.setAttribute("aria-label", "Son humeur");
    for (const h of HUMEURS_MENU) {
      const b = item(h.libelle, () => setHumeur(h.id));
      b.classList.add("lia-ui__humeur");
      b.setAttribute("role", "menuitemradio");
      b.setAttribute("aria-checked", String(h.id === humeurNom));
      b.style.setProperty("--lia-point", `var(--lia-h-${h.id})`);
      rangee.appendChild(b);
    }
    return rangee;
  };

  /** Les gestes du menu : une silhouette de son moteur, tenue quelques secondes. Absents si le mouvement est réduit. */
  const rangeeGestes = (): HTMLElement => {
    const rangee = el("div", "lia-ui__rangee lia-ui__rangee--gestes");
    rangee.setAttribute("role", "group");
    rangee.setAttribute("aria-label", "Ses gestes");
    for (const g of GESTES) {
      const b = item("", () => geste(g.id));
      b.classList.add("lia-ui__geste");
      b.setAttribute("aria-label", g.libelle);
      b.title = g.libelle;
      b.appendChild(icone(g.icone));
      rangee.appendChild(b);
    }
    return rangee;
  };

  /** Le système réduit les animations : Marc peut les rendre complètes (ou les calmer), le choix reste dans ce navigateur. */
  const caseAnimations = (): HTMLButtonElement => {
    const b = item("Animations complètes", () => {
      doux = !doux;
      ecrireMouvement(cle, doux ? "doux" : "complet");
      if (doux) finAttention();
    });
    b.setAttribute("role", "menuitemcheckbox");
    b.setAttribute("aria-checked", String(!doux));
    return b;
  };

  /** Le menu de son corps (sans `element`) ou celui d'un élément de la page (clic droit n'importe où). */
  const ouvrirMenu = (x: number, y: number, element?: { cible: Element; d: ElementDecrit }): void => {
    if (detruit) return;
    reveiller();
    fermerMenu();
    tais();
    menuOuvert = true;
    menu = el("div", "lia-ui__menu");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", element ? "LIA : que faire de cet élément" : "Actions de LIA");
    if (element) {
      menu.classList.add("lia-ui__menu--element");
      menu.appendChild(el("p", "lia-ui__menu-titre", titreMenu(element.d)));
      for (const { mode, libelle } of ENTREES_MENU) {
        menu.appendChild(item(libelle, () => surElement(element.cible, element.d, mode)));
      }
    } else {
      menu.appendChild(el("p", "lia-ui__menu-titre", "LIA"));
      menu.appendChild(item("Lui parler", ouvrirChat));
      menu.appendChild(rangeeHumeurs());
      if (!sansMouvement) menu.appendChild(rangeeGestes());
      if (reduit && !sansMouvement) menu.appendChild(caseAnimations());
      menu.appendChild(item(vie ? "La laisser tranquille" : "La laisser vivre", () => setVieAutonome(!vie)));
    }
    const actions: readonly ActionLia[] = element ? [] : (options.actions ?? []);
    if (actions.length) {
      menu.appendChild(el("div", "lia-ui__sep"));
      for (const a of actions) {
        menu.appendChild(
          item(a.label, () => {
            void Promise.resolve()
              .then(() => a.run())
              .catch(() => {
                dire("Je n'ai pas pu faire ça.");
              });
          }),
        );
      }
    }
    menu.addEventListener("keydown", (e) => {
      const items = [...(menu?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === "Escape") {
        e.preventDefault();
        fermerMenu();
        hit.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        items[(i + 1) % items.length]?.focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length]?.focus();
      } else if (e.key === "Tab") {
        fermerMenu();
      }
    });
    couche.appendChild(menu);
    const z = zoneVie();
    const r = couche.getBoundingClientRect();
    const lx = x - r.left;
    const ly = y - r.top;
    menu.style.left = `${limiter(lx, z.x + 8, Math.max(z.x + 8, z.x + z.w - menu.offsetWidth - 8))}px`;
    menu.style.top = `${limiter(ly, z.y + 8, Math.max(z.y + 8, z.y + z.h - menu.offsetHeight - 8))}px`;
    menu.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  };

  function fermerMenu(): void {
    if (!menuOuvert) return;
    menu?.remove();
    menu = null;
    menuOuvert = false;
  }

  /* ── clic droit sur un élément de la page ── */
  /** Un cadre fin autour de l'élément dont elle parle ; dans sa couche, la page de l'hôte n'est jamais modifiée. */
  const repere = el("div", "lia-ui__repere");
  repere.hidden = true;
  couche.appendChild(repere);

  function cesserDeReperer(): void {
    reperee = null;
    repere.hidden = true;
  }

  const majRepere = (): void => {
    if (!reperee) return;
    if (!reperee.isConnected) return cesserDeReperer();
    const r = reperee.getBoundingClientRect();
    const c = couche.getBoundingClientRect();
    repere.hidden = false;
    repere.style.left = `${(r.left - c.left - 4).toFixed(1)}px`;
    repere.style.top = `${(r.top - c.top - 4).toFixed(1)}px`;
    repere.style.width = `${(r.width + 8).toFixed(1)}px`;
    repere.style.height = `${(r.height + 8).toFixed(1)}px`;
  };

  const decrireElement = (cible: Element): ElementDecrit | null => {
    try {
      const d = optElements?.decrire ? optElements.decrire(cible) : decrireParDefaut(cible);
      return d ? normaliser(d) : null;
    } catch (e) {
      // L'hôte a mal décrit son élément : le menu du navigateur reste, la page continue.
      console.error("LIA : elements.decrire a échoué, le clic droit n'est pas pris", e);
      return null;
    }
  };

  /**
   * Elle vient d'abord se poser près de l'élément (sans faire défiler la page), puis la discussion
   * s'ouvre à côté d'elle. En mode « question », la discussion s'ouvre et attend ce que Marc écrit.
   */
  function surElement(cible: Element, d: ElementDecrit, mode: ModeElement): void {
    if (detruit) return;
    clearTimeout(attenteElement);
    const demarrer = (): void => {
      if (detruit || !cible.isConnected) return;
      reperee = cible;
      ouvrirChat();
      if (mode === "question") {
        contexteQuestion = { d };
        if (champ) champ.placeholder = `Ta question sur « ${nettoyer(d.texte ?? d.genre, 24)} »`;
        return;
      }
      impulsion(reseau, "demande");
      void poser(etiquetteMessage(mode, d), composerQuestion(mode, d));
    };
    if (!allerVoir(cible, 8)) return demarrer();
    choisir("reflexion");
    let essais = 0;
    const guetter = (): void => {
      const a = attention;
      const arrivee = a?.type === "element" && a.el === cible && a.colle;
      if (arrivee || essais++ >= 30 || detruit) return demarrer();
      attenteElement = setTimeout(guetter, 100);
    };
    guetter();
  }

  const surClicDroitPage = (e: MouseEvent): void => {
    if (detruit || !optElements || e.shiftKey || e.defaultPrevented) return;
    const cible = elementVise(e.target, selecteurElements, couche);
    if (!cible) return;
    const d = decrireElement(cible);
    if (!d) return;
    e.preventDefault();
    clearTimeout(appui);
    glisse = null;
    ouvrirMenu(e.clientX, e.clientY, { cible, d });
  };
  document.addEventListener("contextmenu", surClicDroitPage);
  /** Un menu ouvert sur la page se ferme au défilement, comme un menu du navigateur. */
  const surDefilement = (): void => {
    ajouterImpulsion(reseau, "scroll", 0.2);
    dernierMarc = Date.now();
    if (menuOuvert && menu?.classList.contains("lia-ui__menu--element")) fermerMenu();
  };
  window.addEventListener("scroll", surDefilement, { passive: true, capture: true });
  const surGesteMarc = (e: Event): void => {
    dernierMarc = Date.now();
    if (e.type !== "pointermove") return;
    let sous: Element | null = null;
    try {
      sous = e.target instanceof Element && !couche.contains(e.target) ? e.target.closest(selecteurCibles) : null;
    } catch {
      /* sélecteur invalide fourni par l'hôte : elle ne sait rien de ce que Marc regarde */
    }
    if (sous !== survol?.el) survol = sous ? { el: sous, depuis: dernierMarc } : null;
  };
  const GESTES_MARC = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
  for (const ev of GESTES_MARC) window.addEventListener(ev, surGesteMarc, { passive: true });

  function setVieAutonome(actifVie: boolean): void {
    choixVie = actifVie;
    vie = actifVie && !sansMouvement;
    if (!vie) finAttention();
    memoriser();
  }

  /* ── entrées ── */
  const fixerDepuisEvenement = (e: PointerEvent): { x: number; y: number } => {
    const r = couche.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  hit.addEventListener("pointerdown", (e) => {
    if (e.button === 2) return;
    ajouterImpulsion(reseau, "touche", 0.45);
    try {
      hit.setPointerCapture(e.pointerId);
    } catch {
      /* capture impossible (pointeur déjà relâché) : le glisser marche quand même dans le bouton */
    }
    const p = fixerDepuisEvenement(e);
    glisse = { x: p.x, y: p.y, x0: p.x, y0: p.y, deplace: false };
    reveiller();
    tais();
    clearTimeout(appui);
    appui = setTimeout(() => {
      if (glisse && !glisse.deplace) {
        glisse = null;
        ouvrirMenu(e.clientX, e.clientY);
      }
    }, DELAI_APPUI_LONG);
  });
  hit.addEventListener("pointermove", (e) => {
    if (!glisse) return;
    const p = fixerDepuisEvenement(e);
    glisse.x = p.x;
    glisse.y = p.y;
    if (Math.hypot(p.x - glisse.x0, p.y - glisse.y0) > 6) {
      glisse.deplace = true;
      clearTimeout(appui);
    }
  });
  const finGlisse = (): void => {
    clearTimeout(appui);
    if (!glisse) return;
    const aBouge = glisse.deplace;
    glisse = null;
    if (aBouge) {
      cible = { x: pos.x, y: pos.y };
      errance = { jusqua: t + 7 };
      relache = t;
      choisir("content");
      memoriser();
      setTimeout(() => {
        if (!detruit && !chatOuvert && !parle) choisir(etatForce ?? "repos");
      }, 1800);
    } else {
      poke();
      if (chatOuvert) fermerChat();
      else ouvrirChat();
    }
  };
  hit.addEventListener("pointerup", finGlisse);
  hit.addEventListener("pointercancel", finGlisse);
  hit.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    clearTimeout(appui);
    glisse = null;
    ouvrirMenu(e.clientX, e.clientY);
  });
  hit.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (chatOuvert) fermerChat();
      else ouvrirChat();
    } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
      e.preventDefault();
      const r = hit.getBoundingClientRect();
      ouvrirMenu(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  const surCurseur = (e: PointerEvent): void => {
    pointeur.x = e.clientX;
    pointeur.y = e.clientY;
    pointeur.ms = performance.now();
    pointeur.fin = e.pointerType !== "touch";
    const r = couche.getBoundingClientRect();
    regarder(limiter((e.clientX - r.left - pos.x) / 400, -1, 1), limiter((e.clientY - r.top - pos.y) / 400, -1, 1));
  };
  window.addEventListener("pointermove", surCurseur, { passive: true });
  const surClicHors = (e: PointerEvent): void => {
    if (menuOuvert && menu && !menu.contains(e.target as Node)) fermerMenu();
  };
  window.addEventListener("pointerdown", surClicHors, true);
  const surRedim = (): void => {
    const z = zoneVie();
    const p = dansZone(z, pos.x, pos.y, rayon);
    pos.x = cible.x = p.x;
    pos.y = cible.y = p.y;
    if (sansMouvement) dessinerUneFois();
  };
  window.addEventListener("resize", surRedim);

  /* ── suivre, regarder ── */
  const fenetre = (): { w: number; h: number } => ({ w: window.innerWidth, h: window.innerHeight });
  const curseurRecent = (): boolean => pointeur.fin && performance.now() - pointeur.ms < 4000;
  const regardables = (): Element[] => {
    let liste: Element[];
    try {
      liste = [...document.querySelectorAll(selecteurCibles)];
    } catch {
      // Sélecteur invalide fourni par l'hôte : elle n'a alors rien à aller voir, la vie continue.
      return [];
    }
    const f = fenetre();
    return liste.filter((x) => !couche.contains(x) && estRegarde(x.getBoundingClientRect(), f));
  };
  const peutBouger = (): boolean => !sansMouvement && !chatOuvert && !menuOuvert && !glisse && !detruit;

  function finAttention(): void {
    retirerRegard();
    if (!attention) return;
    attention = null;
    cible = { x: pos.x, y: pos.y };
    errance = { jusqua: t + 4 };
    choisir(etatForce ?? "repos");
  }

  function suivreCurseur(secondes = 8): boolean {
    if (doux || !peutBouger() || !curseurRecent()) return false;
    attention = { type: "curseur", jusqua: t + secondes };
    errance = { jusqua: t + secondes };
    choisir(etatForce ?? "repos");
    return true;
  }

  function allerVoir(element: Element, secondes = 10): boolean {
    if (!peutBouger() || !element.isConnected || couche.contains(element)) return false;
    attention = { type: "element", el: element, jusqua: t + secondes, colle: false };
    errance = { jusqua: t + secondes };
    choisir(etatForce ?? "surveille");
    marquerRegard(element);
    return true;
  }

  function venirPres(): boolean {
    if (!peutBouger()) return false;
    attention = null;
    const r = couche.getBoundingClientRect();
    const z = zoneVie();
    const point = curseurRecent()
      ? { x: pointeur.x + 90 - r.left, y: pointeur.y - 60 - r.top }
      : { x: z.x + z.w - rayon * 1.6, y: z.y + z.h - rayon * 1.6 };
    cible = dansZone(z, point.x, point.y, rayon);
    errance = { jusqua: t + 5 };
    return true;
  }

  /** Met `cible` à jour d'après ce qu'elle suit ; l'arrête quand elle n'a plus de raison de le faire. */
  function majAttention(): void {
    const a = attention;
    if (!a) return;
    if (!peutBouger() || t > a.jusqua) return finAttention();
    const r = couche.getBoundingClientRect();
    const f = fenetre();
    if (a.type === "curseur") {
      if (!curseurRecent()) return finAttention();
      const p = pointPresDuCurseur(pointeur, t, rayon, f);
      cible = { x: p.x - r.left, y: p.y - r.top };
      return;
    }
    const rect = a.el.isConnected ? a.el.getBoundingClientRect() : null;
    if (!rect || !estRegarde(rect, f)) return finAttention();
    const p = pointPresDeLElement(rect, rayon, f);
    cible = { x: p.x - r.left, y: p.y - r.top };
    if (!a.colle && Math.hypot(cible.x - pos.x, cible.y - pos.y) < 22 && Math.hypot(pos.vx, pos.vy) < 200) a.colle = true;
  }

  /* ── vie propre ── */
  const LONGUEUR_MAX_SPONTANE = 280;
  const silence = options.silence ?? [22, 7];
  const relancesMax = options.relancesParJour ?? 2;
  const peutParlerSeule = (): boolean => !enSilence(new Date().getHours(), silence);
  const relancesRestantes = (): boolean => lireRelances(cle, jourLocal(new Date())) < relancesMax;

  /** Ce que l'hôte la fait dire seule. Son échec ne doit jamais arrêter sa vie : elle se tait et le dit dans la console. */
  const direSpontane = (motif: MotifSpontane): boolean => {
    if (!options.onSpontane || !peutParlerSeule()) return false;
    let rep: string | ParoleSpontanee | null | undefined;
    try {
      rep = options.onSpontane(motif);
    } catch (e) {
      console.error("LIA : onSpontane a échoué, elle se tait", e);
      return false;
    }
    const parole: ParoleSpontanee | null = typeof rep === "string" ? { text: rep } : (rep ?? null);
    const texte = parole?.text.trim().slice(0, LONGUEUR_MAX_SPONTANE);
    if (!parole || !texte) return false;
    return dire(texte, parole.chips ? { chips: parole.chips } : undefined);
  };

  /** Comme dans la maquette : elle arrive, puis dit sa phrase au bout d'une seconde et demie si elle y est encore. */
  const direLa = (el: Element, texte: string, respecterSilence: boolean): void => {
    setTimeout(() => {
      if (detruit || chatOuvert || glisse || parle || (respecterSilence && !peutParlerSeule())) return;
      if (attention?.type !== "element" || attention.el !== el) return;
      dire(texte);
    }, 1500);
  };

  const visiter = (el: Element, secondes: number): void => {
    if (!allerVoir(el, secondes)) return;
    const dit = el.getAttribute("data-lia-dit")?.trim().slice(0, LONGUEUR_MAX_SPONTANE);
    if (dit) direLa(el, dit, true);
  };

  /** L'hôte l'envoie vers un élément. Ce qu'elle dit vient de lui (pas d'heure de silence : c'est lui qui décide). */
  function envoyerVers(element: Element, opts: EnvoiLia = {}): boolean {
    if (!allerVoir(element, opts.secondes ?? 10)) return false;
    if (opts.etat && !etatForce && ST.includes(opts.etat)) choisir(opts.etat);
    const dit = opts.dit?.trim().slice(0, LONGUEUR_MAX_SPONTANE);
    if (dit) direLa(element, dit, false);
    return true;
  }

  let finGeste: ReturnType<typeof setTimeout> | undefined;
  /** Prend la silhouette d'un geste un moment, puis reprend sa vie. Sans effet si elle ne peut pas bouger. */
  function geste(id: GesteLia, secondes?: number): boolean {
    const g = trouverGeste(id);
    if (!g || !peutBouger()) return false;
    clearTimeout(finGeste);
    finAttention();
    etatForce = g.etat;
    choisir(g.etat);
    finGeste = setTimeout(() => {
      if (detruit || etatForce !== g.etat) return;
      etatForce = null;
      choisir("repos");
    }, dureeGeste(secondes) * 1000);
    return true;
  }

  /* ── son cerveau : elle choisit selon ses envies (src/cerveau.ts), puis le fait ── */
  /** Une silhouette passagère (jeu, réveil) : elle reprend le repos à sa fin si rien d'autre ne la tient. */
  const passagere = (etat: string, secondes: number): void => {
    choisir(etat);
    finEtatTemp = t + secondes;
    errance = { jusqua: t + secondes };
  };
  const finirPassagere = (): void => {
    finEtatTemp = 0;
    if (!parle && !etatForce && !chatOuvert && !attention && !dort) choisir("repos");
  };
  function reveiller(): void {
    if (!dort) return;
    dort = false;
    passagere("reveille", 2.6);
  }

  /** Elle va près de l'élément de l'hôte s'il est dans la bande regardée (sinon elle le dit sur place, près du curseur pour une alerte), prend sa silhouette et dit SA phrase au bout d'une seconde et demie. */
  const direMonde = (motif: MotifMonde, p: PropositionMonde): void => {
    const texte = p.text.trim().slice(0, LONGUEUR_MAX_SPONTANE);
    const el = p.element?.isConnected && estRegarde(p.element.getBoundingClientRect(), fenetre()) ? p.element : null;
    if (el && allerVoir(el, 9)) {
      if (!etatForce) choisir(etatSur(ETAT_MONDE[motif]));
    } else {
      if (motif === "appeler") venirPres();
      passagere(etatSur(ETAT_MONDE[motif]), 5);
    }
    setTimeout(() => {
      if (detruit || chatOuvert || menuOuvert || glisse || parle) return;
      dire(texte, p.chips ? { chips: p.chips } : undefined);
    }, 1500);
  };

  const lancer = (id: Comportement, vues: Element[]): void => {
    comportement = id;
    derniereDecision = t;
    faits = ajouterFait(faits, { t: Date.now(), quoi: id });
    envies = apresComportement(envies, id);
    const calme = (secondes: number): void => {
      tranquilleJusqua = t + secondes;
    };
    if (id === "jouer") {
      const pool = SILHOUETTES_JEU[humeurNom] ?? SILHOUETTES_JEU["neutre"] ?? ["repos"];
      passagere(pool[Math.floor(Math.random() * pool.length)] ?? "repos", entre(Math.random, 3.6, 5.6));
    } else if (id === "promener") {
      cible = pointDansZone(zoneVie(), Math.random(), Math.random(), rayon * 1.3);
      errance = { jusqua: t + 5 + entre(Math.random, 1.8, 3.6) };
      choisir("repos");
      calme(30);
    } else if (id === "suivre") {
      suivreCurseur(entre(Math.random, 6, 11));
      calme(40);
    } else if (id === "voir") {
      const el = vues[rangDe(Math.random(), vues.length)];
      if (el) visiter(el, 6.5);
      calme(20);
    } else if (id === "rentrer") {
      cible = { x: maison.x, y: maison.y };
      errance = { jusqua: t + 5.7 };
      choisir("repos");
      calme(30);
    } else if (id === "dormir") {
      dort = true;
      errance = { jusqua: t + 1e9 };
      choisir("veille");
    } else if (id === "veiller") {
      dernierMotif["veiller"] = Date.now();
      passagere(etatSur("surveille"), entre(Math.random, 7, 12));
      calme(30);
    } else if (id === "appeler" || id === "resumer" || id === "feliciter" || id === "rappeler" || id === "souvenir" || id === "accompagner") {
      const p = propositions[id];
      dernierMotif[id] = Date.now();
      if (id === "accompagner" && elementSurvole) dernierAccompagne.set(elementSurvole, Date.now());
      if (p) direMonde(id, id === "accompagner" && !p.element ? { ...p, element: elementSurvole } : p);
      if (id === "feliciter" && reseauActif) impulsion(reseau, "bon", 0.6);
      calme(40);
    } else if (id === "causer" || id === "relancer") {
      derniereParole = t; // même muette (l'hôte n'avait rien de vrai à dire) : pas de nouvelle tentative avant 90 s
      const parole = id === "relancer" ? direSpontane("relance") : direSpontane(Math.random() < 0.2 ? "salut" : "rien");
      if (parole && id === "relancer") {
        ecrireRelances(cle, { jour: jourLocal(new Date()), n: lireRelances(cle, jourLocal(new Date())) + 1 });
      }
      errance = { jusqua: t + 4 };
    } else {
      errance = { jusqua: t + entre(Math.random, 8, 16) };
      choisir("repos");
    }
  };

  /** Ses intentions pèsent sur ce qu'elle choisit (maquette : `multIntention`) ; « voir » est le « pointer » de la maquette. */
  const pesee = (id: Comportement): number =>
    id === "causer" ? multIntention(reseau, "causer") * (1 - 0.5 * (reseau.int["setaire"] ?? 0)) : multIntention(reseau, id === "voir" ? "pointer" : id);
  /** Ce que l'hôte a de vrai à dire pour chaque motif dont le délai est passé ; son échec ne l'arrête pas (dit une fois). */
  const proposerMonde = (): MotifMonde[] => {
    propositions = {};
    if (!options.monde || !peutParlerSeule()) return [];
    const maintenant = Date.now();
    elementSurvole = null;
    for (const m of MOTIFS_MONDE) {
      if (maintenant - (dernierMotif[m] ?? 0) < DELAI_MONDE[m] * 1000) continue;
      if (m === "accompagner") {
        const s = survol;
        if (t < tranquilleJusqua || !s || !s.el.isConnected || maintenant - s.depuis < SURVOL_MS || maintenant - (dernierAccompagne.get(s.el) ?? 0) < DELAI_ACCOMPAGNER_MS) continue;
        elementSurvole = s.el;
      }
      try {
        const p = m === "accompagner" && elementSurvole ? options.monde(m, elementSurvole) : options.monde(m);
        if (p?.text.trim()) propositions[m] = p;
      } catch (e) {
        if (!erreurMondeDite) console.error("LIA : monde a échoué, elle n'a rien à dire sur ce sujet", e);
        erreurMondeDite = true;
      }
    }
    return MOTIFS_MONDE.filter((m) => propositions[m]);
  };
  const penser = (): void => {
    if (finEtatTemp && t > finEtatTemp) finirPassagere();
    if (!vie || sansMouvement || chatOuvert || menuOuvert || glisse || document.hidden || parle || etatForce) return;
    if (relache && t < relache + 6) return;
    relache = 0;
    if (dort || t < errance.jusqua || t - dernierMot < 14) return;
    const vues = regardables();
    const z = zoneVie();
    const maintenant = Date.now();
    const id = choisirComportement(
      candidats(envies, {
        curseurRecent: curseurRecent(),
        cibles: vues.length,
        parole: !!options.onSpontane && peutParlerSeule(),
        relance: relancesRestantes(),
        humeur: humeurNom,
        tranquille: t < tranquilleJusqua,
        loinDeLaMaison: z.w > 0 && z.h > 0 && Math.hypot(pos.x - maison.x, pos.y - maison.y) > 0.3 * Math.hypot(z.w, z.h),
        deplacement: !doux,
        secondesDepuisParole: t - derniereParole,
        monde: proposerMonde(),
        present: maintenant - dernierMarc < 60_000,
        veille: maintenant - (dernierMotif["veiller"] ?? 0) > DELAI_MONDE["veiller"] * 1000 && ((entreesCourantes["nuit"] ?? 0) > 0.4 || (entreesCourantes["absent"] ?? 0) > 0.5),
        intentions: reseauActif ? reseau.int : {},
      }),
      Math.random,
      comportement,
      reseauActif ? pesee : undefined,
    );
    lancer(id, vues);
  };
  /** Ce qui vient de l'hôte (alertes, apps, tendances…) : ses valeurs priment sur celles qu'elle calcule seule. */
  const entreesHote = (): Record<string, number> => {
    try {
      return options.entrees?.() ?? {};
    } catch (e) {
      console.error("LIA : entrees a échoué, elle ne compte que sur ses propres entrées", e);
      return {};
    }
  };
  let dernierPas = Date.now();
  const penserReseau = (): void => {
    const now = Date.now();
    const dt = limiter((now - dernierPas) / 1000, 0.05, 1);
    dernierPas = now;
    const locales = entreesLocales({ maintenant: new Date(now), envies, dernierMarc, debut: debutPage, echanges, dernierPropos, dernierMonde });
    entreesCourantes = { ...locales, ...entreesHote() };
    reseauPas(reseau, entreesCourantes, dt, Math.random, now);
    if (forcee && now > forcee.jusqua) {
      forcee = null;
      moteurHumeur("auto");
    }
    if (!forcee) appliquerHumeur(reseau.dom);
  };
  const garder = (): void => {
    ecrireCerveau(cle, { envies, journal: faits });
    if (reseauActif) ecrireLente(cle, { t: Date.now(), slow: etatLent(reseau) });
  };
  let tics = 0;
  const minuterieEnvies = setInterval(() => {
    if (document.hidden || detruit) return;
    envies = majEnvies(envies, 1, {
      dort,
      occupee: t < errance.jusqua,
      auRepos: comportement === null || comportement === "repos",
      secondesDepuisDecision: t - derniereDecision,
      inquietude: entreesCourantes["alerte"] ?? 0,
    });
    if (dort && envies.energie >= 0.85) reveiller();
    if (reseauActif) penserReseau();
    if (++tics % 10 === 0) garder();
  }, 1000);
  const minuterieVie = setInterval(penser, 1200);

  /* ── image par image ── */
  const dessinerImage = (still: boolean, dt: number): void => {
    if (!still) majAttention();
    const z = zoneVie();
    const c = glisse ? { x: glisse.x, y: glisse.y } : cible;
    const cc = dansZone(z, c.x, c.y, rayon * 0.6);
    // Collée à un élément : exactement sur lui, sans retard ni flottement quand la page défile.
    const colle = attention?.type === "element" && attention.colle;
    if (sansMouvement || doux || still || colle) {
      pos.x = cc.x;
      pos.y = cc.y;
      pos.vx = pos.vy = 0;
    } else {
      const k = glisse ? 260 : 95;
      const zeta = 2 * Math.sqrt(k) * 0.9;
      const n = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / n;
      for (let q = 0; q < n; q++) {
        pos.vx += (k * (cc.x - pos.x) - zeta * pos.vx) * h;
        pos.vy += (k * (cc.y - pos.y) - zeta * pos.vy) * h;
        pos.x += pos.vx * h;
        pos.y += pos.vy * h;
      }
    }
    const vitesse = Math.hypot(pos.vx, pos.vy);
    const v = limiter(vitesse / (Math.max(60, rayon) * 5), 0, 1);

    const k2 = still ? 1 : 1 - Math.exp(-dt * 3.5);
    for (const id of ST) {
      const w = etatMoteur.W[id] ?? 0;
      etatMoteur.W[id] = w + ((id === etat ? 1 : 0) - w) * k2;
    }
    if (parle) {
      etatMoteur.v = brut(t - voixDebut);
      if (t > voixFin) finVoix();
    } else etatMoteur.v += (0 - etatMoteur.v) * (1 - Math.exp(-dt * 14));
    if (bulleFin && t > bulleFin) tais();
    etatMoteur.vh.push(etatMoteur.v);
    etatMoteur.vh.shift();
    etatMoteur.H = sansMouvement ? HZ : humanStep(dt, t, etat, etatMoteur);
    const lts: Record<string, number> = {};
    for (const id of ST) lts[id] = sansMouvement ? 1.6 : t - (debut[id] ?? t);
    etatMoteur.lts = lts;

    const cote = Math.round(rayon * 5);
    if (toile.style.width !== `${cote}px`) {
      toile.style.width = toile.style.height = `${cote}px`;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(cote * dpr);
    if (toile.width !== px) toile.width = toile.height = px;
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cote, cote);
      ctx.lineCap = "round";
      dessiner(ctx, cote, cote, etatMoteur, sansMouvement ? 0 : t, etat, {
        cx: cote / 2,
        cy: cote / 2,
        R: rayon,
        asp: 1,
        fly: v > 0.04 ? { dx: pos.vx, dy: pos.vy, v } : null,
        snap: sansMouvement,
      });
    }
    corpsEl.style.transform = `translate(${pos.x.toFixed(1)}px,${pos.y.toFixed(1)}px)`;
    if (puceHumeur) {
      puceHumeur.hidden = chatOuvert;
      // Sous son corps ; près du bas de la zone, elle se glisse plus haut pour ne jamais sortir de l'écran.
      const dessous = Math.min(rayon * 1.05, Math.max(rayon * 0.6, z.y + z.h - pos.y - 26));
      puceHumeur.style.top = `${dessous.toFixed(1)}px`;
    }
    const diametreHit = Math.round(rayon * 1.5);
    hit.style.width = hit.style.height = `${Math.max(44, diametreHit)}px`;
    if (!bulle.hidden) {
      const w = bulle.offsetWidth;
      const h = bulle.offsetHeight;
      bulle.style.left = `${limiter(pos.x - w / 2, z.x + 8, Math.max(z.x + 8, z.x + z.w - w - 8))}px`;
      bulle.style.top = `${Math.max(z.y + 8, pos.y - rayon * 1.05 - h)}px`;
    }
    if (chat) placerAutour(chat);
    majRepere();
  };

  function dessinerUneFois(): void {
    if (!detruit) dessinerImage(true, 0);
  }

  const boucle = (maintenant: number): void => {
    if (detruit) return;
    // Jamais négatif : l'horloge de rAF peut précéder `performance.now()` d'un instant, et un pas négatif ferait diverger le ressort.
    const dt = Math.max(0, Math.min(0.05, (maintenant - dernier) / 1000 || 0));
    dernier = maintenant;
    if (!document.hidden) {
      t += dt;
      dessinerImage(false, dt);
    }
    raf = requestAnimationFrame(boucle);
  };
  const surVisibilite = (): void => {
    dernier = performance.now();
  };
  document.addEventListener("visibilitychange", surVisibilite);

  choisir("repos");
  if (sansMouvement) dessinerUneFois();
  else raf = requestAnimationFrame(boucle);
  if (options.salut) {
    setTimeout(() => {
      if (!detruit && !chatOuvert) dire(options.salut ?? "");
    }, 1800);
  }

  const poignee: LiaHandle = {
    dire,
    ouvrirChat,
    fermerChat,
    setHumeur,
    humeur: () => ({ nom: humeurNom, libelle: libelleHumeur(humeurNom), couleur: couleurHumeur(humeurNom) }),
    setEtat(e) {
      etatForce = e;
      choisir(e ?? "repos");
    },
    setVieAutonome,
    suivreCurseur,
    allerVoir,
    envies: () => ({ ...envies }),
    ressent: () => (reseauActif ? top3(reseau) : []),
    impulsion(nom, valeur = 1) {
      impulsion(reseau, nom, valeur);
      dernierMonde = Date.now();
    },
    journal: () => faits.map((f) => ({ ...f })),
    envoyer: envoyerVers,
    geste,
    venirPres,
    rester: finAttention,
    destroy() {
      if (detruit) return;
      detruit = true;
      retirerRegard();
      clearTimeout(attenteElement);
      clearTimeout(finGeste);
      clearInterval(minuterieEnvies);
      garder();
      setMelange(null);
      for (const ev of GESTES_MARC) window.removeEventListener(ev, surGesteMarc);
      document.removeEventListener("contextmenu", surClicDroitPage);
      window.removeEventListener("scroll", surDefilement, true);
      cancelAnimationFrame(raf);
      clearInterval(minuterieVie);
      clearTimeout(appui);
      enCours?.abort();
      window.removeEventListener("pointermove", surCurseur);
      window.removeEventListener("pointerdown", surClicHors, true);
      window.removeEventListener("resize", surRedim);
      document.removeEventListener("visibilitychange", surVisibilite);
      couche.remove();
      actif = null;
    },
  };
  actif = poignee;
  return poignee;
}
