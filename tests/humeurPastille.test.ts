import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountLia } from "../src/lia.js";
import { LIBELLES_HUMEURS, couleurHumeur, libelleHumeur } from "../src/humeurs.js";
import { PROFILS_V9 } from "../src/humeurs.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

let lia: LiaHandle | null = null;
const pastille = (): HTMLElement | null => document.querySelector<HTMLElement>(".lia-ui__etat-humeur");

beforeEach(() => {
  installerEnvironnement({ sansMouvement: false });
});
afterEach(() => {
  lia?.destroy();
  lia = null;
});

describe("pastille d'humeur dessinée par le paquet", () => {
  it("est présente par défaut, sous le corps, avec un libellé et un point de couleur", () => {
    lia = mountLia({});
    const p = pastille();
    expect(p).not.toBeNull();
    expect(p?.closest(".lia-ui__corps")).not.toBeNull();
    expect((p?.textContent ?? "").length).toBeGreaterThan(0);
    expect(p?.style.getPropertyValue("--lia-point")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p?.getAttribute("aria-label")).toMatch(/^Humeur : /);
  });

  it("est absente avec humeurVisible: false", () => {
    lia = mountLia({ humeurVisible: false });
    expect(pastille()).toBeNull();
    expect(lia.humeur().nom.length).toBeGreaterThan(0);
  });

  it("change de libellé et de couleur avec setHumeur (les douze humeurs)", () => {
    lia = mountLia({});
    lia.setHumeur("joyeux");
    expect(pastille()?.textContent).toBe("Joie");
    expect(lia.humeur()).toEqual({ nom: "joyeux", libelle: "joie", couleur: "#E3A23B" });
    lia.setHumeur("inquiet");
    expect(pastille()?.textContent).toBe("Inquiétude");
    expect(pastille()?.style.getPropertyValue("--lia-point")).toBe("#E5675B");
  });

  it("suit l'humeur du réseau interne, y compris celles qui ne sont pas parmi les douze", () => {
    vi.useFakeTimers();
    lia = mountLia({ vieAutonome: false, entrees: () => ({ alerte: 1, nbAlertes: 1, toutVert: 0 }) });
    const avant = lia.humeur().nom;
    vi.advanceTimersByTime(180_000);
    const { nom, libelle } = lia.humeur();
    expect(nom).not.toBe(avant);
    expect(pastille()?.textContent).toBe(libelle.charAt(0).toUpperCase() + libelle.slice(1));
    vi.useRealTimers();
  });

  it("ne met jamais de HTML : le libellé entre par textContent", () => {
    lia = mountLia({});
    expect(pastille()?.querySelector("script,img")).toBeNull();
    expect(pastille()?.children.length).toBe(2);
  });
});

describe("libellés et couleurs", () => {
  it("chaque humeur connue a un libellé et une couleur hexadécimale", () => {
    const noms = [...Object.keys(PROFILS_V9), "neutre", "joyeux", "calme", "curieux", "fatigue", "inquiet", "excite", "triste", "concentre", "espiegle", "fier", "timide"];
    expect(noms.length).toBeGreaterThanOrEqual(40);
    for (const n of noms) {
      expect(libelleHumeur(n).length, n).toBeGreaterThan(0);
      expect(couleurHumeur(n), n).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(Object.keys(LIBELLES_HUMEURS).length).toBeGreaterThanOrEqual(40);
  });

  it("une humeur inconnue garde un gris neutre, jamais une couleur inventée", () => {
    expect(couleurHumeur("zzz")).toBe(couleurHumeur("neutre"));
  });
});
