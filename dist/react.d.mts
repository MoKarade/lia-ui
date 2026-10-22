import { O as OptionsLia, L as LiaHandle } from './types-WXmv0giw.mjs';

interface LiaProps extends OptionsLia {
    /** Reçoit la poignée une fois LIA montée (et `null` au démontage). */
    onPret?: (lia: LiaHandle | null) => void;
}
/**
 * LIA pour React / Next.js. Rend `null` : elle vit dans sa propre couche, montée côté navigateur
 * seulement. Les callbacks (`ask`, `actions`, `onChip`…) peuvent changer à chaque rendu sans la remonter ;
 * `container`, `rayon`, `cle` et `vieAutonome` ne sont lus qu'au montage.
 */
declare function Lia(props: LiaProps): null;

export { Lia, type LiaProps };
