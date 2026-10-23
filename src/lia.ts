import { estRegarde, pointPresDeLElement, pointPresDuCurseur, rangDe } from "./attache.js";
import {
  PERIODE_DERIVE_HUMEUR_MS,
  dansZone,
  deriveHumeur,
  enSilence,
  jourLocal,
  pointDansZone,
  prochaineDecision,
} from "./autonomie.js";
import {
  ST,
  brut,
  construire,
  corps,
  humanStep,
  poke,
  regarder,
  setHumeur as moteurHumeur,
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
import { ecrireMemoire, ecrireRelances, lireMemoire, lireRelances } from "./stockage.js";
import { CSS } from "./styles.js";
import {
  type ActionLia,
  type EnvoiLia,
  type HumeurLia,
  type LiaHandle,
  type MotifSpontane,
  type OptionsLia,
  type ParoleSpontanee,
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
export function mountLia(options: OptionsLia = {}): LiaHandle {
  if (typeof document === "undefined") throw new Error("mountLia : à appeler dans le navigateur uniquement");
  if (actif) throw new Error("mountLia : une seule LIA par page (appeler destroy() avant d'en remonter une)");

  injecterStyles();

  const cle = options.cle ?? "lia";
  const rayonBase = options.rayon ?? 56;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const modeReduit = reduit ? (options.quandMouvementReduit ?? "doux") : "complet";
  /** « fixe » : une seule image, comme avant. */
  const sansMouvement = modeReduit === "fixe";
  /** « doux » : elle ne traverse jamais l'écran (pas de glissade, d'errance ni de suivi du curseur), mais vit sur place. */
  const doux = modeReduit === "doux";
  const memoire = lireMemoire(cle);
  let vie = (options.vieAutonome ?? true) && (memoire?.vie ?? true) && !sansMouvement;

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
  let humeurId: HumeurLia = "curieux";
  moteurHumeur(humeurId);

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

  const setHumeur = (h: HumeurLia): void => {
    if (h === humeurId) return;
    humeurId = h;
    moteurHumeur(h);
    options.onHumeur?.(h);
    if (sansMouvement) dessinerUneFois();
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

  const memoriser = (): void => {
    const z = zoneVie();
    const marge = rayon;
    const lw = Math.max(1, z.w - 2 * marge);
    const lh = Math.max(1, z.h - 2 * marge);
    ecrireMemoire(cle, {
      u: limiter((pos.x - z.x - marge) / lw, 0, 1),
      v: limiter((pos.y - z.y - marge) / lh, 0, 1),
      vie,
    });
  };

  /* ── voix : un coup par syllabe ── */
  const voix = (texte: string): void => {
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
      b.setAttribute("aria-checked", String(h.id === humeurId));
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

  /** Le menu de son corps (sans `element`) ou celui d'un élément de la page (clic droit n'importe où). */
  const ouvrirMenu = (x: number, y: number, element?: { cible: Element; d: ElementDecrit }): void => {
    if (detruit) return;
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
    if (menuOuvert && menu?.classList.contains("lia-ui__menu--element")) fermerMenu();
  };
  window.addEventListener("scroll", surDefilement, { passive: true, capture: true });

  function setVieAutonome(actifVie: boolean): void {
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
    try {
      hit.setPointerCapture(e.pointerId);
    } catch {
      /* capture impossible (pointeur déjà relâché) : le glisser marche quand même dans le bouton */
    }
    const p = fixerDepuisEvenement(e);
    glisse = { x: p.x, y: p.y, x0: p.x, y0: p.y, deplace: false };
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

  const penser = (): void => {
    if (!vie || sansMouvement || chatOuvert || menuOuvert || glisse || document.hidden || parle || etatForce) return;
    if (relache && t < relache + 6) return;
    relache = 0;
    if (t < errance.jusqua || t - dernierMot < 14) return;
    const vues = regardables();
    const d = prochaineDecision(Math.random, {
      curseurRecent: curseurRecent(),
      cibles: vues.length,
      parole: !!options.onSpontane && peutParlerSeule(),
      relance: relancesRestantes(),
    });
    if (doux && (d.type === "suivre" || d.type === "voir")) {
      // Sans déplacement : elle reste là, comme si elle attendait.
      errance = { jusqua: t + d.duree };
      choisir("repos");
    } else if (d.type === "suivre") {
      suivreCurseur(d.duree);
    } else if (d.type === "voir") {
      const el = vues[rangDe(d.rang, vues.length)];
      if (el) visiter(el, d.duree);
    } else if (d.type === "parler") {
      direSpontane(d.motif);
    } else if (d.type === "relance") {
      if (direSpontane("relance")) ecrireRelances(cle, { jour: jourLocal(new Date()), n: lireRelances(cle, jourLocal(new Date())) + 1 });
    } else if (d.type === "attendre") {
      errance = { jusqua: t + d.duree };
      choisir("repos");
    } else if (d.type === "errer") {
      if (!doux) cible = pointDansZone(zoneVie(), d.u, d.v, rayon * 1.3);
      errance = { jusqua: t + d.duree };
      choisir(d.etat);
    } else {
      setHumeur(d.humeur);
    }
  };
  const minuterieHumeur = setInterval(() => {
    if (!vie || document.hidden || chatOuvert) return;
    const h = deriveHumeur(Math.random);
    if (h) setHumeur(h);
  }, PERIODE_DERIVE_HUMEUR_MS);
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
    setEtat(e) {
      etatForce = e;
      choisir(e ?? "repos");
    },
    setVieAutonome,
    suivreCurseur,
    allerVoir,
    envoyer: envoyerVers,
    geste,
    venirPres,
    rester: finAttention,
    destroy() {
      if (detruit) return;
      detruit = true;
      clearTimeout(attenteElement);
      clearTimeout(finGeste);
      document.removeEventListener("contextmenu", surClicDroitPage);
      window.removeEventListener("scroll", surDefilement, true);
      cancelAnimationFrame(raf);
      clearInterval(minuterieVie);
      clearInterval(minuterieHumeur);
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
