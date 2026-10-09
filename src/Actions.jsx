import { useEffect, useState } from "react";
import { Modal, inputCls } from "./ui.jsx";
import { normalizePhone, PHONE_HINT } from "./phone.js";

export const btnPrimary = "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40";
export const btnDanger = "rounded-lg border border-red-500/50 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10";

// Deletes one row, but only if no related records exist. Returns an error text, or null on success.
export async function guardedDelete(supabase, table, id, checks) {
  for (const [t, col, why] of checks) {
    const { count, error } = await supabase.from(t).select("id", { count: "exact", head: true }).eq(col, id);
    if (error) return "Error: " + error.message;
    if (count > 0) return why;
  }
  const { data, error } = await supabase.from(table).delete().eq("id", id).select("id");
  if (error) return "Error: " + error.message;
  if (!data?.length) return "Nothing was deleted. You may not have permission to delete this.";
  return null;
}

function Form({ title, onClose, onDone, children, canSave, save }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); setMsg("");
    const error = await save();
    setBusy(false);
    if (error) return setMsg("Error: " + error.message);
    onDone(); onClose();
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        {children}
        {msg && <p className="text-sm text-red-400">{msg}</p>}
        <button className={`${btnPrimary} w-full`} disabled={!canSave || busy} onClick={go}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}

export function AddProperty({ supabase, onClose, onDone }) {
  const [f, setF] = useState({ name: "", code: "", shortcode: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Form title="Add a property" onClose={onClose} onDone={onDone} canSave={f.name.trim() && f.code.trim()}
      save={async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("properties").insert({ owner_id: user.id, name: f.name.trim(), code: f.code.trim(), pay_shortcode: f.shortcode.trim() || null });
        return error;
      }}>
      <input className={`${inputCls} w-full`} placeholder="Property name" value={f.name} onChange={set("name")} />
      <input className={`${inputCls} w-full`} placeholder="Code, 2 to 8 letters or numbers (e.g. RS12)" value={f.code} onChange={set("code")} />
      <input className={`${inputCls} w-full`} placeholder="Paybill or Till number (optional)" value={f.shortcode} onChange={set("shortcode")} />
      <p className="text-xs text-slate-400">Tenants use the code in their account number.</p>
    </Form>
  );
}

export function AddUnit({ supabase, propertyId, onClose, onDone }) {
  const [f, setF] = useState({ number: "", rent: "" });
  return (
    <Form title="Add a unit" onClose={onClose} onDone={onDone} canSave={f.number.trim() && Number(f.rent) > 0}
      save={async () => (await supabase.from("units").insert({ property_id: propertyId, unit_number: f.number.trim(), rent_amount: Number(f.rent) })).error}>
      <input className={`${inputCls} w-full`} placeholder="Unit number (e.g. A1)" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} />
      <input className={`${inputCls} w-full`} type="number" placeholder="Monthly rent (KES)" value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} />
    </Form>
  );
}

export function AddTenant({ supabase, units, onClose, onDone }) {
  const vacant = units.filter((u) => u.state === "vacant");
  const [f, setF] = useState({ unitId: "", name: "", phone: "", deposit: "", received: new Date().toISOString().slice(0, 10) });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Form title="Add a tenant" onClose={onClose} onDone={onDone} canSave={f.unitId && f.name.trim() && f.phone.trim()}
      save={async () => {
        const phone = normalizePhone(f.phone);
        if (!phone) return { message: PHONE_HINT };
        return (await supabase.from("tenants").insert({
          unit_id: f.unitId, full_name: f.name.trim(), phone,
          ...(Number(f.deposit) > 0 ? { deposit_amount: Number(f.deposit), deposit_received_on: f.received || null } : {}),
        })).error;
      }}>
      <select className={`${inputCls} w-full`} value={f.unitId} onChange={set("unitId")}>
        <option value="">{vacant.length ? "Choose a vacant unit…" : "No vacant units. Add a unit first."}</option>
        {vacant.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.account_ref}</option>)}
      </select>
      <input className={`${inputCls} w-full`} placeholder="Full name" value={f.name} onChange={set("name")} />
      <input className={`${inputCls} w-full`} placeholder="Phone (e.g. 0712345678)" value={f.phone} onChange={set("phone")} />
      <input className={`${inputCls} w-full`} type="number" placeholder="Deposit received (KES, optional)" value={f.deposit} onChange={set("deposit")} />
      {Number(f.deposit) > 0 && (
        <label className="block text-xs text-slate-400">Deposit received on<input className={`${inputCls} mt-1 w-full`} type="date" value={f.received} onChange={set("received")} /></label>
      )}
      <p className="text-xs text-slate-400">Rent is billed from the next 1st of the month.</p>
    </Form>
  );
}

const changed = async (q) => {
  const { data, error } = await q.select("id");
  if (error) return error;
  if (!data?.length) return { message: "Nothing was saved. Only an owner can make this change." };
  return null;
};

export function EditUnit({ supabase, unit, onClose, onDone }) {
  const [f, setF] = useState({ number: unit.unit_number, rent: "" });
  useEffect(() => {
    supabase.from("units").select("rent_amount").eq("id", unit.unit_id).maybeSingle()
      .then(({ data }) => data && setF((x) => ({ ...x, rent: String(data.rent_amount) })));
  }, []);
  return (
    <Form title={`Edit unit ${unit.unit_number}`} onClose={onClose} onDone={onDone} canSave={f.number.trim() && Number(f.rent) > 0}
      save={() => changed(supabase.from("units").update({ unit_number: f.number.trim(), rent_amount: Number(f.rent) }).eq("id", unit.unit_id))}>
      <label className="block text-xs text-slate-400">Unit number<input className={`${inputCls} mt-1 w-full`} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></label>
      <label className="block text-xs text-slate-400">Monthly rent (KES)<input className={`${inputCls} mt-1 w-full`} type="number" value={f.rent} onChange={(e) => setF({ ...f, rent: e.target.value })} /></label>
      <p className="text-xs text-amber-300">A new rent applies from the next invoice. Invoices already created keep the old amount. Changing the unit number also changes its account number, so tell the tenant.</p>
    </Form>
  );
}

export function EditTenant({ supabase, tenantId, onClose, onDone }) {
  const [f, setF] = useState({ name: "", phone: "" });
  useEffect(() => {
    supabase.from("tenants").select("full_name, phone").eq("id", tenantId).maybeSingle()
      .then(({ data }) => data && setF({ name: data.full_name, phone: data.phone }));
  }, []);
  return (
    <Form title="Edit tenant" onClose={onClose} onDone={onDone} canSave={f.name.trim() && f.phone.trim()}
      save={() => {
        const phone = normalizePhone(f.phone);
        if (!phone) return { message: PHONE_HINT };
        return changed(supabase.from("tenants").update({ full_name: f.name.trim(), phone }).eq("id", tenantId));
      }}>
      <label className="block text-xs text-slate-400">Full name<input className={`${inputCls} mt-1 w-full`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="block text-xs text-slate-400">Phone<input className={`${inputCls} mt-1 w-full`} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
    </Form>
  );
}
