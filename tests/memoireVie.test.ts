import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountLia } from "../src/lia.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const stocke = (cle: string): Record<string, unknown> => JSON.parse(localStorage.getItem(`lia-ui:${cle}`) ?? "{}") as Record<string, unknown>;
const ouvrirMenu = (): void => {
  document
    .querySelector(".lia-ui__hit")
    ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
};
const ligneVie = (): HTMLElement | undefined =>
  [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((b) => /laisser (tranquille|vivre)/.test(b.textContent ?? ""));

beforeEach(() => installerEnvironnement());
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("la vie autonome n'est coupée que par la personne", () => {
  it("une mémoire héritée {vie:false} (v0.5.0 et avant) ne coupe plus sa vie", () => {
    localStorage.setItem("lia-ui:hub", JSON.stringify({ u: 0.4, v: 0.6, vie: false }));
    lia = mountLia({ cle: "hub" });
    ouvrirMenu();
    expect(ligneVie()?.textContent).toBe("La laisser tranquille"); // elle vit
  });

  it("« La laisser tranquille » est mémorisé et relu au montage suivant", () => {
    lia = mountLia({ cle: "hub" });
    ouvrirMenu();
    ligneVie()?.click();
    expect(stocke("hub")["choixVie"]).toBe(false);
    lia.destroy();
    lia = mountLia({ cle: "hub" });
    ouvrirMenu();
    expect(ligneVie()?.textContent).toBe("La laisser vivre");
  });

  it("l'hôte qui coupe sa vie ne l'écrit pas : le montage suivant, sans cette option, la retrouve vivante", () => {
    lia = mountLia({ cle: "hub", vieAutonome: false });
    lia.destroy();
    expect(stocke("hub")["choixVie"]).toBeUndefined();
    lia = mountLia({ cle: "hub" });
    ouvrirMenu();
    expect(ligneVie()?.textContent).toBe("La laisser tranquille");
  });

  it("« fixe » n'écrit rien non plus : revenue en mouvement normal, elle vit", () => {
    installerEnvironnement({ sansMouvement: true });
    lia = mountLia({ cle: "hub", quandMouvementReduit: "fixe" });
    lia.destroy();
    expect(stocke("hub")["choixVie"]).toBeUndefined();
    installerEnvironnement();
    lia = mountLia({ cle: "hub" });
    ouvrirMenu();
    expect(ligneVie()?.textContent).toBe("La laisser tranquille");
  });
});
