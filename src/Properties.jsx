import { useEffect, useState } from "react";
import { kes, PageHead } from "./ui.jsx";
import { AddProperty, btnPrimary, btnDanger, guardedDelete } from "./Actions.jsx";

export default function Properties({ supabase, properties, onOpen, onChanged }) {
  const [stats, setStats] = useState({});
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("unit_dashboard").select("property_id, state, balance").then(({ data }) => {
      const s = {};
      for (const r of data ?? []) {
        const x = (s[r.property_id] ??= { units: 0, occupied: 0, arrears: 0, owed: 0 });
        x.units++;
        if (r.state !== "vacant") x.occupied++;
        if (r.state === "overdue") x.arrears++;
        x.owed += Number(r.balance || 0);
      }
      setStats(s);
    });
  }, [properties]);

  const remove = async (p) => {
    if (!window.confirm(`Delete property "${p.name}"? This cannot be undone.`)) return;
    const err = await guardedDelete(supabase, "properties", p.id, [
      ["units", "property_id", "This property still has units. Delete its units first."],
      ["payments", "property_id", "This property has payment records, so it can't be deleted."],
    ]);
    if (err) return setMsg(err);
    setMsg(""); onChanged();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Properties" hint="Tap a property to open its dashboard.">
        <button className={btnPrimary} onClick={() => setAdding(true)}>+ Add property</button>
      </PageHead>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      {properties.length === 0 && <p className="text-sm text-slate-500">No properties yet. Use + Add property.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {properties.map((p) => {
          const s = stats[p.id] ?? { units: 0, occupied: 0, arrears: 0, owed: 0 };
          return (
            <div key={p.id} onClick={() => onOpen(p.id)} className="cursor-pointer rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-emerald-600">
              <div className="flex items-start justify-between gap-2">
                <div className="text-lg font-semibold text-white">{p.name}</div>
                <button className={btnDanger} onClick={(e) => { e.stopPropagation(); remove(p); }}>Delete</button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div><div className="text-base font-semibold text-white">{s.units}</div>Units</div>
                <div><div className="text-base font-semibold text-emerald-300">{s.occupied}</div>Occupied</div>
                <div><div className="text-base font-semibold text-red-300">{s.arrears}</div>Overdue</div>
              </div>
              <div className="mt-3 text-sm text-slate-300">Outstanding: {kes(s.owed)}</div>
            </div>
          );
        })}
      </div>
      {adding && <AddProperty supabase={supabase} onClose={() => setAdding(false)} onDone={onChanged} />}
    </div>
  );
}
