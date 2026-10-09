import { useState } from "react";
import { kes, Badge, PageHead, Table, inputCls } from "./ui.jsx";
import { AddUnit, btnPrimary, btnDanger, guardedDelete } from "./Actions.jsx";

export default function Units({ supabase, propertyId, units, onSelect, onChanged, canEdit = true }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");
  const rows = units.filter((u) =>
    (!status || u.state === status) &&
    `${u.unit_number} ${u.tenant_name ?? ""} ${u.account_ref}`.toLowerCase().includes(q.toLowerCase()));

  const remove = async (u) => {
    if (!window.confirm(`Delete unit ${u.unit_number}? This cannot be undone.`)) return;
    const err = await guardedDelete(supabase, "units", u.unit_id, [
      ["invoices", "unit_id", "This unit has invoices, so it can't be deleted."],
      ["payments", "unit_id", "This unit has payment records, so it can't be deleted."],
      ["tenants", "unit_id", "This unit has had tenants, so it can't be deleted."],
    ]);
    if (err) return setMsg(err);
    setMsg(""); onChanged();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Units" hint="Occupancy and account balances for this property.">
        {canEdit && <button className={btnPrimary} disabled={!propertyId} onClick={() => setAdding(true)}>+ Add unit</button>}
      </PageHead>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} w-full sm:w-72`} placeholder="Search unit, tenant or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option><option value="unpaid">Due</option>
          <option value="overdue">Overdue</option><option value="vacant">Vacant</option>
        </select>
      </div>
      <Table head={["Unit", "Tenant", "Account ref", "Status", "Balance", ""]} empty="No units yet. Use + Add unit.">
        {rows.map((u) => (
          <tr key={u.unit_id}>
            <td className="px-4 py-3 font-semibold text-emerald-300">{u.unit_number}</td>
            <td className="px-4 py-3">{u.tenant_name ?? "—"}</td>
            <td className="px-4 py-3 text-slate-400">{u.account_ref}</td>
            <td className="px-4 py-3"><Badge state={u.state} /></td>
            <td className="px-4 py-3">{kes(u.balance)}</td>
            <td className="space-x-3 whitespace-nowrap px-4 py-3">
              {u.state !== "vacant" && <button className="text-emerald-300" onClick={() => onSelect(u)}>View</button>}
              {canEdit && <button className={btnDanger} onClick={() => remove(u)}>Delete</button>}
            </td>
          </tr>
        ))}
      </Table>
      {adding && <AddUnit supabase={supabase} propertyId={propertyId} onClose={() => setAdding(false)} onDone={onChanged} />}
    </div>
  );
}
