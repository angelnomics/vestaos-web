import { useEffect, useState } from "react";
import { PageHead, Modal, inputCls } from "./ui.jsx";

export default function Settings({ supabase, propertyId }) {
  const [me, setMe] = useState({ full_name: "", phone: "" });
  const [prop, setProp] = useState({ name: "", code: "", pay_shortcode: "", address: "" });
  const [msg, setMsg] = useState("");
  const [members, setMembers] = useState([]);
  const [inv, setInv] = useState({ email: "", role: "caretaker" });
  const [invMsg, setInvMsg] = useState("");
  const [invBusy, setInvBusy] = useState(false);
  const [link, setLink] = useState(null);

  const loadMembers = () => propertyId && supabase.from("property_members")
    .select("user_id, role, invited_email").eq("property_id", propertyId)
    .then(({ data }) => setMembers(data ?? []));
  useEffect(() => { loadMembers(); }, [propertyId]);

  const invite = async () => {
    setInvBusy(true); setInvMsg("");
    const { data, error } = await supabase.functions.invoke("invite-member", {
      body: { property_id: propertyId, email: inv.email.trim(), role: inv.role },
    });
    setInvBusy(false);
    if (error || data?.error) {
      let text = data?.error;
      if (!text && error?.context?.json) { try { text = (await error.context.json()).error; } catch { /* ignore */ } }
      return setInvMsg(text || error?.message || "Could not create the invitation.");
    }
    setLink({ url: data.link, email: inv.email.trim(), existing: data.existing });
    setInv({ email: "", role: "caretaker" });
    loadMembers();
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.invited_email ?? "this person"} from the property? They will no longer see it.`)) return;
    const { error } = await supabase.from("property_members").delete().eq("property_id", propertyId).eq("user_id", m.user_id);
    if (error) return setInvMsg("Error: " + error.message);
    setInvMsg(""); loadMembers();
  };

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
    done(await supabase.from("profiles").upsert({ id: user.id, full_name: me.full_name.trim(), phone: me.phone.trim() }));
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
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="font-medium text-white">Team for this property</h3>
        <p className="text-xs text-slate-400">Caretakers can view the property and record readings, maintenance and security notes. A co-manager (owner) can also add and delete units and tenants and invite others.</p>
        {members.length === 0 && <p className="text-sm text-slate-500">No one else has access yet.</p>}
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between gap-2 border-b border-slate-800 py-2 text-sm">
            <div><div className="text-slate-100">{m.invited_email ?? "Team member"}</div><div className="text-xs capitalize text-slate-400">{m.role === "owner" ? "Co-manager (owner)" : m.role}</div></div>
            <button className="rounded-lg border border-red-500/50 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10" onClick={() => removeMember(m)}>Remove</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <input className={`${inputCls} min-w-52 flex-1`} type="email" placeholder="Their email address" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} />
          <select className={inputCls} value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>
            <option value="caretaker">Caretaker</option>
            <option value="owner">Co-manager (owner)</option>
          </select>
          <button className={btn} disabled={invBusy || !inv.email.trim()} onClick={invite}>{invBusy ? "Creating…" : "Invite"}</button>
        </div>
        {invMsg && <p className="text-sm text-red-400">{invMsg}</p>}
      </section>
      {link && (
        <Modal title="Invitation ready" onClose={() => setLink(null)}>
          <p className="mb-3 text-sm text-slate-300">
            Send this link to <b>{link.email}</b>. They open it, choose a password and are signed in.
            {link.existing && " They already had an account, so this link lets them set a new password."}
          </p>
          <input className={`${inputCls} w-full`} readOnly value={link.url} onFocus={(e) => e.target.select()} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn} onClick={() => navigator.clipboard?.writeText(link.url)}>Copy link</button>
            <a className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800" target="_blank" rel="noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent("You have been invited to SOVA, a property management system. Open this link to set your password and sign in: " + link.url)}`}>Share on WhatsApp</a>
          </div>
          <p className="mt-3 text-xs text-slate-400">The link works once and expires after about an hour. If it expires, press Invite again for a new one.</p>
        </Modal>
      )}
    </div>
  );
}
