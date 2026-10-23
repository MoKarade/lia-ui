import { describe, expect, it, vi } from "vitest";
import { etatHttp } from "../src/etat-http.js";
import type { EtatLia } from "../src/etat.js";

const reponse = (status: number, corps?: unknown): Response =>
  ({ status, ok: status >= 200 && status < 300, json: async () => corps }) as Response;
const e = { version: 1, maj: 5 } as unknown as EtatLia;

describe("etatHttp : un fetch de même origine, rien d'autre", () => {
  it("lit en GET sur la même origine, sans cache, avec la session de la page", async () => {
    const f = vi.fn(async () => reponse(200, { a: 1 }));
    const h = etatHttp("/api/lia/etat", { fetch: f as unknown as typeof fetch });
    expect(await h.lire()).toEqual({ a: 1 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${window.location.origin}/api/lia/etat`);
    expect(init).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(init.method).toBeUndefined();
  });

  it("204 et 404 veulent dire « aucun état »", async () => {
    for (const s of [204, 404]) {
      const h = etatHttp("/api/lia/etat", { fetch: (async () => reponse(s)) as unknown as typeof fetch });
      expect(await h.lire()).toBeNull();
    }
  });

  it("une lecture refusée lève, pour que LIA garde son état local", async () => {
    const h = etatHttp("/api/lia/etat", { fetch: (async () => reponse(503)) as unknown as typeof fetch });
    await expect(h.lire()).rejects.toThrow(/HTTP 503/);
  });

  it("écrit en PUT JSON et rend l'état gardé ; un 409 rend l'état plus récent de l'hôte", async () => {
    const f = vi.fn(async () => reponse(200, { gardé: true }));
    const h = etatHttp("/api/lia/etat", { fetch: f as unknown as typeof fetch });
    expect(await h.ecrire(e)).toEqual({ gardé: true });
    const init = (f.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init).toMatchObject({ method: "PUT", credentials: "same-origin", keepalive: true });
    expect(JSON.parse(init.body as string)).toEqual(e);
    const h409 = etatHttp("/api/lia/etat", { fetch: (async () => reponse(409, { plus: "récent" })) as unknown as typeof fetch });
    expect(await h409.ecrire(e)).toEqual({ plus: "récent" });
    const h500 = etatHttp("/api/lia/etat", { fetch: (async () => reponse(500)) as unknown as typeof fetch });
    await expect(h500.ecrire(e)).rejects.toThrow(/HTTP 500/);
  });

  it("refuse une adresse d'un autre site : LIA n'envoie son état à personne d'autre", () => {
    expect(() => etatHttp("https://autre-site.example/api/lia/etat")).toThrow(/même origine/);
    expect(() => etatHttp(`${window.location.origin}/api/lia/etat`)).not.toThrow();
  });
});
