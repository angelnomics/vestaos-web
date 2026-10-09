import { useState } from "react";
import { PageHead, inputCls } from "./ui.jsx";
import { btnPrimary } from "./Actions.jsx";

const MAX = 320;
const pages = (n) => Math.max(1, Math.ceil(n / 160));

export default function Messages({ supabase, propertyId, units, canEdit = true, onSent }) {
  const occupied = units.filter((u) => u.state !== "vacant");
  const [mode, setMode] = useState("all");
  const [chosen, setChosen] = useState({});
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!canEdit) return <div className="space-y-4"><PageHead title="Send message" /><p className="text-sm text-slate-500">Only an owner can send messages to tenants.</p></div>;

  const targets =
    mode === "all" ? occupied
    : mode === "arrears" ? occupied.filter((u) => Number(u.balance) > 0)
    : occupied.filter((u) => chosen[u.unit_id]);
  const sample = targets[0];
  const preview = body
    .replaceAll("{name}", sample?.tenant_name?.split(" ")[0] ?? "Name")
    .replaceAll("{unit}", sample?.unit_number ?? "A1")
    .replaceAll("{balance}", sample ? Number(sample.balance || 0).toLocaleString("en-KE") : "0");

  const send = async () => {
    if (!window.confirm(`Send this message to ${targets.length} tenant${targets.length === 1 ? "" : "s"}? Each text costs SMS credit.`)) return;
    setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("send_bulk_message", {
      p_property: propertyId, p_unit_ids: targets.map((u) => u.unit_id), p_body: body.trim(),
    });
    setBusy(false);
    if (error) return setMsg("Error: " + error.message);
    setBody(""); setChosen({});
    setMsg(`Queued ${data} message${data === 1 ? "" : "s"}. They send within a minute or two.`);
    onSent?.();
  };

  const radio = (v, label) => (
    <label className="flex items-center gap-2 text-sm text-slate-200">
      <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} /> {label}
    </label>
  );

  return (
    <div className="space-y-4">
      <PageHead title="Send message" hint="Send one text to your tenants, such as a notice or reminder." />
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="text-xs uppercase text-slate-400">Who should receive it</div>
        {radio("all", `All tenants (${occupied.length})`)}
        {radio("arrears", `Only tenants with a balance (${occupied.filter((u) => Number(u.balance) > 0).length})`)}
        {radio("pick", "Choose units")}
        {mode === "pick" && (
          <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4">
            {occupied.map((u) => (
              <label key={u.unit_id} className="flex items-center gap-2 rounded-lg border border-slate-700 px-2 py-1 text-sm text-slate-200">
                <input type="checkbox" checked={!!chosen[u.unit_id]} onChange={(e) => setChosen({ ...chosen, [u.unit_id]: e.target.checked })} /> {u.unit_number}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <textarea className={`${inputCls} h-32 w-full`} maxLength={MAX} placeholder="Write your message. You can use {name}, {unit} and {balance}."
          value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{body.length}/{MAX} characters · {pages(body.length)} SMS per tenant</span>
          <span>{targets.length} recipient{targets.length === 1 ? "" : "s"}</span>
        </div>
        {body.trim() && <p className="rounded-lg bg-slate-900 p-3 text-sm text-slate-300"><span className="text-xs text-slate-500">Preview: </span>{preview}</p>}
        {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-emerald-300"}`}>{msg}</p>}
        <button className={`${btnPrimary} w-full py-3`} disabled={busy || !body.trim() || targets.length === 0 || !propertyId} onClick={send}>
          {busy ? "Sending…" : `Send to ${targets.length} tenant${targets.length === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
