import { useEffect, useState } from "react";
import { kes, PageHead } from "./ui.jsx";

export default function Properties({ supabase, properties, onOpen }) {
  const [stats, setStats] = useState({});

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
  }, []);

  return (
    <div className="space-y-4">
      <PageHead title="Properties" hint="Tap a property to open its dashboard." />
      {properties.length === 0 && <p className="text-sm text-slate-500">No properties yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {properties.map((p) => {
          const s = stats[p.id] ?? { units: 0, occupied: 0, arrears: 0, owed: 0 };
          return (
            <button key={p.id} onClick={() => onOpen(p.id)} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left hover:border-emerald-600">
              <div className="text-lg font-semibold text-white">{p.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div><div className="text-base font-semibold text-white">{s.units}</div>Units</div>
                <div><div className="text-base font-semibold text-emerald-300">{s.occupied}</div>Occupied</div>
                <div><div className="text-base font-semibold text-red-300">{s.arrears}</div>Overdue</div>
              </div>
              <div className="mt-3 text-sm text-slate-300">Outstanding: {kes(s.owed)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
