// src/blocs/dom.ts
var NS = "http://www.w3.org/2000/svg";
function h(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== void 0) e.textContent = texte;
  return e;
}
function s(tag, attrs, couleur) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, typeof v === "number" ? String(Math.round(v * 10) / 10) : v);
  if (couleur?.fill) e.style.setProperty("fill", couleur.fill);
  if (couleur?.stroke) e.style.setProperty("stroke", couleur.stroke);
  return e;
}
function toile(l, ht, resume) {
  const t = s("svg", { viewBox: `0 0 ${l} ${ht}`, role: "img", class: "lia-bloc__toile" });
  t.setAttribute("aria-label", resume);
  return t;
}
function texteSvg(x, y, contenu, classe = "lia-bloc__etiq", ancre = "middle") {
  const t = s("text", { x, y, class: classe, "text-anchor": ancre });
  t.textContent = contenu;
  return t;
}
var SERIES = ["var(--lia-accent)", "var(--lia-info)", "var(--lia-ok)", "var(--lia-warn)"];
var serie = (i) => SERIES[i % SERIES.length] ?? "var(--lia-accent)";
var nombre = (n) => n.toLocaleString("fr-CA", { maximumFractionDigits: 2 });
var avecUnite = (n, unite2) => unite2 ? `${nombre(n)} ${unite2}` : nombre(n);
function jour(d) {
  const m = /^(\d{4}-\d{2}-\d{2})(T.*)?$/.exec(d);
  if (!m) return d;
  const date2 = new Date(m[2] ? d : `${m[1]}T00:00:00Z`);
  if (Number.isNaN(date2.getTime())) return d;
  const opts = m[2] ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" };
  return date2.toLocaleString("fr-CA", opts);
}
function arc(cx, cy, r, a0, a1) {
  const p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
}
function ligneBarre(lib, part, valeur, couleur = "var(--lia-accent)") {
  const l = h("div", "lia-bloc__ligne");
  l.append(h("span", "lia-bloc__lib", lib));
  const piste = h("span", "lia-bloc__piste");
  const barre = h("span", "lia-bloc__barre");
  barre.style.width = `${Math.max(0, Math.min(1, part)) * 100}%`;
  barre.style.background = couleur;
  piste.append(barre);
  l.append(piste, h("span", "lia-bloc__val", valeur));
  return l;
}

// src/blocs/garde.ts
var estObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var estTexte = (v, max = 500) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
var estNombre = (v) => typeof v === "number" && Number.isFinite(v);
function liste(v, garde, min = 1, max = 100) {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  return v.every((x) => garde(x)) ? v : null;
}
function forme(requis, optionnels = {}) {
  return (v) => estObj(v) && Object.entries(requis).every(([k, g]) => g(v[k])) && Object.entries(optionnels).every(([k, g]) => v[k] === void 0 || g(v[k]));
}
var libelle = (v) => estTexte(v, 200);
function lienSur(v) {
  if (typeof v !== "string" || v.length > 500 || !/^https:\/\/[^\s]+$/.test(v)) return null;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}
var heure = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
var minutes = (h2) => Number(h2.slice(0, 2)) * 60 + Number(h2.slice(3, 5));

// src/blocs/formes.ts
var unite = (b) => estTexte(b.unite, 16) ? b.unite : void 0;
var optLib = (v) => v === void 0 || libelle(v);
var date = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) && v.length <= 40;
var LT = { libelle, valeur: estNombre };
var carte = (b) => {
  const pts = liste(b.points, forme({ lat: (v) => estNombre(v) && Math.abs(v) <= 90, lon: (v) => estNombre(v) && Math.abs(v) <= 180, libelle }, { quand: date }), 1, 50);
  if (!pts) return null;
  const etendue = (k) => {
    const v = pts.map((p) => p[k]);
    const min = Math.min(...v);
    return { min, d: Math.max(Math.max(...v) - min, 0.01) };
  };
  const la = etendue("lat"), lo = etendue("lon"), W = 320, H = 180;
  const xy = (p) => [20 + (p.lon - lo.min) / lo.d * (W - 40), H - 20 - (p.lat - la.min) / la.d * (H - 40)];
  const t = toile(W, H, `Plan sch\xE9matique de ${pts.length} lieu(x)`);
  if (pts.length > 1) t.append(s("polyline", { points: pts.map((p) => xy(p).join(",")).join(" "), fill: "none", "stroke-width": 2, "stroke-dasharray": "5 5" }, { stroke: "var(--lia-soft)" }));
  pts.forEach((p, i) => {
    const [x, y] = xy(p);
    t.append(s("circle", { cx: x, cy: y, r: 9 }, { fill: "var(--lia-accent)" }), texteSvg(x, y + 4, String(i + 1), "lia-bloc__etiq lia-bloc__etiq--sur"));
  });
  const ol = h("ol", "lia-bloc__legende");
  for (const p of pts) ol.append(h("li", void 0, p.libelle));
  return frag(t, ol);
};
var chrono = (b) => {
  const ev = liste(b.evenements, forme({ date, libelle }), 1, 30);
  if (!ev || b.actuel !== void 0 && !(Number.isInteger(b.actuel) && b.actuel >= 0 && b.actuel < ev.length)) return null;
  const ol = h("ol", "lia-bloc__frise");
  ev.forEach((e, i) => {
    const li = h("li", i === b.actuel ? "lia-bloc__etape lia-bloc__etape--actuel" : "lia-bloc__etape");
    if (i === b.actuel) li.setAttribute("aria-current", "step");
    li.append(h("time", void 0, jour(e.date)), h("span", void 0, e.libelle));
    ol.append(li);
  });
  return ol;
};
var listeForme = (b) => {
  const el = liste(b.elements, forme({ libelle: estTexte }, { fait: (v) => typeof v === "boolean" }), 1, 30);
  if (!el) return null;
  const ul = h("ul", "lia-bloc__cases");
  for (const e of el) {
    const li = h("li", e.fait ? "lia-bloc__case lia-bloc__case--fait" : "lia-bloc__case");
    li.append(h("span", "lia-bloc__cache", e.fait ? "Fait : " : "\xC0 faire : "), h("span", void 0, e.libelle));
    ul.append(li);
  }
  return ul;
};
var chat = (b) => {
  const ms = liste(b.messages, forme({ de: libelle, texte: estTexte }, { quand: date }), 1, 20);
  if (!ms) return null;
  const d = h("div", "lia-bloc__fil");
  for (const m of ms) {
    const p = h("div", "lia-bloc__bulle");
    p.append(h("b", void 0, m.de));
    if (m.quand) p.append(h("time", void 0, jour(m.quand)));
    p.append(h("p", void 0, m.texte));
    d.append(p);
  }
  return d;
};
var courbe = (b) => {
  const pt = forme({ x: libelle, y: estNombre });
  const se = liste(b.series, forme({ nom: libelle, points: (v) => liste(v, pt, 2, 366) !== null }), 1, 4);
  if (!se) return null;
  const ys = se.flatMap((x) => x.points.map((p) => p.y)), min = Math.min(...ys), d = Math.max(Math.max(...ys) - min, 1e-9);
  const W = 320, H = 160, u = unite(b);
  const t = toile(W, H, se.map((x) => `${x.nom} : de ${avecUnite(x.points[0].y, u)} \xE0 ${avecUnite(x.points[x.points.length - 1].y, u)}`).join(" ; "));
  t.append(s("path", { d: `M28 8V${H - 22}H${W - 8}`, fill: "none" }, { stroke: "var(--lia-border)" }));
  t.append(texteSvg(24, 14, nombre(min + d), "lia-bloc__etiq", "end"), texteSvg(24, H - 22, nombre(min), "lia-bloc__etiq", "end"));
  se.forEach((x, i) => {
    const n = x.points.length, X = (k) => 32 + (W - 44) * k / (n - 1), Y = (y) => H - 26 - (y - min) / d * (H - 40);
    t.append(s("path", { d: "M" + x.points.map((p, k) => `${X(k).toFixed(1)} ${Y(p.y).toFixed(1)}`).join("L"), fill: "none", "stroke-width": 2.4, "stroke-linejoin": "round" }, { stroke: serie(i) }));
  });
  const p0 = se[0].points;
  t.append(texteSvg(32, H - 6, p0[0].x, "lia-bloc__etiq", "start"), texteSvg(W - 8, H - 6, p0[p0.length - 1].x, "lia-bloc__etiq", "end"));
  return frag(t, legende(se.map((x, i) => [x.nom, serie(i)])));
};
var barres = (b) => {
  const br = liste(b.barres, forme(LT), 1, 30);
  if (!br) return null;
  const max = Math.max(...br.map((x) => Math.abs(x.valeur)), 1e-9), u = unite(b);
  return frag(...br.map((x) => ligneBarre(x.libelle, Math.abs(x.valeur) / max, avecUnite(x.valeur, u), x.valeur < 0 ? "var(--lia-danger)" : void 0)));
};
var camembert = (b) => {
  const pa = liste(b.parts, forme({ libelle, valeur: (v) => estNombre(v) && v >= 0 }), 2, 12);
  const total = pa?.reduce((a, x) => a + x.valeur, 0) ?? 0;
  if (!pa || total <= 0) return null;
  const C = 2 * Math.PI * 40, u = unite(b);
  const t = toile(120, 120, pa.map((x) => `${x.libelle} ${Math.round(x.valeur / total * 100)} %`).join(", "));
  let o = 0;
  pa.forEach((x, i) => {
    const l = x.valeur / total * C;
    t.append(s("circle", { cx: 60, cy: 60, r: 40, fill: "none", "stroke-width": 22, "stroke-dasharray": `${l} ${C - l}`, "stroke-dashoffset": -o, transform: "rotate(-90 60 60)" }, { stroke: serie(i) }));
    o += l;
  });
  return frag(t, legende(pa.map((x, i) => [`${x.libelle} : ${avecUnite(x.valeur, u)} (${Math.round(x.valeur / total * 100)} %)`, serie(i)])));
};
var jauge = (b) => {
  const { valeur: v, min, max } = b;
  if (!libelle(b.libelle) || !estNombre(v) || !estNombre(min) || !estNombre(max) || !(min < max) || v < min || v > max) return null;
  const u = unite(b), part = (v - min) / (max - min);
  const t = toile(200, 112, `${b.libelle} : ${avecUnite(v, u)} sur ${avecUnite(max, u)}`);
  t.append(s("path", { d: arc(100, 96, 72, Math.PI, 2 * Math.PI), fill: "none", "stroke-width": 16, "stroke-linecap": "round" }, { stroke: "var(--lia-surface-2)" }));
  if (part > 0) t.append(s("path", { d: arc(100, 96, 72, Math.PI, Math.PI + Math.PI * part), fill: "none", "stroke-width": 16, "stroke-linecap": "round" }, { stroke: "var(--lia-accent)" }));
  t.append(texteSvg(100, 92, avecUnite(v, u), "lia-bloc__grand"));
  return frag(t, h("p", "lia-bloc__sous", b.libelle));
};
var chiffre = (b) => {
  if (!libelle(b.libelle) || !estNombre(b.valeur) || b.variation !== void 0 && !estNombre(b.variation)) return null;
  const d = h("div", "lia-bloc__chiffre");
  d.append(h("span", "lia-bloc__grand", avecUnite(b.valeur, unite(b))), h("span", "lia-bloc__sous", b.libelle));
  if (estNombre(b.variation)) d.append(h("span", b.variation < 0 ? "lia-bloc__var lia-bloc__var--bas" : "lia-bloc__var", `${b.variation > 0 ? "+" : ""}${avecUnite(b.variation, unite(b))}`));
  return d;
};
var tableau = (b) => {
  const col = liste(b.colonnes, libelle, 1, 8);
  const lig = col && liste(b.lignes, (l) => liste(l, (c) => typeof c === "string" && c.length <= 200, col.length, col.length) !== null, 1, 50);
  if (!col || !lig) return null;
  const tb = h("table", "lia-bloc__table"), tr = h("tr");
  for (const c of col) {
    const th = h("th", void 0, c);
    th.scope = "col";
    tr.append(th);
  }
  const tbody = h("tbody");
  for (const l of lig) {
    const r = h("tr");
    for (const c of l) r.append(h("td", void 0, c));
    tbody.append(r);
  }
  tb.append(h("thead"), tbody);
  tb.tHead.append(tr);
  return defile(tb);
};
var calendrier = (b) => {
  const js = liste(b.jours, forme({ date }, { libelle, intensite: (v) => estNombre(v) && v >= 0 && v <= 1 }), 1, 62);
  if (!js) return null;
  const ul = h("ul", "lia-bloc__jours");
  for (const j of js) {
    const li = h("li", "lia-bloc__jour");
    li.style.setProperty("--i", String(j.intensite ?? 0));
    li.append(h("time", void 0, jour(j.date)));
    if (j.libelle) li.append(h("span", void 0, j.libelle));
    ul.append(li);
  }
  return ul;
};
var reseau = (b) => {
  const no = liste(b.noeuds, forme({ id: (v) => estTexte(v, 40), libelle }), 2, 60);
  const ids = new Map(no?.map((n, i) => [n.id, i]));
  const li = liste(b.liens, forme({ a: (v) => typeof v === "string" && ids.has(v), b: (v) => typeof v === "string" && ids.has(v) }), 0, 200);
  if (!no || !li || ids.size !== no.length) return null;
  const W = 320, H = 220, R = 78, pos = no.map((_, i) => [W / 2 + R * 1.3 * Math.cos(2 * Math.PI * i / no.length - Math.PI / 2), H / 2 + R * Math.sin(2 * Math.PI * i / no.length - Math.PI / 2)]);
  const t = toile(W, H, `R\xE9seau de ${no.length} \xE9l\xE9ments et ${li.length} liens`);
  for (const l of li) {
    const [a, c] = [pos[ids.get(l.a)], pos[ids.get(l.b)]];
    t.append(s("line", { x1: a[0], y1: a[1], x2: c[0], y2: c[1], "stroke-width": 1.4 }, { stroke: "var(--lia-border)" }));
  }
  no.forEach((n, i) => {
    const [x, y] = pos[i];
    t.append(s("circle", { cx: x, cy: y, r: 6 }, { fill: "var(--lia-accent)" }), texteSvg(x, y > H / 2 ? y + 18 : y - 10, n.libelle));
  });
  return t;
};
var comparaison = (b) => {
  const cle = forme({ cle: libelle, valeur: estTexte });
  const co = liste(b.colonnes, forme({ libelle, lignes: (v) => liste(v, cle, 1, 20) !== null }), 2, 4);
  if (!co) return null;
  const g = h("div", "lia-bloc__colonnes");
  for (const c of co) {
    const d = h("div", "lia-bloc__col"), dl = h("dl");
    for (const l of c.lignes) dl.append(h("dt", void 0, l.cle), h("dd", void 0, l.valeur));
    d.append(h("h4", void 0, c.libelle), dl);
    g.append(d);
  }
  return g;
};
var radar = (b) => {
  const ax = liste(b.axes, libelle, 3, 10);
  const se = ax && liste(b.series, forme({ nom: libelle, valeurs: (v) => liste(v, estNombre, ax.length, ax.length) !== null }), 1, 3);
  if (!ax || !se) return null;
  const vs = se.flatMap((x) => x.valeurs), min = Math.min(0, ...vs), d = Math.max(Math.max(...vs) - min, 1e-9);
  const pt = (i, r) => `${(160 + r * Math.cos(-Math.PI / 2 + 2 * Math.PI * i / ax.length)).toFixed(1)} ${(110 + r * Math.sin(-Math.PI / 2 + 2 * Math.PI * i / ax.length)).toFixed(1)}`;
  const t = toile(320, 220, se.map((x) => `${x.nom} : ${ax.map((a, i) => `${a} ${nombre(x.valeurs[i])}`).join(", ")}`).join(" ; "));
  t.append(s("path", { d: "M" + ax.map((_, i) => pt(i, 80)).join("L") + "Z", fill: "none" }, { stroke: "var(--lia-border)" }));
  ax.forEach((a, i) => {
    const [x, y] = pt(i, 98).split(" ").map(Number);
    t.append(texteSvg(x, y + 4, a));
  });
  se.forEach((x, k) => t.append(s("path", { d: "M" + x.valeurs.map((v, i) => pt(i, (v - min) / d * 80)).join("L") + "Z", "fill-opacity": 0.2, "stroke-width": 2 }, { fill: serie(k), stroke: serie(k) })));
  return frag(t, legende(se.map((x, i) => [x.nom, serie(i)])));
};
var entonnoir = (b) => {
  const et = liste(b.etapes, forme({ libelle, valeur: (v) => estNombre(v) && v >= 0 }), 2, 8);
  if (!et) return null;
  const max = Math.max(...et.map((x) => x.valeur), 1e-9), p = et[0].valeur;
  return frag(...et.map((x) => ligneBarre(x.libelle, x.valeur / max, p > 0 ? `${nombre(x.valeur)} (${Math.round(x.valeur / p * 100)} %)` : nombre(x.valeur))));
};
var flux = (b) => {
  const li = liste(b.liens, forme({ de: libelle, vers: libelle, valeur: (v) => estNombre(v) && v > 0 }), 1, 30);
  if (!li) return null;
  const max = Math.max(...li.map((x) => x.valeur)), u = unite(b);
  return frag(...li.map((x) => ligneBarre(`${x.de} \u2192 ${x.vers}`, x.valeur / max, avecUnite(x.valeur, u))));
};
var heatmap = (b) => {
  const lg = liste(b.lignes, libelle, 1, 31), co = liste(b.colonnes, libelle, 1, 31);
  const va = lg && co && liste(b.valeurs, (r) => liste(r, estNombre, co.length, co.length) !== null, lg.length, lg.length);
  if (!lg || !co || !va) return null;
  const tout = va.flat(), min = Math.min(...tout), d = Math.max(Math.max(...tout) - min, 1e-9);
  const tb = h("table", "lia-bloc__table lia-bloc__chaleur"), tr = h("tr");
  tr.append(h("td"));
  for (const c of co) {
    const th = h("th", void 0, c);
    th.scope = "col";
    tr.append(th);
  }
  tb.append(tr);
  lg.forEach((l, i) => {
    const r = h("tr"), th = h("th", void 0, l);
    th.scope = "row";
    r.append(th);
    for (const v of va[i]) {
      const td = h("td", void 0, nombre(v));
      td.style.setProperty("--i", String((v - min) / d));
      r.append(td);
    }
    tb.append(r);
  });
  return defile(tb);
};
var kanban = (b) => {
  const co = liste(b.colonnes, forme({ libelle, cartes: (v) => liste(v, estTexte, 0, 20) !== null }), 2, 6);
  if (!co) return null;
  const g = h("div", "lia-bloc__colonnes");
  for (const c of co) {
    const d = h("div", "lia-bloc__col"), ul = h("ul");
    for (const x of c.cartes) ul.append(h("li", "lia-bloc__carte", x));
    d.append(h("h4", void 0, `${c.libelle} (${c.cartes.length})`), ul);
    g.append(d);
  }
  return g;
};
var arbre = (b) => {
  let n = 0;
  const ok = (v, prof) => prof <= 4 && ++n <= 60 && forme({ libelle }, { enfants: (e) => Array.isArray(e) && e.length <= 12 && e.every((x) => ok(x, prof + 1)) })(v);
  if (!ok(b.racine, 1)) return null;
  const rendre = (x) => {
    const li = h("li", void 0);
    li.append(h("span", void 0, x.libelle));
    if (x.enfants?.length) {
      const ul2 = h("ul");
      for (const e of x.enfants) ul2.append(rendre(e));
      li.append(ul2);
    }
    return li;
  };
  const ul = h("ul", "lia-bloc__arbre");
  ul.append(rendre(b.racine));
  return ul;
};
var documentForme = (b) => {
  const lien = b.lien === void 0 ? null : lienSur(b.lien);
  if (!libelle(b.libelle) || !optLib(b.emetteur) || b.date !== void 0 && !date(b.date) || b.lien !== void 0 && !lien) return null;
  const d = h("div", "lia-bloc__doc");
  d.append(h("b", void 0, b.libelle));
  const meta = [b.emetteur, b.date ? jour(b.date) : void 0].filter((x) => typeof x === "string");
  if (meta.length) d.append(h("span", "lia-bloc__sous", meta.join(", ")));
  if (lien) {
    const a = h("a", "lia-bloc__lien", "Ouvrir le papier");
    a.href = lien;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    d.append(a);
  }
  return d;
};
var cadran = (b) => {
  const se = liste(b.segments, forme({ debut: heure, fin: heure, libelle }), 1, 24);
  if (!se || b.maintenant !== void 0 && !heure(b.maintenant)) return null;
  const ang = (m) => -Math.PI / 2 + m / 1440 * 2 * Math.PI;
  const t = toile(240, 220, se.map((x) => `${x.libelle} de ${x.debut} \xE0 ${x.fin}`).join(", "));
  t.append(s("circle", { cx: 120, cy: 110, r: 70, fill: "none", "stroke-width": 18 }, { stroke: "var(--lia-surface-2)" }));
  se.forEach((x, i) => {
    const a = minutes(x.debut), f = minutes(x.fin) + (minutes(x.fin) <= a ? 1440 : 0);
    t.append(s("path", { d: arc(120, 110, 70, ang(a), ang(f)), fill: "none", "stroke-width": 18 }, { stroke: serie(i) }));
  });
  for (const [hh, lib] of [[0, "0 h"], [360, "6 h"], [720, "12 h"], [1080, "18 h"]]) t.append(texteSvg(120 + 102 * Math.cos(ang(hh)), 114 + 94 * Math.sin(ang(hh)), lib));
  if (typeof b.maintenant === "string") {
    const a = ang(minutes(b.maintenant));
    t.append(s("line", { x1: 120, y1: 110, x2: 120 + 52 * Math.cos(a), y2: 110 + 52 * Math.sin(a), "stroke-width": 3, "stroke-linecap": "round" }, { stroke: "var(--lia-text)" }));
  }
  return frag(t, legende(se.map((x, i) => [`${x.libelle} : ${x.debut} \xE0 ${x.fin}`, serie(i)])));
};
var confirmation = (b, o) => {
  const action = b.action;
  if (!forme({ id: (v) => typeof v === "string" && /^[a-z0-9_.-]{1,60}$/.test(v), libelle })(action) || !estTexte(b.resume) || !(b.niveau === 1 || b.niveau === 2 || b.niveau === 3)) return null;
  const niveau = b.niveau, d = h("div", "lia-bloc__confirmer");
  d.append(h("p", void 0, b.resume));
  if (!o.onConfirmer) {
    d.append(h("p", "lia-bloc__sous", `${action.libelle} : \xE0 confirmer dans l'app.`));
    return d;
  }
  const ok = h("button", "lia-bloc__btn lia-bloc__btn--accent", action.libelle), non = h("button", "lia-bloc__btn", "Annuler"), etat = h("p", "lia-bloc__sous");
  etat.setAttribute("role", "status");
  ok.type = non.type = "button";
  const finir = (msg) => {
    ok.disabled = non.disabled = true;
    etat.textContent = msg;
  };
  ok.addEventListener("click", () => {
    finir("Demand\xE9.");
    o.onConfirmer?.({ id: action.id, niveau });
  });
  non.addEventListener("click", () => finir("Annul\xE9."));
  const r = h("div", "lia-bloc__actions");
  r.append(ok, non);
  d.append(r, etat);
  return d;
};
function frag(...n) {
  const f = document.createDocumentFragment();
  f.append(...n);
  return f;
}
function defile(e) {
  const d = h("div", "lia-bloc__defile");
  d.tabIndex = 0;
  d.append(e);
  return d;
}
function legende(items) {
  const ul = h("ul", "lia-bloc__legende lia-bloc__legende--puces");
  for (const [t, c] of items) {
    const li = h("li", void 0, t);
    li.style.setProperty("--c", c);
    ul.append(li);
  }
  return ul;
}
var FORMES = {
  carte,
  chrono,
  liste: listeForme,
  chat,
  courbe,
  barres,
  camembert,
  jauge,
  chiffre,
  tableau,
  calendrier,
  reseau,
  comparaison,
  radar,
  entonnoir,
  flux,
  heatmap,
  kanban,
  arbre,
  document: documentForme,
  cadran,
  confirmation
};

// src/blocs/index.ts
var MAX_BLOCS = 20;
var TYPES_BLOCS = Object.keys(FORMES);
var ATTR_STYLE = "data-lia-blocs";
function injecter() {
  if (document.head.querySelector(`style[${ATTR_STYLE}]`)) return;
  const st = document.createElement("style");
  st.setAttribute(ATTR_STYLE, "");
  st.textContent = CSS_BLOCS;
  document.head.appendChild(st);
}
function sources(ids, o) {
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const p = h("p", "lia-bloc__sources", ids.length > 1 ? `${ids.length} sources : ` : "Source : ");
  ids.forEach((id, i) => {
    const url = typeof id === "string" && o.lienSource ? lienSur(o.lienSource(id)) : null;
    if (i > 0) p.append(", ");
    if (!url) {
      p.append(String(i + 1));
      return;
    }
    const a = h("a", "lia-bloc__lien", String(i + 1));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("aria-label", `Source ${i + 1}`);
    p.append(a);
  });
  return p;
}
function rendreBlocs(blocs, dans, options = {}) {
  const bilan = { rendus: 0, ignores: 0 };
  if (!Array.isArray(blocs)) return bilan;
  injecter();
  const zone = h("div", "lia-blocs");
  blocs.forEach((b, i) => {
    const type = estObj(b) && typeof b.type === "string" && Object.hasOwn(FORMES, b.type) ? b.type : null;
    let dessin = null;
    try {
      dessin = i < MAX_BLOCS && type && estObj(b) ? FORMES[type](b, options) : null;
    } catch (e) {
      console.error("lia-ui/blocs :", type, e instanceof Error ? e.message : e);
    }
    if (!dessin || !estObj(b)) {
      bilan.ignores++;
      return;
    }
    const fig = h("figure", `lia-bloc lia-bloc--${type}`);
    if (typeof b.titre === "string" && b.titre.trim() && b.titre.length <= 120) fig.append(h("figcaption", "lia-bloc__titre", b.titre));
    fig.append(dessin);
    const src = sources(b.sources, options);
    if (src) fig.append(src);
    zone.append(fig);
    bilan.rendus++;
  });
  if (bilan.rendus) dans.append(zone);
  return bilan;
}
var CSS_BLOCS = `
.lia-blocs:not(.lia-ui .lia-blocs){--lia-bg:#0B0D12;--lia-surface:#12151C;--lia-surface-2:#181C25;--lia-border:rgba(255,255,255,.12);--lia-text:#E9EDF5;--lia-soft:#A7AEBD;--lia-accent:#93A0FF;--lia-danger:#E5675B}
.lia-blocs{--lia-info:#60A5FA;--lia-ok:#34D399;--lia-warn:#FBBF24;
display:flex;flex-direction:column;gap:.6rem;margin-top:.6rem;white-space:normal;color:var(--lia-text);font-family:inherit}
.lia-bloc{margin:0;padding:.7rem .8rem;border:1px solid var(--lia-border);border-radius:14px;background:var(--lia-surface);display:flex;flex-direction:column;gap:.5rem;min-width:0}
.lia-bloc__titre{font-weight:600;font-size:.95rem}
.lia-bloc__toile{width:100%;height:auto;max-height:220px;display:block}
.lia-bloc__etiq{font-size:11px;fill:var(--lia-soft)}
.lia-bloc__etiq--sur{fill:var(--lia-bg);font-weight:700}
.lia-bloc__grand{font-size:2rem;font-weight:300;line-height:1.1;fill:var(--lia-text)}
.lia-bloc__sous,.lia-bloc__sources{margin:0;font-size:.85rem;color:var(--lia-soft)}
.lia-bloc__lien{color:var(--lia-accent);display:inline-flex;align-items:center;min-height:44px;min-width:44px;justify-content:center}
.lia-bloc__lien:focus-visible,.lia-bloc__btn:focus-visible,.lia-bloc__defile:focus-visible{outline:2px solid var(--lia-accent);outline-offset:2px}
.lia-bloc__legende{margin:0;padding-left:1.2rem;font-size:.85rem;display:flex;flex-direction:column;gap:.2rem}
.lia-bloc__legende--puces{list-style:none;padding:0}
.lia-bloc__legende--puces li::before{content:"";display:inline-block;width:.7em;height:.7em;border-radius:50%;margin-right:.4em;background:var(--c)}
.lia-bloc__frise{list-style:none;margin:0;padding:0 0 0 1rem;border-left:2px solid var(--lia-border);display:flex;flex-direction:column;gap:.5rem}
.lia-bloc__etape{display:flex;flex-direction:column;position:relative}
.lia-bloc__etape::before{content:"";position:absolute;left:calc(-1rem - 6px);top:.35em;width:10px;height:10px;border-radius:50%;background:var(--lia-surface-2);border:2px solid var(--lia-soft)}
.lia-bloc__etape--actuel::before{background:var(--lia-accent);border-color:var(--lia-accent)}
.lia-bloc__etape time,.lia-bloc__bulle time,.lia-bloc__jour time{font-size:.8rem;color:var(--lia-soft)}
.lia-bloc__cases{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.35rem}
.lia-bloc__case{display:flex;gap:.5rem;align-items:baseline}
.lia-bloc__case::before{content:"";flex:none;width:14px;height:14px;border-radius:4px;border:2px solid var(--lia-soft)}
.lia-bloc__case--fait::before{background:var(--lia-ok);border-color:var(--lia-ok)}
.lia-bloc__case--fait span:last-child{color:var(--lia-soft);text-decoration:line-through}
.lia-bloc__cache{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lia-bloc__fil{display:flex;flex-direction:column;gap:.4rem}
.lia-bloc__bulle{padding:.45rem .7rem;border-radius:12px;background:var(--lia-surface-2);display:flex;flex-wrap:wrap;gap:.1rem .5rem;align-items:baseline}
.lia-bloc__bulle p{margin:0;flex-basis:100%;overflow-wrap:anywhere}
.lia-bloc__ligne{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto;gap:.5rem;align-items:center;font-size:.88rem}
.lia-bloc__lib{overflow-wrap:anywhere}
.lia-bloc__piste{height:10px;border-radius:5px;background:var(--lia-surface-2);overflow:hidden}
.lia-bloc__barre{display:block;height:100%;border-radius:5px}
.lia-bloc__val{font-variant-numeric:tabular-nums;color:var(--lia-soft)}
.lia-bloc__chiffre{display:flex;flex-direction:column;gap:.1rem}
.lia-bloc__var{font-size:.85rem;color:var(--lia-ok)}
.lia-bloc__var--bas{color:var(--lia-danger)}
.lia-bloc__defile{overflow-x:auto;max-width:100%}
.lia-bloc__table{border-collapse:collapse;font-size:.85rem;min-width:100%}
.lia-bloc__table th,.lia-bloc__table td{padding:.35rem .5rem;border-bottom:1px solid var(--lia-border);text-align:left;vertical-align:top}
.lia-bloc__table th{color:var(--lia-soft);font-weight:600}
.lia-bloc__chaleur td{text-align:center;background:color-mix(in srgb,var(--lia-accent) calc(var(--i) * 70%),transparent)}
.lia-bloc__jours{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.35rem}
.lia-bloc__jour{padding:.4rem;border-radius:10px;border:1px solid var(--lia-border);display:flex;flex-direction:column;font-size:.85rem;background:color-mix(in srgb,var(--lia-accent) calc(var(--i) * 45%),transparent)}
.lia-bloc__colonnes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.5rem}
.lia-bloc__col{border:1px solid var(--lia-border);border-radius:10px;padding:.5rem;min-width:0}
.lia-bloc__col h4{margin:0 0 .35rem;font-size:.9rem}
.lia-bloc__col dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.2rem .5rem;font-size:.85rem}
.lia-bloc__col dt{color:var(--lia-soft)}.lia-bloc__col dd{margin:0;overflow-wrap:anywhere}
.lia-bloc__col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.3rem}
.lia-bloc__carte{padding:.35rem .5rem;border-radius:8px;background:var(--lia-surface-2);font-size:.85rem;overflow-wrap:anywhere}
.lia-bloc__arbre,.lia-bloc__arbre ul{list-style:none;margin:0;padding-left:1rem;border-left:1px solid var(--lia-border);font-size:.88rem}
.lia-bloc__arbre{border-left:0;padding-left:0}
.lia-bloc__arbre li{padding:.15rem 0}
.lia-bloc__doc{display:flex;flex-direction:column;gap:.2rem}
.lia-bloc__confirmer p{margin:0}
.lia-bloc__actions{display:flex;gap:.5rem;flex-wrap:wrap}
.lia-bloc__btn{min-height:44px;padding:0 1rem;border-radius:22px;border:1px solid var(--lia-border);background:transparent;color:var(--lia-text);font:inherit;font-size:.95rem;cursor:pointer}
.lia-bloc__btn--accent{background:var(--lia-accent);border-color:var(--lia-accent);color:var(--lia-bg)}
.lia-bloc__btn[disabled]{opacity:.5;cursor:default}
`;
export {
  CSS_BLOCS,
  MAX_BLOCS,
  TYPES_BLOCS,
  rendreBlocs
};
//# sourceMappingURL=index.mjs.map