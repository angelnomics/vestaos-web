import { useEffect, useState } from "react";
import { kes, Badge, PageHead, Table, inputCls } from "./ui.jsx";

export default function Tenants({ supabase, units, onSelect }) {
  const [phones, setPhones] = useState({});
  const [q, setQ] = useState("");
  const occupied = units.filter((u) => u.state !== "vacant");

  useEffect(() => {
    if (occupied.length === 0) return;
    supabase.from("tenants").select("unit_id, phone, move_in")
      .eq("is_active", true).in("unit_id", occupied.map((u) => u.unit_id))
      .then(({ data }) => setPhones(Object.fromEntries((data ?? []).map((t) => [t.unit_id, t]))));
  }, [units]);

  const rows = occupied.filter((u) =>
    `${u.tenant_name ?? ""} ${u.unit_number} ${u.account_ref}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="Tenants" hint="Current tenants, their units and balances." />
      <input className={`${inputCls} w-full sm:w-72`} placeholder="Search tenant, unit or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table head={["Tenant", "Unit", "Account ref", "Moved in", "Status", "Balance", ""]} empty="No tenants yet. Add one in Manage.">
        {rows.map((u) => (
          <tr key={u.unit_id}>
            <td className="px-4 py-3"><div className="font-medium text-white">{u.tenant_name}</div><div className="text-xs text-slate-400">{phones[u.unit_id]?.phone ?? ""}</div></td>
            <td className="px-4 py-3 text-emerald-300">{u.unit_number}</td>
            <td className="px-4 py-3 text-slate-400">{u.account_ref}</td>
            <td className="px-4 py-3 text-slate-400">{phones[u.unit_id]?.move_in ?? "—"}</td>
            <td className="px-4 py-3"><Badge state={u.state} /></td>
            <td className="px-4 py-3">{kes(u.balance)}</td>
            <td className="px-4 py-3"><button className="text-emerald-300" onClick={() => onSelect(u)}>View</button></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
