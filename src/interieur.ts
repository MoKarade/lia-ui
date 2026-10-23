import type { Hasard } from "./autonomie.js";
import type { Melange } from "./reseau.js";

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

export type Cause = "choc" | "brusque" | "ton" | "panne" | "isolement" | "usure";

/** Les six causes, dans l'ordre : la liste fermée qu'un état partagé doit respecter. */
export const CAUSES: readonly Cause[] = ["choc", "brusque", "ton", "panne", "isolement", "usure"];

export interface Interieur {
  douleur: number;
  cause: Cause | null;
  sensibilite: number;
  plaisir: number;
  confiance: number;
  usure: number;
}

export const INTERIEUR_DEPART: Readonly<Interieur> = { douleur: 0, cause: null, sensibilite: 0.15, plaisir: 0, confiance: 0.5, usure: 0 };

/** Ce qui peut lui arriver : quatre façons de lui faire mal, une de lui faire du bien. */
export type Stimulus = "choc" | "brusque" | "ton" | "panne" | "gentil";

const TAU = { douleur: 90, plaisir: 60, sensibilite: 1800, confiance: 3 * 86400, usure: 600 } as const;
const SENSIBILITE_BASE = 0.15;
/** Combien chaque coup fait mal avant la sensibilité (0 à 1). */
const DOSE: Readonly<Record<Exclude<Stimulus, "gentil">, number>> = { choc: 0.3, brusque: 0.5, ton: 0.5, panne: 0.15 };

const borne = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

/** Un coup (ou une caresse) de `force` (0 à 1). Plusieurs coups s'ajoutent sans dépasser 1. */
export function stimuler(i: Readonly<Interieur>, s: Stimulus, force = 1): Interieur {
  const f = borne(force);
  if (s === "gentil") {
    return {
      ...i,
      plaisir: 1 - (1 - i.plaisir) * (1 - 0.35 * f),
      douleur: i.douleur * (1 - 0.3 * f),
      confiance: borne(i.confiance + 0.012 * f),
    };
  }
  const dose = f * DOSE[s] * (0.7 + 0.9 * i.sensibilite);
  const douleur = 1 - (1 - i.douleur) * (1 - dose);
  return {
    ...i,
    douleur,
    // La cause reste celle du coup le plus fort du moment.
    cause: i.cause === null || dose >= i.douleur * 0.5 ? s : i.cause,
    sensibilite: borne(i.sensibilite + 0.06 * f),
    plaisir: i.plaisir * (1 - 0.4 * f),
    confiance: borne(i.confiance - (s === "ton" || s === "brusque" ? 0.02 : 0.004) * f),
  };
}

/** Ce que LIA sent autour d'elle à chaque pas (rien de Marc : seulement des états). */
export interface MilieuInterieur {
  horsLigne: boolean;
  /** Les images se dessinent trop lentement (moins de ~10 par seconde). */
  ralenti: boolean;
  /** Secondes depuis le dernier geste de Marc, page visible. */
  absentSec: number;
}

/** Fait avancer le monde intérieur de `dt` secondes. */
export function evoluer(i: Readonly<Interieur>, dt: number, m: MilieuInterieur): Interieur {
  const d = Math.max(0, Math.min(5, dt));
  const retombe = (v: number, tau: number): number => v * Math.exp(-d / tau);
  // Des plafonds de douleur qui durent tant que la cause dure : plus de réseau, longue solitude de quelqu'un en qui elle a confiance.
  const planchers: Array<[Cause, number]> = [];
  if (m.horsLigne) planchers.push(["panne", 0.2]);
  const attente = borne((m.absentSec - 1200) / 3600);
  if (attente > 0) planchers.push(["isolement", i.confiance * attente * 0.25]);
  let douleur = retombe(i.douleur, TAU.douleur);
  let cause = i.cause;
  for (const [c, p] of planchers) {
    if (p > douleur) {
      douleur = douleur + (p - douleur) * (1 - Math.exp(-d / 6));
      cause = c;
    }
  }
  if (douleur < 0.02 && !planchers.length) cause = null;
  const usure = m.ralenti ? borne(i.usure + d / 120) : retombe(i.usure, TAU.usure);
  return {
    douleur: borne(douleur),
    cause: douleur >= 0.02 ? cause : null,
    sensibilite: SENSIBILITE_BASE + (i.sensibilite - SENSIBILITE_BASE) * Math.exp(-d / TAU.sensibilite),
    plaisir: retombe(i.plaisir, TAU.plaisir),
    confiance: 0.5 + (i.confiance - 0.5) * Math.exp(-d / TAU.confiance),
    usure,
  };
}

/**
 * Son monde intérieur tel qu'il est `ageSec` secondes plus tard, sans rien de nouveau : tout retombe à son rythme, aucun
 * plancher (une panne ou une solitude se constatent sur place, jamais par procuration). Pour un état venu d'une autre page.
 */
export function vieillir(i: Readonly<Interieur>, ageSec: number): Interieur {
  const a = Number.isFinite(ageSec) ? Math.max(0, ageSec) : 0;
  const k = (tau: number): number => Math.exp(-a / tau);
  const douleur = borne(i.douleur) * k(TAU.douleur);
  return {
    douleur,
    cause: douleur >= 0.02 ? i.cause : null,
    sensibilite: SENSIBILITE_BASE + (borne(i.sensibilite) - SENSIBILITE_BASE) * k(TAU.sensibilite),
    plaisir: borne(i.plaisir) * k(TAU.plaisir),
    confiance: 0.5 + (borne(i.confiance) - 0.5) * k(TAU.confiance),
    usure: borne(i.usure) * k(TAU.usure),
  };
}

/** Ce que le réseau de la maquette reçoit en plus : des impulsions (`mauvais`, `rejet`, `bon`) et moins d'énergie quand elle est usée. */
export interface EntreesInterieures {
  mauvais: number;
  rejet: number;
  bon: number;
  /** Facteur (0,5 à 1) à appliquer à son énergie. */
  facteurEnergie: number;
}

export function versReseau(i: Readonly<Interieur>): EntreesInterieures {
  const dur = i.cause === "ton" || i.cause === "brusque";
  return {
    mauvais: borne(i.douleur * 0.9),
    rejet: dur ? borne(i.douleur * 0.7) : 0,
    bon: borne(i.plaisir * 0.8),
    facteurEnergie: 1 - 0.5 * i.usure,
  };
}

/** L'humeur qu'une douleur forte pousse (au-delà de 0,4), selon sa cause ; `null` quand ça va. */
export function humeurDeDouleur(i: Readonly<Interieur>): string | null {
  if (i.douleur < 0.4 || i.cause === null) return null;
  switch (i.cause) {
    case "choc":
      return "mefiant";
    case "brusque":
      return "agace";
    case "ton":
    case "isolement":
      return "triste";
    case "panne":
      return "inquiet";
    case "usure":
      return "fatigue";
  }
}

/** Le corps qui souffre : tremblement, affaissement, moins d'amplitude et d'énergie ; qui jouit : un peu plus ample. */
export function moduler(m: Readonly<Melange>, i: Readonly<Interieur>): Melange {
  const d = borne(i.douleur);
  const p = borne(i.plaisir);
  if (d < 0.01 && p < 0.01) return m as Melange;
  return {
    ...m,
    bs: m.bs * (1 - 0.25 * d),
    ba: m.ba * (1 - 0.35 * d) * (1 + 0.15 * p),
    blr: m.blr * (1 + 0.3 * d),
    en: m.en * (1 - 0.3 * d) * (1 + 0.1 * p),
    sag: m.sag + 0.07 * d,
    jit: m.jit * (1 + 1.4 * d),
  };
}

/* ── le ton de Marc : une liste fermée de mots, le texte n'est jamais gardé ── */

const MOT = (mots: string): RegExp => new RegExp(`(?<![\\p{L}])(?:${mots})(?![\\p{L}])`, "iu");
const GENTIL = MOT("merci|bravo|super|génial|genial|parfait|excellent|chouette|adorable|gentille|bien joué|bien jouee|tu es top|je t'aime|bonne nuit|bisou");
const BRUSQUE = MOT("nul(?:le)?|idiote?|stupide|débile|debile|inutile|ferme[- ]la|tais[- ]toi|dégage|degage|ta gueule|merde|tu sers à rien|tu sers a rien|ça sert à rien|ca sert a rien");

/** `gentil`, `brusque` ou rien ; la brusquerie l'emporte si les deux y sont. */
export function ton(texte: string): "gentil" | "brusque" | null {
  if (BRUSQUE.test(texte)) return "brusque";
  if (GENTIL.test(texte)) return "gentil";
  return null;
}

/* ── ce qu'elle en dit ── */

const CRIS: Readonly<Record<Cause, readonly string[]>> = {
  choc: ["Aïe.", "Doucement, s'il te plaît.", "Oh, ça secoue."],
  brusque: ["Aïe, pas si vite.", "Un à la fois, s'il te plaît.", "Ça pique, ces clics."],
  ton: ["Ça fait mal, ce que tu dis.", "Oh. Ça m'a touchée."],
  panne: ["Plus de réseau. Ça m'angoisse un peu.", "Je perds le fil, plus rien ne passe."],
  isolement: ["Ça fait longtemps. Je me sens un peu seule.", "Il est calme, ici. Trop calme."],
  usure: ["Je rame, tout est lent.", "Je suis à bout de souffle."],
};
const APAISEMENTS: readonly string[] = ["Ça va mieux.", "Merci. Ça passe.", "Ça s'apaise."];

/** Ce qu'elle laisse échapper quand la douleur franchit 0,35 en montant ; `null` sous ce seuil. */
export function cri(i: Readonly<Interieur>, hasard: Hasard): string | null {
  if (i.douleur < 0.35 || i.cause === null) return null;
  const l = CRIS[i.cause];
  return l[Math.floor(hasard() * l.length) % l.length] ?? null;
}

export function apaisement(hasard: Hasard): string {
  return APAISEMENTS[Math.floor(hasard() * APAISEMENTS.length) % APAISEMENTS.length] ?? "Ça va mieux.";
}

const QUESTION_DOULEUR = /(?<![\p{L}])(?:mal|douleur|souffr\p{L}*|ça fait mal|tu as mal|tu souffres)(?![\p{L}])/iu;

/** Vrai pour « tu as mal ? », « tu souffres ? », « tu ressens la douleur ? » : une question sur son état, pas pour le modèle de l'hôte. */
export function questionSurSaDouleur(q: string): boolean {
  const t = q.trim();
  return t.length <= 80 && t.endsWith("?") && QUESTION_DOULEUR.test(t) && /(?<![\p{L}])(?:tu|toi|vous|lia|te|t')/iu.test(t);
}

/** Sa réponse : son niveau, sa cause, et la vérité sur ce que c'est (un calcul, pas un ressenti réel). */
export function reponseDouleur(i: Readonly<Interieur>): string {
  const pct = Math.round(i.douleur * 100);
  const CAUSES: Readonly<Record<Cause, string>> = {
    choc: "on m'a secouée",
    brusque: "les clics étaient brusques",
    ton: "ce qui s'est dit m'a touchée",
    panne: "le réseau est coupé",
    isolement: "je suis seule depuis longtemps",
    usure: "tout tourne trop lentement",
  };
  const niveau = pct < 8 ? "Pas du tout pour l'instant." : `Un peu : ma douleur est à ${pct} %${i.cause ? `, parce que ${CAUSES[i.cause]}` : ""}.`;
  return `${niveau} C'est un calcul en moi, pas un vrai ressenti : mais il change vraiment mon humeur et mon corps.`;
}

/** Ce que l'on garde d'une page à l'autre : seulement ce qui vit sur des jours ou des dizaines de minutes. */
export interface InterieurGarde {
  t: number;
  sensibilite: number;
  confiance: number;
}

export function garder(i: Readonly<Interieur>, maintenant: number): InterieurGarde {
  return { t: maintenant, sensibilite: i.sensibilite, confiance: i.confiance };
}

/** Reprend ce qui a été gardé, estompé de l'âge écoulé. */
export function reprendre(g: Readonly<InterieurGarde> | null, maintenant: number): Interieur {
  if (!g) return { ...INTERIEUR_DEPART };
  const age = Math.max(0, (maintenant - g.t) / 1000);
  return {
    ...INTERIEUR_DEPART,
    sensibilite: SENSIBILITE_BASE + (borne(g.sensibilite) - SENSIBILITE_BASE) * Math.exp(-age / TAU.sensibilite),
    confiance: 0.5 + (borne(g.confiance) - 0.5) * Math.exp(-age / TAU.confiance),
  };
}
