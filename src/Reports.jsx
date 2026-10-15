import { useEffect, useMemo, useState } from "react";
import { kes, PageHead, Table, inputCls } from "./ui.jsx";
import { downloadBlob, openBlob, sharePdf, btnGhost } from "./export.js";
import { buildReportPdf } from "./reportPdf.js";
import { compute, BUCKETS } from "./analytics.js";
import { BarChart, StackedBars, LineChart, Donut, HBars, StackBar, monthLabel } from "./Charts.jsx";

const RANGES = { "6m": "Last 6 months", "12m": "Last 12 months", ytd: "This year", all: "All time" };
const KIND_COLORS = { water: "#38BDF8", electricity: "#FBBF24", garbage: "#A78BFA", other: "#94A3B8" };
const pct = (v) => (v == null ? "—" : Math.round(v * 100) + "%");
const card = "rounded-xl border border-slate-800 bg-slate-900/50 p-4";

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
  const [note, setNote] = useState("");
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

  const makePdf = () => new Blob([buildReportPdf({ r, propertyName, rangeLabel: RANGES[range], today, monthLabel, kindColors: KIND_COLORS })], { type: "application/pdf" });
  const fileName = `sova-report-${(propertyName || "property").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${range}.pdf`;
  const downloadPdf = () => { downloadBlob(fileName, makePdf()); setNote("Saved. You can attach the PDF in WhatsApp or an email."); };
  const share = async () => {
    const how = await sharePdf(makePdf(), fileName, `${propertyName} report`);
    setNote(how === "downloaded" ? "Saved to your device. Open WhatsApp and attach the PDF." : "");
  };

  return (
    <div className="space-y-4">
      <PageHead title="Reports & analytics" hint="How rent is being billed and collected for this property.">
        <div className="flex flex-wrap gap-2">
          <select className={inputCls} value={range} onChange={(e) => setRange(e.target.value)}>
            {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className={btnGhost} onClick={downloadPdf}>Download PDF</button>
          <button className={btnGhost} onClick={share}>Share</button>
          <button className={btnGhost} onClick={() => openBlob(makePdf())}>Print</button>
        </div>
      </PageHead>

      {note && <p className="text-sm text-emerald-300">{note}</p>}
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
          <BarChart w={420} height={180} intAxis labels={r.payDays.map((_, i) => String(i + 1))} series={[{ name: "Payments", color: "#A78BFA", values: r.payDays }]} fmt={(v) => String(Math.round(v))} tip={(v) => `${v} payment${v === 1 ? "" : "s"}`} />
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
          <input className={`${inputCls} w-40`} placeholder="Search unit…" value={q} onChange={(e) => setQ(e.target.value)} />
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
