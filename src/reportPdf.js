// Builds the Reports & analytics PDF: header, figures, charts and tables.
import { Pdf, textWidth } from "./pdf.js";

const BLUE = "#1D4ED8", INK = "#111827", MUTED = "#64748B", GRID = "#E2E8F0", HEAD = "#F1F5F9";
const kes = (n) => "KES " + Math.round(Number(n) || 0).toLocaleString("en-KE");
const pct = (v) => (v == null ? "-" : Math.round(v * 100) + "%");
const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + "k";
  return String(Math.round(v));
};
const niceMax = (max) => {
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

function heading(pdf, text) {
  pdf.ensure(48);
  pdf.y += 12;
  pdf.text(text, pdf.margin, pdf.y + 10, { size: 12, bold: true, color: BLUE });
  pdf.y += 24;
}

function legend(pdf, items) {
  let x = pdf.margin + 38;
  for (const it of items) {
    pdf.rect(x, pdf.y - 7, 8, 8, { fill: it.color });
    pdf.text(it.name, x + 12, pdf.y, { size: 8, color: MUTED });
    x += 12 + textWidth(it.name, 8) + 18;
  }
  pdf.y += 14;
}

// Two columns: a name on the left and a figure on the right.
function figures(pdf, rows) {
  const w = pdf.W - 2 * pdf.margin;
  for (const [name, value, strong] of rows) {
    pdf.ensure(20);
    pdf.text(name, pdf.margin + 4, pdf.y + 13, { size: 10, bold: !!strong });
    pdf.text(value, pdf.margin + w - 4, pdf.y + 13, { size: 10, bold: true, align: "right" });
    pdf.line(pdf.margin, pdf.y + 20, pdf.margin + w, pdf.y + 20, { color: GRID });
    pdf.y += 20;
  }
}

// cols: [{ label, w (share of the width), align }]
function table(pdf, cols, rows, empty = "Nothing to show.") {
  const total = pdf.W - 2 * pdf.margin;
  const xs = []; let acc = pdf.margin;
  cols.forEach((c) => { xs.push(acc); acc += c.w * total; });
  const drawHead = () => {
    pdf.rect(pdf.margin, pdf.y, total, 20, { fill: HEAD });
    cols.forEach((c, i) => {
      const x = c.align === "right" ? xs[i] + c.w * total - 6 : xs[i] + 6;
      pdf.text(c.label.toUpperCase(), x, pdf.y + 13, { size: 7.5, bold: true, color: MUTED, align: c.align });
    });
    pdf.y += 20;
  };
  pdf.ensure(60);
  drawHead();
  if (rows.length === 0) { pdf.text(empty, pdf.margin + 6, pdf.y + 14, { size: 9, color: MUTED }); pdf.y += 22; return; }
  for (const row of rows) {
    if (pdf.y + 18 > pdf.bottom) { pdf.newPage(); drawHead(); }
    row.forEach((cell, i) => {
      const c = cols[i];
      const s = pdf.fit(cell, c.w * total - 12, 9);
      const x = c.align === "right" ? xs[i] + c.w * total - 6 : xs[i] + 6;
      pdf.text(s, x, pdf.y + 12, { size: 9, align: c.align });
    });
    pdf.line(pdf.margin, pdf.y + 18, pdf.margin + total, pdf.y + 18, { color: GRID });
    pdf.y += 18;
  }
}

function axes(pdf, x0, top, plotW, plotH, max, fmt, ticks = 4) {
  for (let i = 0; i <= ticks; i++) {
    const v = (max * i) / ticks, y = top + plotH * (1 - i / ticks);
    pdf.line(x0, y, x0 + plotW, y, { color: GRID });
    pdf.text(fmt(v), x0 - 5, y + 3, { size: 7.5, color: MUTED, align: "right" });
  }
}

function bars(pdf, { labels, series, height = 150, stacked = false, fmt = compact, intAxis = false }) {
  if (!labels.length) return;
  pdf.ensure(height + 36);
  const x0 = pdf.margin + 38, plotW = pdf.W - 2 * pdf.margin - 42, top = pdf.y + 6, plotH = height - 26;
  const totals = labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
  const raw = Math.max(1, ...(stacked ? totals : series.flatMap((s) => s.values)));
  const max = intAxis ? Math.max(4, Math.ceil(raw / 4) * 4) : niceMax(raw);
  axes(pdf, x0, top, plotW, plotH, max, fmt);
  const gw = plotW / labels.length;
  const bw = stacked ? Math.min(30, gw - 8) : Math.max(2, Math.min(22, (gw - 6) / series.length));
  const every = labels.length > 14 ? Math.ceil(labels.length / 12) : 1;
  labels.forEach((lab, i) => {
    const gx = x0 + gw * i;
    if (stacked) {
      let acc = 0;
      series.forEach((s) => {
        const h = (s.values[i] / max) * plotH;
        pdf.rect(gx + (gw - bw) / 2, top + plotH - ((acc + s.values[i]) / max) * plotH, bw, h, { fill: s.color });
        acc += s.values[i];
      });
    } else {
      series.forEach((s, j) => {
        const h = (s.values[i] / max) * plotH;
        pdf.rect(gx + (gw - bw * series.length) / 2 + bw * j, top + plotH - h, bw - 0.5, h, { fill: s.color });
      });
    }
    if (i % every === 0) pdf.text(lab, gx + gw / 2, top + plotH + 12, { size: 7.5, color: MUTED, align: "center" });
  });
  pdf.y += height + 8;
  if (series.length > 1 || stacked) legend(pdf, series);
  pdf.y += 4;
}

function line(pdf, { labels, values, height = 130 }) {
  const pts = values.map((v, i) => (v == null ? null : [i, v])).filter(Boolean);
  if (!pts.length) return;
  pdf.ensure(height + 24);
  const x0 = pdf.margin + 38, plotW = pdf.W - 2 * pdf.margin - 60, top = pdf.y + 6, plotH = height - 26;
  axes(pdf, x0, top, plotW, plotH, 1, (v) => Math.round(v * 100) + "%");
  const px = (i) => x0 + (labels.length === 1 ? plotW / 2 : (plotW * i) / (labels.length - 1));
  const py = (v) => top + plotH * (1 - Math.min(1, Math.max(0, v)));
  pdf.polyline(pts.map(([i, v]) => [px(i), py(v)]), { color: "#059669", width: 1.8 });
  pts.forEach(([i, v]) => pdf.circle(px(i), py(v), 2.6, { fill: "#059669" }));
  const every = labels.length > 14 ? Math.ceil(labels.length / 12) : 1;
  labels.forEach((lab, i) => { if (i % every === 0) pdf.text(lab, px(i), top + plotH + 12, { size: 7.5, color: MUTED, align: "center" }); });
  pdf.y += height + 4;
}

export function buildReportPdf({ r, propertyName, rangeLabel, today, monthLabel, kindColors = {} }) {
  const pdf = new Pdf();
  const labels = r.monthly.map((m) => monthLabel(m.month));

  pdf.text("SOVA", pdf.margin, pdf.margin + 18, { size: 22, bold: true, color: BLUE });
  pdf.text(`Report · ${rangeLabel}`, pdf.W - pdf.margin, pdf.margin + 18, { size: 9, color: MUTED, align: "right" });
  pdf.line(pdf.margin, pdf.margin + 28, pdf.W - pdf.margin, pdf.margin + 28, { color: BLUE, width: 1.5 });
  pdf.text(propertyName || "Property report", pdf.margin, pdf.margin + 58, { size: 16, bold: true });
  pdf.text(`Generated ${today}`, pdf.margin, pdf.margin + 74, { size: 9, color: MUTED });
  pdf.y = pdf.margin + 86;

  figures(pdf, [
    ["Billed", kes(r.billed)], ["Collected", kes(r.collected)], ["Outstanding (this period)", kes(r.outstanding)],
    ["Collection rate", pct(r.rate), true], ["Occupancy", `${r.units.occupied} of ${r.units.total} units`],
    ["Overdue right now", kes(r.overdueTotal)], ["Paid on time", pct(r.onTimeRate)], ["Deposits held", kes(r.depositsHeld)],
  ]);

  heading(pdf, "Billed vs collected");
  bars(pdf, { labels, series: [{ name: "Billed", color: "#2563EB", values: r.monthly.map((m) => m.billed) }, { name: "Collected", color: "#059669", values: r.monthly.map((m) => m.collected) }] });

  heading(pdf, "Collection rate by month");
  line(pdf, { labels, values: r.monthly.map((m) => m.rate) });

  heading(pdf, "Where the billing comes from");
  table(pdf, [{ label: "Item", w: 0.6 }, { label: "Amount", w: 0.4, align: "right" }], [["Rent", kes(r.breakdown.rent)], ["Utilities", kes(r.breakdown.util)], ["Charges and credits (net)", kes(r.breakdown.adj)]]);

  heading(pdf, "Money owed, by how late");
  table(pdf, [{ label: "Age", w: 0.5 }, { label: "Invoices", w: 0.2, align: "right" }, { label: "Amount", w: 0.3, align: "right" }], r.ageing.map((a) => [a.name, String(a.count), kes(a.value)]));

  if (r.payDays.some((c) => c > 0)) {
    heading(pdf, "When tenants pay (payments by day of the month)");
    bars(pdf, { labels: r.payDays.map((_, i) => String(i + 1)), series: [{ name: "Payments", color: "#7C3AED", values: r.payDays }], height: 120, intAxis: true, fmt: (v) => String(Math.round(v)) });
  }
  if (r.utilMonths.length) {
    heading(pdf, "Water and electricity charges");
    bars(pdf, { labels: r.utilMonths.map(monthLabel), height: 120, stacked: true,
      series: r.utilKinds.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), color: kindColors[k] ?? "#94A3B8", values: r.utilMonths.map((m) => r.uMonths[m][k] ?? 0) })) });
  }
  if (r.maintenance.total > 0) {
    heading(pdf, "Maintenance requests");
    table(pdf, [{ label: "Status", w: 0.6 }, { label: "Requests", w: 0.4, align: "right" }], r.maintenance.byStatus.map((s) => [s.name.replace("_", " "), String(s.value)]));
  }

  heading(pdf, "Largest balances right now");
  table(pdf, [{ label: "Unit", w: 0.12 }, { label: "Tenant", w: 0.38 }, { label: "Owed", w: 0.25, align: "right" }, { label: "Oldest overdue", w: 0.25, align: "right" }],
    r.arrears.slice(0, 10).map((a) => [a.unit, a.tenant ?? "", kes(a.owed), a.oldest > 0 ? `${a.oldest} days` : "not yet due"]), "Nobody owes anything.");

  heading(pdf, "Month by month");
  table(pdf, [{ label: "Month", w: 0.2 }, { label: "Invoices", w: 0.12, align: "right" }, { label: "Billed", w: 0.2, align: "right" }, { label: "Collected", w: 0.2, align: "right" }, { label: "Outstanding", w: 0.18, align: "right" }, { label: "Rate", w: 0.1, align: "right" }],
    r.monthly.map((m) => [monthLabel(m.month), String(m.count), kes(m.billed), kes(m.collected), kes(m.outstanding), pct(m.rate)]), "No invoices in this period.");

  heading(pdf, "Performance by unit");
  table(pdf, [{ label: "Unit", w: 0.1 }, { label: "Tenant", w: 0.3 }, { label: "Billed", w: 0.17, align: "right" }, { label: "Paid", w: 0.17, align: "right" }, { label: "Balance", w: 0.16, align: "right" }, { label: "Rate", w: 0.1, align: "right" }],
    r.unitRows.map((u) => [u.unit, u.tenant ?? "", kes(u.billed), kes(u.paid), kes(u.balance), pct(u.rate)]), "No invoices in this period.");

  return pdf.finish();
}
