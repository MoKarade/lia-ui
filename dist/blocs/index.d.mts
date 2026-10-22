/**
 * Les 22 formes. Chaque fonction reçoit un bloc DÉJÀ objet et rend son dessin, ou `null` si sa
 * forme ne tient pas : alors rien n'est dessiné (jamais de valeur inventée pour combler).
 */

interface OptionsFormes {
    /** Reçoit l'action d'une `confirmation` quand Marc confirme. Absent : la carte n'a pas de bouton. */
    onConfirmer?: (action: {
        id: string;
        niveau: 1 | 2 | 3;
    }) => void;
}

/**
 * `@mokarade/lia-ui/blocs` — dessine les blocs de réponse de LIA (22 formes, catalogue FERMÉ de
 * MemoryAI : `lib/lia/blocs.ts`, copie lisible `commun/assistant/BLOCS-lia.md`). Un seul rendu pour le
 * hub et les apps : `mountLia({ renderBlocks: rendreBlocs, … })`.
 *
 * ⚠️ Un bloc inconnu ou mal formé n'est PAS dessiné, il est compté : jamais d'exception, jamais de
 * valeur inventée. Tout texte par `textContent`, liens `https` seulement, couleurs en `--lia-*`.
 * Aucun réseau : les sources deviennent des liens seulement si l'hôte fournit `lienSource`.
 */

interface OptionsBlocs extends OptionsFormes {
    /** Lien vers la fiche d'une source (id de fait ou de papier). `https` seulement ; sinon pas de lien. */
    lienSource?: (id: string) => string | null;
}
interface BilanBlocs {
    rendus: number;
    ignores: number;
}
/** Au-delà, le reste est ignoré : MemoryAI n'en envoie jamais plus. */
declare const MAX_BLOCS = 20;
declare const TYPES_BLOCS: readonly string[];
/** Dessine `blocs` à la fin de `dans`. Se branche tel quel sur `renderBlocks` de `mountLia`. */
declare function rendreBlocs(blocs: readonly unknown[], dans: HTMLElement, options?: OptionsBlocs): BilanBlocs;
declare const CSS_BLOCS: string;

export { type BilanBlocs, CSS_BLOCS, MAX_BLOCS, type OptionsBlocs, TYPES_BLOCS, rendreBlocs };
