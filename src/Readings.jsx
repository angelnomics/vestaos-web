import { useEffect, useState } from "react";

const input = "w-full rounded-lg bg-slate-950 border border-slate-700 p-2 text-slate-100";

export default function Readings({ supabase, units }) {
  const occupied = units.filter((u) => u.state !== "vacant");
  // Current month in Nairobi time (UTC+3), as the first day of the month
  const period = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 7) + "-01";
  const monthName = (iso, add = 0) => {
    const d = new Date(iso);
    d.setUTCMonth(d.getUTCMonth() + add);
    return d.toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" });
  };

  const [rate, setRate] = useState("");
  const [prev, setPrev] = useState({});
  const [cur, setCur] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (occupied.length === 0) return;
    supabase.from("utility_readings")
      .select("unit_id, period, current_reading")
      .eq("kind", "water")
      .in("unit_id", occupied.map((u) => u.unit_id))
      .order("period", { ascending: false })
      .then(({ data }) => {
        const p = {};
        for (const r of data ?? []) {
          if (r.period < period && p[r.unit_id] === undefined) p[r.unit_id] = r.current_reading;
        }
        setPrev(p);
      });
  }, [units]);

  const save = async () => {
    if (!(Number(rate) > 0)) return setMsg("Error: enter the rate per unit first.");
    const rows = [];
    for (const u of occupied) {
      const c = cur[u.unit_id];
      if (c === undefined || c === "") continue;
      const p = Number(prev[u.unit_id] ?? 0);
      if (Number(c) < p) return setMsg(`Error: ${u.unit_number} current reading is lower than previous.`);
      rows.push({
        unit_id: u.unit_id, kind: "water", period,
        previous_reading: p, current_reading: Number(c), rate: Number(rate),
      });
    }
    if (rows.length === 0) return setMsg("Error: enter at least one current reading.");
    const { error } = await supabase.from("utility_readings")
      .upsert(rows, { onConflict: "unit_id,kind,period" });
    if (error) return setMsg("Error: " + error.message);
    setMsg(`Saved ${rows.length} reading(s).`);
    setCur({});
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-white">Water readings for {monthName(period)}</h3>
        <p className="text-xs text-slate-400">
          These are billed on the {monthName(period, 1)} invoices. Leave a unit blank to skip it.
        </p>
      </div>

      <div>
        <label className="text-xs text-slate-400">Rate per unit (KES)</label>
        <input className={input} type="number" placeholder="e.g. 150" value={rate}
          onChange={(e) => setRate(e.target.value)} />
      </div>

      <div className="grid grid-cols-[3rem_1fr_1fr_4.5rem] gap-2 text-xs text-slate-400">
        <span>Unit</span><span>Previous</span><span>Current</span><span className="text-right">KES</span>
      </div>

      {occupied.map((u) => {
        const p = Number(prev[u.unit_id] ?? 0);
        const c = cur[u.unit_id];
        const cost = c !== undefined && c !== "" && Number(c) >= p ? (Number(c) - p) * Number(rate || 0) : 0;
        return (
          <div key={u.unit_id} className="grid grid-cols-[3rem_1fr_1fr_4.5rem] gap-2 items-center">
            <span className="font-semibold text-white">{u.unit_number}</span>
            <input className={input} type="number" value={prev[u.unit_id] ?? ""}
              onChange={(e) => setPrev({ ...prev, [u.unit_id]: e.target.value })} />
            <input className={input} type="number" value={c ?? ""}
              onChange={(e) => setCur({ ...cur, [u.unit_id]: e.target.value })} />
            <span className="text-right text-sm text-slate-300">{cost ? cost.toLocaleString("en-KE") : "-"}</span>
          </div>
        );
      })}

      {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-emerald-300"}`}>{msg}</p>}
      <button onClick={save} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 p-3 font-medium text-white">
        Save readings
      </button>
    </div>
  );
}