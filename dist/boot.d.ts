<<<<<<< HEAD
import { L as LiaHandle, O as OptionsLia } from './types-CDLsYyLx.js';
=======
import { L as LiaHandle, O as OptionsLia } from './types-YGgRDclt.js';
>>>>>>> 1d58b8a (fix: nanobots plus visibles, zone du texte, analyse d'au moins 4,5 s)

/**
 * Monter LIA HORS du rendu de l'app (Marc, 23/10/2026 : « présente tout le temps, même si quelque chose charge, même si une
 * page bug »). À appeler une fois, au chargement d'un module du layout racine (jamais dans un effet ni un composant) : elle
 * se pose dans `document.body` dès qu'il existe, donc avant l'hydratation, hors des écrans de chargement et des error
 * boundaries. Si la page retire sa couche, `mountLia` la remet (veille de 0,5 s). Idempotent : un second appel (rechargement
 * à chaud, deux modules) rend le même démarrage.
 */
interface DemarrageLia {
    /** La LIA montée, ou `null` tant qu'elle n'est pas encore là (page qui charge) ou si le montage a échoué cinq fois. */
    poignee(): LiaHandle | null;
    /** La retire pour de bon (le seul cas où elle quitte la page). */
    arreter(): void;
}
declare function demarrerLia(options?: OptionsLia): DemarrageLia;

export { type DemarrageLia, demarrerLia };
