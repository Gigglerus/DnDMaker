/* Minimal-PDF-Formularleser: liest AcroForm-Feldwerte (Text + Checkboxen) ohne externe Bibliothek.
   Unterstützt klassische Objekte, Objekt-Streams (FlateDecode via DecompressionStream) und inkrementelle Updates. */
(function (root) {
  'use strict';
  const WS = new Set([0, 9, 10, 12, 13, 32]);
  const DELIM = new Set('()<>[]{}/%'.split('').map(c => c.charCodeAt(0)));

  function Ref(n, g) { this.n = n; this.g = g; }
  function Name(s) { this.name = s; }

  class Lexer {
    constructor(bytes, pos) { this.b = bytes; this.p = pos || 0; }
    skip() {
      const b = this.b;
      for (;;) {
        while (this.p < b.length && WS.has(b[this.p])) this.p++;
        if (b[this.p] === 37) { while (this.p < b.length && b[this.p] !== 10 && b[this.p] !== 13) this.p++; }
        else break;
      }
    }
    peekWord() {
      this.skip(); let s = '', q = this.p;
      while (q < this.b.length && !WS.has(this.b[q]) && !DELIM.has(this.b[q])) s += String.fromCharCode(this.b[q++]);
      return s;
    }
    parse() {
      this.skip();
      const b = this.b, c = b[this.p];
      if (c === undefined) return null;
      if (c === 60 && b[this.p + 1] === 60) { // <<
        this.p += 2; const d = {};
        for (;;) {
          this.skip();
          if (b[this.p] === 62 && b[this.p + 1] === 62) { this.p += 2; break; }
          if (this.p >= b.length) break;
          const k = this.parse();
          if (!(k instanceof Name)) { this.p++; continue; }
          d[k.name] = this.parse();
        }
        return d;
      }
      if (c === 91) { // [
        this.p++; const a = [];
        for (;;) { this.skip(); if (b[this.p] === 93) { this.p++; break; } if (this.p >= b.length) break; a.push(this.parse()); }
        return a;
      }
      if (c === 40) return this.litString();
      if (c === 60) return this.hexString();
      if (c === 47) { // name
        this.p++; let s = '';
        while (this.p < b.length && !WS.has(b[this.p]) && !DELIM.has(b[this.p])) s += String.fromCharCode(b[this.p++]);
        s = s.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        return new Name(s);
      }
      const w = this.peekWord();
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) {
        this.p += w.length;
        // Referenz "n g R"?
        if (/^\d+$/.test(w)) {
          const save = this.p; const w2 = this.peekWord();
          if (/^\d+$/.test(w2)) { this.p += w2.length; const w3 = this.peekWord(); if (w3 === 'R') { this.p += 1; return new Ref(+w, +w2); } }
          this.p = save;
        }
        return parseFloat(w);
      }
      this.p += Math.max(1, w.length);
      if (w === 'true') return true; if (w === 'false') return false; if (w === 'null') return null;
      return { op: w };
    }
    litString() {
      const b = this.b; this.p++; let depth = 1; const out = [];
      while (this.p < b.length) {
        let c = b[this.p++];
        if (c === 92) {
          c = b[this.p++];
          const map = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 };
          if (map[c] !== undefined) out.push(map[c]);
          else if (c >= 48 && c <= 55) { let o = c - 48; for (let i = 0; i < 2 && b[this.p] >= 48 && b[this.p] <= 55; i++) o = o * 8 + b[this.p++] - 48; out.push(o & 255); }
          else if (c === 13) { if (b[this.p] === 10) this.p++; }
          else if (c === 10) { /* Zeilenfortsetzung */ }
          else out.push(c);
        } else if (c === 40) { depth++; out.push(c); }
        else if (c === 41) { if (--depth === 0) break; out.push(c); }
        else out.push(c);
      }
      return { str: Uint8Array.from(out) };
    }
    hexString() {
      const b = this.b; this.p++; let h = '';
      while (this.p < b.length && b[this.p] !== 62) { const ch = String.fromCharCode(b[this.p++]); if (/[0-9a-fA-F]/.test(ch)) h += ch; }
      this.p++; if (h.length % 2) h += '0';
      const out = new Uint8Array(h.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
      return { str: out };
    }
  }

  // PDFDocEncoding-Abweichungen von Latin-1 (0x80–0x9F)
  const PDFDOC = { 0x80: 0x2022, 0x81: 0x2020, 0x82: 0x2021, 0x83: 0x2026, 0x84: 0x2014, 0x85: 0x2013, 0x86: 0x0192, 0x87: 0x2044, 0x88: 0x2039, 0x89: 0x203A, 0x8A: 0x2212, 0x8B: 0x2030, 0x8C: 0x201E, 0x8D: 0x201C, 0x8E: 0x201D, 0x8F: 0x2018, 0x90: 0x2019, 0x91: 0x201A, 0x92: 0x2122, 0x93: 0xFB01, 0x94: 0xFB02, 0x95: 0x0141, 0x96: 0x0152, 0x97: 0x0160, 0x98: 0x0178, 0x99: 0x017D, 0x9A: 0x0131, 0x9B: 0x0142, 0x9C: 0x0153, 0x9D: 0x0161, 0x9E: 0x017E, 0xA0: 0x20AC };
  function decodeStr(u) {
    if (!u) return '';
    if (u.length >= 2 && u[0] === 0xFE && u[1] === 0xFF) { let s = ''; for (let i = 2; i + 1 < u.length; i += 2) s += String.fromCharCode((u[i] << 8) | u[i + 1]); return s; }
    if (u.length >= 3 && u[0] === 0xEF && u[1] === 0xBB && u[2] === 0xBF) { try { return new TextDecoder('utf-8').decode(u.subarray(3)); } catch (e) {} }
    let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(PDFDOC[u[i]] || u[i]); return s;
  }

  async function inflate(bytes) {
    const ds = new DecompressionStream('deflate');
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function findSeq(b, seq, from) {
    outer: for (let i = from; i <= b.length - seq.length; i++) { for (let j = 0; j < seq.length; j++) if (b[i + j] !== seq[j]) continue outer; return i; }
    return -1;
  }
  const ENDSTREAM = Array.from('endstream').map(c => c.charCodeAt(0));

  async function readFields(buf) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const objs = new Map(); const streams = [];
    // Objekte suchen (Textscan; letzte Definition gewinnt = inkrementelle Updates)
    let txt = ''; const CH = 1 << 16;
    for (let i = 0; i < b.length; i += CH) txt += String.fromCharCode.apply(null, b.subarray(i, i + CH));
    const re = /(\d+)\s+(\d+)\s+obj\b/g; let m;
    while ((m = re.exec(txt))) {
      const lx = new Lexer(b, m.index + m[0].length);
      let val; try { val = lx.parse(); } catch (e) { continue; }
      const key = +m[1];
      lx.skip();
      if (val && typeof val === 'object' && !(val instanceof Ref) && lx.peekWord() === 'stream') {
        let p = lx.p + 6; if (b[p] === 13) p++; if (b[p] === 10) p++;
        let len = typeof val.Length === 'number' ? val.Length : -1;
        let end = (len >= 0 && p + len <= b.length) ? p + len : findSeq(b, ENDSTREAM, p);
        if (end < 0) end = b.length;
        val.__data = b.subarray(p, end);
        re.lastIndex = Math.max(re.lastIndex, end);
        if (val.Type && val.Type.name === 'ObjStm') streams.push(val);
      }
      objs.set(key, val);
    }
    // Objekt-Streams entpacken
    for (const s of streams) {
      try {
        let data = s.__data;
        const f = s.Filter; const fname = f instanceof Name ? f.name : (Array.isArray(f) && f[0] ? f[0].name : null);
        if (fname === 'FlateDecode') data = await inflate(data);
        else if (fname) continue;
        const n = s.N, first = s.First;
        const hl = new Lexer(data, 0); const pairs = [];
        for (let i = 0; i < n; i++) pairs.push([hl.parse(), hl.parse()]);
        for (const [num, off] of pairs) {
          if (objs.has(num) && !objs.get(num).__fromStm && objs.get(num) !== undefined) {
            // klassisches Objekt existiert bereits – nur ersetzen, wenn es aus einem früheren Stream stammt
            continue;
          }
          const v = new Lexer(data, first + off).parse();
          if (v && typeof v === 'object') Object.defineProperty(v, '__fromStm', { value: true });
          objs.set(num, v);
        }
      } catch (e) { /* defekter Stream – überspringen */ }
    }
    const R = v => (v instanceof Ref ? objs.get(v.n) : v);
    const fields = {};
    const seen = new Set();
    function fullName(d) {
      const parts = []; let cur = d, guard = 0;
      while (cur && guard++ < 20) { const t = R(cur.T); if (t && t.str) parts.unshift(decodeStr(t.str)); cur = R(cur.Parent); }
      return parts.join('.');
    }
    function valueOf(d) {
      let cur = d, guard = 0;
      while (cur && guard++ < 20) {
        if (cur.V !== undefined) {
          const v = R(cur.V);
          if (v && v.str) return decodeStr(v.str);
          if (v instanceof Name) return v.name === 'Off' ? false : true;
          if (Array.isArray(v)) return v.map(x => (R(x) && R(x).str ? decodeStr(R(x).str) : '')).join(', ');
          return v;
        }
        cur = R(cur.Parent);
      }
      if (d.AS instanceof Name) return d.AS.name !== 'Off';
      return undefined;
    }
    for (const [, d] of objs) {
      if (!d || typeof d !== 'object' || d instanceof Ref || Array.isArray(d)) continue;
      if (d.T === undefined) continue;
      if (seen.has(d)) continue; seen.add(d);
      const name = fullName(d); if (!name) continue;
      let v = valueOf(d);
      if (v === undefined) {
        // Checkbox-Felder: Wert evtl. nur über /AS der Kinder
        const kids = R(d.Kids);
        if (Array.isArray(kids)) for (const k of kids) { const kd = R(k); if (kd && kd.AS instanceof Name && kd.AS.name !== 'Off') v = true; }
      }
      if (v === undefined || v === null) continue;
      if (fields[name] === undefined || (fields[name] === '' && v !== '')) fields[name] = v;
    }
    // Info-Dictionary/Keywords (für evtl. eingebettete Creator-Daten)
    return fields;
  }

  const api = { readFields, decodeStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PdfForm = api;
})(typeof window !== 'undefined' ? window : globalThis);
