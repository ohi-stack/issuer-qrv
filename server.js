require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const VERSION = process.env.APP_VERSION || process.env.npm_package_version || '1.2.0';

function publicUrl(value, fallback) {
  return String(value || fallback).replace(/\/+$/, '');
}

const URLS = {
  site: publicUrl(process.env.QRV_PUBLIC_SITE_URL || process.env.APP_BASE_URL, 'https://qrv.network'),
  verify: publicUrl(process.env.QRV_VERIFY_URL || process.env.VERIFY_BASE_URL, 'https://verify.qrv.network'),
  issuer: publicUrl(process.env.QRV_ISSUER_URL || process.env.APP_BASE_URL, 'https://issuer.qrv.network'),
  registry: publicUrl(process.env.QRV_REGISTRY_URL || process.env.REGISTRY_BASE_URL, 'https://registry.qrv.network'),
  api: publicUrl(process.env.QRV_API_URL || process.env.NEXT_PUBLIC_QRV_API_BASE_URL, 'https://api.qrv.network'),
  docs: publicUrl(process.env.QRV_DOCS_URL, 'https://docs.qrv.network'),
  developers: publicUrl(process.env.QRV_DEVELOPERS_URL, 'https://developers.qrv.network'),
  status: publicUrl(process.env.QRV_STATUS_URL, 'https://status.qrv.network'),
  admin: publicUrl(process.env.QRV_ADMIN_URL, 'https://admin.qrv.network'),
  store: publicUrl(process.env.QRV_STORE_URL, 'https://store.qrv.network'),
  security: publicUrl(process.env.QRV_SECURITY_URL, 'https://security.qrv.network')
};

const ISSUER_API_KEY = process.env.ISSUER_API_KEY || process.env.REGISTRY_API_KEY || '';
const DEFAULT_ISSUER_NAME = process.env.DEFAULT_ISSUER_NAME || 'QRV Demo Issuer';
const DEFAULT_RECORD_PREFIX = process.env.DEFAULT_RECORD_PREFIX || 'QRV-CERT';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 180);
const DEMO_QRVID = 'QRV-DEMO-001';

const issuedRecords = new Map();
const scanCounts = new Map();
const auditEvents = [];

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX }));

function now() {
  return new Date().toISOString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanQrvid(value) {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/verify\.qrv\.network\//i, '')
    .replace(/^\/+/, '');
}

function authHeaders() {
  return ISSUER_API_KEY ? { authorization: `Bearer ${ISSUER_API_KEY}` } : {};
}

function verifyUrl(qrvid) {
  return `${URLS.verify}/${encodeURIComponent(qrvid)}`;
}

function qrCodeUrl(qrvid) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(verifyUrl(qrvid))}`;
}

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
    updatedAt: now()
  };
  issuedRecords.set(record.qrvid, normalized);
  return normalized;
}

function getRecords() {
  return Array.from(issuedRecords.values()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function requestJson(url, options = {}) {
  return fetch(url, options).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || body.message || `Request failed: ${response.status}`);
    return body;
  });
}

function normalizeRegistryRecord(qrvid, data, fallback = {}) {
  const record = data.record || data.result || data;
  const normalizedQrvid = record.qrvid || record.id || qrvid;
  return rememberRecord({
    ...fallback,
    ...record,
    qrvid: normalizedQrvid,
    status: statusLabel(record.status || data.status || fallback.status || 'VERIFIED'),
    verifyUrl: record.verifyUrl || verifyUrl(normalizedQrvid),
    qrCodeUrl: record.qrCodeUrl || qrCodeUrl(normalizedQrvid),
    timestamp: record.timestamp || data.timestamp || now()
  });
}

async function createRegistryRecord({ type, issuer, owner, title, expiresAt, payload }) {
  const body = { type, recordType: type, issuer, owner, title, expiresAt, payload: { title, ...payload } };
  const result = await requestJson(`${URLS.registry}/registry/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  const qrvid = result.qrvid || result.id || `${DEFAULT_RECORD_PREFIX}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  return normalizeRegistryRecord(qrvid, result, body);
}

async function fetchRegistryRecord(qrvid) {
  const result = await requestJson(`${URLS.registry}/registry/${encodeURIComponent(qrvid)}`);
  return normalizeRegistryRecord(qrvid, result);
}

async function revokeRegistryRecord(qrvid, reason) {
  const result = await requestJson(`${URLS.registry}/registry/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason })
  });
  const record = normalizeRegistryRecord(qrvid, result, { status: 'REVOKED' });
  addAudit('record.revoked', { qrvid, reason });
  return record;
}

function pageShell({ title = 'QRV.network', description = 'QR-V Network command hub for verification services.', body = '' }) {
  const nav = [
    ['/', 'Home'],
    ['/verify', 'Verify'],
    ['/issuer', 'Issuer'],
    ['/docs', 'Docs'],
    ['/developers', 'Developers'],
    ['/pricing', 'Pricing'],
    ['/status', 'Status'],
    ['/store', 'Store'],
    ['/network', 'Network']
  ];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(description)}"><title>${escapeHtml(title)}</title><style>:root{--bg:#071126;--panel:#101f42;--panel2:#0b1833;--line:#2d477a;--gold:#f2d06b;--cyan:#62cbff;--text:#eef4ff;--muted:#b7c6e6;--green:#22c55e;--red:#ef4444;--orange:#f59e0b}*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:radial-gradient(circle at top,#173d7a,#071126 48%,#030711);color:var(--text)}a{color:#dbeafe}.wrap{max-width:1180px;margin:0 auto;padding:28px 20px}.nav{display:flex;justify-content:space-between;align-items:center;gap:18px}.brand{font-weight:950;letter-spacing:.09em;text-decoration:none}.links{display:flex;flex-wrap:wrap;gap:12px}.links a{text-decoration:none;color:#dbeafe;font-weight:800;font-size:14px}.hero,.section,.card{background:rgba(16,31,66,.86);border:1px solid var(--line);border-radius:26px}.hero{padding:42px;margin-top:28px}.section{padding:28px;margin-top:22px}.card{background:rgba(8,23,53,.68);padding:22px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.grid.two{grid-template-columns:repeat(2,1fr)}.grid.four{grid-template-columns:repeat(4,1fr)}h1{font-size:clamp(42px,7vw,82px);line-height:.98;margin:10px 0 16px}h2{font-size:clamp(28px,4vw,46px);line-height:1;margin:0 0 16px}h3{margin:0 0 10px;font-size:21px}p,li{color:var(--muted);font-size:17px;line-height:1.6}.lead{font-size:21px;max-width:850px}.eyebrow{color:var(--gold);font-size:13px;text-transform:uppercase;letter-spacing:.16em;font-weight:950}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#dbeafe;word-break:break-word}.btn,button{display:inline-block;border:0;border-radius:999px;background:var(--gold);color:#071126;font-weight:950;padding:13px 18px;text-decoration:none;cursor:pointer;margin:4px 8px 4px 0}.btn.alt{background:transparent;border:1px solid var(--line);color:#fff}.btn.blue{background:var(--cyan);color:#061126}.pill{display:inline-block;border-radius:999px;padding:7px 11px;font-weight:900;font-size:12px;background:#1f3b6d;color:#dbeafe}.pill.live{background:rgba(34,197,94,.18);color:#86efac}.pill.private{background:rgba(245,158,11,.18);color:#fcd34d}.steps{counter-reset:step;display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.step{position:relative;background:rgba(8,23,53,.72);border:1px solid var(--line);border-radius:20px;padding:18px}.step:before{counter-increment:step;content:counter(step);display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--gold);color:#071126;font-weight:950;margin-bottom:12px}.price{font-size:34px;font-weight:950;color:#fff;margin:4px 0}.form{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}.form input{flex:1;min-width:220px;padding:14px 16px;border-radius:999px;border:1px solid var(--line);background:#081735;color:#fff;font-size:16px}.footer{margin:28px 0;color:var(--muted)}@media(max-width:900px){.grid,.grid.two,.grid.four,.steps{grid-template-columns:1fr}.hero{padding:28px}.nav{align-items:flex-start;flex-direction:column}}</style></head><body><div class="wrap"><nav class="nav"><a class="brand" href="/">QRV.NETWORK</a><div class="links">${nav.map(([path, label]) => `<a href="${path}">${label}</a>`).join('')}</div></nav>${body}<p class="footer">QRV.network is the public command hub. Operational services remain isolated on their service subdomains.</p></div></body></html>`;
}

function sendPage(res, page) {
  res.type('html').send(pageShell(page));
}

const services = [
  { name: 'Verify Portal', host: 'verify.qrv.network', url: URLS.verify, role: 'Public verification trust surface', visibility: 'Public' },
  { name: 'Issuer Portal', host: 'issuer.qrv.network', url: URLS.issuer, role: 'Issuer SaaS app for creating records', visibility: 'Issuer' },
  { name: 'Registry Authority', host: 'registry.qrv.network', url: URLS.registry, role: 'Canonical record status and lifecycle authority', visibility: 'System' },
  { name: 'API Gateway', host: 'api.qrv.network', url: URLS.api, role: 'JSON API gateway for issuance, lookup, and revocation', visibility: 'Developer' },
  { name: 'Developer Docs', host: 'docs.qrv.network', url: URLS.docs, role: 'Standards, guides, payload examples, and API references', visibility: 'Public' },
  { name: 'Developer Portal', host: 'developers.qrv.network', url: URLS.developers, role: 'SDKs, integration onboarding, and sandbox direction', visibility: 'Developer' },
  { name: 'Status Center', host: 'status.qrv.network', url: URLS.status, role: 'Monitoring and incident communication', visibility: 'Public' },
  { name: 'Store', host: 'store.qrv.network', url: URLS.store, role: 'WordPress/WooCommerce commerce and onboarding packages', visibility: 'Commercial' },
  { name: 'Admin', host: 'admin.qrv.network', url: URLS.admin, role: 'Protected internal operations', visibility: 'Internal' }
];

const pricingPlans = [
  { name: 'Starter Issuer', price: '$199/month', body: 'First production issuer plan for small certificate programs and low-volume launch programs.' },
  { name: 'Growth Issuer', price: '$499/month', body: 'For growing issuers with repeat issuance workflows and higher monthly verification volume.' },
  { name: 'Professional Issuer', price: '$1,500/month', body: 'For mature certificate operations that need support, reporting, and lifecycle controls.' },
  { name: 'Enterprise / Network Issuer', price: '$5,000+/month', body: 'For institutions, multi-issuer networks, SLAs, custom integrations, and governance support.' }
];

function networkDirectorySection() {
  return `<section class="section"><p class="eyebrow">Network Directory</p><h2>One brand hub, separate operational services.</h2><p class="lead">QRV.network consolidates navigation, commercial messaging, docs, demos, and service discovery while preserving dedicated production endpoints for trust, issuance, registry, API, docs, monitoring, commerce, and operations.</p><div class="grid">${services.map((service) => `<article class="card"><span class="pill ${service.visibility === 'Internal' ? 'private' : 'live'}">${escapeHtml(service.visibility)}</span><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.role)}</p><p class="mono">${escapeHtml(service.host)}</p><a class="btn alt" href="${escapeHtml(service.url)}">Open service</a></article>`).join('')}</div></section>`;
}

function statusServiceSection() {
  const checks = [
    { name: 'API Health', url: `${URLS.api}/healthz`, role: 'Gateway health endpoint for production smoke checks' },
    { name: 'Registry Authority', url: URLS.registry, role: 'Canonical registry service root' },
    { name: 'Verify Portal', url: URLS.verify, role: 'Public verification service root' },
    { name: 'Issuer Portal', url: URLS.issuer, role: 'Issuer application service root' }
  ];

  return `<section class="section"><p class="eyebrow">Production Status Links</p><h2>Smoke-test the live service domains from the command hub.</h2><p class="lead">These links intentionally target the production subdomains used by the QRV.network deployment checklist.</p><div class="grid two">${checks.map((check) => `<article class="card"><h3>${escapeHtml(check.name)}</h3><p>${escapeHtml(check.role)}</p><p class="mono">${escapeHtml(check.url)}</p><a class="btn alt" href="${escapeHtml(check.url)}">Open ${escapeHtml(check.name)}</a></article>`).join('')}</div></section>`;
}

function activationSection() {
  const steps = ['Create Certificate', 'Save Through API', 'Store In Registry', 'Verify Publicly', 'Return VERIFIED'];
  return `<section class="section"><p class="eyebrow">First Live Activation</p><h2>The certificate lifecycle QRV.network is organizing around.</h2><div class="steps">${steps.map((step) => `<div class="step"><h3>${escapeHtml(step)}</h3><p>${step === 'Return VERIFIED' ? 'The relying-party result resolves from live registry status.' : 'Part of the issuer → API → registry → verify production path.'}</p></div>`).join('')}</div><div><a class="btn" href="${escapeHtml(URLS.issuer)}/records/new">Issue Certificate</a><a class="btn blue" href="${escapeHtml(verifyUrl(DEMO_QRVID))}">Verify Demo Record</a><a class="btn alt" href="${escapeHtml(URLS.docs)}">View API Docs</a><a class="btn alt" href="/pricing">View Plans</a></div></section>`;
}

function demoSection() {
  return `<section class="section"><p class="eyebrow">Live Demo</p><h2>Try a verified QR-V record.</h2><p class="lead">Use the demo identifier below to validate that the public verification trust surface resolves records from the QR-V network.</p><div class="card"><h3 class="mono">${DEMO_QRVID}</h3><p><a class="btn" href="${escapeHtml(verifyUrl(DEMO_QRVID))}">Open ${escapeHtml(DEMO_QRVID)}</a><a class="btn alt" href="/verify?qrvid=${encodeURIComponent(DEMO_QRVID)}">Test root redirect</a></p></div></section>`;
}

function pricingSection() {
  return `<section class="section"><p class="eyebrow">Pricing / Commercial Entry</p><h2>Issuer Portal pricing routes checkout to the store.</h2><div class="grid four">${pricingPlans.map((plan) => `<article class="card"><h3>${escapeHtml(plan.name)}</h3><p class="price">${escapeHtml(plan.price)}</p><p>${escapeHtml(plan.body)}</p><a class="btn" href="${escapeHtml(URLS.store)}">Start checkout</a></article>`).join('')}</div></section>`;
}

function publicHero() {
  return `<section class="hero"><p class="eyebrow">QR-V Network Command Hub</p><h1>Verification infrastructure, consolidated at QRV.network.</h1><p class="lead">Use the root domain for discovery, demos, pricing, developer navigation, status links, and commercial entry. Keep the production trust surfaces on their dedicated subdomains.</p><form class="form" method="post" action="/verify"><input name="qrvid" placeholder="Enter QRVID, e.g. ${DEMO_QRVID}" aria-label="QRVID"><button type="submit">Verify QRVID</button></form><p><a class="btn" href="${escapeHtml(URLS.issuer)}">Issue Certificate</a><a class="btn blue" href="${escapeHtml(verifyUrl(DEMO_QRVID))}">Verify Demo Record</a><a class="btn alt" href="${escapeHtml(URLS.docs)}">View API Docs</a><a class="btn alt" href="/pricing">View Plans</a></p></section>`;
}

function rootPage() {
  return {
    title: 'QRV.network | QR-V Network Command Hub',
    description: 'QRV.network consolidates QR-V service discovery, demos, docs, pricing, and status while operational services remain on subdomains.',
    body: `${publicHero()}${networkDirectorySection()}${activationSection()}${demoSection()}${pricingSection()}`
  };
}

function routePage({ title, eyebrow, heading, lead, primaryLabel, primaryUrl, secondaryLabel, secondaryUrl, extra = '' }) {
  return {
    title: `${title} | QRV.network`,
    description: lead,
    body: `<section class="hero"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(heading)}</h1><p class="lead">${escapeHtml(lead)}</p><p><a class="btn" href="${escapeHtml(primaryUrl)}">${escapeHtml(primaryLabel)}</a>${secondaryLabel ? `<a class="btn alt" href="${escapeHtml(secondaryUrl)}">${escapeHtml(secondaryLabel)}</a>` : ''}</p></section>${extra}`
  };
}

app.get('/ping', (_req, res) => res.type('text').send('pong'));
app.get(['/health', '/healthz'], (_req, res) => res.json({ ok: true, service: 'qrv-marketing-site', role: 'root-command-hub', version: VERSION, timestamp: now() }));
app.get(['/ready', '/readyz'], (_req, res) => res.json({ ok: true, service: 'qrv-marketing-site', dependenciesRequiredForRender: false, timestamp: now() }));
app.get('/version', (_req, res) => res.json({ service: 'qrv-marketing-site', version: VERSION, node: process.version }));

app.get('/', (_req, res) => sendPage(res, rootPage()));
app.get('/network', (_req, res) => sendPage(res, routePage({ title: 'Network Directory', eyebrow: 'Network Directory', heading: 'Every QR-V service, role, and endpoint.', lead: 'QRV.network shows the full service family without collapsing operational trust boundaries.', primaryLabel: 'Verify Demo Record', primaryUrl: verifyUrl(DEMO_QRVID), secondaryLabel: 'Open Status Center', secondaryUrl: URLS.status, extra: networkDirectorySection() })));
app.get('/verify', (req, res) => {
  const qrvid = cleanQrvid(req.query?.qrvid);
  if (qrvid) return res.redirect(302, verifyUrl(qrvid));
  return sendPage(res, routePage({ title: 'Verify', eyebrow: 'Verify', heading: 'Verify QR-V records on the public trust surface.', lead: 'Root-domain verification entry routes QRVID lookups to verify.qrv.network, the dedicated public verification service.', primaryLabel: 'Verify Demo Record', primaryUrl: verifyUrl(DEMO_QRVID), secondaryLabel: 'Open Verify Portal', secondaryUrl: URLS.verify, extra: demoSection() }));
});
app.get('/issuer', (_req, res) => sendPage(res, routePage({ title: 'Issuer Portal', eyebrow: 'Issuer', heading: 'Create certificates through the issuer SaaS app.', lead: 'Issuer workflows remain on issuer.qrv.network while QRV.network explains plans, activation, and routing.', primaryLabel: 'Issuer Login', primaryUrl: `${URLS.issuer}/login`, secondaryLabel: 'View Plans', secondaryUrl: '/pricing', extra: activationSection() })));
app.get('/docs', (_req, res) => sendPage(res, routePage({ title: 'Docs', eyebrow: 'Documentation', heading: 'Read standards, issuer guides, and API references.', lead: 'Documentation is served from docs.qrv.network with root-domain navigation for discovery.', primaryLabel: 'View API Docs', primaryUrl: URLS.docs, secondaryLabel: 'Developer Portal', secondaryUrl: URLS.developers })));
app.get('/developers', (_req, res) => sendPage(res, routePage({ title: 'Developers', eyebrow: 'Developers', heading: 'Integrate QR-V issuance, lookup, and revocation.', lead: 'The developer portal, SDKs, and integration onboarding remain separated at developers.qrv.network.', primaryLabel: 'Open Developer Portal', primaryUrl: URLS.developers, secondaryLabel: 'View API Gateway', secondaryUrl: URLS.api })));
app.get('/pricing', (_req, res) => sendPage(res, routePage({ title: 'Pricing', eyebrow: 'Pricing', heading: 'Choose an issuer plan and check out through the store.', lead: 'QRV.network presents the commercial gateway; store.qrv.network owns WooCommerce checkout and onboarding purchases.', primaryLabel: 'Start Checkout', primaryUrl: URLS.store, secondaryLabel: 'Issue Certificate', secondaryUrl: `${URLS.issuer}/records/new`, extra: pricingSection() })));
app.get('/status', (_req, res) => sendPage(res, routePage({ title: 'Status', eyebrow: 'Status', heading: 'Monitor the QR-V service family.', lead: 'Status monitoring remains on status.qrv.network while QRV.network links the health surface from the hub.', primaryLabel: 'Open Status Center', primaryUrl: URLS.status, secondaryLabel: 'View Network Directory', secondaryUrl: '/network', extra: `${statusServiceSection()}${networkDirectorySection()}` })));
app.get('/store', (_req, res) => sendPage(res, routePage({ title: 'Store', eyebrow: 'Store', heading: 'Purchase issuer plans and onboarding packages.', lead: 'The commerce surface remains on store.qrv.network so WordPress/WooCommerce can operate separately from trust services.', primaryLabel: 'Open Store', primaryUrl: URLS.store, secondaryLabel: 'View Plans', secondaryUrl: '/pricing', extra: pricingSection() })));


app.get('/protocol', (_req, res) => sendPage(res, routePage({ title: 'Protocol', eyebrow: 'Protocol', heading: 'QR-V connects QRVIDs to live registry-backed status.', lead: 'The protocol pattern separates issuer claims, registry lifecycle state, public verification, and relying-party review.', primaryLabel: 'View API Docs', primaryUrl: URLS.docs, secondaryLabel: 'View Network Directory', secondaryUrl: '/network', extra: activationSection() })));
app.get('/how-it-works', (_req, res) => sendPage(res, routePage({ title: 'How It Works', eyebrow: 'How It Works', heading: 'Issuer → API → Registry → Verify → VERIFIED.', lead: 'The command hub explains the first live certificate lifecycle and sends each operational step to the correct service subdomain.', primaryLabel: 'Issue Certificate', primaryUrl: `${URLS.issuer}/records/new`, secondaryLabel: 'Verify Demo Record', secondaryUrl: verifyUrl(DEMO_QRVID), extra: activationSection() })));
app.get('/registry', (_req, res) => sendPage(res, routePage({ title: 'Registry', eyebrow: 'Registry Authority', heading: 'Canonical lifecycle state stays on registry.qrv.network.', lead: 'QRV.network presents registry context while the registry authority remains isolated as its own operational service.', primaryLabel: 'Open Registry Authority', primaryUrl: URLS.registry, secondaryLabel: 'View API Gateway', secondaryUrl: URLS.api })));
app.get(['/use-cases', '/use-cases/certificates', '/use-cases/membership-id', '/use-cases/product-authentication', '/use-cases/document-verification', '/use-cases/asset-records'], (req, res) => sendPage(res, routePage({ title: 'Use Cases', eyebrow: 'Use Cases', heading: 'QR-V supports verifiable certificates, IDs, products, documents, and assets.', lead: `This use-case page (${req.path}) routes prospects toward the issuer portal, docs, demo verifier, and pricing gateway.`, primaryLabel: 'Issue Certificate', primaryUrl: `${URLS.issuer}/records/new`, secondaryLabel: 'View Plans', secondaryUrl: '/pricing', extra: demoSection() })));
app.get('/book-demo', (_req, res) => sendPage(res, routePage({ title: 'Book Demo', eyebrow: 'Demo', heading: 'See the QR-V certificate lifecycle end to end.', lead: 'Start with the live demo record, then choose an issuer plan or open the issuer portal for production activation.', primaryLabel: 'Verify Demo Record', primaryUrl: verifyUrl(DEMO_QRVID), secondaryLabel: 'View Plans', secondaryUrl: '/pricing', extra: activationSection() })));
app.get('/about', (_req, res) => sendPage(res, routePage({ title: 'About', eyebrow: 'About', heading: 'QR-V is verification infrastructure for real-world records.', lead: 'QRV.network is the public hub for explaining the service family and routing users to separated operational domains.', primaryLabel: 'View Network Directory', primaryUrl: '/network', secondaryLabel: 'Open Status Center', secondaryUrl: URLS.status })));
app.get('/security', (_req, res) => sendPage(res, routePage({ title: 'Security', eyebrow: 'Security', heading: 'Trust boundaries stay separated by service role.', lead: 'Verification, issuance, registry authority, APIs, docs, status, commerce, and administration remain on scoped subdomains.', primaryLabel: 'View Network Directory', primaryUrl: '/network', secondaryLabel: 'Open Status Center', secondaryUrl: URLS.status })));
app.get(['/legal', '/privacy', '/terms'], (req, res) => sendPage(res, routePage({ title: 'Legal', eyebrow: 'Legal', heading: 'QR-V provides infrastructure; issuers remain responsible for claims.', lead: `This public policy route (${req.path}) summarizes the root trust disclaimer and routes operational use to the relevant service.`, primaryLabel: 'Return Home', primaryUrl: '/', secondaryLabel: 'View Network Directory', secondaryUrl: '/network' })));

app.post('/verify', (req, res) => {
  const qrvid = cleanQrvid(req.body?.qrvid);
  if (!qrvid) return res.redirect(303, '/verify');
  return res.redirect(303, verifyUrl(qrvid));
});

app.get(['/dashboard', '/records', '/records/new', '/certificates', '/issue', '/revoke', '/api-keys', '/settings', '/billing'], (req, res) => {
  res.redirect(302, `${URLS.issuer}${req.path}`);
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
  const qrvid = cleanQrvid(req.body?.qrvid);
  if (!qrvid) return res.status(400).json({ ok: false, status: 'INVALID_FORMAT', error: 'qrvid is required' });
  const scans = Number(scanCounts.get(qrvid) || 0) + 1;
  scanCounts.set(qrvid, scans);
  if (issuedRecords.has(qrvid)) rememberRecord({ ...issuedRecords.get(qrvid), scans });
  addAudit('record.scanned', { qrvid, scans });
  res.json({ ok: true, qrvid, scans, timestamp: now() });
});

app.use((req, res) => {
  res.status(404);
  sendPage(res, routePage({ title: 'Not Found', eyebrow: '404', heading: 'Route not found.', lead: `The requested QR-V Network page does not exist: ${req.path}`, primaryLabel: 'Return home', primaryUrl: '/', secondaryLabel: 'View Network Directory', secondaryUrl: '/network' }));
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
