// Silhouettes d'ongles (même échelle pour toutes les formes, pour comparer les longueurs)
export function ShapeIcon({ shape, length = 2 }: { shape: string; length?: number }) {
  const L = 14 + length * 12; // longueur du bord libre
  const t = 72 - L;
  let edge: string;
  switch (shape) {
    case "square":
      edge = `M22 76 L22 ${t + 2} Q22 ${t} 24 ${t} L56 ${t} Q58 ${t} 58 ${t + 2} L58 76 Z`;
      break;
    case "coffin":
      edge = `M22 76 L28 ${t} L52 ${t} L58 76 Z`;
      break;
    case "almond":
      edge = `M22 76 C22 ${72 - L * 0.55} 32 ${t} 40 ${t} C48 ${t} 58 ${72 - L * 0.55} 58 76 Z`;
      break;
    default:
      edge = `M22 76 Q23 ${72 - L * 0.45} 40 ${t - 8} Q57 ${72 - L * 0.45} 58 76 Z`;
  }
  return (
    <svg viewBox="0 0 80 160" aria-hidden="true">
      <rect x="12" y="78" width="56" height="90" rx="28" fill="#c9a08c" />
      <path d={edge} fill="#f6ece7" stroke="#9b6b5a" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="21" y="70" width="38" height="52" rx="16" fill="#ecd3ca" stroke="#9b6b5a" strokeWidth="1.3" />
      <path d="M28 78 Q40 73 52 78" fill="none" stroke="#fffdfb" strokeWidth="2.4" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}
