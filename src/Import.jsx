import { useState } from "react";
import { kes, PageHead, Table } from "./ui.jsx";
import { btnPrimary } from "./Actions.jsx";
import { downloadCsv, btnGhost } from "./export.js";
import { normalizePhone, PHONE_HINT } from "./phone.js";

const KEYS = {
  unit: ["unit", "unitnumber", "unitno", "house", "housenumber", "houseno", "unitname"],
  rent: ["rent", "monthlyrent", "rentamount", "amount"],
  name: ["tenant", "tenantname", "name", "fullname"],
  phone: ["phone", "phonenumber", "mobile", "tel", "telephone"],
  deposit: ["deposit", "depositamount"],
};
const clean = (h) => String(h).toLowerCase().replace(/[^a-z]/g, "");
const num = (s) => { const n = Number(String(s ?? "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : NaN; };

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = first.includes(",") ? "," : first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function analyse(table, units) {
  const head = table[0].map(clean);
  const col = Object.fromEntries(Object.entries(KEYS).map(([k, names]) => [k, head.findIndex((h) => names.includes(h))]));
  if (col.unit < 0) return { error: "Could not find a unit column. The first row must have headings such as: unit, rent, tenant_name, phone, deposit." };
  const byNo = Object.fromEntries(units.map((u) => [u.unit_number.toLowerCase(), u]));
  const seen = new Set();
  const get = (r, k) => (col[k] >= 0 ? String(r[col[k]] ?? "").trim() : "");
  const rows = table.slice(1, 501).map((r, i) => {
    const unit = get(r, "unit"), name = get(r, "name"), phoneRaw = get(r, "phone"), depRaw = get(r, "deposit");
    const rent = num(get(r, "rent")), deposit = depRaw ? num(depRaw) : 0;
    const base = { line: i + 2, unit, rent, name, deposit, phone: "" };
    if (!unit) return { ...base, status: "error", note: "Unit is missing" };
    if (seen.has(unit.toLowerCase())) return { ...base, status: "error", note: "Unit appears twice in the file" };
    seen.add(unit.toLowerCase());
    let phone = "";
    if (name) {
      phone = normalizePhone(phoneRaw);
      if (!phone) return { ...base, status: "error", note: PHONE_HINT };
    }
    if (depRaw && !/\d/.test(depRaw)) return { ...base, status: "error", note: "Deposit is not a number" };
    const ex = byNo[unit.toLowerCase()];
    if (ex) {
      if (!name) return { ...base, status: "skip", note: "Unit already exists, left unchanged" };
      if (ex.state !== "vacant") return { ...base, status: "skip", note: "Unit already has a tenant, left unchanged" };
      return { ...base, phone, status: "tenant_only", note: "Existing unit, tenant will be added" };
    }
    if (!(rent > 0)) return { ...base, status: "error", note: "Rent is missing or not a number" };
    return { ...base, phone, status: name ? "unit_tenant" : "unit", note: name ? "New unit and tenant" : "New unit" };
  });
  return { rows, extra: Math.max(0, table.length - 501) };
}

const TONE = { error: "text-red-300", skip: "text-slate-400", unit: "text-emerald-300", unit_tenant: "text-emerald-300", tenant_only: "text-emerald-300" };

export default function Import({ supabase, propertyId, units, canEdit = true, onDone }) {
  const [res, setRes] = useState(null);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canEdit) return <div className="space-y-4"><PageHead title="Import data" /><p className="text-sm text-slate-500">Only an owner can import data.</p></div>;

  const load = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(""); setFileName(file.name);
    const table = parseCsv(await file.text());
    if (table.length < 2) return setRes({ error: "The file has no data rows." });
    setRes(analyse(table, units));
  };

  const rows = res?.rows ?? [];
  const todo = rows.filter((r) => ["unit", "unit_tenant", "tenant_only"].includes(r.status));
  const errors = rows.filter((r) => r.status === "error").length;
  const nUnits = todo.filter((r) => r.status !== "tenant_only").length;
  const nTenants = todo.filter((r) => r.status !== "unit").length;

  const run = async () => {
    setBusy(true); setMsg("");
    const idByNo = Object.fromEntries(units.map((u) => [u.unit_number.toLowerCase(), u.unit_id]));
    const newUnits = todo.filter((r) => r.status !== "tenant_only");
    if (newUnits.length) {
      const { data, error } = await supabase.from("units")
        .insert(newUnits.map((r) => ({ property_id: propertyId, unit_number: r.unit, rent_amount: r.rent }))).select("id, unit_number");
      if (error) { setBusy(false); return setMsg("Error adding units: " + error.message); }
      for (const u of data) idByNo[u.unit_number.toLowerCase()] = u.id;
    }
    const tenants = todo.filter((r) => r.status !== "unit");
    if (tenants.length) {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("tenants").insert(tenants.map((r) => ({
        unit_id: idByNo[r.unit.toLowerCase()], full_name: r.name, phone: r.phone,
        ...(r.deposit > 0 ? { deposit_amount: r.deposit, deposit_received_on: today } : {}),
      })));
      if (error) { setBusy(false); onDone?.(); return setMsg(`The units were added, but adding tenants failed: ${error.message}. Fix the file and import it again. The units that now exist will be skipped.`); }
    }
    setBusy(false); setRes(null); setFileName("");
    setMsg(`Imported ${nUnits} unit${nUnits === 1 ? "" : "s"} and ${nTenants} tenant${nTenants === 1 ? "" : "s"}.`);
    onDone?.();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Import data" hint="Add many units and tenants at once from a spreadsheet saved as CSV.">
        <button className={btnGhost} onClick={() => downloadCsv("sova-import-template.csv",
          ["unit", "rent", "tenant_name", "phone", "deposit"],
          [["A1", 7500, "Jane Wanjiku", "0712345678", 7500], ["A2", 8000, "", "", ""]])}>Download template</button>
      </PageHead>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-300">
        <li>Download the template and fill it in, one row per unit. Leave the tenant columns empty for vacant units.</li>
        <li>In Excel, choose <b>Save as</b> and pick <b>CSV</b>.</li>
        <li>Choose the file below. You'll see a preview before anything is saved.</li>
      </ol>
      <p className="text-xs text-slate-400">Units are added to the property selected at the top. Existing units are never changed. Deposits are recorded as received today. Tenants are billed from the next 1st.</p>
      <input type="file" accept=".csv,text/csv" onChange={load} className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-200" />
      {res?.error && <p className="text-sm text-red-400">{res.error}</p>}
      {msg && <p className={`text-sm ${msg.startsWith("Imported") ? "text-emerald-300" : "text-red-400"}`}>{msg}</p>}
      {rows.length > 0 && (
        <>
          <p className="text-sm text-slate-300">{fileName}: {rows.length} row{rows.length === 1 ? "" : "s"} · {todo.length} ready · {errors} with problems{res.extra ? ` · ${res.extra} extra rows ignored (500 maximum)` : ""}</p>
          <Table head={["Row", "Unit", "Rent", "Tenant", "Phone", "Deposit", "Result"]}>
            {rows.map((r) => (
              <tr key={r.line}>
                <td className="px-4 py-2 text-slate-500">{r.line}</td>
                <td className="px-4 py-2 font-medium text-white">{r.unit}</td>
                <td className="px-4 py-2">{r.rent > 0 ? kes(r.rent) : "—"}</td>
                <td className="px-4 py-2">{r.name || "—"}</td>
                <td className="px-4 py-2 text-slate-400">{r.phone || "—"}</td>
                <td className="px-4 py-2">{r.deposit > 0 ? kes(r.deposit) : "—"}</td>
                <td className={`px-4 py-2 ${TONE[r.status]}`}>{r.note}</td>
              </tr>
            ))}
          </Table>
          <button className={`${btnPrimary} w-full py-3`} disabled={busy || todo.length === 0 || !propertyId} onClick={run}>
            {busy ? "Importing…" : errors > 0 ? `Import ${todo.length} ready rows (skip ${errors} with problems)` : `Import ${todo.length} row${todo.length === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </div>
  );
}
