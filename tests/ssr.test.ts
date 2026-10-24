// @vitest-environment node
import { describe, expect, it } from "vitest";

describe("rendu serveur : rien ne touche window ni document avant le montage", () => {
  it("importe tout le paquet sous Node sans erreur", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const [index, http, react] = await Promise.all([import("../src/index.js"), import("../src/etat-http.js"), import("../src/react.js")]);
    expect(typeof index.mountLia).toBe("function");
    expect(typeof http.etatHttp).toBe("function");
    expect(react).toBeTruthy();
  });

  it("etatHttp() se crée sous Node (le rendu serveur d'un composant client l'exécute) sans lire window", async () => {
    const { etatHttp } = await import("../src/etat-http.js");
    const hote = etatHttp("/api/lia/etat");
    expect(typeof hote.lire).toBe("function");
    expect(typeof hote.ecrire).toBe("function");
  });
});
