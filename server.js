require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.2.0';

const URLS = {
  site: publicUrl(process.env.QRV_PUBLIC_SITE_URL || process.env.APP_BASE_URL, 'https://qrv.network'),
  verify: publicUrl(process.env.QRV_VERIFY_URL || process.env.VERIFY_BASE_URL, 'https://verify.qrv.network'),
  registry: publicUrl(process.env.QRV_REGISTRY_URL || process.env.REGISTRY_BASE_URL, 'https://registry.qrv.network'),
  api: publicUrl(process.env.QRV_API_URL || process.env.NEXT_PUBLIC_QRV_API_BASE_URL, 'https://api.qrv.network'),
  issuer: publicUrl(process.env.QRV_ISSUER_URL, 'https://issuer.qrv.network'),
  docs: publicUrl(process.env.QRV_DOCS_URL, 'https://docs.qrv.network'),
  developers: publicUrl(process.env.QRV_DEVELOPERS_URL, 'https://developers.qrv.network'),
  status: publicUrl(process.env.QRV_STATUS_URL, 'https://status.qrv.network')
};

const ISSUER_API_KEY = process.env.ISSUER_API_KEY || process.env.REGISTRY_API_KEY || '';
const DEFAULT_ISSUER_NAME = process.env.DEFAULT_ISSUER_NAME || 'QRV Demo Issuer';
const DEFAULT_RECORD_PREFIX = process.env.DEFAULT_RECORD_PREFIX || 'QRV-CERT';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 120);

const issuedRecords = new Map();
const scanCounts = new Map();
const auditEvents = [];

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));
const DEFAULT_ISSUER_NAME = process.env.DEFAULT_ISSUER_NAME || 'QR-V Demo Issuer';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), max: Number(process.env.RATE_LIMIT_MAX || 180) }));

function now() { return new Date().toISOString(); }
function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function authHeaders() { return ISSUER_API_KEY ? { authorization: `Bearer ${ISSUER_API_KEY}` } : {}; }
function verifyUrl(qrvid) { return `${VERIFY_BASE_URL}/${encodeURIComponent(qrvid)}`; }
function qrCodeUrl(qrvid) { return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(verifyUrl(qrvid))}`; }
function statusLabel(value) {
  const normalized = String(value || '').toUpperCase();
  if (['VERIFIED', 'REVOKED', 'EXPIRED', 'NOT_FOUND', 'INVALID_FORMAT', 'UNAVAILABLE'].includes(normalized)) return normalized;
  if (['VALID', 'ACTIVE'].includes(normalized)) return 'VERIFIED';
  if (normalized === 'MISSING') return 'NOT_FOUND';
  return 'UNAVAILABLE';
}
function addAudit(eventType, details = {}) {
  auditEvents.unshift({ eventType, details, timestamp: now() });
  if (auditEvents.length > 50) auditEvents.pop();
}
function rememberRecord(record) {
  if (!record?.qrvid) return record;
  const existing = issuedRecords.get(record.qrvid) || {};
  const normalized = {
    ...existing,
    ...record,
    status: statusLabel(record.status || existing.status || 'VERIFIED'),
    verifyUrl: record.verifyUrl || existing.verifyUrl || verifyUrl(record.qrvid),
    qrCodeUrl: record.qrCodeUrl || existing.qrCodeUrl || qrCodeUrl(record.qrvid),
    createdAt: existing.createdAt || record.timestamp || now(),
    updatedAt: now(),
  };
  issuedRecords.set(record.qrvid, normalized);
  return normalized;
}
function getRecords() {
  return Array.from(issuedRecords.values()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
function recordCard(record) {
  return `<article class="record-card"><div><p class="eyebrow">${escapeHtml(record.recordType || record.type || 'certificate')}</p><h3>${escapeHtml(record.title || record.payload?.title || record.qrvid)}</h3><p class="mono">${escapeHtml(record.qrvid)}</p><p>${escapeHtml(record.issuer || DEFAULT_ISSUER_NAME)} · ${escapeHtml(record.owner || record.subject || 'Issued subject')}</p></div><div><span class="pill ${escapeHtml(statusLabel(record.status).toLowerCase())}">${escapeHtml(statusLabel(record.status))}</span><p class="small">Scans: ${Number(scanCounts.get(record.qrvid) || record.scans || 0)}</p><p><a class="btn small-btn" href="${escapeHtml(record.verifyUrl || verifyUrl(record.qrvid))}">Verify</a> <a class="btn alt small-btn" href="/revoke?qrvid=${encodeURIComponent(record.qrvid)}">Revoke</a></p></div></article>`;
}
function pageHeader(title, subtitle) {
  return `<section class="hero"><div class="eyebrow">Issuer Portal</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><p><a class="btn" href="/records/new">Create Record</a> <a class="btn alt" href="/records">View Records</a></p></section>`;
}
function navLink(path, label) { return `<a href="${path}">${label}</a>`; }

function layout(body, title = 'QR-V Issuer Portal') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{--bg:#061126;--panel:#101f42;--line:#2d477a;--gold:#f2d06b;--cyan:#62cbff;--text:#eef4ff;--muted:#b7c6e6;--green:#22c55e;--red:#ef4444;--orange:#f59e0b}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top,#14366f,#061126 52%,#030711);color:var(--text)}.wrap{max-width:1180px;margin:0 auto;padding:30px 20px}.nav{display:flex;justify-content:space-between;gap:16px;align-items:center}.brand{font-weight:900;letter-spacing:.08em}.nav a{color:#dbeafe;text-decoration:none;margin-left:14px}.hero,.card{background:rgba(16,31,66,.9);border:1px solid var(--line);border-radius:24px;padding:26px;margin-top:24px}.record-card{display:flex;justify-content:space-between;gap:20px;align-items:center;background:rgba(8,23,53,.75);border:1px solid var(--line);border-radius:18px;padding:18px;margin:14px 0}h1{font-size:clamp(38px,7vw,72px);line-height:1;margin:10px 0}p,li{color:var(--muted);font-size:17px;line-height:1.6}.small{font-size:14px}.eyebrow{color:var(--gold);font-size:13px;text-transform:uppercase;letter-spacing:.14em;font-weight:900}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.two{grid-template-columns:repeat(2,1fr)}.btn,button{display:inline-block;border:0;border-radius:999px;background:var(--gold);color:#071126;font-weight:900;padding:13px 18px;text-decoration:none;cursor:pointer}.small-btn{padding:9px 13px;font-size:14px}.btn.alt{background:transparent;border:1px solid var(--line);color:#fff}input,select,textarea{width:100%;padding:14px;border-radius:14px;border:1px solid #3a5288;background:#081735;color:#fff;font-size:16px}label{display:block;margin:12px 0 6px;font-weight:800}.mono{font-family:ui-monospace,Menlo,monospace;color:#dbeafe;word-break:break-word}.success{border-left:4px solid var(--green)}.error{border-left:4px solid var(--red)}.pill{display:inline-block;border-radius:999px;padding:8px 12px;font-weight:900;font-size:12px;background:#1f3b6d;color:#dbeafe}.pill.verified{background:rgba(34,197,94,.18);color:#86efac}.pill.revoked,.pill.expired{background:rgba(245,158,11,.18);color:#fcd34d}.pill.unavailable{background:rgba(239,68,68,.18);color:#fecaca}.stat{font-size:34px;color:#fff;font-weight:900;margin:0}.qr{background:#fff;border-radius:16px;padding:12px;max-width:264px}.footer{margin:30px 0;color:var(--muted)}@media(max-width:800px){.grid,.two{grid-template-columns:1fr}.nav,.record-card{align-items:flex-start;flex-direction:column}.nav a{margin:0 10px 0 0}}</style></head><body><div class="wrap"><nav class="nav"><div class="brand">QR-V™ ISSUER</div><div>${navLink('/dashboard','Dashboard')}${navLink('/records','Records')}${navLink('/issue','Issue')}${navLink('/revoke','Revoke')}${navLink('/api-keys','API Keys')}${navLink('/billing','Billing')}${navLink('/settings','Settings')}</div></nav>${body}<p class="footer">Registry: <span class="mono">${escapeHtml(REGISTRY_BASE_URL)}</span> · Verify: <span class="mono">${escapeHtml(VERIFY_BASE_URL)}</span></p></div></body></html>`;
function publicUrl(value, fallback) { return String(value || fallback).replace(/\/+$/, ''); }
function cleanQrvid(value) { return String(value || '').trim().replace(/^https?:\/\/verify\.qrv\.network\//i, '').replace(/^\/+/, ''); }

const networkCards = [
  { host: 'qrv.network', label: 'Root site', url: URLS.site, body: 'Product, trust, pricing, and route-specific public pages for the QR-V Network.' },
  { host: 'verify.qrv.network', label: 'Verifier', url: URLS.verify, body: 'Public QRVID lookup destination for recipients, auditors, and relying parties.' },
  { host: 'registry.qrv.network', label: 'Registry', url: URLS.registry, body: 'Record authority, lifecycle state, revocation status, and registry API surface.' },
  { host: 'api.qrv.network', label: 'API', url: URLS.api, body: 'Programmatic QRVID issuance, verification, status, webhook, and network endpoints.' },
  { host: 'issuer.qrv.network', label: 'Issuer', url: URLS.issuer, body: 'Issuer portal for creating QR-V Verified Certificates and managed records.' },
  { host: 'docs.qrv.network', label: 'Docs', url: URLS.docs, body: 'Implementation guides, API references, verification patterns, and examples.' },
  { host: 'developers.qrv.network', label: 'Developers', url: URLS.developers, body: 'Developer onboarding, SDK direction, sandboxes, and integration resources.' },
  { host: 'status.qrv.network', label: 'Status', url: URLS.status, body: 'Operational availability, maintenance notices, and incident communications.' }
];

const useCases = [
  { slug: '/use-cases/certificates', title: 'Certificates', short: 'Make educational, training, course, award, and compliance certificates instantly verifiable.', icon: '◈' },
  { slug: '/use-cases/membership-id', title: 'Membership ID', short: 'Give members a QRVID-backed proof that can be checked without exposing private account data.', icon: '◆' },
  { slug: '/use-cases/product-authentication', title: 'Product Authentication', short: 'Attach verification to product labels, lots, serials, limited editions, and after-market authenticity checks.', icon: '◇' },
  { slug: '/use-cases/document-verification', title: 'Document Verification', short: 'Bind documents to a registry record so recipients can confirm status and issuer identity.', icon: '▣' },
  { slug: '/use-cases/asset-records', title: 'Asset Records', short: 'Publish verifiable status records for equipment, property, collectibles, and controlled assets.', icon: '▤' }
];

const pricingPlans = [
  { name: 'Starter Issuer', price: '$99/mo', audience: 'Small certificate issuers and pilots', features: ['Issue QR-V Verified Certificates', 'Hosted verification links', 'Basic issuer profile', 'Email support'] },
  { name: 'Growth Issuer', price: '$299/mo', audience: 'Growing teams with recurring issuance', features: ['Higher monthly issuance capacity', 'Batch-ready workflows', 'Registry status controls', 'Priority onboarding'] },
  { name: 'Professional Issuer', price: '$799/mo', audience: 'Operational teams and trust-sensitive programs', features: ['Advanced issuer controls', 'Custom verification branding options', 'Revocation and status workflows', 'Integration planning'] },
  { name: 'Enterprise / Network Issuer', price: 'Custom', audience: 'Institutions, networks, and high-volume deployments', features: ['Dedicated launch architecture', 'Custom contracts and compliance review', 'API and portal alignment', 'Support and SLA options'] }
];

function verificationForm() {
  return `<form class="verify-form" method="post" action="/verify" aria-label="Verify a QRVID"><label for="qrvid">Verify any QRVID</label><div class="verify-row"><input id="qrvid" name="qrvid" inputmode="latin" autocomplete="off" placeholder="QRV-CERT-000001" required><button type="submit">Verify</button></div><small>Redirects to ${escapeHtml(URLS.verify)}/{QRVID}</small></form>`;
}

function liveNetworkSection() {
  return `<section class="section" id="network"><div class="section-head"><p class="eyebrow">Live Network</p><h2>One trust network, purpose-built subdomains.</h2><p>QR-V separates verification, registry, issuer, API, documentation, developer, and status responsibilities across clear production endpoints.</p></div><div class="grid four">${networkCards.map(card => `<a class="network-card" href="${escapeHtml(card.url)}"><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.host)}</strong><p>${escapeHtml(card.body)}</p></a>`).join('')}</div></section>`;
}

function disclaimerBlock() {
  return `<section class="disclaimer"><strong>Trust and legal notice.</strong> QR-V provides registry-backed verification infrastructure and public status pages. QR-V does not automatically certify the truth, legality, ownership, identity, regulatory standing, or fitness of issuer-supplied content. Relying parties should review issuer identity, record scope, jurisdiction, applicable law, and the current verification status before making decisions.</section>`;
}

function layout({ title = 'QR-V Network', description = 'QR-V Network turns QR codes into registry-backed verification records.', path = '/', body }) {
  const canonical = `${URLS.site}${path === '/' ? '' : path}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<style>
:root{--bg:#050914;--panel:#0d1730;--panel2:#101f42;--line:#263a67;--gold:#f2d06b;--cyan:#66d9ff;--text:#f3f7ff;--muted:#b9c8e8;--green:#22c55e;--red:#ef4444;--shadow:0 30px 90px rgba(0,0,0,.36)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:radial-gradient(circle at 15% 0,#143c76 0,#08142c 32%,#050914 72%);color:var(--text)}a{color:inherit}.wrap{max-width:1180px;margin:0 auto;padding:0 22px}.top{position:sticky;top:0;z-index:10;background:rgba(5,9,20,.82);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.08)}.nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:950;letter-spacing:.06em}.mark{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,var(--gold),#fff1a8);color:#061126;box-shadow:0 0 40px rgba(242,208,107,.25)}.links{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.links a{text-decoration:none;color:#dbeafe;font-weight:750;font-size:14px}.links a:hover{color:#fff}.hero{padding:74px 0 36px}.hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;align-items:stretch}.hero-card,.section,.card,.network-card,.disclaimer{background:linear-gradient(180deg,rgba(16,31,66,.94),rgba(8,18,39,.92));border:1px solid var(--line);border-radius:28px;box-shadow:var(--shadow)}.hero-card{padding:42px}.eyebrow{margin:0 0 10px;color:var(--gold);font-size:13px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}h1{font-size:clamp(42px,7vw,76px);line-height:.95;margin:10px 0 18px;letter-spacing:-.055em}h2{font-size:clamp(30px,4vw,48px);line-height:1.05;margin:0 0 14px;letter-spacing:-.035em}h3{font-size:24px;margin:0 0 10px}p,li{color:var(--muted);font-size:17px;line-height:1.65}.lead{font-size:21px;color:#deebff}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}.btn,button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;background:var(--gold);color:#061126;font-weight:950;padding:13px 18px;text-decoration:none;cursor:pointer;min-height:46px}.btn.alt{background:transparent;border:1px solid var(--line);color:#fff}.btn.dark{background:#10244c;color:#fff;border:1px solid #37568e}.verify-panel{padding:26px}.verify-form{display:grid;gap:10px}.verify-row{display:grid;grid-template-columns:1fr auto;gap:10px}.verify-form label,label{font-weight:900;color:#fff}.verify-form small{color:#9fb1d6}input,textarea{width:100%;padding:14px 15px;border-radius:16px;border:1px solid #3a5288;background:#081735;color:#fff;font-size:16px;outline:none}input:focus,textarea:focus{border-color:var(--cyan);box-shadow:0 0 0 4px rgba(102,217,255,.12)}.section{margin:24px 0;padding:32px}.section-head{max-width:780px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:18px}.grid.two{grid-template-columns:repeat(2,1fr)}.grid.four{grid-template-columns:repeat(4,1fr)}.card{padding:24px}.card .icon{font-size:30px;color:var(--gold)}.network-card{padding:19px;text-decoration:none;transition:transform .16s,border-color .16s}.network-card:hover{transform:translateY(-3px);border-color:var(--cyan)}.network-card span{display:inline-block;color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:950;margin-bottom:8px}.network-card strong{display:block;font-size:18px;word-break:break-word}.network-card p{font-size:14px;margin-bottom:0}.pill-list{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.pill{border:1px solid var(--line);border-radius:999px;padding:9px 12px;color:#dbeafe;background:rgba(255,255,255,.04);font-weight:800}.quote{border-left:4px solid var(--gold);padding-left:18px;color:#e8f1ff}.disclaimer{padding:20px;margin:24px 0;color:#b9c8e8}.footer{padding:34px 0 60px;color:#9fb1d6}.footer-grid{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.1);padding-top:24px}.footer a{color:#c9d8f5;text-decoration:none;margin-right:14px}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-word}.status-ok{color:var(--green);font-weight:950}.status-warn{color:var(--gold);font-weight:950}.route-title{padding:54px 0 6px}@media(max-width:980px){.hero-grid,.grid,.grid.two,.grid.four{grid-template-columns:1fr}.links{display:none}.hero{padding-top:42px}.hero-card{padding:28px}.verify-row{grid-template-columns:1fr}.section{padding:24px}}
</style>
</head>
<body>
<header class="top"><div class="wrap"><nav class="nav"><a class="brand" href="/"><span class="mark">QV</span><span>QR-V Network</span></a><div class="links"><a href="/protocol">Protocol</a><a href="/how-it-works">How it works</a><a href="/registry">Registry</a><a href="/use-cases">Use cases</a><a href="/developers">Developers</a><a href="/pricing">Pricing</a><a href="/book-demo">Book demo</a></div></nav></div></header>
<main class="wrap">${body}${disclaimerBlock()}</main>
<footer class="wrap footer"><div class="footer-grid"><div><strong>QR-V Network</strong><p>Registry-backed QRVID verification for certificates, IDs, products, documents, and asset records.</p></div><div><a href="/security">Security</a><a href="/legal">Legal</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/status">Status</a></div></div></footer>
</body></html>`;
}

function sendPage(res, page) { res.type('html').send(layout(page)); }

function homePage() {
  return { path: '/', title: 'QR-V Network | Registry-backed QRVID verification', description: 'The production root site for qrv.network and QR-V Verified Certificates.', body: `<section class="hero"><div class="hero-grid"><div class="hero-card"><p class="eyebrow">QR-V Verified Certificates</p><h1>Turn every certificate into a live verification record.</h1><p class="lead">QR-V gives issuers a registry-backed QRVID that lets recipients, employers, auditors, and customers verify status at the moment of trust.</p><div class="actions"><a class="btn" href="/book-demo">Book a demo</a><a class="btn alt" href="/protocol">Explore the protocol</a></div><div class="pill-list"><span class="pill">Issue</span><span class="pill">Verify</span><span class="pill">Revoke</span><span class="pill">Audit</span></div></div><div class="hero-card verify-panel">${verificationForm()}<hr style="border-color:rgba(255,255,255,.1);margin:24px 0"><h3>First product positioning</h3><p><strong>QR-V Verified Certificates</strong> are the first commercial QR-V product: a verification layer for credentials that need clear issuer identity, current status, and durable lookup.</p></div></div></section><section class="section"><p class="eyebrow">What QR-V does</p><h2>QR codes are easy to copy. QRVIDs are records you can verify.</h2><div class="grid"><div class="card"><h3>Registry-backed</h3><p>Each QRVID resolves to a record with issuer context, record type, lifecycle status, and verification metadata.</p></div><div class="card"><h3>Route-specific</h3><p>Separate product, protocol, registry, use case, developer, pricing, status, security, and legal pages support production discovery.</p></div><div class="card"><h3>Trust-aware</h3><p>Public status and legal disclaimers clarify what the network proves, what issuers attest, and what relying parties must review.</p></div></div></section>${liveNetworkSection()}` };
}

function standardPage({ path, title, eyebrow, heading, lead, cards = [], extra = '' }) {
  return { path, title: `${title} | QR-V Network`, description: lead, body: `<section class="route-title"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(heading)}</h1><p class="lead">${escapeHtml(lead)}</p><div class="actions"><a class="btn" href="/book-demo">Book a demo</a><a class="btn alt" href="/pricing">View pricing</a></div></section><section class="section"><div class="grid ${cards.length === 2 ? 'two' : ''}">${cards.map(card => `<div class="card"><div class="icon">${card.icon || '•'}</div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.body)}</p></div>`).join('')}</div></section>${extra}` };
}

function pricingPage() {
  return { path: '/pricing', title: 'Pricing | QR-V Network', description: 'QR-V pricing for Starter, Growth, Professional, Enterprise, and Launch Packages.', body: `<section class="route-title"><p class="eyebrow">Pricing</p><h1>Issuer plans for every stage of verification.</h1><p class="lead">Start with QR-V Verified Certificates, then expand into higher-volume issuance, integrations, and network-level deployments.</p></section><section class="section"><div class="grid four">${pricingPlans.map(plan => `<div class="card"><p class="eyebrow">${escapeHtml(plan.audience)}</p><h3>${escapeHtml(plan.name)}</h3><h2>${escapeHtml(plan.price)}</h2><ul>${plan.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}</ul><a class="btn" href="/book-demo">Discuss plan</a></div>`).join('')}</div></section><section class="section"><p class="eyebrow">Launch Packages</p><h2>Launch with the records, pages, and rollout support already mapped.</h2><div class="grid"><div class="card"><h3>Certificate launch</h3><p>Issuer profile setup, first QR-V Verified Certificate workflow, pilot records, and verification-page readiness.</p></div><div class="card"><h3>Integration launch</h3><p>API route planning, issuance workflow mapping, registry status model, and developer handoff.</p></div><div class="card"><h3>Network launch</h3><p>Multi-issuer program design, legal review support, production acceptance checklist, and operational runbook.</p></div></div></section>` };
}

function useCasesPage() {
  return { path: '/use-cases', title: 'Use Cases | QR-V Network', description: 'QR-V use cases for certificates, membership IDs, product authentication, document verification, and asset records.', body: `<section class="route-title"><p class="eyebrow">Use cases</p><h1>Verification patterns for trust-sensitive records.</h1><p class="lead">QR-V works when a recipient needs to know whether a QR code points to a current registry-backed record from an accountable issuer.</p></section><section class="section"><div class="grid">${useCases.map(item => `<a class="card" href="${item.slug}" style="text-decoration:none"><div class="icon">${item.icon}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.short)}</p></a>`).join('')}</div></section>` };
}

function useCaseDetail(item, body) {
  return standardPage({ path: item.slug, title: item.title, eyebrow: 'Use case', heading: `QR-V for ${item.title}`, lead: item.short, cards: [
    { title: 'Record binding', body: 'Bind a public QRVID to issuer-supplied details, status, verification context, and a durable lookup URL.', icon: item.icon },
    { title: 'Relying-party check', body: 'Give viewers a simple path to verify status before accepting a credential, product claim, document, ID, or asset record.', icon: '✓' },
    { title: 'Lifecycle status', body: 'Support active, revoked, replaced, expired, or superseded states depending on issuer policy and product scope.', icon: '↻' }
  ], extra: `<section class="section"><h2>Production fit</h2><p>${escapeHtml(body)}</p>${verificationForm()}</section>` });
}

const pages = new Map();
function add(path, factory) { pages.set(path, factory); }

add('/', homePage);
add('/protocol', () => standardPage({ path: '/protocol', title: 'Protocol', eyebrow: 'Protocol', heading: 'A practical protocol for QRVID verification.', lead: 'QR-V defines how issuers create records, how registry status is exposed, and how relying parties verify what a QR code claims.', cards: [
  { title: 'QRVID namespace', body: 'A QRVID is a human-readable identifier that resolves to a verification URL and registry-backed status.', icon: 'ID' },
  { title: 'Issuer attestation', body: 'Issuers publish record details and accept responsibility for the claims they put into the registry.', icon: '✦' },
  { title: 'Verifier response', body: 'Verification pages surface current state, issuer context, and trust notices in a consistent format.', icon: '↗' }
], extra: liveNetworkSection() }));
add('/how-it-works', () => standardPage({ path: '/how-it-works', title: 'How it works', eyebrow: 'Workflow', heading: 'Issue, attach, scan, verify, and manage.', lead: 'QR-V is designed for simple operational adoption: create a record, attach the QRVID, and let recipients verify status online.', cards: [
  { title: '1. Issuer creates', body: 'The issuer creates a QR-V Verified Certificate or other record with approved metadata.', icon: '1' },
  { title: '2. QRVID attaches', body: 'The QRVID appears on a PDF, badge, label, product, document, or asset page.', icon: '2' },
  { title: '3. Viewer verifies', body: 'A scan opens verify.qrv.network/{QRVID}, where current status and context are displayed.', icon: '3' },
  { title: '4. Issuer manages', body: 'Issuers can revoke, replace, or update records according to their policy and plan.', icon: '4' }
] }));
add('/registry', () => standardPage({ path: '/registry', title: 'Registry', eyebrow: 'Registry', heading: 'The registry is the source of verification status.', lead: 'The QR-V registry supports record creation, public lookup, lifecycle state, revocation, and audit-oriented metadata.', cards: [
  { title: 'Lookup', body: 'Public verification can resolve a QRVID to the registry status needed for a relying-party decision.', icon: '⌕' },
  { title: 'Lifecycle', body: 'Records can be active, revoked, expired, replaced, or otherwise marked under issuer policy.', icon: '◷' },
  { title: 'Audit trail', body: 'Registry metadata helps explain when a record was issued, by whom, and what status it currently has.', icon: '▥' }
], extra: `<section class="section"><h2>Registry endpoint</h2><p class="mono">${escapeHtml(URLS.registry)}</p><a class="btn" href="${escapeHtml(URLS.registry)}">Open registry</a></section>` }));
add('/use-cases', useCasesPage);
for (const item of useCases) {
  const copy = {
    '/use-cases/certificates': 'Certificate programs benefit from visible issuer identity, recipient-friendly lookup, revocation support, and verification pages suitable for employers, auditors, and reviewers.',
    '/use-cases/membership-id': 'Membership IDs can be checked at doors, online workflows, support desks, partner locations, or events without relying only on a static printed badge.',
    '/use-cases/product-authentication': 'Products can carry QRVIDs that support authenticity checks, lot context, serial records, warranty confidence, and customer-facing verification journeys.',
    '/use-cases/document-verification': 'Documents can include a verification URL that confirms whether the issuer still recognizes the document as current, valid, replaced, or revoked.',
    '/use-cases/asset-records': 'Asset records can expose controlled public verification for equipment, collectibles, property, or internal assets that need durable status checks.'
  }[item.slug];
  add(item.slug, () => useCaseDetail(item, copy));
}
add('/developers', () => standardPage({ path: '/developers', title: 'Developers', eyebrow: 'Developers', heading: 'Build issuance and verification into your workflow.', lead: 'Developers can integrate with QR-V API endpoints, link to public verification, and design issuer workflows around record lifecycle states.', cards: [
  { title: 'API-first', body: 'Use api.qrv.network for programmatic issuance, verification, and operational integrations as plans mature.', icon: '{ }' },
  { title: 'Verification URLs', body: 'Every QRVID can route to verify.qrv.network/{QRVID}, making linking and QR generation simple.', icon: '/' },
  { title: 'Docs and status', body: 'Use docs, developer resources, and status pages to plan reliable production rollouts.', icon: '⌘' }
], extra: `<section class="section"><h2>Developer endpoints</h2><p class="mono">API: ${escapeHtml(URLS.api)}</p><p class="mono">Docs: ${escapeHtml(URLS.docs)}</p><p class="mono">Developers: ${escapeHtml(URLS.developers)}</p></section>` }));
add('/pricing', pricingPage);
add('/book-demo', () => ({ path: '/book-demo', title: 'Book a Demo | QR-V Network', description: 'Book a QR-V demo for verified certificates and issuer workflows.', body: `<section class="route-title"><p class="eyebrow">Book demo</p><h1>Plan your first QR-V Verified Certificate launch.</h1><p class="lead">Tell us what you issue, who verifies it, and what trust decision the verification page must support.</p></section><section class="section"><div class="grid two"><div class="card"><h3>Demo agenda</h3><ul><li>Issuer and recipient workflow mapping</li><li>Certificate or record type selection</li><li>Verification-page content review</li><li>Pricing and launch package fit</li></ul></div><div class="card"><h3>Contact</h3><p>Use your existing QR-V sales/contact channel or connect through the issuer portal.</p><p><a class="btn" href="${escapeHtml(URLS.issuer)}">Open issuer portal</a></p></div></div></section>` }));
add('/about', () => standardPage({ path: '/about', title: 'About', eyebrow: 'About', heading: 'QR-V is verification infrastructure for real-world records.', lead: 'The network exists to make scanned credentials, IDs, products, documents, and assets easier to validate and easier to govern.', cards: [
  { title: 'Mission', body: 'Reduce uncertainty around QR-based claims by connecting every code to live status and issuer context.', icon: '★' },
  { title: 'Focus', body: 'Start with QR-V Verified Certificates, then extend the same pattern to other record categories.', icon: '→' },
  { title: 'Principle', body: 'Be clear about what QR-V verifies and what remains an issuer, legal, or relying-party responsibility.', icon: '!' }
] }));
add('/status', () => ({ path: '/status', title: 'Status | QR-V Network', description: 'QR-V network status routes and health checks.', body: `<section class="route-title"><p class="eyebrow">Status</p><h1>Network status and runtime checks.</h1><p class="lead">Use the public status page for incidents and the local health endpoints for deployment monitoring.</p></section><section class="section"><div class="grid"><div class="card"><h3>Public status</h3><p class="status-ok">Configured</p><p class="mono">${escapeHtml(URLS.status)}</p><a class="btn" href="${escapeHtml(URLS.status)}">Open status</a></div><div class="card"><h3>Health endpoints</h3><p class="mono">/health /healthz /ready /readyz /version /ping</p></div><div class="card"><h3>Runtime</h3><p class="mono">Node 20.x compatible Express server.js</p><p class="mono">Version ${escapeHtml(VERSION)}</p></div></div></section>${liveNetworkSection()}` }));
add('/security', () => standardPage({ path: '/security', title: 'Security', eyebrow: 'Security', heading: 'Security is built around clear trust boundaries.', lead: 'QR-V separates issuer claims, registry status, public verification, operational monitoring, and relying-party responsibility.', cards: [
  { title: 'No hidden import wrappers', body: 'The app starts directly from server.js for predictable Hostinger deployment and Node 20.x compatibility.', icon: '✓' },
  { title: 'Rate limited', body: 'Runtime requests are rate limited to reduce abuse against the marketing site and verification redirect form.', icon: '⏱' },
  { title: 'Scoped redirects', body: 'The QRVID form only redirects to the configured verification host using the submitted identifier as a path segment.', icon: '↪' }
] }));
add('/legal', () => standardPage({ path: '/legal', title: 'Legal', eyebrow: 'Legal', heading: 'Legal and trust disclaimers.', lead: 'QR-V is infrastructure. Issuers remain responsible for issuer-supplied content, authority, compliance, and record claims.', cards: [
  { title: 'Issuer responsibility', body: 'Issuers are responsible for the accuracy, authorization, and compliance of records they publish.', icon: '§' },
  { title: 'No universal endorsement', body: 'A QR-V status page does not mean QR-V endorses the issuer, recipient, product, asset, or underlying claim.', icon: '!' },
  { title: 'Relying-party review', body: 'Relying parties should check current status, scope, issuer identity, and applicable laws before acting.', icon: '✓' }
] }));
add('/privacy', () => standardPage({ path: '/privacy', title: 'Privacy', eyebrow: 'Privacy', heading: 'Privacy notice for the public QR-V site.', lead: 'The public site is designed to minimize data collection while supporting verification, operations, analytics, security, and support.', cards: [
  { title: 'Verification data', body: 'Public verification may show issuer-provided record details necessary for relying-party review.', icon: '◌' },
  { title: 'Operational data', body: 'Logs may include IP address, user agent, route, timestamp, and security signals needed to operate the service.', icon: '⌁' },
  { title: 'Issuer data', body: 'Issuer portal and API data are governed by applicable agreements, product settings, and jurisdictional requirements.', icon: '▣' }
] }));
add('/terms', () => standardPage({ path: '/terms', title: 'Terms', eyebrow: 'Terms', heading: 'Terms summary for QR-V Network use.', lead: 'Use of QR-V is subject to applicable agreements, acceptable-use requirements, issuer responsibilities, and verification disclaimers.', cards: [
  { title: 'Acceptable use', body: 'Do not use QR-V for unlawful, deceptive, harmful, infringing, or unauthorized records.', icon: '✓' },
  { title: 'Availability', body: 'Network availability can vary due to maintenance, incidents, third-party services, or deployment conditions.', icon: '◷' },
  { title: 'Changes', body: 'Product features, pricing, routing, and terms may evolve as the network matures.', icon: '↻' }
] }));

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed: ${response.status}`);
  return body;
}
async function createRegistryRecord({ type, issuer, owner, title, expiresAt, payload }) {
  const localQrvid = `${DEFAULT_RECORD_PREFIX}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const body = { type, recordType: type, issuer, owner, title, expiresAt, payload: { title, ...payload } };
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/create`, {
async function createRegistryRecord({ type, issuer, owner, payload }) {
  const response = await fetch(`${URLS.registry}/registry/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  const qrvid = result.qrvid || result.id || localQrvid;
  return rememberRecord({ ...result, qrvid, issuer, owner, title, recordType: type, type, expiresAt, payload: body.payload, status: result.status || 'VERIFIED' });
}
async function revokeRegistryRecord(qrvid, reason) {
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/${encodeURIComponent(qrvid)}/revoke`, {
  const response = await fetch(`${URLS.registry}/registry/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason })
  });
  const record = rememberRecord({ ...(issuedRecords.get(qrvid) || {}), ...result, qrvid, status: 'REVOKED', revokedAt: now(), revokeReason: reason });
  addAudit('record.revoked', { qrvid, reason });
  return record;
}
async function fetchRegistryRecord(qrvid) {
  const result = await requestJson(`${REGISTRY_BASE_URL}/registry/${encodeURIComponent(qrvid)}`, { headers: { accept: 'application/json' } });
  return rememberRecord({ ...result, qrvid: result.qrvid || qrvid });
}
async function registryReady() {
  const response = await fetch(`${REGISTRY_BASE_URL}/ready`, { headers: { accept: 'application/json' } });
  const registry = await response.json().catch(() => ({}));
  return { ok: response.ok, registry };
}

app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'issuer-qrv', version: VERSION, timestamp: now() }));
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/version', (_req, res) => res.json({ service: 'issuer-qrv', version: VERSION, appBaseUrl: APP_BASE_URL, registryBaseUrl: REGISTRY_BASE_URL, verifyBaseUrl: VERIFY_BASE_URL }));
app.get(['/ready', '/readyz'], async (_req, res) => {
  try {
    const { ok, registry } = await registryReady();
    res.status(ok ? 200 : 503).json({ ready: ok, registry, writeAuthConfigured: Boolean(ISSUER_API_KEY), service: 'issuer-qrv' });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message, writeAuthConfigured: Boolean(ISSUER_API_KEY), service: 'issuer-qrv' });
  }
});

app.get('/', (_req, res) => res.redirect('/dashboard'));
app.get('/login', (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Secure issuer access</div><h1>Sign in to issue QR-V records.</h1><p>This production MVP expects authentication at the edge or Hostinger environment. Use this portal only for authorized issuers.</p><form method="get" action="/dashboard"><label>Issuer email</label><input name="email" type="email" placeholder="ops@example.com" required><label>Issuer access token</label><input name="token" type="password" placeholder="Configured outside this demo UI"><p><button type="submit">Continue to Dashboard</button></p></form></section>`, 'Issuer Login'));
});
app.get('/dashboard', async (_req, res) => {
  let ready = false;
  try { ready = (await registryReady()).ok; } catch { ready = false; }
  const records = getRecords();
  const scans = Array.from(scanCounts.values()).reduce((sum, count) => sum + Number(count || 0), 0);
  res.type('html').send(layout(`${pageHeader('Issuer control plane', 'Create records, generate QRVIDs, revoke credentials, and track verification scans from one production portal.')}<section class="grid"><div class="card"><p class="eyebrow">Records</p><p class="stat">${records.length}</p><p>Issued in this portal runtime.</p></div><div class="card"><p class="eyebrow">Verification scans</p><p class="stat">${scans}</p><p>Tracked through issuer analytics endpoint.</p></div><div class="card"><p class="eyebrow">Registry readiness</p><p class="stat">${ready ? 'LIVE' : 'DOWN'}</p><p>${ready ? 'Registry can accept issuer writes.' : 'Registry readiness check is currently unavailable.'}</p></div></section><section class="card"><h2>Recent issuer activity</h2>${auditEvents.length ? `<ul>${auditEvents.slice(0, 8).map((event) => `<li><span class="mono">${escapeHtml(event.timestamp)}</span> ${escapeHtml(event.eventType)} ${escapeHtml(JSON.stringify(event.details))}</li>`).join('')}</ul>` : '<p>No audit events in this runtime yet.</p>'}</section>`, 'Issuer Dashboard'));
});
app.get('/records', (_req, res) => {
  const records = getRecords();
  res.type('html').send(layout(`${pageHeader('Issued records', 'Review QRVIDs created through the issuer portal and open their public verification pages.')}<section class="card"><h2>Records</h2>${records.length ? records.map(recordCard).join('') : '<p>No records have been issued in this runtime yet. Create the first one from /records/new.</p>'}</section>`, 'Issued Records'));
});
app.get(['/records/new', '/certificates', '/issue'], (_req, res) => {
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Create record</div><h1>Issue a registry-backed QRVID.</h1><form method="post" action="/issue"><label>Issuer</label><input name="issuer" value="${escapeHtml(DEFAULT_ISSUER_NAME)}" required><label>Recipient / Subject</label><input name="owner" placeholder="Jane Smith" required><label>Certificate or Record Title</label><input name="title" placeholder="Advanced Verification Certificate" required><label>Record Type</label><select name="type"><option value="certificate">Certificate</option><option value="membership-id">Membership ID</option><option value="product-authentication">Product Authentication</option><option value="document-verification">Document Verification</option><option value="asset-record">Asset Record</option></select><label>Expiration Date (optional)</label><input name="expiresAt" type="date"><label>Metadata</label><textarea name="metadata" rows="4" placeholder="Course, credential, SKU, document reference, or notes"></textarea><p><button type="submit">Create Verifiable Record</button></p></form></section>`, 'Create QR-V Record'));
app.get('/ping', (_req, res) => res.status(200).type('text/plain').send('pong'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'qrv-marketing-site', version: VERSION, timestamp: now() }));
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/ready', (_req, res) => res.status(200).json({ ready: true, service: 'qrv-marketing-site', version: VERSION, urls: URLS }));
app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }));
app.get('/version', (_req, res) => res.status(200).json({ service: 'qrv-marketing-site', version: VERSION, node: process.version, urls: URLS }));

app.get('/issue', (_req, res) => {
  sendPage(res, standardPage({ path: '/issue', title: 'Issue QR-V Certificate', eyebrow: 'Issuer utility', heading: 'Create a QR-V certificate record.', lead: 'This compatibility route preserves the issuer MVP form while the root site becomes the public qrv.network marketing site.', cards: [], extra: `<section class="section"><form method="post" action="/issue"><label>Issuer</label><input name="issuer" value="${escapeHtml(DEFAULT_ISSUER_NAME)}" required><label>Recipient / Subject</label><input name="owner" placeholder="Jane Smith" required><label>Certificate Title</label><input name="title" placeholder="Advanced Verification Certificate" required><label>Record Type</label><input name="type" value="certificate" required><label>Metadata</label><textarea name="metadata" rows="4" placeholder="Course, credential, program, or notes"></textarea><p><button type="submit">Create Verifiable Record</button></p></form></section>` }));
});
app.post('/issue', async (req, res) => {
  try {
    const { issuer, owner, title, type, metadata, expiresAt } = req.body;
    const result = await createRegistryRecord({ type: type || 'certificate', issuer, owner, title, expiresAt: expiresAt || null, payload: { metadata, source: 'issuer-qrv', issuedAt: now() } });
    addAudit('record.created', { qrvid: result.qrvid, type: result.recordType || result.type });
    res.type('html').send(layout(`<section class="card success"><h1>Record Issued</h1><p>Certificate record created successfully.</p><div class="grid two"><div><p><strong>QRVID</strong></p><p class="mono">${escapeHtml(result.qrvid)}</p><p><strong>Verification URL</strong></p><p class="mono">${escapeHtml(result.verifyUrl)}</p><p><strong>Hash</strong></p><p class="mono">${escapeHtml(result.hash || 'Registry hash pending')}</p><p><a class="btn" href="${escapeHtml(result.verifyUrl)}">Open Verification Page</a> <a class="btn alt" href="/records/new">Issue Another</a></p></div><div><img class="qr" alt="QR code for ${escapeHtml(result.qrvid)}" src="${escapeHtml(result.qrCodeUrl)}"></div></div></section>`,'Record Issued'));
  } catch (error) {
    res.status(502).type('html').send(layout(`<section class="card error"><h1>Issue Failed</h1><p>${escapeHtml(error.message)}</p><p><a class="btn" href="/records/new">Try Again</a></p></section>`,'Issue Failed'));
    const { issuer, owner, title, type, metadata } = req.body;
    const result = await createRegistryRecord({ type: type || 'certificate', issuer, owner, payload: { title, metadata, source: 'qrv-network-root', issuedAt: now() } });
    const verifyUrl = result.verifyUrl || `${URLS.verify}/${encodeURIComponent(result.qrvid)}`;
    sendPage(res, { path: '/issue', title: 'Record Issued | QR-V Network', description: 'Record issued.', body: `<section class="route-title"><p class="eyebrow">Issued</p><h1>Record issued.</h1><p class="lead">Certificate record created successfully.</p></section><section class="section"><p><strong>QRVID</strong></p><p class="mono">${escapeHtml(result.qrvid)}</p><p><strong>Hash</strong></p><p class="mono">${escapeHtml(result.hash)}</p><a class="btn" href="${escapeHtml(verifyUrl)}">Open verification page</a> <a class="btn alt" href="/issue">Issue another</a></section>` });
  } catch (error) {
    res.status(500);
    sendPage(res, { path: '/issue', title: 'Issue Failed | QR-V Network', description: 'Issue failed.', body: `<section class="route-title"><p class="eyebrow">Error</p><h1>Issue failed.</h1><p class="lead">${escapeHtml(error.message)}</p><a class="btn" href="/issue">Try again</a></section>` });
  }
});
app.get('/revoke', (_req, res) => {
  const qrvid = _req.query.qrvid || '';
  res.type('html').send(layout(`<section class="hero"><div class="eyebrow">Revoke record</div><h1>Revoke a QRVID.</h1><p>Revocation updates the registry and forces the public verifier to return REVOKED.</p><form method="post" action="/revoke"><label>QRVID</label><input name="qrvid" value="${escapeHtml(qrvid)}" placeholder="QRV-PROD-CERT-000002" required><label>Revocation reason</label><textarea name="reason" rows="3" placeholder="Credential withdrawn, issued in error, account closed..." required></textarea><p><button type="submit">Revoke Record</button></p></form></section>`, 'Revoke QRVID'));
});
app.post('/revoke', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.body.qrvid, req.body.reason);
    res.type('html').send(layout(`<section class="card success"><h1>Record Revoked</h1><p>The registry accepted the revocation.</p>${recordCard(result)}<p><a class="btn" href="/records">Back to Records</a></p></section>`, 'Record Revoked'));
  } catch (error) {
    res.status(502).type('html').send(layout(`<section class="card error"><h1>Revoke Failed</h1><p>${escapeHtml(error.message)}</p><p><a class="btn" href="/revoke">Try Again</a></p></section>`, 'Revoke Failed'));
  }
});
app.get('/api-keys', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('API keys', 'Use issuer API keys to automate record creation and revocation from your own systems.')}<section class="card"><h2>Configured key status</h2><p class="mono">ISSUER_API_KEY / REGISTRY_API_KEY configured: ${ISSUER_API_KEY ? 'YES' : 'NO'}</p><p>For production, create issuer-scoped keys in the registry authority, store them in Hostinger environment variables, and rotate immediately if a key appears in screenshots or support tickets.</p><h3>Automation endpoints</h3><ul><li><span class="mono">POST /api/issue</span> creates a record.</li><li><span class="mono">POST /api/revoke/:qrvid</span> revokes a record.</li><li><span class="mono">POST /api/analytics/scan</span> records a verification scan.</li></ul></section>`, 'Issuer API Keys'));
});
app.get('/settings', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('Issuer settings', 'Confirm production URLs and runtime configuration before issuing customer records.')}<section class="card"><h2>Environment</h2><p class="mono">APP_BASE_URL=${escapeHtml(APP_BASE_URL)}</p><p class="mono">VERIFY_BASE_URL=${escapeHtml(VERIFY_BASE_URL)}</p><p class="mono">REGISTRY_BASE_URL=${escapeHtml(REGISTRY_BASE_URL)}</p><p class="mono">APP_VERSION=${escapeHtml(VERSION)}</p><p class="mono">RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}</p><p class="mono">RATE_LIMIT_MAX=${RATE_LIMIT_MAX}</p></section>`, 'Issuer Settings'));
});
app.get('/billing', (_req, res) => {
  res.type('html').send(layout(`${pageHeader('Billing', 'Monetize QR-V issuance with paid issuer plans tied to record volume and scan analytics.')}<section class="grid"><div class="card"><h2>Starter</h2><p class="stat">$99</p><p>For pilots and first certificate programs.</p></div><div class="card"><h2>Growth</h2><p class="stat">$299</p><p>For production issuers with larger monthly volume.</p></div><div class="card"><h2>Enterprise</h2><p class="stat">Custom</p><p>Dedicated support, SLAs, and custom integrations.</p></div></section><section class="card"><h2>Stripe readiness</h2><p class="mono">STRIPE_SECRET_KEY configured: ${process.env.STRIPE_SECRET_KEY ? 'YES' : 'NO'}</p><p class="mono">STRIPE_PRICE_STARTER configured: ${process.env.STRIPE_PRICE_STARTER ? 'YES' : 'NO'}</p><p class="mono">STRIPE_PRICE_GROWTH configured: ${process.env.STRIPE_PRICE_GROWTH ? 'YES' : 'NO'}</p></section>`, 'Issuer Billing'));
});

app.post('/verify', (req, res) => {
  const qrvid = cleanQrvid(req.body?.qrvid);
  if (!qrvid) return res.redirect(303, '/');
  return res.redirect(303, `${URLS.verify}/${encodeURIComponent(qrvid)}`);
});

app.get('/verify', (req, res) => {
  const qrvid = cleanQrvid(req.query?.qrvid);
  if (!qrvid) return res.redirect(302, URLS.verify);
  return res.redirect(302, `${URLS.verify}/${encodeURIComponent(qrvid)}`);
});

app.post('/api/issue', async (req, res) => {
  try {
    const { type = 'certificate', issuer = DEFAULT_ISSUER_NAME, owner, title = 'Untitled QR-V record', expiresAt = null, payload = {} } = req.body;
    if (!owner) return res.status(400).json({ ok: false, status: 'INVALID_FORMAT', error: 'owner is required' });
    const result = await createRegistryRecord({ type, issuer, owner, title, expiresAt, payload });
    addAudit('record.created', { qrvid: result.qrvid, type });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    res.status(502).json({ ok: false, status: 'UNAVAILABLE', error: error.message });
  }
});
app.get('/api/records', (_req, res) => res.json({ ok: true, records: getRecords() }));
app.get('/api/records/:qrvid', async (req, res) => {
  try {
    const record = issuedRecords.get(req.params.qrvid) || await fetchRegistryRecord(req.params.qrvid);
    res.json({ ok: true, ...record });
  } catch (error) {
    res.status(404).json({ ok: false, qrvid: req.params.qrvid, status: 'NOT_FOUND', error: error.message });
  }
});
app.post('/api/revoke/:qrvid', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.params.qrvid, req.body?.reason || null);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(502).json({ ok: false, status: 'UNAVAILABLE', error: error.message });
  }
});
app.post('/api/analytics/scan', (req, res) => {
  const qrvid = String(req.body?.qrvid || '').trim();
  if (!qrvid) return res.status(400).json({ ok: false, status: 'INVALID_FORMAT', error: 'qrvid is required' });
  const scans = Number(scanCounts.get(qrvid) || 0) + 1;
  scanCounts.set(qrvid, scans);
  if (issuedRecords.has(qrvid)) rememberRecord({ ...issuedRecords.get(qrvid), scans });
  addAudit('record.scanned', { qrvid, scans });
  res.json({ ok: true, qrvid, scans, timestamp: now() });
});

app.use((req, res) => res.status(404).type('html').send(layout(`<section class="card error"><h1>Not Found</h1><p>The requested issuer route does not exist.</p><p class="mono">${escapeHtml(req.path)}</p></section>`, 'Not Found')));
for (const [path, factory] of pages.entries()) {
  app.get(path, (_req, res) => sendPage(res, factory()));
}

app.use((req, res) => {
  res.status(404);
  sendPage(res, { path: req.path, title: 'Not Found | QR-V Network', description: 'QR-V route not found.', body: `<section class="route-title"><p class="eyebrow">404</p><h1>Route not found.</h1><p class="lead">The requested QR-V Network page does not exist.</p><p class="mono">${escapeHtml(req.path)}</p><div class="actions"><a class="btn" href="/">Return home</a><a class="btn alt" href="/use-cases">View use cases</a></div></section>` });
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  const message = status === 500 && isProduction ? 'Internal Server Error' : err.message;
  res.status(status).json({ error: message });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log(`qrv-marketing-site running on ${PORT}`));
server.on('error', (error) => console.error('Server startup error:', error));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
