import { useState, useEffect, useCallback } from 'react';
import { farmerApi, setToken, getToken, kes, ApiError } from './api';
import type { ScoreInfo, FarmerRecord, Quote, Instalment } from './api';
import { Gro } from './Gro';

type Screen = 'signin' | 'home' | 'apply' | 'schedule';

export default function App() {
  const [screen, setScreen] = useState<Screen>(getToken() ? 'home' : 'signin');
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  return (
    <div className="app">
      {screen === 'signin' && <SignIn onDone={() => setScreen('home')} />}
      {screen === 'home' && (
        <Home
          onApply={() => setScreen('apply')}
          onSignOut={() => { setToken(null); setScreen('signin'); }}
        />
      )}
      {screen === 'apply' && (
        <Apply onBack={() => setScreen('home')} onApplied={(id) => { setActiveLoanId(id); setScreen('schedule'); }} />
      )}
      {screen === 'schedule' && activeLoanId && (
        <Schedule loanId={activeLoanId} onBack={() => setScreen('home')} />
      )}
      {screen !== 'signin' && (
        <nav className="tabbar">
          <button className={`tab ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
            <span className="dot">🌱</span>Home
          </button>
          <button className={`tab ${screen === 'apply' ? 'active' : ''}`} onClick={() => setScreen('apply')}>
            <span className="dot">💧</span>Loan
          </button>
          <button className="tab" onClick={() => { setToken(null); setScreen('signin'); }}>
            <span className="dot">↩</span>Sign out
          </button>
        </nav>
      )}
    </div>
  );
}

/* ---------------- Sign in / register ---------------- */
function SignIn({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    try {
      if (mode === 'register') {
        await farmerApi.register(phone, pin, memberNo || undefined);
      }
      const { token } = await farmerApi.login(phone, pin);
      setToken(token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen screen-pad-top">
      <div className="center" style={{ marginBottom: 24 }}>
        <div className="brand" style={{ fontSize: 30 }}>grofunder <span className="leaf">🌿</span></div>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Twende tukue pamoja</p>
      </div>

      <div className="gro-hero" style={{ marginBottom: 20 }}>
        <div className="gro-scene">
          <Gro mood="encouraging" />
          <div className="gro-msg">
            {mode === 'signin'
              ? 'Karibu tena! Enter your phone and PIN to continue.'
              : 'Karibu! Let\u2019s set up your account with the phone your cooperative registered.'}
          </div>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="field">
        <label>Phone number</label>
        <input className="input" inputMode="tel" placeholder="+2547…" value={phone}
          onChange={(e) => setPhone(e.target.value)} />
      </div>
      {mode === 'register' && (
        <div className="field">
          <label>Member number <span className="muted">(optional)</span></label>
          <input className="input" placeholder="e.g. ORD-001" value={memberNo}
            onChange={(e) => setMemberNo(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>{mode === 'register' ? 'Choose a 4-digit PIN' : 'PIN'}</label>
        <input className="input pin-input" inputMode="numeric" maxLength={4} placeholder="••••"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
      </div>

      <button className="btn btn-primary" disabled={busy || phone.length < 7 || pin.length !== 4} onClick={submit}>
        {busy ? <span className="spin" /> : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>

      <p className="center muted" style={{ fontSize: 13, marginTop: 16 }}>
        {mode === 'signin' ? 'New to Grofunder? ' : 'Already registered? '}
        <button className="back" style={{ color: 'var(--g)', fontWeight: 600, fontSize: 13 }}
          onClick={() => { setErr(''); setMode(mode === 'signin' ? 'register' : 'signin'); }}>
          {mode === 'signin' ? 'Register' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}

/* ---------------- Home / dashboard ---------------- */
function Home({ onApply, onSignOut }: {
  onApply: () => void; onSignOut: () => void;
}) {
  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [score, setScore] = useState<ScoreInfo | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [r, s] = await Promise.all([farmerApi.records(), farmerApi.score()]);
      setRecord(r); setScore(s);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { onSignOut(); return; }
      setErr(e instanceof ApiError ? e.message : 'Could not load your dashboard');
    } finally { setLoading(false); }
  }, [onSignOut]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="screen center" style={{ paddingTop: 80 }}><span className="spin" /></div>;

  const isNew = score?.credit_score == null;
  const firstName = record?.full_name?.split(' ')[0] ?? 'rafiki';

  return (
    <>
      <div className="topbar">
        <span className="brand">grofunder <span className="leaf">🌿</span></span>
        <span className="chip">{record?.cluster_name ?? '—'}</span>
      </div>
      <div className="screen" style={{ paddingTop: 4 }}>
        {err && <div className="err">{err}</div>}

        <div className="gro-hero">
          <div className="gro-scene">
            <Gro mood={isNew ? 'encouraging' : 'happy'} />
            <div>
              <h2>Habari, {firstName}!</h2>
              <p>{isNew ? 'Your seed is planted. Let\u2019s grow.' : 'Twende tukue pamoja 🌱'}</p>
            </div>
          </div>
        </div>

        {/* score card */}
        <div className="card card-green" style={{ marginTop: 12 }}>
          <div className="row">
            <div>
              <div className="label label-light">Credit score</div>
              <div className="score-num">{isNew ? '—' : score?.credit_score}</div>
              <div className="tiny label-light" style={{ marginTop: 2 }}>
                {isNew ? 'grows with your first loan' : 'growing well'}
              </div>
            </div>
            <div className="center">
              <div className="label label-light">Your limit</div>
              <div className="limit-num">{kes(score?.credit_limit_cents)}</div>
              <div className="tiny label-light" style={{ marginTop: 2 }}>tree stage {score?.tree_stage ?? 1} of 5</div>
            </div>
          </div>
        </div>

        {isNew ? (
          <div className="card">
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Your seed is planted <span style={{ color: 'var(--g)' }}>🌱</span>
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              Once your Growth Circle is active, your first loan of up to {kes(500000)} opens up. Repay well and your limit grows.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="row" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Your growth</span>
              <span className="tiny muted">tree stage {score?.tree_stage}/5</span>
            </div>
            <div className="vine">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`leaf-node ${n <= (score?.tree_stage ?? 1) ? 'leaf-paid' : n === (score?.tree_stage ?? 1) + 1 ? 'leaf-next' : 'leaf-todo'}`}>
                  {n <= (score?.tree_stage ?? 1) ? '🌿' : '·'}
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-primary" style={{ marginTop: 4 }}
          disabled={isNew}
          onClick={onApply}>
          {isNew ? 'Apply · unlocks with your circle' : 'Apply for a loan'}
        </button>

        {/* record confirmation summary */}
        <div className="card" style={{ marginTop: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>Your cooperative record</div>
          <RecordRow label="Name" value={record?.full_name ?? '—'} />
          <RecordRow label="Member no." value={record?.coop_member_no ?? '—'} />
          <RecordRow label="Cluster" value={record?.cluster_name ?? '—'} />
          <RecordRow label="Cluster head" value={record?.cluster_head ?? '—'} />
          <RecordRow label="Deliveries recorded" value={String(record?.delivery_count ?? 0)} last />
        </div>
      </div>
    </>
  );
}

function RecordRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className="row" style={{ padding: '8px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ---------------- Loan application ---------------- */
function Apply({ onBack, onApplied }: { onBack: () => void; onApplied: (id: string) => void }) {
  const [score, setScore] = useState<ScoreInfo | null>(null);
  const [amount, setAmount] = useState(0);
  const [weeks, setWeeks] = useState(12);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    farmerApi.score().then((s) => {
      setScore(s);
      const max = s.credit_limit_cents ?? 0;
      setAmount(Math.min(max, Math.max(100000, Math.round(max / 2 / 10000) * 10000)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (amount <= 0) { setQuote(null); return; }
    let cancelled = false;
    farmerApi.quote(amount, weeks)
      .then((q) => { if (!cancelled) setQuote(q); })
      .catch(() => { if (!cancelled) setQuote(null); });
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

  return (
    <div className="screen screen-pad-top">
      <button className="back" onClick={onBack}>← Back</button>
      <h1 className="h1" style={{ marginTop: 8 }}>Apply for a loan</h1>
      <p className="sub">How much would you like from Grofunder?</p>

      {err && <div className="err">{err}</div>}

      <div className="card">
        <div className="center" style={{ marginBottom: 4 }}>
          <div className="score-num" style={{ color: 'var(--g-dark)', fontSize: 34 }}>{kes(amount)}</div>
          <div className="tiny muted">your limit is {kes(limit)}</div>
        </div>
        <input className="slider" type="range" min={Math.min(100000, limit)} max={limit || 100000}
          step={10000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 10 }}>Repayment term</div>
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
          <SummaryRow label={`Interest (4.5%/mo × ${weeks / 4} months)`} value={kes(quote.totalInterestCents)} />
          <SummaryRow label="Weekly payment" value={kes(quote.weeklyInstalmentCents)} />
          <SummaryRow label="Total to repay" value={kes(quote.totalRepayableCents)} strong last />
        </div>
      )}

      <details className="accordion">
        <summary>What do I need to know before I apply? <span className="muted">＋</span></summary>
        <div className="body">
          You repay every Friday. If a payment is missed, your Growth Circle is notified so you can support
          each other. After 7 days a 2% late fee applies and your cooperative is informed. Your circle can\u2019t
          take new loans until the balance is settled — so pay first when the money lands.
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
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
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

  if (loading) return <div className="screen center" style={{ paddingTop: 80 }}><span className="spin" /></div>;

  const statusText: Record<string, string> = {
    SUBMITTED: 'Sent to your cooperative for review',
    PENDING_RECORD_MATCH: 'On hold — a record needs checking',
    COOP_APPROVED: 'Approved by your cooperative · with Grofunder now',
    GF_APPROVED: 'Approved! Preparing your money',
    DISBURSING: 'Sending money to your M-Pesa',
    ACTIVE: 'Active — repay every Friday',
    IN_ARREARS: 'A payment is overdue',
    CLOSED: 'Fully repaid — hongera! 🎉',
  };

  return (
    <div className="screen screen-pad-top">
      <button className="back" onClick={onBack}>← Back</button>
      <h1 className="h1" style={{ marginTop: 8 }}>Your loan</h1>
      <div className="ok" style={{ marginTop: 4 }}>{statusText[status] ?? status}</div>

      {instalments.length > 0 ? (
        <div className="card">
          <div className="label" style={{ marginBottom: 10 }}>Repayment schedule</div>
          {instalments.filter((i) => i.seq_no < 1000).map((i) => (
            <div key={i.seq_no} className="row" style={{ padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`leaf-node ${i.status === 'PAID' ? 'leaf-paid' : i.status === 'OVERDUE' ? 'leaf-next' : 'leaf-todo'}`}>
                  {i.status === 'PAID' ? '✓' : i.seq_no}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>Week {i.seq_no}</div>
                  <div className="tiny muted">{new Date(i.due_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
              <div className="center">
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{kes(i.amount_due_cents)}</div>
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
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            We\u2019ll let you know as soon as your application moves forward. Gro will keep you posted.
          </p>
        </div>
      )}
    </div>
  );
}
