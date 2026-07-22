import { useState, useEffect, useCallback } from 'react';
import { farmerApi, setToken, getToken, kes, ApiError } from './api';
import type { ScoreInfo, FarmerRecord, Quote, Instalment, FarmerInboxMessage, CaptureRecord, FeedPost } from './api';
import { Gro } from './Gro';
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
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[name] ?? null}
    </svg>
  );
}

type Screen = 'signin' | 'home' | 'apply' | 'schedule' | 'messages' | 'records' | 'community';

export default function App() {
  const [screen, setScreen] = useState<Screen>(getToken() ? 'home' : 'signin');
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!getToken()) return;
    farmerApi.inboxUnread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 60000);
    return () => clearInterval(t);
  }, [refreshUnread, screen]);

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
      {screen === 'messages' && <Messages onRead={refreshUnread} />}
      {screen === 'records' && <Records />}
      {screen === 'community' && <Community />}
      {screen !== 'signin' && (
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
        <div className="brand brand-lg"><img src={logo} alt="grofunder" /></div>
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
        <span className="brand"><img src={logo} alt="grofunder" /></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="chip">{record?.cluster_name ?? '—'}</span>
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
              <p>{isNew ? 'Your seed is planted. Let\u2019s grow.' : 'Twende tukue pamoja'}</p>
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
              Your seed is planted
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
                  {n <= (score?.tree_stage ?? 1) ? '●' : '·'}
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

  // Readiness gate: before showing the loan form, check the farmer can actually
  // borrow. If not, show a clear checklist of what's needed rather than a broken
  // slider or a raw error on submit.
  if (score && score.canBorrow === false) {
    const m = score.missing;
    const items = [
      { done: score.registrationComplete, label: 'Complete your registration', hint: m?.phone && m?.nationalId ? 'Your phone and ID are needed' : m?.phone ? 'Your phone number is needed' : m?.nationalId ? 'Your ID number is needed' : 'Your details are complete', ask: 'Ask your cooperative to add your phone and ID.' },
      { done: !!score.circleActive, label: 'Join an active Growth Circle', hint: m?.circle ? 'You are not in a circle yet' : m?.circleNotActive ? 'Your circle is not active yet' : 'Your circle is active', ask: 'Form or join a circle with farmers you trust, then activate it together.' },
      { done: !!score.hasLimit, label: 'Have a credit limit', hint: m?.limit ? 'Grofunder sets this once you are established' : 'You have a limit', ask: 'This is set by Grofunder — keep building your record.' },
    ];
    return (
      <div className="screen screen-pad-top">
        <button className="back" onClick={onBack}>← Back</button>
        <h1 className="h1" style={{ marginTop: 8 }}>Before you can borrow</h1>
        <p className="sub">A few things need to be in place first</p>
        <div className="stack">
          {items.map((it, i) => (
            <div key={i} className={`ready-item ${it.done ? 'ready-done' : ''}`}>
              <span className="ready-check">{it.done ? '✓' : i + 1}</span>
              <div>
                <div className="ready-label">{it.label}</div>
                <div className="ready-hint">{it.done ? it.hint : it.ask}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 18 }}>
          Once these are ready, come back here to apply.
        </p>
      </div>
    );
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
    CLOSED: 'Fully repaid — hongera!',
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

/* ---------------- Messages ---------------- */
function Messages({ onRead }: { onRead: () => void }) {
  const [msgs, setMsgs] = useState<FarmerInboxMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    farmerApi.inbox().then((r) => setMsgs(r.data)).catch(() => {}).finally(() => setLoading(false));
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

  const anyUnread = msgs.some((m) => !m.readAt);

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Messages</h1>
        {anyUnread && <button className="link-btn" onClick={markAll}>Mark all read</button>}
      </div>
      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : msgs.length === 0 ? (
        <div className="empty-note">No messages yet. Notices from your cooperative and Grofunder will appear here.</div>
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
        </div>
      )}
    </div>
  );
}

/* ---------------- My records (capture, read-only) ---------------- */
function Records() {
  const [recs, setRecs] = useState<CaptureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmerApi.myRecords().then((r) => setRecs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmt = (rec: CaptureRecord, units: number) => {
    const major = units / (rec.unit === 'kg' ? 1000 : 100);
    return rec.unit === 'kg'
      ? `${major.toLocaleString()} kg`
      : `KES ${major.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="screen">
      <div className="topbar"><span className="brand"><img src={logo} alt="grofunder" /></span></div>
      <h1 className="h1" style={{ marginTop: 8 }}>My records</h1>
      <p className="sub">What your cooperative has recorded for you</p>
      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : recs.length === 0 ? (
        <div className="empty-note">Your cooperative hasn't set up records yet. When they do, your produce and shares will show here.</div>
      ) : (
        <div className="stack">
          {recs.map((rec) => (
            <div key={rec.type} className="card">
              <div className="rec-head">
                <span className="rec-title">{rec.label}</span>
                <span className="rec-total">{fmt(rec, rec.total_units)}</span>
              </div>
              {rec.entries.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>No entries yet.</p>
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
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}>
            These records are kept by your cooperative. If something looks wrong, talk to them.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Community feed + image sharing ---------------- */
function Community() {
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
      <div className="topbar">
        <span className="brand"><img src={logo} alt="grofunder" /></span>
        <button className="btn-share" onClick={() => setComposing(true)}>+ Share</button>
      </div>
      <h1 className="h1" style={{ marginTop: 4 }}>Community</h1>
      <p className="sub">Photos from your cluster, circle and cooperative</p>
      {loading ? (
        <div className="loading"><span className="spin" /></div>
      ) : feed.length === 0 ? (
        <div className="empty-note">Nothing shared yet. Be the first — tap “+ Share” to post a photo from a circle meetup or your farm.</div>
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
      <h1 className="h1" style={{ marginTop: 8 }}>Share a photo</h1>
      <p className="sub">Circle meetups, farm activities — show your community</p>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <label className="photo-drop">
          {preview ? <img src={preview} alt="preview" className="photo-preview" /> : (
            <div className="photo-empty"><Icon name="community" /><span>Tap to add a photo</span></div>
          )}
          <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 8 }}>Caption</div>
        <textarea className="input" rows={3} maxLength={600} value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="Say something about this photo…" />
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 10 }}>Share with</div>
        <label className="share-opt"><input type="checkbox" checked={toCluster} onChange={(e) => setToCluster(e.target.checked)} /> My cluster</label>
        <label className="share-opt"><input type="checkbox" checked={toCircle} onChange={(e) => setToCircle(e.target.checked)} /> My circle</label>
        <label className="share-opt"><input type="checkbox" checked={toCooperative} onChange={(e) => setToCooperative(e.target.checked)} /> Whole cooperative</label>
      </div>

      <div className="card">
        <div className="label" style={{ marginBottom: 6 }}>Grofunder website</div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          You can offer this photo for the public Grofunder website. Grofunder will review it first and decide whether to publish.
        </p>
        <label className="share-opt"><input type="checkbox" checked={toWebsite} onChange={(e) => setToWebsite(e.target.checked)} /> Send to Grofunder for the website</label>
      </div>

      <button className="btn btn-primary" disabled={busy} onClick={share}>{busy ? <span className="spin" /> : 'Share'}</button>
    </div>
  );
}
