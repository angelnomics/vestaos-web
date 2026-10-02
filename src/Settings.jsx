import { useEffect, useState } from "react";
import { PageHead, inputCls } from "./ui.jsx";

export default function Settings({ supabase, propertyId }) {
  const [me, setMe] = useState({ full_name: "", phone: "" });
  const [prop, setProp] = useState({ name: "", code: "", pay_shortcode: "", address: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) =>
      supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
        .then(({ data }) => data && setMe({ full_name: data.full_name ?? "", phone: data.phone ?? "" })));
  }, []);
  useEffect(() => {
    if (!propertyId) return;
    supabase.from("properties").select("name, code, pay_shortcode, address").eq("id", propertyId).maybeSingle()
      .then(({ data }) => data && setProp({ name: data.name ?? "", code: data.code ?? "", pay_shortcode: data.pay_shortcode ?? "", address: data.address ?? "" }));
  }, [propertyId]);

  const done = ({ error }) => setMsg(error ? "Error: " + error.message : "Saved.");
  const saveMe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    done(await supabase.from("profiles").update({ full_name: me.full_name.trim(), phone: me.phone.trim() }).eq("id", user.id));
  };
  const saveProp = async () =>
    done(await supabase.from("properties").update({ name: prop.name.trim(), pay_shortcode: prop.pay_shortcode.trim() || null, address: prop.address.trim() || null }).eq("id", propertyId));

  const Field = ({ label, value, onChange, disabled }) => (
    <label className="block space-y-1"><span className="text-xs text-slate-400">{label}</span>
      <input className={`${inputCls} w-full disabled:opacity-50`} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} /></label>
  );
  const btn = "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white";

  return (
    <div className="space-y-4">
      <PageHead title="Settings" />
      {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-emerald-300"}`}>{msg}</p>}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="font-medium text-white">Your profile</h3>
        <Field label="Full name" value={me.full_name} onChange={(v) => setMe({ ...me, full_name: v })} />
        <Field label="Phone" value={me.phone} onChange={(v) => setMe({ ...me, phone: v })} />
        <button className={btn} onClick={saveMe}>Save profile</button>
      </section>
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="font-medium text-white">This property</h3>
        <Field label="Name" value={prop.name} onChange={(v) => setProp({ ...prop, name: v })} />
        <Field label="Code (cannot be changed, tenants use it in account numbers)" value={prop.code} disabled onChange={() => {}} />
        <Field label="Paybill or Till number" value={prop.pay_shortcode} onChange={(v) => setProp({ ...prop, pay_shortcode: v })} />
        <Field label="Address" value={prop.address} onChange={(v) => setProp({ ...prop, address: v })} />
        <button className={btn} disabled={!prop.name.trim()} onClick={saveProp}>Save property</button>
      </section>
    </div>
  );
}
