export const btnGhost = "rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800";

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const money = (n) => "KES " + Number(n || 0).toLocaleString("en-KE");
export const day = (d) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "");

// Downloads a CSV that Excel opens correctly (UTF-8 with a byte-order mark).
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    let s = typeof v === "number" ? String(v) : String(v ?? "");
    if (typeof v === "string" && /^[=+\-@]/.test(s)) s = "'" + s; // stops spreadsheet formulas
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens a clean printable page (use "Save as PDF" in the print dialog).
export function printDoc(title, body) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups for this site to print."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:720px;margin:32px auto;padding:0 20px}
    .brand{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1D4ED8;padding-bottom:10px;margin-bottom:20px}
    .brand b{font-size:26px;color:#1D4ED8;letter-spacing:1px}.brand span{font-size:12px;color:#6b7280}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#6b7280;font-size:12px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    td,th{padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:13px}
    td.r,th.r{text-align:right}.total td{font-weight:bold;border-top:2px solid #111827}
    .box{background:#f3f4f6;border-radius:8px;padding:12px 14px;margin-top:18px;font-size:13px}
    h2{font-size:15px;margin:20px 0 6px;color:#1D4ED8}svg{width:100%;height:auto;display:block}.chart{margin:4px 0 14px;page-break-inside:avoid}tr{page-break-inside:avoid}
    @media print{body{margin:0}}
  </style></head><body>${body}</body></html>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 300);
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) alert("Please allow pop-ups for this site to open the report.");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Opens the phone's share sheet (WhatsApp, email and so on) with the file attached.
// Where that is not possible, the file is saved instead. Returns what happened.
export async function sharePdf(blob, filename, title) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return "shared"; }
    catch (err) { if (err?.name === "AbortError") return "cancelled"; }
  }
  downloadBlob(filename, blob);
  return "downloaded";
}
