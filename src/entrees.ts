import type { Envies } from "./cerveau.js";

/**
 * Les entrées du réseau que LIA sait calculer seule, sans rien demander à l'hôte (formules de `entrees()` de la
 * maquette V9) : ses envies, le moment de la journée, ce que fait Marc sur la page et le rythme de leurs échanges.
 * Ce qui vient du monde de l'hôte (alertes, apps, tendances) arrive par `options.entrees`. Pur : l'heure est injectée.
 */

/** Un message de Marc dans la discussion : seulement de quoi mesurer le rythme, jamais le texte. */
export interface EchangeMarc {
  /** Millisecondes depuis 1970. */
  t: number;
  longueur: number;
  question: boolean;
}

export interface ContexteEntrees {
  maintenant: Date;
  envies: Readonly<Envies>;
  /** Dernier geste de Marc sur la page (curseur, clavier, défilement, doigt), en ms ; 0 = jamais. */
  dernierMarc: number;
  /** Quand la page s'est ouverte, en ms. */
  debut: number;
  /** Ses derniers messages dans la discussion, du plus ancien au plus récent. */
  echanges: readonly EchangeMarc[];
  /** Dernière fois que l'un des deux a parlé (message de Marc ou parole de LIA), en ms ; 0 = jamais. */
  dernierPropos: number;
  /** Dernière nouvelle venue du monde de l'hôte (`impulsion` ou `entrees`), en ms ; 0 = jamais. */
  dernierMonde: number;
}

const borne = (x: number): number => Math.max(0, Math.min(1, x));

export function entreesLocales(c: ContexteEntrees): Record<string, number> {
  const now = c.maintenant.getTime();
  const h = c.maintenant.getHours() + c.maintenant.getMinutes() / 60;
  const jour = c.maintenant.getDay();
  const recents = c.echanges.filter((e) => now - e.t < 15 * 60e3).slice(-6);
  const moyenne = recents.length ? recents.reduce((s, e) => s + e.longueur, 0) / recents.length : 0;
  const dernierEchange = c.echanges.at(-1);
  return {
    ...c.envies,
    nuit: h >= 23 || h < 6 ? 1 : h >= 21 ? 0.5 : h < 7 ? 0.4 : 0,
    matin: h >= 6 && h < 10 ? 1 : h >= 10 && h < 11 ? 0.4 : 0,
    midi: h >= 11 && h < 14 ? 1 : 0,
    soir: h >= 18 && h < 23 ? 1 : 0,
    weekend: jour % 6 === 0 ? 1 : 0,
    aube: h >= 5 && h < 7 ? 1 : 0,
    apresmidi: h >= 14 && h < 18 ? 1 : 0,
    vendredi: jour === 5 ? 1 : 0,
    lundi: jour === 1 ? 1 : 0,
    actif: borne(1 - (now - c.dernierMarc) / 8000),
    absent: borne((now - c.dernierMarc - 60e3) / 180e3),
    sessionLongue: borne((now - c.debut) / 3600e3),
    conv: dernierEchange ? borne(1 - (now - dernierEchange.t) / 120e3) : 0,
    silence: borne((now - (c.dernierPropos || c.debut)) / (15 * 60e3)),
    calmeMonde: borne((now - (c.dernierMonde || c.debut)) / 600e3),
    questions: recents.length ? recents.filter((e) => e.question).length / recents.length : 0,
    bref: recents.length && moyenne < 60 ? 1 - moyenne / 60 : 0,
    bavard: moyenne > 100 ? borne((moyenne - 100) / 100) : 0,
    rythme: borne(recents.length / 6),
  };
}
