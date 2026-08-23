import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { coopApi, setToken, getToken, kes, ApiError } from './api';
import type { Cluster, Farmer, Product, Loan, CoopProfile, InboxMessage, CaptureTypeState, LedgerFarmer, AudienceGroup, OutreachLogItem, TrashedCluster, MemberNoPattern, TrashedFarmer, TrashedEntry } from './api';
import logo from './assets/grofunder-logo.png';

type Tab = 'overview' | 'clusters' | 'farmers' | 'products' | 'approvals' | 'messages' | 'settings' | string;

/* ---------- Cooperative theming ----------
 * A cooperative picks one accent color; the rest (a darker shade for the
 * sidebar/hover states, a light tint for focus rings) is derived so Settings
 * only ever needs a single color picker. Falls back to Grofunder's own
 * green when a cooperative hasn't set one. */
const DEFAULT_ACCENT = '#09AF0F';

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(c: [number, number, number], target: [number, number, number], amount: number): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(c[i] + (target[i] - c[i]) * amount)) as [number, number, number];
}
function toHex(c: [number, number, number]): string {
  return '#' + c.map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}
function luma([r, g, b]: [number, number, number]): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Restricted to exactly 3 for this testing phase — no custom picker, no
// other presets. Widen this list later once branding is out of testing.
const THEME_PRESETS = [
  { name: 'Grofunder green', hex: '#09AF0F' },
  { name: 'Light blue', hex: '#5B9BD5' },
  { name: 'Light purple', hex: '#9B7FC7' },
];

function applyCoopTheme(hex: string | null | undefined) {
  const base = hexToRgb(hex ?? '') ?? hexToRgb(DEFAULT_ACCENT)!;
  const black: [number, number, number] = [0, 0, 0];
  const white: [number, number, number] = [255, 255, 255];
  const root = document.documentElement.style;

  // The sidebar carries white text on top of this, so it must stay dark
  // enough to read regardless of what's picked — a light gold or pastel
  // shouldn't need extra darkening by hand. Mixing toward black scales luma
  // linearly, so solve for the blend that guarantees a safe max brightness,
  // never going lighter than a sensible minimum darkening (0.42) even for
  // already-dark colors, so the hue still reads as "theirs" rather than near-black.
  const baseLuma = luma(base);
  const targetLuma = 88; // ~out of 255; comfortably dark enough for white text
  const neededBlend = baseLuma > 0 ? 1 - targetLuma / baseLuma : 0.9;
  const deepBlend = Math.max(0.42, Math.min(0.92, neededBlend));

  root.setProperty('--coop-accent', toHex(base));
  root.setProperty('--coop-accent-deep', toHex(mix(base, black, deepBlend)));
  root.setProperty('--coop-accent-tint', toHex(mix(base, white, 0.90)));
  root.setProperty('--coop-accent-pale', toHex(mix(base, white, 0.62)));
}

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
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 8 }}>Your username</p>
          <div style={{ background: 'var(--g-tint)', border: '0.5px solid #CFE9D0', borderRadius: 10, padding: '16px 18px', textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 500, color: 'var(--g-deep)', letterSpacing: '-0.01em' }}>{assignedUsername}</div>
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={continueAfterActivation}>
            {busy ? <span className="spin" /> : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand"><img src={logo} alt="grofunder" /></div>
        <p className="auth-sub">Growing farmers, growing wealth</p>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setErr(''); }}>Sign in</button>
          <button className={mode === 'activate' ? 'active' : ''} onClick={() => { setMode('activate'); setErr(''); }}>Activate</button>
        </div>

        {err && <div className="err">{err}</div>}

        {mode === 'login' && (
          <>
            <div className="field">
              <label>Cooperative username</label>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. Nyawest" autoCapitalize="none" />
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
            </div>
            <div className="field">
              <label>Choose a password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
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
    capture: <><path d="M4 5h16v4H4zM4 11h16v4H4zM4 17h16v2H4z" /></>,
    outreach: <><path d="M3 11l18-8-8 18-2-7-8-3z" /></>,
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
  const [captureTypes, setCaptureTypes] = useState<CaptureTypeState[]>([]);
  const [profile, setProfile] = useState<CoopProfile | null>(null);
  const refreshProfile = useCallback(() => {
    coopApi.myProfile().then(setProfile).catch(() => {});
  }, []);
  const refreshUnread = useCallback(() => {
    coopApi.inboxUnread().then((r) => setUnread(r.count)).catch(() => {});
  }, []);
  const refreshCapture = useCallback(() => {
    coopApi.captureTypes().then((r) => setCaptureTypes(r.data)).catch(() => {});
  }, []);
  useEffect(() => { refreshUnread(); const t = setInterval(refreshUnread, 60000); return () => clearInterval(t); }, [refreshUnread]);
  useEffect(() => { refreshCapture(); }, [refreshCapture]);
  useEffect(() => { refreshProfile(); }, [refreshProfile]);
  // Re-applies the moment the coop saves a new color in Settings, too —
  // profile is the single source of truth for the whole shell's theme.
  useEffect(() => { applyCoopTheme(profile?.theme_color); }, [profile?.theme_color]);

  const enabledCapture = captureTypes.filter((c) => c.enabled);

  // Base nav, then any enabled capture types appear as their own tabs.
  const nav: [Tab, string, string][] = [
    ['overview', 'overview', 'Overview'],
    ['clusters', 'clusters', 'Clusters'],
    ['farmers', 'farmers', 'Farmers'],
    ['products', 'products', 'Products'],
    ['approvals', 'approvals', 'Loan approvals'],
    ...enabledCapture.map((c) => [`capture:${c.type}`, 'capture', c.label] as [Tab, string, string]),
    ['outreach', 'outreach', 'Outreach'],
    ['messages', 'messages', 'Messages'],
    ['settings', 'settings', 'Settings'],
  ];

  const activeCapture = typeof tab === 'string' && tab.startsWith('capture:')
    ? enabledCapture.find((c) => `capture:${c.type}` === tab)
    : null;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><img src={logo} alt="grofunder" /></div>
        {profile?.name && <div className="coop-name">{profile.name}</div>}
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
        {tab === 'outreach' && <Outreach />}
        {tab === 'messages' && <Inbox onRead={refreshUnread} />}
        {tab === 'settings' && <Settings captureTypes={captureTypes} onCaptureChange={refreshCapture} onProfileChange={refreshProfile} />}
        {activeCapture && <CaptureLedger key={activeCapture.type} meta={activeCapture} />}
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
  // Edit modal — one entry point covering rename and delete, so each row only
  // ever shows two buttons ("Change head" and "Edit") instead of three.
  const [editFor, setEditFor] = useState<Cluster | null>(null);
  const [editStep, setEditStep] = useState<'menu' | 'confirm-rename' | 'confirm-delete'>('menu');
  const [renameValue, setRenameValue] = useState('');
  const [renameAgreed, setRenameAgreed] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Trash
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<TrashedCluster[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringId, setRestoringId] = useState('');

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

  // Errors inside the Edit modal need their own state — the page-level err/ok
  // banner renders above the modal in the DOM, which sits invisibly behind
  // the modal's dark overlay while it's open. Whatever goes wrong here has to
  // show up inside the modal itself, or it's effectively never seen.
  const [editErr, setEditErr] = useState('');

  function openEdit(c: Cluster) {
    setErr(''); setOk(''); setEditErr('');
    setEditFor(c); setEditStep('menu');
    setRenameValue(c.name); setRenameAgreed(false);
    setReassignTo(''); setDeleteAgreed(false);
  }
  function closeEdit() {
    if (renaming || deleting) return; // don't let a backdrop click cancel mid-save
    setEditFor(null);
  }

  async function saveRename() {
    if (!editFor) return;
    const trimmed = renameValue.trim();
    setRenaming(true); setEditErr('');
    try {
      await coopApi.renameCluster(editFor.id, trimmed);
      setOk(`Renamed "${editFor.name}" to "${trimmed}". It now shows the new name everywhere — including every farmer in it.`);
      setEditFor(null); load();
    } catch (e) {
      console.error('Cluster rename failed:', e);
      setEditErr(e instanceof ApiError ? e.message : 'Could not rename cluster');
    }
    finally { setRenaming(false); }
  }

  async function confirmDelete() {
    if (!editFor) return;
    const decision = reassignTo ? { reassignToClusterId: reassignTo } : { unassign: true };
    setDeleting(true); setEditErr('');
    try {
      const res = await coopApi.deleteCluster(editFor.id, editFor.member_count > 0 ? decision : undefined);
      if (res.deleted) {
        const moved = res.deleted.reassignedTo
          ? ` Its ${res.deleted.memberCount} farmer${res.deleted.memberCount === 1 ? '' : 's'} moved to "${res.deleted.reassignedTo}".`
          : res.deleted.memberCount > 0
          ? ` Its ${res.deleted.memberCount} farmer${res.deleted.memberCount === 1 ? '' : 's'} are now unassigned.`
          : '';
        setOk(`"${res.deleted.name}" moved to Trash — restorable for 5 days.${moved}`);
        setEditFor(null); load();
      } else if (res.needsDecision) {
        // Rare race: someone joined this cluster after the list loaded.
        setEditFor((f) => f ? { ...f, member_count: res.needsDecision!.memberCount } : f);
        setDeleteAgreed(false);
        setEditErr(`This cluster now has ${res.needsDecision.memberCount} farmer${res.needsDecision.memberCount === 1 ? '' : 's'} — choose where they go, then agree again.`);
      }
    } catch (e) {
      console.error('Cluster delete failed:', e);
      setEditErr(e instanceof ApiError ? e.message : 'Could not delete cluster');
    }
    finally { setDeleting(false); }
  }

  function openTrash() {
    setTrashOpen(true); setTrashLoading(true); setErr(''); setOk('');
    coopApi.clusterTrash().then((r) => setTrash(r.data)).catch(() => setErr('Could not load trash')).finally(() => setTrashLoading(false));
  }
  async function restore(id: string) {
    setRestoringId(id); setErr('');
    try {
      const r = await coopApi.restoreCluster(id);
      setOk(`"${r.name}" restored.`);
      setTrash((t) => t.filter((x) => x.id !== id));
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not restore — it may already be permanently removed'); }
    finally { setRestoringId(''); }
  }

  const otherClusters = clusters.filter((c) => c.id !== editFor?.id);

  return (
    <>
      <div className="page-head">
        <div><div className="h1">Clusters</div><div className="sub">The groups your cooperative is organised into</div></div>
        <button className="btn btn-ghost btn-sm" onClick={openTrash}>Trash</button>
      </div>
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
                  {' '}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
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

      {editFor && (
        <div className="modal-backdrop" onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>

            {editStep === 'menu' && (
              <>
                <h3 style={{ marginTop: 0 }}>Edit "{editFor.name}"</h3>
                {editErr && <div className="err">{editErr}</div>}

                <div className="field">
                  <label>Rename</label>
                  <input className="input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!renameValue.trim() || renameValue.trim() === editFor.name}
                    onClick={() => setEditStep('confirm-rename')}
                  >
                    Rename…
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--clay-ink)', marginBottom: 8 }}>Danger zone</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="muted" style={{ fontSize: 13 }}>Moves this cluster to Trash (restorable for 5 days).</span>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clay-ink)', borderColor: 'var(--clay-line)' }}
                      onClick={() => setEditStep('confirm-delete')}>
                      Delete…
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={closeEdit}>Close</button>
                </div>
              </>
            )}

            {editStep === 'confirm-rename' && (
              <>
                <h3 style={{ marginTop: 0 }}>Confirm rename</h3>
                {editErr && <div className="err">{editErr}</div>}
                <p style={{ fontSize: 13.5 }}>
                  Rename <strong>"{editFor.name}"</strong> to <strong>"{renameValue.trim()}"</strong>?
                  {editFor.member_count > 0
                    ? ` This affects ${editFor.member_count} farmer${editFor.member_count === 1 ? '' : 's'} — they'll all show the new name the moment you proceed.`
                    : ' No farmers are in this cluster yet.'}
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={renameAgreed} onChange={(e) => setRenameAgreed(e.target.checked)} />
                  I agree, rename this cluster
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-ghost" disabled={renaming} onClick={() => setEditStep('menu')}>Back</button>
                  <button className="btn btn-primary" disabled={!renameAgreed || renaming} onClick={saveRename}>
                    {renaming ? <span className="spin" /> : 'Proceed'}
                  </button>
                </div>
              </>
            )}

            {editStep === 'confirm-delete' && (
              <>
                <h3 style={{ marginTop: 0 }}>Confirm delete</h3>
                {editErr && <div className="err">{editErr}</div>}
                {editFor.member_count > 0 && (
                  <>
                    <p style={{ fontSize: 13.5 }}>
                      {editFor.member_count} farmer{editFor.member_count === 1 ? '' : 's'} {editFor.member_count === 1 ? 'is' : 'are'} still in
                      "{editFor.name}". Choose what happens to {editFor.member_count === 1 ? 'them' : 'them'}:
                    </p>
                    <div className="field">
                      <label>Move farmers to</label>
                      <select className="input" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                        <option value="">— leave them unassigned —</option>
                        {otherClusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <p style={{ fontSize: 13.5 }}>
                  {editFor.member_count === 0 && 'This cluster has no farmers. '}
                  It'll move to Trash and can be restored within 5 days — after that it's gone for good.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={deleteAgreed} onChange={(e) => setDeleteAgreed(e.target.checked)} />
                  I agree, delete this cluster
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-ghost" disabled={deleting} onClick={() => setEditStep('menu')}>Back</button>
                  <button className="btn btn-primary" disabled={!deleteAgreed || deleting} onClick={confirmDelete}>
                    {deleting ? <span className="spin" /> : 'Proceed'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {trashOpen && (
        <div className="modal-backdrop" onClick={() => setTrashOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Trash</h3>
            <p className="muted" style={{ fontSize: 13 }}>Deleted clusters stay here for 5 days, then they're permanently removed.</p>
            {trashLoading ? <div className="empty"><span className="spin" /></div> : trash.length === 0 ? (
              <div className="empty">Nothing in the trash.</div>
            ) : (
              <table>
                <thead><tr><th>Name</th><th>Days left</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>{trash.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td className="muted">{t.days_remaining}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" disabled={restoringId === t.id} onClick={() => restore(t.id)}>
                        {restoringId === t.id ? <span className="spin" /> : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setTrashOpen(false)}>Close</button>
            </div>
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
  // Member-number suggestion — prefilled from the cooperative's numbering
  // pattern (manual prefix or detected from existing records), always editable.
  const [suggestedMemberNo, setSuggestedMemberNo] = useState<string | null>(null);
  const [memberNoPrefix, setMemberNoPrefix] = useState<string | null>(null);
  const memberNoWasSuggested = useRef(false);

  const refreshSuggestion = useCallback(() => {
    coopApi.nextMemberNo().then((p) => {
      setSuggestedMemberNo(p.suggested);
      setMemberNoPrefix(p.prefix);
      // Only auto-fill if the field is empty or still holds our last suggestion
      // (never overwrite something the coop typed themselves).
      setForm((s) => {
        if (s.coopMemberNo === '' || memberNoWasSuggested.current) {
          memberNoWasSuggested.current = !!p.suggested;
          return { ...s, coopMemberNo: p.suggested ?? '' };
        }
        return s;
      });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { refreshSuggestion(); }, [refreshSuggestion]);
  // CSV import state
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [importMsg, setImportMsg] = useState('');
  const [importing, setImporting] = useState(false);
  // Complete-registration modal state
  const [editing, setEditing] = useState<Farmer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState(''); const [editId, setEditId] = useState('');
  const [editMemberNo, setEditMemberNo] = useState('');
  const [editErr, setEditErr] = useState(''); const [savingEdit, setSavingEdit] = useState(false);
  // Delete — same two-step "agree then proceed" pattern as clusters. Lives as
  // a second view within the same modal, not a separate one, so it's still
  // one obvious place to go for anything about a given farmer.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAgreed, setDeleteAgreed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Trash — no purge/expiry here (unlike clusters): farmers stay recoverable
  // indefinitely, since a loan or capture record cascading away with a hard
  // delete would be a real, hard-to-undo mistake.
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<TrashedFarmer[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringId, setRestoringId] = useState('');

  // If the cooperative has an established prefix (set manually, or detected
  // from other farmers) and this farmer's number either starts with it or is
  // simply blank, the edit box only ever shows/edits the digits — the prefix
  // is fixed context, not something to retype or risk mistyping. Falls back
  // to a plain full-text box for a farmer whose number doesn't match the
  // current prefix (e.g. an older, differently-formatted number).
  const editSplit = (() => {
    if (!memberNoPrefix) return null;
    const current = editing?.coop_member_no ?? '';
    if (current && !current.startsWith(memberNoPrefix)) return null;
    return { prefix: memberNoPrefix, digits: current.slice(memberNoPrefix.length) };
  })();

  // Pre-fill with what's on record, so the coop can see AND correct it.
  useEffect(() => {
    if (editing) {
      setEditName(editing.full_name ?? '');
      setEditPhone(editing.phone ?? '');
      setEditId(editing.national_id ?? '');
      setEditMemberNo(editSplit ? editSplit.digits : (editing.coop_member_no ?? ''));
      setEditErr('');
      setShowDeleteConfirm(false); setDeleteAgreed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function saveComplete() {
    if (!editing) return;
    setEditErr(''); setSavingEdit(true);
    try {
      // Send only what actually changed. When the field is prefix-locked,
      // rejoin prefix + digits into the one string the backend expects.
      const newMemberNo = editSplit ? (editMemberNo.trim() ? editSplit.prefix + editMemberNo.trim() : '') : editMemberNo.trim();
      const fields: { fullName?: string; phone?: string; nationalId?: string; coopMemberNo?: string } = {};
      if (editName.trim() !== (editing.full_name ?? '')) fields.fullName = editName.trim();
      if (editPhone.trim() !== (editing.phone ?? '')) fields.phone = editPhone.trim();
      if (editId.trim() !== (editing.national_id ?? '')) fields.nationalId = editId.trim();
      if (newMemberNo !== (editing.coop_member_no ?? '')) fields.coopMemberNo = newMemberNo;
      if (Object.keys(fields).length === 0) { setEditing(null); setSavingEdit(false); return; }
      await coopApi.updateFarmer(editing.id, fields);
      setEditing(null); load(); refreshSuggestion();
    } catch (e) { setEditErr(e instanceof ApiError ? e.message : 'Could not save'); }
    finally { setSavingEdit(false); }
  }

  async function confirmDeleteFarmer() {
    if (!editing) return;
    setDeleting(true); setEditErr('');
    try {
      await coopApi.deleteFarmer(editing.id);
      setEditing(null); load(); refreshSuggestion();
    } catch (e) {
      console.error('Delete farmer failed:', e);
      setEditErr(e instanceof ApiError ? e.message : 'Could not delete');
      setShowDeleteConfirm(false); // back to the main view so the error is visible next to the fields, not stranded on a confirm screen
    } finally { setDeleting(false); }
  }

  function openTrash() {
    setTrashOpen(true); setTrashLoading(true); setErr(''); setOk('');
    coopApi.farmerTrash().then((r) => setTrash(r.data)).catch(() => setErr('Could not load trash')).finally(() => setTrashLoading(false));
  }
  async function restore(id: string) {
    setRestoringId(id); setErr('');
    try {
      const r = await coopApi.restoreFarmer(id);
      setOk(`"${r.full_name}" restored.`);
      setTrash((t) => t.filter((x) => x.id !== id));
      load(); refreshSuggestion();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not restore'); }
    finally { setRestoringId(''); }
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
      memberNoWasSuggested.current = false;
      refreshSuggestion();
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
      <div className="page-head">
        <div><div className="h1">Farmers</div><div className="sub">Everyone registered under your cooperative</div></div>
        <button className="btn btn-ghost btn-sm" onClick={openTrash}>Trash</button>
      </div>
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
              <div className="field">
                <label>Member no. {suggestedMemberNo ? '' : '(optional)'}</label>
                <input className="input" value={form.coopMemberNo}
                  onChange={(e) => { memberNoWasSuggested.current = false; setForm({ ...form, coopMemberNo: e.target.value }); }}
                  placeholder="ORD-001" />
                {suggestedMemberNo && form.coopMemberNo === suggestedMemberNo && (
                  <span className="hint">Suggested from your numbering pattern — edit if this one's wrong.</span>
                )}
              </div>
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
              {' '}Rows with no member number get one automatically, continuing your existing numbering (set this in Settings, or leave it to be detected).
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
            <thead><tr><th>Name</th><th>Phone</th><th>Cluster</th><th>Member no.</th><th>Status</th><th>Credit limit</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>{farmers.map((f) => (
              <tr key={f.id}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td>{f.phone ?? <span className="muted">—</span>}</td>
                <td className="muted">{f.cluster_name ?? '—'}</td>
                <td className="muted">{f.coop_member_no ?? '—'}</td>
                <td>{f.registration_complete
                  ? <span className="chip chip-green">Complete</span>
                  : <span className="chip chip-amber">Needs {[!f.phone && 'phone', !f.national_id && 'ID'].filter(Boolean).join(' + ')}</span>}</td>
                <td>{f.credit_limit_cents ? kes(f.credit_limit_cents) : <span className="muted">not yet set</span>}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(f)}>View</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => !deleting && setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {!showDeleteConfirm ? (
              <>
                <h3 style={{ marginTop: 0 }}>Edit farmer</h3>
                <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
                  {editing.cluster_name ?? 'No cluster'}
                  {editing.registration_complete
                    ? ' · Registration complete'
                    : ` · Needs ${[!editing.phone && 'phone', !editing.national_id && 'ID'].filter(Boolean).join(' + ')} before loans`}
                </p>
                {editErr && <div className="err">{editErr}</div>}

                <div className="field">
                  <label>Full name</label>
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. Jane Achieng" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="0712 345 678" />
                </div>
                <div className="field">
                  <label>National ID</label>
                  <input className="input" value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="12345678" />
                </div>
                <div className="field">
                  <label>Member no.</label>
                  {editSplit ? (
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: '10px 0 0 10px',
                        background: 'var(--g-tint2)', border: '1px solid var(--line)', borderRight: 'none',
                        color: 'var(--mut)', fontSize: 14, whiteSpace: 'nowrap',
                      }}>
                        {editSplit.prefix}
                      </div>
                      <input
                        className="input"
                        style={{ borderRadius: '0 10px 10px 0' }}
                        value={editMemberNo}
                        onChange={(e) => setEditMemberNo(e.target.value)}
                        placeholder="003"
                      />
                    </div>
                  ) : (
                    <input className="input" value={editMemberNo} onChange={(e) => setEditMemberNo(e.target.value)} placeholder="ORD-001" />
                  )}
                  {memberNoPrefix && !editSplit && (
                    <span className="hint">Doesn't match your cooperative's prefix ({memberNoPrefix}) — editing the full value.</span>
                  )}
                </div>
                <div className="field">
                  <label>Credit limit</label>
                  <div className="muted" style={{ fontSize: 14, paddingTop: 4 }}>
                    {editing.credit_limit_cents ? kes(editing.credit_limit_cents) : 'Not yet set by Grofunder'}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 4 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--clay-ink)', marginBottom: 8 }}>Danger zone</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="muted" style={{ fontSize: 13 }}>Removes this farmer from your active records.</span>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clay-ink)', borderColor: 'var(--clay-line)' }}
                      onClick={() => { setShowDeleteConfirm(true); setDeleteAgreed(false); setEditErr(''); }}>
                      Delete…
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-ghost" onClick={() => setEditing(null)}>Close</button>
                  <button className="btn btn-primary" disabled={savingEdit || !editName.trim()} onClick={saveComplete}>{savingEdit ? <span className="spin" /> : 'Save changes'}</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>Confirm delete</h3>
                {editErr && <div className="err">{editErr}</div>}
                <p style={{ fontSize: 13.5 }}>
                  Delete <strong>{editing.full_name}</strong>? Their records aren't erased — loan history and past
                  activity stay intact — but they'll no longer show up in your active farmer list, and they'll drop
                  out of any cluster they're currently in.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={deleteAgreed} onChange={(e) => setDeleteAgreed(e.target.checked)} />
                  I agree, delete this farmer
                </label>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button className="btn btn-ghost" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>Back</button>
                  <button className="btn btn-primary" disabled={!deleteAgreed || deleting} onClick={confirmDeleteFarmer}>
                    {deleting ? <span className="spin" /> : 'Proceed'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {trashOpen && (
        <div className="modal-backdrop" onClick={() => setTrashOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Trash</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Deleted farmers stay here indefinitely — nothing is ever permanently removed automatically, since
              loan history and other records are tied to them. Restore anyone who was deleted by mistake.
            </p>
            {trashLoading ? <div className="empty"><span className="spin" /></div> : trash.length === 0 ? (
              <div className="empty">Nothing in the trash.</div>
            ) : (
              <table>
                <thead><tr><th>Name</th><th>Member no.</th><th>Deleted</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>{trash.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.full_name}</td>
                    <td className="muted">{t.coop_member_no ?? '—'}</td>
                    <td className="muted">{t.deleted_at}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" disabled={restoringId === t.id} onClick={() => restore(t.id)}>
                        {restoringId === t.id ? <span className="spin" /> : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setTrashOpen(false)}>Close</button>
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
                <td>{f.credit_limit_cents ? kes(f.credit_limit_cents) : <span className="muted">not yet set</span>}</td>
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
function Settings({ captureTypes, onCaptureChange, onProfileChange }: { captureTypes: CaptureTypeState[]; onCaptureChange: () => void; onProfileChange: () => void }) {
  const [profile, setProfile] = useState<CoopProfile | null>(null);
  const [togglingType, setTogglingType] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  // Branding and Member numbers each get their own feedback state — they're
  // separate cards on a long page, so sharing one message with "Primary
  // contacts" at the top would either duplicate it three times over or leave
  // it invisible wherever the person actually is on the page.
  const [brandErr, setBrandErr] = useState(''); const [brandOk, setBrandOk] = useState('');
  const [prefixErr, setPrefixErr] = useState(''); const [prefixOk, setPrefixOk] = useState('');
  // Member-number prefix
  const [memberNoPrefix, setMemberNoPrefix] = useState('');
  const [savingPrefix, setSavingPrefix] = useState(false);
  const [preview, setPreview] = useState<MemberNoPattern | null>(null);
  // Branding
  const [themeColor, setThemeColor] = useState(DEFAULT_ACCENT);
  const [savingTheme, setSavingTheme] = useState(false);
  const lastSavedTheme = useRef(DEFAULT_ACCENT);

  const loadPreview = useCallback(() => {
    coopApi.nextMemberNo().then(setPreview).catch(() => {});
  }, []);

  useEffect(() => {
    coopApi.myProfile().then((p) => {
      setProfile(p);
      setName(p.contact_name ?? ''); setPhone(p.contact_phone ?? ''); setEmail(p.contact_email ?? '');
      setMemberNoPrefix(p.member_no_prefix ?? '');
      setThemeColor(p.theme_color ?? DEFAULT_ACCENT);
      lastSavedTheme.current = p.theme_color ?? DEFAULT_ACCENT;
    }).catch(() => setErr('Could not load your cooperative profile')).finally(() => setLoading(false));
    loadPreview();
  }, [loadPreview]);

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

  async function savePrefix() {
    setSavingPrefix(true); setPrefixErr(''); setPrefixOk('');
    try {
      const r = await coopApi.updateMemberNoPrefix(memberNoPrefix.trim() || null);
      setMemberNoPrefix(r.member_no_prefix ?? '');
      setPrefixOk(r.member_no_prefix
        ? `New member numbers will now start with "${r.member_no_prefix}".`
        : 'Cleared — member numbers will go back to being detected from your existing records.');
      loadPreview();
    } catch (e) {
      console.error('Save member number prefix failed:', e);
      setPrefixErr(e instanceof ApiError ? e.message : 'Could not save');
    } finally { setSavingPrefix(false); }
  }

  async function saveTheme(color: string) {
    setSavingTheme(true); setBrandErr(''); setBrandOk('');
    try {
      const r = await coopApi.updateTheme(color);
      setProfile((p) => p ? { ...p, theme_color: r.theme_color } : p);
      lastSavedTheme.current = r.theme_color ?? DEFAULT_ACCENT;
      setBrandOk('Saved — that\u2019s now live across the portal for everyone at your cooperative.');
      onProfileChange();
    } catch (e) {
      console.error('Save theme color failed:', e);
      setBrandErr(e instanceof ApiError ? e.message : 'Could not save');
      applyCoopTheme(lastSavedTheme.current); // the preview got ahead of reality — pull it back
    } finally { setSavingTheme(false); }
  }

  async function resetTheme() {
    setThemeColor(DEFAULT_ACCENT);
    setSavingTheme(true); setBrandErr(''); setBrandOk('');
    try {
      await coopApi.updateTheme(null);
      setProfile((p) => p ? { ...p, theme_color: null } : p);
      lastSavedTheme.current = DEFAULT_ACCENT;
      setBrandOk('Back to the default Grofunder green.');
      onProfileChange();
    } catch (e) {
      console.error('Reset theme color failed:', e);
      setBrandErr(e instanceof ApiError ? e.message : 'Could not save');
    } finally { setSavingTheme(false); }
  }

  // Live preview: apply instantly to the real sidebar/buttons as they pick,
  // so what they see while choosing is exactly what they'll get — no mockup,
  // no guessing from a hex code. Picking is cheap; only Save persists it.
  function previewTheme(color: string) {
    setThemeColor(color);
    applyCoopTheme(color);
  }

  // Leaving Settings (tab switch, sign-out) without saving reverts the live
  // preview back to what's actually on record, so nothing *looks* saved that
  // isn't — the rest of the app shouldn't be left showing an unsaved pick.
  // (Cleanup must run only on unmount, not on every pick — hence the ref.)
  const themeColorRef = useRef(themeColor);
  useEffect(() => { themeColorRef.current = themeColor; }, [themeColor]);
  useEffect(() => () => {
    if (themeColorRef.current !== lastSavedTheme.current) applyCoopTheme(lastSavedTheme.current);
  }, []);

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

      <div className="card">
        <div className="card-head"><h3>Branding</h3></div>
        <div className="card-body">
          {brandErr && <div className="err">{brandErr}</div>}
          {brandOk && <div className="ok">{brandOk}</div>}
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            Pick a color and watch the sidebar on the left change right now — that's exactly what your farmers'
            officers and staff will see. Nothing saves until you click "Save color".
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {THEME_PRESETS.map((p) => (
              <button
                key={p.hex}
                onClick={() => previewTheme(p.hex)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer',
                  borderRadius: 10, background: '#fff',
                  border: themeColor.toUpperCase() === p.hex ? '2px solid var(--ink)' : '1px solid var(--line)',
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 6, background: p.hex, flexShrink: 0 }} />
                <span style={{ fontSize: 13.5, fontWeight: themeColor.toUpperCase() === p.hex ? 600 : 400 }}>{p.name}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13.5 }}>{profile?.name}</div>
              <div className="muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>{themeColor.toUpperCase()}</div>
            </div>
            <button className="btn btn-primary btn-sm" disabled={savingTheme || themeColor === lastSavedTheme.current} onClick={() => saveTheme(themeColor)}>
              {savingTheme ? <span className="spin" /> : 'Save color'}
            </button>
            {profile?.theme_color && (
              <button className="btn btn-ghost btn-sm" disabled={savingTheme} onClick={resetTheme}>
                Reset to Grofunder green
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Member numbers</h3></div>
        <div className="card-body">
          {prefixErr && <div className="err">{prefixErr}</div>}
          {prefixOk && <div className="ok">{prefixOk}</div>}
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            Set a prefix and new farmers get their member number suggested automatically — e.g. "GFA-OFCS" gives
            {' '}GFA-OFCS101, GFA-OFCS102, and so on. Leave this blank and Grofunder will detect a pattern from your
            existing records instead.
          </p>
          <div className="field">
            <label>Member number prefix</label>
            <input className="input" value={memberNoPrefix} onChange={(e) => setMemberNoPrefix(e.target.value)} placeholder="e.g. GFA-OFCS" />
            {preview && (
              <span className="hint">
                {preview.source === 'MANUAL' && preview.suggested && `Next up: ${preview.suggested}`}
                {preview.source === 'DETECTED' && preview.suggested && `Detected from your records — next up: ${preview.suggested}`}
                {preview.source === 'NONE' && 'No pattern yet — the first member number you set will start one.'}
              </span>
            )}
          </div>
          <button className="btn btn-primary" disabled={savingPrefix} onClick={savePrefix}>
            {savingPrefix ? <span className="spin" /> : 'Save prefix'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>What you capture</h3></div>
        <div className="card-body">
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
            Turn on the kinds of records your cooperative keeps. Each one you enable adds its own tab where you can record entries per farmer.
          </p>
          {captureTypes.map((c) => (
            <div key={c.type} className="toggle-row">
              <div>
                <div style={{ fontWeight: 500 }}>{c.label}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>Recorded in {c.unit === 'kg' ? 'kilograms' : 'Kenyan shillings'}</div>
              </div>
              <button
                className={`switch${c.enabled ? ' on' : ''}`}
                disabled={togglingType === c.type}
                onClick={async () => {
                  setTogglingType(c.type);
                  try { await coopApi.setCaptureType(c.type, !c.enabled); onCaptureChange(); }
                  catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not update'); }
                  finally { setTogglingType(''); }
                }}
                aria-pressed={c.enabled}
              ><span className="knob" /></button>
            </div>
          ))}
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

/* ---------- Capture ledger (generated per enabled type) ---------- */
function CaptureLedger({ meta }: { meta: CaptureTypeState }) {
  const [rows, setRows] = useState<LedgerFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  // Delete — a lighter inline confirm rather than a full modal, since this is
  // a small, frequent action on a single dated entry, not "delete a cluster"
  // or "delete a farmer". Still requires a deliberate second click though —
  // never a single click away from gone. Fully recoverable either way (trash
  // below), same as everywhere else in the app.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Trash
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<TrashedEntry[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [restoringId, setRestoringId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    coopApi.ledger(meta.type).then((r) => setRows(r.data)).catch(() => setErr('Could not load this ledger')).finally(() => setLoading(false));
  }, [meta.type]);
  useEffect(() => { load(); }, [load]);

  const factor = meta.unit === 'kg' ? 1000 : 100;
  const fmt = (units: number) => {
    const major = units / factor;
    return meta.unit === 'kg' ? `${major.toLocaleString()} kg` : `KES ${major.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  function openAdd(farmerId: string) {
    setAddingFor(farmerId); setEntryDate(today); setAmount(''); setErr('');
  }

  async function saveEntry() {
    if (!addingFor) return;
    const n = Number(amount);
    if (!(n > 0)) { setErr('Enter an amount greater than zero.'); return; }
    setSaving(true); setErr('');
    try {
      await coopApi.addEntry(meta.type, addingFor, entryDate, n);
      setAddingFor(null); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not save entry'); }
    finally { setSaving(false); }
  }

  async function confirmDelete(id: string) {
    setDeletingId(id); setErr('');
    try {
      await coopApi.deleteEntry(meta.type, id);
      setConfirmDeleteId(null); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not delete entry'); }
    finally { setDeletingId(null); }
  }

  function openTrash() {
    setTrashOpen(true); setTrashLoading(true); setErr('');
    coopApi.entryTrash(meta.type).then((r) => setTrash(r.data)).catch(() => setErr('Could not load trash')).finally(() => setTrashLoading(false));
  }
  async function restore(id: string) {
    setRestoringId(id); setErr('');
    try {
      await coopApi.restoreEntry(meta.type, id);
      setTrash((t) => t.filter((x) => x.id !== id));
      load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not restore'); }
    finally { setRestoringId(''); }
  }

  return (
    <>
      <div className="page-head">
        <div><div className="h1">{meta.label}</div><div className="sub">Record {meta.label.toLowerCase()} per farmer — entries add up over time</div></div>
        <button className="btn btn-ghost btn-sm" onClick={openTrash}>Trash</button>
      </div>
      {err && <div className="err">{err}</div>}
      {loading ? <div className="empty"><span className="spin" /></div> : rows.length === 0 ? (
        <div className="empty">No farmers yet. Register farmers first, then record their {meta.label.toLowerCase()} here.</div>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Farmer</th><th>Cluster</th><th>Entries</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
            <tbody>{rows.map((f) => (
              <tr key={f.farmer_id} style={{ verticalAlign: 'top' }}>
                <td style={{ fontWeight: 500 }}>{f.full_name}</td>
                <td className="muted">{f.cluster_name ?? '—'}</td>
                <td>
                  {f.entries.length === 0 ? <span className="muted">No entries yet</span> : (
                    <div className="entry-chips">
                      {f.entries.map((e) => (
                        confirmDeleteId === e.id ? (
                          <span key={e.id} className="entry-chip" style={{ background: 'var(--clay-tint)', color: 'var(--clay-ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            Delete this entry?
                            <button
                              disabled={deletingId === e.id}
                              onClick={() => confirmDelete(e.id)}
                              style={{ border: 'none', background: 'var(--clay)', color: '#fff', borderRadius: 4, fontSize: 11, padding: '2px 7px', cursor: 'pointer' }}
                            >
                              {deletingId === e.id ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ border: '1px solid var(--clay-line)', background: 'none', color: 'var(--clay-ink)', borderRadius: 4, fontSize: 11, padding: '2px 7px', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <span key={e.id} className="entry-chip">
                            {e.entry_date} · {fmt(e.amount_units)}
                            <button
                              title="Delete this entry"
                              onClick={() => setConfirmDeleteId(e.id)}
                              style={{ marginLeft: 6, border: 'none', background: 'none', color: 'var(--mut)', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, verticalAlign: 'middle' }}
                            >
                              ×
                            </button>
                          </span>
                        )
                      ))}
                    </div>
                  )}
                  {addingFor === f.farmer_id && (
                    <div className="entry-add">
                      <input className="input" type="date" value={entryDate} onChange={(ev) => setEntryDate(ev.target.value)} style={{ width: 'auto' }} />
                      <input className="input" type="number" min="0" step="any" value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder={meta.amountLabel} style={{ width: 140 }} />
                      <button className="btn btn-primary btn-sm" disabled={saving} onClick={saveEntry}>{saving ? <span className="spin" /> : 'Save'}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setAddingFor(null)}>Cancel</button>
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(f.total_units)}</td>
                <td style={{ textAlign: 'right' }}>
                  {addingFor !== f.farmer_id && (
                    <button className="btn-add" title={`Add ${meta.label.toLowerCase()} entry`} onClick={() => openAdd(f.farmer_id)}>+</button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {trashOpen && (
        <div className="modal-backdrop" onClick={() => setTrashOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Trash — {meta.label}</h3>
            <p className="muted" style={{ fontSize: 13 }}>
              Deleted entries stay here indefinitely — nothing is ever permanently removed automatically.
            </p>
            {trashLoading ? <div className="empty"><span className="spin" /></div> : trash.length === 0 ? (
              <div className="empty">Nothing in the trash.</div>
            ) : (
              <table>
                <thead><tr><th>Farmer</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>{trash.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.full_name}</td>
                    <td className="muted">{t.entry_date}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(t.amount_units)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" disabled={restoringId === t.id} onClick={() => restore(t.id)}>
                        {restoringId === t.id ? <span className="spin" /> : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setTrashOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Outreach: coop messages its own farmers ---------- */
function Outreach() {
  const [audiences, setAudiences] = useState<{ clusters: AudienceGroup[]; circles: AudienceGroup[] }>({ clusters: [], circles: [] });
  const [log, setLog] = useState<OutreachLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState('ALL_MY_FARMERS');
  const [ref, setRef] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    Promise.all([coopApi.outreachAudiences(), coopApi.outreachLog()])
      .then(([a, l]) => { setAudiences({ clusters: a.clusters, circles: a.circles }); setLog(l.data); })
      .catch(() => setErr('Could not load outreach')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function pickAudience(a: string) { setAudience(a); setRef(''); }

  const needsRef = audience === 'MY_CLUSTER' || audience === 'MY_CIRCLE';
  const refOptions = audience === 'MY_CLUSTER' ? audiences.clusters : audience === 'MY_CIRCLE' ? audiences.circles : [];

  async function send() {
    setErr(''); setOk('');
    if (needsRef && !ref) { setErr(`Choose a ${audience === 'MY_CLUSTER' ? 'cluster' : 'circle'}.`); return; }
    if (!body.trim()) { setErr('Write a message to send.'); return; }
    setSending(true);
    try {
      const r = await coopApi.sendOutreach(audience, body.trim(), needsRef ? ref : undefined);
      let msg = `Sent to ${r.sentCount} farmer${r.sentCount === 1 ? '' : 's'}.`;
      if (r.skippedNoPhone > 0) msg += ` ${r.skippedNoPhone} have no phone number yet — they'll see it in the farmer app.`;
      if (r.failedCount > 0) msg += ` ${r.failedCount} failed to deliver by SMS.`;
      setOk(msg); setBody(''); load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not send'); }
    finally { setSending(false); }
  }

  const audienceLabel = (a: string, r: string | null) => {
    if (a === 'ALL_MY_FARMERS') return 'All my farmers';
    if (a === 'MY_CLUSTER') return `Cluster: ${audiences.clusters.find((c) => c.id === r)?.name ?? '—'}`;
    if (a === 'MY_CIRCLE') return `Circle: ${audiences.circles.find((c) => c.id === r)?.name ?? '—'}`;
    return a;
  };

  return (
    <>
      <div className="page-head"><div><div className="h1">Outreach</div><div className="sub">Send a message to your farmers</div></div></div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      <div className="card">
        <div className="card-head"><h3>New message</h3></div>
        <div className="card-body">
          <div className="field">
            <label>Send to</label>
            <select className="input" value={audience} onChange={(e) => pickAudience(e.target.value)}>
              <option value="ALL_MY_FARMERS">All my farmers</option>
              <option value="MY_CLUSTER">A cluster</option>
              <option value="MY_CIRCLE">A circle</option>
            </select>
          </div>
          {needsRef && (
            <div className="field">
              <label>{audience === 'MY_CLUSTER' ? 'Which cluster' : 'Which circle'}</label>
              <select className="input" value={ref} onChange={(e) => setRef(e.target.value)}>
                <option value="">— select —</option>
                {refOptions.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.member_count})</option>)}
              </select>
              {audience === 'MY_CIRCLE' && <span className="hint">Circles are formed by farmers. You can see them here to reach out.</span>}
            </div>
          )}
          <div className="field">
            <label>Message</label>
            <textarea className="input" rows={4} maxLength={800} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Bring your cherry to the collection point on Thursday." />
            <span className="hint">{body.length}/800 · Farmers see this in the farmer app, and by SMS where a number is on record.</span>
          </div>
          <button className="btn btn-primary" disabled={sending} onClick={send}>{sending ? <span className="spin" /> : 'Send message'}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Sent messages</h3></div>
        {loading ? <div className="empty"><span className="spin" /></div> : log.length === 0 ? (
          <div className="empty">No messages sent yet.</div>
        ) : (
          <table>
            <thead><tr><th>When</th><th>To</th><th>Message</th><th style={{ textAlign: 'right' }}>Reached</th></tr></thead>
            <tbody>{log.map((m) => (
              <tr key={m.id} style={{ verticalAlign: 'top' }}>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>{m.sent_at}</td>
                <td>{audienceLabel(m.audience, m.audience_ref)}</td>
                <td>{m.body}</td>
                <td style={{ textAlign: 'right' }}>{m.sent_count}{m.failed_count > 0 && <span className="muted"> (+{m.failed_count} failed)</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
