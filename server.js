const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';
const REGISTRY_BASE_URL = (process.env.REGISTRY_BASE_URL || 'https://registry.qrv.network').replace(/\/$/, '');
const ISSUER_NAME = process.env.ISSUER_NAME || 'issuer.qrv.network';

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

const recentRecords = [];
const leadTargets = [
  'schools',
  'online course creators',
  'supplement brands',
  'ticket sellers',
  'ecommerce stores',
  'coaches'
];
const leads = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shellLayout({ title, active, body }) {
  const nav = [
    ['dashboard', '/', 'Dashboard'],
    ['records', '/records', 'Records'],
    ['create', '/records/new', 'Create Record'],
    ['leads', '/leads', 'Leads'],
    ['create-lead', '/leads/new', 'Create Lead'],
    ['api-keys', '/api-keys', 'API Keys'],
    ['settings', '/settings', 'Settings']
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--bg:#07111f;--panel:#0f1b2d;--line:#263a5c;--text:#eef6ff;--muted:#a9bdd8;--accent:#2fb7ff;--gold:#f2d06b;--good:#21c978;--bad:#ef4444}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top left,#12345e 0,#07111f 42%,#030712 100%);color:var(--text)}
    .shell{display:grid;grid-template-columns:270px 1fr;min-height:100vh}
    .side{border-right:1px solid var(--line);background:rgba(7,17,31,.92);padding:24px;position:sticky;top:0;height:100vh}
    .brand{font-weight:900;font-size:22px;letter-spacing:-.02em}.tag{color:var(--muted);font-size:13px;line-height:1.5;margin-top:6px}
    .nav{display:grid;gap:8px;margin-top:28px}.nav a{color:var(--muted);text-decoration:none;padding:12px 14px;border-radius:14px;border:1px solid transparent}
    .nav a.active,.nav a:hover{color:#fff;background:rgba(47,183,255,.12);border-color:rgba(47,183,255,.22)}
    .main{padding:28px;max-width:1200px}.card{background:rgba(15,27,45,.88);border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.22)}
    h1{margin:0 0 12px}.muted{color:var(--muted)}.stack{display:grid;gap:16px}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    label{display:block;font-weight:700;margin-bottom:6px}input,textarea,select{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:#081426;color:var(--text)}
    button,.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;background:linear-gradient(180deg,#37c4ff,#1677ff);color:#fff;text-decoration:none;font-weight:800;padding:12px 14px;cursor:pointer}
    .btn.secondary{background:transparent;border:1px solid var(--line);color:#dcecff}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
    th{color:#9fb7d6;text-transform:uppercase;font-size:12px;letter-spacing:.08em}.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(255,255,255,.06);padding:2px 6px;border-radius:6px}
    .ok{color:var(--good)}.bad{color:var(--bad)}
    @media(max-width:900px){.shell{grid-template-columns:1fr}.side{height:auto;position:relative}.row{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="brand">QR-V™ Issuer</div>
      <div class="tag">Issuer portal for creating registry-backed verifiable records.</div>
      <nav class="nav">${nav.map(([key, href, label]) => `<a class="${active === key ? 'active' : ''}" href="${href}">${label}</a>`).join('')}</nav>
      <div class="tag" style="margin-top:24px">Registry: ${escapeHtml(REGISTRY_BASE_URL)}<br/>Version: ${escapeHtml(VERSION)}</div>
    </aside>
    <main class="main stack">${body}</main>
  </div>
</body>
</html>`;
}

function recordForm(prefill = {}, error = '') {
  return `<div class="card">
    <h1>Create Record</h1>
    <p class="muted">Issue a new verifiable record on <span class="code">registry.qrv.network</span>.</p>
    ${error ? `<p class="bad"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
    <form method="post" action="/records/create" class="stack">
      <div class="row">
        <div>
          <label for="recordType">Record Type</label>
          <input id="recordType" name="recordType" required value="${escapeHtml(prefill.recordType || 'certificate')}" />
        </div>
        <div>
          <label for="visibility">Visibility</label>
          <select id="visibility" name="visibility" required>
            ${['public', 'private', 'restricted'].map((v) => `<option value="${v}" ${prefill.visibility === v || (!prefill.visibility && v === 'public') ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row">
        <div>
          <label for="title">Title</label>
          <input id="title" name="title" required value="${escapeHtml(prefill.title || '')}" />
        </div>
        <div>
          <label for="subject">Subject</label>
          <input id="subject" name="subject" required value="${escapeHtml(prefill.subject || '')}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="issuer">Issuer</label>
          <input id="issuer" name="issuer" required value="${escapeHtml(prefill.issuer || ISSUER_NAME)}" />
        </div>
      </div>
      <div>
        <label for="description">Description</label>
        <textarea id="description" name="description" rows="4" required>${escapeHtml(prefill.description || '')}</textarea>
      </div>
      <div>
        <button type="submit">Create Registry Record</button>
      </div>
    </form>
  </div>`;
}

function leadForm(prefill = {}, error = '') {
  return `<div class="card">
    <h1>Create Lead</h1>
    <p class="muted">Track outbound CRM leads for priority target segments.</p>
    ${error ? `<p class="bad"><strong>Error:</strong> ${escapeHtml(error)}</p>` : ''}
    <form method="post" action="/leads/create" class="stack">
      <div class="row">
        <div>
          <label for="target">Target</label>
          <select id="target" name="target" required>
            ${leadTargets.map((target) => `<option value="${escapeHtml(target)}" ${prefill.target === target ? 'selected' : ''}>${escapeHtml(target)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label for="stage">Stage</label>
          <input id="stage" name="stage" required value="${escapeHtml(prefill.stage || 'new')}" />
        </div>
      </div>
      <div class="row">
        <div>
          <label for="company">Company</label>
          <input id="company" name="company" required value="${escapeHtml(prefill.company || '')}" />
        </div>
        <div>
          <label for="contact">Contact</label>
          <input id="contact" name="contact" required value="${escapeHtml(prefill.contact || '')}" />
        </div>
      </div>
      <div>
        <label for="followupDate">Follow-up Date</label>
        <input id="followupDate" name="followupDate" type="date" required value="${escapeHtml(prefill.followupDate || '')}" />
      </div>
      <div>
        <label for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="4">${escapeHtml(prefill.notes || '')}</textarea>
      </div>
      <div>
        <button type="submit">Create Lead</button>
      </div>
    </form>
  </div>`;
}

app.get('/', (_req, res) => {
  const body = `<div class="card">
    <h1>Issuer Dashboard</h1>
    <p class="muted">Create and manage verifiable records from issuer.qrv.network.</p>
    <p><a class="btn" href="/records/new">Create Record</a> <a class="btn secondary" href="/records">View Records</a></p>
  </div>`;
  res.type('html').send(shellLayout({ title: 'Issuer Dashboard', active: 'dashboard', body }));
});

app.get('/records', (_req, res) => {
  const rows = recentRecords.length
    ? recentRecords
        .map(
          (record) => `<tr>
              <td><span class="code">${escapeHtml(record.qrvid || 'N/A')}</span></td>
              <td>${escapeHtml(record.title || '—')}</td>
              <td>${escapeHtml(record.subject || '—')}</td>
              <td class="ok">${escapeHtml(record.status || 'CREATED')}</td>
              <td><a href="${escapeHtml(record.verifyUrl || '#')}" target="_blank" rel="noreferrer">Verify</a></td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="muted">No records created in this server session yet.</td></tr>';

  const body = `<div class="card">
    <h1>Records</h1>
    <table>
      <thead><tr><th>QRVID</th><th>Title</th><th>Subject</th><th>Status</th><th>Verify</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  res.type('html').send(shellLayout({ title: 'Records', active: 'records', body }));
});

app.get('/records/new', (_req, res) => {
  res.type('html').send(shellLayout({ title: 'Create Record', active: 'create', body: recordForm() }));
});

app.get('/leads', (_req, res) => {
  const rows = leads.length
    ? leads
        .map(
          (lead) => `<tr>
              <td>${escapeHtml(lead.company)}</td>
              <td>${escapeHtml(lead.target)}</td>
              <td>${escapeHtml(lead.contact)}</td>
              <td>${escapeHtml(lead.stage)}</td>
              <td>${escapeHtml(lead.followupDate)}</td>
              <td>${escapeHtml(lead.notes || '—')}</td>
            </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="muted">No leads created in this server session yet.</td></tr>';

  const body = `<div class="card">
    <h1>Leads</h1>
    <p class="muted">Manage sales pipeline leads for schools, creators, ecommerce brands, and more.</p>
    <p><a class="btn" href="/leads/new">Create Lead</a></p>
    <table>
      <thead><tr><th>Company</th><th>Target</th><th>Contact</th><th>Stage</th><th>Follow-up</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;

  res.type('html').send(shellLayout({ title: 'Leads', active: 'leads', body }));
});

app.get('/leads/new', (_req, res) => {
  res.type('html').send(shellLayout({ title: 'Create Lead', active: 'create-lead', body: leadForm() }));
});

app.post('/leads/create', (req, res) => {
  const payload = {
    target: String(req.body.target || '').trim(),
    company: String(req.body.company || '').trim(),
    contact: String(req.body.contact || '').trim(),
    stage: String(req.body.stage || '').trim(),
    notes: String(req.body.notes || '').trim(),
    followupDate: String(req.body.followupDate || '').trim()
  };

  const missing = ['target', 'company', 'contact', 'stage', 'followupDate'].filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Lead',
        active: 'create-lead',
        body: leadForm(payload, `Missing required fields: ${missing.join(', ')}`)
      })
    );
  }

  if (!leadTargets.includes(payload.target)) {
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Lead',
        active: 'create-lead',
        body: leadForm(payload, 'Invalid target selected.')
      })
    );
  }

  leads.unshift(payload);
  if (leads.length > 250) leads.length = 250;

  return res.type('html').send(
    shellLayout({
      title: 'Lead Created',
      active: 'create-lead',
      body: '<div class="card"><h1>Lead Created</h1><p class="ok"><strong>Success:</strong> Lead saved to CRM list.</p><p><a class="btn" href="/leads/new">Create Another Lead</a> <a class="btn secondary" href="/leads">Go to Leads</a></p></div>'
    })
  );
});

app.post('/records/create', async (req, res) => {
  const payload = {
    recordType: String(req.body.recordType || '').trim(),
    title: String(req.body.title || '').trim(),
    subject: String(req.body.subject || '').trim(),
    issuer: String(req.body.issuer || '').trim(),
    description: String(req.body.description || '').trim(),
    visibility: String(req.body.visibility || '').trim()
  };

  const missing = Object.entries(payload)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    return res.status(400).type('html').send(
      shellLayout({
        title: 'Create Record',
        active: 'create',
        body: recordForm(payload, `Missing required fields: ${missing.join(', ')}`)
      })
    );
  }

  try {
    const response = await fetch(`${REGISTRY_BASE_URL}/records`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await response.json();
    } catch (_error) {
      data = null;
    }

    if (!response.ok) {
      return res.status(502).type('html').send(
        shellLayout({
          title: 'Create Failed',
          active: 'create',
          body: `<div class="card"><h1>Create Record Failed</h1><p class="bad">The issuer portal could not create a record right now. Please try again shortly.</p><p class="muted">Registry response status: ${response.status}</p><p><a class="btn" href="/records/new">Try Again</a></p></div>`
        })
      );
    }

    const qrvid = data?.qrvid || data?.record?.qrvid || data?.id || 'N/A';
    const status = data?.status || data?.record?.status || 'CREATED';
    const hash = data?.hash || data?.record?.hash || 'N/A';
    const canonicalVerifyUrl = data?.verifyUrl || data?.canonicalVerifyUrl || `https://verify.qrv.network/${encodeURIComponent(qrvid)}`;
    const registryJsonUrl = data?.registryJsonUrl || `${REGISTRY_BASE_URL}/records/${encodeURIComponent(qrvid)}.json`;

    recentRecords.unshift({ qrvid, status, hash, verifyUrl: canonicalVerifyUrl, title: payload.title, subject: payload.subject });
    if (recentRecords.length > 50) recentRecords.length = 50;

    const body = `<div class="card">
      <h1>Record Created</h1>
      <p class="ok"><strong>Success:</strong> Registry record issued.</p>
      <table>
        <tbody>
          <tr><th>QRVID</th><td><span class="code">${escapeHtml(qrvid)}</span></td></tr>
          <tr><th>Status</th><td>${escapeHtml(status)}</td></tr>
          <tr><th>Hash</th><td><span class="code">${escapeHtml(hash)}</span></td></tr>
          <tr><th>Canonical Verify URL</th><td><a href="${escapeHtml(canonicalVerifyUrl)}" target="_blank" rel="noreferrer">${escapeHtml(canonicalVerifyUrl)}</a></td></tr>
          <tr><th>Registry JSON URL</th><td><a href="${escapeHtml(registryJsonUrl)}" target="_blank" rel="noreferrer">${escapeHtml(registryJsonUrl)}</a></td></tr>
        </tbody>
      </table>
      <p style="margin-top:16px"><a class="btn" href="/records/new">Create Another Record</a> <a class="btn secondary" href="/records">Go to Records</a></p>
    </div>`;

    return res.type('html').send(shellLayout({ title: 'Record Created', active: 'create', body }));
  } catch (_error) {
    return res.status(502).type('html').send(
      shellLayout({
        title: 'Create Failed',
        active: 'create',
        body: '<div class="card"><h1>Create Record Failed</h1><p class="bad">Unable to reach the registry service right now. Please retry in a moment.</p><p><a class="btn" href="/records/new">Try Again</a></p></div>'
      })
    );
  }
});

app.get('/api-keys', (_req, res) => {
  const body = `<div class="card"><h1>API Keys</h1><p class="muted">Issuer API key management will be surfaced here.</p></div>`;
  res.type('html').send(shellLayout({ title: 'API Keys', active: 'api-keys', body }));
});

app.get('/settings', (_req, res) => {
  const body = `<div class="card"><h1>Settings</h1><p class="muted">Issuer tenant and policy controls will appear here.</p></div>`;
  res.type('html').send(shellLayout({ title: 'Settings', active: 'settings', body }));
});

function serviceStatusResponse() {
  return {
    status: 'ok',
    service: 'qrv-api',
    version: VERSION,
    timestamp: new Date().toISOString()
  };
}

app.get('/health', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

app.get('/ping', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

app.get('/version', (_req, res) => {
  res.status(200).json(serviceStatusResponse());
});

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/readyz', (_req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.listen(PORT, () => {
  console.log(`issuer-qrv listening on :${PORT}`);
});
