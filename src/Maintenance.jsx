import { useEffect, useState } from "react";
import { PageHead, Table, Modal, inputCls } from "./ui.jsx";
import { btnPrimary, btnDanger } from "./Actions.jsx";

// Must match the values your maintenance_requests table accepts.
// If saving fails with a "check constraint" message, edit these two lists.
const PRIORITIES = ["low", "medium", "high"];
const STATUSES = ["open", "in_progress", "done"];
const label = (s) => s.replace("_", " ");

export default function Maintenance({ supabase, propertyId, units }) {
  const [rows, setRows] = useState([]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", priority: "medium", unitId: "" });
  const [msg, setMsg] = useState("");
  const unitNo = Object.fromEntries(units.map((u) => [u.unit_id, u.unit_number]));

  const load = () => propertyId && supabase.from("maintenance_requests")
    .select("id, unit_id, title, priority, status, created_at")
    .eq("property_id", propertyId).order("created_at", { ascending: false })
    .then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, [propertyId]);

  const explain = (error) => error.code === "23514"
    ? "The database does not accept one of those values. Edit the PRIORITIES and STATUSES lists at the top of Maintenance.jsx to match your table."
    : "Error: " + error.message;

  const add = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("maintenance_requests").insert({
      property_id: propertyId, unit_id: f.unitId || null, title: f.title.trim(),
      priority: f.priority, status: STATUSES[0], reported_by: user.id,
    });
    if (error) return setMsg(explain(error));
    setAdding(false); setF({ title: "", priority: "medium", unitId: "" }); setMsg(""); load();
  };

  const setStatus = async (id, status) => {
    const { error } = await supabase.from("maintenance_requests").update({ status }).eq("id", id);
    if (error) return setMsg(explain(error));
    setMsg(""); load();
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    const { data, error } = await supabase.from("maintenance_requests").delete().eq("id", r.id).select("id");
    if (error) return setMsg("Error: " + error.message);
    if (!data?.length) return setMsg("Nothing was deleted. You may not have permission.");
    setMsg(""); load();
  };

  return (
    <div className="space-y-4">
      <PageHead title="Maintenance" hint="Repair requests for this property.">
        <button className={btnPrimary} disabled={!propertyId} onClick={() => { setMsg(""); setAdding(true); }}>+ Add request</button>
      </PageHead>
      {msg && !adding && <p className="text-sm text-red-400">{msg}</p>}
      <Table head={["Request", "Unit", "Priority", "Status", "Reported", ""]} empty="No maintenance requests.">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-white">{r.title}</td>
            <td className="px-4 py-3 text-emerald-300">{unitNo[r.unit_id] ?? "—"}</td>
            <td className="px-4 py-3 capitalize">{r.priority}</td>
            <td className="px-4 py-3">
              <select className={`${inputCls} capitalize`} value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                {[...new Set([...STATUSES, r.status])].map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </td>
            <td className="px-4 py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
            <td className="px-4 py-3"><button className={btnDanger} onClick={() => remove(r)}>Delete</button></td>
          </tr>
        ))}
      </Table>
      {adding && (
        <Modal title="New maintenance request" onClose={() => setAdding(false)}>
          <div className="space-y-3">
            <input className={`${inputCls} w-full`} placeholder="What needs fixing? (e.g. Leaking tap)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <select className={`${inputCls} w-full`} value={f.unitId} onChange={(e) => setF({ ...f, unitId: e.target.value })}>
              <option value="">Whole property</option>
              {units.map((u) => <option key={u.unit_id} value={u.unit_id}>Unit {u.unit_number}</option>)}
            </select>
            <select className={`${inputCls} w-full capitalize`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p} priority</option>)}
            </select>
            {msg && <p className="text-sm text-red-400">{msg}</p>}
            <button className={`${btnPrimary} w-full`} disabled={!f.title.trim()} onClick={add}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
