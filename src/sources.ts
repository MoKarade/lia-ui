// src/sources.ts : les marques de source d'une réponse (`[→lien]`, `[↗lien]`) sortent du texte et
// deviennent une ligne de petits liens sous le message. Pur : aucune lecture du DOM.
// ⚠️ Le texte du modèle est une DONNÉE : on ne rend que des adresses https (ou http en local) sans
// identifiants ; une marque qui ne passe pas reste du texte inoffensif.

export interface ReponseDecoupee {
  /** Le texte sans les marques valides, espaces resserrés. */
  texte: string;
  /** Les adresses absolues, dans l'ordre d'apparition, sans doublon. */
  sources: string[];
}

/** Une adresse plus longue n'est pas une source : on borne la recherche du `]` (lecture linéaire, jamais d'expression régulière sur le texte du modèle). */
const LONGUEUR_MAX = 2048;
/** Au plus ce nombre de liens sous un message : les marques en trop sortent du texte sans devenir des liens. */
export const SOURCES_MAX = 8;

/** L'adresse absolue si elle est sûre, sinon `null`. Une adresse relative se résout sur `base`. */
export function adresseSure(brut: string, base: string): string | null {
  try {
    const u = new URL(brut, base);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
    if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return null;
    if (u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

const estEspace = (c: string): boolean => c === " " || c === "\n" || c === "\t" || c === "\r" || c === "\u00a0";

/** Sort les marques valides du texte ; les invalides restent en place. */
export function decouperSources(texte: string, base: string): ReponseDecoupee {
  const sources: string[] = [];
  let sortie = "";
  let i = 0;
  while (i < texte.length) {
    const c = texte[i] as string;
    const suivant = texte[i + 1];
    if (c === "[" && (suivant === "→" || suivant === "↗")) {
      let fin = -1;
      for (let k = i + 2; k < texte.length && k <= i + 2 + LONGUEUR_MAX; k++) {
        if (texte[k] === "]") {
          fin = k;
          break;
        }
      }
      if (fin !== -1) {
        const brut = texte.slice(i + 2, fin).trim();
        const url = brut && ![...brut].some(estEspace) ? adresseSure(brut, base) : null;
        if (url) {
          if (sources.length < SOURCES_MAX && !sources.includes(url)) sources.push(url);
          let k = sortie.length;
          while (k > 0 && estEspace(sortie[k - 1] as string)) k--;
          sortie = sortie.slice(0, k);
          i = fin + 1;
          continue;
        }
      }
    }
    sortie += c;
    i++;
  }
  return { texte: sortie.trim(), sources };
}

/** Retire une marque que la borne de la discussion partagée aurait coupée en deux. */
export function retirerMarqueCoupee(texte: string): string {
  const a = texte.lastIndexOf("[→");
  const b = texte.lastIndexOf("[↗");
  const debut = Math.max(a, b);
  if (debut === -1 || texte.indexOf("]", debut) !== -1) return texte;
  return texte.slice(0, debut).trimEnd();
}
