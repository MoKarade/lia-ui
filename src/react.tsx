"use client";

import { useEffect, useRef } from "react";
import { mountLia } from "./lia.js";
import type { LiaHandle, OptionsLia } from "./types.js";

export interface LiaProps extends OptionsLia {
  /** Reçoit la poignée une fois LIA montée (et `null` au démontage). */
  onPret?: (lia: LiaHandle | null) => void;
}

/**
 * LIA pour React / Next.js. Rend `null` : elle vit dans sa propre couche, montée côté navigateur
 * seulement. Les callbacks (`ask`, `actions`, `onChip`…) peuvent changer à chaque rendu sans la remonter ;
 * `container`, `rayon`, `cle` et `vieAutonome` ne sont lus qu'au montage.
 */
export function Lia(props: LiaProps): null {
  const derniere = useRef(props);
  derniere.current = props;

  useEffect(() => {
    const p = derniere.current;
    const lia = mountLia({
      ...(p.container ? { container: p.container } : {}),
      ...(p.rayon !== undefined ? { rayon: p.rayon } : {}),
      ...(p.cle !== undefined ? { cle: p.cle } : {}),
      ...(p.vieAutonome !== undefined ? { vieAutonome: p.vieAutonome } : {}),
      ...(p.salut !== undefined ? { salut: p.salut } : {}),
      ...(p.bounds ? { bounds: () => derniere.current.bounds?.() ?? { x: 0, y: 0, w: 0, h: 0 } } : {}),
      ...(p.ask
        ? {
            ask: (q: string, signal: AbortSignal) => {
              const ask = derniere.current.ask;
              return ask ? ask(q, signal) : Promise.reject(new Error("LIA : ask retiré"));
            },
          }
        : {}),
      get actions() {
        return derniere.current.actions ?? [];
      },
      onChip: (id, contexte) => derniere.current.onChip?.(id, contexte),
      onHumeur: (h) => derniere.current.onHumeur?.(h),
      renderBlocks: (b, dans) => derniere.current.renderBlocks?.(b, dans),
    });
    derniere.current.onPret?.(lia);
    return () => {
      derniere.current.onPret?.(null);
      lia.destroy();
    };
  }, []);

  return null;
}
