/**
 * The Gro-guided setup walkthrough (grofunder_farmer_app_mockup.html v1.0):
 *   3 explainer cards -> record confirmation (+ mismatch flag) -> home location
 *   -> about-you (crops, activities, income) -> Growth Circle formation/vouching
 *   -> main app.
 *
 * Resumable: on mount, asks the backend exactly which of these the farmer has
 * already done (getOnboardingStatus / myCircleStatus) and jumps straight to
 * wherever they left off -- a farmer who drops off mid-flow never restarts
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
  | 'circleWaiting'
  | 'circleVouch';

const CROP_OPTIONS = ['Coffee', 'Tea', 'Maize', 'Beans', 'Bananas', 'Sugarcane', 'Dairy', 'Poultry'];
const ACTIVITY_OPTIONS = ['Boda boda', 'Small shop', 'Casual work', 'Tailoring', 'Mama mboga', 'Nothing else'];
const INCOME_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Seasonal'];

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
  const [activities, setActivities] = useState<string[]>([]);
  const [incomeFreq, setIncomeFreq] = useState<string | null>(null);

  const [mates, setMates] = useState<{ id: string; fullName: string }[]>([]);
  const [chosenMates, setChosenMates] = useState<string[]>([]);
  const [circleName, setCircleName] = useState('');
  const [myCircle, setMyCircle] = useState<MyCircleStatus['circle'] | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);

  const resume = useCallback(async () => {
    setErr('');
    try {
      const status = await farmerApi.onboardingStatus();
      if (!status.recordConfirmed) { setStep('welcome'); return; }
      if (!status.idAttempted) { setStep('idConfirm'); return; }
      if (!status.hasHomeLocation) { setStep('location'); return; }
      if (!status.hasEconomicProfile) { setStep('aboutCrops'); return; }
      if (!status.circleId) {
        const [r, m] = await Promise.all([farmerApi.records(), farmerApi.clusterMates()]);
        setRecord(r); setMates(m.data);
        setStep('circleForm');
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
    if (!navigator.geolocation) { setErr('Location is not available on this device -- you can describe it instead.'); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setErr('Could not get your location -- you can describe it instead.'); setLocating(false); },
    );
  }

  async function saveLocation() {
    if (!coords) { setErr('Share your location, or describe where you live.'); return; }
    setBusy(true); setErr('');
    try {
      await farmerApi.setHomeLocation(coords.lat, coords.lng, locationText.trim() || undefined);
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
      await farmerApi.setEconomicProfile(crops, activities, incomeFreq ? incomeFreq.toUpperCase() : undefined);
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
    if (chosenMates.length < 4) { setErr('Choose at least 4 others -- a circle needs 5 to 10 members including you.'); return; }
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

  if (step === 'loading') {
    return <div className="screen center" style={{ paddingTop: 80 }}><span className="spin" /></div>;
  }

  return (
    <div className="screen screen-pad-top">
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      {step === 'welcome' && (
        <>
          <GroSays line="welcome" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer1')}>Niko tayari -- I'm ready</button>
        </>
      )}

      {step === 'explainer1' && (
        <>
          <GroSays line="explainerWhat" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer2')}>Endelea -- continue</button>
        </>
      )}

      {step === 'explainer2' && (
        <>
          <GroSays line="explainerProgress">
            <div className="vine" style={{ marginTop: 10 }}>
              {[1, 2, 3, 4, 5].map((n) => <div key={n} className={`leaf-node ${n === 1 ? 'leaf-paid' : 'leaf-todo'}`}>{n === 1 ? '\u25cf' : '\u00b7'}</div>)}
            </div>
          </GroSays>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('explainer3')}>Endelea -- continue</button>
        </>
      )}

      {step === 'explainer3' && (
        <>
          <GroSays line="explainerTogether" />
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadRecord} disabled={busy}>
            {busy ? <span className="spin" /> : 'Endelea -- continue'}
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
              <tr><td className="muted" style={{ padding: '3px 0' }}>Member no.</td><td style={{ textAlign: 'right' }}>{record.coop_member_no ?? '\u2014'}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Cluster</td><td style={{ textAlign: 'right' }}>{record.cluster_name ?? '\u2014'}{record.cluster_head ? ` \u00b7 head ${record.cluster_head}` : ''}</td></tr>
              <tr><td className="muted" style={{ padding: '3px 0' }}>Deliveries on record</td><td style={{ textAlign: 'right' }}>{record.delivery_count}</td></tr>
            </tbody></table>
            {!flagged && !showFlag && (
              <button className="btn-ghost" style={{ width: '100%', fontSize: 11.5, padding: 6, marginTop: 8 }} onClick={() => setShowFlag(true)}>
                Something here is wrong
              </button>
            )}
            {showFlag && (
              <div style={{ marginTop: 8 }}>
                <textarea className="input" rows={2} placeholder="What's not right? (optional)" value={flagDetails} onChange={(e) => setFlagDetails(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button className="btn-ghost" style={{ flex: 1, fontSize: 12.5 }} onClick={() => setShowFlag(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 12.5, padding: 8 }} disabled={busy} onClick={submitFlag}>Send</button>
                </div>
              </div>
            )}
            {flagged && <div className="ok" style={{ marginTop: 8, fontSize: 11.5 }}>Sent to your cooperative to fix. You can continue -- but loan applications will wait until your records match.</div>}
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
                {busy ? <span className="spin" /> : 'Endelea -- continue'}
              </button>
            </>
          )}
          {idResult === 'MATCHED' && (
            <>
              <div className="ok" style={{ marginTop: 12 }}>Vizuri! That matches.</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep('location')}>Endelea -- continue</button>
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
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setStep('location')}>Endelea -- continue</button>
            </>
          )}
        </>
      )}

      {step === 'location' && (
        <>
          <GroSays line="homeLocation" />
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ background: 'var(--g-tint)', borderRadius: 8, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              {coords ? <span style={{ fontSize: 12.5, color: 'var(--g-dark)' }}>Location shared \u2713</span> : <span className="muted" style={{ fontSize: 12.5 }}>No location yet</span>}
            </div>
            <button className="btn-ghost" style={{ width: '100%', marginBottom: 8 }} onClick={useGpsLocation} disabled={locating}>
              {locating ? <span className="spin" /> : 'Share my location'}
            </button>
            <input className="input" placeholder="Or describe where you live (e.g. near Kanyada market)" value={locationText} onChange={(e) => setLocationText(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || !coords} onClick={saveLocation}>
            {busy ? <span className="spin" /> : 'Endelea -- continue'}
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
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('aboutActivities')}>Endelea -- continue</button>
        </>
      )}

      {step === 'aboutActivities' && (
        <>
          <GroSays line="aboutActivities" />
          <div className="tick-wrap" style={{ marginTop: 12 }}>
            {ACTIVITY_OPTIONS.map((a) => (
              <button key={a} className={`tick-chip ${activities.includes(a) ? 'tick-chip-on' : ''}`} onClick={() => toggle(activities, setActivities, a)}>{a}</button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('aboutIncome')}>Endelea -- continue</button>
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
            {busy ? <span className="spin" /> : 'Maliza -- finish'}
          </button>
        </>
      )}

      {step === 'seedPlanted' && (
        <>
          <GroSays line="seedPlanted" />
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>You can update these answers any time. Gro will ask again when you apply for a loan.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={busy} onClick={goToCircleForm}>
            {busy ? <span className="spin" /> : 'Endelea -- continue'}
          </button>
        </>
      )}

      {step === 'circleForm' && (
        <>
          <GroSays line="circleIntro" />
          <div className="card" style={{ marginTop: 12 }}>
            <input className="input" placeholder="Name your circle (optional)" value={circleName} onChange={(e) => setCircleName(e.target.value)} style={{ marginBottom: 10 }} />
            <div className="label" style={{ marginBottom: 8 }}>Your cluster-mates -- pick 4 to 9</div>
            {mates.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No cluster-mates available to pick yet -- check back once more farmers in your cluster have registered.</p>
            ) : (
              <div className="tick-wrap">
                {mates.map((m) => (
                  <button key={m.id} className={`tick-chip ${chosenMates.includes(m.id) ? 'tick-chip-on' : ''}`} onClick={() => toggle(chosenMates, setChosenMates, m.id)}>{m.fullName}</button>
                ))}
              </div>
            )}
            <p className="tiny muted" style={{ marginTop: 8 }}>{chosenMates.length} chosen \u00b7 you'll be the 1st, making {chosenMates.length + 1} in total</p>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || chosenMates.length < 4} onClick={createMyCircle}>
            {busy ? <span className="spin" /> : 'I stand with these members'}
          </button>
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
                <span>{m.fullName}{m.isHead ? ' \u00b7 head' : ''}</span>
                <span className="muted tiny">{m.myVouchStatus === 'SELF' ? 'you' : m.myVouchStatus === 'ACCEPTED' ? '\u2713 confirmed' : m.myVouchStatus === 'DECLINED' ? 'declined' : 'waiting'}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onComplete}>Continue to app</button>
        </>
      )}

      {step === 'circleVouch' && myCircle && (
        <>
          <GroSays line={myCircle.state === 'CONTESTED' ? 'circleContested' : 'circleVouch'} />
          <div className="card" style={{ marginTop: 12 }}>
            <div className="label" style={{ marginBottom: 8 }}>{myCircle.name}</div>
            {myCircle.members.filter((m) => m.myVouchStatus !== 'SELF').map((m) => (
              <button
                key={m.farmerId}
                className={`tick-chip tick-chip-row ${!declined.includes(m.farmerId) ? 'tick-chip-on' : ''}`}
                onClick={() => toggle(declined, setDeclined, m.farmerId)}
              >
                {m.fullName}{m.isHead ? ' \u00b7 head' : ''} {!declined.includes(m.farmerId) ? '\u2713' : ''}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy} onClick={submitMyVouches}>
            {busy ? <span className="spin" /> : 'I stand with these members'}
          </button>
        </>
      )}
    </div>
  );
}
