import { useEffect, useState } from "react";

const tone = { red: "border-red-500/40 bg-red-500/10 text-red-200", amber: "border-amber-500/40 bg-amber-500/10 text-amber-200" };

export default function Health({ supabase, tick, onGo }) {
  const [h, setH] = useState(null);

  useEffect(() => {
    supabase.rpc("system_health").then(({ data, error }) => { if (!error) setH(data); });
  }, [tick]);

  if (!h) return null;
  const items = [];
  if (h.cron_failing > 0) items.push(["red", "The text-message sender reported errors in the last 15 minutes, so SMS may not be going out.", "sms"]);
  if (h.sms_failed > 0) items.push(["red", `${h.sms_failed} text message${h.sms_failed > 1 ? "s" : ""} failed in the last 24 hours. Open SMS Outbox to see why.`, "sms"]);
  if (h.sms_stuck > 0) items.push(["amber", `${h.sms_stuck} message${h.sms_stuck > 1 ? "s are" : " is"} waiting to be sent for more than 15 minutes.`, "sms"]);
  if (h.missing_invoices > 0) items.push(["red", `${h.missing_invoices} unit${h.missing_invoices > 1 ? "s" : ""} with an active tenant ha${h.missing_invoices > 1 ? "ve" : "s"} no invoice this month.`, "invoices"]);
  if (h.unmatched > 0) items.push(["amber", `${h.unmatched} payment${h.unmatched > 1 ? "s are" : " is"} waiting to be matched to a unit.`, "unmatched"]);

  if (items.length === 0) return <p className="text-xs text-emerald-400">● All systems normal</p>;
  return (
    <div className="space-y-2">
      {items.map(([c, text, page], i) => (
        <button key={i} onClick={() => onGo(page)} className={`block w-full rounded-lg border px-3 py-2 text-left text-sm ${tone[c]}`}>{text}</button>
      ))}
    </div>
  );
}
