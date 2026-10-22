/**
 * Les 22 formes. Chaque fonction reçoit un bloc DÉJÀ objet et rend son dessin, ou `null` si sa
 * forme ne tient pas : alors rien n'est dessiné (jamais de valeur inventée pour combler).
 */

import { arc, avecUnite, h, jour, ligneBarre, nombre, s, serie, texteSvg, toile } from "./dom.js";
import { estNombre, estTexte, forme, heure, libelle, lienSur, liste, minutes, type Obj } from "./garde.js";

export interface OptionsFormes {
  /** Reçoit l'action d'une `confirmation` quand Marc confirme. Absent : la carte n'a pas de bouton. */
  onConfirmer?: (action: { id: string; niveau: 1 | 2 | 3 }) => void;
}

type Forme = (b: Obj, o: OptionsFormes) => Node | null;
const unite = (b: Obj): string | undefined => (estTexte(b.unite, 16) ? b.unite : undefined);
const optLib = (v: unknown): boolean => v === undefined || libelle(v);
const date = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && v.length <= 40;
const LT = { libelle, valeur: estNombre };

const carte: Forme = (b) => {
  const pts = liste(b.points, forme<{ lat: number; lon: number; libelle: string }>({ lat: (v) => estNombre(v) && Math.abs(v) <= 90, lon: (v) => estNombre(v) && Math.abs(v) <= 180, libelle }, { quand: date }), 1, 50);
  if (!pts) return null;
  const etendue = (k: "lat" | "lon") => { const v = pts.map((p) => p[k]); const min = Math.min(...v); return { min, d: Math.max(Math.max(...v) - min, 0.01) }; };
  const la = etendue("lat"), lo = etendue("lon"), W = 320, H = 180;
  const xy = (p: { lat: number; lon: number }) => [20 + ((p.lon - lo.min) / lo.d) * (W - 40), H - 20 - ((p.lat - la.min) / la.d) * (H - 40)] as const;
  const t = toile(W, H, `Plan schématique de ${pts.length} lieu(x)`);
  if (pts.length > 1) t.append(s("polyline", { points: pts.map((p) => xy(p).join(",")).join(" "), fill: "none", "stroke-width": 2, "stroke-dasharray": "5 5" }, { stroke: "var(--lia-soft)" }));
  pts.forEach((p, i) => { const [x, y] = xy(p); t.append(s("circle", { cx: x, cy: y, r: 9 }, { fill: "var(--lia-accent)" }), texteSvg(x, y + 4, String(i + 1), "lia-bloc__etiq lia-bloc__etiq--sur")); });
  const ol = h("ol", "lia-bloc__legende");
  for (const p of pts) ol.append(h("li", undefined, p.libelle));
  return frag(t, ol);
};

const chrono: Forme = (b) => {
  const ev = liste(b.evenements, forme<{ date: string; libelle: string }>({ date, libelle }), 1, 30);
  if (!ev || (b.actuel !== undefined && !(Number.isInteger(b.actuel) && (b.actuel as number) >= 0 && (b.actuel as number) < ev.length))) return null;
  const ol = h("ol", "lia-bloc__frise");
  ev.forEach((e, i) => {
    const li = h("li", i === b.actuel ? "lia-bloc__etape lia-bloc__etape--actuel" : "lia-bloc__etape");
    if (i === b.actuel) li.setAttribute("aria-current", "step");
    li.append(h("time", undefined, jour(e.date)), h("span", undefined, e.libelle));
    ol.append(li);
  });
  return ol;
};

const listeForme: Forme = (b) => {
  const el = liste(b.elements, forme<{ libelle: string; fait?: boolean }>({ libelle: estTexte }, { fait: (v) => typeof v === "boolean" }), 1, 30);
  if (!el) return null;
  const ul = h("ul", "lia-bloc__cases");
  for (const e of el) {
    const li = h("li", e.fait ? "lia-bloc__case lia-bloc__case--fait" : "lia-bloc__case");
    li.append(h("span", "lia-bloc__cache", e.fait ? "Fait : " : "À faire : "), h("span", undefined, e.libelle));
    ul.append(li);
  }
  return ul;
};

const chat: Forme = (b) => {
  const ms = liste(b.messages, forme<{ de: string; texte: string; quand?: string }>({ de: libelle, texte: estTexte }, { quand: date }), 1, 20);
  if (!ms) return null;
  const d = h("div", "lia-bloc__fil");
  for (const m of ms) {
    const p = h("div", "lia-bloc__bulle");
    p.append(h("b", undefined, m.de));
    if (m.quand) p.append(h("time", undefined, jour(m.quand)));
    p.append(h("p", undefined, m.texte));
    d.append(p);
  }
  return d;
};

const courbe: Forme = (b) => {
  const pt = forme<{ x: string; y: number }>({ x: libelle, y: estNombre });
  const se = liste(b.series, forme<{ nom: string; points: { x: string; y: number }[] }>({ nom: libelle, points: (v) => liste(v, pt, 2, 366) !== null }), 1, 4);
  if (!se) return null;
  const ys = se.flatMap((x) => x.points.map((p) => p.y)), min = Math.min(...ys), d = Math.max(Math.max(...ys) - min, 1e-9);
  const W = 320, H = 160, u = unite(b);
  const t = toile(W, H, se.map((x) => `${x.nom} : de ${avecUnite(x.points[0]!.y, u)} à ${avecUnite(x.points[x.points.length - 1]!.y, u)}`).join(" ; "));
  t.append(s("path", { d: `M28 8V${H - 22}H${W - 8}`, fill: "none" }, { stroke: "var(--lia-border)" }));
  t.append(texteSvg(24, 14, nombre(min + d), "lia-bloc__etiq", "end"), texteSvg(24, H - 22, nombre(min), "lia-bloc__etiq", "end"));
  se.forEach((x, i) => {
    const n = x.points.length, X = (k: number) => 32 + ((W - 44) * k) / (n - 1), Y = (y: number) => H - 26 - ((y - min) / d) * (H - 40);
    t.append(s("path", { d: "M" + x.points.map((p, k) => `${X(k).toFixed(1)} ${Y(p.y).toFixed(1)}`).join("L"), fill: "none", "stroke-width": 2.4, "stroke-linejoin": "round" }, { stroke: serie(i) }));
  });
  const p0 = se[0]!.points;
  t.append(texteSvg(32, H - 6, p0[0]!.x, "lia-bloc__etiq", "start"), texteSvg(W - 8, H - 6, p0[p0.length - 1]!.x, "lia-bloc__etiq", "end"));
  return frag(t, legende(se.map((x, i) => [x.nom, serie(i)])));
};

const barres: Forme = (b) => {
  const br = liste(b.barres, forme<{ libelle: string; valeur: number }>(LT), 1, 30);
  if (!br) return null;
  const max = Math.max(...br.map((x) => Math.abs(x.valeur)), 1e-9), u = unite(b);
  return frag(...br.map((x) => ligneBarre(x.libelle, Math.abs(x.valeur) / max, avecUnite(x.valeur, u), x.valeur < 0 ? "var(--lia-danger)" : undefined)));
};

const camembert: Forme = (b) => {
  const pa = liste(b.parts, forme<{ libelle: string; valeur: number }>({ libelle, valeur: (v) => estNombre(v) && v >= 0 }), 2, 12);
  const total = pa?.reduce((a, x) => a + x.valeur, 0) ?? 0;
  if (!pa || total <= 0) return null;
  const C = 2 * Math.PI * 40, u = unite(b);
  const t = toile(120, 120, pa.map((x) => `${x.libelle} ${Math.round((x.valeur / total) * 100)} %`).join(", "));
  let o = 0;
  pa.forEach((x, i) => {
    const l = (x.valeur / total) * C;
    t.append(s("circle", { cx: 60, cy: 60, r: 40, fill: "none", "stroke-width": 22, "stroke-dasharray": `${l} ${C - l}`, "stroke-dashoffset": -o, transform: "rotate(-90 60 60)" }, { stroke: serie(i) }));
    o += l;
  });
  return frag(t, legende(pa.map((x, i) => [`${x.libelle} : ${avecUnite(x.valeur, u)} (${Math.round((x.valeur / total) * 100)} %)`, serie(i)])));
};

const jauge: Forme = (b) => {
  const { valeur: v, min, max } = b;
  if (!libelle(b.libelle) || !estNombre(v) || !estNombre(min) || !estNombre(max) || !(min < max) || v < min || v > max) return null;
  const u = unite(b), part = (v - min) / (max - min);
  const t = toile(200, 112, `${b.libelle} : ${avecUnite(v, u)} sur ${avecUnite(max, u)}`);
  t.append(s("path", { d: arc(100, 96, 72, Math.PI, 2 * Math.PI), fill: "none", "stroke-width": 16, "stroke-linecap": "round" }, { stroke: "var(--lia-surface-2)" }));
  if (part > 0) t.append(s("path", { d: arc(100, 96, 72, Math.PI, Math.PI + Math.PI * part), fill: "none", "stroke-width": 16, "stroke-linecap": "round" }, { stroke: "var(--lia-accent)" }));
  t.append(texteSvg(100, 92, avecUnite(v, u), "lia-bloc__grand"));
  return frag(t, h("p", "lia-bloc__sous", b.libelle));
};

const chiffre: Forme = (b) => {
  if (!libelle(b.libelle) || !estNombre(b.valeur) || (b.variation !== undefined && !estNombre(b.variation))) return null;
  const d = h("div", "lia-bloc__chiffre");
  d.append(h("span", "lia-bloc__grand", avecUnite(b.valeur, unite(b))), h("span", "lia-bloc__sous", b.libelle));
  if (estNombre(b.variation)) d.append(h("span", b.variation < 0 ? "lia-bloc__var lia-bloc__var--bas" : "lia-bloc__var", `${b.variation > 0 ? "+" : ""}${avecUnite(b.variation, unite(b))}`));
  return d;
};

const tableau: Forme = (b) => {
  const col = liste(b.colonnes, libelle, 1, 8);
  const lig = col && liste(b.lignes, (l): l is string[] => liste(l, (c): c is string => typeof c === "string" && c.length <= 200, col.length, col.length) !== null, 1, 50);
  if (!col || !lig) return null;
  const tb = h("table", "lia-bloc__table"), tr = h("tr");
  for (const c of col) { const th = h("th", undefined, c); th.scope = "col"; tr.append(th); }
  const tbody = h("tbody");
  for (const l of lig) { const r = h("tr"); for (const c of l) r.append(h("td", undefined, c)); tbody.append(r); }
  tb.append(h("thead"), tbody);
  tb.tHead!.append(tr);
  return defile(tb);
};

const calendrier: Forme = (b) => {
  const js = liste(b.jours, forme<{ date: string; libelle?: string; intensite?: number }>({ date }, { libelle, intensite: (v) => estNombre(v) && v >= 0 && v <= 1 }), 1, 62);
  if (!js) return null;
  const ul = h("ul", "lia-bloc__jours");
  for (const j of js) {
    const li = h("li", "lia-bloc__jour");
    li.style.setProperty("--i", String(j.intensite ?? 0));
    li.append(h("time", undefined, jour(j.date)));
    if (j.libelle) li.append(h("span", undefined, j.libelle));
    ul.append(li);
  }
  return ul;
};

const reseau: Forme = (b) => {
  const no = liste(b.noeuds, forme<{ id: string; libelle: string }>({ id: (v) => estTexte(v, 40), libelle }), 2, 60);
  const ids = new Map(no?.map((n, i) => [n.id, i]));
  const li = liste(b.liens, forme<{ a: string; b: string }>({ a: (v) => typeof v === "string" && ids.has(v), b: (v) => typeof v === "string" && ids.has(v) }), 0, 200);
  if (!no || !li || ids.size !== no.length) return null;
  const W = 320, H = 220, R = 78, pos = no.map((_, i) => [W / 2 + R * 1.3 * Math.cos((2 * Math.PI * i) / no.length - Math.PI / 2), H / 2 + R * Math.sin((2 * Math.PI * i) / no.length - Math.PI / 2)] as const);
  const t = toile(W, H, `Réseau de ${no.length} éléments et ${li.length} liens`);
  for (const l of li) { const [a, c] = [pos[ids.get(l.a)!]!, pos[ids.get(l.b)!]!]; t.append(s("line", { x1: a[0], y1: a[1], x2: c[0], y2: c[1], "stroke-width": 1.4 }, { stroke: "var(--lia-border)" })); }
  no.forEach((n, i) => { const [x, y] = pos[i]!; t.append(s("circle", { cx: x, cy: y, r: 6 }, { fill: "var(--lia-accent)" }), texteSvg(x, y > H / 2 ? y + 18 : y - 10, n.libelle)); });
  return t;
};

const comparaison: Forme = (b) => {
  const cle = forme<{ cle: string; valeur: string }>({ cle: libelle, valeur: estTexte });
  const co = liste(b.colonnes, forme<{ libelle: string; lignes: { cle: string; valeur: string }[] }>({ libelle, lignes: (v) => liste(v, cle, 1, 20) !== null }), 2, 4);
  if (!co) return null;
  const g = h("div", "lia-bloc__colonnes");
  for (const c of co) {
    const d = h("div", "lia-bloc__col"), dl = h("dl");
    for (const l of c.lignes) dl.append(h("dt", undefined, l.cle), h("dd", undefined, l.valeur));
    d.append(h("h4", undefined, c.libelle), dl);
    g.append(d);
  }
  return g;
};

const radar: Forme = (b) => {
  const ax = liste(b.axes, libelle, 3, 10);
  const se = ax && liste(b.series, forme<{ nom: string; valeurs: number[] }>({ nom: libelle, valeurs: (v) => liste(v, estNombre, ax.length, ax.length) !== null }), 1, 3);
  if (!ax || !se) return null;
  const vs = se.flatMap((x) => x.valeurs), min = Math.min(0, ...vs), d = Math.max(Math.max(...vs) - min, 1e-9);
  const pt = (i: number, r: number) => `${(160 + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / ax.length)).toFixed(1)} ${(110 + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / ax.length)).toFixed(1)}`;
  const t = toile(320, 220, se.map((x) => `${x.nom} : ${ax.map((a, i) => `${a} ${nombre(x.valeurs[i]!)}`).join(", ")}`).join(" ; "));
  t.append(s("path", { d: "M" + ax.map((_, i) => pt(i, 80)).join("L") + "Z", fill: "none" }, { stroke: "var(--lia-border)" }));
  ax.forEach((a, i) => { const [x, y] = pt(i, 98).split(" ").map(Number); t.append(texteSvg(x!, y! + 4, a)); });
  se.forEach((x, k) => t.append(s("path", { d: "M" + x.valeurs.map((v, i) => pt(i, ((v - min) / d) * 80)).join("L") + "Z", "fill-opacity": 0.2, "stroke-width": 2 }, { fill: serie(k), stroke: serie(k) })));
  return frag(t, legende(se.map((x, i) => [x.nom, serie(i)])));
};

const entonnoir: Forme = (b) => {
  const et = liste(b.etapes, forme<{ libelle: string; valeur: number }>({ libelle, valeur: (v) => estNombre(v) && v >= 0 }), 2, 8);
  if (!et) return null;
  const max = Math.max(...et.map((x) => x.valeur), 1e-9), p = et[0]!.valeur;
  return frag(...et.map((x) => ligneBarre(x.libelle, x.valeur / max, p > 0 ? `${nombre(x.valeur)} (${Math.round((x.valeur / p) * 100)} %)` : nombre(x.valeur))));
};

const flux: Forme = (b) => {
  const li = liste(b.liens, forme<{ de: string; vers: string; valeur: number }>({ de: libelle, vers: libelle, valeur: (v) => estNombre(v) && v > 0 }), 1, 30);
  if (!li) return null;
  const max = Math.max(...li.map((x) => x.valeur)), u = unite(b);
  return frag(...li.map((x) => ligneBarre(`${x.de} → ${x.vers}`, x.valeur / max, avecUnite(x.valeur, u))));
};

const heatmap: Forme = (b) => {
  const lg = liste(b.lignes, libelle, 1, 31), co = liste(b.colonnes, libelle, 1, 31);
  const va = lg && co && liste(b.valeurs, (r): r is number[] => liste(r, estNombre, co.length, co.length) !== null, lg.length, lg.length);
  if (!lg || !co || !va) return null;
  const tout = va.flat(), min = Math.min(...tout), d = Math.max(Math.max(...tout) - min, 1e-9);
  const tb = h("table", "lia-bloc__table lia-bloc__chaleur"), tr = h("tr");
  tr.append(h("td"));
  for (const c of co) { const th = h("th", undefined, c); th.scope = "col"; tr.append(th); }
  tb.append(tr);
  lg.forEach((l, i) => {
    const r = h("tr"), th = h("th", undefined, l);
    th.scope = "row";
    r.append(th);
    for (const v of va[i]!) { const td = h("td", undefined, nombre(v)); td.style.setProperty("--i", String((v - min) / d)); r.append(td); }
    tb.append(r);
  });
  return defile(tb);
};

const kanban: Forme = (b) => {
  const co = liste(b.colonnes, forme<{ libelle: string; cartes: string[] }>({ libelle, cartes: (v) => liste(v, estTexte, 0, 20) !== null }), 2, 6);
  if (!co) return null;
  const g = h("div", "lia-bloc__colonnes");
  for (const c of co) {
    const d = h("div", "lia-bloc__col"), ul = h("ul");
    for (const x of c.cartes) ul.append(h("li", "lia-bloc__carte", x));
    d.append(h("h4", undefined, `${c.libelle} (${c.cartes.length})`), ul);
    g.append(d);
  }
  return g;
};

interface Noeud { libelle: string; enfants?: Noeud[] }
const arbre: Forme = (b) => {
  let n = 0;
  const ok = (v: unknown, prof: number): v is Noeud =>
    prof <= 4 && ++n <= 60 && forme<Noeud & Obj>({ libelle }, { enfants: (e) => Array.isArray(e) && e.length <= 12 && e.every((x) => ok(x, prof + 1)) })(v);
  if (!ok(b.racine, 1)) return null;
  const rendre = (x: Noeud): HTMLElement => {
    const li = h("li", undefined);
    li.append(h("span", undefined, x.libelle));
    if (x.enfants?.length) { const ul = h("ul"); for (const e of x.enfants) ul.append(rendre(e)); li.append(ul); }
    return li;
  };
  const ul = h("ul", "lia-bloc__arbre");
  ul.append(rendre(b.racine));
  return ul;
};

const documentForme: Forme = (b) => {
  const lien = b.lien === undefined ? null : lienSur(b.lien);
  if (!libelle(b.libelle) || !optLib(b.emetteur) || (b.date !== undefined && !date(b.date)) || (b.lien !== undefined && !lien)) return null;
  const d = h("div", "lia-bloc__doc");
  d.append(h("b", undefined, b.libelle));
  const meta = [b.emetteur, b.date ? jour(b.date as string) : undefined].filter((x): x is string => typeof x === "string");
  if (meta.length) d.append(h("span", "lia-bloc__sous", meta.join(", ")));
  if (lien) { const a = h("a", "lia-bloc__lien", "Ouvrir le papier"); a.href = lien; a.target = "_blank"; a.rel = "noopener noreferrer"; d.append(a); }
  return d;
};

const cadran: Forme = (b) => {
  const se = liste(b.segments, forme<{ debut: string; fin: string; libelle: string }>({ debut: heure, fin: heure, libelle }), 1, 24);
  if (!se || (b.maintenant !== undefined && !heure(b.maintenant))) return null;
  const ang = (m: number) => -Math.PI / 2 + (m / 1440) * 2 * Math.PI;
  const t = toile(240, 220, se.map((x) => `${x.libelle} de ${x.debut} à ${x.fin}`).join(", "));
  t.append(s("circle", { cx: 120, cy: 110, r: 70, fill: "none", "stroke-width": 18 }, { stroke: "var(--lia-surface-2)" }));
  se.forEach((x, i) => { const a = minutes(x.debut), f = minutes(x.fin) + (minutes(x.fin) <= a ? 1440 : 0); t.append(s("path", { d: arc(120, 110, 70, ang(a), ang(f)), fill: "none", "stroke-width": 18 }, { stroke: serie(i) })); });
  for (const [hh, lib] of [[0, "0 h"], [360, "6 h"], [720, "12 h"], [1080, "18 h"]] as const) t.append(texteSvg(120 + 102 * Math.cos(ang(hh)), 114 + 94 * Math.sin(ang(hh)), lib));
  if (typeof b.maintenant === "string") { const a = ang(minutes(b.maintenant)); t.append(s("line", { x1: 120, y1: 110, x2: 120 + 52 * Math.cos(a), y2: 110 + 52 * Math.sin(a), "stroke-width": 3, "stroke-linecap": "round" }, { stroke: "var(--lia-text)" })); }
  return frag(t, legende(se.map((x, i) => [`${x.libelle} : ${x.debut} à ${x.fin}`, serie(i)])));
};

const confirmation: Forme = (b, o) => {
  const action = b.action;
  if (!forme<{ id: string; libelle: string }>({ id: (v) => typeof v === "string" && /^[a-z0-9_.-]{1,60}$/.test(v), libelle })(action) || !estTexte(b.resume) || !(b.niveau === 1 || b.niveau === 2 || b.niveau === 3)) return null;
  const niveau = b.niveau, d = h("div", "lia-bloc__confirmer");
  d.append(h("p", undefined, b.resume));
  if (!o.onConfirmer) { d.append(h("p", "lia-bloc__sous", `${action.libelle} : à confirmer dans l'app.`)); return d; }
  const ok = h("button", "lia-bloc__btn lia-bloc__btn--accent", action.libelle), non = h("button", "lia-bloc__btn", "Annuler"), etat = h("p", "lia-bloc__sous");
  etat.setAttribute("role", "status");
  ok.type = non.type = "button";
  const finir = (msg: string) => { ok.disabled = non.disabled = true; etat.textContent = msg; };
  ok.addEventListener("click", () => { finir("Demandé."); o.onConfirmer?.({ id: action.id, niveau }); });
  non.addEventListener("click", () => finir("Annulé."));
  const r = h("div", "lia-bloc__actions");
  r.append(ok, non);
  d.append(r, etat);
  return d;
};

function frag(...n: Node[]): DocumentFragment { const f = document.createDocumentFragment(); f.append(...n); return f; }
function defile(e: HTMLElement): HTMLElement { const d = h("div", "lia-bloc__defile"); d.tabIndex = 0; d.append(e); return d; }
function legende(items: [string, string][]): HTMLElement {
  const ul = h("ul", "lia-bloc__legende lia-bloc__legende--puces");
  for (const [t, c] of items) { const li = h("li", undefined, t); li.style.setProperty("--c", c); ul.append(li); }
  return ul;
}

/** Les 22 formes, dans l'ordre du catalogue de MemoryAI. */
export const FORMES: Record<string, Forme> = {
  carte, chrono, liste: listeForme, chat, courbe, barres, camembert, jauge, chiffre, tableau, calendrier,
  reseau, comparaison, radar, entonnoir, flux, heatmap, kanban, arbre, document: documentForme, cadran, confirmation,
};
