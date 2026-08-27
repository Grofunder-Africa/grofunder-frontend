/**
 * The Gro-guided setup walkthrough (grofunder_farmer_app_mockup.html v1.0):
 *   3 explainer cards -> record confirmation (+ mismatch flag) -> home location
 *   -> about-you (crops, activities, income) -> Growth Circle formation/vouching
 *   -> main app.
 *
 * Resumable: on mount, asks the backend exactly which of these the farmer has
 * already done (getOnboardingStatus / myCircleStatus) and jumps straight to
 * wherever they left off — a farmer who drops off mid-flow never restarts
 * from scratch (except the 3 explainer cards, which only guard the very
 * first step and are harmless to see again).
 */
import { useState, useEffect, useCallback } from 'react';
import { farmerApi, ApiError } from './api';
import type { FarmerRecord, MyCircleStatus } from './api';
import { GroSays } from './Gro';

type Step =
  | 'loading'
  | 'welcome' | 'explainer1' | 'explainer2' | 'explainer3'
  | 'record'
  | 'idConfirm'
  | 'location'
  | 'aboutCrops' | 'aboutActivities' | 'aboutIncome'
  | 'seedPlanted'
  | 'circleForm'
  | 'circleFaq'
  | 'circleWaiting'
  | 'circleVouch';

const CROP_OPTIONS = ['Coffee', 'Tea', 'Maize', 'Beans', 'Bananas', 'Sugarcane', 'Dairy', 'Poultry'];
const ACTIVITY_OPTIONS = ['Boda boda', 'Small shop', 'Casual work', 'Tailoring', 'Mama mboga', 'Nothing else'];
const INCOME_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Seasonal'];

/**
 * The full Growth Circles explanation, verbatim in spirit from
 * grofunder_farmer_app_mockup.html, reorganized into the four questions that
 * matter: what it is, why it exists, why it matters, how it works. Lives on
 * its own page (see the 'circleFaq' step below) — reached only when someone
 * taps "More about Growth Circles," never shown by default.
 */
function CircleFaq() {
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>What is a Growth Circle?</div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          5–10 farmers from your cluster who vouch for each other. You choose each other — every member confirms
          every member, so no one is in a circle they didn't pick, and no one joins yours without your yes.
        </p>
      </div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>Why does it exist?</div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Grofunder lends without collateral. Your circle standing behind you — the way your community already
          does — is what makes that possible.
        </p>
      </div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="label" style={{ marginBottom: 6 }}>Why does it matter?</div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          The circle opens the door: loans only start once it's fully confirmed and active, and your first limit
          unlocks with it. If a member misses a payment, the circle is told that day and has 5 days to help follow
          up or cover it — after that a late fee applies and your cooperative steps in. While it's unpaid, no one in
          the circle can take a new loan.
        </p>
      </div>
      <div className="card">
        <div className="label" style={{ marginBottom: 6 }}>How does it work?</div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          You form one when you set up, or someone names you in theirs. Either way, you see exactly who's in it and
          choose to stand with each of them. Strong circles earn champion recognition every Friday, and every
          member's tree grows faster.
        </p>
      </div>
    </>
  );
}

export function Setup({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('loading');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [showFlag, setShowFlag] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [flagDetails, setFlagDetails] = useState('');

  const [idInput, setIdInput] = useState('');
  const [idResult, setIdResult] = useState<'MATCHED' | 'MISMATCH' | 'PENDING_VERIFICATION' | null>(null);

  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState('');

  const [crops, setCrops] = useState<string[]>([]);
  const [showOtherCrop, setShowOtherCrop] = useState(false);
  const [otherCropText, setOtherCropText] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [showOtherActivity, setShowOtherActivity] = useState(false);
  const [otherActivityText, setOtherActivityText] = useState('');
  const [incomeFreq, setIncomeFreq] = useState<string | null>(null);

  const [mates, setMates] = useState<{ id: string; fullName: string }[]>([]);
  const [chosenMates, setChosenMates] = useState<string[]>([]);
  const [circleName, setCircleName] = useState('');
  // Which step "More about Growth Circles" should return to — the FAQ is
  // its own page now, not an inline expand, so it needs to know the way back.
  const [faqReturnTo, setFaqReturnTo] = useState<'circleForm' | 'circleVouch'>('circleForm');
  const [myCircle, setMyCircle] = useState<MyCircleStatus['circle'] | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);
  // The circle *formation* screen lands minimal and reveals the form only
  // when the farmer taps "Form a Growth Circle". The vouching screen does
  // NOT do this — it matches the mockup exactly, showing the roster straight
  // away, since someone who's been named in a circle is there to act on it.
  const [formExpanded, setFormExpanded] = useState(false);

  const resume = useCallback(async () => {
    setErr('');
    try {
      const status = await farmerApi.onboardingStatus();
      if (!status.recordConfirmed) { setStep('welcome'); return; }
      if (!status.idAttempted) { setStep('idConfirm'); return; }
      if (!status.hasHomeLocation) { setStep('location'); return; }
      if (!status.hasEconomicProfile) { setStep('aboutCrops'); return; }
      if (!status.circleId) {
        // Route through the celebration first, not straight to circle
        // formation — otherwise a farmer who finishes "about you" and closes
        // the app right there would never see it on their next visit. The
        // seedPlanted screen's own Continue button already does this same
        // fetch (see goToCircleForm), so nothing else needs to change.
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
      setStep('welcome');
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

  function useGpsLocation() {
    setLocating(true); setErr('');
    if (!navigator.geolocation) { setErr('Location is not available on this device — you can describe it instead.'); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setErr('Could not get your location — you can describe it instead.'); setLocating(false); },
    );
  }

  async function saveLocation() {
    if (!coords && !locationText.trim()) { setErr('Share your location, or describe where you live.'); return; }
    setBusy(true); setErr('');
    try {
      await farmerApi.setHomeLocation(coords?.lat ?? null, coords?.lng ?? null, locationText.trim() || undefined);
      setStep('aboutCrops');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  }

  async function finishAboutYou() {
    setBusy(true); setErr('');
    try {
      const finalCrops = otherCropText.trim() ? [...crops, otherCropText.trim()] : crops;
      const finalActivities = otherActivityText.trim() ? [...activities, otherActivityText.trim()] : activities;
      await farmerApi.setEconomicProfile(finalCrops, finalActivities, incomeFreq ? incomeFreq.toUpperCase() : undefined);
      setStep('seedPlanted');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setBusy(false); }
  }

  async function goToCircleForm() {
    setBusy(true); setErr('');
    try {
      const [r, m] = await Promise.all([record ? Promise.resolve(record) : farmerApi.records(), farmerApi.clusterMates()]);
      setRecord(r); setMates(m.data);
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
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not create your circle'); }
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
      setRecord(r); setMates(m.data);
      setStep('circleForm');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not leave that circle'); }
    finally { setLeaving(false); }
  }

  if (step === 'loading') {
    return <div className="screen center" style={{ paddingTop: 80 }}><span className="spin" /></div>;
  }

  return (
    <div className="screen screen-pad-top">
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      {step === 'welcome' && (
        <>
          <GroSays line="welcome" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer1')}>Niko tayari — I'm ready</button>
        </>
      )}

      {step === 'explainer1' && (
        <>
          <GroSays line="explainerWhat" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer2')}>Endelea — continue</button>
        </>
      )}

      {step === 'explainer2' && (
        <>
          <GroSays line="explainerProgress">
            <div className="vine" style={{ marginTop: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => <div key={n} className={`leaf-node ${n === 1 ? 'leaf-paid' : 'leaf-todo'}`}>{n === 1 ? '●' : '·'}</div>)}
            </div>
          </GroSays>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer3')}>Endelea — continue</button>
        </>
      )}

      {step === 'explainer3' && (
        <>
          <GroSays line="explainerTogether" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadRecord} disabled={busy}>
            {busy ? <span className="spin" /> : 'Endelea — continue'}
          </button>
        </>
      )}

      {step === 'record' && record && (
        <>
          <GroSays line="recordConfirm" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>Your cooperative record</div>
            <table style={{ width: '100%', fontSize: 13.5 }}><tbody>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Name</td><td style={{ textAlign: 'right' }}>{record.full_name}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Member no.</td><td style={{ textAlign: 'right' }}>{record.coop_member_no ?? ' — '}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Cluster</td><td style={{ textAlign: 'right' }}>{record.cluster_name ?? ' — '}{record.cluster_head ? ` · head ${record.cluster_head}` : ''}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Deliveries on record</td><td style={{ textAlign: 'right' }}>{record.delivery_count}</td></tr>
            </tbody></table>
            {!flagged && !showFlag && (
              <button className="btn btn-ghost" style={{ width: '100%', fontSize: 11.5, padding: 6, marginTop: 8 }} onClick={() => setShowFlag(true)}>
                Something here is wrong
              </button>
            )}
            {showFlag && (
              <div style={{ marginTop: 8 }}>
                <textarea className="input" rows={2} placeholder="What's not right? (optional)" value={flagDetails} onChange={(e) => setFlagDetails(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={() => setShowFlag(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 12.5, padding: 8 }} disabled={busy} onClick={submitFlag}>Send</button>
                </div>
              </div>
            )}
            {flagged && <div className="ok" style={{ marginTop: 8, fontSize: 11.5 }}>Sent to your cooperative to fix. You can continue — but loan applications will wait until your records match.</div>}
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
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={() => setStep('location')}>
                Skip for now — I don't have it with me
              </button>
            </>
          )}
          {idResult === 'MATCHED' && (
            <>
              <div className="ok" style={{ marginTop: 12 }}>Vizuri! That matches.</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep('location')}>Endelea — continue</button>
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
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setStep('location')}>Endelea — continue</button>
            </>
          )}
        </>
      )}

      {step === 'location' && (
        <>
          <GroSays line="homeLocation" />
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ background: 'var(--g-tint)', borderRadius: 8, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {coords ? <span style={{ fontSize: 12.5, color: 'var(--g-dark)' }}>Location shared ✓</span> : <span className="muted" style={{ fontSize: 12.5 }}>No location yet</span>}
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 8 }} onClick={useGpsLocation} disabled={locating}>
              {locating ? <span className="spin" /> : 'Share my location'}
            </button>
            <input className="input" placeholder="Or describe where you live (e.g. near Kanyada market)" value={locationText} onChange={(e) => setLocationText(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || (!coords && !locationText.trim())} onClick={saveLocation}>
            {busy ? <span className="spin" /> : 'Endelea — continue'}
          </button>
        </>
      )}

      {step === 'aboutCrops' && (
        <>
          <GroSays line="aboutCrops" />
          <div className="tick-wrap" style={{ marginTop: 12 }}>
            {CROP_OPTIONS.map((c) => (
              <button key={c} className={`tick-chip ${crops.includes(c) ? 'tick-chip-on' : ''}`} onClick={() => toggle(crops, setCrops, c)}>{c}</button>
            ))}
            <button className={`tick-chip ${showOtherCrop ? 'tick-chip-on' : ''}`} onClick={() => setShowOtherCrop((s) => !s)}>Other</button>
          </div>
          {showOtherCrop && (
            <input
              className="input" style={{ marginTop: 8 }} placeholder="What else do you grow?"
              value={otherCropText} onChange={(e) => setOtherCropText(e.target.value)} autoFocus
            />
          )}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('aboutActivities')}>Endelea — continue</button>
        </>
      )}

      {step === 'aboutActivities' && (
        <>
          <GroSays line="aboutActivities" />
          <div className="tick-wrap" style={{ marginTop: 12 }}>
            {ACTIVITY_OPTIONS.map((a) => (
              <button key={a} className={`tick-chip ${activities.includes(a) ? 'tick-chip-on' : ''}`} onClick={() => toggle(activities, setActivities, a)}>{a}</button>
            ))}
            <button className={`tick-chip ${showOtherActivity ? 'tick-chip-on' : ''}`} onClick={() => setShowOtherActivity((s) => !s)}>Other</button>
          </div>
          {showOtherActivity && (
            <input
              className="input" style={{ marginTop: 8 }} placeholder="What else earns you money?"
              value={otherActivityText} onChange={(e) => setOtherActivityText(e.target.value)} autoFocus
            />
          )}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('aboutIncome')}>Endelea — continue</button>
        </>
      )}

      {step === 'aboutIncome' && (
        <>
          <GroSays line="aboutIncome" />
          <div className="tick-wrap" style={{ marginTop: 12 }}>
            {INCOME_OPTIONS.map((f) => (
              <button key={f} className={`tick-chip ${incomeFreq === f ? 'tick-chip-on' : ''}`} onClick={() => setIncomeFreq(f)}>{f}</button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={finishAboutYou}>
            {busy ? <span className="spin" /> : 'Maliza — finish'}
          </button>
        </>
      )}

      {step === 'seedPlanted' && (
        <>
          <GroSays line="seedPlanted" />
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>You can update these answers any time. Gro will ask again when you apply for a loan.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={goToCircleForm}>
            {busy ? <span className="spin" /> : 'Endelea — continue'}
          </button>
        </>
      )}

      {step === 'circleFaq' && (
        <>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>About Growth Circles</h3>
          <CircleFaq />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep(faqReturnTo)}>Back</button>
        </>
      )}

      {step === 'circleForm' && (
        <>
          <GroSays line="circleIntro" />
          <button className="btn btn-ghost" style={{ width: '100%', marginBottom: 10 }} onClick={() => { setFaqReturnTo('circleForm'); setStep('circleFaq'); }}>
            More about Growth Circles
          </button>
          {!formExpanded ? (
            <button className="btn btn-primary" onClick={() => setFormExpanded(true)}>Form a Growth Circle</button>
          ) : (
            <>
              <div className="card">
                <input className="input" placeholder="Name your circle (optional)" value={circleName} onChange={(e) => setCircleName(e.target.value)} style={{ marginBottom: 10 }} />
                {mates.filter((m) => !chosenMates.includes(m.id)).length === 0 && chosenMates.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>No cluster-mates available yet — check back once more of your cluster has registered.</p>
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
                        <div key={id} className="row" style={{ background: 'var(--g-tint)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                          <span>{m.fullName}</span>
                          <button
                            onClick={() => setChosenMates(chosenMates.filter((x) => x !== id))}
                            style={{ border: 'none', background: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 15, padding: 0 }}
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
            </>
          )}
        </>
      )}

      {step === 'circleWaiting' && myCircle && (
        <>
          <GroSays line="circleWaiting" />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{myCircle.name}</span>
              <span className="tiny muted">{myCircle.confirmed_pairs} of {myCircle.total_pairs} confirmed</span>
            </div>
            {myCircle.members.map((m) => (
              <div key={m.farmerId} className="row" style={{ padding: '4px 0', fontSize: 13 }}>
                <span>{m.fullName}{m.isHead ? ' · head' : ''}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="muted tiny">{m.myVouchStatus === 'SELF' ? 'you' : m.myVouchStatus === 'ACCEPTED' ? '✓ confirmed' : m.myVouchStatus === 'DECLINED' ? 'declined' : 'waiting'}</span>
                  {myCircle.isHead && m.myVouchStatus !== 'SELF' && m.myVouchStatus !== 'ACCEPTED' && (
                    <button
                      onClick={() => removeMember(m.farmerId)}
                      disabled={removingId === m.farmerId}
                      style={{ border: 'none', background: 'none', color: 'var(--clay)', fontSize: 11, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
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
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Confirm your circle</h2>
          <button
            className="card"
            onClick={() => { setFaqReturnTo('circleVouch'); setStep('circleFaq'); }}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: 10, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', textAlign: 'left',
              fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            <span>What do I need to know about Growth Circles?</span>
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
              {leaving ? 'leaving…' : 'start a new circle instead'}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
