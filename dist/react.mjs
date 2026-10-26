"use client";
import {
  mountLia
} from "./chunk-QVN6XUNQ.mjs";

// src/react.tsx
import { useEffect, useRef } from "react";
function Lia(props) {
  const derniere = useRef(props);
  derniere.current = props;
  useEffect(() => {
    const p = derniere.current;
    const lia = mountLia({
      ...p.container ? { container: p.container } : {},
      ...p.rayon !== void 0 ? { rayon: p.rayon } : {},
      ...p.cle !== void 0 ? { cle: p.cle } : {},
      ...p.vieAutonome !== void 0 ? { vieAutonome: p.vieAutonome } : {},
      ...p.salut !== void 0 ? { salut: p.salut } : {},
      ...p.cibles !== void 0 ? { cibles: p.cibles } : {},
      ...p.silence ? { silence: p.silence } : {},
      ...p.quandMouvementReduit ? { quandMouvementReduit: p.quandMouvementReduit } : {},
      ...p.humeurVisible !== void 0 ? { humeurVisible: p.humeurVisible } : {},
      ...p.etat ? { etat: p.etat } : {},
      ...p.relancesParJour !== void 0 ? { relancesParJour: p.relancesParJour } : {},
      ...p.parolePropre !== void 0 ? { parolePropre: p.parolePropre } : {},
      ...p.onSpontane ? { onSpontane: (m) => derniere.current.onSpontane?.(m) ?? null } : {},
      ...p.elements === false ? { elements: false } : p.elements ? {
        elements: {
          ...p.elements.selecteur !== void 0 ? { selecteur: p.elements.selecteur } : {},
          ...p.elements.decrire ? {
            decrire: (e) => {
              const opts = derniere.current.elements;
              return opts ? opts.decrire?.(e) ?? null : null;
            }
          } : {}
        }
      } : {},
      ...p.monde ? { monde: (m, el) => derniere.current.monde?.(m, el) } : {},
      ...p.entrees ? { entrees: () => derniere.current.entrees?.() ?? {} } : {},
      ...p.bounds ? { bounds: () => derniere.current.bounds?.() ?? { x: 0, y: 0, w: 0, h: 0 } } : {},
      ...p.ask ? {
        ask: (q, signal) => {
          const ask = derniere.current.ask;
          return ask ? ask(q, signal) : Promise.reject(new Error("LIA : ask retir\xE9"));
        }
      } : {},
      get actions() {
        return derniere.current.actions ?? [];
      },
      onChip: (id, contexte) => derniere.current.onChip?.(id, contexte),
      onHumeur: (h) => derniere.current.onHumeur?.(h),
      renderBlocks: (b, dans) => derniere.current.renderBlocks?.(b, dans)
    });
    derniere.current.onPret?.(lia);
    return () => {
      derniere.current.onPret?.(null);
      lia.destroy();
    };
  }, []);
  return null;
}
export {
  Lia
};
//# sourceMappingURL=react.mjs.map