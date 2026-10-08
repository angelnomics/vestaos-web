import { useEffect, useState } from "react";
import { kes, PageHead, Table } from "./ui.jsx";
import { downloadCsv, btnGhost } from "./export.js";

export default function Reports({ supabase, units }) {
  const [inv, setInv] = useState([]);

  useEffect(() => {
    if (units.length === 0) return setInv([]);
    supabase.from("invoice_balances").select("period, total, paid, balance")
      .in("unit_id", units.map((u) => u.unit_id)).then(({ data }) => setInv(data ?? []));
  }, [units]);

  const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const months = {};
  for (const r of inv) (months[r.period] ??= []).push(r);
  const list = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const billed = sum(inv, "total"), paid = sum(inv, "paid");

  return (
    <div className="space-y-4">
      <PageHead title="Reports" hint="Billing and collection summary for this property.">
        <button className={btnGhost} disabled={list.length === 0} onClick={() => downloadCsv("sova-report.csv",
          ["Month", "Invoices", "Billed", "Collected", "Outstanding"],
          list.map(([p, rows]) => [p.slice(0, 7), rows.length, sum(rows, "total"), sum(rows, "paid"), sum(rows, "balance")]))}>Download CSV</button>
      </PageHead>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
        {[["Billed", kes(billed)], ["Collected", kes(paid)], ["Outstanding", kes(sum(inv, "balance"))], ["Collection rate", billed ? Math.round((paid / billed) * 100) + "%" : "—"]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-slate-900 p-3"><div className="font-semibold text-white">{v}</div><div className="text-xs text-slate-400">{l}</div></div>
        ))}
      </div>
      <Table head={["Month", "Invoices", "Billed", "Collected", "Outstanding"]} empty="No invoices to report on yet.">
        {list.map(([p, rows]) => (
          <tr key={p}>
            <td className="px-4 py-3">{new Date(p).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</td>
            <td className="px-4 py-3">{rows.length}</td>
            <td className="px-4 py-3">{kes(sum(rows, "total"))}</td>
            <td className="px-4 py-3">{kes(sum(rows, "paid"))}</td>
            <td className="px-4 py-3">{kes(sum(rows, "balance"))}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
