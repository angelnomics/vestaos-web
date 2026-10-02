import { useEffect, useState } from "react";
import { kes, Badge, PageHead, Table, inputCls } from "./ui.jsx";

export default function Invoices({ supabase, units }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const byId = Object.fromEntries(units.map((u) => [u.unit_id, u]));

  useEffect(() => {
    if (units.length === 0) return;
    supabase.from("invoice_balances").select("*")
      .in("unit_id", units.map((u) => u.unit_id))
      .order("period", { ascending: false }).limit(200)
      .then(({ data }) => setRows(data ?? []));
  }, [units]);

  const today = new Date().toISOString().slice(0, 10);
  const state = (i) => (Number(i.balance) <= 0 ? "paid" : i.due_date < today ? "overdue" : "unpaid");
  const shown = rows.filter((i) => (byId[i.unit_id]?.unit_number ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="Invoices" hint="Monthly invoices with what has been paid." />
      <input className={`${inputCls} w-full sm:w-72`} placeholder="Search by unit…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table head={["Unit", "Period", "Due", "Total", "Paid", "Balance", "Status"]} empty="No invoices yet. They are created on the 1st of each month.">
        {shown.map((i) => (
          <tr key={i.invoice_id}>
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
    </div>
  );
}
