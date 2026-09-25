import { useState, useEffect, useCallback } from 'react';
import { farmerApi, setToken, getToken, kes, ApiError, onSessionExpired } from './api';
import type { ScoreInfo, FarmerRecord, Quote, Instalment, FarmerInboxMessage, CaptureRecord, DeliverySummary, MyActiveLoanStage, FeedPost, MyCircleStatus, FarmerMessage, FarmerAudience } from './api';
import { Gro, GRO_QUICK_ASKS, GRO_OPENING, GRO_FREETEXT_REPLY, GRO_RECEIPT } from './Gro';
import { Setup } from './Setup';
import type { Step as SetupStep } from './Setup';
import logo from './assets/grofunder-logo.png';

/* SVG icons — replaces emoji, matching the grofunder visual identity. */
function Icon({ name }: { name: string }) {
  const p: Record<string, React.ReactNode> = {
    home: <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 8.5V20h14V8.5" /></>,
    loan: <><path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M16 9h2.5a2 2 0 0 1 0 4H16" /><path d="M8 3v2M11 3v2" /></>,
    messages: <><path d="M4 5h16v12H8l-4 3z" /></>,
    records: <><path d="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v2H4z" /></>,
    community: <><circle cx="9" cy="8" r="3" /><path d="M15 11a3 3 0 1 0 0-6" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M17 15c2 0 4 1.5 4 5" /></>,
    signout: <><path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" /><path d="M18 15l3-3-3-3M21 12H9" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" /></>,
  };
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[name] ?? null}
    </svg>
  );
}

type Screen = 'signin' | 'setup' | 'home' | 'apply' | 'schedule' | 'messages' | 'records' | 'community' | 'settings';

/** All of onboarding done? Record confirmed, ID at least attempted (not
 *  necessarily matched — a mismatch still blocks loans separately, via the
 *  discrepancy it raises, but shouldn't trap someone out of the app entirely),
 *  home location + about-you set, and in an ACTIVE circle. Anything short of
 *  that sends the farmer to Setup instead of the main app, resuming exactly
 *  where they left off. Deliberately mirrors Setup.tsx's own resume() step
 *  order — if the two ever disagree, a farmer could end up permanently
 *  skipping a step (e.g. tapping "Skip for now" on ID confirmation, then
 *  never being asked again once everything else is done). */
async function isFullySetUp(): Promise<boolean> {
  try {
    const s = await farmerApi.onboardingStatus();
    // Home location was moved out of onboarding entirely (optional, set later
    // from Home) — it must never gate this, or nobody could ever finish.
    // Circle formation is skippable too (see 'circleForm' in Setup.tsx): a
    // farmer with too few cluster-mates to form one yet shouldn't be stuck.
    // Actual loan applications still require an active chama — that's
    // enforced separately, in Apply's own readiness checklist.
    return s.recordConfirmed && s.idAttempted && s.hasEconomicProfile;
  } catch {
    return true; // don't trap a farmer in Setup on a network hiccup — let Home's own error handling take over
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('signin');
  const [checkingSetup, setCheckingSetup] = useState(!!getToken());
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  // Set when a readiness-checklist item on Apply sends the farmer back into
  // Setup to fix one specific thing, instead of Setup auto-resuming wherever
  // it normally would.
  const [setupJumpTo, setSetupJumpTo] = useState<SetupStep | undefined>(undefined);

  // On load, a returning (already-signed-in) farmer resumes Setup if they
  // dropped off mid-walkthrough, rather than always landing on Home.
  useEffect(() => {
    if (!getToken()) return;
    isFullySetUp().then((done) => setScreen(done ? 'home' : 'setup')).finally(() => setCheckingSetup(false));
  }, []);

  // Registered once, here — any expired session, from any screen, lands
  // back on sign-in consistently. See onSessionExpired in api.ts.
  useEffect(() => {
    onSessionExpired(() => setScreen('signin'));
  }, []);

  async function afterSignIn() {
    setCheckingSetup(true);
    const done = await isFullySetUp();
    setScreen(done ? 'home' : 'setup');
    setCheckingSetup(false);
  }

  const refreshUnread = useCallback(() => {
    if (!getToken()) return;
    farmerApi.inboxUnread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [refreshUnread, screen]);

  if (checkingSetup) {
    return <div className="app"><div className="screen screen-no-nav center" style={{ paddingTop: 100 }}><span className="spin" /></div></div>;
  }

  return (
    <div className={`app ${screen !== 'signin' && screen !== 'setup' ? 'app-full' : ''}`}>
      {screen === 'signin' && <SignIn onDone={afterSignIn} />}
      {screen === 'setup' && <Setup onComplete={() => { setSetupJumpTo(undefined); setScreen('home'); }} jumpTo={setupJumpTo} />}
      {screen === 'home' && (
        <Home
          onApply={() => setScreen('apply')}
          onSignOut={() => { setToken(null); setScreen('signin'); }}
          onContinueSetup={() => setScreen('setup')}
          onSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'settings' && <Settings onBack={() => setScreen('home')} />}
      {screen === 'apply' && (
        <Apply onBack={() => setScreen('home')} onApplied={(id) => { setActiveLoanId(id); setScreen('schedule'); }}
          onFixInSetup={(step) => { setSetupJumpTo(step); setScreen('setup'); }} />
      )}
      {screen === 'schedule' && activeLoanId && (
        <Schedule loanId={activeLoanId} onBack={() => setScreen('home')} />
      )}
      {screen === 'messages' && <Messages onRead={refreshUnread} onBack={() => setScreen('home')} />}
      {screen === 'records' && <Records onBack={() => setScreen('home')} />}
      {screen === 'community' && <Community onBack={() => setScreen('home')} />}
      {screen !== 'signin' && screen !== 'setup' && (
        <nav className="tabbar">
          <button className={`tab ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
            <span className="dot"><Icon name="home" /></span>Home
          </button>
          <button className={`tab ${screen === 'apply' ? 'active' : ''}`} onClick={() => setScreen('apply')}>
            <span className="dot"><Icon name="loan" /></span>Loan
          </button>
          <button className={`tab ${screen === 'community' ? 'active' : ''}`} onClick={() => setScreen('community')}>
            <span className="dot"><Icon name="community" /></span>Community
          </button>
          <button className={`tab ${screen === 'records' ? 'active' : ''}`} onClick={() => setScreen('records')}>
            <span className="dot"><Icon name="records" /></span>Records
          </button>
          <button className={`tab ${screen === 'messages' ? 'active' : ''}`} onClick={() => setScreen('messages')}>
            <span className="dot"><Icon name="messages" /></span>Messages{unread > 0 && <span className="tab-badge">{unread}</span>}
          </button>
        </nav>
      )}
    </div>
  );
}

/* ---------------- Sign in / register ---------------- */
/** Rejects PINs that are trivially guessable. Returns null when the PIN is fine
 *  (or still being typed), otherwise a plain-language reason. */
function weakPinReason(pin: string): string | null {
  if (pin.length !== 4) return null;
  if (/^(\d)\1{3}$/.test(pin)) return 'Not 0000 or four repeated digits. Pick something harder to guess.';
  if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'That is a run of digits. Pick something harder to guess.';
  if (pin.slice(0, 2) === pin.slice(2)) return 'Avoid repeating pairs like 1212. Pick something harder to guess.';
  return null;
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [memberNo, setMemberNo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // OTP step: set once phone + PIN check out and a code has been sent.
  const [challenge, setChallenge] = useState<{ id: string; sentTo: string } | null>(null);
  const [code, setCode] = useState('');
  const [forgotPin, setForgotPin] = useState(false);

  // A PIN guessable in three tries protects nothing. Blocked here AND on the
  // server, since a client-side rule alone is not a rule.
  const pinProblem = weakPinReason(pin);

  async function submit() {
    if (mode === 'register' && pinProblem) { setErr(pinProblem); return; }
    if (mode === 'register' && pinConfirm !== pin) { setErr("Your PINs don't match — check both."); return; }
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        await farmerApi.register(phone, pin, memberNo || undefined);
      }
      const r = await farmerApi.login(phone, pin);
      if (r.otpRequired) {
        setChallenge({ id: r.challengeId, sentTo: r.sentTo });
        setCode('');
      } else {
        setToken(r.token);
        onDone();
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!challenge) return;
    setErr(''); setBusy(true);
    try {
      const { token } = await farmerApi.verifyOtp(challenge.id, code);
      setToken(token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  // Asking for a new code re-runs step 1, which invalidates the previous one
  // server-side so only the newest code ever works.
  async function resend() {
    setErr(''); setCode('');
    await submit();
  }

  if (challenge) {
    return (
      <div className="screen screen-no-nav screen-pad-top">
        <div className="center mb-24" >
          <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
        </div>
        <div className="gro-hero" style={{ marginBottom: 20 }}>
          <div className="gro-scene">
            <Gro mood="happy" />
            <div className="gro-msg">Nimetuma code to {challenge.sentTo}. Enter it to continue.</div>
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>6-digit code</label>
          <input className="input pin-input" inputMode="numeric" maxLength={6} placeholder="••••••"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="btn btn-primary" disabled={busy || code.length !== 6} onClick={verify}>
          {busy ? <span className="spin" /> : 'Continue'}
        </button>
        <p className="center muted text-base mt-16" >
          Didn't get it?{' '}
          <button className="back" style={{ color: 'var(--g)', fontWeight: 600, fontSize: 18.5 }}
            disabled={busy} onClick={resend}>Send again</button>
        </p>
        <p className="center mt-4" >
          <button className="back" style={{ color: 'var(--mut)', fontSize: 18 }}
            onClick={() => { setChallenge(null); setErr(''); }}>Use a different number</button>
        </p>
      </div>
    );
  }

  if (forgotPin) {
    return <ForgotPin onDone={() => setForgotPin(false)} />;
  }

  return (
    <div className="screen screen-no-nav screen-pad-top">
      <div className="center" style={{ marginBottom: 28 }}>
        <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="field">
        <label>Phone number:</label>
        <input className="input" inputMode="tel" placeholder="0722 000 000" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
        <span className="hint" style={{ fontSize: 16, marginTop: 4 }}>07.. or 01..</span>
      </div>
      {mode === 'register' && (
        <div className="field">
          <label>Member number <span className="muted">(optional)</span></label>
          <input className="input" placeholder="e.g. ORD-001" value={memberNo}
            onChange={(e) => setMemberNo(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>{mode === 'register' ? 'Create PIN' : 'Password:'}</label>
        {mode === 'register' && (
          <span className="hint mb-6" >You will use this to sign in to this app.</span>
        )}
        <div className="rel">
          <input className="input pin-input" inputMode="numeric" maxLength={4} placeholder="••••"
            type={showPin ? 'text' : 'password'}
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          <button type="button" onClick={() => setShowPin((v) => !v)}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                     background: 'var(--g-tint)', border: '1px solid var(--line)', borderRadius: 8,
                     color: 'var(--g-dark)', fontSize: 17.5, fontWeight: 500, padding: '6px 10px',
                     cursor: 'pointer', fontFamily: 'inherit' }}>
            {showPin ? 'Hide' : 'Show'}
          </button>
        </div>
        {mode === 'register' && pinProblem && <span className="hint hint-warn">{pinProblem}</span>}
        {mode === 'signin' && (
          <button type="button" onClick={() => { setErr(''); setForgotPin(true); }}
            style={{ border: 'none', background: 'none', color: 'var(--mut)', fontSize: 17, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 6 }}>
            Forgot PIN?
          </button>
        )}
      </div>

      {mode === 'register' && (
        <div className="field">
          <label>Confirm PIN</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} placeholder="••••"
            type={showPin ? 'text' : 'password'}
            value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))} />
          {pinConfirm.length === 4 && pinConfirm !== pin && (
            <span className="hint hint-warn">Doesn't match — check both.</span>
          )}
        </div>
      )}

      <button className="btn btn-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700 }}
        disabled={busy || phone.length < 7 || pin.length !== 4 || (mode === 'register' && (!!pinProblem || pinConfirm !== pin))} onClick={submit}>
        {busy ? <span className="spin" /> : mode === 'signin' ? 'Login' : 'Create account'}
      </button>

      <p className="center muted text-base mt-16" >
        {mode === 'signin' ? <>New to <strong style={{ color: 'var(--ink)' }}>Grofunder</strong>? </> : 'Already registered? '}
        <button className="back" style={{ color: 'var(--g)', fontWeight: 700, fontSize: 18.5, textDecoration: 'underline' }}
          onClick={() => { setErr(''); setPin(''); setPinConfirm(''); setMode(mode === 'signin' ? 'register' : 'signin'); }}>
          {mode === 'signin' ? 'Sign Up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}

/**
 * Forgot PIN — three steps: phone + national ID (never the forgotten PIN
 * itself), then the SMS code, then a new PIN. Matches the login OTP screen's
 * look so it feels like the same product, not a bolted-on flow.
 */
function ForgotPin({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'details' | 'otp' | 'newpin' | 'done'>('details');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; sentTo: string } | null>(null);
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const pinProblem = weakPinReason(newPin);

  async function submitDetails() {
    setErr(''); setBusy(true);
    try {
      const r = await farmerApi.forgotPin(phone, nationalId);
      setChallenge({ id: r.challengeId, sentTo: r.sentTo });
      setCode('');
      setStep('otp');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }

  async function verifyCode() {
    if (!challenge) return;
    setErr(''); setBusy(true);
    try {
      const r = await farmerApi.verifyPinResetOtp(challenge.id, code);
      setResetToken(r.resetToken);
      setStep('newpin');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }

  async function resendCode() {
    setErr(''); setCode('');
    await submitDetails();
  }

  async function submitNewPin() {
    if (pinProblem) { setErr(pinProblem); return; }
    if (newPin !== newPinConfirm) { setErr("Your PINs don't match — check both."); return; }
    setErr(''); setBusy(true);
    try {
      await farmerApi.resetPin(resetToken, newPin);
      setStep('done');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }

  if (step === 'done') {
    return (
      <div className="screen screen-no-nav screen-pad-top">
        <div className="center mb-24" >
          <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
        </div>
        <div className="ok" style={{ textAlign: 'center' }}>Your PIN has been changed.</div>
        <button className="btn btn-primary mt-16"  onClick={onDone}>Back to sign in</button>
      </div>
    );
  }

  if (step === 'newpin') {
    return (
      <div className="screen screen-no-nav screen-pad-top">
        <div className="center mb-24" >
          <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>New PIN</label>
          <div className="rel">
            <input className="input pin-input" inputMode="numeric" maxLength={4} placeholder="••••"
              type={showPin ? 'text' : 'password'}
              value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
            <button type="button" onClick={() => setShowPin((v) => !v)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                       background: 'var(--g-tint)', border: '1px solid var(--line)', borderRadius: 8,
                       color: 'var(--g-dark)', fontSize: 17.5, fontWeight: 500, padding: '6px 10px',
                       cursor: 'pointer', fontFamily: 'inherit' }}>
              {showPin ? 'Hide' : 'Show'}
            </button>
          </div>
          {pinProblem && <span className="hint hint-warn">{pinProblem}</span>}
        </div>
        <div className="field">
          <label>Confirm new PIN</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} placeholder="••••"
            type={showPin ? 'text' : 'password'}
            value={newPinConfirm} onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))} />
          {newPinConfirm.length === 4 && newPinConfirm !== newPin && <span className="hint hint-warn">Doesn't match — check both.</span>}
        </div>
        <button className="btn btn-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 700 }}
          disabled={busy || newPin.length !== 4 || newPinConfirm !== newPin || !!pinProblem} onClick={submitNewPin}>
          {busy ? <span className="spin" /> : 'Set new PIN'}
        </button>
      </div>
    );
  }

  if (step === 'otp' && challenge) {
    return (
      <div className="screen screen-no-nav screen-pad-top">
        <div className="center mb-24" >
          <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
        </div>
        <div className="gro-hero" style={{ marginBottom: 20 }}>
          <div className="gro-scene">
            <Gro mood="happy" />
            <div className="gro-msg">Nimetuma a reset code to {challenge.sentTo}. Enter it to continue.</div>
          </div>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>6-digit code</label>
          <input className="input pin-input" inputMode="numeric" maxLength={6} placeholder="••••••"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="btn btn-primary" disabled={busy || code.length !== 6} onClick={verifyCode}>
          {busy ? <span className="spin" /> : 'Continue'}
        </button>
        <p className="center muted text-base mt-16" >
          Didn't get it?{' '}
          <button className="back" style={{ color: 'var(--g)', fontWeight: 600, fontSize: 18.5 }}
            disabled={busy} onClick={resendCode}>Send again</button>
        </p>
        <p className="center mt-4" >
          <button className="back" style={{ color: 'var(--mut)', fontSize: 18 }}
            onClick={() => { setChallenge(null); setErr(''); setStep('details'); }}>Use a different number</button>
        </p>
      </div>
    );
  }

  return (
    <div className="screen screen-no-nav screen-pad-top">
      <button className="back mb-12" onClick={onDone} >← Back to sign in</button>
      <h1 className="h1">Forgot your PIN?</h1>
      <p className="sub">Confirm your phone and ID number — we'll text you a code.</p>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label>Phone number:</label>
        <input className="input" inputMode="tel" placeholder="0722 000 000" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>National ID number</label>
        <input className="input" inputMode="numeric" placeholder="Your ID number" value={nationalId}
          onChange={(e) => setNationalId(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={busy || phone.length < 7 || !nationalId.trim()} onClick={submitDetails}>
        {busy ? <span className="spin" /> : 'Send reset code'}
      </button>
    </div>
  );
}

/* ---------------- Home / dashboard ---------------- */
/**
 * Maps a loan's real backend status (loan_status enum) + instalment
 * progress to the stages a farmer actually cares about seeing. "Circle
 * approval" isn't a loan_status value — it's the precondition applyForLoan
 * already enforces before a loan can exist at all — so it's always shown
 * done, not tracked separately. "Financier Approved" maps to the real
 * DISBURSING status (the point the partner is actually processing funds),
 * since there's no separate backend state for it.
 */
function loanStages(loan: MyActiveLoanStage): { label: string; done: boolean; current: boolean }[] {
  const order = ['DRAFT', 'SUBMITTED', 'PENDING_RECORD_MATCH', 'COOP_APPROVED', 'GF_APPROVED', 'DISBURSING', 'ACTIVE', 'IN_ARREARS'];
  const idx = order.indexOf(loan.status);
  const pastCoop = idx >= order.indexOf('COOP_APPROVED');
  const pastGf = idx >= order.indexOf('GF_APPROVED');
  const pastDisbursing = idx >= order.indexOf('DISBURSING');
  const isActive = loan.status === 'ACTIVE' || loan.status === 'IN_ARREARS';

  const stages: { label: string; done: boolean; current: boolean }[] = [
    { label: 'Circle approval', done: true, current: false },
    { label: 'Cooperative approval', done: pastCoop, current: !pastCoop },
    { label: 'Grofunder Approval', done: pastGf, current: pastCoop && !pastGf },
    { label: 'Financier Approved', done: pastDisbursing, current: pastGf && !pastDisbursing },
    { label: 'Your seed has been planted! Disbursed', done: isActive, current: pastDisbursing && !isActive },
  ];
  if (isActive) {
    for (let i = 1; i <= loan.instalmentsTotal; i++) {
      stages.push({
        label: `Repayment instalment ${i} of ${loan.instalmentsTotal}`,
        done: i <= loan.instalmentsPaid,
        current: i === loan.instalmentsPaid + 1,
      });
    }
  }
  return stages;
}

function Home({ onApply, onSignOut, onContinueSetup, onSettings }: {
  onApply: () => void; onSignOut: () => void; onContinueSetup: () => void; onSettings: () => void;
}) {
  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [score, setScore] = useState<ScoreInfo | null>(null);
  const [circle, setCircle] = useState<MyCircleStatus['circle'] | null>(null);
  const [activeLoan, setActiveLoan] = useState<MyActiveLoanStage | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  // The full record already showed once during setup confirmation — Home
  // doesn't need to repeat all five rows every visit, just offer it.
  const [showRecord, setShowRecord] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [r, s] = await Promise.all([farmerApi.records(), farmerApi.score()]);
      setRecord(r); setScore(s);
      // Circle status and the active loan's real stage are best-effort —
      // neither should fail the whole dashboard load if they hiccup.
      farmerApi.myCircleStatus().then((cs) => setCircle(cs.hasCircle ? cs.circle ?? null : null)).catch(() => {});
      farmerApi.myActiveLoan().then(setActiveLoan).catch(() => {});
    } catch (e) {
      // An expired session is already handled centrally (api.ts's
      // onSessionExpired routes back to sign-in for every screen) — this
      // catch only needs to cover a genuinely failed load.
      setErr(e instanceof ApiError ? e.message : 'Could not load your dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="screen center pt-80" ><span className="spin" /></div>;

  const isNew = score?.credit_score == null;
  const firstName = record?.full_name?.split(' ')[0] ?? 'rafiki';

  return (
    <>
      <div className="topbar">
        <span className="brand"><img src={logo} alt="grofunder" /></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="chip">{record?.cluster_name ?? '—'}</span>
          <button className="signout-btn" onClick={onSettings} title="Settings"><Icon name="settings" /></button>
          <button className="signout-btn" onClick={onSignOut} title="Sign out"><Icon name="signout" /></button>
        </div>
      </div>
      <div className="screen" style={{ paddingTop: 4 }}>
        {err && <div className="err">{err}</div>}

        <div className="gro-hero">
          <div className="gro-scene">
            <Gro mood={isNew ? 'encouraging' : 'happy'} />
            <div>
              <h2>Habari, {firstName}!</h2>
              <p>{isNew ? "Your seed is planted. Let's grow." : 'Twende tukue pamoja'}</p>
            </div>
          </div>
        </div>

        {/* limit card — credit score is intentionally not shown to farmers;
            both score and limit are admin-set on the backend, this card
            just no longer surfaces the score itself */}
        <div className="card card-green center mt-12" >
          <div className="label label-light">Your Loan Limit</div>
          <div className="limit-num" style={{ fontSize: 34 }}>{kes(score?.credit_limit_cents)}</div>
          <div className="tiny label-light mt-2" >tree stage {score?.tree_stage ?? 1} of 5</div>
        </div>

        {isNew ? (
          <div className="card">
            <p style={{ fontSize: 19.5, fontWeight: 600, marginBottom: 4 }}>
              Your seed is planted
            </p>
            {circle ? (
              <>
                <p className="muted text-base" >
                  {circle.name} is confirming: {circle.members_confirmed} of {circle.member_count} members confirmed so far.
                  Your first loan of up to {kes(500000)} opens the moment every member has confirmed every member.
                </p>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: 18, marginTop: 8 }} onClick={onContinueSetup}>
                  View my circle
                </button>
              </>
            ) : (
              <>
                <p className="muted text-base" >
                  Once your Growth Chama is active, your first loan of up to {kes(500000)} opens up. Repay well and your limit grows.
                </p>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: 18, marginTop: 8 }} onClick={onContinueSetup}>
                  Continue with Gro
                </button>
              </>
            )}
          </div>
        ) : activeLoan ? (
          <div className="card">
            <div className="row mb-8" >
              <span className="text-19 font-semibold">Your loan</span>
              {activeLoan.instalmentsPaid > 0 && (
                <svg viewBox="0 0 60 40" width="44" height="30" aria-hidden>
                  <path d="M30 38 L30 10" stroke="#067A0B" strokeWidth="3" strokeLinecap="round" />
                  <ellipse cx="14" cy="12" rx="9" ry="5" fill="#09AF0F" transform="rotate(-25 14 12)" />
                  <ellipse cx="46" cy="12" rx="9" ry="5" fill="#09AF0F" transform="rotate(25 46 12)" />
                  <ellipse cx="30" cy="5" rx="8" ry="5" fill="#5DCAA5" />
                  {activeLoan.instalmentsPaid >= 1 && <circle cx="18" cy="16" r="3.5" fill="#E24B4A" />}
                  {activeLoan.instalmentsPaid >= 2 && <circle cx="42" cy="16" r="3.5" fill="#E24B4A" />}
                  {activeLoan.instalmentsPaid >= 3 && <circle cx="30" cy="8" r="3.5" fill="#E24B4A" />}
                </svg>
              )}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {loanStages(activeLoan).map((s, i) => (
                <div key={i} className="row" style={{ padding: '2px 0' }}>
                  <span style={{
                    fontSize: 17.5,
                    color: s.done ? 'var(--g-dark)' : s.current ? 'var(--ink)' : 'var(--mut)',
                    fontWeight: s.current ? 600 : 400,
                  }}>
                    {s.done ? '✓ ' : s.current ? '● ' : '· '}{s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="row mb-6" >
              <span className="text-19 font-semibold">Your growth</span>
              <span className="tiny muted">tree stage {score?.tree_stage}/5</span>
            </div>
            <div className="vine">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`leaf-node ${n <= (score?.tree_stage ?? 1) ? 'leaf-paid' : n === (score?.tree_stage ?? 1) + 1 ? 'leaf-next' : 'leaf-todo'}`}>
                  {n <= (score?.tree_stage ?? 1) ? '●' : '·'}
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary mt-4" 
          disabled={isNew}
          onClick={onApply}>
          {isNew ? 'Apply · unlocks with your chama' : 'Apply for a loan'}
        </button>

        {/* record confirmation summary — collapsed by default; already
            shown in full once during setup, so Home only offers it */}
        <div className="card mt-12" >
          <button
            onClick={() => setShowRecord((s) => !s)}
            style={{ width: '100%', border: 'none', background: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0, cursor: 'pointer' }}
          >
            <span className="label">See your cooperative records</span>
            <svg width="26" height="16" viewBox="0 0 26 16" fill="none" style={{ flexShrink: 0, transform: showRecord ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} aria-hidden>
              <path d="M2 4L13 13L24 4" stroke="var(--mut)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {showRecord && (
            <div className="mt-8">
              <RecordRow label="Name" value={record?.full_name ?? '—'} />
              <RecordRow label="Member no." value={record?.coop_member_no ?? '—'} />
              <RecordRow label="Cluster" value={record?.cluster_name ?? '—'} />
              <RecordRow label="Cluster head" value={record?.cluster_head ?? '—'} />
              <RecordRow label="Deliveries recorded" value={String(record?.delivery_count ?? 0)} last />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RecordRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="row" style={{ padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className="muted text-base" >{label}</span>
      <span style={{ fontSize: 19, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ---------------- Settings: profile photo, username, change PIN ---------------- */
function Settings({ onBack }: { onBack: () => void }) {
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [err, setErr] = useState('');

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const pinProblem = weakPinReason(newPin);

  function onPhotoFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setPhotoUploading(true); setErr('');
      try {
        await farmerApi.updateProfile({ photoBase64: dataUrl.split(',')[1] ?? '', photoContentType: file.type || 'image/jpeg' });
      } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save that photo'); }
      finally { setPhotoUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  async function saveUsername() {
    setSavingUsername(true); setErr(''); setUsernameSaved(false);
    try {
      await farmerApi.updateProfile({ username });
      setUsernameSaved(true);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save that'); }
    finally { setSavingUsername(false); }
  }

  async function submitPinChange() {
    if (pinProblem) { setErr(pinProblem); return; }
    if (newPin !== newPinConfirm) { setErr("Your new PINs don't match — check both."); return; }
    setPinBusy(true); setErr(''); setPinSaved(false);
    try {
      await farmerApi.changePin(currentPin, newPin);
      setCurrentPin(''); setNewPin(''); setNewPinConfirm('');
      setPinSaved(true);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not change your PIN'); }
    finally { setPinBusy(false); }
  }

  return (
    <div className="screen">
      <button className="back mb-12" onClick={onBack} >← Back</button>
      <h1 className="h1">Settings</h1>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <div className="label mb-8" >Profile photo</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhotoFile(e.target.files?.[0] ?? null)} />
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'var(--g-tint)', flexShrink: 0, display: 'grid', placeItems: 'center', position: 'relative' }}>
            {photoPreview ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photoUploading ? 0.5 : 1 }} /> : <span className="muted tiny">Add</span>}
            {photoUploading && <span className="spin" style={{ position: 'absolute' }} />}
          </div>
          <span className="link-btn">Change photo</span>
        </label>
      </div>

      <div className="card">
        <div className="label mb-8" >Username</div>
        <div className="flex-gap-6">
          <input className="input flex-1"  placeholder="Pick a username"
            value={username} onChange={(e) => { setUsername(e.target.value); setUsernameSaved(false); }} />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '9px 16px' }}
            disabled={savingUsername || !username.trim()} onClick={saveUsername}>
            {savingUsername ? <span className="spin" /> : 'Save'}
          </button>
        </div>
        {usernameSaved && <p className="tiny" style={{ color: 'var(--g-dark)', marginTop: 6 }}>Saved.</p>}
      </div>

      <div className="card">
        <div className="label mb-8" >Change PIN</div>
        <div className="field">
          <label>Current PIN</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} type="password" placeholder="••••"
            value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div className="field">
          <label>New PIN</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} type="password" placeholder="••••"
            value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
          {pinProblem && newPin.length === 4 && <span className="hint hint-warn">{pinProblem}</span>}
        </div>
        <div className="field">
          <label>Confirm new PIN</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} type="password" placeholder="••••"
            value={newPinConfirm} onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ''))} />
          {newPinConfirm.length === 4 && newPinConfirm !== newPin && <span className="hint hint-warn">Doesn't match — check both.</span>}
        </div>
        <button className="btn btn-primary"
          disabled={pinBusy || currentPin.length !== 4 || newPin.length !== 4 || newPinConfirm !== newPin || !!pinProblem}
          onClick={submitPinChange}>
          {pinBusy ? <span className="spin" /> : 'Change PIN'}
        </button>
        {pinSaved && <p className="tiny" style={{ color: 'var(--g-dark)', marginTop: 6 }}>PIN changed.</p>}
      </div>
    </div>
  );
}

/* ---------------- Loan application ---------------- */
function Apply({ onBack, onApplied, onFixInSetup }: { onBack: () => void; onApplied: (id: string) => void; onFixInSetup: (step?: SetupStep) => void }) {
  const [score, setScore] = useState<ScoreInfo | null>(null);
  const [amount, setAmount] = useState(0);
  const [weeks, setWeeks] = useState(12);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loadScore = useCallback(() => {
    farmerApi.score().then((s) => {
      setScore(s);
      const max = s.credit_limit_cents ?? 0;
      setAmount((prev) => prev || Math.min(max, Math.max(100000, Math.round(max / 2 / 10000) * 10000)));
    }).catch(() => {});
  }, []);
  useEffect(() => { loadScore(); }, [loadScore]);

  // Uploading a missing ID photo right here, then re-checking readiness —
  // no need to send someone away from Apply to fix this elsewhere.
  type IdPhotoSide = { preview: string; uploading: boolean; uploaded: boolean };
  const [idFront, setIdFront] = useState<IdPhotoSide | null>(null);
  const [idBack, setIdBack] = useState<IdPhotoSide | null>(null);
  function uploadIdPhoto(side: 'front' | 'back', file: File | null) {
    if (!file) return;
    const setSide = side === 'front' ? setIdFront : setIdBack;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      setSide({ preview: dataUrl, uploading: true, uploaded: false });
      try {
        await farmerApi.saveIdPhoto(side, base64, file.type || 'image/jpeg');
        setSide({ preview: dataUrl, uploading: false, uploaded: true });
        loadScore(); // re-check readiness — this may unlock the apply form outright
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : `Could not save the ${side} photo`);
        setSide(null);
      }
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (amount <= 0) { setQuote(null); return; }
    let cancelled = false;
    farmerApi.quote(amount, weeks)
      .then((q) => { if (!cancelled) { setQuote(q); setErr(''); } })
      .catch((e) => {
        if (cancelled) return;
        setQuote(null);
        // This used to fail silently — the submit button just stayed disabled
        // forever with nothing telling the farmer (or anyone testing) why.
        setErr(e instanceof ApiError ? e.message : 'Could not calculate your quote. Try a different amount or term.');
      });
    return () => { cancelled = true; };
  }, [amount, weeks]);

  const limit = score?.credit_limit_cents ?? 0;

  async function submit() {
    setErr(''); setBusy(true);
    try {
      const res = await farmerApi.apply(amount, weeks, 'Farm inputs');
      onApplied(res.loanId);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not submit your application');
    } finally { setBusy(false); }
  }

  // Readiness gate: before showing the loan form, check the farmer can actually
  // borrow. If not, show a clear checklist of what's needed rather than a broken
  // slider or a raw error on submit.
  if (score && score.canBorrow === false) {
    const m = score.missing;
    const items = [
      {
        done: score.registrationComplete,
        label: 'Complete your registration',
        hint: m?.phone && m?.nationalId ? 'Your phone and ID number are both missing' : m?.phone ? 'Your phone number is missing' : m?.nationalId ? 'Your ID number is missing' : 'Your details are complete',
        fix: m?.nationalId ? (() => onFixInSetup('idConfirm')) : undefined,
      },
      {
        done: !!score.circleActive,
        label: 'Join an active Growth Chama',
        hint: m?.circle ? "You haven't formed or joined a chama yet" : m?.circleNotActive ? 'Your chama is waiting on other members to confirm' : 'Your chama is active',
        fix: () => onFixInSetup(), // resume() figures out the right circle step live
      },
      {
        done: !!score.hasLimit,
        label: 'Have a credit limit',
        hint: m?.limit ? 'Set by Grofunder as your record with your cooperative grows — nothing to do here yet' : 'You have a limit',
        fix: undefined,
      },
    ];
    return (
      <div className="screen screen-pad-top">
        <button className="back" onClick={onBack}>← Back</button>
        <h1 className="h1 mt-8" >Before you can borrow</h1>
        <p className="sub">A few things need to be in place first</p>
        {err && <div className="err">{err}</div>}
        <div className="stack">
          {items.map((it, i) => {
            const clickable = !it.done && !!it.fix;
            const Tag = clickable ? 'button' : 'div';
            return (
              <Tag key={i} className={`ready-item ${it.done ? 'ready-done' : ''}`}
                style={clickable ? { width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid var(--line)' } : undefined}
                onClick={clickable ? it.fix : undefined}>
                <span className="ready-check">{it.done ? '✓' : i + 1}</span>
                <div className="flex-1">
                  <div className="ready-label">{it.label}</div>
                  <div className="ready-hint">{it.hint}</div>
                </div>
                {clickable && <span className="muted" style={{ fontSize: 22 }}>›</span>}
              </Tag>
            );
          })}

          {/* ID photos — the one readiness item you can actually act on right
              here, instead of being sent away to fix it elsewhere. Uploading
              re-checks readiness immediately and can unlock the form outright. */}
          <div className={`ready-item ${score.hasIdPhotos ? 'ready-done' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="row" style={{ width: '100%' }}>
              <span className="ready-check">{score.hasIdPhotos ? '✓' : items.length + 1}</span>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div className="ready-label">Upload your ID photos</div>
                <div className="ready-hint">{score.hasIdPhotos ? 'Both photos received' : 'Front and back, right here'}</div>
              </div>
            </div>
            {!score.hasIdPhotos && (
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                {(['front', 'back'] as const).map((side) => {
                  const state = side === 'front' ? idFront : idBack;
                  const already = side === 'front' ? !m?.idPhotoFront : !m?.idPhotoBack;
                  return (
                    <label key={side} style={{ flex: 1, cursor: already ? 'default' : 'pointer' }}>
                      {!already && (
                        <input type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={(e) => uploadIdPhoto(side, e.target.files?.[0] ?? null)} />
                      )}
                      {state?.preview ? (
                        <div className="rel">
                          <img src={state.preview} alt={`ID ${side}`} style={{ width: '100%', borderRadius: 9, display: 'block', opacity: state.uploading ? 0.5 : 1 }} />
                          {state.uploading && <span className="spin spinner-center"  />}
                        </div>
                      ) : already ? (
                        <div style={{ border: '1px solid var(--g)', background: 'var(--g-tint)', borderRadius: 9, padding: '14px 8px', textAlign: 'center' }}>
                          <span className="tiny" style={{ color: 'var(--g-dark)', textTransform: 'capitalize' }}>{side} ✓</span>
                        </div>
                      ) : (
                        <div style={{ border: '1px dashed var(--line)', borderRadius: 9, padding: '14px 8px', textAlign: 'center' }}>
                          <div className="muted tiny" style={{ textTransform: 'capitalize' }}>{side}</div>
                          <div className="muted tiny mt-2" >Tap to add</div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-pad-top">
      <button className="back" onClick={onBack}>← Back</button>
      <h1 className="h1 mt-8" >Apply for a loan</h1>
      <p className="sub">How much would you like from Grofunder?</p>

      {err && <div className="err">{err}</div>}

      <div className="card center">
        <svg viewBox="0 0 200 110" width="140" height="77" aria-hidden="true" style={{ margin: '0 auto' }}>
          <ellipse cx="100" cy="100" rx="52" ry="7" fill="#D3D1C7" />
          <path d="M100 98 L100 32" stroke="#067A0B" strokeWidth="4" strokeLinecap="round" />
          <path d="M100 80 L76 66 M100 80 L124 66 M100 58 L80 46 M100 58 L120 46" stroke="#067A0B" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="72" cy="64" rx="12" ry="6" fill="#09AF0F" transform="rotate(-25 72 64)" />
          <ellipse cx="128" cy="64" rx="12" ry="6" fill="#09AF0F" transform="rotate(25 128 64)" />
          <ellipse cx="76" cy="43" rx="11" ry="5.5" fill="#09AF0F" transform="rotate(-30 76 43)" />
          <ellipse cx="124" cy="43" rx="11" ry="5.5" fill="#09AF0F" transform="rotate(30 124 43)" />
          <ellipse cx="100" cy="27" rx="10" ry="6" fill="#5DCAA5" />
          <circle cx="86" cy="60" r="4" fill="#E24B4A" /><circle cx="114" cy="58" r="4" fill="#E24B4A" /><circle cx="100" cy="40" r="4" fill="#E24B4A" />
        </svg>
        <p className="tiny muted mt-2" >Tree stage {score?.tree_stage ?? 1} of 5</p>
      </div>

      <div className="card">
        <div className="center" style={{ marginBottom: 4 }}>
          <div className="score-num" style={{ color: 'var(--g-dark)', fontSize: 38 }}>{kes(amount)}</div>
          <div className="tiny muted">your limit is {kes(limit)}</div>
        </div>
        <input className="slider" type="range" min={Math.min(100000, limit)} max={limit || 100000}
          step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>

      <div className="card">
        <div className="label mb-10" >Repayment term</div>
        <div className="pills">
          {[8, 12, 16].map((w) => (
            <button key={w} className={`pill ${weeks === w ? 'pill-active' : ''}`} onClick={() => setWeeks(w)}>
              <div className="wk">{w} wk</div>
              <div className="amt">
                {quote && weeks === w ? kes(quote.weeklyInstalmentCents) + '/wk' : '\u00a0'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {quote && (
        <div className="card">
          <SummaryRow label="You receive" value={kes(quote.principalCents)} />
          <SummaryRow label={`Interest (${(quote.ratePmBps / 100).toFixed(1)}%/mo × ${weeks / 4} months)`} value={kes(quote.totalInterestCents)} />
          <SummaryRow label="Weekly payment" value={kes(quote.weeklyInstalmentCents)} />
          <SummaryRow label="Total to repay" value={kes(quote.totalRepayableCents)} strong last />
        </div>
      )}

      <details className="accordion">
        <summary>What do I need to know before I apply? <span className="muted">＋</span></summary>
        <div className="body">
          You repay every Friday. Miss one and your chama is told, so you can support each other.
          After 7 days a 2% late fee applies, your cooperative is informed, and no one in your chama
          can borrow again until it's settled.
        </div>
      </details>

      <button className="btn btn-primary" disabled={busy || !quote} onClick={submit}>
        {busy ? <span className="spin" /> : 'Submit application'}
      </button>
    </div>
  );
}

function SummaryRow({ label, value, strong, last }: { label: string; value: string; strong?: boolean; last?: boolean }) {
  return (
    <div className="row" style={{ padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className="muted text-base" >{label}</span>
      <span style={{ fontSize: strong ? 16 : 14, fontWeight: strong ? 700 : 500, color: strong ? 'var(--g-dark)' : 'inherit' }}>{value}</span>
    </div>
  );
}

/* ---------------- Loan schedule / status ---------------- */
function Schedule({ loanId, onBack }: { loanId: string; onBack: () => void }) {
  const [status, setStatus] = useState('');
  const [instalments, setInstalments] = useState<Instalment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const loan = await farmerApi.loan(loanId);
        setStatus(loan.status);
        if (['ACTIVE', 'IN_ARREARS', 'CLOSED'].includes(loan.status)) {
          const s = await farmerApi.schedule(loanId);
          setInstalments(s.data);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [loanId]);

  if (loading) return <div className="screen center pt-80" ><span className="spin" /></div>;

  const statusText: Record<string, string> = {
    SUBMITTED: 'Sent to your cooperative for review',
    PENDING_RECORD_MATCH: 'On hold — a record needs checking',
    COOP_APPROVED: 'Approved by your cooperative · with Grofunder now',
    GF_APPROVED: 'Approved! Preparing your money',
    DISBURSING: 'Sending money to your M-Pesa',
    ACTIVE: 'Active — repay every Friday',
    IN_ARREARS: 'A payment is overdue',
    CLOSED: 'Fully repaid — hongera!',
  };

  return (
    <div className="screen screen-pad-top">
      <button className="back" onClick={onBack}>← Back</button>
      <h1 className="h1 mt-8" >Your loan</h1>
      <div className="ok mt-4" >{statusText[status] ?? status}</div>

      {instalments.length > 0 ? (
        <div className="card">
          <div className="label mb-10" >Repayment schedule</div>
          {instalments.filter((i) => i.seq_no < 1000).map((i) => (
            <div key={i.seq_no} className="row" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`leaf-node ${i.status === 'PAID' ? 'leaf-paid' : i.status === 'OVERDUE' ? 'leaf-next' : 'leaf-todo'}`}>
                  {i.status === 'PAID' ? '✓' : i.seq_no}
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 500 }}>Week {i.seq_no}</div>
                  <div className="tiny muted">{new Date(i.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
              <div className="center">
                <div style={{ fontSize: 19, fontWeight: 600 }}>{kes(i.amount_due_cents)}</div>
                <div className={`tiny ${i.status === 'PAID' ? '' : 'muted'}`} style={{ color: i.status === 'PAID' ? 'var(--g)' : undefined }}>
                  {i.status === 'PAID' ? 'paid' : i.status === 'OVERDUE' ? 'overdue' : 'due'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card center" style={{ padding: 24 }}>
          <Gro mood="encouraging" />
          <p className="muted" style={{ fontSize: 18.5, marginTop: 8 }}>
            We'll let you know as soon as it moves forward.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Messages ---------------- */
function Messages({ onRead, onBack }: { onRead: () => void; onBack: () => void }) {
  // Three views behind one tab: the landing choice, Gro's chat, and compose.
  const [view, setView] = useState<'home' | 'gro' | 'compose'>('home');
  // Which quick-ask bubble was tapped on the landing screen, if any — GroChat
  // auto-asks it immediately rather than making the farmer tap again.
  const [pendingAsk, setPendingAsk] = useState<string | undefined>(undefined);
  const [msgs, setMsgs] = useState<FarmerInboxMessage[]>([]);
  const [sent, setSent] = useState<FarmerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      farmerApi.inbox().then((r) => r.data).catch(() => [] as FarmerInboxMessage[]),
      farmerApi.farmerMessages().then((r) => r.data).catch(() => [] as FarmerMessage[]),
    ]).then(([inbox, mine]) => { setMsgs(inbox); setSent(mine); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function open(m: FarmerInboxMessage) {
    if (!m.readAt) {
      try { await farmerApi.markRead(m.id); setMsgs((prev) => prev.map((x) => x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x)); onRead(); }
      catch { /* ignore */ }
    }
  }

  async function markAll() {
    try { await farmerApi.markAllRead(); setMsgs((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() }))); onRead(); }
    catch { /* ignore */ }
  }

  if (view === 'gro') return <GroChat onBack={() => setView('home')} initialAskId={pendingAsk} />;
  if (view === 'compose') return <ComposeMessage onBack={() => { setView('home'); load(); }} />;

  const anyUnread = msgs.some((m) => !m.readAt);

  return (
    <div className="screen">
      <button className="back mb-12" onClick={onBack} >← Back</button>
      <div className="screen-head">
        <h1>Messages</h1>
        {anyUnread && <button className="link-btn" onClick={markAll}>Mark all read</button>}
      </div>

      <button className="card" onClick={() => { setPendingAsk(undefined); setView('gro'); }}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--g)', background: 'var(--g-tint2)' }}>
        <Gro mood="happy" />
        <div className="flex-1">
          <div style={{ fontWeight: 500, marginBottom: 2 }}>Chat with Gro</div>
          <div className="muted text-base" >Hi, I am Gro. Click hapa tuongee</div>
        </div>
        <span className="muted" aria-hidden style={{ fontSize: 26, lineHeight: 1 }}>›</span>
      </button>

      <div className="tick-wrap" style={{ marginBottom: 14 }}>
        {GRO_QUICK_ASKS.slice(0, 3).map((q) => (
          <button key={q.id} className="tick-chip" onClick={() => { setPendingAsk(q.id); setView('gro'); }}>
            {q.label}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" style={{ marginBottom: 18 }} onClick={() => setView('compose')}>
        Send messages to your community
      </button>

      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : msgs.length === 0 && sent.length === 0 ? (
        <div className="empty-note">No messages yet.</div>
      ) : (
        <div className="msg-list">
          {msgs.map((m) => (
            <button key={m.id} className={`msg-card ${m.readAt ? '' : 'unread'}`} onClick={() => open(m)}>
              <div className="msg-top">
                <span className={`msg-from ${m.senderType === 'GROFUNDER' ? 'from-gf' : 'from-coop'}`}>{m.senderName}</span>
                {!m.readAt && <span className="msg-dot" aria-label="unread" />}
              </div>
              <div className="msg-body">{m.body}</div>
              {m.sentAt && <div className="msg-time">{new Date(m.sentAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</div>}
            </button>
          ))}
          {sent.map((m) => (
            <div key={m.id} className="msg-card">
              <div className="msg-top">
                <span className="msg-from from-coop">{m.isMine ? `You → ${AUDIENCE_LABEL[m.audience]}` : m.senderName}</span>
              </div>
              <div className="msg-body">{m.body}</div>
              <div className="msg-time">{new Date(m.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const AUDIENCE_LABEL: Record<FarmerAudience, string> = {
  CIRCLE: 'My circle',
  CLUSTER: 'My cluster',
  COOPERATIVE: 'My cooperative',
  EVERYONE: 'Everyone',
  GROFUNDER_ADMIN: 'Grofunder',
};

/* ---------------- Gro chat (scripted, never AI) ---------------- */
function GroChat({ onBack, initialAskId }: { onBack: () => void; initialAskId?: string }) {
  type Line = { text: string; mine: boolean; receipt?: boolean };
  const [log, setLog] = useState<Line[]>([{ text: GRO_OPENING, mine: false }]);
  const [asked, setAsked] = useState<string[]>([]);
  const [text, setText] = useState('');

  function ask(q: typeof GRO_QUICK_ASKS[number]) {
    setAsked((a) => [...a, q.id]);
    setLog((l) => [...l, { text: q.label, mine: true }]);
    if (q.logs) farmerApi.logGroRequest(q.logs).catch(() => {});
    setTimeout(() => setLog((l) => [...l, { text: q.reply, mine: false, receipt: !!q.logs }]), 350);
  }

  // Tapped straight in from one of the suggestion bubbles on the Messages
  // landing screen — ask it immediately rather than making them tap again.
  useEffect(() => {
    if (!initialAskId) return;
    const q = GRO_QUICK_ASKS.find((x) => x.id === initialAskId);
    if (q) ask(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAskId]);

  function sendFree() {
    const t = text.trim();
    if (!t) return;
    setLog((l) => [...l, { text: t, mine: true }]);
    setText('');
    farmerApi.logGroRequest('other', t).catch(() => {});
    setTimeout(() => setLog((l) => [...l, { text: GRO_FREETEXT_REPLY, mine: false, receipt: true }]), 350);
  }

  const remaining = GRO_QUICK_ASKS.filter((q) => !asked.includes(q.id));

  return (
    <div className="screen">
      <button className="back" onClick={onBack}>← Back</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
        <Gro mood="happy" />
        <p style={{ fontSize: 19.5, fontWeight: 500 }}>Gro</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, minHeight: 110 }}>
        {log.map((l, i) => (
          <div key={i} style={{
            alignSelf: l.mine ? 'flex-end' : 'flex-start', maxWidth: '88%',
            background: l.mine ? 'var(--g)' : 'var(--g-tint2)',
            color: l.mine ? '#fff' : 'var(--ink)',
            border: l.mine ? 'none' : '1px solid var(--line)',
            borderRadius: l.mine ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
            padding: '9px 12px', fontSize: 18, lineHeight: 1.45,
          }}>
            {l.text}
            {l.receipt && <div className="tiny" style={{ marginTop: 5, opacity: 0.85 }}>✓ {GRO_RECEIPT}</div>}
          </div>
        ))}
      </div>

      {remaining.length > 0 && (
        <div className="tick-wrap mb-10" >
          {remaining.map((q) => (
            <button key={q.id} className="tick-chip" onClick={() => ask(q)}>{q.label}</button>
          ))}
        </div>
      )}

      <div className="flex-gap-6">
        <input className="input flex-1"  placeholder="Andika kitu kingine…"
          value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendFree(); }} />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '9px 16px' }}
          disabled={!text.trim()} onClick={sendFree}>Send</button>
      </div>
    </div>
  );
}

/* ---------------- Compose a farmer message ---------------- */
function ComposeMessage({ onBack }: { onBack: () => void }) {
  const [audience, setAudience] = useState<FarmerAudience>('CIRCLE');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function send() {
    setBusy(true); setErr('');
    try { await farmerApi.sendFarmerMessage(audience, body); onBack(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send'); }
    finally { setBusy(false); }
  }

  return (
    <div className="screen">
      <button className="back" onClick={onBack}>← Back</button>
      <h1 className="h1 mt-8" >New message</h1>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label>Send to</label>
        <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as FarmerAudience)}>
          {(Object.keys(AUDIENCE_LABEL) as FarmerAudience[]).map((a) => (
            <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Message</label>
        <textarea className="input" rows={5} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Andika ujumbe wako…" />
      </div>
      <button className="btn btn-primary" disabled={busy || !body.trim()} onClick={send}>
        {busy ? <span className="spin" /> : 'Send'}
      </button>
    </div>
  );
}

/* ---------------- My records (capture, read-only) ---------------- */
function Records({ onBack }: { onBack: () => void }) {
  const [recs, setRecs] = useState<CaptureRecord[]>([]);
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [flagDetails, setFlagDetails] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [flagBusy, setFlagBusy] = useState(false);

  useEffect(() => {
    Promise.all([farmerApi.myRecords(), farmerApi.deliverySummary()])
      .then(([r, s]) => { setRecs(r.data); setSummary(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function submitFlag() {
    setFlagBusy(true);
    try {
      await farmerApi.raiseDiscrepancy('records', flagDetails.trim() || undefined);
      setFlagged(true); setShowFlag(false);
    } catch { /* keep the form open on failure */ }
    finally { setFlagBusy(false); }
  }

  const fmt = (rec: CaptureRecord, units: number) => {
    const major = units / (rec.unit === 'kg' ? 1000 : 100);
    return rec.unit === 'kg'
      ? `${major.toLocaleString()} kg`
      : `KES ${major.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const [showTotals, setShowTotals] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  return (
    <div className="screen">
      <button className="back mb-8" onClick={onBack} >← Back</button>
      <div className="topbar"><span className="brand"><img src={logo} alt="grofunder" /></span></div>
      <h1 className="h1 mt-8" >My records</h1>
      <p className="sub">What your cooperative has recorded for you</p>

      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : (
        <>
          {summary && summary.totalDeliveries > 0 && (
            <div className="card">
              <div className="label mb-8" >Your last delivery</div>
              <table style={{ width: '100%', fontSize: 18 }}><tbody>
                <tr><td className="muted row-pad-4" >Last produce quantity</td><td className="text-right">{summary.lastDelivery?.quantityKg.toLocaleString()} kg {summary.lastDelivery?.product}</td></tr>
                <tr><td className="muted row-pad-4" >Last produce date</td><td className="text-right">{summary.lastDelivery && new Date(summary.lastDelivery.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>
                <tr><td className="muted row-pad-4" >Last produce amount</td><td className="text-right">{summary.lastDelivery && kes(summary.lastDelivery.earningsCents)}</td></tr>
                <tr><td className="muted row-pad-4" >Next produce date</td><td className="text-right">{summary.nextExpectedDate ? new Date(summary.nextExpectedDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td></tr>
              </tbody></table>
              {summary.nextExpectedDate && (
                <p className="tiny muted mt-4" >Estimated from your own delivery pattern — not confirmed by your cooperative.</p>
              )}

              {flagged ? (
                <div className="ok" style={{ marginTop: 10, fontSize: 17 }}>
                  Sent to your cooperative to fix. Please note that your input will not override the input from your cooperative.
                </div>
              ) : confirmed ? (
                <div className="ok" style={{ marginTop: 10, fontSize: 17 }}>Thanks — confirmed.</div>
              ) : showFlag ? (
                <div style={{ marginTop: 10 }}>
                  <p className="tiny muted mb-6" >What looks wrong? You can tell us what you think is correct.</p>
                  <textarea className="input" rows={3} placeholder="What's not right? (optional)"
                    value={flagDetails} onChange={(e) => setFlagDetails(e.target.value)} />
                  <p className="tiny muted mt-6" >Please note that your input will not override the input from your cooperative.</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: 18 }} onClick={() => setShowFlag(false)}>Cancel</button>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: 18, padding: 8 }} disabled={flagBusy} onClick={submitFlag}>
                      {flagBusy ? <span className="spin" /> : 'Send'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 18 }} onClick={() => setConfirmed(true)}>Yes, that's correct</button>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: 18 }} onClick={() => setShowFlag(true)}>Something is wrong</button>
                </div>
              )}
            </div>
          )}

          {summary && summary.totalDeliveries > 0 && (
            <button className="btn btn-ghost" style={{ width: '100%', marginBottom: showTotals ? 0 : 12 }} onClick={() => setShowTotals((s) => !s)}>
              {showTotals ? 'Hide all records' : 'See All records'}
            </button>
          )}
          {showTotals && summary && (
            <div className="card mb-12" >
              <table style={{ width: '100%', fontSize: 18 }}><tbody>
                <tr><td className="muted row-pad-4" >Total deliveries to cooperative</td><td className="text-right">{summary.totalDeliveries}</td></tr>
                <tr><td className="muted row-pad-4" >Total amount received from cooperative</td><td className="text-right">{kes(summary.netReceivedCents)}</td></tr>
                <tr><td className="muted row-pad-4" >Total kg produced so far</td><td className="text-right">{summary.totalKg.toLocaleString()} kg</td></tr>
                <tr><td className="muted row-pad-4" >Average quantity per week</td><td className="text-right">{summary.avgKgPerWeek.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg</td></tr>
                <tr><td className="muted row-pad-4" >Average income per week</td><td className="text-right">{kes(Math.round(summary.avgEarningsCentsPerWeek))}</td></tr>
              </tbody></table>
              <p className="tiny muted mt-6" >Amount received is earnings after any deductions. Averages are calculated across your full delivery history.</p>
            </div>
          )}

          <button className="btn btn-ghost" style={{ width: '100%', marginBottom: showPrevious ? 12 : 4 }} onClick={() => setShowPrevious((s) => !s)}>
            {showPrevious ? 'Hide previous records' : 'See your previous records'}
          </button>

          {showPrevious && (
            recs.length === 0 ? (
              <div className="empty-note">No records yet. Your cooperative adds these.</div>
            ) : (
              <div className="stack">
                {recs.map((rec) => (
                  <div key={rec.type} className="card">
                    <div className="rec-head">
                      <span className="rec-title">{rec.label}</span>
                      <span className="rec-total">{fmt(rec, rec.total_units)}</span>
                    </div>
                    {rec.entries.length === 0 ? (
                      <p className="muted" style={{ fontSize: 18.5, marginTop: 8 }}>No entries yet.</p>
                    ) : (
                      <div className="rec-entries">
                        {rec.entries.map((e) => (
                          <div key={e.id} className="rec-row">
                            <span className="rec-date">{new Date(e.entry_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className="rec-amt">{fmt(rec, e.amount_units)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <p className="muted" style={{ fontSize: 17.5, textAlign: 'center', marginTop: 4 }}>
                  Kept by your cooperative. Something wrong? Talk to them.
                </p>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Community feed + image sharing ---------------- */
function Community({ onBack }: { onBack: () => void }) {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    farmerApi.feed().then((r) => setFeed(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    try { await farmerApi.deletePost(id); setFeed((f) => f.filter((p) => p.id !== id)); } catch { /* ignore */ }
  }

  if (composing) return <Compose onDone={() => { setComposing(false); load(); }} onCancel={() => setComposing(false)} />;

  return (
    <div className="screen">
      <button className="back mb-8" onClick={onBack} >← Back</button>
      <div className="topbar">
        <span className="brand"><img src={logo} alt="grofunder" /></span>
        <button className="btn-share" onClick={() => setComposing(true)}>+ Share</button>
      </div>
      <h1 className="h1 mt-4" >Community</h1>
      <p className="sub">Photos from your cluster, circle and cooperative</p>
      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : feed.length === 0 ? (
        <div className="empty-note">Nothing shared yet. Tap “+ Share” to post the first photo.</div>
      ) : (
        <div className="feed">
          {feed.map((p) => (
            <div key={p.id} className="post">
              <div className="post-head">
                <span className="post-author">{p.is_mine ? 'You' : p.author_name}</span>
                <div className="post-aud">{p.audience.map((a) => <span key={a} className="aud-chip">{a}</span>)}</div>
              </div>
              <div className="post-img">
                {p.image_url.startsWith('mock://')
                  ? <div className="post-img-mock"><Icon name="community" /><span>Photo</span></div>
                  : <img src={p.image_url} alt={p.caption ?? 'shared photo'} />}
              </div>
              {p.caption && <div className="post-caption">{p.caption}</div>}
              <div className="post-foot">
                <span className="post-time">
                  {new Date(p.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  {p.website_status === 'PENDING' && <span className="web-chip web-pending">Website: awaiting review</span>}
                  {p.website_status === 'APPROVED' && <span className="web-chip web-approved">On the website</span>}
                  {p.website_status === 'REJECTED' && <span className="web-chip web-rejected">Not published</span>}
                </span>
                {p.is_mine && <button className="post-del" onClick={() => remove(p.id)}>Remove</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Compose({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [imageBase64, setImageBase64] = useState('');
  const [contentType, setContentType] = useState('image/jpeg');
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [toCluster, setToCluster] = useState(false);
  const [toCircle, setToCircle] = useState(false);
  const [toCooperative, setToCooperative] = useState(false);
  const [toWebsite, setToWebsite] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  function onFile(file: File | null) {
    if (!file) return;
    setContentType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1] ?? '');
    };
    reader.readAsDataURL(file);
  }

  async function share() {
    setErr('');
    if (!imageBase64) { setErr('Add a photo first.'); return; }
    if (!toCluster && !toCircle && !toCooperative && !toWebsite) { setErr('Choose at least one place to share.'); return; }
    setBusy(true);
    try {
      await farmerApi.createPost({ imageBase64, contentType, caption: caption.trim() || undefined, toCluster, toCircle, toCooperative, toWebsite });
      onDone();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not share'); }
    finally { setBusy(false); }
  }

  return (
    <div className="screen screen-pad-top">
      <button className="back" onClick={onCancel}>← Back</button>
      <h1 className="h1 mt-8" >Share a photo</h1>
      <p className="sub">Circle meetups, farm activities — show your community</p>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <label className="photo-drop">
          {preview ? <img src={preview} alt="preview" className="photo-preview" /> : (
            <div className="photo-empty"><Icon name="community" /><span>Tap to add a photo</span></div>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className="card">
        <div className="label mb-8" >Caption</div>
        <textarea className="input" rows={3} maxLength={600} value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this photo…" />
      </div>

      <div className="card">
        <div className="label mb-10" >Share with</div>
        <label className="share-opt"><input type="checkbox" checked={toCluster} onChange={(e) => setToCluster(e.target.checked)} /> My cluster</label>
        <label className="share-opt"><input type="checkbox" checked={toCircle} onChange={(e) => setToCircle(e.target.checked)} /> My circle</label>
        <label className="share-opt"><input type="checkbox" checked={toCooperative} onChange={(e) => setToCooperative(e.target.checked)} /> Whole cooperative</label>
      </div>

      <div className="card">
        <div className="label mb-6" >Grofunder website</div>
        <p className="muted" style={{ fontSize: 18, marginBottom: 10 }}>
          Offer this photo for the Grofunder website. Reviewed before publishing.
        </p>
        <label className="share-opt"><input type="checkbox" checked={toWebsite} onChange={(e) => setToWebsite(e.target.checked)} /> Send to Grofunder for the website</label>
      </div>

      <button className="btn btn-primary" disabled={busy} onClick={share}>{busy ? <span className="spin" /> : 'Share'}</button>
    </div>
  );
}
