// scripts/poser-tag.mjs — pose le tag annoté vX.Y.Z quand la version de package.json change sur main.
//
// Lancé par `.github/workflows/tag.yml` à chaque push sur main, avec le GITHUB_TOKEN du job (contents: write).
// Les apps épinglent `github:MoKarade/lia-ui#vX.Y.Z` : sans ce tag, une version fusionnée reste inutilisable.
//
// Règles (Marc, 28/10/2026 : « automatique ») :
//  - le tag n'est posé que si la version CHANGE entre le commit précédent du push et le commit poussé ;
//  - un tag qui existe déjà n'est JAMAIS déplacé ni refait : le script le dit et ne fait rien ;
//  - une version qui n'a pas la forme X.Y.Z est refusée (rien n'est créé) ;
//  - tout passe par l'API REST (pas de checkout avec jeton, pas de `git push`, donc aucun force-push possible).
//
// La décision est PURE (`decider`), les appels sont injectés (`api`) : testé dans tests/poserTag.test.ts.

import { pathToFileURL } from "node:url";

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA_NUL = /^0+$/;

/** Ce que le script fait, selon les versions avant/après et l'existence du tag. PURE. */
export function decider({ avant, apres, tagExiste }) {
  if (typeof apres !== "string" || !SEMVER.test(apres)) {
    throw new Error(`version non conforme dans package.json : « ${String(apres)} » (attendu X.Y.Z)`);
  }
  if (avant === null) return { action: "rien", raison: "version du commit précédent illisible : rien n'est posé" };
  if (avant === apres) return { action: "rien", raison: `version inchangée (${apres})` };
  if (tagExiste) return { action: "rien", raison: `le tag v${apres} existe déjà : il n'est jamais déplacé` };
  return { action: "poser", tag: `v${apres}` };
}

/** Version d'un package.json lu en base64 par l'API des contenus, ou `null` quand elle ne se lit pas. */
export function versionDeContenu(reponse) {
  try {
    const texte = Buffer.from(String(reponse?.content ?? ""), "base64").toString("utf8");
    const version = JSON.parse(texte).version;
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

/**
 * `api(methode, chemin, corps?)` rend `{ status, json }`. Rend les lignes à afficher ; lève sur toute erreur inattendue
 * (le job devient rouge, jamais un tag à moitié posé en silence).
 */
export async function executer({ api, depot, sha, avantSha }) {
  const journal = [];
  const lireVersion = async (ref) => {
    const r = await api("GET", `/repos/${depot}/contents/package.json?ref=${ref}`);
    return r.status === 200 ? versionDeContenu(r.json) : null;
  };
  const apres = await lireVersion(sha);
  const avant = avantSha && !SHA_NUL.test(avantSha) ? await lireVersion(avantSha) : null;
  if (apres === null) throw new Error("package.json illisible au commit poussé");

  const existe = async (tag) => {
    const r = await api("GET", `/repos/${depot}/git/ref/tags/${tag}`);
    if (r.status === 200) return true;
    if (r.status === 404) return false;
    throw new Error(`lecture du tag ${tag} : HTTP ${r.status}`);
  };
  const tagExiste = SEMVER.test(apres) ? await existe(`v${apres}`) : false;

  const choix = decider({ avant, apres, tagExiste });
  if (choix.action === "rien") {
    journal.push(choix.raison);
    return journal;
  }

  const objet = await api("POST", `/repos/${depot}/git/tags`, {
    tag: choix.tag,
    message: `lia-ui ${choix.tag}`,
    object: sha,
    type: "commit",
    tagger: {
      name: "github-actions[bot]",
      email: "41898282+github-actions[bot]@users.noreply.github.com",
      date: new Date().toISOString(),
    },
  });
  if (objet.status !== 201) throw new Error(`création de l'objet du tag ${choix.tag} : HTTP ${objet.status}`);

  const ref = await api("POST", `/repos/${depot}/git/refs`, { ref: `refs/tags/${choix.tag}`, sha: objet.json.sha });
  if (ref.status === 201) {
    journal.push(`tag annoté ${choix.tag} posé sur ${sha}`);
    return journal;
  }
  // Une course (deux pushes d'affilée) : la référence existe déjà. On ne la touche pas.
  if (ref.status === 422 && (await existe(choix.tag))) {
    journal.push(`le tag ${choix.tag} existe déjà : il n'est jamais déplacé`);
    return journal;
  }
  throw new Error(`création de la référence ${choix.tag} : HTTP ${ref.status}`);
}

async function principal() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA, AVANT_SHA } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SHA) throw new Error("GITHUB_TOKEN, GITHUB_REPOSITORY et GITHUB_SHA sont requis");
  const api = async (methode, chemin, corps) => {
    const reponse = await fetch(`https://api.github.com${chemin}`, {
      method: methode,
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(corps ? { "content-type": "application/json" } : {}),
      },
      ...(corps ? { body: JSON.stringify(corps) } : {}),
    });
    return { status: reponse.status, json: await reponse.json().catch(() => null) };
  };
  for (const ligne of await executer({ api, depot: GITHUB_REPOSITORY, sha: GITHUB_SHA, avantSha: AVANT_SHA })) console.log(ligne);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((e) => {
    console.error(`::error::${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
