import { useEffect, useState } from "react";
import { PageHead, Table, inputCls } from "./ui.jsx";

export default function Sms({ supabase, units }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (units.length === 0) return setRows([]);
    supabase.from("tenants").select("id").in("unit_id", units.map((u) => u.unit_id)).then(({ data: t }) => {
      const ids = (t ?? []).map((x) => x.id);
      if (ids.length === 0) return setRows([]);
      supabase.from("sms_outbox").select("id, to_phone, body, status, error, created_at, sent_at")
        .in("tenant_id", ids).order("created_at", { ascending: false }).limit(100)
        .then(({ data }) => setRows(data ?? []));
    });
  }, [units]);

  const statuses = [...new Set(rows.map((r) => r.status))];
  const shown = rows.filter((r) => !status || r.status === status);

  return (
    <div className="space-y-4">
      <PageHead title="SMS Outbox" hint="Rent reminders and receipts sent to tenants (latest 100).">
        <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </PageHead>
      <Table head={["To", "Message", "Status", "Queued"]} empty="No messages yet.">
        {shown.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3 whitespace-nowrap">{m.to_phone}</td>
            <td className="px-4 py-3 text-slate-300">{m.body}{m.error && <div className="text-xs text-red-300">{m.error}</div>}</td>
            <td className="px-4 py-3 capitalize">{m.status}</td>
            <td className="px-4 py-3 whitespace-nowrap text-slate-400">{new Date(m.created_at).toLocaleString("en-KE")}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
