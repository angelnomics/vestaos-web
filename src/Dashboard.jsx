import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { X } from "lucide-react";
import Manage from "./Manage.jsx";
import Readings from "./Readings.jsx";
import Layout from "./Layout.jsx";
import Units from "./Units.jsx";
import Tenants from "./Tenants.jsx";
import Payments from "./Payments.jsx";
import Invoices from "./Invoices.jsx";
import Sms from "./Sms.jsx";
import Maintenance from "./Maintenance.jsx";
import Security from "./Security.jsx";
import Reports from "./Reports.jsx";
import Settings from "./Settings.jsx";
import Properties from "./Properties.jsx";
import Logo from "./Logo.jsx";
import { AddProperty, AddUnit, AddTenant } from "./Actions.jsx";
import { kes, STATES, PageHead } from "./ui.jsx";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Shown under the login form when filled in.
const SUPPORT = { email: "nicholink254@gmail.com", phone: "0795629436" };

const FEATURES = [
  ["◆", "M-Pesa Reconciliation", "Automatically match incoming payments to the correct tenant and invoice."],
  ["▤", "Automated Billing", "Generate monthly invoices and send payment reminders automatically."],
  ["♙", "Tenant Management", "Keep tenant, unit and payment information organized in one place."],
  ["🔧", "Maintenance", "Track property issues from reporting through resolution."],
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");

  const forgot = async () => {
    if (!email.trim()) return setErr("Enter your email address first.");
    setErr(""); setInfo("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (error) return setErr(error.message);
    setInfo("If that email has an account, a password reset link is on its way.");
  };

  const signIn = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) return setErr("Please enter your email and password.");
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(error.message);
    setBusy(false);
  };

  const logo = (px) => <Logo size={px} />;
  const inputCls = "h-[46px] w-full rounded-lg border border-gray-200 bg-white px-10 text-[13px] text-gray-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";

  return (
    <div className="grid min-h-screen bg-slate-50 md:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gray-900 p-14 text-white md:flex">
        <div className="pointer-events-none absolute -right-44 top-24 h-[450px] w-[450px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-80 top-0 h-[650px] w-[650px] rounded-full border border-white/5" />
        <div className="relative flex items-center gap-3">
          {logo(45)}
          <div><div className="text-xl font-extrabold tracking-wide">SOVA</div><div className="text-[9px] tracking-[0.15em] text-gray-400">PROPERTY MANAGEMENT</div></div>
        </div>
        <div className="relative max-w-[520px]">
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight">Manage your properties. <span className="text-blue-400">Simply.</span></h1>
          <p className="mt-5 max-w-[470px] text-base leading-7 text-gray-400">SOVA brings property management, tenant billing, M-Pesa payments, maintenance and communication into one connected platform.</p>
          <div className="mt-9 grid grid-cols-2 gap-4">
            {FEATURES.map(([icon, title, text]) => (
              <div key={title} className="rounded-[10px] border border-gray-700 bg-white/[0.03] p-4">
                <div className="mb-2.5 text-[19px]">{icon}</div>
                <div className="mb-1 text-xs font-bold">{title}</div>
                <div className="text-[10px] leading-relaxed text-gray-400">{text}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-gray-500">© 2026 SOVA. Property management platform.</div>
      </section>

      <section className="flex items-center justify-center bg-white p-6 md:p-9">
        <div className="w-full max-w-[420px]">
          <div className="mb-11 flex items-center justify-center gap-2.5 md:hidden">
            {logo(40)}<strong className="text-lg tracking-wide text-gray-900">SOVA</strong>
          </div>
          <div className="mb-8">
            <h2 className="mb-2 text-[30px] font-bold text-gray-900">Welcome back</h2>
            <p className="text-[13px] leading-relaxed text-gray-500">Sign in to access your property management dashboard.</p>
          </div>
          {err && <div className="mb-5 rounded-[7px] border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-600">{err}</div>}
          {info && <div className="mb-5 rounded-[7px] border border-green-200 bg-green-50 px-3 py-2.5 text-[11px] text-green-700">{info}</div>}
          <form onSubmit={signIn}>
            <div className="mb-5">
              <label className="mb-2 block text-xs font-bold text-gray-900" htmlFor="email">EMAIL ADDRESS</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[15px] text-gray-500">@</span>
                <input id="email" type="email" autoComplete="email" className={inputCls} placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold text-gray-900" htmlFor="password">PASSWORD</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[15px] text-gray-500">*</span>
                <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className={inputCls}
                  placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-sm text-gray-500">{show ? "Hide" : "Show"}</button>
              </div>
              <div className="mt-2 text-right"><button type="button" onClick={forgot} className="text-[11px] font-semibold text-blue-600 hover:underline">Forgot password?</button></div>
            </div>
            <button type="submit" disabled={busy} className="h-[47px] w-full rounded-lg bg-blue-600 text-[13px] font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="my-6 flex items-center gap-3 text-[10px] text-gray-400 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200">SECURE PROPERTY MANAGEMENT</div>
          {(SUPPORT.email || SUPPORT.phone) && (
            <div className="text-center text-[11px] leading-relaxed text-gray-500">
              Need help accessing your account?<br />
              {SUPPORT.email && <a className="font-semibold text-blue-600" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>}
              {SUPPORT.email && SUPPORT.phone && " · "}
              {SUPPORT.phone && <a className="font-semibold text-blue-600" href={`tel:${SUPPORT.phone}`}>{SUPPORT.phone}</a>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function UnitDrawer({ unit, onClose }) {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    supabase.from("invoice_balances").select("*")
      .eq("unit_id", unit.unit_id).order("period", { ascending: false }).limit(6)
      .then(({ data }) => setInvoices(data ?? []));
  }, [unit.unit_id]);

  return (
    <div className="fixed inset-0 z-20 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold text-white">House {unit.unit_number}</h2>
            <p className="text-sm text-slate-400">{unit.tenant_name ?? "Vacant"} · Ref {unit.account_ref}</p>
          </div>
          <button onClick={onClose}><X className="text-slate-400" /></button>
        </div>
        {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
        {invoices.map((i) => (
          <div key={i.invoice_id} className="flex justify-between text-sm border-t border-slate-800 pt-2">
            <span className="text-slate-300">
              {new Date(i.period).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
            </span>
            <span className={i.balance > 0 ? "text-red-300" : "text-emerald-300"}>
              {i.balance > 0 ? `${kes(i.balance)} owed of ${kes(i.total)}` : `${kes(i.total)} paid`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Unmatched({ propertyId, units }) {
  const [rows, setRows] = useState([]);
  const [pick, setPick] = useState({});

  const load = () =>
    supabase.from("payments")
      .select("id, trans_id, bill_ref_raw, amount, payer_name, paid_at")
      .eq("match_status", "unmatched").eq("property_id", propertyId)
      .order("paid_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));

  useEffect(() => { load(); }, [propertyId]);

  const assign = async (id) => {
    if (!pick[id]) return;
    const { error } = await supabase.rpc("assign_payment", { p_payment_id: id, p_unit_id: pick[id] });
    if (error) alert(error.message); else load();
  };

  if (rows.length === 0) return <p className="text-slate-500 text-sm">No unmatched payments.</p>;
  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white font-medium">{kes(p.amount)}</span>
            <span className="text-slate-400">{p.trans_id}</span>
          </div>
          <p className="text-xs text-slate-400">
            Typed: “{p.bill_ref_raw || "-"}” · {p.payer_name || "Unknown payer"}
          </p>
          <div className="flex gap-2">
            <select className="flex-1 rounded-lg bg-slate-950 border border-slate-700 p-2 text-sm text-slate-100"
              value={pick[p.id] ?? ""} onChange={(e) => setPick({ ...pick, [p.id]: e.target.value })}>
              <option value="">Assign to unit…</option>
              {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.account_ref}</option>)}
            </select>
            <button onClick={() => assign(p.id)} className="rounded-lg bg-emerald-600 px-3 text-sm text-white">Assign</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const [properties, setProperties] = useState([]);
  const [propertyId, setPropertyId] = useState(null);
  const [units, setUnits] = useState([]);
  const [tab, setTab] = useState("grid");
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [fab, setFab] = useState(false);
  const [addKind, setAddKind] = useState(null);

  useEffect(() => {
    supabase.from("properties").select("id, name").order("name").then(({ data }) => {
      setProperties(data ?? []);
      setPropertyId((cur) => (data?.some((p) => p.id === cur) ? cur : data?.[0]?.id ?? null));
    });
  }, [tick]);

  useEffect(() => {
    if (!propertyId) return setUnits([]);
    supabase.from("unit_dashboard").select("*").eq("property_id", propertyId)
      .order("unit_number").then(({ data }) => setUnits(data ?? []));
  }, [propertyId, tick]);

  const summary = useMemo(() => ({
    paid: units.filter((u) => u.state === "paid").length,
    overdue: units.filter((u) => u.state === "overdue").length,
    arrears: units.reduce((s, u) => s + Number(u.balance), 0),
  }), [units]);

  return (
    <Layout page={tab} setPage={setTab} properties={properties} propertyId={propertyId}
      setPropertyId={setPropertyId} onSignOut={() => supabase.auth.signOut()}>
      {tab === "grid" && (
        <>
          <PageHead title="Dashboard" hint="Rent status for every unit this month." />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-900 p-3"><div className="text-xl font-semibold text-emerald-300">{summary.paid}</div><div className="text-xs text-slate-400">Paid</div></div>
            <div className="rounded-xl bg-slate-900 p-3"><div className="text-xl font-semibold text-red-300">{summary.overdue}</div><div className="text-xs text-slate-400">Overdue</div></div>
            <div className="rounded-xl bg-slate-900 p-3"><div className="text-sm font-semibold text-white">{kes(summary.arrears)}</div><div className="text-xs text-slate-400">Outstanding</div></div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {units.map((u) => (
              <button key={u.unit_id} onClick={() => setSelected(u)}
                className={`rounded-xl border p-3 text-left ${STATES[u.state].cls}`}>
                <div className="font-semibold">{u.unit_number}</div>
                <div className="text-xs opacity-80">{STATES[u.state].label}</div>
                {u.balance > 0 && <div className="text-xs mt-1">{kes(u.balance)}</div>}
              </button>
            ))}
          </div>
        </>
      )}
      {tab === "properties" && <Properties supabase={supabase} properties={properties} onChanged={refresh} onOpen={(id) => { setPropertyId(id); setTab("grid"); }} />}
      {tab === "units" && <Units supabase={supabase} propertyId={propertyId} units={units} onSelect={setSelected} onChanged={refresh} />}
      {tab === "tenants" && <Tenants supabase={supabase} units={units} onChanged={refresh} />}
      {tab === "invoices" && <Invoices supabase={supabase} units={units} />}
      {tab === "payments" && <Payments supabase={supabase} propertyId={propertyId} units={units} onChanged={refresh} />}
      {tab === "unmatched" && (<><PageHead title="Unmatched payments" hint="Assign these to a unit." /><Unmatched propertyId={propertyId} units={units} /></>)}
      {tab === "reports" && <Reports supabase={supabase} units={units} />}
      {tab === "maintenance" && <Maintenance supabase={supabase} propertyId={propertyId} units={units} />}
      {tab === "security" && <Security supabase={supabase} propertyId={propertyId} />}
      {tab === "sms" && <Sms supabase={supabase} units={units} />}
      {tab === "settings" && <Settings supabase={supabase} propertyId={propertyId} />}
      {tab === "readings" && <Readings supabase={supabase} units={units} />}
      {tab === "manage" && <Manage supabase={supabase} propertyId={propertyId} properties={properties} units={units} />}
      <div className="fixed bottom-5 right-5 z-20 flex flex-col items-end gap-2">
        {fab && [["property", "Add property"], ["unit", "Add unit"], ["tenant", "Add tenant"]].map(([k, label]) => (
          <button key={k} className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white shadow-lg" onClick={() => { setAddKind(k); setFab(false); }}>{label}</button>
        ))}
        <button aria-label="Quick add" className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg" onClick={() => setFab(!fab)}>{fab ? "×" : "+"}</button>
      </div>
      {addKind === "property" && <AddProperty supabase={supabase} onClose={() => setAddKind(null)} onDone={refresh} />}
      {addKind === "unit" && <AddUnit supabase={supabase} propertyId={propertyId} onClose={() => setAddKind(null)} onDone={refresh} />}
      {addKind === "tenant" && <AddTenant supabase={supabase} units={units} onClose={() => setAddKind(null)} onDone={refresh} />}
      {selected && <UnitDrawer unit={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}

function SetPassword({ onDone }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords do not match.");
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    window.history.replaceState(null, "", window.location.pathname);
    onDone();
  };

  const field = "h-[46px] w-full rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-900 outline-none focus:border-blue-600";
  return (
    <div className="grid min-h-screen place-items-center bg-white p-6">
      <form onSubmit={save} className="w-full max-w-[420px] space-y-4">
        <h2 className="text-[26px] font-bold text-gray-900">Choose a new password</h2>
        <p className="text-[13px] text-gray-500">Enter a new password for your account.</p>
        {err && <div className="rounded-[7px] border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] text-red-600">{err}</div>}
        <input type="password" autoComplete="new-password" className={field} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input type="password" autoComplete="new-password" className={field} placeholder="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <button type="submit" disabled={busy} className="h-[47px] w-full rounded-lg bg-blue-600 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-70">{busy ? "Saving..." : "Save password"}</button>
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(() => window.location.hash.includes("type=recovery"));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (recovery && session) return <SetPassword onDone={() => setRecovery(false)} />;
  return session ? <Dashboard /> : <Login />;
}