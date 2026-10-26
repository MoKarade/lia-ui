import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bornerDiscussion, DISCUSSION_TEXTE_MAX } from "../src/etat.js";
import { mountLia } from "../src/lia.js";
import { adresseSure, decouperSources, retirerMarqueCoupee } from "../src/sources.js";
import type { LiaHandle } from "../src/types.js";
import { installerEnvironnement } from "./setup.js";

const BASE = "https://hote.example/page";
const A = "https://memoire.example/fait/11111111-1111-1111-1111-111111111111";
const B = "https://memoire.example/fait/22222222-2222-2222-2222-222222222222";

let lia: LiaHandle | null = null;
beforeEach(() => {
  installerEnvironnement();
  document.body.innerHTML = "";
});
afterEach(() => {
  lia?.destroy();
  lia = null;
  vi.restoreAllMocks();
});

describe("decouperSources : les marques sortent du texte", () => {
  it("un texte sans marque reste identique", () => {
    expect(decouperSources("Bonjour, ça va ?", BASE)).toEqual({ texte: "Bonjour, ça va ?", sources: [] });
  });

  it("les marques groupées ou dispersées deviennent une liste dans l'ordre, sans doublon", () => {
    const r = decouperSources(`Tu fais de l'électromécanique [→${A}] [→${B}] et du web [→${A}].`, BASE);
    expect(r.sources).toEqual([A, B]);
    expect(r.texte).toBe("Tu fais de l'électromécanique et du web.");
  });

  it("la marque du papier [↗lien] compte aussi", () => {
    const r = decouperSources(`Ton permis [↗https://drive.example/file/d/abc/view]`, BASE);
    expect(r.sources).toEqual(["https://drive.example/file/d/abc/view"]);
    expect(r.texte).toBe("Ton permis");
  });

  it("une adresse relative se résout sur la page", () => {
    const r = decouperSources("Voilà [→/fait/abc]", BASE);
    expect(r.sources).toEqual(["https://hote.example/fait/abc"]);
  });

  it("une marque dangereuse reste du texte inoffensif, jamais un lien", () => {
    for (const mauvaise of ["javascript:alert(1)", "data:text/html,x", "https://marc:secret@exemple.example/x", "http://exemple.example/clair"]) {
      const r = decouperSources(`Test [→${mauvaise}]`, BASE);
      expect(r.sources).toEqual([]);
      expect(r.texte).toBe(`Test [→${mauvaise}]`);
    }
    expect(adresseSure("http://localhost:3000/x", BASE)).toBe("http://localhost:3000/x");
  });

  it("un texte hostile (des milliers de marques ouvertes) se lit en temps borné", () => {
    for (const hostile of ["[→ ".repeat(20_000), `[→${" ".repeat(60_000)}x`, "[→!".repeat(20_000) + "]"]) {
      const t0 = performance.now();
      const r = decouperSources(hostile, BASE);
      expect(r.sources).toEqual([]);
      expect(performance.now() - t0).toBeLessThan(1500);
    }
  });

  it("une marque coupée par la borne de 600 caractères est retirée", () => {
    expect(retirerMarqueCoupee("Une phrase [→https://memoire.example/fa")).toBe("Une phrase");
    expect(retirerMarqueCoupee("Rien de coupé")).toBe("Rien de coupé");
    const long = `${"a".repeat(DISCUSSION_TEXTE_MAX - 10)} [→${A}]`;
    const [m] = bornerDiscussion([{ de: "lia", texte: long }]);
    expect(m?.texte.includes("[→")).toBe(false);
    expect(m?.texte.length).toBeLessThanOrEqual(DISCUSSION_TEXTE_MAX);
  });
});

describe("la discussion : une ligne « Sources » cliquable sous le message", () => {
  const envoyer = async (reponse: string): Promise<HTMLElement> => {
    lia = mountLia({ vieAutonome: false, ask: () => Promise.resolve({ text: reponse }) });
    lia.ouvrirChat();
    (document.querySelector(".lia-ui__champ") as HTMLInputElement).value = "Scrum ?";
    (document.querySelector(".lia-ui__form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect(document.querySelectorAll(".lia-ui__msg--lia").length).toBe(1));
    return document.querySelector(".lia-ui__msg--lia") as HTMLElement;
  };

  it("les marques disparaissent du texte et deviennent deux liens sûrs", async () => {
    const m = await envoyer(`Pas de Scrum dans ton profil [→${A}] [→${B}].`);
    expect(m.textContent).not.toContain("[→");
    expect(m.firstChild?.textContent).toBe("Pas de Scrum dans ton profil.");
    const liens = [...m.querySelectorAll<HTMLAnchorElement>(".lia-ui__source")];
    expect(liens.map((a) => a.href)).toEqual([A, B]);
    for (const a of liens) {
      expect(a.target).toBe("_blank");
      expect(a.rel).toBe("noopener noreferrer");
    }
    expect(liens[0]?.getAttribute("aria-label")).toBe("Source 1");
    expect(m.querySelector(".lia-ui__sources-titre")?.textContent).toBe("Sources");
  });

  it("une seule source dit « Source » ; une réponse sans marque n'a pas de ligne", async () => {
    const m = await envoyer(`Oui [→${A}]`);
    expect(m.querySelector(".lia-ui__sources-titre")?.textContent).toBe("Source");
    lia?.destroy();
    document.body.innerHTML = "";
    sessionStorage.clear();
    const m2 = await envoyer("Juste du texte.");
    expect(m2.querySelector(".lia-ui__sources")).toBeNull();
  });

  it("un HTML dans le texte du modèle reste du texte", async () => {
    const m = await envoyer(`<img src=x onerror=alert(1)> [→${A}]`);
    expect(m.querySelector("img")).toBeNull();
    expect(m.firstChild?.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});
