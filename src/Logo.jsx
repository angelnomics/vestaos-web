export default function Logo({ size = 40, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label="SOVA">
      <defs>
        <linearGradient id="sv-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E3A8A" /><stop offset="1" stopColor="#2563EB" /></linearGradient>
        <linearGradient id="sv-sc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E0F2FE" /><stop offset="1" stopColor="#7DD3FC" /></linearGradient>
        <linearGradient id="sv-pn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FBBF24" /><stop offset="1" stopColor="#F97316" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#sv-bg)" />
      <rect x="14" y="26" width="72" height="48" rx="7" fill="#0B1B3A" />
      <rect x="18" y="30" width="64" height="40" rx="4" fill="url(#sv-sc)" />
      <path d="M21 66 L33 53 L45 66" fill="none" stroke="#0B1B3A" strokeWidth="4.2" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="52" y="38" width="7" height="28" fill="#16346B" />
      <rect x="61" y="45" width="7" height="21" fill="#16346B" />
      <rect x="70" y="52" width="7" height="14" fill="#16346B" />
      <rect x="54" y="42" width="3" height="3" fill="#7DD3FC" />
      <rect x="54" y="49" width="3" height="3" fill="#7DD3FC" />
      <rect x="54" y="56" width="3" height="3" fill="#7DD3FC" />
      <polygon points="45,74 55,74 57,80 43,80" fill="#CBD5E1" />
      <rect x="35" y="79" width="30" height="4" rx="2" fill="#E2E8F0" />
      <path d="M77 8 C71 8 67 12.5 67 18 C67 25 77 33 77 33 C77 33 87 25 87 18 C87 12.5 83 8 77 8 Z" fill="url(#sv-pn)" stroke="#fff" strokeWidth="1.6" />
      <circle cx="77" cy="18" r="3.6" fill="#fff" />
    </svg>
  );
}
