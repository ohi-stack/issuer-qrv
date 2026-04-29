# QRV Go-Live Build Plan (Top 10 Priorities)

This plan converts the requested priorities into implementation-ready tracks with clear deliverables and acceptance checks.

## 1) Make `verify.qrv.network` zero-downtime production stable

### Deliverables
- Blue/green deploy workflow for the verify service.
- Readiness gate (`/readyz`) enforced before traffic cutover.
- Health-driven automatic rollback if 5xx or latency SLO breaches post-deploy.
- Circuit breaker + timeout + retry policy for `registry.qrv.network` dependency.

### Implementation checklist
- Add deployment runbook with exact cutover/rollback commands.
- Add startup probes + readiness probes in production platform config.
- Define SLOs: p95 latency, error rate, uptime objective.
- Add chaos drills for registry timeout/degradation behavior.

### Acceptance
- 3 consecutive production deploys with no user-visible downtime.
- Synthetic verification probes remain green through deploy windows.

---

## 2) Build beautiful public verification result page

### Deliverables
- Production UI for `/verify/:qrvid` with clear states:
  - Verified
  - Revoked
  - Not found
  - Temporarily unavailable
- Branded trust signals: issuer, timestamp, record summary, QRVID copy/share.
- Mobile-first and WCAG AA contrast/accessibility.

### Implementation checklist
- Build shared design tokens and status color system.
- Add skeleton loading and resilient fallback messaging.
- Add metadata/Open Graph for sharable proof links.

### Acceptance
- Lighthouse mobile score >= 90 for performance, accessibility, best-practices.
- UX review sign-off with final branded design.

---

## 3) Finish Stripe checkout for issuer plans

### Deliverables
- End-to-end hosted checkout flow for Starter/Growth.
- Signed-in issuer -> checkout -> success/cancel routing.
- Webhook handling for subscription lifecycle events.

### Implementation checklist
- Validate `price_id` mapping from plan slug.
- Persist customer + subscription status server-side.
- Handle events: checkout completion, subscription update/cancel, invoice payment failure.
- Add billing portal link for self-serve upgrades/cancellations.

### Acceptance
- Test-mode checkout completes for both plans.
- Webhook replay confirms idempotent subscription updates.

---

## 4) Create pricing page

### Deliverables
- Public `/pricing` page with clear plan table and CTA routing.
- Comparison rows: usage limits, revocations, API access, support tiers.

### Implementation checklist
- Tie CTA buttons to Stripe checkout routes.
- Add FAQ + compliance/trust section.
- Add analytics events for CTA clicks.

### Acceptance
- All CTAs route correctly and emit analytics events.

---

## 5) Create issuer signup flow

### Deliverables
- `/signup` flow: account creation, email verification, onboarding, first workspace.
- Guarded access to issuer dashboard until verification is complete.

### Implementation checklist
- Add secure password policy and one-time verification token flow.
- Auto-provision default API key + starter onboarding checklist.
- Add anti-abuse rate limiting + bot protection.

### Acceptance
- New user can sign up and reach dashboard without manual admin intervention.

---

## 6) Create sample verified certificate demo

### Deliverables
- Public demo route with one permanent, non-sensitive sample certificate.
- Demo QR code that resolves to live verification page.

### Implementation checklist
- Add seed script for sample record lifecycle.
- Add reset script to re-seed demo if record is revoked accidentally.
- Add guided product tour copy around the demo.

### Acceptance
- Demo link remains verifiable across deployments.

---

## 7) Add uptime monitoring dashboard

### Deliverables
- Internal dashboard for api/issuer/verify/registry health + trends.
- Incident status ribbon when any domain is degraded.

### Implementation checklist
- Collect response time, status, and failure rate over rolling windows.
- Add alert routing (email/Slack/PagerDuty) for threshold breaches.
- Publish uptime summary widget for operator view.

### Acceptance
- Simulated outage triggers alert and appears in dashboard timeline.

---

## 8) Add customer lead capture CRM

### Deliverables
- Lead capture forms across landing/pricing/demo.
- Central lead inbox with status stages (new, qualified, won/lost).

### Implementation checklist
- Normalize lead fields (name, email, company, use case, source).
- Add duplicate detection and ownership assignment.
- Add CSV export + webhook push to downstream CRM if needed.

### Acceptance
- Leads from all public forms are stored, searchable, and stage-manageable.

---

## 9) Publish API docs

### Deliverables
- Public API docs portal (`/developers` or `/docs`).
- OpenAPI spec + examples for issue/verify/revoke flows.

### Implementation checklist
- Generate docs from versioned OpenAPI source of truth.
- Add auth guide, error model, limits, and webhook verification examples.
- Add copy-paste curl snippets and Postman collection.

### Acceptance
- External developer can complete first successful API call sequence in < 15 minutes.

---

## 10) Build first outbound sales landing page

### Deliverables
- Focused outbound page per ICP with one clear CTA.
- Proof block (logos, metrics, trust/compliance), FAQ, and calendar/demo CTA.

### Implementation checklist
- Build UTM-aware attribution capture.
- Add headline variants for A/B testing.
- Connect CTA to lead capture + sales follow-up workflow.

### Acceptance
- Page loads fast, tracks attribution, and sends leads into CRM pipeline.

---

## Recommended execution order (6-week sprint)

1. Stability foundation: #1 and #7
2. Revenue path: #3, #4, #5
3. Trust + conversion: #2, #6, #10
4. Scale enablement: #8 and #9

## Definition of done (global)

- Production runbook updated.
- Monitoring and alerts active.
- Security and abuse checks enabled.
- Analytics instrumentation verified.
- Smoke tests pass in production after deploy.
