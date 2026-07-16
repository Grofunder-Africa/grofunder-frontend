/** Gro — the Grofunder companion. A leaf with a face, waving from brown soil.
 *  Three moods; never sad or shaming (Master Build Document 5). */
export function Gro({ mood = 'happy' }: { mood?: 'happy' | 'celebrating' | 'encouraging' }) {
  const cheek = mood === 'celebrating' ? '#3FD16A' : '#6FCF97';
  return (
    <svg className="gro-svg" viewBox="0 0 92 92" xmlns="http://www.w3.org/2000/svg" aria-label="Gro">
      {/* soil */}
      <ellipse cx="46" cy="82" rx="34" ry="5" fill="var(--soil)" />
      <path d="M16 80 q9 -3 18 0 M58 80 q9 -3 18 0" stroke="#8A5A38" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* stem */}
      <path d="M46 80 Q45 66 47 54" stroke="var(--g-dark)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* leaf body (tilted) */}
      <g transform="rotate(-12 47 40)">
        <path d="M47 12 C28 16 22 40 30 56 C50 58 66 42 64 22 C60 15 54 12 47 12 Z" fill="var(--g)" />
        {/* white vein */}
        <path d="M46 20 Q46 38 38 52" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />
        {/* face */}
        <circle cx="42" cy="34" r="2.6" fill="#1F2A24" />
        <circle cx="52" cy="32" r="2.6" fill="#1F2A24" />
        <circle cx="39" cy="40" r="3.2" fill={cheek} opacity="0.55" />
        <circle cx="55" cy="38" r="3.2" fill={cheek} opacity="0.55" />
        <path d="M43 42 Q47 46 52 41" stroke="#1F2A24" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      {/* waving hand */}
      <g className="gro-wave">
        <path d="M64 46 Q73 40 78 33" stroke="var(--g-dark)" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="79" cy="30.5" r="4.5" fill="var(--g)" />
        <circle cx="75" cy="27" r="1.9" fill="var(--g)" />
        <circle cx="79" cy="25" r="1.9" fill="var(--g)" />
        <circle cx="82.5" cy="27" r="1.9" fill="var(--g)" />
      </g>
    </svg>
  );
}
