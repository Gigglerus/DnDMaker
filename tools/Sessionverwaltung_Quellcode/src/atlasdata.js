/* DND5e Atlas – Stammdaten und Vorschlagswerte */
(function (W) {
'use strict';
const TYPES = ['Weiler', 'Dorf', 'Ortschaft', 'Kleinstadt', 'Stadt', 'Großstadt', 'Metropole', 'Festung'];
const DENS = ['niedrig', 'mittel', 'hoch', 'sehr hoch'];
const WEALTH = ['arm', 'normal', 'reich', 'fürstlich'];
const RACES = ['Mensch', 'Zwerg', 'Elf', 'Halbling', 'Drachenblütiger', 'Gnom', 'Halbelf', 'Halbork', 'Tiefling'];
const RACE_W = { Mensch: 50, Halbling: 12, Zwerg: 12, Elf: 10, Halbelf: 8, Gnom: 6, Halbork: 5, Drachenblütiger: 3, Tiefling: 3 };
const RACE_COL = { Mensch: '#b5835a', Zwerg: '#7a4a2a', Elf: '#4f8a4a', Halbling: '#c9a13b', Drachenblütiger: '#a8322d', Gnom: '#5b7fb0', Halbelf: '#7fae7a', Halbork: '#5f6b3a', Tiefling: '#7a3a8a' };
const EXTRA_COL = ['#8a6f9e', '#4f8f8f', '#a0705a', '#6a7f4a', '#9a5a7a', '#5a6a9a'];
/* Einwohnerspanne je Art (log-skaliert, Bevölkerungsdichte wählt den Bereich) */
const POP = { Weiler: [20, 80], Dorf: [80, 400], Ortschaft: [400, 1000], Kleinstadt: [1000, 5000], Stadt: [5000, 15000], 'Großstadt': [15000, 40000], Metropole: [40000, 120000], Festung: [150, 2000] };
const DENS_Q = { niedrig: [0, .35], mittel: [.25, .65], hoch: [.55, .9], 'sehr hoch': [.8, 1] };
const WF = { arm: .55, normal: 1, reich: 1.35, 'fürstlich': 1.75 };
const NRACES = { Weiler: [1, 2], Dorf: [1, 2], Ortschaft: [1, 3], Kleinstadt: [2, 3], Stadt: [2, 4], 'Großstadt': [3, 5], Metropole: [4, 7], Festung: [1, 3] };
const R_SIZE = { Weiler: 4.5, Dorf: 5.5, Ortschaft: 6.5, Kleinstadt: 7.5, Stadt: 8.5, 'Großstadt': 10, Metropole: 11.5, Festung: 8 };
const W_COL = { arm: '#8c7a62', normal: '#8a2222', reich: '#d2ac4f', 'fürstlich': '#6b2d8f' };
const TYPE_DESC = {
  Weiler: 'Eine Handvoll Höfe', Dorf: 'Bauern, Schmied, vielleicht eine Taverne', Ortschaft: 'Markt und einige Handwerker',
  Kleinstadt: 'Stadtmauer oder Palisade, Wochenmarkt', Stadt: 'Gilden, Tempel, Stadtwache', 'Großstadt': 'Viertel, Paläste, Hafen oder Handelsstraße',
  Metropole: 'Hauptstadt eines Reiches', Festung: 'Burg oder Garnison mit Tross'
};

const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const sround = x => Math.floor(x) + (Math.random() < x % 1 ? 1 : 0);

function suggestPop(c) {
  const [lo, hi] = POP[c.type] || POP.Ortschaft; const [a, b] = DENS_Q[c.density] || DENS_Q.mittel;
  const v = lo * Math.pow(hi / lo, rnd(a, b));
  const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
  return Math.max(1, Math.round(v / mag) * mag);
}
function suggestNums(c) {
  const pop = c.pop > 0 ? c.pop : suggestPop(c);
  const wf = WF[c.wealth] || 1; const r = () => rnd(.75, 1.25);
  let lod = pop / 900 * (.8 + .2 * wf) * r(), res = pop / 600 * wf * r(), shop = pop / 160 * Math.pow(wf, 1.3) * r();
  if (c.type === 'Festung') { lod *= .4; res *= .5; shop *= .4; }
  const ti = TYPES.indexOf(c.type);
  let L = sround(lod), R = sround(res), S = sround(shop);
  if (ti >= 1) { L = Math.max(1, L); R = Math.max(1, R); }
  if (ti >= 2 && ti < 7) S = Math.max(2, S);
  if (ti === 0 && Math.random() < .3) R = Math.max(R, 1);
  return { lodging: L, restaurants: R, shops: S };
}
function pickWeighted(pool) { const tot = pool.reduce((s, x) => s + x[1], 0); let v = Math.random() * tot; for (const x of pool) { v -= x[1]; if (v <= 0) return x[0]; } return pool[pool.length - 1][0]; }
function suggestRaces(c) {
  const [a, b] = NRACES[c.type] || [1, 3]; const n = rint(a, b);
  const pool = Object.entries(RACE_W); const picked = [];
  // Hauptvolk: Gewichte quadriert, damit häufige Völker meist die Mehrheit stellen
  picked.push(pickWeighted(pool.map(x => [x[0], x[1] * x[1]]))); pool.splice(pool.findIndex(x => x[0] === picked[0]), 1);
  while (picked.length < n && pool.length) { const k = pickWeighted(pool); picked.push(k); pool.splice(pool.findIndex(x => x[0] === k), 1); }
  if (n === 1) return [{ n: picked[0], p: 100 }];
  const prim = n === 2 ? rnd(60, 92) : rnd(40, 80);
  const rest = picked.slice(1).map(() => rnd(.3, 1)); const rs = rest.reduce((s, x) => s + x, 0);
  return normalize([{ n: picked[0], p: prim }].concat(picked.slice(1).map((k, i) => ({ n: k, p: (100 - prim) * rest[i] / rs }))));
}
/* Ganzzahlige Anteile, Summe 100 (größter Rest) */
function normalize(list) {
  const valid = list.filter(r => r.n && +r.p > 0); const tot = valid.reduce((s, r) => s + +r.p, 0);
  if (!tot) return list;
  const raw = valid.map(r => ({ n: r.n, v: +r.p * 100 / tot })); raw.forEach(r => { r.p = Math.floor(r.v); });
  let left = 100 - raw.reduce((s, r) => s + r.p, 0);
  raw.slice().sort((x, y) => (y.v % 1) - (x.v % 1)).forEach(r => { if (left > 0) { r.p++; left--; } });
  return raw.map(r => ({ n: r.n, p: r.p })).filter(r => r.p > 0).sort((x, y) => y.p - x.p);
}
function newCity(x, y, o) {
  o = o || {};
  const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), x, y, name: o.name || '', type: o.type || 'Ortschaft', density: o.density || 'mittel', wealth: o.wealth || 'normal', races: [], pop: 0, lodging: 0, restaurants: 0, shops: 0, notes: '', manual: false, src: o.src || 'hand' };
  reroll(c, true); return c;
}
function reroll(c, races) { c.pop = suggestPop(c); Object.assign(c, suggestNums(c)); if (races) c.races = suggestRaces(c); }
const raceColor = (n, i) => RACE_COL[n] || EXTRA_COL[i % EXTRA_COL.length];

W.AT_DATA = { TYPES, DENS, WEALTH, RACES, POP, R_SIZE, W_COL, TYPE_DESC, suggestPop, suggestNums, suggestRaces, normalize, newCity, reroll, raceColor, rint };
})(window);
