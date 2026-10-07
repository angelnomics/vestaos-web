import { useEffect, useState } from "react";
import { kes, PageHead, Table, Modal, Row, inputCls } from "./ui.jsx";
import { btnPrimary } from "./Actions.jsx";

export default function Payments({ supabase, propertyId, units = [], onChanged }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState(null);
  const [tick, setTick] = useState(0);
  const [rec, setRec] = useState(false);
  const [f, setF] = useState({ unitId: "", amount: "", code: "", date: new Date().toISOString().slice(0, 10), payer: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [alloc, setAlloc] = useState([]);

  useEffect(() => {
    if (!propertyId) return;
    supabase.from("payments")
      .select("id, trans_id, account_key, amount, payer_name, msisdn, paid_at, match_status")
      .eq("property_id", propertyId).order("paid_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, [propertyId, tick]);

  useEffect(() => {
    if (!sel) return setAlloc([]);
    (async () => {
      const { data: al } = await supabase.from("payment_allocations").select("amount, invoice_id").eq("payment_id", sel.id);
      const ids = (al ?? []).map((a) => a.invoice_id);
      const { data: inv } = ids.length ? await supabase.from("invoices").select("id, period").in("id", ids) : { data: [] };
      const per = Object.fromEntries((inv ?? []).map((i) => [i.id, i.period]));
      setAlloc((al ?? []).map((a) => ({ ...a, period: per[a.invoice_id] })));
    })();
  }, [sel]);

  const record = async () => {
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("record_manual_payment", {
      p_unit_id: f.unitId, p_amount: Number(f.amount), p_trans_id: f.code.trim(),
      p_paid_at: new Date(f.date + "T12:00:00").toISOString(), p_payer: f.payer.trim() || null,
    });
    setBusy(false);
    if (error) return setMsg(error.code === "23505" ? "That M-Pesa code is already recorded." : "Error: " + error.message);
    setRec(false); setF({ ...f, amount: "", code: "", payer: "" }); setTick((t) => t + 1); onChanged?.();
  };

  const statuses = [...new Set(rows.map((r) => r.match_status))];
  const shown = rows.filter((r) =>
    (!status || r.match_status === status) &&
    `${r.trans_id} ${r.payer_name ?? ""} ${r.account_key ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="M-Pesa Payments" hint="Latest 200 payments received for this property.">
        <button className={btnPrimary} disabled={!propertyId} onClick={() => { setMsg(""); setRec(true); }}>+ Record payment</button>
      </PageHead>
      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} w-full sm:w-72`} placeholder="Search code, payer or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Table head={["Code", "Payer", "Reference", "Amount", "Date", "Match"]} empty="No payments received yet.">
        {shown.map((p) => (
          <tr key={p.id} className="cursor-pointer hover:bg-slate-800/50" onClick={() => setSel(p)}>
            <td className="px-4 py-3 font-medium text-white">{p.trans_id}</td>
            <td className="px-4 py-3">{p.payer_name ?? "—"}</td>
            <td className="px-4 py-3 text-slate-400">{p.account_key ?? "—"}</td>
            <td className="px-4 py-3">{kes(p.amount)}</td>
            <td className="px-4 py-3 text-slate-400">{new Date(p.paid_at).toLocaleDateString("en-KE")}</td>
            <td className="px-4 py-3 capitalize">{p.match_status}</td>
          </tr>
        ))}
      </Table>
      {sel && (
        <Modal title={`Payment ${sel.trans_id}`} onClose={() => setSel(null)}>
          <Row label="Amount">{kes(sel.amount)}</Row>
          <Row label="Payer">{sel.payer_name}</Row>
          <Row label="Phone">{sel.msisdn}</Row>
          <Row label="Account reference">{sel.account_key}</Row>
          <Row label="Received">{new Date(sel.paid_at).toLocaleString("en-KE")}</Row>
          <Row label="Match status">{sel.match_status}</Row>
          <h4 className="mb-1 mt-4 text-sm font-medium text-white">Applied to</h4>
          {alloc.length === 0 && <p className="text-sm text-slate-500">Not applied to any invoice.</p>}
          {alloc.map((a, k) => (
            <Row key={k} label={a.period ? new Date(a.period).toLocaleDateString("en-KE", { month: "long", year: "numeric" }) + " invoice" : "Invoice"}>{kes(a.amount)}</Row>
          ))}
        </Modal>
      )}
      {rec && (
        <Modal title="Record a payment" onClose={() => setRec(false)}>
          <div className="space-y-3">
            <select className={`${inputCls} w-full`} value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>
              <option value="">Choose the unit…</option>
              {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.account_ref}{u.tenant_name ? ` · ${u.tenant_name}` : " · vacant"}</option>)}
            </select>
            <input className={`${inputCls} w-full`} type="number" placeholder="Amount (KES)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            <input className={`${inputCls} w-full uppercase`} placeholder="M-Pesa code (e.g. SJK4X9ABCD)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            <input className={`${inputCls} w-full`} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            <input className={`${inputCls} w-full`} placeholder="Payer name (optional)" value={f.payer} onChange={(e) => setF({ ...f, payer: e.target.value })} />
            {msg && <p className="text-sm text-red-400">{msg}</p>}
            <p className="text-xs text-slate-400">The payment is applied to the unit's oldest unpaid invoice, and the tenant gets a receipt SMS.</p>
            <button className={`${btnPrimary} w-full`} disabled={busy || !f.unitId || !(Number(f.amount) > 0) || !f.code.trim()} onClick={record}>{busy ? "Saving…" : "Record payment"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
