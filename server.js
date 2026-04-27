const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.1.0';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL || 'https://verify.qrv.network';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.qrv.network';
const REGISTRY_BASE_URL = process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network';

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ title = 'QR-V Issuer Portal', active = 'dashboard', body }) {
  const nav = [
    ['dashboard', '/', 'Dashboard'],
    ['records', '/records', 'Records'],
    ['create', '/records/new', 'Create Record'],
    ['api', '/api-keys', 'API Keys'],
    ['settings', '/settings', 'Settings']
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--bg:#07111f;--panel:#0f1b2d;--panel2:#111f35;--line:#263a5c;--text:#eef6ff;--muted:#a9bdd8;--accent:#2fb7ff;--gold:#f2d06b;--good:#21c978;--warn:#f5b342}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top left,#12345e 0,#07111f 42%,#030712 100%);color:var(--text);min-height:100vh}.shell{display:grid;grid-template-columns:270px 1fr;min-height:100vh}.side{border-right:1px solid var(--line);background:rgba(7,17,31,.92);padding:24px;position:sticky;top:0;height:100vh}.brand{font-weight:900;font-size:22px;letter-spacing:-.02em}.tag{color:var(--muted);font-size:13px;line-height:1.5;margin-top:6px}.nav{display:grid;gap:8px;margin-top:28px}.nav a{color:var(--muted);text-decoration:none;padding:12px 14px;border-radius:14px;border:1px solid transparent}.nav a.active,.nav a:hover{color:#fff;background:rgba(47,183,255,.12);border-color:rgba(47,183,255,.22)}.main{padding:28px;max-width:1240px}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:24px}.eyebrow{color:var(--gold);font-weight:900;letter-spacing:.12em;text-transform:uppercase;font-size:12px}.h1{font-size:clamp(34px,5vw,58px);line-height:1.03;margin:8px 0 0}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.grid2{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}.card{background:rgba(15,27,45,.88);border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.22)}.stat{font-size:34px;font-weight:900;margin-top:8px}.pill{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(47,183,255,.25);background:rgba(47,183,255,.10);border-radius:999px;padding:8px 12px;color:#d8efff;font-weight:800;font-size:13px}.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;background:linear-gradient(180deg,#37c4ff,#1677ff);color:#fff;text-decoration:none;font-weight:900;padding:13px 16px;cursor:pointer}.btn.secondary{background:transparent;border:1px solid var(--line);color:#dcecff}.table{width:100%;border-collapse:collapse}.table th,.table td{text-align:left;padding:13px 10px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}.table th{color:#9fb7d6;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.status{font-weight:900;border-radius:999px;padding:6px 10px;display:inline-block;font-size:12px}.VERIFIED{background:rgba(33,201,120,.16);color:#c9ffe4}.DRAFT{background:rgba(245,179,66,.16);color:#ffe6b8}.REVOKED{background:rgba(239,68,68,.16);color:#ffd0d0}input,select,textarea{width:100%;padding:13px 14px;border-radius:14px;border:1px solid var(--line);background:#081426;color:var(--text);font-size:15px}label{display:block;font-weight:800;margin:0 0 8px;color:#dcecff}.field{margin-bottom:14px}.footer{margin-top:24px;color:#7f97b7;font-size:13px}@media(max-width:900px){.shell{grid-template-columns:1fr}.side{height:auto;position:relative}.grid,.grid2{grid-template-columns:1fr}.top{display:block}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="brand">QR-V™ Issuer</div>
      <div class="tag">Issuer control shell for creating, managing, and monitoring registry-backed verification records.</div>
      <nav class="nav">${nav.map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
      <div class="footer">API: ${escapeHtml(API_BASE_URL)}<br>Registry: ${escapeHtml(REGISTRY_BASE_URL)}<br>Version: ${escapeHtml(VERSION)}</div>
    </aside>
    <main class="main">${body}</main>
  </div>
</body>
</html>`;
}

const demoRecords = [
  { qrvid: 'QRV-DEMO-001', type: 'Certificate', title: 'QR-V Demo Verified Certificate', subject: 'Demo Certificate Holder', status: 'VERIFIED' },
  { qrvid: 'QRV-DEMO-002', type: 'Product', title: 'QR-V Demo Product Authentication', subject: 'Demo Product Serial PRD-0002', status: 'VERIFIED' },
  { qrvid: 'QRV-DEMO-003', type: 'Membership', title: 'QR-V Demo Membership Credential', subject: 'Demo Member M-0003', status: 'VERIFIED' }
];

function renderDashboard() {
  return layout({
    active: 'dashboard',
    body: `<section class="top"><div><div class="eyebrow">Issuer Dashboard Shell</div><h1 class="h1">Manage QR-V™ records from one control plane.</h1><p class="muted">This production shell replaces the placeholder login and establishes the issuer operating surface. Authentication, database-backed issuance, billing, and audit events can now be attached behind this UI.</p></div><div><span class="pill">Issuer Portal Online</span></div></section>
    <section class="grid">
      <div class="card"><div class="muted">Issued Records</div><div class="stat">3</div></div>
      <div class="card"><div class="muted">Verified</div><div class="stat">3</div></div>
      <div class="card"><div class="muted">Revoked</div><div class="stat">0</div></div>
      <div class="card"><div class="muted">API Mode</div><div class="stat">V1</div></div>
    </section>
    <section class="grid2" style="margin-top:16px">
      <div class="card"><h2>Recent Records</h2>${recordsTable()}</div>
      <div class="card"><h2>Next Setup Steps</h2><ol class="muted"><li>Attach issuer authentication/session provider.</li><li>Connect create form to API/registry write path.</li><li>Add Stripe plan gating and usage metering.</li><li>Add audit log and revocation controls.</li></ol><p><a class="btn" href="/records/new">Create record</a></p></div>
    </section>`
  });
}

function recordsTable() {
  return `<table class="table"><thead><tr><th>QRVID</th><th>Type</th><th>Subject</th><th>Status</th><th>Verify</th></tr></thead><tbody>${demoRecords.map((record) => `<tr><td><code>${escapeHtml(record.qrvid)}</code></td><td>${escapeHtml(record.type)}</td><td>${escapeHtml(record.subject)}</td><td><span class="status ${record.status}">${record.status}</span></td><td><a href="${VERIFY_BASE_URL}/${encodeURIComponent(record.qrvid)}" target="_blank" rel="noopener">Open</a></td></tr>`).join('')}</tbody></table>`;
}

function renderRecords() {
  return layout({ active: 'records', title: 'QR-V Issuer Records', body: `<section class="top"><div><div class="eyebrow">Records</div><h1 class="h1">Issuer Records</h1><p class="muted">Registry-backed records managed by this issuer. Demo records are shown until the database write path is connected.</p></div><a class="btn" href="/records/new">Create Record</a></section><div class="card">${recordsTable()}</div>` });
}

function renderCreateRecord() {
  return layout({
    active: 'create',
    title: 'Create QR-V Record',
    body: `<section class="top"><div><div class="eyebrow">Create</div><h1 class="h1">Create QR-V™ Record</h1><p class="muted">This shell validates the issuer workflow and is ready to connect to the live registry creation endpoint.</p></div></section><section class="card"><form method="post" action="/records/preview"><div class="field"><label>Record Type</label><select name="type"><option>Certificate</option><option>Product</option><option>Membership</option><option>Document</option><option>Identity</option></select></div><div class="field"><label>Title</label><input name="title" placeholder="Advanced Safety Certification" required></div><div class="field"><label>Subject / Holder</label><input name="subject" placeholder="Jane Smith" required></div><div class="field"><label>Issuer</label><input name="issuer" placeholder="Example Issuer" required></div><div class="field"><label>Description</label><textarea name="description" rows="4" placeholder="Public verification description"></textarea></div><button class="btn" type="submit">Preview Record</button></form></section>`
  });
}

function renderPreview(body) {
  const qrvid = `QRV-DRAFT-${Date.now()}`;
  return layout({ active: 'create', title: 'QR-V Record Preview', body: `<section class="top"><div><div class="eyebrow">Preview</div><h1 class="h1">Draft Record Preview</h1><p class="muted">This preview demonstrates the issuance payload before registry persistence is enabled.</p></div></section><section class="card"><p><span class="status DRAFT">DRAFT</span></p><table class="table"><tbody><tr><th>QRVID</th><td><code>${escapeHtml(qrvid)}</code></td></tr><tr><th>Type</th><td>${escapeHtml(body.type)}</td></tr><tr><th>Title</th><td>${escapeHtml(body.title)}</td></tr><tr><th>Subject</th><td>${escapeHtml(body.subject)}</td></tr><tr><th>Issuer</th><td>${escapeHtml(body.issuer)}</td></tr><tr><th>Description</th><td>${escapeHtml(body.description)}</td></tr></tbody></table><p><a class="btn" href="/records/new">Create another</a> <a class="btn secondary" href="/records">Back to records</a></p></section>` });
}

function renderApiKeys() {
  return layout({ active: 'api', title: 'Issuer API Keys', body: `<section class="top"><div><div class="eyebrow">API Keys</div><h1 class="h1">Issuer API Access</h1><p class="muted">API key management shell for future create, revoke, and usage-metered integrations.</p></div></section><section class="card"><p><span class="pill">No live keys displayed</span></p><p class="muted">Production implementation should store only hashed API keys, show key prefixes, and support revoke/rotate workflows.</p><button class="btn" disabled>Create API Key</button></section>` });
}

function renderSettings() {
  return layout({ active: 'settings', title: 'Issuer Settings', body: `<section class="top"><div><div class="eyebrow">Settings</div><h1 class="h1">Issuer Settings</h1><p class="muted">Organization profile, verification branding, billing plan, and webhook settings.</p></div></section><section class="card"><table class="table"><tbody><tr><th>Issuer</th><td>QR-V Demo Issuer</td></tr><tr><th>Plan</th><td>Starter / Demo</td></tr><tr><th>Webhook</th><td>Not configured</td></tr><tr><th>Branding</th><td>Default QR-V branding</td></tr></tbody></table></section>` });
}

app.get('/', (_req, res) => res.type('html').send(renderDashboard()));
app.get('/dashboard', (_req, res) => res.redirect(302, '/'));
app.get('/records', (_req, res) => res.type('html').send(renderRecords()));
app.get('/records/new', (_req, res) => res.type('html').send(renderCreateRecord()));
app.post('/records/preview', (req, res) => res.type('html').send(renderPreview(req.body || {})));
app.get('/api-keys', (_req, res) => res.type('html').send(renderApiKeys()));
app.get('/settings', (_req, res) => res.type('html').send(renderSettings()));

app.get('/healthz', (_req, res) => res.json({ ok: true, status: 'ok', service: 'issuer-qrv', version: VERSION }));
app.get('/readyz', (_req, res) => res.json({ ok: true, ready: true, service: 'issuer-qrv', version: VERSION }));
app.get('/version', (_req, res) => res.json({ ok: true, service: 'issuer-qrv', version: VERSION }));

app.use((req, res) => {
  res.status(404).type('html').send(layout({ title: 'Issuer Portal Not Found', body: `<section class="card"><h1>Issuer Portal Route Not Found</h1><p class="muted">The route <code>${escapeHtml(req.path)}</code> does not exist.</p><p><a class="btn" href="/">Back to dashboard</a></p></section>` }));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`issuer-qrv listening on 0.0.0.0:${PORT}`);
});
