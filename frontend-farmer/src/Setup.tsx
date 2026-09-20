/**
 * The Gro-guided setup walkthrough (grofunder_farmer_app_mockup.html v1.0):
 *   3 explainer cards -> record confirmation (+ mismatch flag) -> home location
 *   -> about-you (crops, activities, income) -> Growth Chama formation/vouching
 *   -> main app.
 *
 * Resumable: on mount, asks the backend exactly which of these the farmer has
 * already done (getOnboardingStatus / myCircleStatus) and jumps straight to
 * wherever they left off — a farmer who drops off mid-flow never restarts
 * from scratch (except the 3 explainer cards, which only guard the very
 * first step and are harmless to see again).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { farmerApi, ApiError } from './api';
import type { FarmerRecord, MyCircleStatus } from './api';
import { GroSays, SeedProgress } from './Gro';
import type { SeedStage } from './Gro';

// Restructured to Melanie's four-stage flow (handwritten Sept 2026):
//   intro   — welcome, what Grofunder is, what a chama is (was 4 screens)
//   record  — cooperative record confirmation, then ID (was 2 screens)
//   about   — crops, other income sources, and how often each pays (was 3)
//   circle  — form or join a Growth Chama
// Location moved OUT of onboarding entirely — now optional, from Home.
type Step =
  | 'loading'
  | 'intro' | 'explainer1' | 'explainer2' | 'explainer3'
  | 'grofunderFaq'
  | 'record'
  | 'idConfirm'
  | 'about'
  | 'seedPlanted'
  | 'circleForm'
  | 'circleFaq'
  | 'circleWaiting'
  | 'circleVouch';

// Which of the four seedling stages a step belongs to, for the progress bar.
const STEP_STAGE: Partial<Record<Step, SeedStage>> = {
  intro: 1, explainer1: 1, explainer2: 1, explainer3: 1, grofunderFaq: 1,
  record: 2, idConfirm: 2,
  about: 3,
  seedPlanted: 4, circleForm: 4, circleFaq: 4, circleWaiting: 4, circleVouch: 4,
};

const CROP_OPTIONS = ['Coffee', 'Tea', 'Maize', 'Beans', 'Bananas', 'Sugarcane', 'Dairy', 'Poultry'];
const ACTIVITY_OPTIONS = ['Boda boda', 'Small shop', 'Casual work', 'Tailoring', 'Mama mboga', 'Employed'];
const FREQUENCIES: { value: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASONAL'; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEASONAL', label: 'Seasonally' },
];

/**
 * The full Growth Chama explanation, verbatim in spirit from
 * grofunder_farmer_app_mockup.html, reorganized into the four questions that
 * matter: what it is, why it exists, why it matters, how it works. Lives on
 * its own page (see the 'circleFaq' step below) — reached only when someone
 * taps "More about Growth Chama," never shown by default.
 */
/**
 * "More about Grofunder" — reached from explainer1, the same pattern as
 * Growth Chama's own FAQ: a proper page of its own, not more text stacked
 * onto the screen that links to it.
 */
function GrofunderFaq() {
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>What does Grofunder actually do?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          We help you access capital to grow fast and easy. We turn your records into credit — your deliveries
          to your cooperative, your guarantors, and your transactions with Grofunder — into money you can use
          to increase your income.
        </p>
      </div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>Why no collateral?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          Your history already proves you're reliable. Years of deliveries to your cooperative and people who
          stand behind you are worth more here than a title deed.
        </p>
      </div>
      <div className="card">
        <div className="label" style={{ marginBottom: 6 }}>What happens as I use it?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          Every loan you repay well grows your record — and your record is what unlocks bigger, cheaper loans
          next time. Nothing here is one-off; it all builds.
        </p>
      </div>
    </>
  );
}

function CircleFaq() {
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>What is a Growth Chama?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          5–10 farmers from your cluster who vouch for each other. You choose each other — every member confirms
          every member, so no one is in a chama they didn't pick, and no one joins yours without your yes.
        </p>
      </div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>Why does it exist?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          Grofunder lends without collateral. Your chama standing behind you — the way your community already
          does — is what makes that possible.
        </p>
      </div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>Why does it matter?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          The chama opens the door: loans only start once it's fully confirmed and active, and your first limit
          unlocks with it. If a member misses a payment, the chama is told that day and has 5 days to help follow
          up or cover it — after that a late fee applies and your cooperative steps in. While it's unpaid, no one in
          the chama can take a new loan.
        </p>
      </div>
      <div className="card">
        <div className="label" style={{ marginBottom: 6 }}>How does it work?</div>
        <p className="muted" style={{ fontSize: 14.5, margin: 0 }}>
          You form one when you set up, or someone names you in theirs. Either way, you see exactly who's in it and
          choose to stand with each of them. Strong chamas earn champion recognition every Friday, and every
          member's tree grows faster.
        </p>
      </div>
    </>
  );
}

export function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('loading');
  // Every forward move is recorded automatically, so a farmer can always back
  // out of a step. Done with an effect rather than at each setStep call site
  // because there are ~20 of them and one forgotten push is a dead end.
  const [history, setHistory] = useState<Step[]>([]);
  const prevStep = useRef<Step>('loading');
  const goingBack = useRef(false);

  useEffect(() => {
    if (goingBack.current) { goingBack.current = false; prevStep.current = step; return; }
    if (prevStep.current !== step && prevStep.current !== 'loading') {
      setHistory((h) => [...h, prevStep.current]);
    }
    prevStep.current = step;
  }, [step]);

  function goBack() {
    if (history.length === 0) return;
    goingBack.current = true;
    setErr('');
    setStep(history[history.length - 1]!);
    setHistory(history.slice(0, -1));
  }
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [showFlag, setShowFlag] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagDetails, setFlagDetails] = useState('');

  const [idInput, setIdInput] = useState('');
  const [idResult, setIdResult] = useState<'MATCHED' | 'MISMATCH' | 'PENDING_VERIFICATION' | null>(null);

  const [crops, setCrops] = useState<string[]>([]);
  const [showOtherCrop, setShowOtherCrop] = useState(false);
  const [otherCropText, setOtherCropText] = useState('');
  // Income sources: each is an activity plus how often it pays. A farmer has
  // several on different cycles (seasonal maize, weekly vegetables, monthly
  // job) — one frequency for the whole person was the wrong model.
  type IncomeRow = { activity: string; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASONAL'; avgAmountKes?: number };
  const [incomeSources, setIncomeSources] = useState<IncomeRow[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [newFrequency, setNewFrequency] = useState<IncomeRow['frequency']>('MONTHLY');
  const [newAmount, setNewAmount] = useState('');

  const [mates, setMates] = useState<{ id: string; fullName: string }[]>([]);
  // Why the list is empty, straight from the server — so an empty dropdown
  // can be explained on screen instead of guessed at.
  const [mateDiag, setMateDiag] = useState<Record<string, unknown> | null>(null);
  const [chosenMates, setChosenMates] = useState<string[]>([]);
  const [circleName, setCircleName] = useState('');
  // Which step "More about Growth Chama" should return to — the FAQ is
  // its own page now, not an inline expand, so it needs to know the way back.
  const [faqReturnTo, setFaqReturnTo] = useState<'circleForm' | 'circleVouch' | 'explainer1'>('circleForm');
  const [myCircle, setMyCircle] = useState<MyCircleStatus['circle'] | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);
  // The circle *formation* screen lands minimal and reveals the form only
  // when the farmer taps "Form a Growth Chama". The vouching screen does
  // NOT do this — it matches the mockup exactly, showing the roster straight
  // away, since someone who's been named in a chama is there to act on it.
  const [formExpanded, setFormExpanded] = useState(false);

  const resume = useCallback(async () => {
    setErr('');
    try {
      const status = await farmerApi.onboardingStatus();
      if (!status.recordConfirmed) { setStep('intro'); return; }
      if (!status.idAttempted) { setStep('idConfirm'); return; }
      // Location is no longer part of onboarding — it never gates progress.
      if (!status.hasEconomicProfile) { setStep('about'); return; }
      if (!status.circleId) {
        // Route through the celebration first, not straight to circle
        // formation — otherwise a farmer who finishes "about you" and closes
        // the app right there would never see it on their next visit.
        setStep('seedPlanted');
        return;
      }
      const cs = await farmerApi.myCircleStatus();
      if (!cs.hasCircle || !cs.circle) { setStep('circleForm'); return; }
      setMyCircle(cs.circle);
      if (cs.circle.state === 'ACTIVE') { onComplete(); return; }
      setStep(cs.circle.myVouchDone ? 'circleWaiting' : 'circleVouch');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load your setup');
      setStep('intro');
    }
  }, [onComplete]);

  useEffect(() => { resume(); }, [resume]);

  async function loadRecord() {
    setBusy(true); setErr('');
    try { setRecord(await farmerApi.records()); setStep('record'); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not load your record'); }
    finally { setBusy(false); }
  }

  async function confirmRecordYes() {
    setBusy(true); setErr('');
    try { await farmerApi.confirmRecord(); setStep('idConfirm'); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  async function submitFlag() {
    setBusy(true); setErr('');
    try {
      await farmerApi.raiseDiscrepancy('record', flagDetails.trim() || undefined);
      setFlagged(true); setShowFlag(false);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send that'); }
    finally { setBusy(false); }
  }

  async function submitIdConfirm() {
    if (!idInput.trim()) { setErr('Enter your ID number.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await farmerApi.confirmNationalId(idInput.trim());
      setIdResult(r.verified ? 'MATCHED' : (r.reason ?? 'MISMATCH'));
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not check that'); }
    finally { setBusy(false); }
  }

  function addIncomeSource() {
    const a = newActivity.trim();
    if (!a) return;
    const amt = newAmount.trim() ? Number(newAmount) : undefined;
    setIncomeSources((rows) => [...rows, { activity: a, frequency: newFrequency, avgAmountKes: amt }]);
    setNewActivity(''); setNewFrequency('MONTHLY'); setNewAmount('');
  }

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function finishAboutYou() {
    setBusy(true); setErr('');
    try {
      const finalCrops = otherCropText.trim() ? [...crops, otherCropText.trim()] : crops;
      const apiSources = incomeSources.map((r) => ({
        activity: r.activity, frequency: r.frequency,
        avgAmountCents: r.avgAmountKes !== undefined ? Math.round(r.avgAmountKes * 100) : undefined,
      }));
      await farmerApi.setEconomicProfile(finalCrops, [], apiSources);
      setStep('seedPlanted');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  async function goToCircleForm() {
    setBusy(true); setErr('');
    try {
      const [r, m] = await Promise.all([record ? Promise.resolve(record) : farmerApi.records(), farmerApi.clusterMates()]);
      setRecord(r); setMates(m.data); setMateDiag(m.diagnostics ?? null);
      setStep('circleForm');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not load your cluster'); }
    finally { setBusy(false); }
  }

  async function createMyCircle() {
    if (chosenMates.length < 4) { setErr('Choose at least 4 others — a circle needs 5 to 10 members including you.'); return; }
    setBusy(true); setErr('');
    try {
      const name = circleName.trim() || `${record?.full_name?.split(' ')[0] ?? 'My'}'s Circle`;
      await farmerApi.createCircle(name, chosenMates);
      const cs = await farmerApi.myCircleStatus();
      if (cs.hasCircle && cs.circle) setMyCircle(cs.circle);
      setStep('circleWaiting');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not create your chama'); }
    finally { setBusy(false); }
  }

  async function submitMyVouches() {
    if (!myCircle) return;
    setBusy(true); setErr('');
    try {
      const r = await farmerApi.submitVouches(myCircle.id, declined);
      const cs = await farmerApi.myCircleStatus();
      if (cs.hasCircle && cs.circle) setMyCircle(cs.circle);
      if (r.state === 'ACTIVE') { onComplete(); return; }
      setStep(r.state === 'CONTESTED' ? 'circleVouch' : 'circleWaiting');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  const [removingId, setRemovingId] = useState('');
  async function removeMember(farmerId: string) {
    if (!myCircle) return;
    setRemovingId(farmerId); setErr('');
    try {
      await farmerApi.removeCircleMember(myCircle.id, farmerId);
      const cs = await farmerApi.myCircleStatus();
      if (cs.hasCircle && cs.circle) { setMyCircle(cs.circle); if (cs.circle.state === 'ACTIVE') onComplete(); }
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not remove that member'); }
    finally { setRemovingId(''); }
  }

  const [leaving, setLeaving] = useState(false);
  async function startNewCircleInstead() {
    setLeaving(true); setErr('');
    try {
      await farmerApi.leaveCircle();
      setMyCircle(null); setChosenMates([]); setCircleName(''); setFormExpanded(false); setDeclined([]);
      const [r, m] = await Promise.all([record ? Promise.resolve(record) : farmerApi.records(), farmerApi.clusterMates()]);
      setRecord(r); setMates(m.data); setMateDiag(m.diagnostics ?? null);
      setStep('circleForm');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not leave that chama'); }
    finally { setLeaving(false); }
  }

  if (step === 'loading') {
    return <div className="screen screen-no-nav center" style={{ paddingTop: 80 }}><span className="spin" /></div>;
  }

  return (
    <div className="screen screen-no-nav screen-pad-top">
      {STEP_STAGE[step] && <SeedProgress stage={STEP_STAGE[step]!} />}
      {history.length > 0 && (
        <button className="back" onClick={goBack} style={{ marginBottom: 12 }}>← Back</button>
      )}
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      {step === 'intro' && (
        <>
          <GroSays line="welcome" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer1')}>
            Ready?
          </button>
        </>
      )}

      {step === 'explainer1' && (
        <>
          <GroSays line="explainerWhat" />
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, fontWeight: 700, color: 'var(--g-dark)' }}>How?</p>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5 }}>
              We turn your records into credit. We use your deliveries to your cooperative, your guarantors, and
              your transactions with Grofunder to help you get money that you will use to increase your income.
            </p>
          </div>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }}
            onClick={() => { setFaqReturnTo('explainer1'); setStep('grofunderFaq'); }}>
            More about Grofunder
          </button>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setStep('explainer2')}>
            Endelea
          </button>
        </>
      )}

      {step === 'grofunderFaq' && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>About Grofunder</h3>
          <GrofunderFaq />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep(faqReturnTo)}>Back</button>
        </>
      )}

      {step === 'explainer2' && (
        <>
          <GroSays line="explainerProgress" />
          <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
            <svg viewBox="0 0 200 110" width="170" height="94" aria-hidden="true" style={{ margin: '4px auto 0' }}>
              <ellipse cx="100" cy="100" rx="52" ry="7" fill="#D3D1C7" />
              <path d="M100 98 L100 32" stroke="#067A0B" strokeWidth="4" strokeLinecap="round" />
              <path d="M100 80 L76 66 M100 80 L124 66 M100 58 L80 46 M100 58 L120 46" stroke="#067A0B" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="72" cy="64" rx="12" ry="6" fill="#09AF0F" transform="rotate(-25 72 64)" />
              <ellipse cx="128" cy="64" rx="12" ry="6" fill="#09AF0F" transform="rotate(25 128 64)" />
              <ellipse cx="76" cy="43" rx="11" ry="5.5" fill="#09AF0F" transform="rotate(-30 76 43)" />
              <ellipse cx="124" cy="43" rx="11" ry="5.5" fill="#09AF0F" transform="rotate(30 124 43)" />
              <ellipse cx="100" cy="27" rx="10" ry="6" fill="#5DCAA5" />
              <circle cx="86" cy="60" r="4" fill="#E24B4A" />
              <circle cx="114" cy="58" r="4" fill="#E24B4A" />
              <circle cx="100" cy="40" r="4" fill="#E24B4A" />
            </svg>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.5 }}>
              Pay on time — it grows. Finish loans — it bears fruit, and your limit grows with it.
            </p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer3')}>
            Endelea
          </button>
        </>
      )}

      {step === 'explainer3' && (
        <>
          <GroSays line="explainerTogether" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadRecord} disabled={busy}>
            {busy ? <span className="spin" /> : 'Nimeelewa — I understand'}
          </button>
        </>
      )}

      {step === 'record' && record && (
        <>
          <GroSays line="recordConfirm" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>Your cooperative record</div>
            <table style={{ width: '100%', fontSize: 15 }}><tbody>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Name</td><td style={{ textAlign: 'right' }}>{record.full_name}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Member no.</td><td style={{ textAlign: 'right' }}>{record.coop_member_no ?? ' — '}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Cluster</td><td style={{ textAlign: 'right' }}>{record.cluster_name ?? ' — '}{record.cluster_head ? ` · head ${record.cluster_head}` : ''}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Deliveries on record</td><td style={{ textAlign: 'right' }}>{record.delivery_count}</td></tr>
            </tbody></table>
            {!flagged && !showFlag && (
              <button className="btn btn-ghost" style={{ width: '100%', fontSize: 13, padding: 6, marginTop: 8 }} onClick={() => setShowFlag(true)}>
                Something here is wrong
              </button>
            )}
            {showFlag && (
              <div style={{ marginTop: 8 }}>
                <textarea className="input" rows={2} placeholder="What's not right? (optional)" value={flagDetails} onChange={(e) => setFlagDetails(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 14 }} onClick={() => setShowFlag(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 14, padding: 8 }} disabled={busy} onClick={submitFlag}>Send</button>
                </div>
              </div>
            )}
            {flagged && <div className="ok" style={{ marginTop: 8, fontSize: 13 }}>Sent to your cooperative to fix. You can continue — but loan applications will wait until your records match.</div>}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={confirmRecordYes}>
            {busy ? <span className="spin" /> : "Ndiyo, that's me"}
          </button>
        </>
      )}

      {step === 'idConfirm' && (
        <>
          <GroSays line="idConfirm" />
          {idResult === null && (
            <>
              <div className="card" style={{ marginTop: 12 }}>
                <input
                  className="input" inputMode="numeric" placeholder="Your ID number"
                  value={idInput} onChange={(e) => setIdInput(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || !idInput.trim()} onClick={submitIdConfirm}>
                {busy ? <span className="spin" /> : 'Endelea — continue'}
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={() => setStep('about')}>
                Skip for now — I don't have it with me
              </button>
            </>
          )}
          {idResult === 'MATCHED' && (
            <>
              <div className="ok" style={{ marginTop: 12 }}>Vizuri! That matches.</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep('about')}>Endelea — continue</button>
            </>
          )}
          {(idResult === 'MISMATCH' || idResult === 'PENDING_VERIFICATION') && (
            <>
              <div className="err" style={{ marginTop: 12 }}>
                {idResult === 'MISMATCH'
                  ? "That doesn't quite match what your cooperative has on file. I've told them so they can help you sort it out."
                  : "Noted — your cooperative didn't have an ID on file yet, so I've sent them what you entered to confirm."}
                {' '}You can keep going for now, but you'll need this fixed before applying for a loan.
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => { setIdResult(null); }}>
                Try again — maybe I mistyped it
              </button>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setStep('about')}>Endelea — continue</button>
            </>
          )}
        </>
      )}

      {step === 'about' && (
        <>
          <GroSays line="aboutCrops" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>What do you grow?</div>
            <div className="tick-wrap">
              {CROP_OPTIONS.map((c) => (
                <button key={c} className={`tick-chip ${crops.includes(c) ? 'tick-chip-on' : ''}`} onClick={() => toggle(crops, setCrops, c)}>{c}</button>
              ))}
              <button className={`tick-chip ${showOtherCrop ? 'tick-chip-on' : ''}`} onClick={() => setShowOtherCrop((s) => !s)}>Other</button>
            </div>
            {showOtherCrop && (
              <input className="input" style={{ marginTop: 8 }} placeholder="What else do you grow?"
                value={otherCropText} onChange={(e) => setOtherCropText(e.target.value)} />
            )}
          </div>

          <GroSays line="aboutIncome" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>Your sources of income</div>
            {incomeSources.length === 0 && (
              <table style={{ width: '100%', fontSize: 13.5, marginBottom: 10, borderCollapse: 'collapse', opacity: 0.55 }}>
                <thead>
                  <tr className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ textAlign: 'left', paddingBottom: 4 }}>Example</th><th></th><th style={{ textAlign: 'right', paddingBottom: 4 }}></th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '5px 0' }}>Dhania</td><td style={{ padding: '5px 0' }}>Daily</td><td style={{ padding: '5px 0', textAlign: 'right' }}>KES 300</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '5px 0' }}>Selling fish</td><td style={{ padding: '5px 0' }}>Daily</td><td style={{ padding: '5px 0', textAlign: 'right' }}>KES 2,000</td>
                  </tr>
                </tbody>
              </table>
            )}
            {incomeSources.length > 0 && (
              <table style={{ width: '100%', fontSize: 13.5, marginBottom: 10, borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ textAlign: 'left', paddingBottom: 4 }}>Activity</th>
                    <th style={{ textAlign: 'left', paddingBottom: 4 }}>Frequency</th>
                    <th style={{ textAlign: 'right', paddingBottom: 4 }}>Avg amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {incomeSources.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      <td style={{ padding: '7px 0' }}>{row.activity}</td>
                      <td style={{ padding: '7px 0' }}>{FREQUENCIES.find((f) => f.value === row.frequency)?.label}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>{row.avgAmountKes !== undefined ? `KES ${row.avgAmountKes.toLocaleString()}` : '—'}</td>
                      <td style={{ padding: '7px 0', textAlign: 'right' }}>
                        <button onClick={() => setIncomeSources((rows) => rows.filter((_, j) => j !== i))}
                          style={{ border: 'none', background: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px' }}
                          aria-label={`Remove ${row.activity}`}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="input" style={{ flex: 2 }} placeholder="Crop / activity"
                value={newActivity} onChange={(e) => setNewActivity(e.target.value)} list="activity-suggestions" />
              <select className="input" style={{ flex: 1, padding: '9px 6px' }}
                value={newFrequency} onChange={(e) => setNewFrequency(e.target.value as IncomeRow['frequency'])}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <input className="input" type="number" inputMode="numeric" style={{ flex: 1, minWidth: 0 }} placeholder="KES"
                value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
            </div>
            <datalist id="activity-suggestions">
              {ACTIVITY_OPTIONS.map((a) => <option key={a} value={a} />)}
            </datalist>
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} disabled={!newActivity.trim()} onClick={addIncomeSource}>
              + Add
            </button>
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={finishAboutYou}>
            {busy ? <span className="spin" /> : 'Maliza — finish'}
          </button>
          {incomeSources.length === 0 && (
            <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
              You can add income sources later, but they help us set the right loan for you.
            </p>
          )}
        </>
      )}

      {step === 'seedPlanted' && (
        <>
          <GroSays line="seedPlanted" />
          <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>You can update these answers any time. Gro will ask again when you apply for a loan.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={goToCircleForm}>
            {busy ? <span className="spin" /> : 'Endelea — continue'}
          </button>
        </>
      )}

      {step === 'circleFaq' && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>About Growth Chama</h3>
          <CircleFaq />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep(faqReturnTo)}>Back</button>
        </>
      )}

      {step === 'circleForm' && (
        <>
          <GroSays line="circleIntro" />
          <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setFaqReturnTo('circleForm'); setStep('circleFaq'); }}>
            More about Growth Chama
          </button>
          {!formExpanded ? (
            <button className="btn btn-primary" onClick={() => setFormExpanded(true)}>Form a Growth Chama</button>
          ) : (
            <>
              <div className="card">
                <input className="input" placeholder="Name your circle (optional)" value={circleName} onChange={(e) => setCircleName(e.target.value)} style={{ marginBottom: 10 }} />
                {mates.filter((m) => !chosenMates.includes(m.id)).length === 0 && chosenMates.length === 0 ? (
                  <>
                    <p className="muted" style={{ fontSize: 14.5 }}>No cluster-mates available yet — check back once more of your cluster has registered.</p>
                    {mateDiag && (
                      <p className="tiny muted" style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>
                        {mateDiag.reason === 'CALLER_HAS_NO_CLUSTER'
                          ? 'diagnostic: you are not assigned to a cluster'
                          : `diagnostic: ${mateDiag.othersInCluster} others in your cluster, ${mateDiag.excludedAlreadyInCircle} already in a chama`}
                      </p>
                    )}
                  </>
                ) : (
                  <select
                    className="input"
                    value=""
                    onChange={(e) => { if (e.target.value) setChosenMates([...chosenMates, e.target.value]); }}
                  >
                    <option value="">Add a cluster-mate…</option>
                    {mates.filter((m) => !chosenMates.includes(m.id)).map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                )}
                {chosenMates.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                    {chosenMates.map((id) => {
                      const m = mates.find((x) => x.id === id);
                      if (!m) return null;
                      return (
                        <div key={id} className="row" style={{ background: 'var(--g-tint)', borderRadius: 8, padding: '8px 10px', fontSize: 14.5 }}>
                          <span>{m.fullName}</span>
                          <button
                            onClick={() => setChosenMates(chosenMates.filter((x) => x !== id))}
                            style={{ border: 'none', background: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 16, padding: 0 }}
                            aria-label={`Remove ${m.fullName}`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="tiny muted" style={{ marginTop: 8 }}>{chosenMates.length} of 4–9 added · you'll be the 1st member</p>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || chosenMates.length < 4} onClick={createMyCircle}>
                {busy ? <span className="spin" /> : 'I stand with these members'}
              </button>
              {chosenMates.length < 4 && (
                <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
                  {mates.length === 0
                    ? 'Waiting on more of your cluster to register before you can form a chama.'
                    : `Add ${4 - chosenMates.length} more to continue.`}
                </p>
              )}
            </>
          )}
        </>
      )}

      {step === 'circleWaiting' && myCircle && (
        <>
          <GroSays line="circleWaiting" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 15.5, fontWeight: 600 }}>{myCircle.name}</span>
              <span className="tiny muted">{myCircle.confirmed_pairs} of {myCircle.total_pairs} confirmed</span>
            </div>
            {myCircle.members.map((m) => (
              <div key={m.farmerId} className="row" style={{ padding: '4px 0', fontSize: 14.5 }}>
                <span>{m.fullName}{m.isHead ? ' · head' : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="muted tiny">{m.myVouchStatus === 'SELF' ? 'you' : m.myVouchStatus === 'ACCEPTED' ? '✓ confirmed' : m.myVouchStatus === 'DECLINED' ? 'declined' : 'waiting'}</span>
                  {myCircle.isHead && m.myVouchStatus !== 'SELF' && m.myVouchStatus !== 'ACCEPTED' && (
                    <button
                      onClick={() => removeMember(m.farmerId)}
                      disabled={removingId === m.farmerId}
                      style={{ border: 'none', background: 'none', color: 'var(--clay)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                      {removingId === m.farmerId ? '…' : 'Remove'}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onComplete}>Continue to app</button>
        </>
      )}

      {step === 'circleVouch' && myCircle && (
        <>
          <h2 style={{ fontSize: 17, fontWeight: 500, marginBottom: 4 }}>Confirm your chama</h2>
          <button
            className="card"
            onClick={() => { setFaqReturnTo('circleVouch'); setStep('circleFaq'); }}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: 10, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', textAlign: 'left',
              fontSize: 14, fontWeight: 500, fontFamily: 'inherit', color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            <span>What do I need to know about Growth Chama?</span>
            <span aria-hidden>⌄</span>
          </button>
          <p className="muted" style={{ marginBottom: 12 }}>
            {(() => { const founder = myCircle.members.find((m) => m.isHead); return founder ? `${founder.fullName} named you in ${myCircle.name}.` : `You've been named in ${myCircle.name}.`; })()}
            {' '}If any member repays late, it affects everyone. Untick anyone you don't stand with.
          </p>
          {myCircle.state === 'CONTESTED' && (
            <div className="err" style={{ marginBottom: 12 }}>
              Some members haven't accepted everyone yet. Talk as a group — loans open once every member has confirmed every member.
            </div>
          )}
          {myCircle.members.filter((m) => m.myVouchStatus !== 'SELF').map((m) => (
            <button
              key={m.farmerId}
              className={`tick-chip tick-chip-row ${!declined.includes(m.farmerId) ? 'tick-chip-on' : ''}`}
              onClick={() => toggle(declined, setDeclined, m.farmerId)}
            >
              {m.fullName}{m.isHead ? ' · head' : ''} {!declined.includes(m.farmerId) ? '✓' : ''}
            </button>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 2 }} disabled={busy} onClick={submitMyVouches}>
            {busy ? <span className="spin" /> : 'I stand with these members'}
          </button>
          <p className="tiny muted" style={{ textAlign: 'center', marginTop: 8 }}>
            {myCircle.confirmed_pairs} of {myCircle.total_pairs} confirmations so far ·{' '}
            <button
              onClick={startNewCircleInstead}
              disabled={leaving}
              style={{ border: 'none', background: 'none', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              {leaving ? 'leaving…' : 'start a new chama instead'}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
