// Pure calculations for the Reports & analytics page (no screen code, so they can be tested).
const num = (v) => Number(v) || 0;
const sum = (rows, k) => rows.reduce((s, r) => s + num(r[k]), 0);
export const monthKey = (d) => String(d).slice(0, 7);
const daysBetween = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);
const nairobiDate = (ts) => new Date(new Date(ts).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);

export function rangeStart(range, today) {
  const [y, m] = today.split("-").map(Number);
  if (range === "all") return "0000-01-01";
  if (range === "ytd") return `${y}-01-01`;
  const n = range === "12m" ? 12 : 6;
  let yy = y, mm = m - (n - 1);
  while (mm <= 0) { mm += 12; yy -= 1; }
  return `${yy}-${String(mm).padStart(2, "0")}-01`;
}

export const BUCKETS = ["Not yet due", "1 to 30 days", "31 to 60 days", "61 to 90 days", "Over 90 days"];
const bucketOf = (d) => (d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4);

export function compute({ invoices = [], payments = [], allocations = [], readings = [], requests = [], tenants = [], units = [], range = "6m", today }) {
  const start = rangeStart(range, today);
  const label = Object.fromEntries(units.map((u) => [u.unit_id, { unit: u.unit_number, tenant: u.tenant_name }]));
  const inRange = invoices.filter((i) => i.period >= start);

  // billed vs collected by month
  const byMonth = {};
  for (const i of inRange) {
    const k = monthKey(i.period);
    const x = (byMonth[k] ??= { month: k, billed: 0, collected: 0, outstanding: 0, rent: 0, util: 0, adj: 0, count: 0 });
    x.billed += num(i.total); x.collected += num(i.paid); x.outstanding += num(i.balance);
    x.rent += num(i.rent_amount); x.util += num(i.utilities_amount); x.adj += num(i.adjustments_amount); x.count++;
  }
  const monthly = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
    .map((x) => ({ ...x, rate: x.billed > 0 ? x.collected / x.billed : null }));
  const billed = sum(monthly, "billed"), collected = sum(monthly, "collected");

  // money still owed right now (all invoices, whatever the range)
  const unpaid = invoices.filter((i) => num(i.balance) > 0);
  const ageing = BUCKETS.map((name) => ({ name, value: 0, count: 0 }));
  const perUnitOwed = {};
  for (const i of unpaid) {
    const d = daysBetween(today, i.due_date);
    const b = ageing[bucketOf(d)]; b.value += num(i.balance); b.count++;
    const o = (perUnitOwed[i.unit_id] ??= { unit_id: i.unit_id, owed: 0, oldest: 0, invoices: 0 });
    o.owed += num(i.balance); o.invoices++; o.oldest = Math.max(o.oldest, d);
  }
  const arrears = Object.values(perUnitOwed).map((o) => ({ ...o, ...(label[o.unit_id] ?? { unit: "?", tenant: "" }) })).sort((a, b) => b.owed - a.owed);
  const overdueTotal = unpaid.filter((i) => daysBetween(today, i.due_date) > 0).reduce((s, i) => s + num(i.balance), 0);

  // on-time payment rate: of the invoices now fully paid, how many were completed by the due date
  const paidAt = Object.fromEntries(payments.map((p) => [p.id, nairobiDate(p.paid_at)]));
  const lastPay = {};
  for (const a of allocations) {
    const d = paidAt[a.payment_id];
    if (d && (!lastPay[a.invoice_id] || d > lastPay[a.invoice_id])) lastPay[a.invoice_id] = d;
  }
  const done = inRange.filter((i) => num(i.total) > 0 && num(i.balance) <= 0 && lastPay[i.id]);
  const onTime = done.filter((i) => lastPay[i.id] <= i.due_date).length;
  const onTimeRate = done.length ? onTime / done.length : null;

  // when in the month tenants pay
  const payDays = Array.from({ length: 31 }, () => 0);
  for (const p of payments) {
    const d = nairobiDate(p.paid_at);
    if (d >= start) payDays[Number(d.slice(8, 10)) - 1]++;
  }

  // utilities by month and kind
  const uMonths = {}; const kinds = new Set();
  for (const r of readings.filter((r) => r.period >= start)) {
    const k = monthKey(r.period); kinds.add(r.kind);
    ((uMonths[k] ??= {})[r.kind] = (uMonths[k][r.kind] ?? 0) + num(r.amount));
  }
  const utilMonths = Object.keys(uMonths).sort();
  const utilKinds = [...kinds];

  // per-unit performance in range
  const perUnit = {};
  for (const i of inRange) {
    const x = (perUnit[i.unit_id] ??= { unit_id: i.unit_id, billed: 0, paid: 0, balance: 0, invoices: 0, payments: 0 });
    x.billed += num(i.total); x.paid += num(i.paid); x.balance += num(i.balance); x.invoices++;
  }
  for (const p of payments) if (nairobiDate(p.paid_at) >= start && perUnit[p.unit_id]) perUnit[p.unit_id].payments++;
  const unitRows = Object.values(perUnit).map((x) => ({ ...x, ...(label[x.unit_id] ?? { unit: "?", tenant: "" }), rate: x.billed > 0 ? x.paid / x.billed : null }))
    .sort((a, b) => b.balance - a.balance);

  // occupancy, deposits, maintenance
  const occupied = units.filter((u) => u.state !== "vacant").length;
  const held = tenants.filter((t) => num(t.deposit_amount) > 0 && t.deposit_received_on && !t.deposit_refunded_on);
  const depositsHeld = sum(held, "deposit_amount");
  const count = (rows, key, val) => rows.filter((r) => r[key] === val).length;
  const maintenance = {
    total: requests.length,
    byStatus: [...new Set(requests.map((r) => r.status))].map((s) => ({ name: s, value: count(requests, "status", s) })),
    byPriority: [...new Set(requests.map((r) => r.priority))].map((s) => ({ name: s, value: count(requests, "priority", s) })),
  };

  return {
    start, monthly, billed, collected, outstanding: sum(monthly, "outstanding"),
    rate: billed > 0 ? collected / billed : null,
    breakdown: { rent: sum(monthly, "rent"), util: sum(monthly, "util"), adj: sum(monthly, "adj") },
    ageing, arrears, overdueTotal, onTimeRate, onTimeCount: done.length, payDays, utilMonths, utilKinds, uMonths,
    unitRows, units: { total: units.length, occupied, vacant: units.length - occupied }, depositsHeld, maintenance,
  };
}
