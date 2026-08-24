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

/**
 * Gro's script. Scripted, not AI (Master Build Document 5) — every line is a
 * message key, so this is the one place Gro's voice lives and the one place
 * a translator would work from. `default` is the EN/SW code-switched voice
 * the mockup specifies; pure single-language variants can be added per key
 * later without touching anything that calls GRO_LINES.
 *
 * Lines marked verbatim are taken directly from grofunder_farmer_app_mockup.html,
 * not approximated — Melanie's own words, not a rewrite of them.
 */
export type GroMood = 'happy' | 'celebrating' | 'encouraging';
export const GRO_LINES: Record<string, { text: string; mood: GroMood }> = {
  // Explainer cards (verbatim from the mockup)
  welcome: { text: "Sasa, I'm Gro — I'll walk with you. Kwanza, let me tell you what Grofunder is. Ready?", mood: 'happy' },
  explainerWhat: { text: 'Grofunder ni nini? Simple: your cooperative already knows your harvests. We turn that history into credit — no collateral needed.', mood: 'happy' },
  explainerProgress: { text: "And this is how you'll see your progress — your tree grows as you repay well, together with your circle, cluster, and cooperative.", mood: 'happy' },
  explainerTogether: { text: 'One more thing — the most important one. You never grow alone here. The farmers around you matter just as much as your own harvest.', mood: 'happy' },

  // Record confirmation (verbatim)
  recordConfirm: { text: "Vizuri! Here's what Orinde told us about you. Is this you?", mood: 'happy' },
  recordFlagged: { text: 'Asante for telling me. Sent to your cooperative to fix — you can continue, but loan applications will wait until your records match.', mood: 'encouraging' },

  // National ID confirmation
  idConfirm: { text: "Now, type your ID number so I can make sure it matches what your cooperative has on file.", mood: 'happy' },
  idMatched: { text: 'Vizuri! That matches.', mood: 'celebrating' },
  idMismatch: { text: "That doesn't quite match what your cooperative has on file. I've told them so they can help you sort it out. You can keep going for now — but you'll need this fixed before applying for a loan.", mood: 'encouraging' },

  // Home location (adjusted — no "circle" reference before it's ever explained)
  homeLocation: { text: 'Hongera Akinyi! Karibu. Now — where is home? This helps me know your community. Only rough distance is ever shared with anyone else.', mood: 'celebrating' },

  // About you (verbatim)
  aboutCrops: { text: 'Asante! Sasa, tell me about yourself. What do you grow?', mood: 'happy' },
  aboutActivities: { text: 'Do you earn from anything else? Kila kitu counts.', mood: 'happy' },
  aboutIncome: { text: 'And money — how does it usually come in?', mood: 'happy' },

  // Basics done (verbatim)
  seedPlanted: { text: 'Your seed is planted. From here we grow together — mimi na wewe, kila wiki.', mood: 'celebrating' },

  // Circle formation (paraphrased from the mockup's circle-FAQ copy)
  circleIntro: { text: 'One last thing, and it matters most. Pick 5 to 10 farmers from your cluster you trust — your Growth Circle. You choose each other; no one joins without everyone\u2019s yes.', mood: 'happy' },
  circleWaiting: { text: 'Hongera, Akinyi — your seed is planted. Your circle is confirming — your first loan opens the moment every member has confirmed every member.', mood: 'celebrating' },
  circleVouch: { text: 'Someone started a circle with you in it. Take a look — stand with the members you trust.', mood: 'happy' },
  circleContested: { text: "Some members haven't accepted everyone yet. Talk as a group — loans open once every member has confirmed every member.", mood: 'encouraging' },

  // Closing (verbatim)
  allDone: { text: "Hongera Akinyi! Tuko pamoja — we're in this together. Whenever it's hard, tell me, and we'll find a way.", mood: 'celebrating' },
};

/** Gro + his speech bubble, reusable anywhere he needs to say something. */
export function GroSays({ line, children }: { line: keyof typeof GRO_LINES; children?: React.ReactNode }) {
  const { text, mood } = GRO_LINES[line];
  return (
    <div className="gro-hero">
      <div className="gro-scene">
        <Gro mood={mood} />
        <div className="gro-msg">
          <p style={{ margin: 0 }}>{text}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
