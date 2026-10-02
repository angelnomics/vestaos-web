import { useEffect, useState } from "react";
import { PageHead, Table, inputCls } from "./ui.jsx";

export default function Security({ supabase, propertyId }) {
  const [rows, setRows] = useState([]);
  const [kind, setKind] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => propertyId && supabase.from("security_log").select("id, kind, note, created_at")
    .eq("property_id", propertyId).order("created_at", { ascending: false }).limit(100)
    .then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, [propertyId]);

  const add = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("security_log")
      .insert({ property_id: propertyId, kind: kind.trim(), note: note.trim(), logged_by: user.id });
    if (error) return setMsg("Error: " + error.message);
    setKind(""); setNote(""); setMsg(""); load();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Security Log" hint="Visitors, incidents and other notes for this property." />
      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} w-40`} placeholder="Type (e.g. Visitor)" value={kind} onChange={(e) => setKind(e.target.value)} />
        <input className={`${inputCls} flex-1 min-w-48`} placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="rounded-lg bg-emerald-600 px-4 text-sm text-white disabled:opacity-40" disabled={!kind.trim() || !note.trim()} onClick={add}>Add</button>
      </div>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <Table head={["When", "Type", "Note"]} empty="No entries yet.">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 whitespace-nowrap text-slate-400">{new Date(r.created_at).toLocaleString("en-KE")}</td>
            <td className="px-4 py-3 capitalize">{r.kind}</td>
            <td className="px-4 py-3 text-slate-300">{r.note}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
