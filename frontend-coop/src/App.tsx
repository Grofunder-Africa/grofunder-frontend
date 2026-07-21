import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { coopApi, setToken, getToken, kes, ApiError } from './api';
import type { Cluster, Farmer, Product, Loan, CoopProfile, InboxMessage } from './api';
import logo from './assets/grofunder-logo.png';

type Tab = 'overview' | 'clusters' | 'farmers' | 'products' | 'approvals' | 'messages' | 'settings';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  if (!authed) return <Auth onDone={() => setAuthed(true)} />;
  return <Portal onSignOut={() => { setToken(null); setAuthed(false); }} />;
}

/* ------------- Activation / Login ------------- */
const REMEMBERED_USERNAME_KEY = 'grofunder_coop_username';

function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'activate'>('login');
  // Pre-fill the username from this device's memory (set at activation / last
  // sign-in), so a returning cooperative confirms rather than types it — the
  // same "confirm the pre-filled record" pattern farmers use.
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(REMEMBERED_USERNAME_KEY) ?? ''; } catch { return ''; }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [coopName, setCoopName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [assignedUsername, setAssignedUsername] = useState<string | null>(null);

  function remember(name: string) {
    try { localStorage.setItem(REMEMBERED_USERNAME_KEY, name); } catch { /* ignore */ }
  }

  async function submit() {
    setErr('');
    setBusy(true);
    try {
      if (mode === 'activate') {
        const res = await coopApi.activate(coopName, code, password, email.trim() || undefined);
        remember(res.username);
        // Show the coop the username they'll use from now on, before logging in.
        setAssignedUsername(res.username);
      } else {
        const { token } = await coopApi.loginByUsername(username.trim(), password);
        remember(username.trim());
        setToken(token);
        onDone();
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  async function continueAfterActivation() {
    setBusy(true); setErr('');
    try {
      const { token } = await coopApi.loginByUsername(assignedUsername!, password);
      remember(assignedUsername!);
      setToken(token);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally { setBusy(false); }
  }

  // After activation: show the coop their permanent username before they proceed.
  if (assignedUsername) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-brand"><img src={logo} alt="grofunder" /></div>
          <p className="auth-sub">Cooperative activated</p>
          <div className="ok" style={{ marginBottom: 18 }}>Your cooperative is set up and ready.</div>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>
            This is your <strong>username</strong> — you'll use it with your password to sign in from now on. Please write it down.
          </p>
          <div style={{ background: 'var(--g-tint)', border: '0.5px solid #CFE9D0', borderRadius: 10, padding: '16px 18px', textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, color: 'var(--g-deep)', letterSpacing: '-0.01em' }}>{assignedUsername}</div>
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={continueAfterActivation}>
            {busy ? <span className="spin" /> : 'I\u2019ve noted my username — continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand"><img src={logo} alt="grofunder" /></div>
        <p className="auth-sub">Cooperative Portal</p>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErr(''); }}>Sign in</button>
          <button className={mode === 'activate' ? 'active' : ''} onClick={() => { setMode('activate'); setErr(''); }}>Activate</button>
        </div>

        {err && <div className="err">{err}</div>}

        {mode === 'login' && (
          <>
            <p className="muted" style={{ fontSize: 12.5, marginTop: -2, marginBottom: 14 }}>
              {username
                ? <>Confirm your cooperative's <strong>username</strong> below and enter your password.</>
                : <>Sign in with your cooperative's <strong>username</strong> and password.</>}
            </p>
            <div className="field">
              <label>Cooperative username</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Nyawest" autoCapitalize="none" />
              <span className="hint">This is your cooperative's name, given to you when you activated.</span>
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </>
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
            <div className="field">
              <label>Email <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cooperative@example.co.ke" />
              <span className="hint">For official messages. You can add or change this later in Settings.</span>
            </div>
            <div className="field">
              <label>Choose a password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              You'll sign in from now on with a <strong>username</strong> based on your cooperative's name, plus this password.
            </p>
          </>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={submit}>
          {busy ? <span className="spin" /> : mode === 'login' ? 'Sign in' : 'Activate cooperative'}
        </button>
      </div>
    </div>
  );
}

/* ------------- Portal shell ------------- */
function NavIcon({ name }: { name: string }) {
  const p: Record<string, ReactNode> = {
    overview: <><path d="M3 9.5 12 3l9 6.5" /><path d="M5 8.5V20h14V8.5" /></>,
    clusters: <><circle cx="12" cy="7" r="2.6" /><circle cx="6" cy="16" r="2.6" /><circle cx="18" cy="16" r="2.6" /><path d="M12 9.6v3M10 14.5 8 15M14 14.5l2 .5" /></>,
    farmers: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 5.3A3 3 0 0 1 16 13" /><path d="M21 20c0-2.6-1.7-4.8-4-5.6" /></>,
    products: <><path d="M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M16 9h2.5a2 2 0 0 1 0 4H16" /><path d="M8 3v2M11 3v2" /></>,
    approvals: <><path d="M20 7 10 17l-5-5" /></>,
    messages: <><path d="M4 5h16v12H8l-4 3z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5 19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5 19 5" /></>,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {p[name] ?? null}
    </svg>
  );
}

function Portal({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    coopApi.inboxUnread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);
  useEffect(() => { refreshUnread(); const t = setInterval(refreshUnread, 60000); return () => clearInterval(t); }, [refreshUnread]);

  const nav: [Tab, string, string][] = [
    ['overview', 'overview', 'Overview'],
    ['clusters', 'clusters', 'Clusters'],
    ['farmers', 'farmers', 'Farmers'],
    ['products', 'products', 'Products'],
    ['approvals', 'approvals', 'Loan approvals'],
    ['messages', 'messages', 'Messages'],
    ['settings', 'settings', 'Settings'],
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
              {t === 'messages' && unread > 0 && <span className="badge">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">Cooperative admin</div>
          <button className="btn-signout" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        {tab === 'overview' && <Overview onGo={setTab} />}
        {tab === 'clusters' && <Clusters />}
        {tab === 'farmers' && <Farmers />}
        {tab === 'products' && <Products />}
        {tab === 'approvals' && <Approvals />}
        {tab === 'messages' && <Inbox onRead={refreshUnread} />}
        {tab === 'settings' && <Settings />}
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
  const withLimit = farmers.filter((f) => f.credit_limit_cents != null).length;

  return (
    <>
      <div className="page-head">
        <div><div className="h1">Karibu</div><div className="sub">Your cooperative at a glance</div></div>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="n">{clusters.length}</div><div className="l">Clusters</div></div>
        <div className="stat"><div className="n">{farmers.length}</div><div className="l">Farmers</div></div>
        <div className="stat"><div className="n">{withLimit}</div><div className="l">With credit limit</div></div>
        <div className="stat"><div className="n">{products.length}</div><div className="l">Products</div></div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Getting set up</h3></div>
        <div className="card-body">
          <SetupStep done={products.length > 0} label="Add your products and prices" onGo={() => onGo('products')} />
          <SetupStep done={clusters.length > 0} label="Declare your clusters" onGo={() => onGo('clusters')} />
          <SetupStep done={farmers.length > 0} label="Register your farmers" onGo={() => onGo('farmers')} />
          <SetupStep done={farmers.length > 0} label="Review loan applications as they arrive" onGo={() => onGo('approvals')} last />
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
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  // Head-appointment picker state
  const [pickFor, setPickFor] = useState<Cluster | null>(null);
  const [members, setMembers] = useState<Farmer[]>([]);
  const [chosen, setChosen] = useState('');
  const [savingHead, setSavingHead] = useState(false);

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

  async function openPicker(c: Cluster) {
    setErr(''); setOk(''); setPickFor(c); setChosen(c.head_farmer_id ?? ''); setMembers([]);
    try {
      const f = await coopApi.farmers(c.id);
      setMembers(f.data);
    } catch { setErr('Could not load this cluster\u2019s farmers'); }
  }

  async function saveHead() {
    if (!pickFor || !chosen) return;
    setSavingHead(true); setErr('');
    try {
      await coopApi.appointHead(pickFor.id, chosen);
      const who = members.find((m) => m.id === chosen);
      setOk(`${who?.full_name ?? 'Head'} is now the head of ${pickFor.name}.`);
      setPickFor(null); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not appoint head'); }
    finally { setSavingHead(false); }
  }

  return (
    <>
      <div className="page-head"><div><div className="h1">Clusters</div><div className="sub">The groups your cooperative is organised into</div></div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
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
            <thead><tr><th>Name</th><th>Members</th><th>Cluster head</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{clusters.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>{c.member_count}</td>
                <td>{c.head_name ? <span style={{ fontWeight: 500 }}>{c.head_name}</span> : <span className="muted">Not appointed</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" disabled={c.member_count === 0} onClick={() => openPicker(c)}>
                    {c.head_farmer_id ? 'Change head' : 'Appoint head'}
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {pickFor && (
        <div className="modal-backdrop" onClick={() => setPickFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Appoint head of {pickFor.name}</h3>
            <p className="muted" style={{ fontSize: 13 }}>Choose a farmer from this cluster to be its head.</p>
            {members.length === 0 ? (
              <div className="empty">Loading this cluster's farmers…</div>
            ) : (
              <>
                <div className="field">
                  <label>Cluster head</label>
                  <select className="input" value={chosen} onChange={(e) => setChosen(e.target.value)}>
                    <option value="">— select a farmer —</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}{m.coop_member_no ? ` (${m.coop_member_no})` : ''}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setPickFor(null)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!chosen || savingHead} onClick={saveHead}>{savingHead ? <span className="spin" /> : 'Appoint'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------- Farmers ------------- */
function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [form, setForm] = useState({ fullName: '', clusterName: '', phone: '', nationalId: '', coopMemberNo: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  // CSV import state
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  // Complete-registration modal state
  const [editing, setEditing] = useState<Farmer | null>(null);
  const [editPhone, setEditPhone] = useState(''); const [editId, setEditId] = useState('');
  const [editErr, setEditErr] = useState(''); const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { if (editing) { setEditPhone(''); setEditId(''); setEditErr(''); } }, [editing]);

  async function saveComplete() {
    if (!editing) return;
    setEditErr(''); setSavingEdit(true);
    try {
      const fields: { phone?: string; nationalId?: string } = {};
      if (!editing.phone && editPhone.trim()) fields.phone = editPhone.trim();
      if (!editing.national_id && editId.trim()) fields.nationalId = editId.trim();
      if (!fields.phone && !fields.nationalId) { setEditErr('Enter the missing detail to save.'); setSavingEdit(false); return; }
      await coopApi.updateFarmer(editing.id, fields);
      setEditing(null); load();
    } catch (e) { setEditErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setSavingEdit(false); }
  }

  const load = useCallback(() => {
    Promise.all([coopApi.farmers(), coopApi.clusters()])
      .then(([f, c]) => { setFarmers(f.data); setClusters(c.data); if (!form.clusterName && c.data[0]) setForm((s) => ({ ...s, clusterName: c.data[0].name })); })
      .catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setErr(''); setOk('');
    setBusy(true);
    try {
      await coopApi.addFarmer(form.fullName.trim(), form.clusterName, form.phone.trim() || undefined, form.nationalId.trim() || undefined, form.coopMemberNo.trim() || undefined);
      setOk(`${form.fullName} added`); setForm((s) => ({ ...s, fullName: '', phone: '', nationalId: '', coopMemberNo: '' })); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not add farmer'); }
    finally { setBusy(false); }
  }

  // Parse a CSV (with a header row) into import rows. Accepts common header names.
  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const map: Record<string, string> = {
      'name': 'fullName', 'full name': 'fullName', 'fullname': 'fullName', 'farmer': 'fullName',
      'cluster': 'clusterName', 'cluster name': 'clusterName',
      'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone',
      'id': 'nationalId', 'national id': 'nationalId', 'id number': 'nationalId', 'id no': 'nationalId',
      'member no': 'coopMemberNo', 'member number': 'coopMemberNo', 'member no.': 'coopMemberNo',
    };
    return lines.slice(1).map((line) => {
      const cells = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { const key = map[h]; if (key) row[key] = (cells[i] ?? '').trim(); });
      return row;
    });
  }

  async function onImportFile(file: File | null) {
    if (!file) return;
    setImportErrors([]); setImportMsg(''); setErr(''); setOk('');
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) { setErr('That file had no data rows. Include a header row and at least one farmer.'); return; }
      const res = await coopApi.importFarmers(rows);
      if (res.errors && res.errors.length > 0) {
        setImportErrors(res.errors);
        setImportMsg(`Nothing was imported — ${res.errors.length} row${res.errors.length === 1 ? '' : 's'} need fixing. Correct them and upload again.`);
      } else {
        setOk(`Imported ${res.imported} farmer${res.imported === 1 ? '' : 's'}.`); load();
      }
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not import that file'); }
    finally { setImporting(false); }
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
              <div className="field"><label>Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0712 345 678" /></div>
              <div className="field"><label>National ID</label><input className="input" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} placeholder="12345678" /></div>
              <div className="field"><label>Member no. (optional)</label><input className="input" value={form.coopMemberNo} onChange={(e) => setForm({ ...form, coopMemberNo: e.target.value })} placeholder="ORD-001" /></div>
              <button className="btn btn-primary" disabled={busy || !form.fullName.trim()} onClick={add}>Add farmer</button>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
            Only a name is needed to start. Phone and national ID can be added later — but a farmer's registration must be complete (name, phone, and ID) before they can access loans.
          </p>
        </div>
      </div>

      {clusters.length > 0 && (
        <div className="card">
          <div className="card-head"><h3>Import from a spreadsheet</h3></div>
          <div className="card-body">
            <p className="muted" style={{ fontSize: 13.5, marginBottom: 14 }}>
              Upload a CSV to register many farmers at once. Include a header row with a <strong>Name</strong> column, and optionally
              {' '}<strong>Cluster</strong>, <strong>Phone</strong>, <strong>National ID</strong>, and <strong>Member no</strong>.
              Import whatever you have now — records without a phone or ID come in as <em>incomplete</em>, and you can fill in the rest later.
            </p>
            <input className="input" type="file" accept=".csv" disabled={importing}
              onChange={(e) => { onImportFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
            {importing && <div style={{ marginTop: 10 }}><span className="spin" /> Importing…</div>}
            {importMsg && <div className="err" style={{ marginTop: 12 }}>{importMsg}</div>}
            {importErrors.length > 0 && (
              <table style={{ marginTop: 10 }}>
                <thead><tr><th style={{ width: 70 }}>Row</th><th>What to fix</th></tr></thead>
                <tbody>{importErrors.map((e, i) => (
                  <tr key={i}><td className="muted">{e.row}</td><td>{e.message}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head"><h3>{farmers.length} farmer{farmers.length === 1 ? '' : 's'}</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : farmers.length === 0 ? (
          <div className="empty">No farmers yet.</div>
        ) : (
          <table>
            <thead><tr><th>Name</th><th>Member no.</th><th>Status</th><th>Credit limit</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{farmers.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td className="muted">{f.coop_member_no ?? '—'}</td>
                <td>{f.registration_complete
                  ? <span className="chip chip-green">Complete</span>
                  : <span className="chip chip-amber">Needs {[!f.phone && 'phone', !f.national_id && 'ID'].filter(Boolean).join(' + ')}</span>}</td>
                <td>{f.credit_limit_cents != null ? kes(f.credit_limit_cents) : <span className="muted">not yet set</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  {!f.registration_complete && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(f)}>Complete</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Complete {editing.full_name}'s registration</h3>
            <p className="muted" style={{ fontSize: 13 }}>Add the missing details. A farmer needs a phone and national ID before they can access loans.</p>
            {editErr && <div className="err">{editErr}</div>}
            {!editing.phone && (
              <div className="field"><label>Phone</label><input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="0712 345 678" /></div>
            )}
            {!editing.national_id && (
              <div className="field"><label>National ID</label><input className="input" value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="12345678" /></div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={savingEdit} onClick={saveComplete}>{savingEdit ? <span className="spin" /> : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
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

  const load = useCallback(() => {
    coopApi.farmers().then((f) => setFarmers(f.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="page-head"><div><div className="h1">Loan approvals</div><div className="sub">Review and approve loan applications from your farmers</div></div></div>
      <div className="card">
        <div className="card-head"><h3>Farmers</h3><span className="muted" style={{ fontSize: 13 }}>credit limits are set by Grofunder</span></div>
        {loading ? <div className="empty"><span className="spin" /></div> : farmers.length === 0 ? (
          <div className="empty">No farmers yet. Register farmers first.</div>
        ) : (
          <table>
            <thead><tr><th>Farmer</th><th>Cluster</th><th>Credit limit</th></tr></thead>
            <tbody>{farmers.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td className="muted">{f.cluster_name ?? '—'}</td>
                <td>{f.credit_limit_cents != null ? kes(f.credit_limit_cents) : <span className="muted">not yet set</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        When a farmer submits a loan, it appears here for cooperative approval, then goes to Grofunder for final approval.
        A farmer's credit limit — how much they can borrow — is assessed and set by Grofunder.
      </p>
    </>
  );
}

export type { Loan };

/* ---------- Settings: primary contacts ---------- */
function Settings() {
  const [profile, setProfile] = useState<CoopProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  useEffect(() => {
    coopApi.myProfile().then((p) => {
      setProfile(p);
      setName(p.contact_name ?? ''); setPhone(p.contact_phone ?? ''); setEmail(p.contact_email ?? '');
    }).catch(() => setErr('Could not load your cooperative profile')).finally(() => setLoading(false));
  }, []);

  async function save() {
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await coopApi.updateContacts({ contactName: name, contactPhone: phone, contactEmail: email });
      setPhone(r.contact_phone ?? ''); setEmail(r.contact_email ?? ''); setName(r.contact_name ?? '');
      setOk('Your contact details have been saved.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not save');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="empty"><span className="spin" /></div>;

  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>{profile?.name}{profile?.county ? ` · ${profile.county}` : ''}</p>
      </div>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}

      <div className="card">
        <div className="card-head"><h3>Primary contacts</h3></div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            These are how Grofunder reaches your cooperative with official messages. Keep them up to date.
          </p>
          <div className="field">
            <label>Contact person</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Achieng (Chairperson)" />
          </div>
          <div className="field">
            <label>Primary phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
            <span className="hint">Kenyan number — official SMS will go here.</span>
          </div>
          <div className="field">
            <label>Primary email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cooperative@example.co.ke" />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={save}>
            {busy ? <span className="spin" /> : 'Save contacts'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Inbox: official messages, in the portal ---------- */
function Inbox({ onRead }: { onRead: () => void }) {
  const [msgs, setMsgs] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    coopApi.inbox().then((r) => setMsgs(r.data)).catch(() => setErr('Could not load your messages')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function open(m: InboxMessage) {
    if (!m.readAt) {
      try { await coopApi.markRead(m.id); setMsgs((prev) => prev.map((x) => x.id === m.id ? { ...x, readAt: new Date().toISOString() } : x)); onRead(); } catch { /* ignore */ }
    }
  }
  async function readAll() {
    try { await coopApi.markAllRead(); setMsgs((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() }))); onRead(); } catch { /* ignore */ }
  }

  const unreadCount = msgs.filter((m) => !m.readAt).length;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Messages</h1>
          <p>Official messages from Grofunder{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}</p>
        </div>
        {unreadCount > 0 && <button className="btn btn-ghost btn-sm" onClick={readAll}>Mark all read</button>}
      </div>
      {err && <div className="err">{err}</div>}
      {loading ? <div className="empty"><span className="spin" /></div> : msgs.length === 0 ? (
        <div className="empty">No messages yet. Official messages from Grofunder will appear here.</div>
      ) : (
        <div className="msg-list">
          {msgs.map((m) => (
            <button key={m.id} className={`msg${m.readAt ? '' : ' unread'}`} onClick={() => open(m)}>
              <div className="msg-top">
                <span className="msg-from">{m.sender ?? 'Grofunder'}</span>
                <span className="msg-date">{m.sentAt ? new Date(m.sentAt).toLocaleDateString() : ''}</span>
              </div>
              <div className="msg-body">{m.body}</div>
              {!m.readAt && <span className="msg-dot" aria-label="unread" />}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
