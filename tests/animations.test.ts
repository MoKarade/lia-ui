import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mountLia } from "../src/lia.js";
import { lireMouvement } from "../src/stockage.js";
import type { LiaHandle, OptionsLia } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;

const monter = (options: OptionsLia = {}): LiaHandle => {
  lia = mountLia({ vieAutonome: false, ...options });
  return lia;
};
const ouvrir = (): void => {
  document
    .querySelector(".lia-ui__hit")
    ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 300, clientY: 300 }));
};
const ligne = (): HTMLElement | null => document.querySelector<HTMLElement>("[role=menuitemcheckbox]");

afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("réglage « Animations complètes »", () => {
  describe("sans réduction demandée par le système", () => {
    beforeEach(() => installerEnvironnement());
    it("la ligne n'existe pas : elle est déjà complète", () => {
      monter();
      ouvrir();
      expect(ligne()).toBeNull();
    });
  });

  describe("avec réduction demandée par le système", () => {
    beforeEach(() => installerEnvironnement({ sansMouvement: true }));

    it("en « fixe » choisi par l'hôte : pas de ligne, une seule image", () => {
      monter({ quandMouvementReduit: "fixe" });
      ouvrir();
      expect(ligne()).toBeNull();
    });

    it("par défaut elle est complète : ligne cochée, la décocher la calme et le mémorise", () => {
      monter();
      ouvrir();
      expect(ligne()?.getAttribute("aria-checked")).toBe("true");
      ligne()?.click();
      expect(lireMouvement("lia")).toBe("doux");
    });

    it("l'hôte qui demande « doux » : ligne décochée ; la cocher la passe en complet, tout de suite et pour la prochaine fois", () => {
      monter({ quandMouvementReduit: "doux" });
      ouvrir();
      expect(ligne()?.getAttribute("aria-checked")).toBe("false");
      ligne()?.click();
      expect(document.querySelector(".lia-ui__menu")).toBeNull();
      expect(lireMouvement("lia")).toBe("complet");
      ouvrir();
      expect(ligne()?.getAttribute("aria-checked")).toBe("true");
    });

    it("le choix mémorisé l'emporte sur l'option de l'hôte au montage suivant", () => {
      monter({ quandMouvementReduit: "doux" });
      ouvrir();
      ligne()?.click();
      lia?.destroy();
      monter({ quandMouvementReduit: "doux" });
      ouvrir();
      expect(ligne()?.getAttribute("aria-checked")).toBe("true");
    });

    it("le choix est propre à chaque clé, et une valeur étrangère est ignorée", () => {
      localStorage.setItem("lia-ui:autre:mouvement", "complet");
      localStorage.setItem("lia-ui:lia:mouvement", "n'importe quoi");
      expect(lireMouvement("lia")).toBeNull();
      expect(lireMouvement("autre")).toBe("complet");
      monter({ quandMouvementReduit: "doux" });
      ouvrir();
      expect(ligne()?.getAttribute("aria-checked")).toBe("false");
    });

    it("en complet, elle se déplace (pas de pose d'un coup) ; décochée, elle reste sur place", () => {
      const h = monter({ quandMouvementReduit: "complet" });
      const cible = document.createElement("section");
      document.body.appendChild(cible);
      expect(h.allerVoir(cible)).toBe(true);
      ouvrir();
      ligne()?.click();
      expect(h.allerVoir(cible)).toBe(true); // toujours possible, mais posée d'un coup
    });
  });
});
