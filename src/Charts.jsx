// Small chart components drawn with plain SVG, so no extra packages are needed.
const AXIS = "fill-slate-400";
export const compact = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (Math.abs(v) >= 1e3) return Math.round(v / 1e3) + "k";
  return String(Math.round(v));
};
const niceMax = (max) => {
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};
export const monthLabel = (k) => new Date(k + "-01").toLocaleDateString("en-KE", { month: "short", year: "2-digit" });

export function Legend({ items }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      {items.map((s) => <span key={s.name} className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>)}
    </div>
  );
}

export function BarChart({ labels, series, fmt = compact, height = 210, w = 640, tip = (v) => String(v) }) {
  if (!labels.length) return <p className="py-8 text-center text-sm text-slate-500">Nothing to show yet.</p>;
  const W = w, L = 46, R = 6, T = 8, B = 26, H = height;
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const gw = (W - L - R) / labels.length;
  const bw = Math.max(3, Math.min(30, (gw - 6) / series.length));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const every = labels.length > 14 ? Math.ceil(labels.length / 12) : 1;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="stroke-slate-700" strokeWidth="1" />
            <text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" className={AXIS}>{fmt(max * t)}</text>
          </g>
        ))}
        {labels.map((lab, i) => {
          const x0 = L + gw * i + (gw - bw * series.length) / 2;
          return (
            <g key={lab + i}>
              {series.map((s, j) => (
                <rect key={s.name} x={x0 + bw * j} y={y(s.values[i])} width={bw - 1} height={Math.max(0, H - B - y(s.values[i]))} rx="2" fill={s.color}>
                  <title>{`${lab}: ${s.name} ${tip(s.values[i])}`}</title>
                </rect>
              ))}
              {i % every === 0 && <text x={L + gw * i + gw / 2} y={H - 8} textAnchor="middle" fontSize="11" className={AXIS}>{lab}</text>}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && <Legend items={series} />}
    </>
  );
}

export function StackedBars({ labels, series, fmt = compact, height = 210, w = 640, tip = (v) => String(v) }) {
  if (!labels.length) return <p className="py-8 text-center text-sm text-slate-500">Nothing to show yet.</p>;
  const W = w, L = 46, R = 6, T = 8, B = 26, H = height;
  const totals = labels.map((_, i) => series.reduce((s, x) => s + x.values[i], 0));
  const max = niceMax(Math.max(1, ...totals));
  const gw = (W - L - R) / labels.length;
  const bw = Math.max(6, Math.min(40, gw - 10));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="stroke-slate-700" />
            <text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" className={AXIS}>{fmt(max * t)}</text>
          </g>
        ))}
        {labels.map((lab, i) => {
          let acc = 0;
          const x0 = L + gw * i + (gw - bw) / 2;
          return (
            <g key={lab}>
              {series.map((s) => {
                const v = s.values[i], top = y(acc + v), h = y(acc) - top; acc += v;
                return <rect key={s.name} x={x0} y={top} width={bw} height={Math.max(0, h)} fill={s.color}><title>{`${lab}: ${s.name} ${tip(v)}`}</title></rect>;
              })}
              <text x={L + gw * i + gw / 2} y={H - 8} textAnchor="middle" fontSize="11" className={AXIS}>{lab}</text>
            </g>
          );
        })}
      </svg>
      <Legend items={series} />
    </>
  );
}

export function LineChart({ labels, values, color = "#34D399", height = 200, w = 640 }) {
  const pts = values.map((v, i) => (v == null ? null : [i, v])).filter(Boolean);
  if (pts.length === 0) return <p className="py-8 text-center text-sm text-slate-500">Nothing to show yet.</p>;
  const W = w, L = 40, R = 28, T = 10, B = 26, H = height;
  const x = (i) => L + ((W - L - R) * (labels.length === 1 ? 0.5 : i / (labels.length - 1)));
  const y = (v) => T + (H - T - B) * (1 - Math.min(1, Math.max(0, v)));
  const every = labels.length > 14 ? Math.ceil(labels.length / 12) : 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-700" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" className={AXIS}>{Math.round(t * 100)}%</text>
        </g>
      ))}
      <polyline points={pts.map(([i, v]) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([i, v]) => <circle key={i} cx={x(i)} cy={y(v)} r="4.5" fill={color}><title>{`${labels[i]}: ${Math.round(v * 100)}%`}</title></circle>)}
      {labels.map((lab, i) => i % every === 0 && <text key={lab} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" className={AXIS}>{lab}</text>)}
    </svg>
  );
}

export function Donut({ parts, center, sub }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0">
        <g transform="rotate(-90 70 70)">
        <circle cx="70" cy="70" r={R} fill="none" className="stroke-slate-700" strokeWidth="18" />
        {total > 0 && parts.map((p) => {
          const len = (p.value / total) * C;
          const el = <circle key={p.name} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}><title>{`${p.name}: ${p.value}`}</title></circle>;
          off += len; return el;
        })}
        </g>
        <text x="70" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">{center}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="10" className={AXIS}>{sub}</text>
      </svg>
      <ul className="space-y-1 text-sm text-slate-300">
        {parts.map((p) => <li key={p.name} className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.name}: <b className="text-white">{p.value}</b></li>)}
      </ul>
    </div>
  );
}

export function HBars({ rows, fmt = compact, empty = "Nothing to show." }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => !r.value)) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name} className="text-sm">
          <div className="flex justify-between text-slate-300"><span>{r.name}</span><span className="text-white">{r.text ?? fmt(r.value)}</span></div>
          <div className="mt-1 h-2.5 rounded-full bg-slate-800"><div className="h-2.5 rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></div>
        </div>
      ))}
    </div>
  );
}

export function StackBar({ parts, fmt }) {
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0);
  if (total <= 0) return <p className="py-6 text-center text-sm text-slate-500">Nothing to show yet.</p>;
  return (
    <>
      <div className="flex h-5 overflow-hidden rounded-full bg-slate-800">
        {parts.map((p) => p.value > 0 && <div key={p.name} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.name}: ${fmt(p.value)}`} />)}
      </div>
      <ul className="mt-3 space-y-1 text-sm text-slate-300">
        {parts.map((p) => (
          <li key={p.name} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />{p.name}</span><span className="text-white">{fmt(p.value)} <span className="text-slate-500">({Math.round((Math.max(0, p.value) / total) * 100)}%)</span></span></li>
        ))}
      </ul>
    </>
  );
}
