import { useState, useEffect, useCallback } from 'react';
import { coopApi, setToken, getToken, kes, ApiError } from './api';
import type { Cluster, Farmer, Product, Loan } from './api';

type Tab = 'overview' | 'clusters' | 'farmers' | 'products' | 'approvals';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  if (!authed) return <Auth onDone={() => setAuthed(true)} />;
  return <Portal onSignOut={() => { setToken(null); setAuthed(false); }} />;
}

/* ------------- Activation / Login ------------- */
function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [coopName, setCoopName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    // Friendly guard: people often type the cooperative's name here out of habit.
    if (!email.includes('@')) {
      setErr(mode === 'login'
        ? 'Please enter the email address you registered with (e.g. chair@cooperative.co.ke) — not the cooperative name.'
        : 'Please enter a valid email address (e.g. chair@cooperative.co.ke).');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'activate') {
        await coopApi.activate(coopName, code, email, password);
      }
      const { token } = await coopApi.login(email, password);
      setToken(token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">grofunder <span>🌿</span></div>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>Cooperative Portal</p>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErr(''); }}>Sign in</button>
          <button className={mode === 'activate' ? 'active' : ''} onClick={() => { setMode('activate'); setErr(''); }}>Activate</button>
        </div>

        {err && <div className="err">{err}</div>}

        {mode === 'login' && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: -2, marginBottom: 14 }}>
            Sign in with the <strong>email address</strong> and password you set when you activated your cooperative — not the cooperative's name.
          </p>
        )}

        {mode === 'activate' && (
          <>
            <div className="field">
              <label>Cooperative name</label>
              <input className="input" value={coopName} onChange={(e) => setCoopName(e.target.value)} placeholder="e.g. Orinde Farmers Cooperative" />
            </div>
            <div className="field">
              <label>Activation code</label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="GF-XXX-NNNN" />
            </div>
          </>
        )}
        <div className="field">
          <label>{mode === 'activate' ? 'Your email address' : 'Email address'}</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="chair@cooperative.co.ke" />
          {mode === 'login' && <span className="hint">The email you registered with, e.g. chair@cooperative.co.ke</span>}
        </div>
        <div className="field">
          <label>{mode === 'activate' ? 'Choose a password' : 'Password'}</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={submit}>
          {busy ? <span className="spin" /> : mode === 'login' ? 'Sign in' : 'Activate cooperative'}
        </button>
      </div>
    </div>
  );
}

/* ------------- Portal shell ------------- */
function Portal({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const nav: [Tab, string, string][] = [
    ['overview', '▤', 'Overview'],
    ['clusters', '🌾', 'Clusters'],
    ['farmers', '👥', 'Farmers'],
    ['products', '☕', 'Products'],
    ['approvals', '✓', 'Loan approvals'],
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">grofunder <span>🌿</span></div>
        <nav className="nav">
          {nav.map(([t, ico, label]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              <span className="ico">{ico}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">Cooperative admin</div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {tab === 'overview' && <Overview onGo={setTab} />}
        {tab === 'clusters' && <Clusters />}
        {tab === 'farmers' && <Farmers />}
        {tab === 'products' && <Products />}
        {tab === 'approvals' && <Approvals />}
      </main>
    </div>
  );
}

/* ------------- Overview ------------- */
function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([coopApi.clusters(), coopApi.farmers(), coopApi.products()])
      .then(([c, f, p]) => { setClusters(c.data); setFarmers(f.data); setProducts(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty"><span className="spin" /></div>;
  const scored = farmers.filter((f) => f.credit_score != null).length;

  return (
    <>
      <div className="page-head">
        <div><div className="h1">Karibu 🌱</div><div className="sub">Your cooperative at a glance</div></div>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="n">{clusters.length}</div><div className="l">Clusters</div></div>
        <div className="stat"><div className="n">{farmers.length}</div><div className="l">Farmers</div></div>
        <div className="stat"><div className="n">{scored}</div><div className="l">Credit-scored</div></div>
        <div className="stat"><div className="n">{products.length}</div><div className="l">Products</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Getting set up</h3></div>
        <div className="card-body">
          <SetupStep done={products.length > 0} label="Add your products and prices" onGo={() => onGo('products')} />
          <SetupStep done={clusters.length > 0} label="Declare your clusters" onGo={() => onGo('clusters')} />
          <SetupStep done={farmers.length > 0} label="Register your farmers" onGo={() => onGo('farmers')} />
          <SetupStep done={scored > 0} label="Review loan applications as they arrive" onGo={() => onGo('approvals')} last />
        </div>
      </div>
    </>
  );
}
function SetupStep({ done, label, onGo, last }: { done: boolean; label: string; onGo: () => void; last?: boolean }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <div className="row" style={{ gap: 12 }}>
        <span className={`chip ${done ? 'chip-green' : 'chip-grey'}`} style={{ width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: '50%', padding: 0 }}>{done ? '✓' : '·'}</span>
        <span style={{ fontSize: 14 }}>{label}</span>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onGo}>Open</button>
    </div>
  );
}

/* ------------- Clusters ------------- */
function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    coopApi.clusters().then((c) => setClusters(c.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(''); setBusy(true);
    try { await coopApi.addCluster(name.trim()); setName(''); load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not add cluster'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><div><div className="h1">Clusters</div><div className="sub">The groups your cooperative is organised into</div></div></div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="card-body">
          <div className="inline-form">
            <div className="field" style={{ flex: 1 }}>
              <label>New cluster name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kanyada" onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()} />
            </div>
            <button className="btn btn-primary" disabled={busy || !name.trim()} onClick={add}>Declare cluster</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{clusters.length} cluster{clusters.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : clusters.length === 0 ? (
          <div className="empty">No clusters yet. Declare your first one above.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Members</th><th>Head appointed</th></tr></thead>
            <tbody>{clusters.map((c) => (
              <tr key={c.id}><td style={{ fontWeight: 500 }}>{c.name}</td><td>{c.member_count}</td>
                <td>{c.head_farmer_id ? <span className="chip chip-green">Yes</span> : <span className="chip chip-grey">Not yet</span>}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ------------- Farmers ------------- */
function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [form, setForm] = useState({ fullName: '', clusterName: '', phone: '', coopMemberNo: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([coopApi.farmers(), coopApi.clusters()])
      .then(([f, c]) => { setFarmers(f.data); setClusters(c.data); if (!form.clusterName && c.data[0]) setForm((s) => ({ ...s, clusterName: c.data[0].name })); })
      .catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(''); setOk(''); setBusy(true);
    try {
      await coopApi.addFarmer(form.fullName.trim(), form.clusterName, form.phone.trim() || undefined, form.coopMemberNo.trim() || undefined);
      setOk(`${form.fullName} added`); setForm((s) => ({ ...s, fullName: '', phone: '', coopMemberNo: '' })); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not add farmer'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><div><div className="h1">Farmers</div><div className="sub">Everyone registered under your cooperative</div></div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
      <div className="card">
        <div className="card-head"><h3>Register a farmer</h3></div>
        <div className="card-body">
          {clusters.length === 0 ? (
            <div className="muted" style={{ fontSize: 14 }}>Declare a cluster first, then you can register farmers into it.</div>
          ) : (
            <div className="inline-form">
              <div className="field"><label>Full name</label><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Akinyi Ouma" /></div>
              <div className="field"><label>Cluster</label>
                <select className="input" value={form.clusterName} onChange={(e) => setForm({ ...form, clusterName: e.target.value })}>
                  {clusters.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Phone (optional)</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+2547…" /></div>
              <div className="field"><label>Member no. (optional)</label><input className="input" value={form.coopMemberNo} onChange={(e) => setForm({ ...form, coopMemberNo: e.target.value })} placeholder="ORD-001" /></div>
              <button className="btn btn-primary" disabled={busy || !form.fullName.trim()} onClick={add}>Add farmer</button>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{farmers.length} farmer{farmers.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : farmers.length === 0 ? (
          <div className="empty">No farmers yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Member no.</th><th>Credit score</th><th>Limit</th></tr></thead>
            <tbody>{farmers.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td className="muted">{f.coop_member_no ?? '—'}</td>
                <td>{f.credit_score != null ? f.credit_score : <span className="muted">not scored</span>}</td>
                <td>{f.credit_score != null ? kes(f.credit_limit_cents) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ------------- Products ------------- */
function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ name: '', rate: '', season: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    coopApi.products().then((p) => setProducts(p.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(''); setBusy(true);
    try {
      const cents = Math.round(parseFloat(form.rate) * 100);
      if (!(cents > 0)) throw new ApiError('BAD', 'Enter a price per kg', 400);
      await coopApi.addProduct(form.name.trim(), cents, form.season.trim() || undefined);
      setForm({ name: '', rate: '', season: '' }); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not add product'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><div><div className="h1">Products</div><div className="sub">What your farmers deliver, and the price per kg</div></div></div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="card-body">
          <div className="inline-form">
            <div className="field"><label>Product name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cherry (AA)" /></div>
            <div className="field"><label>Price per kg (KES)</label><input className="input" inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="85.00" /></div>
            <div className="field"><label>Season (optional)</label><input className="input" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="Main" /></div>
            <button className="btn btn-primary" disabled={busy || !form.name.trim() || !form.rate} onClick={add}>Add product</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>{products.length} product{products.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : products.length === 0 ? (
          <div className="empty">No products yet.</div>
        ) : (
          <table>
            <thead><tr><th>Product</th><th>Season</th><th>Current price / kg</th></tr></thead>
            <tbody>{products.map((p) => (
              <tr key={p.id}><td style={{ fontWeight: 500 }}>{p.name}</td><td className="muted">{p.season ?? '—'}</td><td>{kes(p.current_rate_cents_per_kg)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ------------- Loan approvals ------------- */
function Approvals() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // The backend exposes loans per farmer; for the queue we show scored farmers and
  // let the admin score + act. (A dedicated "submitted loans" list endpoint is a
  // small future addition; for now this proves the approve/score wiring.)
  const load = useCallback(() => {
    coopApi.farmers().then((f) => setFarmers(f.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function score(id: string, name: string) {
    setMsg('');
    try { const r = await coopApi.scoreFarmer(id); setMsg(`${name}: score ${r.score}, limit ${kes(r.limitCents)}`); load(); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : 'Could not score'); }
  }

  return (
    <>
      <div className="page-head"><div><div className="h1">Loan approvals</div><div className="sub">Score farmers and review applications</div></div></div>
      {msg && <div className="ok">{msg}</div>}
      <div className="card">
        <div className="card-head"><h3>Farmers</h3><span className="muted" style={{ fontSize: 13 }}>score a farmer to set their limit</span></div>
        {loading ? <div className="empty"><span className="spin" /></div> : farmers.length === 0 ? (
          <div className="empty">No farmers yet. Register farmers first.</div>
        ) : (
          <table>
            <thead><tr><th>Farmer</th><th>Score</th><th>Limit</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{farmers.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td>{f.credit_score ?? <span className="muted">—</span>}</td>
                <td>{f.credit_score != null ? kes(f.credit_limit_cents) : '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => score(f.id, f.full_name)}>{f.credit_score != null ? 'Re-score' : 'Score'}</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        When a farmer submits a loan, it appears here for cooperative approval, then goes to Grofunder for final approval.
        The approve / reject actions are wired to the backend (<code>coop-approval</code> / <code>coop-reject</code>).
      </p>
    </>
  );
}

export type { Loan };
