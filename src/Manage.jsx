import { useState } from "react";

const input = "w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-slate-100";
const btn = "w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 p-3 font-medium text-white disabled:opacity-40";

function Card({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Manage({ supabase, propertyId, properties, units }) {
  const [msg, setMsg] = useState("");
  const [prop, setProp] = useState({ name: "", code: "", shortcode: "" });
  const [unit, setUnit] = useState({ number: "", rent: "" });
  const [tenant, setTenant] = useState({ unitId: "", name: "", phone: "" });
  const [moveOut, setMoveOut] = useState("");

  const vacant = units.filter((u) => u.state === "vacant");
  const occupied = units.filter((u) => u.state !== "vacant");
  const current = properties.find((p) => p.id === propertyId)?.name;

  const run = async (promise, okText) => {
    const { error } = await promise;
    if (error) return setMsg("Error: " + error.message);
    setMsg(okText);
    setTimeout(() => window.location.reload(), 900);
  };

  const addProperty = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    run(
      supabase.from("properties").insert({
        owner_id: user.id,
        name: prop.name.trim(),
        code: prop.code.trim(),
        pay_shortcode: prop.shortcode.trim() || null,
      }),
      "Property added.",
    );
  };

  const addUnit = () =>
    run(
      supabase.from("units").insert({
        property_id: propertyId,
        unit_number: unit.number.trim(),
        rent_amount: Number(unit.rent),
      }),
      "Unit added.",
    );

  const addTenant = () =>
    run(
      supabase.from("tenants").insert({
        unit_id: tenant.unitId,
        full_name: tenant.name.trim(),
        phone: tenant.phone.trim(),
      }),
      "Tenant added.",
    );

  const endTenancy = () => {
    if (!window.confirm("Move this tenant out? Their unit becomes vacant.")) return;
    run(
      supabase.from("tenants")
        .update({ is_active: false, move_out: new Date().toISOString().slice(0, 10) })
        .eq("unit_id", moveOut).eq("is_active", true),
      "Tenant moved out.",
    );
  };

  return (
    <div className="space-y-4">
      {msg && (
        <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-emerald-300"}`}>{msg}</p>
      )}

      <Card title="Add a property" hint="Code is 2 to 8 letters or numbers, e.g. RS12. Tenants use it in their account number.">
        <input className={input} placeholder="Property name" value={prop.name}
          onChange={(e) => setProp({ ...prop, name: e.target.value })} />
        <input className={input} placeholder="Code (e.g. RS12)" value={prop.code}
          onChange={(e) => setProp({ ...prop, code: e.target.value })} />
        <input className={input} placeholder="Paybill or Till number (optional)" value={prop.shortcode}
          onChange={(e) => setProp({ ...prop, shortcode: e.target.value })} />
        <button className={btn} disabled={!prop.name.trim() || !prop.code.trim()} onClick={addProperty}>
          Add property
        </button>
      </Card>

      <Card title={`Add a unit${current ? " to " + current : ""}`}>
        <input className={input} placeholder="Unit number (e.g. A1)" value={unit.number}
          onChange={(e) => setUnit({ ...unit, number: e.target.value })} />
        <input className={input} type="number" placeholder="Monthly rent (KES)" value={unit.rent}
          onChange={(e) => setUnit({ ...unit, rent: e.target.value })} />
        <button className={btn} disabled={!propertyId || !unit.number.trim() || !(Number(unit.rent) > 0)} onClick={addUnit}>
          Add unit
        </button>
      </Card>

      <Card title="Add a tenant" hint="Only vacant units are listed. Rent is billed from the next 1st of the month.">
        <select className={input} value={tenant.unitId} onChange={(e) => setTenant({ ...tenant, unitId: e.target.value })}>
          <option value="">Choose a vacant unit…</option>
          {vacant.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.account_ref}</option>)}
        </select>
        <input className={input} placeholder="Full name" value={tenant.name}
          onChange={(e) => setTenant({ ...tenant, name: e.target.value })} />
        <input className={input} placeholder="Phone (e.g. 0712345678)" value={tenant.phone}
          onChange={(e) => setTenant({ ...tenant, phone: e.target.value })} />
        <button className={btn} disabled={!tenant.unitId || !tenant.name.trim() || !tenant.phone.trim()} onClick={addTenant}>
          Add tenant
        </button>
      </Card>

      <Card title="Move a tenant out">
        <select className={input} value={moveOut} onChange={(e) => setMoveOut(e.target.value)}>
          <option value="">Choose an occupied unit…</option>
          {occupied.map((u) => (
            <option key={u.unit_id} value={u.unit_id}>{u.account_ref} · {u.tenant_name}</option>
          ))}
        </select>
        <button className={btn} disabled={!moveOut} onClick={endTenancy}>Move out</button>
      </Card>
    </div>
  );
}