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

const MARQUE = /\s*\[[→↗]\s*([^\]\s]+)\s*\]/g;
const MARQUE_COUPEE = /\s*\[[→↗][^\]]*$/;

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

/** Sort les marques valides du texte ; les invalides restent en place. */
export function decouperSources(texte: string, base: string): ReponseDecoupee {
  const sources: string[] = [];
  const net = texte.replace(MARQUE, (tout, brut: string) => {
    const url = adresseSure(brut, base);
    if (!url) return tout;
    if (!sources.includes(url)) sources.push(url);
    return "";
  });
  return { texte: net.trim(), sources };
}

/** Retire une marque que la borne de la discussion partagée aurait coupée en deux. */
export function retirerMarqueCoupee(texte: string): string {
  return texte.replace(MARQUE_COUPEE, "").trimEnd();
}
