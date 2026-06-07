require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

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

async function createRegistryRecord({ type, issuer, owner, payload }) {
  const response = await fetch(`${URLS.registry}/registry/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ type, issuer, owner, payload })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Registry create failed: ${response.status}`);
  return body;
}

async function revokeRegistryRecord(qrvid, reason) {
  const response = await fetch(`${URLS.registry}/registry/${encodeURIComponent(qrvid)}/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reason })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Registry revoke failed: ${response.status}`);
  return body;
}

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
    const { issuer, owner, title, type, metadata } = req.body;
    const result = await createRegistryRecord({ type: type || 'certificate', issuer, owner, payload: { title, metadata, source: 'qrv-network-root', issuedAt: now() } });
    const verifyUrl = result.verifyUrl || `${URLS.verify}/${encodeURIComponent(result.qrvid)}`;
    sendPage(res, { path: '/issue', title: 'Record Issued | QR-V Network', description: 'Record issued.', body: `<section class="route-title"><p class="eyebrow">Issued</p><h1>Record issued.</h1><p class="lead">Certificate record created successfully.</p></section><section class="section"><p><strong>QRVID</strong></p><p class="mono">${escapeHtml(result.qrvid)}</p><p><strong>Hash</strong></p><p class="mono">${escapeHtml(result.hash)}</p><a class="btn" href="${escapeHtml(verifyUrl)}">Open verification page</a> <a class="btn alt" href="/issue">Issue another</a></section>` });
  } catch (error) {
    res.status(500);
    sendPage(res, { path: '/issue', title: 'Issue Failed | QR-V Network', description: 'Issue failed.', body: `<section class="route-title"><p class="eyebrow">Error</p><h1>Issue failed.</h1><p class="lead">${escapeHtml(error.message)}</p><a class="btn" href="/issue">Try again</a></section>` });
  }
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
    const { type = 'certificate', issuer = DEFAULT_ISSUER_NAME, owner, payload = {} } = req.body;
    if (!owner) return res.status(400).json({ status: 'INVALID_REQUEST', error: 'owner is required' });
    const result = await createRegistryRecord({ type, issuer, owner, payload });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

app.post('/api/revoke/:qrvid', async (req, res) => {
  try {
    const result = await revokeRegistryRecord(req.params.qrvid, req.body?.reason || null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

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
