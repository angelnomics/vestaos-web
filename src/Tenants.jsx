import { useEffect, useState } from "react";
import { kes, Badge, PageHead, Table, Modal, Row, inputCls } from "./ui.jsx";
import { AddTenant, EditTenant, btnPrimary, btnDanger, guardedDelete } from "./Actions.jsx";

export default function Tenants({ supabase, units, onChanged, canEdit = true }) {
  const [info, setInfo] = useState({});
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [invs, setInvs] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const occupied = units.filter((u) => u.state !== "vacant");

  useEffect(() => {
    if (occupied.length === 0) return setInfo({});
    supabase.from("tenants").select("id, unit_id, phone, move_in, deposit_amount, deposit_received_on, deposit_refunded_on")
      .eq("is_active", true).in("unit_id", occupied.map((u) => u.unit_id))
      .then(({ data }) => setInfo(Object.fromEntries((data ?? []).map((t) => [t.unit_id, t]))));
  }, [units]);

  useEffect(() => {
    if (!sel) return setInvs([]);
    supabase.from("invoice_balances").select("invoice_id, period, total, paid, balance")
      .eq("unit_id", sel.unit_id).order("period", { ascending: false }).limit(6).then(({ data }) => setInvs(data ?? []));
  }, [sel]);

  const moveOut = async () => {
    if (!window.confirm(`Move ${sel.tenant_name} out? Their unit becomes vacant.`)) return;
    const { error } = await supabase.from("tenants")
      .update({ is_active: false, move_out: new Date().toISOString().slice(0, 10) })
      .eq("unit_id", sel.unit_id).eq("is_active", true);
    if (error) return setMsg("Error: " + error.message);
    setSel(null); setMsg(""); onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${sel.tenant_name}? This cannot be undone.`)) return;
    const err = await guardedDelete(supabase, "tenants", info[sel.unit_id]?.id, [
      ["invoices", "tenant_id", "This tenant has invoices, so they can't be deleted. Use Move out instead."],
      ["sms_outbox", "tenant_id", "This tenant has messages on record, so they can't be deleted. Use Move out instead."],
    ]);
    if (err) return setMsg(err);
    setSel(null); setMsg(""); onChanged();
  };

  const rows = occupied.filter((u) =>
    `${u.tenant_name ?? ""} ${u.unit_number} ${u.account_ref}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHead title="Tenants" hint="Current tenants, their units and balances.">
        {canEdit && <button className={btnPrimary} onClick={() => setAdding(true)}>+ Add tenant</button>}
      </PageHead>
      <input className={`${inputCls} w-full sm:w-72`} placeholder="Search tenant, unit or reference…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Table head={["Tenant", "Unit", "Account ref", "Moved in", "Status", "Balance", ""]} empty="No tenants yet. Use + Add tenant.">
        {rows.map((u) => (
          <tr key={u.unit_id}>
            <td className="px-4 py-3"><div className="font-medium text-white">{u.tenant_name}</div><div className="text-xs text-slate-400">{info[u.unit_id]?.phone ?? ""}</div></td>
            <td className="px-4 py-3 text-emerald-300">{u.unit_number}</td>
            <td className="px-4 py-3 text-slate-400">{u.account_ref}</td>
            <td className="px-4 py-3 text-slate-400">{info[u.unit_id]?.move_in ?? "—"}</td>
            <td className="px-4 py-3"><Badge state={u.state} /></td>
            <td className="px-4 py-3">{kes(u.balance)}</td>
            <td className="px-4 py-3"><button className="text-emerald-300" onClick={() => { setMsg(""); setSel(u); }}>View</button></td>
          </tr>
        ))}
      </Table>
      {editing && <EditTenant supabase={supabase} tenantId={editing} onClose={() => setEditing(null)} onDone={() => { setSel(null); onChanged(); }} />}
      {adding && <AddTenant supabase={supabase} units={units} onClose={() => setAdding(false)} onDone={onChanged} />}
      {sel && (
        <Modal title={sel.tenant_name} onClose={() => setSel(null)}>
          <Row label="Phone">{info[sel.unit_id]?.phone}</Row>
          <Row label="Moved in">{info[sel.unit_id]?.move_in}</Row>
          <Row label="Unit">{sel.unit_number}</Row>
          <Row label="Account reference">{sel.account_ref}</Row>
          <Row label="Status"><Badge state={sel.state} /></Row>
          <Row label="Balance">{kes(sel.balance)}</Row>
          <Row label="Deposit">{Number(info[sel.unit_id]?.deposit_amount) > 0 ? `${kes(info[sel.unit_id].deposit_amount)} · ${info[sel.unit_id].deposit_received_on ? "held" : "not received yet"}` : "None"}</Row>
          <h4 className="mb-1 mt-4 text-sm font-medium text-white">Recent invoices</h4>
          {invs.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
          {invs.map((i) => (
            <Row key={i.invoice_id} label={new Date(i.period).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}>{kes(i.paid)} of {kes(i.total)}</Row>
          ))}
          {msg && <p className="mt-3 text-sm text-red-400">{msg}</p>}
          {canEdit && (
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" onClick={() => setEditing(info[sel.unit_id]?.id)}>Edit details</button>
              <button className={btnPrimary} onClick={moveOut}>Move out</button>
              <button className={btnDanger} onClick={remove}>Delete</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
