import { useEffect, useState } from "react";
import { kes, PageHead, Table, Modal, inputCls } from "./ui.jsx";
import { btnPrimary } from "./Actions.jsx";
import { downloadCsv, btnGhost } from "./export.js";

const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (t) =>
  Number(t.deposit_amount) <= 0 ? "none" : t.deposit_refunded_on ? "refunded" : t.deposit_received_on ? "held" : "pending";
const LABEL = { none: "No deposit", pending: "Not received yet", held: "Held", refunded: "Refunded" };
const CLS = { none: "text-slate-500", pending: "text-amber-300", held: "text-emerald-300", refunded: "text-slate-300" };
const sum = (rows, fn) => rows.reduce((s, r) => s + fn(r), 0);

export default function Deposits({ supabase, units, onChanged, canEdit = true }) {
  const [rows, setRows] = useState([]);
  const [tick, setTick] = useState(0);
  const [dlg, setDlg] = useState(null);
  const [f, setF] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const unitNo = Object.fromEntries(units.map((u) => [u.unit_id, u.unit_number]));

  useEffect(() => {
    if (units.length === 0) return setRows([]);
    supabase.from("tenants")
      .select("id, unit_id, full_name, is_active, move_out, deposit_amount, deposit_received_on, deposit_refund_amount, deposit_refunded_on, deposit_note")
      .in("unit_id", units.map((u) => u.unit_id)).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [units, tick]);

  const openSet = (t) => { setMsg(""); setF({ amount: Number(t.deposit_amount) || "", received: t.deposit_received_on || today() }); setDlg({ kind: "set", t }); };
  const openRefund = (t) => { setMsg(""); setF({ amount: Number(t.deposit_amount), date: today(), note: "" }); setDlg({ kind: "refund", t }); };

  const save = async () => {
    const t = dlg.t;
    let patch;
    if (dlg.kind === "set") {
      const a = Number(f.amount) || 0;
      patch = { deposit_amount: a, deposit_received_on: a > 0 ? f.received || null : null };
    } else {
      const a = Number(f.amount);
      if (!(a >= 0) || a > Number(t.deposit_amount)) return setMsg("The refund cannot be more than the deposit.");
      patch = { deposit_refund_amount: a, deposit_refunded_on: f.date, deposit_note: f.note.trim() || null };
    }
    setBusy(true); setMsg("");
    const { data, error } = await supabase.from("tenants").update(patch).eq("id", t.id).select("id");
    setBusy(false);
    if (error) return setMsg("Error: " + error.message);
    if (!data?.length) return setMsg("Nothing was saved. Only an owner can change deposits.");
    setDlg(null); setTick((n) => n + 1); onChanged?.();
  };

  const held = rows.filter((t) => statusOf(t) === "held");
  const refunded = rows.filter((t) => statusOf(t) === "refunded");

  return (
    <div className="space-y-4">
      <PageHead title="Deposits" hint="Deposits held for tenants, and what was refunded.">
        <button className={btnGhost} disabled={rows.length === 0} onClick={() => downloadCsv("sova-deposits.csv",
          ["Tenant", "Unit", "Moved out", "Deposit", "Status", "Received on", "Refunded", "Refunded on", "Note"],
          rows.map((t) => [t.full_name, unitNo[t.unit_id], t.move_out ?? "", Number(t.deposit_amount), LABEL[statusOf(t)], t.deposit_received_on ?? "", t.deposit_refund_amount == null ? "" : Number(t.deposit_refund_amount), t.deposit_refunded_on ?? "", t.deposit_note ?? ""]))}>Download CSV</button>
      </PageHead>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-900 p-3"><div className="font-semibold text-emerald-300">{kes(sum(held, (t) => Number(t.deposit_amount)))}</div><div className="text-xs text-slate-400">Held now</div></div>
        <div className="rounded-xl bg-slate-900 p-3"><div className="font-semibold text-white">{kes(sum(refunded, (t) => Number(t.deposit_refund_amount)))}</div><div className="text-xs text-slate-400">Refunded</div></div>
        <div className="rounded-xl bg-slate-900 p-3"><div className="font-semibold text-amber-300">{kes(sum(refunded, (t) => Number(t.deposit_amount) - Number(t.deposit_refund_amount || 0)))}</div><div className="text-xs text-slate-400">Kept (deductions)</div></div>
      </div>
      <Table head={["Tenant", "Unit", "Deposit", "Status", ""]} empty="No tenants yet.">
        {rows.map((t) => {
          const st = statusOf(t);
          return (
            <tr key={t.id}>
              <td className="px-4 py-3"><div className="font-medium text-white">{t.full_name}</div>{!t.is_active && <div className="text-xs text-slate-400">Moved out {t.move_out ?? ""}</div>}</td>
              <td className="px-4 py-3 text-emerald-300">{unitNo[t.unit_id] ?? "—"}</td>
              <td className="px-4 py-3">{Number(t.deposit_amount) > 0 ? kes(t.deposit_amount) : "—"}{st === "refunded" && <div className="text-xs text-slate-400">Refunded {kes(t.deposit_refund_amount)} on {t.deposit_refunded_on}{t.deposit_note ? ` · ${t.deposit_note}` : ""}</div>}</td>
              <td className={`px-4 py-3 ${CLS[st]}`}>{LABEL[st]}</td>
              <td className="space-x-3 whitespace-nowrap px-4 py-3">
                {canEdit && st !== "refunded" && <button className="text-emerald-300" onClick={() => openSet(t)}>{st === "none" ? "Set deposit" : "Edit"}</button>}
                {canEdit && st === "held" && <button className="text-amber-300" onClick={() => openRefund(t)}>Refund</button>}
              </td>
            </tr>
          );
        })}
      </Table>
      {dlg && (
        <Modal title={dlg.kind === "set" ? `Deposit for ${dlg.t.full_name}` : `Refund deposit: ${dlg.t.full_name}`} onClose={() => setDlg(null)}>
          <div className="space-y-3">
            {dlg.kind === "set" ? (
              <>
                <input className={`${inputCls} w-full`} type="number" placeholder="Deposit amount (KES)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
                <label className="block text-xs text-slate-400">Received on<input className={`${inputCls} mt-1 w-full`} type="date" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></label>
                <p className="text-xs text-slate-400">Leave the amount at 0 to clear the deposit. Deposits are tracked here only. They do not change rent invoices.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-300">Deposit held: <b>{kes(dlg.t.deposit_amount)}</b></p>
                <input className={`${inputCls} w-full`} type="number" placeholder="Amount refunded (KES)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
                <label className="block text-xs text-slate-400">Refunded on<input className={`${inputCls} mt-1 w-full`} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
                <input className={`${inputCls} w-full`} placeholder="Note, e.g. KES 2,000 kept for a broken window" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
              </>
            )}
            {msg && <p className="text-sm text-red-400">{msg}</p>}
            <button className={`${btnPrimary} w-full`} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
