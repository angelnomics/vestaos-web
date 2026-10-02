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
import { kes, STATES, PageHead } from "./ui.jsx";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center gap-3 pb-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-600 font-bold text-white">V</div>
          <div><h1 className="text-xl font-semibold text-white">VESTA OS</h1><p className="text-[10px] tracking-widest text-slate-500">PROPERTY MANAGEMENT</p></div>
        </div>
        <input className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-slate-100"
          placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-slate-100"
          placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button onClick={signIn} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 p-3 font-medium text-white">
          Sign in
        </button>
      </div>
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

  useEffect(() => {
    supabase.from("properties").select("id, name").order("name").then(({ data }) => {
      setProperties(data ?? []);
      if (data?.length) setPropertyId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propertyId) return;
    supabase.from("unit_dashboard").select("*").eq("property_id", propertyId)
      .order("unit_number").then(({ data }) => setUnits(data ?? []));
  }, [propertyId]);

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
      {tab === "units" && <Units units={units} onSelect={setSelected} />}
      {tab === "tenants" && <Tenants supabase={supabase} units={units} onSelect={setSelected} />}
      {tab === "invoices" && <Invoices supabase={supabase} units={units} />}
      {tab === "payments" && <Payments supabase={supabase} propertyId={propertyId} />}
      {tab === "unmatched" && (<><PageHead title="Unmatched payments" hint="Assign these to a unit." /><Unmatched propertyId={propertyId} units={units} /></>)}
      {tab === "reports" && <Reports supabase={supabase} units={units} />}
      {tab === "maintenance" && <Maintenance supabase={supabase} propertyId={propertyId} units={units} />}
      {tab === "security" && <Security supabase={supabase} propertyId={propertyId} />}
      {tab === "sms" && <Sms supabase={supabase} units={units} />}
      {tab === "settings" && <Settings supabase={supabase} propertyId={propertyId} />}
      {tab === "readings" && <Readings supabase={supabase} units={units} />}
      {tab === "manage" && <Manage supabase={supabase} propertyId={propertyId} properties={properties} units={units} />}
      {selected && <UnitDrawer unit={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return session ? <Dashboard /> : <Login />;
}