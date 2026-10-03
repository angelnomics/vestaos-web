import { Children } from "react";

export const kes = (n) => "KES " + Number(n || 0).toLocaleString("en-KE");

export const STATES = {
  paid:    { label: "Paid",    cls: "bg-emerald-500/15 border-emerald-500/60 text-emerald-300" },
  unpaid:  { label: "Due",     cls: "bg-amber-500/15 border-amber-500/60 text-amber-300" },
  overdue: { label: "Overdue", cls: "bg-red-500/15 border-red-500/60 text-red-300" },
  vacant:  { label: "Vacant",  cls: "bg-transparent border-dashed border-slate-600 text-slate-500" },
};

export const Badge = ({ state }) => (
  <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATES[state]?.cls ?? ""}`}>
    {STATES[state]?.label ?? state}
  </span>
);

export const inputCls = "rounded-lg bg-slate-900 border border-slate-700 p-2 text-sm text-slate-100";

export const PageHead = ({ title, hint, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-2">
    <div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {hint && <p className="text-sm text-slate-400">{hint}</p>}
    </div>
    {children}
  </div>
);

export const Table = ({ head, children, empty = "Nothing here yet." }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="text-left text-xs uppercase text-slate-400">
          {head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {Children.count(children) === 0 || Children.toArray(children).flat().length === 0
          ? <tr><td colSpan={head.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>
          : children}
      </tbody>
    </table>
  </div>
);

export const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
    <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-slate-700 bg-slate-900 p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <button className="text-slate-400" aria-label="Close" onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

export const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-slate-800 py-2 text-sm">
    <span className="text-slate-400">{label}</span><span className="text-right text-slate-100">{children ?? "—"}</span>
  </div>
);
