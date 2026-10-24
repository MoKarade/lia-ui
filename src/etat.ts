/**
 * L'état partagé de LIA : ce qui fait qu'elle est UNE seule, quel que soit l'hôte (hub, MemoryAI, apps).
 * Fonctions pures : le paquet ne touche jamais le réseau ici, c'est l'hôte qui fournit `etat.lire` / `etat.ecrire`.
 * Ce qui arrive de l'hôte est une DONNÉE : on le valide, on borne les nombres et on ne garde que des verbes de LIA.
 */
import { COMPORTEMENTS, JOURNAL_MAX, type Envies, type FaitLia } from "./cerveau.js";
import { CAUSES, type Interieur } from "./interieur.js";
import { validerSouvenirs, type Souvenir } from "./souvenirs.js";

export interface RelancesPartagees {
  /** Date locale AAAA-MM-JJ. */
  jour: string;
  n: number;
}

export interface EtatLia {
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
}

/** Ce que l'hôte fournit. `ecrire` peut rendre l'état que l'hôte garde (plus récent que le nôtre), `lire` rend `null` s'il n'en a aucun. */
export interface EtatHote {
  lire(): Promise<unknown>;
  ecrire(etat: EtatLia): Promise<unknown>;
}

const NOMS_ENVIES = ["energie", "curiosite", "social", "inquiet", "joie", "ennui"] as const;
const LENTE_MAX = 80;
const VERSION_MAX = 1_000_000_000;

const estFraction = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;

/** Le monde intérieur d'un état partagé : retiré (jamais l'état entier) s'il n'est pas conforme. */
function validerInterieur(brut: unknown): Interieur | undefined {
  if (typeof brut !== "object" || brut === null) return undefined;
  const { douleur, cause, sensibilite, plaisir, confiance, usure } = brut as Record<string, unknown>;
  if (![douleur, sensibilite, plaisir, confiance, usure].every(estFraction)) return undefined;
  if (cause !== null && !(typeof cause === "string" && (CAUSES as readonly string[]).includes(cause))) return undefined;
  return { douleur, sensibilite, plaisir, confiance, usure, cause } as Interieur;
}

/** `null` si ce que l'hôte rend n'est pas un état valide : LIA garde alors le sien. Les clés inconnues sont retirées. */
export function validerEtat(brut: unknown): EtatLia | null {
  if (typeof brut !== "object" || brut === null) return null;
  const o = brut as Record<string, unknown>;
  const { version, maj, envies, journal, lente, humeur, relances } = o;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0 || version > VERSION_MAX) return null;
  if (typeof maj !== "number" || !Number.isFinite(maj) || maj <= 0) return null;
  if (typeof envies !== "object" || envies === null || !Array.isArray(journal)) return null;
  const e = envies as Record<string, unknown>;
  if (!NOMS_ENVIES.every((k) => estFraction(e[k]))) return null;
  if (typeof humeur !== "string" || !/^[a-zà-ÿ_-]{1,40}$/i.test(humeur)) return null;
  if (typeof relances !== "object" || relances === null) return null;
  const { jour, n } = relances as Record<string, unknown>;
  if (typeof jour !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 100) return null;
  const propre: Record<string, number> = {};
  if (typeof lente === "object" && lente !== null) {
    for (const [k, v] of Object.entries(lente).slice(0, LENTE_MAX)) {
      if (/^[A-Za-z0-9_-]{1,40}$/.test(k) && estFraction(v)) propre[k] = v;
    }
  }
  const faits: FaitLia[] = [];
  for (const f of journal as unknown[]) {
    if (typeof f !== "object" || f === null) continue;
    const { t, quoi } = f as Record<string, unknown>;
    if (typeof t === "number" && Number.isFinite(t) && t > 0 && typeof quoi === "string" && (COMPORTEMENTS as readonly string[]).includes(quoi)) {
      faits.push({ t, quoi: quoi as FaitLia["quoi"] });
    }
  }
  const enviesPropres = Object.fromEntries(NOMS_ENVIES.map((k) => [k, e[k] as number])) as unknown as Envies;
  const interieur = validerInterieur(o["interieur"]);
  // Les souvenirs douteux sont retirés un à un (jamais l'état) ; une liste vide n'est pas écrite.
  const souvenirs = validerSouvenirs(o["souvenirs"]);
  return {
    version,
    maj,
    envies: enviesPropres,
    journal: faits.slice(-JOURNAL_MAX),
    lente: propre,
    humeur,
    relances: { jour, n },
    ...(interieur ? { interieur } : {}),
    ...(souvenirs.length ? { souvenirs } : {}),
  };
}

/** Faut-il adopter l'état de l'hôte ? Oui s'il est plus récent que le dernier que nous avons lu ou écrit ; à égalité de date, la version la plus haute. */
export function adopter(distant: EtatLia | null, majVue: number, versionVue: number): boolean {
  if (!distant) return false;
  return distant.maj > majVue || (distant.maj === majVue && distant.version > versionVue);
}

/** Une empreinte grossière de ce qui compte : ne réécrire que si quelque chose a vraiment changé (envies, douleur, plaisir et confiance au vingtième près, souvenirs : leur nombre, le dernier et leur poids au cinquième près). */
export function empreinte(e: Pick<EtatLia, "envies" | "journal" | "humeur" | "relances" | "interieur"> & { souvenirs?: readonly Souvenir[] }): string {
  const arrondi = NOMS_ENVIES.map((k) => Math.round(e.envies[k] * 20)).join(",");
  const dernier = e.journal[e.journal.length - 1];
  const i = e.interieur;
  const dedans = i ? `${[i.douleur, i.plaisir, i.confiance].map((x) => Math.round(x * 20)).join(",")}:${i.cause ?? "-"}` : "-";
  const sv = e.souvenirs ?? [];
  const dernierSouvenir = sv.reduce((m, x) => Math.max(m, x.quand), 0);
  const lourdeur = Math.round(sv.reduce((t, x) => t + x.poids, 0) * 5);
  const memoire = sv.length ? `${sv.length}:${dernierSouvenir}:${lourdeur}` : "-";
  return `${arrondi}|${e.journal.length}:${dernier?.t ?? 0}|${e.humeur}|${e.relances.jour}:${e.relances.n}|${dedans}|${memoire}`;
}
