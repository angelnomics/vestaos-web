import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import { kes } from "./ui.jsx";
import { normalizePhone, PHONE_HINT } from "./phone.js";

const field = "h-[46px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-900 outline-none focus:border-blue-600";
const btn = "h-[46px] w-full rounded-lg bg-blue-600 text-[14px] font-bold text-white hover:bg-blue-700 disabled:opacity-60";
const monthName = (d) => new Date(d).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
const dayName = (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function TenantLogin({ supabase, onBack }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (e) => {
    e?.preventDefault();
    const p = normalizePhone(phone);
    if (!p) return setErr(PHONE_HINT);
    setBusy(true); setErr("");
    const { error } = await supabase.functions.invoke("tenant-login", { body: { action: "request", phone: p } });
    setBusy(false);
    if (error) return setErr("Could not send the code. Please try again.");
    setStep("code");
  };

  const verify = async (e) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const { data, error } = await supabase.functions.invoke("tenant-login", { body: { action: "verify", phone: normalizePhone(phone), code: code.trim() } });
    if (error || data?.error || !data?.token_hash) {
      setBusy(false);
      let text = data?.error;
      if (!text && error?.context?.json) { try { text = (await error.context.json()).error; } catch { /* ignore */ } }
      return setErr(text || "That code did not work. Please try again.");
    }
    const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
    setBusy(false);
    if (vErr) setErr("Sign-in failed. Please request a new code.");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-white p-6">
      <form onSubmit={step === "phone" ? request : verify} className="w-full max-w-[400px] space-y-4">
        <div className="flex items-center gap-3"><Logo size={40} /><strong className="text-lg tracking-wide text-gray-900">SOVA</strong></div>
        <div>
          <h2 className="text-[26px] font-bold text-gray-900">Tenant sign-in</h2>
          <p className="mt-1 text-[13px] text-gray-500">
            {step === "phone" ? "Enter the phone number your landlord has for you. We will text you a 6-digit code." : `We sent a code to ${phone}. It is valid for 10 minutes.`}
          </p>
        </div>
        {err && <div className="rounded-[7px] border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-600">{err}</div>}
        {step === "phone" ? (
          <>
            <input className={field} type="tel" inputMode="tel" placeholder="e.g. 0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className={btn} disabled={busy || !phone.trim()}>{busy ? "Sending…" : "Send me a code"}</button>
          </>
        ) : (
          <>
            <input className={`${field} text-center text-[20px] tracking-[0.4em]`} inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <button className={btn} disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
            <button type="button" className="text-[12px] font-semibold text-blue-600" onClick={() => { setStep("phone"); setCode(""); setErr(""); }}>Use a different number or get a new code</button>
          </>
        )}
        <button type="button" className="block text-[12px] text-gray-500 hover:underline" onClick={onBack}>← Landlord sign-in</button>
      </form>
    </div>
  );
}

export function TenantPortal({ supabase, support }) {
  const [d, setD] = useState(undefined);
  const [issue, setIssue] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");

  const load = () => supabase.rpc("tenant_portal").then(({ data }) => setD(data ?? null));
  useEffect(() => { load(); }, []);

  const copy = (label, text) => { navigator.clipboard?.writeText(String(text)); setCopied(label); setTimeout(() => setCopied(""), 1500); };
  const send = async () => {
    setMsg("");
    const { error } = await supabase.rpc("tenant_report_issue", { p_title: issue.trim() });
    if (error) return setMsg(error.message);
    setIssue(""); setMsg("Thank you. Your landlord has been told."); load();
  };

  const header = (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2"><Logo size={34} /><strong className="tracking-wide text-gray-900">SOVA</strong></div>
      <button className="text-sm text-gray-500 hover:underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </header>
  );
  if (d === undefined) return null;
  if (d === null) return (
    <div className="mx-auto max-w-md space-y-4 p-5">{header}
      <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">We could not find an active tenancy for this number. Please contact your landlord.</p>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const balance = Number(d.balance);
  const overdue = (d.invoices ?? []).some((i) => Number(i.balance) > 0 && i.due_date < today);
  const Copy = ({ label, text }) => (
    <button className="ml-2 rounded-md border border-gray-300 px-2 py-0.5 text-xs text-gray-600" onClick={() => copy(label, text)}>{copied === label ? "Copied" : "Copy"}</button>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="mx-auto max-w-md space-y-4 p-5">
        {header}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hello {d.name.split(" ")[0]}</h1>
          <p className="text-sm text-gray-500">{d.property} · Unit {d.unit}</p>
        </div>

        <section className={`rounded-2xl p-5 text-white shadow-sm ${balance <= 0 ? "bg-emerald-600" : overdue ? "bg-red-600" : "bg-blue-600"}`}>
          <div className="text-xs uppercase opacity-80">{balance <= 0 ? "You are all paid up" : overdue ? "Overdue balance" : "Amount due"}</div>
          <div className="mt-1 text-3xl font-bold">{kes(balance)}</div>
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">How to pay</h2>
          {d.paybill ? (
            <>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                <li>Open <b>M-Pesa</b>, then <b>Lipa na M-Pesa</b>, then <b>Pay Bill</b>.</li>
                <li>Business number: <b>{d.paybill}</b><Copy label="paybill" text={d.paybill} /></li>
                <li>Account number: <b>{d.account}</b><Copy label="account" text={d.account} /></li>
                <li>Enter the amount and your M-Pesa PIN.</li>
              </ol>
              <p className="text-xs text-gray-500">Use the account number exactly as shown, so your payment reaches your unit.</p>
            </>
          ) : <p className="text-sm text-gray-600">Please ask your landlord for the payment details. Your account number is <b>{d.account}</b>.</p>}
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Your invoices</h2>
          {(d.invoices ?? []).length === 0 && <p className="text-sm text-gray-500">No invoices yet. Your first one comes on the 1st of next month.</p>}
          {(d.invoices ?? []).map((i) => (
            <details key={i.invoice_id} className="rounded-lg border border-gray-200 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{monthName(i.period)}</span>
                <span className={Number(i.balance) > 0 ? (i.due_date < today ? "font-semibold text-red-600" : "font-semibold text-amber-600") : "font-semibold text-emerald-600"}>
                  {Number(i.balance) > 0 ? `${kes(i.balance)} due` : "Paid"}
                </span>
              </summary>
              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2 text-sm text-gray-700">
                <div className="flex justify-between"><span>Rent</span><span>{kes(i.rent_amount)}</span></div>
                {(i.utilities ?? []).map((u, k) => (
                  <div key={k} className="flex justify-between"><span>{cap(u.kind)} ({Number(u.used)} × {kes(u.rate)})</span><span>{kes(u.amount)}</span></div>
                ))}
                {(i.adjustments ?? []).map((a, k) => (
                  <div key={k} className="flex justify-between"><span>{a.kind === "credit" ? "Credit" : "Charge"}: {a.description}</span><span>{a.kind === "credit" ? "-" : ""}{kes(a.amount)}</span></div>
                ))}
                <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold"><span>Total</span><span>{kes(i.total)}</span></div>
                <div className="flex justify-between"><span>Paid</span><span>{kes(i.paid)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Due date</span><span>{dayName(i.due_date)}</span></div>
              </div>
            </details>
          ))}
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Your payments</h2>
          {(d.payments ?? []).length === 0 && <p className="text-sm text-gray-500">No payments recorded yet.</p>}
          {(d.payments ?? []).map((p) => (
            <div key={p.trans_id} className="flex items-center justify-between border-b border-gray-100 py-1 text-sm">
              <div><div className="font-medium text-gray-900">{kes(p.amount)}</div><div className="text-xs text-gray-500">{p.trans_id} · {dayName(p.paid_at)}</div></div>
              <span className="text-xs text-emerald-600">Received</span>
            </div>
          ))}
        </section>

        <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Report a problem</h2>
          <input className={field} placeholder="e.g. Leaking tap in the kitchen" value={issue} maxLength={200} onChange={(e) => setIssue(e.target.value)} />
          <button className={btn} disabled={!issue.trim()} onClick={send}>Send to my landlord</button>
          {msg && <p className="text-sm text-gray-600">{msg}</p>}
          {(d.requests ?? []).map((r, k) => (
            <div key={k} className="flex justify-between border-t border-gray-100 pt-1 text-sm text-gray-700"><span>{r.title}</span><span className="capitalize text-gray-500">{String(r.status).replace("_", " ")}</span></div>
          ))}
        </section>

        {(support?.email || support?.phone) && <p className="text-center text-xs text-gray-500">Need help? {support.email}{support.email && support.phone && " · "}{support.phone}</p>}
      </div>
    </div>
  );
}
