import { describe, expect, it, vi } from "vitest";
import { decider, executer, versionDeContenu, type Api } from "../scripts/poser-tag.mjs";

const contenu = (version: unknown) => ({ status: 200, json: { content: Buffer.from(JSON.stringify({ name: "x", version })).toString("base64") } });
const SHA = "a".repeat(40);
const AVANT = "b".repeat(40);

/** Une API factice : `routes` dit quoi répondre à chaque « METHODE chemin » ; tout appel imprévu fait échouer le test. */
function fausseApi(routes: Record<string, { status: number; json?: unknown } | Array<{ status: number; json?: unknown }>>) {
  const appels: string[] = [];
  const api: Api = vi.fn(async (methode, chemin) => {
    const cle = `${methode} ${chemin}`;
    appels.push(cle);
    const r = routes[cle];
    if (!r) throw new Error(`appel imprévu : ${cle}`);
    const reponse = Array.isArray(r) ? r.shift()! : r;
    return { status: reponse.status, json: reponse.json ?? null };
  });
  return { api, appels };
}
const dep = "MoKarade/lia-ui";
const lire = (ref: string) => `GET /repos/${dep}/contents/package.json?ref=${ref}`;
const refTag = (tag: string) => `GET /repos/${dep}/git/ref/tags/${tag}`;

describe("decider", () => {
  it("version changée et tag absent : pose le tag vX.Y.Z", () => {
    expect(decider({ avant: "0.43.0", apres: "0.44.0", tagExiste: false })).toEqual({ action: "poser", tag: "v0.44.0" });
  });
  it("version inchangée : rien", () => {
    expect(decider({ avant: "0.44.0", apres: "0.44.0", tagExiste: false }).action).toBe("rien");
  });
  it("tag déjà là : rien, jamais déplacé", () => {
    const d = decider({ avant: "0.43.0", apres: "0.44.0", tagExiste: true });
    expect(d).toMatchObject({ action: "rien" });
    expect((d as { raison: string }).raison).toMatch(/jamais déplacé/);
  });
  it("commit précédent illisible : rien", () => {
    expect(decider({ avant: null, apres: "0.44.0", tagExiste: false }).action).toBe("rien");
  });
  it("forme invalide : refus", () => {
    for (const mauvais of ["0.44", "v0.44.0", "0.44.0-beta.1", "0.44.0 && rm -rf /", "../0.44.0", "", undefined, 44]) {
      expect(() => decider({ avant: "0.43.0", apres: mauvais, tagExiste: false }), String(mauvais)).toThrow(/non conforme/);
    }
  });
});

describe("versionDeContenu", () => {
  it("lit la version, sinon null", () => {
    expect(versionDeContenu(contenu("0.44.0").json)).toBe("0.44.0");
    expect(versionDeContenu({ content: Buffer.from("pas du json").toString("base64") })).toBeNull();
    expect(versionDeContenu(contenu(5).json)).toBeNull();
    expect(versionDeContenu(null)).toBeNull();
  });
});

describe("executer", () => {
  it("version changée : crée l'objet du tag annoté puis la référence, sur le commit poussé", async () => {
    const { api, appels } = fausseApi({
      [lire(SHA)]: contenu("0.44.0"),
      [lire(AVANT)]: contenu("0.43.0"),
      [refTag("v0.44.0")]: { status: 404 },
      [`POST /repos/${dep}/git/tags`]: { status: 201, json: { sha: "c".repeat(40) } },
      [`POST /repos/${dep}/git/refs`]: { status: 201 },
    });
    const journal = await executer({ api, depot: dep, sha: SHA, avantSha: AVANT });
    expect(journal).toEqual([`tag annoté v0.44.0 posé sur ${SHA}`]);
    expect(appels.slice(-2)).toEqual([`POST /repos/${dep}/git/tags`, `POST /repos/${dep}/git/refs`]);
    const posts = vi.mocked(api).mock.calls.filter((c) => c[0] === "POST");
    expect(posts[0]![2]).toMatchObject({ tag: "v0.44.0", object: SHA, type: "commit", message: "lia-ui v0.44.0" });
    expect(posts[1]![2]).toEqual({ ref: "refs/tags/v0.44.0", sha: "c".repeat(40) });
  });

  it("version inchangée : aucune écriture", async () => {
    const { api, appels } = fausseApi({
      [lire(SHA)]: contenu("0.44.0"),
      [lire(AVANT)]: contenu("0.44.0"),
      [refTag("v0.44.0")]: { status: 200 },
    });
    const journal = await executer({ api, depot: dep, sha: SHA, avantSha: AVANT });
    expect(journal[0]).toMatch(/inchangée|existe déjà/);
    expect(appels.some((a) => a.startsWith("POST"))).toBe(false);
  });

  it("tag déjà là malgré une version changée : aucune écriture, le tag n'est jamais déplacé", async () => {
    const { api, appels } = fausseApi({
      [lire(SHA)]: contenu("0.44.0"),
      [lire(AVANT)]: contenu("0.43.0"),
      [refTag("v0.44.0")]: { status: 200 },
    });
    const journal = await executer({ api, depot: dep, sha: SHA, avantSha: AVANT });
    expect(journal[0]).toMatch(/jamais déplacé/);
    expect(appels.some((a) => a.startsWith("POST") || a.startsWith("PATCH") || a.startsWith("DELETE"))).toBe(false);
  });

  it("premier push (commit précédent nul) : rien n'est posé", async () => {
    const { api, appels } = fausseApi({ [lire(SHA)]: contenu("0.44.0"), [refTag("v0.44.0")]: { status: 404 } });
    const journal = await executer({ api, depot: dep, sha: SHA, avantSha: "0".repeat(40) });
    expect(journal[0]).toMatch(/illisible/);
    expect(appels.some((a) => a.startsWith("POST"))).toBe(false);
  });

  it("course : la référence existe déjà (422) : succès sans rien déplacer", async () => {
    const { api } = fausseApi({
      [lire(SHA)]: contenu("0.44.0"),
      [lire(AVANT)]: contenu("0.43.0"),
      [refTag("v0.44.0")]: [{ status: 404 }, { status: 200 }],
      [`POST /repos/${dep}/git/tags`]: { status: 201, json: { sha: "c".repeat(40) } },
      [`POST /repos/${dep}/git/refs`]: { status: 422 },
    });
    const journal = await executer({ api, depot: dep, sha: SHA, avantSha: AVANT });
    expect(journal[0]).toMatch(/existe déjà/);
  });

  it("une erreur inattendue de l'API fait échouer le job (jamais un tag à moitié posé en silence)", async () => {
    const base = { [lire(SHA)]: contenu("0.44.0"), [lire(AVANT)]: contenu("0.43.0"), [refTag("v0.44.0")]: { status: 404 } };
    await expect(
      executer({ api: fausseApi({ ...base, [`POST /repos/${dep}/git/tags`]: { status: 403 } }).api, depot: dep, sha: SHA, avantSha: AVANT }),
    ).rejects.toThrow(/HTTP 403/);
    await expect(
      executer({
        api: fausseApi({ ...base, [`POST /repos/${dep}/git/tags`]: { status: 201, json: { sha: "c".repeat(40) } }, [`POST /repos/${dep}/git/refs`]: { status: 403 } }).api,
        depot: dep,
        sha: SHA,
        avantSha: AVANT,
      }),
    ).rejects.toThrow(/HTTP 403/);
    await expect(executer({ api: fausseApi({ [lire(SHA)]: { status: 404 }, [lire(AVANT)]: contenu("0.43.0") }).api, depot: dep, sha: SHA, avantSha: AVANT })).rejects.toThrow(/illisible/);
  });

  it("version non conforme au commit poussé : refus, rien n'est créé", async () => {
    const { api, appels } = fausseApi({ [lire(SHA)]: contenu("0.44"), [lire(AVANT)]: contenu("0.43.0") });
    await expect(executer({ api, depot: dep, sha: SHA, avantSha: AVANT })).rejects.toThrow(/non conforme/);
    expect(appels.some((a) => a.startsWith("POST"))).toBe(false);
  });

  it("le script ne contient aucun appel qui déplace ou supprime une référence", async () => {
    const { readFileSync } = await import("node:fs");
    const code = readFileSync("scripts/poser-tag.mjs", "utf8").replace(/\/\/[^\n]*/g, "");
    expect(code).not.toMatch(/"(PATCH|DELETE|PUT)"/);
    expect(code).not.toMatch(/force/i);
  });
});
