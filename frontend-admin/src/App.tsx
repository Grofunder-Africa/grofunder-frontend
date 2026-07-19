import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { adminApi, setToken, getToken, kes, ApiError } from './api';
import logo from './assets/grofunder-logo.png';
import type { Cooperative, Rules, Weights, ReconRow, Exception, Loan, LoanFlow, AdminMe, AdminUser, CoopChildren, CustomFeature, MessageCampaign, Pipeline, ImportPreview, ImportBody } from './api';

type Tab = 'overview' | 'cooperatives' | 'loans' | 'pipeline' | 'credit' | 'reconciliation' | 'messaging' | 'import' | 'export' | 'account';

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
        <div className="auth-brand"><img src={logo} alt="grofunder" /></div>
        <p className="muted auth-sub">Admin Console</p>
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

function NavIcon({ name }: { name: string }) {
  const p: Record<string, ReactNode> = {
    overview: <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 8.5V20h14V8.5" /></>,
    cooperatives: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.3A3 3 0 0 1 16 13" /><path d="M21 20c0-2.6-1.7-4.8-4-5.6" /></>,
    loans: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v10M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" /></>,
    pipeline: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    credit: <><path d="M12 3v18M5 8l7-5 7 5" /><circle cx="5" cy="12" r="2.5" /><circle cx="19" cy="12" r="2.5" /></>,
    reconciliation: <><path d="M8 7h8a4 4 0 0 1 0 8H8" /><path d="M11 4 8 7l3 3M13 12l3 3-3 3" /></>,
    messaging: <><path d="M4 5h16v12H8l-4 3z" /></>,
    export: <><path d="M12 3v11M8 10l4 4 4-4" /><path d="M4 20h16" /></>,
    import: <><path d="M12 14V3M8 7l4-4 4 4" /><path d="M4 20h16" /></>,
    account: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[name] ?? null}
    </svg>
  );
}

function Portal({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const nav: [Tab, string, string][] = [
    ['overview', 'overview', 'Overview'],
    ['cooperatives', 'cooperatives', 'Cooperatives'],
    ['loans', 'loans', 'Loans'],
    ['pipeline', 'pipeline', 'Pipeline'],
    ['credit', 'credit', 'Credit model'],
    ['reconciliation', 'reconciliation', 'Reconciliation'],
    ['messaging', 'messaging', 'Messaging'],
    ['import', 'import', 'Import'],
    ['export', 'export', 'Export'],
    ['account', 'account', 'Account'],
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><img src={logo} alt="grofunder" /></div>
        <div className="tagline">Growing farmers, growing wealth</div>
        <nav className="nav">
          {nav.map(([t, ico, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              <span className="ico"><NavIcon name={ico} /></span><span>{label}</span>
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
        {tab === 'pipeline' && <PipelineView />}
        {tab === 'credit' && <CreditModel />}
        {tab === 'reconciliation' && <Reconciliation />}
        {tab === 'messaging' && <Messaging />}
        {tab === 'import' && <ImportData />}
        {tab === 'export' && <ExportData />}
        {tab === 'account' && <Account />}
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
      <div className="page-head">
        <div className="h1">Karibu, <span style={{ color: 'var(--g)' }}>Grofunder</span></div>
        <div className="sub">Your lending network at a glance — cooperatives, the credit model, and the books.</div>
      </div>
      <div className="stat-grid">
        <div className="stat stat-green"><div className="stat-label">Cooperatives &amp; agents</div><div className="stat-num">{coops.length}</div></div>
        <div className="stat stat-blue"><div className="stat-label">Active</div><div className="stat-num">{active}</div></div>
        <div className="stat stat-purple"><div className="stat-label">Credit model</div><div className="stat-num">v{rules?.version ?? '—'}</div></div>
        <div className="stat stat-amber"><div className="stat-label">Open exceptions</div><div className="stat-num">{exceptions.length}</div></div>
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
  const [entityType, setEntityType] = useState<'COOPERATIVE' | 'AGENT'>('COOPERATIVE');
  const [newCode, setNewCode] = useState<{ name: string; code: string } | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [manageCoop, setManageCoop] = useState<Cooperative | null>(null);

  const load = useCallback(() => {
    adminApi.listCoops().then((c) => setCoops(c.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function onboard() {
    setErr(''); setBusy(true);
    try {
      const res = await adminApi.onboardCoop(name.trim(), county.trim() || undefined, entityType);
      setNewCode({ name: name.trim(), code: res.activationCode });
      setName(''); setCounty(''); setEntityType('COOPERATIVE'); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not onboard'); }
    finally { setBusy(false); }
  }

  async function remove(id: string, coopName: string) {
    if (!confirm(`Delete "${coopName}"? It will be removed from your dashboard but kept on record (traceable). Only non-active entries can be deleted.`)) return;
    setErr('');
    try { await adminApi.deleteCoop(id, 'removed from admin dashboard'); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not delete'); }
  }

  async function toggleLending(c: Cooperative) {
    setErr('');
    try {
      if (c.lending_suspended) {
        await adminApi.resume('cooperative', c.id);
      } else {
        const reason = prompt(`Pause new loans for "${c.name}". Enter a message farmers will see (optional):`, 'Lending is temporarily paused for your cooperative while we complete a review.');
        if (reason === null) return; // cancelled
        await adminApi.suspend('cooperative', c.id, reason);
      }
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not update lending'); }
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
        <div className="card-head"><h3>Onboard a new cooperative or agent</h3></div>
        <div className="card-body">
          <div className="inline-form">
            <div className="field"><label>Type</label>
              <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value as 'COOPERATIVE' | 'AGENT')}>
                <option value="COOPERATIVE">Cooperative</option>
                <option value="AGENT">Agent</option>
              </select></div>
            <div className="field" style={{ flex: 2 }}><label>{entityType === 'AGENT' ? 'Agent name' : 'Cooperative name'}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={entityType === 'AGENT' ? 'Jane Wanjiru (agent)' : 'Orinde Farmers Cooperative Society'} /></div>
            <div className="field" style={{ flex: 1 }}><label>County (optional)</label>
              <input className="input" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Homa Bay" /></div>
            <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={onboard}>Onboard &amp; issue code</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{coops.length} cooperative{coops.length === 1 ? '' : 's'} &amp; agent{coops.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : coops.length === 0 ? (
          <div className="empty">No cooperatives or agents yet. Onboard your first one above.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>County</th><th>Status</th><th>Lending</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{coops.map((c) => (
              <tr key={c.id}><td style={{ fontWeight: 600 }}>{c.name}</td>
                <td>{c.entity_type === 'AGENT' ? <span className="chip chip-purple">Agent</span> : <span className="chip chip-blue">Cooperative</span>}</td>
                <td className="muted">{c.county ?? '—'}</td>
                <td><span className={`chip ${c.status === 'ACTIVE' ? 'chip-green' : c.status === 'AWAITING_ACTIVATION' ? 'chip-amber' : 'chip-grey'}`}>{c.status}</span></td>
                <td>{c.lending_suspended ? <span className="chip chip-red">Paused</span> : <span className="chip chip-green">Open</span>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {c.status === 'ACTIVE' && (
                    <>
                      <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => setManageCoop(c)}>Clusters/circles</button>
                      <button className={`btn btn-sm ${c.lending_suspended ? 'btn-ghost' : 'btn-amber'}`} onClick={() => toggleLending(c)}>
                        {c.lending_suspended ? 'Resume lending' : 'Pause lending'}
                      </button>
                    </>
                  )}
                  {c.status !== 'ACTIVE' && <button className="btn btn-danger btn-sm" onClick={() => remove(c.id, c.name)}>Delete</button>}
                </td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {manageCoop && <ManageLendingModal coop={manageCoop} onClose={() => setManageCoop(null)} />}
    </>
  );
}

function ManageLendingModal({ coop, onClose }: { coop: Cooperative; onClose: () => void }) {
  const [kids, setKids] = useState<CoopChildren | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    adminApi.coopChildren(coop.id).then(setKids).catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed'));
  }, [coop.id]);
  useEffect(() => { load(); }, [load]);

  async function toggle(level: 'cluster' | 'circle', id: string, name: string, suspended: boolean) {
    setErr('');
    try {
      if (suspended) {
        await adminApi.resume(level, id);
      } else {
        const reason = prompt(`Pause new loans for ${level} "${name}". Message farmers will see (optional):`, `Lending is temporarily paused for your ${level} while we complete a review.`);
        if (reason === null) return;
        await adminApi.suspend(level, id, reason);
      }
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not update'); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,62,10,0.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, maxWidth: 620, width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="card-head" style={{ position: 'sticky', top: 0, background: '#fff' }}>
          <h3>Lending — {coop.name}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="card-body">
          {err && <div className="err">{err}</div>}
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Pause new loans for a specific cluster or circle. Existing loans and repayments continue.</p>
          {!kids ? <div className="empty"><span className="spin" /></div> : (
            <>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Clusters</h4>
              {kids.clusters.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No clusters.</p> : (
                <table style={{ marginBottom: 20 }}>
                  <tbody>{kids.clusters.map((cl) => (
                    <tr key={cl.id}>
                      <td style={{ fontWeight: 500 }}>{cl.name}</td>
                      <td>{cl.lending_suspended ? <span className="chip chip-red">Paused</span> : <span className="chip chip-green">Open</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={`btn btn-sm ${cl.lending_suspended ? 'btn-ghost' : 'btn-amber'}`} onClick={() => toggle('cluster', cl.id, cl.name, cl.lending_suspended)}>
                          {cl.lending_suspended ? 'Resume' : 'Pause'}
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Circles</h4>
              {kids.circles.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>No circles.</p> : (
                <table>
                  <tbody>{kids.circles.map((ci) => (
                    <tr key={ci.id}>
                      <td style={{ fontWeight: 500 }}>{ci.name}<div className="muted" style={{ fontSize: 12 }}>{ci.cluster_name}</div></td>
                      <td>{ci.lending_suspended ? <span className="chip chip-red">Paused</span> : <span className="chip chip-green">Open</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={`btn btn-sm ${ci.lending_suspended ? 'btn-ghost' : 'btn-amber'}`} onClick={() => toggle('circle', ci.id, ci.name, ci.lending_suspended)}>
                          {ci.lending_suspended ? 'Resume' : 'Pause'}
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
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

      <CustomFeatures />
    </>
  );
}

/* ---------- Custom scoring features (super-admin only) ---------- */
function CustomFeatures() {
  const [features, setFeatures] = useState<CustomFeature[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [form, setForm] = useState({ label: '', weight: '10', mode: 'COMPUTABLE', source: '', externalName: '' });

  const load = useCallback(() => {
    Promise.all([adminApi.rules(), adminApi.computableSources(), adminApi.me()])
      .then(([r, s, me]) => {
        setFeatures(r.custom_features ?? []);
        setSources(s.sources);
        setIsOwner(me.admin_level === 'OWNER');
        if (!form.source && Object.keys(s.sources)[0]) setForm((f) => ({ ...f, source: Object.keys(s.sources)[0] }));
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(next: CustomFeature[]) {
    setErr(''); setOk('');
    try { const r = await adminApi.publishFeatures(next); setOk(`Published version ${r.version}`); setFeatures(next); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not publish'); }
  }

  function addFeature() {
    setErr('');
    const weight = Number(form.weight);
    if (!(weight >= 0 && weight <= 100)) { setErr('Weight must be 0–100'); return; }
    const isExternal = form.mode === 'EXTERNAL';
    const label = isExternal ? form.externalName.trim() : (sources[form.source] ?? '');
    if (!label) { setErr('Give the feature a name'); return; }
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (features.some((f) => f.key === key)) { setErr('A feature with a similar name already exists'); return; }
    const feature: CustomFeature = {
      key, label, weight,
      kind: isExternal ? 'EXTERNAL' : 'COMPUTABLE',
      source: isExternal ? (form.externalName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')) : form.source,
      active: !isExternal, // external features start inactive (flagged) until a source is wired
    };
    save([...features, feature]);
    setForm({ label: '', weight: '10', mode: 'COMPUTABLE', source: Object.keys(sources)[0] ?? '', externalName: '' });
  }

  function toggleActive(key: string) {
    const f = features.find((x) => x.key === key);
    if (f?.kind === 'EXTERNAL') { setErr('External features need a data source wired before they can be activated'); return; }
    save(features.map((x) => x.key === key ? { ...x, active: !x.active } : x));
  }
  function removeFeature(key: string) {
    if (!confirm('Remove this scoring feature? A new model version will be published.')) return;
    save(features.filter((x) => x.key !== key));
  }

  if (loading) return null;
  if (!isOwner) return (
    <div className="card"><div className="card-head"><h3>Custom scoring features</h3></div>
      <div className="card-body"><p className="muted" style={{ fontSize: 13.5 }}>Only an owner can add or change scoring features.</p></div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-head"><h3>Custom scoring features</h3><span className="muted" style={{ fontSize: 12.5, fontWeight: 400 }}>owner only · publishes a new version</span></div>
      <div className="card-body">
        {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
        <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Add new factors to the credit score. Features computed from data you already have take effect immediately; features needing an external data source are flagged and stay inactive until that source is connected.
        </p>

        {features.length > 0 && (
          <table style={{ marginBottom: 20 }}>
            <thead><tr><th>Feature</th><th>Weight</th><th>Type</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{features.map((f) => (
              <tr key={f.key}>
                <td style={{ fontWeight: 500 }}>{f.label}</td>
                <td>{f.weight}%</td>
                <td>{f.kind === 'COMPUTABLE'
                  ? <span className="chip chip-green">Computable</span>
                  : <span className="chip chip-amber">Needs data source</span>}</td>
                <td>{f.active ? <span className="chip chip-green">Active</span> : <span className="chip chip-grey">Inactive</span>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(f.key)} disabled={f.kind === 'EXTERNAL' && !f.active}>
                    {f.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => removeFeature(f.key)}>Remove</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}

        <h4 style={{ fontSize: 14, marginBottom: 10 }}>Add a feature</h4>
        <div className="inline-form">
          <div className="field">
            <label>Type</label>
            <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="COMPUTABLE">From data we have</option>
              <option value="EXTERNAL">Needs external data source</option>
            </select>
          </div>
          {form.mode === 'COMPUTABLE' ? (
            <div className="field" style={{ minWidth: 240 }}>
              <label>Data source</label>
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {Object.entries(sources).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ) : (
            <div className="field" style={{ minWidth: 240 }}>
              <label>Feature name</label>
              <input className="input" value={form.externalName} onChange={(e) => setForm({ ...form, externalName: e.target.value })} placeholder="e.g. M-Pesa inflow trend" />
            </div>
          )}
          <div className="field" style={{ maxWidth: 110 }}>
            <label>Weight (%)</label>
            <input className="input" inputMode="numeric" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={addFeature}>Add feature</button>
        </div>
        {form.mode === 'EXTERNAL' && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            This feature will be saved and flagged as needing a data source. It won't affect scores until the source is connected and you activate it.
          </p>
        )}
      </div>
    </div>
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

/* ---------- Account settings ---------- */
const LEVEL_LABELS: Record<string, string> = {
  OWNER: 'Owner', FULL: 'Full admin', OPERATIONS: 'Operations', VIEW_ONLY: 'View only',
};
const LEVEL_DESC: Record<string, string> = {
  OWNER: 'Full power, including managing admins',
  FULL: 'All operations, but cannot manage admins',
  OPERATIONS: 'Day-to-day loan work; no model edits or deletes',
  VIEW_ONLY: 'Can see everything, change nothing',
};

function Account() {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.me().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spin" /></div>;
  const isOwner = me?.admin_level === 'OWNER';

  return (
    <>
      <div className="page-head"><div className="h1">Account</div><div className="sub">Your login details{isOwner ? ' and your Grofunder admin team' : ''}</div></div>
      <MyAccount me={me} onEmailChange={(e) => setMe((m) => m ? { ...m, email: e } : m)} />
      {isOwner && <AdminTeam />}
    </>
  );
}

function MyAccount({ me, onEmailChange }: { me: AdminMe | null; onEmailChange: (e: string) => void }) {
  const [email, setEmail] = useState(me?.email ?? '');
  const [cur, setCur] = useState(''); const [nw, setNw] = useState(''); const [nw2, setNw2] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');

  async function saveEmail() {
    setMsg(''); setErr('');
    try { await adminApi.changeEmail(email.trim()); onEmailChange(email.trim()); setMsg('Email updated'); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not update email'); }
  }
  async function savePassword() {
    setMsg(''); setErr('');
    if (nw !== nw2) { setErr('New passwords do not match'); return; }
    try { await adminApi.changePassword(cur, nw); setCur(''); setNw(''); setNw2(''); setMsg('Password changed'); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not change password'); }
  }

  return (
    <div className="card">
      <div className="card-head"><h3>My login</h3>{me && <span className="chip chip-green">{LEVEL_LABELS[me.admin_level] ?? me.admin_level}</span>}</div>
      <div className="card-body">
        {msg && <div className="ok">{msg}</div>}{err && <div className="err">{err}</div>}
        <div className="field" style={{ maxWidth: 420 }}>
          <label>Email</label>
          <div className="row" style={{ gap: 10 }}>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-ghost" disabled={!email.trim() || email.trim() === me?.email} onClick={saveEmail}>Save</button>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--line)', margin: '18px 0' }} />
        <div style={{ maxWidth: 420 }}>
          <div className="field"><label>Current password</label><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="field"><label>New password</label><input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} placeholder="at least 8 characters" /></div>
          <div className="field"><label>Confirm new password</label><input className="input" type="password" value={nw2} onChange={(e) => setNw2(e.target.value)} /></div>
          <button className="btn btn-primary" disabled={!cur || !nw || !nw2} onClick={savePassword}>Change password</button>
        </div>
      </div>
    </div>
  );
}

function AdminTeam() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [form, setForm] = useState({ email: '', fullName: '', level: 'OPERATIONS', tempPassword: '' });
  const [invited, setInvited] = useState<{ email: string; temp: string } | null>(null);

  const load = useCallback(() => {
    adminApi.listAdmins().then((r) => setAdmins(r.data)).catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite() {
    setMsg(''); setErr('');
    try {
      await adminApi.inviteAdmin(form.email.trim(), form.fullName.trim(), form.level, form.tempPassword);
      setInvited({ email: form.email.trim(), temp: form.tempPassword });
      setForm({ email: '', fullName: '', level: 'OPERATIONS', tempPassword: '' });
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not invite'); }
  }
  async function setLevel(id: string, level: string) {
    setMsg(''); setErr('');
    try { await adminApi.changeAdminLevel(id, level); setMsg('Level updated'); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not change level'); }
  }
  async function revoke(id: string, email: string) {
    if (!confirm(`Revoke access for ${email}? They will no longer be able to sign in.`)) return;
    setMsg(''); setErr('');
    try { await adminApi.revokeAdmin(id); setMsg('Access revoked'); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not revoke'); }
  }

  return (
    <>
      <div className="card">
        <div className="card-head"><h3>Invite an admin</h3></div>
        <div className="card-body">
          {err && <div className="err">{err}</div>}
          {invited && (
            <div className="ok" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>{invited.email}</strong> invited. Share this temporary password: <span className="code">{invited.temp}</span> — they'll be asked to change it.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setInvited(null)}>Got it</button>
            </div>
          )}
          <div className="inline-form">
            <div className="field"><label>Email</label><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="colleague@grofunder.com" /></div>
            <div className="field"><label>Full name</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Jane Doe" /></div>
            <div className="field"><label>Permission level</label>
              <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                {['FULL', 'OPERATIONS', 'VIEW_ONLY', 'OWNER'].map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="field"><label>Temporary password</label><input className="input" value={form.tempPassword} onChange={(e) => setForm({ ...form, tempPassword: e.target.value })} placeholder="at least 8 characters" /></div>
            <button className="btn btn-primary" disabled={!form.email.trim() || form.tempPassword.length < 8} onClick={invite}>Invite</button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{LEVEL_DESC[form.level]}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Admin team</h3></div>
        {msg && <div className="ok" style={{ margin: '0 20px' }}>{msg}</div>}
        {loading ? <div className="empty"><span className="spin" /></div> : (
          <table>
            <thead><tr><th>Email</th><th>Name</th><th>Level</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{admins.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.email}</td>
                <td className="muted">{a.full_name ?? '—'}</td>
                <td>
                  <select className="input" style={{ padding: '5px 8px', fontSize: 13, width: 'auto' }} value={a.admin_level} onChange={(e) => setLevel(a.id, e.target.value)}>
                    {['OWNER', 'FULL', 'OPERATIONS', 'VIEW_ONLY'].map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </td>
                <td><span className={`chip ${a.status === 'ACTIVE' ? 'chip-green' : 'chip-grey'}`}>{a.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {a.status === 'ACTIVE' && <button className="btn btn-danger btn-sm" onClick={() => revoke(a.id, a.email)}>Revoke</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ---------- Messaging ---------- */
const AUDIENCE_OPTIONS: { value: string; label: string; needs?: 'coop' }[] = [
  { value: 'ALL_FARMERS', label: 'All farmers' },
  { value: 'ARREARS_FARMERS', label: 'Farmers in arrears' },
  { value: 'COOPERATIVE', label: "A cooperative's farmers", needs: 'coop' },
  { value: 'ALL_COOP_STAFF', label: 'All cooperative staff' },
  { value: 'COOP_STAFF', label: "A cooperative's staff", needs: 'coop' },
];

function Messaging() {
  const [tab, setTab] = useState<'compose' | 'log'>('compose');
  return (
    <>
      <div className="page-head"><div className="h1">Messaging</div><div className="sub">Send messages to farmers and cooperatives — every send is logged</div></div>
      <div className="tabs" style={{ marginBottom: 18 }}>
        <button className={tab === 'compose' ? 'active' : ''} onClick={() => setTab('compose')}>Compose</button>
        <button className={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>History</button>
      </div>
      {tab === 'compose' ? <Compose /> : <MessageLog />}
    </>
  );
}

function Compose() {
  const [coops, setCoops] = useState<Cooperative[]>([]);
  const [audience, setAudience] = useState('ALL_FARMERS');
  const [coopRef, setCoopRef] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  useEffect(() => {
    adminApi.listCoops().then((r) => setCoops(r.data.filter((c) => c.status === 'ACTIVE'))).catch(() => {});
  }, []);

  const selected = AUDIENCE_OPTIONS.find((a) => a.value === audience);
  const needsCoop = selected?.needs === 'coop';

  async function send() {
    setErr(''); setOk(''); setBusy(true);
    try {
      if (needsCoop && !coopRef) throw new ApiError('REF', 'Choose a cooperative', 400);
      const r = await adminApi.sendMessage(audience, body.trim(), needsCoop ? coopRef : undefined);
      let m = `Sent to ${r.sentCount} recipient${r.sentCount === 1 ? '' : 's'}.`;
      if (r.failedCount) m += ` ${r.failedCount} failed.`;
      if (r.skippedNoPhone) m += ` ${r.skippedNoPhone} skipped (no phone number).`;
      setOk(m); setBody('');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send'); }
    finally { setBusy(false); }
  }

  return (
    <div className="card">
      <div className="card-head"><h3>Compose a message</h3></div>
      <div className="card-body">
        {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
        <div className="field" style={{ maxWidth: 420 }}>
          <label>Send to</label>
          <select className="input" value={audience} onChange={(e) => setAudience(e.target.value)}>
            {AUDIENCE_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        {needsCoop && (
          <div className="field" style={{ maxWidth: 420 }}>
            <label>Cooperative</label>
            <select className="input" value={coopRef} onChange={(e) => setCoopRef(e.target.value)}>
              <option value="">Choose a cooperative…</option>
              {coops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>Message <span className="muted" style={{ fontWeight: 400 }}>({body.length}/800)</span></label>
          <textarea className="input" style={{ minHeight: 110, resize: 'vertical', fontFamily: 'inherit' }} maxLength={800}
            value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your message…" />
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Recipients without a phone number are skipped automatically.</p>
          <button className="btn btn-primary" disabled={busy || !body.trim() || (needsCoop && !coopRef)} onClick={send}>
            {busy ? <span className="spin" /> : 'Send message'}</button>
        </div>
      </div>
    </div>
  );
}

function MessageLog() {
  const [log, setLog] = useState<MessageCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.messageLog().then((r) => setLog(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const audLabel = (a: string) => AUDIENCE_OPTIONS.find((o) => o.value === a)?.label ?? a.replace(/_/g, ' ');

  if (loading) return <div className="empty"><span className="spin" /></div>;
  return (
    <div className="card">
      <div className="card-head"><h3>Message history</h3><span className="muted" style={{ fontSize: 13 }}>{log.length} sent</span></div>
      {log.length === 0 ? <div className="empty">No messages sent yet.</div> : (
        <table>
          <thead><tr><th>When</th><th>Audience</th><th>Sent by</th><th>Message</th><th>Delivered</th></tr></thead>
          <tbody>{log.map((c) => (
            <tr key={c.id}>
              <td className="muted" style={{ whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString()}<br /><span style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
              <td><span className="chip chip-blue">{audLabel(c.audience)}</span></td>
              <td className="muted" style={{ fontSize: 13 }}>{c.sender_email}</td>
              <td style={{ maxWidth: 280 }}>{c.body}</td>
              <td><span className="chip chip-green">{c.sent_count}</span>{c.failed_count > 0 && <span className="chip chip-red" style={{ marginLeft: 4 }}>{c.failed_count} failed</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

/* ---------- Pipeline view ---------- */
function PipelineView() {
  const [data, setData] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [openStage, setOpenStage] = useState<string | null>(null);

  useEffect(() => {
    adminApi.pipeline().then(setData).catch((e) => setErr(e instanceof ApiError ? e.message : 'Load failed')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spin" /></div>;

  const totalInFlight = data?.loans.length ?? 0;
  const totalStuck = data?.loans.filter((l) => l.stuck).length ?? 0;
  const stageLoans = openStage ? (data?.loans.filter((l) => l.stage === openStage) ?? []) : [];
  const openStageLabel = data?.stages.find((s) => s.stage === openStage)?.label ?? '';

  return (
    <>
      <div className="page-head"><div className="h1">Application pipeline</div><div className="sub">Where every in-flight loan sits — and what's been waiting too long</div></div>
      {err && <div className="err">{err}</div>}

      <div className="stat-grid" style={{ marginBottom: 22 }}>
        <div className="stat stat-green"><div className="stat-num">{totalInFlight}</div><div className="stat-label">Loans in flight</div></div>
        <div className={`stat ${totalStuck > 0 ? 'stat-amber' : 'stat-blue'}`}>
          <div className="stat-num">{totalStuck}</div>
          <div className="stat-label">Waiting &gt; 24 hours</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Stages</h3><span className="muted" style={{ fontSize: 13 }}>Click a stage to see its loans</span></div>
        <div className="card-body">
          {totalInFlight === 0 ? (
            <div className="empty">No loans in flight. As farmers apply and move through approval, they'll appear here.</div>
          ) : (
            <div className="pipeline-stages">
              {data!.stages.map((s) => (
                <button key={s.stage} className={`pipeline-stage ${openStage === s.stage ? 'open' : ''} ${s.count === 0 ? 'muted-stage' : ''}`}
                  onClick={() => setOpenStage(openStage === s.stage ? null : s.stage)} disabled={s.count === 0}>
                  <div className="pipeline-stage-count">{s.count}</div>
                  <div className="pipeline-stage-label">{s.label}</div>
                  {s.stuck > 0 && <div className="pipeline-stage-stuck">{s.stuck} stuck</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {openStage && (
        <div className="card">
          <div className="card-head"><h3>{openStageLabel} — {stageLoans.length} loan{stageLoans.length === 1 ? '' : 's'}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setOpenStage(null)}>Close</button></div>
          <table>
            <thead><tr><th>Farmer</th><th>Cooperative</th><th>Amount</th><th>Waiting</th></tr></thead>
            <tbody>{stageLoans.map((l) => (
              <tr key={l.id} style={l.stuck ? { background: '#FFF6F6' } : undefined}>
                <td style={{ fontWeight: 600 }}>{l.farmer_name}</td>
                <td className="muted">{l.cooperative_name}</td>
                <td>{kes(l.principal_cents)}</td>
                <td>{l.stuck
                  ? <span className="chip chip-red">{formatHours(l.hours_at_stage)}</span>
                  : <span className="muted">{formatHours(l.hours_at_stage)}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

function formatHours(h: number): string {
  if (h < 1) return 'under 1h';
  if (h < 24) return `${Math.round(h)}h`;
  const days = Math.floor(h / 24);
  return `${days}d ${Math.round(h - days * 24)}h`;
}

/* ---------- Export data ---------- */
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','));
  return lines.join('\n');
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCSV(rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const EXPORTS: { key: string; label: string; desc: string }[] = [
  { key: 'loans', label: 'Loans', desc: 'Every loan with farmer, cooperative, amounts, status and dates' },
  { key: 'farmers', label: 'Farmers', desc: 'All farmers with contact, cooperative, cluster and credit limit' },
  { key: 'cooperatives', label: 'Cooperatives & agents', desc: 'All cooperatives and agents with status and member counts' },
  { key: 'repayments', label: 'Repayments', desc: 'Every payment received, tied to its loan and farmer' },
];

function ExportData() {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [notAllowed, setNotAllowed] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function one(key: string, label: string) {
    setBusy(key); setErr(''); setOk('');
    try {
      const r = await adminApi.exportData(key);
      if (r.data.length === 0) { setOk(`No ${label.toLowerCase()} to export yet.`); return; }
      downloadCSV(`grofunder_${key}_${today}.csv`, r.data);
      setOk(`Downloaded ${r.data.length} ${label.toLowerCase()} row${r.data.length === 1 ? '' : 's'}.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) { setNotAllowed(true); setErr('You need Owner or Full-admin access to export data.'); }
      else setErr(e instanceof ApiError ? e.message : 'Export failed');
    } finally { setBusy(null); }
  }

  async function all() {
    setBusy('all'); setErr(''); setOk('');
    try {
      let total = 0;
      for (const e of EXPORTS) {
        const r = await adminApi.exportData(e.key);
        if (r.data.length > 0) { downloadCSV(`grofunder_${e.key}_${today}.csv`, r.data); total += r.data.length; }
      }
      setOk(`Downloaded all datasets (${total} rows total across ${EXPORTS.length} files).`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) { setNotAllowed(true); setErr('You need Owner or Full-admin access to export data.'); }
      else setErr(e instanceof ApiError ? e.message : 'Export failed');
    } finally { setBusy(null); }
  }

  return (
    <>
      <div className="page-head"><div className="h1">Export data</div><div className="sub">Download your data as spreadsheets (CSV — opens in Excel, Google Sheets, Numbers)</div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Download everything</div>
            <div className="muted" style={{ fontSize: 13 }}>Gets all four datasets as separate CSV files in one click.</div>
          </div>
          <button className="btn btn-primary" disabled={busy !== null || notAllowed} onClick={all}>
            {busy === 'all' ? <span className="spin" /> : 'Download all'}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Individual datasets</h3></div>
        <table>
          <tbody>{EXPORTS.map((e) => (
            <tr key={e.key}>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{e.label}</td>
              <td className="muted" style={{ fontSize: 13 }}>{e.desc}</td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn btn-ghost btn-sm" disabled={busy !== null || notAllowed} onClick={() => one(e.key, e.label)}>
                  {busy === e.key ? <span className="spin" /> : 'Download CSV'}</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
        These files contain personal and financial data (farmer names, phone numbers, IDs, loan details). Handle and store them securely.
      </p>
    </>
  );
}

/* ---------- Import data ---------- */
function ImportData() {
  const [coopName, setCoopName] = useState('');
  const [county, setCounty] = useState('');
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [prev, setPrev] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [done, setDone] = useState('');
  const [notAllowed, setNotAllowed] = useState(false);

  async function onFiles(fileList: FileList | null) {
    if (!fileList) return;
    setErr(''); setPrev(null); setDone('');
    const read: { name: string; content: string }[] = [];
    for (const f of Array.from(fileList)) {
      const content = await f.text();
      read.push({ name: f.name, content });
    }
    setFiles(read);
  }

  function body(): ImportBody {
    return { files, cooperativeName: coopName.trim(), county: county.trim() || undefined };
  }

  async function runPreview() {
    setBusy(true); setErr(''); setDone('');
    try {
      setPrev(await adminApi.importPreview(body()));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) { setNotAllowed(true); setErr('You need Owner or Full-admin access to import data.'); }
      else setErr(e instanceof ApiError ? e.message : 'Preview failed');
    } finally { setBusy(false); }
  }

  async function runCommit() {
    if (!confirm(`Import into "${coopName.trim()}"? This writes the data into Grofunder.`)) return;
    setBusy(true); setErr(''); setDone('');
    try {
      const r = await adminApi.importCommit(body());
      setDone(`Imported: ${r.created.farmers} farmers, ${r.created.clusters} clusters, ${r.created.loans} loans, ${r.created.payments} payments, ${r.created.disbursements} disbursements.` +
        (r.demotedExtraLoans ? ` ${r.demotedExtraLoans} extra live loan(s) brought in as closed.` : '') +
        (r.skipped.testRows ? ` ${r.skipped.testRows} test row(s) skipped.` : ''));
      setPrev(null); setFiles([]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Import failed');
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head">
        <div className="h1">Import data</div>
        <div className="sub">Bring a cooperative's records in from an exported system. Preview first, then commit — nothing is written until you confirm.</div>
      </div>
      {err && <div className="err">{err}</div>}
      {done && <div className="ok">{done}</div>}

      <div className="card">
        <div className="card-head"><h3>1 · Choose the cooperative &amp; files</h3></div>
        <div className="card-body">
          <div className="inline-form" style={{ marginBottom: 18 }}>
            <div className="field" style={{ flex: 2 }}><label>Cooperative or agent name</label>
              <input className="input" value={coopName} onChange={(e) => setCoopName(e.target.value)} placeholder="Nyawest" disabled={notAllowed} /></div>
            <div className="field" style={{ flex: 1 }}><label>County (optional)</label>
              <input className="input" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="Homa Bay" disabled={notAllowed} /></div>
          </div>
          <div className="field">
            <label>Exported CSV files (profiles, loans, payments, disbursements…)</label>
            <input className="input" type="file" accept=".csv" multiple onChange={(e) => onFiles(e.target.files)} disabled={notAllowed} />
          </div>
          {files.length > 0 && (
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{files.length} file{files.length === 1 ? '' : 's'} loaded: {files.map((f) => f.name).join(', ')}</p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={busy || notAllowed || !coopName.trim() || files.length === 0} onClick={runPreview}>
            {busy && !prev ? <span className="spin" /> : 'Preview import'}
          </button>
        </div>
      </div>

      {prev && (
        <>
          <div className="card">
            <div className="card-head"><h3>2 · Preview — what will happen</h3>
              <span className={`chip ${prev.cooperative.mode === 'existing' ? 'chip-amber' : 'chip-green'}`}>
                {prev.cooperative.mode === 'existing' ? 'Into existing cooperative' : 'New cooperative will be created'}</span>
            </div>
            <div className="card-body">
              <div className="stat-grid" style={{ marginBottom: 8 }}>
                <div className="stat stat-green"><div className="stat-label">Farmers to import</div><div className="stat-num">{prev.farmers.willImport}</div></div>
                <div className="stat"><div className="stat-label">Clusters</div><div className="stat-num">{prev.clusters.length}</div></div>
                <div className="stat stat-blue"><div className="stat-label">Loans</div><div className="stat-num">{prev.loans.total}</div></div>
                <div className="stat stat-amber"><div className="stat-label">Payments</div><div className="stat-num">{prev.payments.total}</div></div>
              </div>
              <table>
                <tbody>
                  <tr><td style={{ fontWeight: 600 }}>Files detected</td><td>{prev.files.map((f) => `${f.type ?? 'unknown'} (${f.rows})`).join(', ')}</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Clusters</td><td className="muted">{prev.clusters.map((c) => c.display).join(', ')}</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Loan statuses</td><td className="muted">{Object.entries(prev.loans.byStatus).map(([s, n]) => `${n} ${s.toLowerCase()}`).join(', ')}</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Test rows flagged</td><td className="muted">{prev.farmers.flaggedTest.length ? `${prev.farmers.flaggedTest.length} skipped (${prev.farmers.flaggedTest.slice(0, 6).join(', ')}${prev.farmers.flaggedTest.length > 6 ? '…' : ''})` : 'none'}</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Missing phone / ID</td><td className="muted">{prev.farmers.missingPhone} without phone, {prev.farmers.missingId} without national ID</td></tr>
                  <tr><td style={{ fontWeight: 600 }}>Parked (not imported)</td><td className="muted">{prev.parked.guaranteeRequests} guarantee requests, {prev.parked.riskProfiles} risk profiles</td></tr>
                </tbody>
              </table>
              {prev.warnings.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  {prev.warnings.map((w, i) => <div key={i} className="chip chip-amber" style={{ display: 'block', marginBottom: 6, padding: '8px 12px' }}>{w}</div>)}
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>3 · Commit</h3></div>
            <div className="card-body">
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>
                This writes everything above into Grofunder in one operation. If anything fails, nothing is saved.
              </p>
              <button className="btn btn-primary" disabled={busy} onClick={runCommit}>
                {busy ? <span className="spin" /> : `Import into ${prev.cooperative.name}`}
              </button>
            </div>
          </div>
        </>
      )}

      <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
        Files contain personal and financial data. Phone numbers and IDs are cleaned and validated on the way in; obvious test rows are skipped.
      </p>
    </>
  );
}
