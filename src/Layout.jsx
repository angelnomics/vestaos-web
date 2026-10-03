import { useState } from "react";
import { LayoutGrid, Users, CreditCard, FileText, Inbox, Droplets, Settings, Menu, LogOut, Building2, Wrench, ShieldCheck, Mail, TrendingUp, Landmark } from "lucide-react";

const NAV = [
  ["Main", [["grid", "Dashboard", LayoutGrid], ["properties", "Properties", Landmark], ["units", "Units", Building2], ["tenants", "Tenants", Users]]],
  ["Finance", [["invoices", "Invoices", FileText], ["payments", "M-Pesa Payments", CreditCard], ["unmatched", "Unmatched", Inbox], ["reports", "Reports", TrendingUp]]],
  ["Operations", [["readings", "Readings", Droplets], ["maintenance", "Maintenance", Wrench], ["security", "Security Log", ShieldCheck], ["sms", "SMS Outbox", Mail], ["manage", "Manage", Settings]]],
];

export default function Layout({ page, setPage, properties, propertyId, setPropertyId, onSignOut, children }) {
  const [open, setOpen] = useState(false);
  const go = (id) => { setPage(id); setOpen(false); };

  const sidebar = (
    <aside className="flex h-full w-60 flex-col bg-slate-900 border-r border-slate-800 p-4">
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 font-bold text-white">V</div>
        <div>
          <div className="font-semibold text-white">VESTA OS</div>
          <div className="text-[10px] tracking-widest text-slate-500">PROPERTY MANAGEMENT</div>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {NAV.map(([label, items]) => (
          <div key={label}>
            <div className="px-2 pb-1 text-[10px] font-bold uppercase text-slate-500">{label}</div>
            {items.map(([id, name, Icon]) => (
              <button key={id} onClick={() => go(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${page === id ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                <Icon size={16} /> {name}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <button onClick={() => go("settings")}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${page === "settings" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
        <Settings size={16} /> Settings
      </button>
      <button onClick={onSignOut} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800">
        <LogOut size={16} /> Logout
      </button>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-y-0 left-0 hidden md:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative h-full w-60" onClick={(e) => e.stopPropagation()}>{sidebar}</div>
        </div>
      )}
      <div className="md:ml-60">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 p-3 backdrop-blur">
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(true)}><Menu className="text-slate-300" /></button>
          <select className="rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm"
            value={propertyId ?? ""} onChange={(e) => setPropertyId(e.target.value)}>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </header>
        <main className="mx-auto max-w-5xl space-y-4 p-4">{children}</main>
      </div>
    </div>
  );
}
