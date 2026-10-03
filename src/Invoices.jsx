import { useEffect, useState } from "react";
import { kes, Badge, PageHead, Table, Modal, Row, inputCls } from "./ui.jsx";

export default function Invoices({ supabase, units }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [det, setDet] = useState(null);
  const byId = Object.fromEntries(units.map((u) => [u.unit_id, u]));

  useEffect(() => {
    if (units.length === 0) return;
    supabase.from("invoice_balances").select("*")
      .in("unit_id", units.map((u) => u.unit_id))
      .order("period", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, [units]);

  useEffect(() => {
    if (!sel) return setDet(null);
    (async () => {
      const { data: inv } = await supabase.from("invoices").select("rent_amount, utilities_amount, total, due_date, created_at").eq("id", sel.invoice_id).maybeSingle();
      const { data: al } = await supabase.from("payment_allocations").select("amount, payment_id").eq("invoice_id", sel.invoice_id);
      const ids = (al ?? []).map((a) => a.payment_id);
      const { data: pay } = ids.length ? await supabase.from("payments").select("id, trans_id, paid_at, payer_name").in("id", ids) : { data: [] };
      setDet({ inv, al: al ?? [], pay: Object.fromEntries((pay ?? []).map((p) => [p.id, p])) });
    })();
  }, [sel]);

  const today = new Date().toISOString().slice(0, 10);
  const state = (i) => (Number(i.balance) <= 0 ? "paid" : i.due_date < today ? "overdue" : "unpaid");
  const shown = rows.filter((i) => (byId[i.unit_id]?.unit_number ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="Invoices" hint="Monthly invoices with what has been paid." />
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
          <Row label="Total">{kes(sel.total)}</Row>
          <Row label="Paid">{kes(sel.paid)}</Row>
          <Row label="Balance">{kes(sel.balance)}</Row>
          <Row label="Due">{sel.due_date}</Row>
          <h4 className="mb-1 mt-4 text-sm font-medium text-white">Payments applied</h4>
          {det && det.al.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
          {det?.al.map((a, k) => (
            <Row key={k} label={`${det.pay[a.payment_id]?.trans_id ?? "Payment"} · ${det.pay[a.payment_id] ? new Date(det.pay[a.payment_id].paid_at).toLocaleDateString("en-KE") : ""}`}>{kes(a.amount)}</Row>
          ))}
        </Modal>
      )}
    </div>
  );
}
