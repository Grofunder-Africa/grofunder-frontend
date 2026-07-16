import { useState, useEffect, useCallback } from 'react';
import { adminApi, setToken, getToken, kes, ApiError } from './api';
import type { Cooperative, Rules, Weights, ReconRow, Exception, Loan, LoanFlow } from './api';

type Tab = 'overview' | 'cooperatives' | 'loans' | 'credit' | 'reconciliation';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return <Portal onSignOut={() => { setToken(null); setAuthed(false); }} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit() {
    setErr(''); setBusy(true);
    try { const { token } = await adminApi.login(email, password); setToken(token); onDone(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Something went wrong'); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">grofunder <span className="dot">🌿</span></div>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 22 }}>Admin Console</p>
        {err && <div className="err">{err}</div>}
        <div className="field"><label>Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@grofunder.co.ke" onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
        <div className="field"><label>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && submit()} /></div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={submit}>
          {busy ? <span className="spin" /> : 'Sign in'}</button>
      </div>
    </div>
  );
}

function Portal({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const nav: [Tab, string, string][] = [
    ['overview', '◈', 'Overview'],
    ['cooperatives', '🏦', 'Cooperatives'],
    ['loans', '💵', 'Loans'],
    ['credit', '⚖', 'Credit model'],
    ['reconciliation', '🔗', 'Reconciliation'],
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">grofunder <span className="dot">🌿</span></div>
        <nav className="nav">
          {nav.map(([t, ico, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              <span className="ico">{ico}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">Grofunder admin</div>
          <button className="btn-signout" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {tab === 'overview' && <Overview onGo={setTab} />}
        {tab === 'cooperatives' && <Cooperatives />}
        {tab === 'loans' && <Loans />}
        {tab === 'credit' && <CreditModel />}
        {tab === 'reconciliation' && <Reconciliation />}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */
function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const [coops, setCoops] = useState<Cooperative[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.listCoops(), adminApi.rules(), adminApi.reconExceptions()])
      .then(([c, r, e]) => { setCoops(c.data); setRules(r); setExceptions(e.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spin" /></div>;
  const active = coops.filter((c) => c.status === 'ACTIVE').length;

  return (
    <>
      <div className="hero">
        <h1>Karibu, Grofunder 🌱</h1>
        <p>Your lending network at a glance — cooperatives, the credit model, and the books.</p>
      </div>
      <div className="stat-grid">
        <div className="stat stat-green"><span className="em">🏦</span><div className="n">{coops.length}</div><div className="l">Cooperatives</div></div>
        <div className="stat stat-blue"><span className="em">✓</span><div className="n">{active}</div><div className="l">Active</div></div>
        <div className="stat stat-purple"><span className="em">⚖</span><div className="n">v{rules?.version ?? '—'}</div><div className="l">Credit model</div></div>
        <div className="stat stat-amber"><span className="em">🔗</span><div className="n">{exceptions.length}</div><div className="l">Open exceptions</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Quick actions</h3></div>
        <div className="card-body">
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => onGo('cooperatives')}>Onboard a cooperative</button>
            <button className="btn btn-ghost" onClick={() => onGo('credit')}>Tune the credit model</button>
            <button className="btn btn-ghost" onClick={() => onGo('reconciliation')}>Review the books</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Cooperatives ---------- */
function Cooperatives() {
  const [coops, setCoops] = useState<Cooperative[]>([]);
  const [name, setName] = useState(''); const [county, setCounty] = useState('');
  const [newCode, setNewCode] = useState<{ name: string; code: string } | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi.listCoops().then((c) => setCoops(c.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function onboard() {
    setErr(''); setBusy(true);
    try {
      const res = await adminApi.onboardCoop(name.trim(), county.trim() || undefined);
      setNewCode({ name: name.trim(), code: res.activationCode });
      setName(''); setCounty(''); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not onboard'); }
    finally { setBusy(false); }
  }

  async function remove(id: string, coopName: string) {
    if (!confirm(`Delete "${coopName}"? It will be removed from your dashboard but kept on record (traceable). Only non-active entries can be deleted.`)) return;
    setErr('');
    try { await adminApi.deleteCoop(id, 'removed from admin dashboard'); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not delete'); }
  }

  return (
    <>
      <div className="page-head"><div className="h1">Cooperatives</div><div className="sub">Onboard cooperatives and issue their activation codes</div></div>
      {err && <div className="err">{err}</div>}
      {newCode && (
        <div className="ok" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>{newCode.name}</strong> onboarded. Share this one-time activation code: <span className="code">{newCode.code}</span></span>
          <button className="btn btn-ghost btn-sm" onClick={() => setNewCode(null)}>Got it</button>
        </div>
      )}
      <div className="card">
        <div className="card-head"><h3>Onboard a new cooperative</h3></div>
        <div className="card-body">
          <div className="inline-form">
            <div className="field" style={{ flex: 2 }}><label>Cooperative name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Orinde Farmers Cooperative Society" /></div>
            <div className="field" style={{ flex: 1 }}><label>County (optional)</label>
              <input className="input" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Homa Bay" /></div>
            <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={onboard}>Onboard & issue code</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{coops.length} cooperative{coops.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : coops.length === 0 ? (
          <div className="empty">No cooperatives yet. Onboard your first one above.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>County</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{coops.map((c) => (
              <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td><td className="muted">{c.county ?? '—'}</td>
                <td><span className={`chip ${c.status === 'ACTIVE' ? 'chip-green' : c.status === 'AWAITING_ACTIVATION' ? 'chip-amber' : 'chip-grey'}`}>{c.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {c.status !== 'ACTIVE'
                    ? <button className="btn btn-danger btn-sm" onClick={() => remove(c.id, c.name)}>Delete</button>
                    : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                </td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------- Credit model editor ---------- */
function CreditModel() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    adminApi.rules().then((r) => { setRules(r); setWeights(r.weights); }).catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const keys: [keyof Weights, string][] = [
    ['repayment', 'Repayment history'], ['delivery', 'Delivery record'],
    ['circle', 'Circle performance'], ['tenure_savings', 'Tenure & savings'], ['declared', 'Declared profile'],
  ];
  const sum = weights ? keys.reduce((s, [k]) => s + weights[k], 0) : 0;

  async function publish() {
    if (!weights) return;
    setErr(''); setOk(''); setBusy(true);
    try {
      const res = await adminApi.publishRules(weights);
      setOk(`Published version ${res.version}. New scores will use these weights; past scores keep their version.`);
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not publish'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="empty"><span className="spin" /></div>;

  return (
    <>
      <div className="page-head"><div className="h1">Credit model</div><div className="sub">Tune how a farmer's credit score is calculated — safely, with versioning</div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      <div className="card">
        <div className="card-head">
          <h3>Score weights <span className="muted" style={{ fontWeight: 400 }}>· currently version {rules?.version}</span></h3>
          <span className={`sum-badge ${sum === 100 ? 'sum-ok' : 'sum-bad'}`}>Total: {sum}%{sum === 100 ? ' ✓' : ' — must equal 100'}</span>
        </div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
            These weights decide how much each factor counts toward a farmer's 300–850 score. Adjust the sliders, keep the total at 100%, and publish a new version.
          </p>
          {weights && keys.map(([k, label]) => (
            <div className="weight-row" key={k}>
              <span className="wl">{label}</span>
              <input type="range" min={0} max={100} value={weights[k]}
                onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} />
              <span className="wv">{weights[k]}%</span>
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 22 }}>
            <button className="btn btn-ghost" onClick={() => rules && setWeights(rules.weights)}>Reset</button>
            <button className="btn btn-primary" disabled={busy || sum !== 100} onClick={publish}>
              {busy ? <span className="spin" /> : 'Publish new version'}</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Credit limit ladder</h3></div>
        <div className="card-body">
          <table>
            <thead><tr><th>Step</th><th>Limit</th><th>Min score</th><th>Loans closed</th></tr></thead>
            <tbody>{rules?.ladder.sort((a, b) => a.step - b.step).map((s) => (
              <tr key={s.step}><td>{s.step}</td><td style={{ fontWeight: 600 }}>{kes(s.limit_cents)}</td><td>{s.min_score || 'any'}</td><td>{s.min_loans_closed}</td></tr>
            ))}</tbody>
          </table>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
            As a farmer's score rises and they close loans, they climb the ladder to higher limits. (Ladder editing coming soon; edit weights above for now.)
          </p>
        </div>
      </div>
    </>
  );
}

/* ---------- Reconciliation ---------- */
function Reconciliation() {
  const [summary, setSummary] = useState<ReconRow[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([adminApi.reconSummary(), adminApi.reconExceptions()])
      .then(([s, e]) => { setSummary(s.data); setExceptions(e.data); })
      .catch((er) => setErr(er instanceof ApiError ? er.message : 'Load failed')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function resolve(id: string) {
    const note = prompt('Resolution note (e.g. "confirmed with LendBuck"):');
    if (!note) return;
    setErr(''); setOk('');
    try { await adminApi.resolveException(id, note); setOk('Exception resolved'); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not resolve'); }
  }

  if (loading) return <div className="empty"><span className="spin" /></div>;

  return (
    <>
      <div className="page-head"><div className="h1">Reconciliation</div><div className="sub">The daily match between Grofunder's books and the partner's statement</div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      <div className="card">
        <div className="card-head"><h3>Open exceptions</h3><span className={`chip ${exceptions.length ? 'chip-red' : 'chip-green'}`}>{exceptions.length} to resolve</span></div>
        {exceptions.length === 0 ? (
          <div className="empty">🎉 No open exceptions — the books balance.</div>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Reference</th><th>Amount</th><th>Direction</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{exceptions.map((e) => (
              <tr key={e.id}>
                <td>{e.statement_date?.slice(0, 10)}</td>
                <td className="muted">{e.partner_ref}</td>
                <td style={{ fontWeight: 600 }}>{kes(e.amount_cents)}</td>
                <td><span className={`chip ${e.direction === 'DISBURSEMENT' ? 'chip-blue' : 'chip-amber'}`}>{e.direction}</span></td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm" onClick={() => resolve(e.id)}>Resolve</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3>Daily summary</h3></div>
        {summary.length === 0 ? (
          <div className="empty">No statements reconciled yet.</div>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Matched</th><th>Exceptions</th><th>Resolved</th></tr></thead>
            <tbody>{summary.map((r) => (
              <tr key={r.statement_date}>
                <td>{r.statement_date?.slice(0, 10)}</td>
                <td><span className="chip chip-green">{r.matched}</span></td>
                <td>{Number(r.exceptions) > 0 ? <span className="chip chip-red">{r.exceptions}</span> : <span className="muted">0</span>}</td>
                <td className="muted">{r.resolved}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------- Loans ---------- */
const LOAN_FILTERS: [string, string][] = [
  ['ALL', 'All'],
  ['SUBMITTED', 'Submitted'],
  ['COOP_APPROVED', 'Coop approved'],
  ['GF_APPROVED', 'GF approved'],
  ['ACTIVE', 'Active'],
  ['IN_ARREARS', 'In arrears'],
  ['CLOSED', 'Closed'],
];

function statusChip(status: string): string {
  if (status === 'ACTIVE' || status === 'CLOSED' || status === 'GF_APPROVED') return 'chip-green';
  if (status === 'SUBMITTED' || status === 'COOP_APPROVED' || status === 'DISBURSING') return 'chip-amber';
  if (status === 'IN_ARREARS' || status === 'REJECTED') return 'chip-red';
  return 'chip-grey';
}

function Loans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [openFlow, setOpenFlow] = useState<string | null>(null);

  const load = useCallback((f: string) => {
    setLoading(true);
    adminApi.listLoans(f).then((r) => setLoans(r.data)).catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(filter); }, [filter, load]);

  async function act(fn: () => Promise<unknown>, okMsg: string) {
    setErr(''); setOk('');
    try { await fn(); setOk(okMsg); load(filter); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Action failed'); }
  }

  return (
    <>
      <div className="page-head"><div className="h1">Loans</div><div className="sub">Approve, disburse, and track every loan through its full journey</div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {LOAN_FILTERS.map(([val, label]) => (
          <button key={val} className={`btn btn-sm ${filter === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head"><h3>{loans.length} loan{loans.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : loans.length === 0 ? (
          <div className="empty">No loans in this view yet. When farmers apply and cooperatives accept, they appear here.</div>
        ) : (
          <table>
            <thead><tr><th>Farmer</th><th>Cooperative</th><th>Amount</th><th>Term</th><th>Score</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{loans.map((l) => (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.farmer_name}</td>
                <td className="muted">{l.cooperative_name}</td>
                <td>{kes(l.principal_cents)}</td>
                <td>{l.weeks}w</td>
                <td>{l.credit_score ?? <span className="muted">—</span>}</td>
                <td><span className={`chip ${statusChip(l.status)}`}>{l.status.replace(/_/g, ' ')}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOpenFlow(l.id)}>View flow</button>
                  {l.status === 'COOP_APPROVED' && (
                    <button className="btn btn-primary btn-sm" style={{ marginLeft: 6 }} onClick={() => act(() => adminApi.gfApprove(l.id), 'Loan approved by Grofunder')}>Approve</button>
                  )}
                  {l.status === 'GF_APPROVED' && (
                    <button className="btn btn-blue btn-sm" style={{ marginLeft: 6 }} onClick={() => act(() => adminApi.disburse(l.id), 'Disbursement requested')}>Disburse</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {openFlow && <FlowModal loanId={openFlow} onClose={() => setOpenFlow(null)} />}
    </>
  );
}

function FlowModal({ loanId, onClose }: { loanId: string; onClose: () => void }) {
  const [flow, setFlow] = useState<LoanFlow | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    adminApi.loanFlow(loanId).then(setFlow).catch((e) => setErr(e instanceof ApiError ? e.message : 'Could not load'));
  }, [loanId]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,62,10,0.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 540, width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="card-head" style={{ position: 'sticky', top: 0, background: '#fff' }}>
          <h3>Application flow</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card-body">
          {err && <div className="err">{err}</div>}
          {!flow ? <div className="empty"><span className="spin" /></div> : (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 17 }}>{flow.loan.farmer_name}</div>
                <div className="muted" style={{ fontSize: 13.5 }}>{flow.loan.cooperative_name} · {kes(flow.loan.principal_cents)} · {flow.loan.weeks} weeks</div>
              </div>
              {flow.rejected && <div className="err">Rejected: {flow.rejectReason ?? 'no reason given'}</div>}
              {flow.inArrears && <div className="err">This loan is in arrears.</div>}
              <div style={{ position: 'relative', paddingLeft: 8 }}>
                {flow.stages.map((s, i) => (
                  <div key={s.key} style={{ display: 'flex', gap: 14, paddingBottom: i === flow.stages.length - 1 ? 0 : 18, position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.reached ? 'var(--g)' : '#E4EBE5', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.reached ? '✓' : ''}</div>
                      {i < flow.stages.length - 1 && <div style={{ width: 2, flex: 1, background: s.reached ? 'var(--g)' : '#E4EBE5', minHeight: 20 }} />}
                    </div>
                    <div style={{ paddingTop: 1 }}>
                      <div style={{ fontWeight: s.reached ? 600 : 400, color: s.reached ? 'var(--ink)' : 'var(--mut)', fontSize: 14.5 }}>{s.label}</div>
                      {s.at && <div className="muted" style={{ fontSize: 12 }}>{new Date(s.at).toLocaleDateString()} {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {flow.circleState && <div className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>Circle state: <span className="chip chip-grey">{flow.circleState}</span></div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
