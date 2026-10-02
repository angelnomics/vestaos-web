import { useEffect, useState } from "react";
import { PageHead, Table } from "./ui.jsx";

export default function Maintenance({ supabase, propertyId, units }) {
  const [rows, setRows] = useState([]);
  const unitNo = Object.fromEntries(units.map((u) => [u.unit_id, u.unit_number]));

  useEffect(() => {
    if (!propertyId) return;
    supabase.from("maintenance_requests").select("id, unit_id, title, priority, status, created_at")
      .eq("property_id", propertyId).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [propertyId]);

  return (
    <div className="space-y-4">
      <PageHead title="Maintenance" hint="Repair requests for this property." />
      <Table head={["Request", "Unit", "Priority", "Status", "Reported"]} empty="No maintenance requests.">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-white">{r.title}</td>
            <td className="px-4 py-3 text-emerald-300">{unitNo[r.unit_id] ?? "—"}</td>
            <td className="px-4 py-3 capitalize">{r.priority}</td>
            <td className="px-4 py-3 capitalize">{r.status}</td>
            <td className="px-4 py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
