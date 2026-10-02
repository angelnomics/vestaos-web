import { useState } from "react";
import { kes, Badge, PageHead, Table, inputCls } from "./ui.jsx";

export default function Units({ units, onSelect }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const rows = units.filter((u) =>
    (!status || u.state === status) &&
    `${u.unit_number} ${u.tenant_name ?? ""} ${u.account_ref}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="Units" hint="Occupancy and account balances for this property." />
      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} w-full sm:w-72`} placeholder="Search unit, tenant or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option><option value="unpaid">Due</option>
          <option value="overdue">Overdue</option><option value="vacant">Vacant</option>
        </select>
      </div>
      <Table head={["Unit", "Tenant", "Account ref", "Status", "Balance", ""]} empty="No units yet. Add one in Manage.">
        {rows.map((u) => (
          <tr key={u.unit_id}>
            <td className="px-4 py-3 font-semibold text-emerald-300">{u.unit_number}</td>
            <td className="px-4 py-3">{u.tenant_name ?? "—"}</td>
            <td className="px-4 py-3 text-slate-400">{u.account_ref}</td>
            <td className="px-4 py-3"><Badge state={u.state} /></td>
            <td className="px-4 py-3">{kes(u.balance)}</td>
            <td className="px-4 py-3">{u.state !== "vacant" && <button className="text-emerald-300" onClick={() => onSelect(u)}>View</button>}</td>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <p className="text-sm text-slate-500">No units match.</p>}
    </div>
  );
}
