import { useEffect, useState } from "react";
import { kes, Badge, PageHead, Table, Modal, Row, inputCls } from "./ui.jsx";
import { downloadCsv, printDoc, esc, money, day, btnGhost } from "./export.js";
import { btnPrimary } from "./Actions.jsx";

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const used = (u) => Number(u.current_reading) - Number(u.previous_reading);

export default function Invoices({ supabase, units, canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [det, setDet] = useState(null);
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState(false);
  const [adj, setAdj] = useState({ kind: "charge", description: "", amount: "" });
  const [adjMsg, setAdjMsg] = useState("");
  const [adjBusy, setAdjBusy] = useState(false);
  const byId = Object.fromEntries(units.map((u) => [u.unit_id, u]));

  useEffect(() => {
    if (units.length === 0) return;
    supabase.from("invoice_balances").select("*")
      .in("unit_id", units.map((u) => u.unit_id))
      .order("period", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, [units, tick]);

  useEffect(() => {
    setAdding(false); setAdjMsg("");
    if (!sel) return setDet(null);
    (async () => {
      const { data: inv } = await supabase.from("invoices").select("rent_amount, utilities_amount, total, due_date, created_at").eq("id", sel.invoice_id).maybeSingle();
      const { data: al } = await supabase.from("payment_allocations").select("amount, payment_id").eq("invoice_id", sel.invoice_id);
      const ids = (al ?? []).map((a) => a.payment_id);
      const { data: pay } = ids.length ? await supabase.from("payments").select("id, trans_id, paid_at, payer_name").in("id", ids) : { data: [] };
      const [py, pm] = sel.period.slice(0, 7).split("-").map(Number);
      const prevPeriod = pm === 1 ? `${py - 1}-12-01` : `${py}-${String(pm - 1).padStart(2, "0")}-01`;
      const { data: adjRows } = await supabase.from("invoice_adjustments")
        .select("id, kind, description, amount").eq("invoice_id", sel.invoice_id).order("created_at");
      const { data: util } = await supabase.from("utility_readings")
        .select("kind, previous_reading, current_reading, rate, amount").eq("unit_id", sel.unit_id).eq("period", prevPeriod);
      setDet({ inv, al: al ?? [], pay: Object.fromEntries((pay ?? []).map((p) => [p.id, p])), util: util ?? [], adj: adjRows ?? [] });
    })();
  }, [sel]);

  const today = new Date().toISOString().slice(0, 10);
  const state = (i) => (Number(i.balance) <= 0 ? "paid" : i.due_date < today ? "overdue" : "unpaid");
  const shown = rows.filter((i) => (byId[i.unit_id]?.unit_number ?? "").toLowerCase().includes(q.toLowerCase()));

  const addAdj = async () => {
    setAdjBusy(true); setAdjMsg("");
    const { error } = await supabase.rpc("add_invoice_adjustment", {
      p_invoice: sel.invoice_id, p_kind: adj.kind, p_description: adj.description.trim(), p_amount: Number(adj.amount),
    });
    setAdjBusy(false);
    if (error) return setAdjMsg(error.message);
    setAdj({ kind: "charge", description: "", amount: "" });
    setSel(null); setTick((t) => t + 1);
  };

  const removeAdj = async (a) => {
    if (!window.confirm(`Remove "${a.description}" from this invoice?`)) return;
    const { error } = await supabase.rpc("remove_invoice_adjustment", { p_adjustment: a.id });
    if (error) return setAdjMsg(error.message);
    setSel(null); setTick((t) => t + 1);
  };

  const printInvoice = async () => {
    const u = byId[sel.unit_id];
    const { data: pr } = await supabase.from("properties").select("name, pay_shortcode").eq("id", u.property_id).maybeSingle();
    const paid = (det?.al ?? []).map((a) => `<tr><td>${esc(det.pay[a.payment_id]?.trans_id ?? "Payment")} (${esc(day(det.pay[a.payment_id]?.paid_at))})</td><td class="r">${money(a.amount)}</td></tr>`).join("");
    printDoc(`Invoice ${u.unit_number}`, `
      <div class="brand"><b>SOVA</b><span>Invoice</span></div>
      <h1>${esc(pr?.name ?? "")}</h1>
      <p class="muted">Unit ${esc(u.unit_number)} · ${esc(u.tenant_name ?? "")}<br>Period: ${esc(new Date(sel.period).toLocaleDateString("en-KE", { month: "long", year: "numeric" }))} · Due: ${esc(day(sel.due_date))}</p>
      <table>
        <tr><th>Description</th><th class="r">Amount</th></tr>
        <tr><td>Rent</td><td class="r">${det?.inv ? money(det.inv.rent_amount) : ""}</td></tr>
        <tr><td>Utilities</td><td class="r">${det?.inv ? money(det.inv.utilities_amount) : ""}</td></tr>
        ${(det?.util ?? []).map((u) => `<tr><td class="muted">&nbsp;&nbsp;${esc(cap(u.kind))}: ${used(u)} × ${money(u.rate)}</td><td class="r muted">${money(u.amount)}</td></tr>`).join("")}
        ${(det?.adj ?? []).map((a) => `<tr><td class="muted">&nbsp;&nbsp;${a.kind === "credit" ? "Credit" : "Charge"}: ${esc(a.description)}</td><td class="r muted">${a.kind === "credit" ? "-" : ""}${money(a.amount)}</td></tr>`).join("")}
        <tr class="total"><td>Total</td><td class="r">${money(sel.total)}</td></tr>
      </table>
      ${paid ? `<p class="muted">Payments received</p><table>${paid}</table>` : ""}
      <table><tr class="total"><td>Balance due</td><td class="r">${money(sel.balance)}</td></tr></table>
      <div class="box">Pay via Paybill <b>${esc(pr?.pay_shortcode ?? "-")}</b>, Account Number: <b>${esc(u.account_ref)}</b></div>`);
  };

  return (
    <div className="space-y-4">
      <PageHead title="Invoices" hint="Monthly invoices with what has been paid.">
        <button className={btnGhost} disabled={shown.length === 0} onClick={() => downloadCsv("sova-invoices.csv",
          ["Unit", "Tenant", "Period", "Due date", "Total", "Paid", "Balance", "Status"],
          shown.map((i) => [byId[i.unit_id]?.unit_number, byId[i.unit_id]?.tenant_name, i.period, i.due_date, Number(i.total), Number(i.paid), Number(i.balance), state(i)]))}>Download CSV</button>
      </PageHead>
      <input className={`${inputCls} w-full sm:w-72`} placeholder="Search by unit…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table head={["Unit", "Period", "Due", "Total", "Paid", "Balance", "Status"]} empty="No invoices yet. They are created on the 1st of each month.">
        {shown.map((i) => (
          <tr key={i.invoice_id} className="cursor-pointer hover:bg-slate-800/50" onClick={() => setSel(i)}>
            <td className="px-4 py-3 font-semibold text-emerald-300">{byId[i.unit_id]?.unit_number}</td>
            <td className="px-4 py-3">{new Date(i.period).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}</td>
            <td className="px-4 py-3 text-slate-400">{i.due_date}</td>
            <td className="px-4 py-3">{kes(i.total)}</td>
            <td className="px-4 py-3">{kes(i.paid)}</td>
            <td className="px-4 py-3">{kes(i.balance)}</td>
            <td className="px-4 py-3"><Badge state={state(i)} /></td>
          </tr>
        ))}
      </Table>
      {sel && (
        <Modal title={`Invoice — Unit ${byId[sel.unit_id]?.unit_number ?? ""}`} onClose={() => setSel(null)}>
          <Row label="Tenant">{byId[sel.unit_id]?.tenant_name}</Row>
          <Row label="Period">{new Date(sel.period).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</Row>
          <Row label="Rent">{det?.inv && kes(det.inv.rent_amount)}</Row>
          <Row label="Utilities">{det?.inv && kes(det.inv.utilities_amount)}</Row>
          {(det?.util ?? []).map((u, k) => (
            <Row key={k} label={`   · ${cap(u.kind)}: ${used(u)} × ${kes(u.rate)}`}>{kes(u.amount)}</Row>
          ))}
          {(det?.adj ?? []).map((a) => (
            <Row key={a.id} label={`   · ${a.kind === "credit" ? "Credit" : "Charge"}: ${a.description}`}>
              {a.kind === "credit" ? "-" : ""}{kes(a.amount)}
              {canEdit && <button className="ml-2 text-xs text-red-300" onClick={() => removeAdj(a)}>remove</button>}
            </Row>
          ))}
          <Row label="Total">{kes(sel.total)}</Row>
          <Row label="Paid">{kes(sel.paid)}</Row>
          <Row label="Balance">{kes(sel.balance)}</Row>
          <Row label="Due">{sel.due_date}</Row>
          <h4 className="mb-1 mt-4 text-sm font-medium text-white">Payments applied</h4>
          {det && det.al.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
          {det?.al.map((a, k) => (
            <Row key={k} label={`${det.pay[a.payment_id]?.trans_id ?? "Payment"} · ${det.pay[a.payment_id] ? new Date(det.pay[a.payment_id].paid_at).toLocaleDateString("en-KE") : ""}`}>{kes(a.amount)}</Row>
          ))}
          {canEdit && (adding ? (
            <div className="mt-4 space-y-2 rounded-lg border border-slate-700 p-3">
              <select className={`${inputCls} w-full`} value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
                <option value="charge">Charge (adds to the invoice)</option>
                <option value="credit">Credit or waiver (reduces the invoice)</option>
              </select>
              <input className={`${inputCls} w-full`} placeholder="Reason, e.g. Broken window repair" value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} />
              <input className={`${inputCls} w-full`} type="number" placeholder="Amount (KES)" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
              {adjMsg && <p className="text-sm text-red-400">{adjMsg}</p>}
              <div className="flex gap-2">
                <button className={btnPrimary} disabled={adjBusy || !adj.description.trim() || !(Number(adj.amount) > 0)} onClick={addAdj}>{adjBusy ? "Saving…" : "Save"}</button>
                <button className={btnGhost} onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className={`${btnGhost} mr-2 mt-4`} onClick={() => { setAdjMsg(""); setAdding(true); }}>+ Add charge or credit</button>
          ))}
          {adjMsg && !adding && <p className="mt-2 text-sm text-red-400">{adjMsg}</p>}
          <button className={`${btnGhost} mt-4`} onClick={printInvoice}>Print / save as PDF</button>
        </Modal>
      )}
    </div>
  );
}
