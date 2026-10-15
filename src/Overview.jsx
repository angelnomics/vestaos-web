import { useEffect, useState } from "react";
import { kes, PageHead, Table } from "./ui.jsx";

async function loadAllUnits(supabase) {
  const all = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabase.from("unit_dashboard").select("property_id, unit_id, state, balance")
      .order("unit_id").range(from, from + 999);
    if (error || !data) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

const card = "rounded-xl border border-slate-800 bg-slate-900/50 p-5";

export default function Overview({ supabase, properties, tick, onOpen, onAddProperty }) {
  const [rows, setRows] = useState(null);

  useEffect(() => { loadAllUnits(supabase).then(setRows); }, [tick, properties]);

  if (rows === null) return <div className="space-y-4"><PageHead title="Dashboard" /><p className="text-sm text-slate-400">Loading…</p></div>;

  const occupied = rows.filter((u) => u.state !== "vacant");
  const overdue = rows.filter((u) => u.state === "overdue");
  const owed = rows.reduce((s, u) => s + Math.max(0, Number(u.balance) || 0), 0);

  const perProperty = properties.map((p) => {
    const mine = rows.filter((u) => u.property_id === p.id);
    const occ = mine.filter((u) => u.state !== "vacant");
    return {
      id: p.id, name: p.name, units: mine.length, tenants: occ.length,
      overdue: mine.filter((u) => u.state === "overdue").length,
      owed: mine.reduce((s, u) => s + Math.max(0, Number(u.balance) || 0), 0),
    };
  });

  const big = (title, value, sub) => (
    <div className={card}>
      <div className="text-xs uppercase text-slate-400">{title}</div>
      <div className="mt-1 text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHead title="Dashboard" hint="Your properties at a glance." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {big("Properties", properties.length, properties.length === 1 ? "in your portfolio" : "in your portfolio")}
        {big("Units", rows.length, `${occupied.length} occupied · ${rows.length - occupied.length} vacant`)}
        {big("Tenants", occupied.length, "currently renting from you")}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-900 p-3"><div className="text-xl font-semibold text-emerald-300">{occupied.length - rows.filter((u) => u.state === "unpaid").length - overdue.length}</div><div className="text-xs text-slate-400">Paid up</div></div>
        <div className="rounded-xl bg-slate-900 p-3"><div className="text-xl font-semibold text-red-300">{overdue.length}</div><div className="text-xs text-slate-400">Overdue</div></div>
        <div className="rounded-xl bg-slate-900 p-3"><div className="text-sm font-semibold text-white">{kes(owed)}</div><div className="text-xs text-slate-400">Outstanding</div></div>
      </div>

      <h3 className="pt-2 font-medium text-white">Your properties</h3>
      {properties.length === 0 ? (
        <div className={`${card} text-center`}>
          <p className="text-sm text-slate-400">You have no properties yet.</p>
          <button className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white" onClick={onAddProperty}>Add your first property</button>
        </div>
      ) : (
        <Table head={["Property", "Units", "Tenants", "Overdue", "Outstanding"]}>
          {perProperty.map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-slate-800/50" onClick={() => onOpen(p.id)}>
              <td className="px-4 py-3 font-medium text-white">{p.name}</td>
              <td className="px-4 py-3">{p.units}</td>
              <td className="px-4 py-3">{p.tenants}</td>
              <td className={`px-4 py-3 ${p.overdue > 0 ? "text-red-300" : ""}`}>{p.overdue}</td>
              <td className="px-4 py-3">{kes(p.owed)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
