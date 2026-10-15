import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { kes, PageHead, Table, inputCls } from "./ui.jsx";
import { downloadCsv, printDoc, esc, money, btnGhost } from "./export.js";
import { compute, BUCKETS } from "./analytics.js";
import { BarChart, StackedBars, LineChart, Donut, HBars, StackBar, monthLabel } from "./Charts.jsx";

const RANGES = { "6m": "Last 6 months", "12m": "Last 12 months", ytd: "This year", all: "All time" };
const KIND_COLORS = { water: "#38BDF8", electricity: "#FBBF24", garbage: "#A78BFA", other: "#94A3B8" };
const pct = (v) => (v == null ? "—" : Math.round(v * 100) + "%");
const card = "rounded-xl border border-slate-800 bg-slate-900/50 p-4";

// Draws a chart component to plain HTML, so it can go into the printable report.
function toHtml(element) {
  const div = document.createElement("div");
  const root = createRoot(div);
  flushSync(() => root.render(element));
  const html = div.innerHTML;
  root.unmount();
  return html;
}

async function inChunks(ids, run, size = 80) {
  const parts = [];
  for (let i = 0; i < ids.length; i += size) parts.push(ids.slice(i, i + size));
  const res = await Promise.all(parts.map(run));
  return res.flatMap((r) => r.data ?? []);
}

export default function Reports({ supabase, propertyId, propertyName = "", units }) {
  const [range, setRange] = useState("6m");
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    if (!propertyId) return setData(null);
    const ids = units.map((u) => u.unit_id);
    if (ids.length === 0) return setData({ invoices: [], payments: [], allocations: [], readings: [], requests: [], tenants: [] });
    setData(null);
    (async () => {
      const [inv, bal, readings, tenants, pay, req] = await Promise.all([
        inChunks(ids, (c) => supabase.from("invoices").select("id, unit_id, period, due_date, rent_amount, utilities_amount, adjustments_amount, total").in("unit_id", c)),
        inChunks(ids, (c) => supabase.from("invoice_balances").select("invoice_id, paid, balance").in("unit_id", c)),
        inChunks(ids, (c) => supabase.from("utility_readings").select("unit_id, kind, period, amount").in("unit_id", c)),
        inChunks(ids, (c) => supabase.from("tenants").select("unit_id, deposit_amount, deposit_received_on, deposit_refunded_on").in("unit_id", c)),
        supabase.from("payments").select("id, amount, paid_at, unit_id").eq("property_id", propertyId).eq("match_status", "matched").order("paid_at", { ascending: false }).limit(2000),
        supabase.from("maintenance_requests").select("status, priority, created_at").eq("property_id", propertyId),
      ]);
      const b = Object.fromEntries(bal.map((x) => [x.invoice_id, x]));
      const invoices = inv.map((i) => ({ ...i, paid: b[i.id]?.paid ?? 0, balance: b[i.id]?.balance ?? i.total }));
      const allocations = await inChunks(invoices.map((i) => i.id), (c) => supabase.from("payment_allocations").select("invoice_id, payment_id").in("invoice_id", c));
      setData({ invoices, payments: pay.data ?? [], allocations, readings, requests: req.data ?? [], tenants });
    })();
  }, [propertyId, units]);

  const r = useMemo(() => (data ? compute({ ...data, units, range, today }) : null), [data, units, range, today]);

  if (!propertyId) return <div className="space-y-4"><PageHead title="Reports & analytics" /><p className="text-sm text-slate-500">Choose a property first.</p></div>;
  if (!r) return <div className="space-y-4"><PageHead title="Reports & analytics" /><p className="text-sm text-slate-400">Loading…</p></div>;

  const labels = r.monthly.map((m) => monthLabel(m.month));
  const unitRows = r.unitRows.filter((u) => `${u.unit} ${u.tenant ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const kpi = (title, value, hint, tone = "text-white") => (
    <div className={card}><div className="text-xs uppercase text-slate-400">{title}</div><div className={`mt-1 text-xl font-semibold ${tone}`}>{value}</div>{hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}</div>
  );
  const rateTone = r.rate == null ? "text-white" : r.rate >= 0.9 ? "text-emerald-300" : r.rate >= 0.7 ? "text-amber-300" : "text-red-300";

  const csvMonthly = () => downloadCsv("sova-monthly.csv", ["Month", "Invoices", "Billed", "Collected", "Outstanding", "Collection rate"],
    r.monthly.map((m) => [m.month, m.count, m.billed, m.collected, m.outstanding, m.rate == null ? "" : Math.round(m.rate * 100) + "%"]));
  const csvUnits = () => downloadCsv("sova-by-unit.csv", ["Unit", "Tenant", "Billed", "Paid", "Balance", "Payments made", "Collection rate"],
    r.unitRows.map((u) => [u.unit, u.tenant ?? "", u.billed, u.paid, u.balance, u.payments, u.rate == null ? "" : Math.round(u.rate * 100) + "%"]));
  const csvArrears = () => downloadCsv("sova-arrears.csv", ["Unit", "Tenant", "Amount owed", "Days overdue (oldest)", "Unpaid invoices"],
    r.arrears.map((a) => [a.unit, a.tenant ?? "", a.owed, Math.max(0, a.oldest), a.invoices]));

  const csvAll = () => {
    const blank = [], rows = [];
    const section = (title, head, body) => { rows.push([title], head, ...body, blank); };
    section("Summary", ["Measure", "Value"], [
      ["Billed", r.billed], ["Collected", r.collected], ["Outstanding (this period)", r.outstanding], ["Collection rate", pct(r.rate)],
      ["Occupancy", `${r.units.occupied} of ${r.units.total} units`], ["Overdue right now", r.overdueTotal], ["Paid on time", pct(r.onTimeRate)], ["Deposits held", r.depositsHeld],
    ]);
    section("Month by month", ["Month", "Invoices", "Billed", "Collected", "Outstanding", "Collection rate"],
      r.monthly.map((m) => [m.month, m.count, m.billed, m.collected, m.outstanding, pct(m.rate)]));
    section("Money owed, by how late", ["Age", "Invoices", "Amount"], r.ageing.map((a) => [a.name, a.count, a.value]));
    section("Largest balances", ["Unit", "Tenant", "Owed", "Oldest overdue (days)"], r.arrears.map((a) => [a.unit, a.tenant ?? "", a.owed, Math.max(0, a.oldest)]));
    section("Performance by unit", ["Unit", "Tenant", "Billed", "Paid", "Balance", "Payments", "Rate"],
      r.unitRows.map((u) => [u.unit, u.tenant ?? "", u.billed, u.paid, u.balance, u.payments, pct(u.rate)]));
    downloadCsv("sova-full-report.csv", [`SOVA report: ${propertyName}`, RANGES[range], `Generated ${today}`], rows);
  };

  const print = () => {
    const chart = (title, node) => `<h2>${esc(title)}</h2><div class="chart">${toHtml(node)}</div>`;
    const payDays = r.payDays.some((c) => c > 0);
    printDoc("Report", `
      <div class="brand"><b>SOVA</b><span>Report · ${esc(RANGES[range])}</span></div>
      <h1>${esc(propertyName || "Property report")}</h1>
      <p class="muted">Generated ${esc(today)}</p>
      <table>
        <tr><td>Billed</td><td class="r">${money(r.billed)}</td></tr><tr><td>Collected</td><td class="r">${money(r.collected)}</td></tr>
        <tr><td>Outstanding (this period)</td><td class="r">${money(r.outstanding)}</td></tr><tr class="total"><td>Collection rate</td><td class="r">${pct(r.rate)}</td></tr>
        <tr><td>Occupancy</td><td class="r">${r.units.occupied} of ${r.units.total} units</td></tr>
        <tr><td>Overdue right now</td><td class="r">${money(r.overdueTotal)}</td></tr>
        <tr><td>Paid on time</td><td class="r">${pct(r.onTimeRate)}</td></tr>
        <tr><td>Deposits held</td><td class="r">${money(r.depositsHeld)}</td></tr>
      </table>
      ${chart("Billed vs collected", <BarChart light labels={labels} series={[{ name: "Billed", color: "#2563EB", values: r.monthly.map((m) => m.billed) }, { name: "Collected", color: "#059669", values: r.monthly.map((m) => m.collected) }]} tip={kes} />)}
      ${chart("Collection rate by month", <LineChart light color="#059669" labels={labels} values={r.monthly.map((m) => m.rate)} />)}
      <h2>Where the billing comes from</h2>
      <table><tr><td>Rent</td><td class="r">${money(r.breakdown.rent)}</td></tr><tr><td>Utilities</td><td class="r">${money(r.breakdown.util)}</td></tr><tr><td>Charges and credits (net)</td><td class="r">${money(r.breakdown.adj)}</td></tr></table>
      <h2>Money owed, by how late</h2>
      <table>${r.ageing.map((a) => `<tr><td>${esc(a.name)} (${a.count})</td><td class="r">${money(a.value)}</td></tr>`).join("")}</table>
      ${payDays ? chart("When tenants pay (payments by day of the month)", <BarChart light height={170} labels={r.payDays.map((_, i) => String(i + 1))} series={[{ name: "Payments", color: "#7C3AED", values: r.payDays }]} fmt={(v) => String(Math.round(v))} tip={(v) => `${v} payment${v === 1 ? "" : "s"}`} />) : ""}
      ${r.utilMonths.length ? chart("Water and electricity charges", <StackedBars light height={170} labels={r.utilMonths.map(monthLabel)} tip={kes} series={r.utilKinds.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), color: KIND_COLORS[k] ?? "#94A3B8", values: r.utilMonths.map((m) => r.uMonths[m][k] ?? 0) }))} />) : ""}
      ${r.arrears.length ? `<h2>Largest balances right now</h2><table><tr><th>Unit</th><th>Tenant</th><th class="r">Owed</th><th class="r">Oldest overdue</th></tr>${r.arrears.slice(0, 10).map((a) => `<tr><td>${esc(a.unit)}</td><td>${esc(a.tenant ?? "")}</td><td class="r">${money(a.owed)}</td><td class="r">${a.oldest > 0 ? a.oldest + " days" : "not yet due"}</td></tr>`).join("")}</table>` : ""}
      <h2>Month by month</h2>
      <table><tr><th>Month</th><th class="r">Billed</th><th class="r">Collected</th><th class="r">Outstanding</th><th class="r">Rate</th></tr>
        ${r.monthly.map((m) => `<tr><td>${esc(monthLabel(m.month))}</td><td class="r">${money(m.billed)}</td><td class="r">${money(m.collected)}</td><td class="r">${money(m.outstanding)}</td><td class="r">${pct(m.rate)}</td></tr>`).join("")}</table>
      ${r.unitRows.length ? `<h2>Performance by unit</h2><table><tr><th>Unit</th><th>Tenant</th><th class="r">Billed</th><th class="r">Paid</th><th class="r">Balance</th><th class="r">Rate</th></tr>${r.unitRows.map((u) => `<tr><td>${esc(u.unit)}</td><td>${esc(u.tenant ?? "")}</td><td class="r">${money(u.billed)}</td><td class="r">${money(u.paid)}</td><td class="r">${money(u.balance)}</td><td class="r">${pct(u.rate)}</td></tr>`).join("")}</table>` : ""}`);
  };

  return (
    <div className="space-y-4">
      <PageHead title="Reports & analytics" hint="How rent is being billed and collected for this property.">
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={range} onChange={(e) => setRange(e.target.value)}>
            {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className={btnGhost} onClick={csvAll}>Download (Excel)</button>
          <button className={btnGhost} onClick={print}>Print / save as PDF</button>
        </div>
      </PageHead>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {kpi("Billed", kes(r.billed), RANGES[range])}
        {kpi("Collected", kes(r.collected), "paid so far", "text-emerald-300")}
        {kpi("Outstanding", kes(r.outstanding), "not yet paid", "text-amber-300")}
        {kpi("Collection rate", pct(r.rate), "collected ÷ billed", rateTone)}
        {kpi("Occupancy", `${r.units.total ? Math.round((r.units.occupied / r.units.total) * 100) : 0}%`, `${r.units.occupied} of ${r.units.total} units`)}
        {kpi("Overdue now", kes(r.overdueTotal), "past the due date", r.overdueTotal > 0 ? "text-red-300" : "text-white")}
        {kpi("Paid on time", pct(r.onTimeRate), r.onTimeCount ? `of ${r.onTimeCount} settled invoices` : "no settled invoices yet")}
        {kpi("Deposits held", kes(r.depositsHeld), "on behalf of tenants")}
      </div>

      <div className={card}>
        <h3 className="mb-2 font-medium text-white">Billed vs collected</h3>
        <BarChart labels={labels} series={[{ name: "Billed", color: "#60A5FA", values: r.monthly.map((m) => m.billed) }, { name: "Collected", color: "#34D399", values: r.monthly.map((m) => m.collected) }]} tip={kes} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <h3 className="mb-2 font-medium text-white">Collection rate by month</h3>
          <LineChart w={420} labels={labels} values={r.monthly.map((m) => m.rate)} />
        </div>
        <div className={card}>
          <h3 className="mb-3 font-medium text-white">Where the billing comes from</h3>
          <StackBar fmt={kes} parts={[{ name: "Rent", value: r.breakdown.rent, color: "#60A5FA" }, { name: "Utilities", value: r.breakdown.util, color: "#38BDF8" }, { name: "Charges and credits (net)", value: r.breakdown.adj, color: "#FBBF24" }]} />
        </div>
        <div className={card}>
          <h3 className="mb-3 font-medium text-white">Money owed, by how late</h3>
          <HBars rows={r.ageing.map((a, i) => ({ name: `${a.name} (${a.count})`, value: a.value, color: ["#60A5FA", "#FBBF24", "#FB923C", "#F87171", "#DC2626"][i], text: kes(a.value) }))} empty="Nothing is owed. Well done." />
        </div>
        <div className={card}>
          <h3 className="mb-3 font-medium text-white">Occupancy</h3>
          <Donut center={`${r.units.total ? Math.round((r.units.occupied / r.units.total) * 100) : 0}%`} sub="occupied" parts={[{ name: "Occupied", value: r.units.occupied, color: "#34D399" }, { name: "Vacant", value: r.units.vacant, color: "#64748B" }]} />
        </div>
        <div className={card}>
          <h3 className="mb-1 font-medium text-white">When tenants pay</h3>
          <p className="mb-2 text-xs text-slate-500">Number of payments by day of the month</p>
          <BarChart w={420} height={180} labels={r.payDays.map((_, i) => String(i + 1))} series={[{ name: "Payments", color: "#A78BFA", values: r.payDays }]} fmt={(v) => String(Math.round(v))} tip={(v) => `${v} payment${v === 1 ? "" : "s"}`} />
        </div>
        <div className={card}>
          <h3 className="mb-1 font-medium text-white">Water and electricity charges</h3>
          <p className="mb-2 text-xs text-slate-500">By the month the meter was read</p>
          <StackedBars w={420} height={180} labels={r.utilMonths.map(monthLabel)} tip={kes}
            series={r.utilKinds.map((k) => ({ name: k[0].toUpperCase() + k.slice(1), color: KIND_COLORS[k] ?? "#94A3B8", values: r.utilMonths.map((m) => r.uMonths[m][k] ?? 0) }))} />
        </div>
        <div className={`${card} md:col-span-2`}>
          <h3 className="mb-3 font-medium text-white">Maintenance</h3>
          {r.maintenance.total === 0 ? <p className="text-sm text-slate-500">No maintenance requests yet.</p> : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div><div className="mb-2 text-xs uppercase text-slate-400">By status</div><HBars rows={r.maintenance.byStatus.map((s) => ({ name: s.name.replace("_", " "), value: s.value, color: "#38BDF8", text: String(s.value) }))} /></div>
              <div><div className="mb-2 text-xs uppercase text-slate-400">By priority</div><HBars rows={r.maintenance.byPriority.map((s) => ({ name: s.name, value: s.value, color: s.name === "high" ? "#F87171" : s.name === "medium" ? "#FBBF24" : "#94A3B8", text: String(s.value) }))} /></div>
            </div>
          )}
        </div>
      </div>

      <div className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-white">Largest balances right now</h3>
          <button className={btnGhost} disabled={r.arrears.length === 0} onClick={csvArrears}>Download CSV</button>
        </div>
        <Table head={["Unit", "Tenant", "Owed", "Oldest overdue", "Unpaid invoices"]} empty="Nobody owes anything.">
          {r.arrears.slice(0, 10).map((a) => (
            <tr key={a.unit_id}>
              <td className="px-4 py-3 font-semibold text-emerald-300">{a.unit}</td><td className="px-4 py-3">{a.tenant ?? "—"}</td>
              <td className="px-4 py-3 text-red-300">{kes(a.owed)}</td>
              <td className="px-4 py-3 text-slate-400">{a.oldest > 0 ? `${a.oldest} days` : "not yet due"}</td><td className="px-4 py-3">{a.invoices}</td>
            </tr>
          ))}
        </Table>
      </div>

      <div className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-white">Performance by unit</h3>
          <div className="flex gap-2"><input className={`${inputCls} w-40`} placeholder="Search unit…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className={btnGhost} disabled={r.unitRows.length === 0} onClick={csvUnits}>Download CSV</button></div>
        </div>
        <Table head={["Unit", "Tenant", "Billed", "Paid", "Balance", "Payments", "Rate"]} empty="No invoices in this period.">
          {unitRows.map((u) => (
            <tr key={u.unit_id}>
              <td className="px-4 py-3 font-semibold text-emerald-300">{u.unit}</td><td className="px-4 py-3">{u.tenant ?? "—"}</td>
              <td className="px-4 py-3">{kes(u.billed)}</td><td className="px-4 py-3">{kes(u.paid)}</td>
              <td className={`px-4 py-3 ${u.balance > 0 ? "text-red-300" : ""}`}>{kes(u.balance)}</td>
              <td className="px-4 py-3">{u.payments}</td><td className="px-4 py-3">{pct(u.rate)}</td>
            </tr>
          ))}
        </Table>
      </div>

      <div className={card}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-white">Month by month</h3>
          <button className={btnGhost} disabled={r.monthly.length === 0} onClick={csvMonthly}>Download CSV</button>
        </div>
        <Table head={["Month", "Invoices", "Billed", "Collected", "Outstanding", "Rate"]} empty="No invoices to report on yet.">
          {[...r.monthly].reverse().map((m) => (
            <tr key={m.month}>
              <td className="px-4 py-3">{new Date(m.month + "-01").toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</td>
              <td className="px-4 py-3">{m.count}</td><td className="px-4 py-3">{kes(m.billed)}</td><td className="px-4 py-3">{kes(m.collected)}</td>
              <td className="px-4 py-3">{kes(m.outstanding)}</td><td className="px-4 py-3">{pct(m.rate)}</td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
