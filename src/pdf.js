// A small PDF writer with no dependencies: A4 pages, Helvetica text, lines, boxes, charts and tables.
// Coordinates are in points from the TOP-LEFT of the page. A4 = 595 x 842 points.
const REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const EXTRA = {"\u00b7": [183, 278, 278], "\u00d7": [215, 584, 584], "\u00f7": [247, 584, 584], "\u2014": [151, 1000, 1000], "\u2013": [150, 556, 556], "\u2026": [133, 1000, 1000], "\u2022": [149, 350, 350], "\u2019": [146, 222, 278], "\u2018": [145, 222, 278], "\u201c": [147, 333, 500], "\u201d": [148, 333, 500], "\u00e9": [233, 556, 556], "\u00a0": [160, 278, 278]}; // [byte, regular width, bold width]

const hex = (c) => {
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(" ");
};
const esc = (s) => s.replace(/[\\()]/g, (m) => "\\" + m);

function bytesOf(str) {
  let out = "";
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c <= 126) out += ch;
    else if (EXTRA[ch]) out += String.fromCharCode(EXTRA[ch][0]);
    else out += "?";
  }
  return out;
}

export function textWidth(str, size, bold = false) {
  let w = 0;
  for (const ch of str) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c <= 126) w += REG[c - 32] !== undefined ? (bold ? BOLD[c - 32] : REG[c - 32]) : 556;
    else if (EXTRA[ch]) w += bold ? EXTRA[ch][2] : EXTRA[ch][1];
    else w += 556;
  }
  return (w * size) / 1000;
}

export class Pdf {
  constructor() {
    this.W = 595.28; this.H = 841.89; this.margin = 40;
    this.pages = []; this.newPage();
  }
  newPage() { this.cur = []; this.pages.push(this.cur); this.y = this.margin; return this; }
  get bottom() { return this.H - this.margin - 18; }
  ensure(h) { if (this.y + h > this.bottom) this.newPage(); }
  op(s) { this.cur.push(s); }

  text(str, x, y, { size = 10, bold = false, color = "#111827", align = "left" } = {}) {
    const s = String(str ?? "");
    const w = textWidth(s, size, bold);
    const px = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    this.op(`BT /${bold ? "F2" : "F1"} ${size} Tf ${hex(color)} rg ${px.toFixed(2)} ${(this.H - y).toFixed(2)} Td (${esc(bytesOf(s))}) Tj ET`);
  }
  fit(str, maxW, size, bold = false) {
    let s = String(str ?? "");
    if (textWidth(s, size, bold) <= maxW) return s;
    while (s.length > 1 && textWidth(s + "…", size, bold) > maxW) s = s.slice(0, -1);
    return s + "…";
  }
  line(x1, y1, x2, y2, { color = "#CBD5E1", width = 0.6 } = {}) {
    this.op(`${hex(color)} RG ${width} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`);
  }
  rect(x, y, w, h, { fill, stroke, width = 0.6 } = {}) {
    const r = `${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`;
    if (fill) this.op(`${hex(fill)} rg ${r} f`);
    if (stroke) this.op(`${hex(stroke)} RG ${width} w ${r} S`);
  }
  polyline(points, { color = "#2563EB", width = 1.6 } = {}) {
    if (points.length < 2) return;
    const p = points.map(([x, y], i) => `${x.toFixed(2)} ${(this.H - y).toFixed(2)} ${i ? "l" : "m"}`).join(" ");
    this.op(`${hex(color)} RG ${width} w 1 j 1 J ${p} S`);
  }
  circle(cx, cy, r, { fill = "#2563EB" } = {}) {
    const k = 0.5523 * r, X = cx, Y = this.H - cy;
    this.op(`${hex(fill)} rg ${(X + r).toFixed(2)} ${Y.toFixed(2)} m ` +
      `${(X + r).toFixed(2)} ${(Y + k).toFixed(2)} ${(X + k).toFixed(2)} ${(Y + r).toFixed(2)} ${X.toFixed(2)} ${(Y + r).toFixed(2)} c ` +
      `${(X - k).toFixed(2)} ${(Y + r).toFixed(2)} ${(X - r).toFixed(2)} ${(Y + k).toFixed(2)} ${(X - r).toFixed(2)} ${Y.toFixed(2)} c ` +
      `${(X - r).toFixed(2)} ${(Y - k).toFixed(2)} ${(X - k).toFixed(2)} ${(Y - r).toFixed(2)} ${X.toFixed(2)} ${(Y - r).toFixed(2)} c ` +
      `${(X + k).toFixed(2)} ${(Y - r).toFixed(2)} ${(X + r).toFixed(2)} ${(Y - k).toFixed(2)} ${(X + r).toFixed(2)} ${Y.toFixed(2)} c f`);
  }

  // Adds the footer to every page and returns the finished file as bytes.
  finish(footerLeft = "SOVA · Property management") {
    const total = this.pages.length;
    this.pages.forEach((ops, i) => {
      this.cur = ops;
      this.line(this.margin, this.H - this.margin - 8, this.W - this.margin, this.H - this.margin - 8, { color: "#E2E8F0" });
      this.text(footerLeft, this.margin, this.H - this.margin + 6, { size: 8, color: "#64748B" });
      this.text(`Page ${i + 1} of ${total}`, this.W - this.margin, this.H - this.margin + 6, { size: 8, color: "#64748B", align: "right" });
    });
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    add("<< /Type /Catalog /Pages 2 0 R >>");
    add(`<< /Type /Pages /Kids [${this.pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] /Count ${total} >>`);
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    this.pages.forEach((ops, i) => {
      const content = ops.join("\n");
      add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
      add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    let out = "%PDF-1.4\n"; const offsets = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("");
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return bytes;
  }
}
