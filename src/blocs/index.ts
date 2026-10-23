/**
 * `@mokarade/lia-ui/blocs` — dessine les blocs de réponse de LIA (22 formes, catalogue FERMÉ de
 * MemoryAI : `lib/lia/blocs.ts`, copie lisible `commun/assistant/BLOCS-lia.md`). Un seul rendu pour le
 * hub et les apps : `mountLia({ renderBlocks: rendreBlocs, … })`.
 *
 * ⚠️ Un bloc inconnu ou mal formé n'est PAS dessiné, il est compté : jamais d'exception, jamais de
 * valeur inventée. Tout texte par `textContent`, liens `https` seulement, couleurs en `--lia-*`.
 * Aucun réseau : les sources deviennent des liens seulement si l'hôte fournit `lienSource`.
 */

import { h } from "./dom.js";
import { FORMES, type OptionsFormes } from "./formes.js";
import { estObj, lienSur } from "./garde.js";

export interface OptionsBlocs extends OptionsFormes {
  /** Lien vers la fiche d'une source (id de fait ou de papier). `https` seulement ; sinon pas de lien. */
  lienSource?: (id: string) => string | null;
}

export interface BilanBlocs {
  rendus: number;
  ignores: number;
}

/** Au-delà, le reste est ignoré : MemoryAI n'en envoie jamais plus. */
export const MAX_BLOCS = 20;
export const TYPES_BLOCS: readonly string[] = Object.keys(FORMES);

const ATTR_STYLE = "data-lia-blocs";

function injecter(): void {
  if (document.head.querySelector(`style[${ATTR_STYLE}]`)) return;
  const st = document.createElement("style");
  st.setAttribute(ATTR_STYLE, "");
  st.textContent = CSS_BLOCS;
  document.head.appendChild(st);
}

function sources(ids: unknown, o: OptionsBlocs): HTMLElement | null {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const p = h("p", "lia-bloc__sources", ids.length > 1 ? `${ids.length} sources : ` : "Source : ");
  ids.forEach((id, i) => {
    const url = typeof id === "string" && o.lienSource ? lienSur(o.lienSource(id)) : null;
    if (i > 0) p.append(", ");
    if (!url) { p.append(String(i + 1)); return; }
    const a = h("a", "lia-bloc__lien", String(i + 1));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", `Source ${i + 1}`);
    p.append(a);
  });
  return p;
}

/** Dessine `blocs` à la fin de `dans`. Se branche tel quel sur `renderBlocks` de `mountLia`. */
export function rendreBlocs(blocs: readonly unknown[], dans: HTMLElement, options: OptionsBlocs = {}): BilanBlocs {
  const bilan: BilanBlocs = { rendus: 0, ignores: 0 };
  if (!Array.isArray(blocs)) return bilan;
  injecter();
  const zone = h("div", "lia-blocs");
  blocs.forEach((b: unknown, i) => {
    const type = estObj(b) && typeof b.type === "string" && Object.hasOwn(FORMES, b.type) ? b.type : null;
    let dessin: Node | null = null;
    try {
      dessin = i < MAX_BLOCS && type && estObj(b) ? FORMES[type]!(b, options) : null;
    } catch (e) {
      // Une forme qui lève est un défaut de ce paquet : le bloc est ignoré, l'erreur reste visible.
      console.error("lia-ui/blocs :", type, e instanceof Error ? e.message : e);
    }
    if (!dessin || !estObj(b)) { bilan.ignores++; return; }
    const fig = h("figure", `lia-bloc lia-bloc--${type}`);
    if (typeof b.titre === "string" && b.titre.trim() && b.titre.length <= 120) fig.append(h("figcaption", "lia-bloc__titre", b.titre));
    fig.append(dessin);
    const src = sources(b.sources, options);
    if (src) fig.append(src);
    zone.append(fig);
    bilan.rendus++;
  });
  if (bilan.rendus) dans.append(zone);
  return bilan;
}

export const CSS_BLOCS: string = `
.lia-blocs:not(.lia-ui .lia-blocs){--lia-bg:#0B0D12;--lia-surface:#12151C;--lia-surface-2:#181C25;--lia-border:rgba(255,255,255,.12);--lia-text:#E9EDF5;--lia-soft:#A7AEBD;--lia-accent:#93A0FF;--lia-danger:#E5675B}
.lia-blocs{--lia-info:#60A5FA;--lia-ok:#34D399;--lia-warn:#FBBF24;
display:flex;flex-direction:column;gap:.6rem;margin-top:.6rem;white-space:normal;color:var(--lia-text);font-family:inherit}
.lia-bloc{margin:0;padding:.7rem .8rem;border:1px solid var(--lia-border);border-radius:14px;background:var(--lia-surface);display:flex;flex-direction:column;gap:.5rem;min-width:0}
.lia-bloc__titre{font-weight:600;font-size:.95rem}
.lia-bloc__toile{width:100%;height:auto;max-height:220px;display:block}
.lia-bloc__etiq{font-size:11px;fill:var(--lia-soft)}
.lia-bloc__etiq--sur{fill:var(--lia-bg);font-weight:700}
.lia-bloc__grand{font-size:2rem;font-weight:300;line-height:1.1;fill:var(--lia-text)}
.lia-bloc__sous,.lia-bloc__sources{margin:0;font-size:.85rem;color:var(--lia-soft)}
.lia-bloc__lien{color:var(--lia-accent);display:inline-flex;align-items:center;min-height:44px;min-width:44px;justify-content:center}
.lia-bloc__lien:focus-visible,.lia-bloc__btn:focus-visible,.lia-bloc__defile:focus-visible{outline:2px solid var(--lia-accent);outline-offset:2px}
.lia-bloc__legende{margin:0;padding-left:1.2rem;font-size:.85rem;display:flex;flex-direction:column;gap:.2rem}
.lia-bloc__legende--puces{list-style:none;padding:0}
.lia-bloc__legende--puces li::before{content:"";display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.4em;background:var(--c)}
.lia-bloc__frise{list-style:none;margin:0;padding:0 0 0 1rem;border-left:2px solid var(--lia-border);display:flex;flex-direction:column;gap:.5rem}
.lia-bloc__etape{display:flex;flex-direction:column;position:relative}
.lia-bloc__etape::before{content:"";position:absolute;left:calc(-1rem - 6px);top:.35em;width:10px;height:10px;border-radius:50%;background:var(--lia-surface-2);border:2px solid var(--lia-soft)}
.lia-bloc__etape--actuel::before{background:var(--lia-accent);border-color:var(--lia-accent)}
.lia-bloc__etape time,.lia-bloc__bulle time,.lia-bloc__jour time{font-size:.8rem;color:var(--lia-soft)}
.lia-bloc__cases{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35rem}
.lia-bloc__case{display:flex;gap:.5rem;align-items:baseline}
.lia-bloc__case::before{content:"";flex:none;width:14px;height:14px;border-radius:4px;border:2px solid var(--lia-soft)}
.lia-bloc__case--fait::before{background:var(--lia-ok);border-color:var(--lia-ok)}
.lia-bloc__case--fait span:last-child{color:var(--lia-soft);text-decoration:line-through}
.lia-bloc__cache{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lia-bloc__fil{display:flex;flex-direction:column;gap:.4rem}
.lia-bloc__bulle{padding:.45rem .7rem;border-radius:12px;background:var(--lia-surface-2);display:flex;flex-wrap:wrap;gap:.1rem .5rem;align-items:baseline}
.lia-bloc__bulle p{margin:0;flex-basis:100%;overflow-wrap:anywhere}
.lia-bloc__ligne{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto;gap:.5rem;align-items:center;font-size:.88rem}
.lia-bloc__lib{overflow-wrap:anywhere}
.lia-bloc__piste{height:10px;border-radius:5px;background:var(--lia-surface-2);overflow:hidden}
.lia-bloc__barre{display:block;height:100%;border-radius:5px}
.lia-bloc__val{font-variant-numeric:tabular-nums;color:var(--lia-soft)}
.lia-bloc__chiffre{display:flex;flex-direction:column;gap:.1rem}
.lia-bloc__var{font-size:.85rem;color:var(--lia-ok)}
.lia-bloc__var--bas{color:var(--lia-danger)}
.lia-bloc__defile{overflow-x:auto;max-width:100%}
.lia-bloc__table{border-collapse:collapse;font-size:.85rem;min-width:100%}
.lia-bloc__table th,.lia-bloc__table td{padding:.35rem .5rem;border-bottom:1px solid var(--lia-border);text-align:left;vertical-align:top}
.lia-bloc__table th{color:var(--lia-soft);font-weight:600}
.lia-bloc__chaleur td{text-align:center;background:color-mix(in srgb,var(--lia-accent) calc(var(--i) * 70%),transparent)}
.lia-bloc__jours{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.35rem}
.lia-bloc__jour{padding:.4rem;border-radius:10px;border:1px solid var(--lia-border);display:flex;flex-direction:column;font-size:.85rem;background:color-mix(in srgb,var(--lia-accent) calc(var(--i) * 45%),transparent)}
.lia-bloc__colonnes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.5rem}
.lia-bloc__col{border:1px solid var(--lia-border);border-radius:10px;padding:.5rem;min-width:0}
.lia-bloc__col h4{margin:0 0 .35rem;font-size:.9rem}
.lia-bloc__col dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.2rem .5rem;font-size:.85rem}
.lia-bloc__col dt{color:var(--lia-soft)}.lia-bloc__col dd{margin:0;overflow-wrap:anywhere}
.lia-bloc__col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.3rem}
.lia-bloc__carte{padding:.35rem .5rem;border-radius:8px;background:var(--lia-surface-2);font-size:.85rem;overflow-wrap:anywhere}
.lia-bloc__arbre,.lia-bloc__arbre ul{list-style:none;margin:0;padding-left:1rem;border-left:1px solid var(--lia-border);font-size:.88rem}
.lia-bloc__arbre{border-left:0;padding-left:0}
.lia-bloc__arbre li{padding:.15rem 0}
.lia-bloc__doc{display:flex;flex-direction:column;gap:.2rem}
.lia-bloc__confirmer p{margin:0}
.lia-bloc__actions{display:flex;gap:.5rem;flex-wrap:wrap}
.lia-bloc__btn{min-height:44px;padding:0 1rem;border-radius:22px;border:1px solid var(--lia-border);background:transparent;color:var(--lia-text);font:inherit;font-size:.95rem;cursor:pointer}
.lia-bloc__btn--accent{background:var(--lia-accent);border-color:var(--lia-accent);color:var(--lia-bg)}
.lia-bloc__btn[disabled]{opacity:.5;cursor:default}
`;
