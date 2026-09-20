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
  circleIntro: { text: 'One last thing, and it matters most: your Growth Circle.', mood: 'happy' },
  circleWaiting: { text: 'Hongera, Akinyi — your seed is planted. Your circle is confirming — your first loan opens the moment every member has confirmed every member.', mood: 'celebrating' },
  circleVouch: { text: 'Take a look, then tick who you stand with.', mood: 'happy' },
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

/**
 * Gro's chat script — the quick-asks from the mockup's Gro tab, with his
 * verbatim answers. Scripted, not AI (Master Build Document 5): predictable,
 * translatable, works offline, costs nothing per message.
 *
 * `logs` marks the asks Gro can't actually solve — an agronomist, insurance,
 * input loans, leaving the cooperative. Rather than pretend, he records the
 * request (farmer_requests) so enough of the same ask becomes a signal
 * Grofunder can act on. That's the demand-sensing the mockup describes.
 */
export interface QuickAsk {
  id: string;
  label: string;
  reply: string;
  logs?: string; // farmer_requests category, when this ask is a demand signal
}

export const GRO_OPENING = 'Niambie — what do you need?';
export const GRO_FREETEXT_REPLY =
  "Nimepokea — I've passed your message to Grofunder. Asante for telling me. Tuko pamoja.";
export const GRO_RECEIPT = 'Request sent to Grofunder';

export const GRO_QUICK_ASKS: QuickAsk[] = [
  {
    id: 'inputs',
    label: 'Input loan badala ya pesa?',
    reply: "Not yet — but I've told Grofunder you want inputs instead of cash. The more farmers ask, the sooner it comes. Nitakuambia when it's ready.",
    logs: 'input_loans',
  },
  {
    id: 'agro',
    label: 'I need an agronomist',
    reply: "We don't have an agronomist yet — lakini nimepeleka ombi lako to Grofunder. When one joins for your area, you'll be first to know. Asante for telling me.",
    logs: 'agronomist',
  },
  {
    id: 'money',
    label: 'How do I manage my money?',
    reply: 'Rahisi: when your money comes on Friday, pay your instalment kwanza — then the rest is truly yours. Farmers who pay first thing never fall behind.',
  },
  {
    id: 'insure',
    label: 'Insurance ya mazao?',
    reply: "Crop insurance si bado — but Grofunder is listening. I've added your voice. The more farmers ask, the faster it comes.",
    logs: 'insurance',
  },
  {
    id: 'leave',
    label: 'What happens when I leave the cooperative?',
    reply: 'Sikiliza — your track record is YOURS. Every payment, every leaf on your tree, it follows you, not the cooperative. New loans would pause until we connect your work in a new way. Na mimi? Naenda popote unapoenda. Tuko pamoja — always.',
    logs: 'leaving_cooperative',
  },
  {
    id: 'defaultq',
    label: 'What happens if a member defaults?',
    reply: 'Niambie ukweli — here is how it works. On the repayment day the circle is told and has 5 days to help: a call, a visit, or covering it together. From the 7th day a flat 2% late fee applies and your cooperative steps in to follow up. While it stays unpaid, no one in the circle can take a new loan until it is settled. Ndiyo maana you choose your circle carefully. Tuko pamoja.',
  },
];

/**
 * The seedling progress marker — Melanie's metaphor for onboarding: each
 * completed stage advances the seedling. Four stages map to what actually
 * has to happen (not four screens for their own sake):
 *   1. Get a Seed      — welcome + what Grofunder is
 *   2. Seed is Potted   — confirm your record and your ID
 *   3. Manure Added     — crops, other income, how often it pays
 *   4. Seed Planted     — your Growth Circle
 * A tiny, deliberately simple SVG per stage — legible at a glance on a small
 * screen, not a illustration to admire.
 */
export type SeedStage = 1 | 2 | 3 | 4;
const SEED_LABELS: Record<SeedStage, string> = {
  1: 'Get a Seed', 2: 'Seed is Potted', 3: 'Manure Added', 4: 'Seed Planted',
};

function SeedIcon({ stage, active, done }: { stage: SeedStage; active: boolean; done: boolean }) {
  const stroke = done || active ? 'var(--g-dark)' : 'var(--line)';
  const fill = done ? 'var(--g)' : active ? 'var(--g-tint)' : '#fff';
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      {stage === 1 && (
        <circle cx="15" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="2" />
      )}
      {stage === 2 && (
        <>
          <path d="M8 15 L22 15 L20 26 L10 26 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="15" cy="12" r="4.5" fill={done ? 'var(--g)' : fill} stroke={stroke} strokeWidth="2" />
        </>
      )}
      {stage === 3 && (
        <>
          <path d="M8 15 L22 15 L20 26 L10 26 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M11 15 Q15 6 19 15" fill="none" stroke={stroke} strokeWidth="2" />
          <circle cx="15" cy="10" r="2" fill={done ? 'var(--g)' : stroke} />
        </>
      )}
      {stage === 4 && (
        <>
          <path d="M8 22 L22 22 L20 27 L10 27 Z" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M15 22 L15 10" stroke={stroke} strokeWidth="2" />
          <path d="M15 14 Q9 12 8 6 Q15 7 15 14 Z" fill={done ? 'var(--g)' : fill} stroke={stroke} strokeWidth="1.5" />
          <path d="M15 17 Q21 15 22 9 Q15 10 15 17 Z" fill={done ? 'var(--g)' : fill} stroke={stroke} strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

export function SeedProgress({ stage }: { stage: SeedStage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      {([1, 2, 3, 4] as SeedStage[]).map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : undefined }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <SeedIcon stage={s} active={s === stage} done={s < stage} />
            <span style={{
              fontSize: 9.5, textAlign: 'center', maxWidth: 54, lineHeight: 1.15,
              color: s === stage ? 'var(--g-dark)' : 'var(--mut)',
              fontWeight: s === stage ? 600 : 400,
            }}>
              {SEED_LABELS[s]}
            </span>
          </div>
          {i < 3 && <div style={{ flex: 1, height: 2, background: s < stage ? 'var(--g)' : 'var(--line)', margin: '0 4px 18px' }} />}
        </div>
      ))}
    </div>
  );
}
