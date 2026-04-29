# QRV Issuer Production Convergence Plan (7 Days)

## Objective
Move from ~92% readiness to first paying pilot customer in **7 days** by only shipping revenue-critical and trust-critical work.

## Success Criteria (Definition of Done)
- 1 issuer pays via live Stripe and is marked `active` in billing status.
- Issuer can self-serve: login, onboarding steps, issue first credential, and verify one credential publicly.
- Verify page clearly communicates trust signals (status, issuer identity, timestamp, tamper state).
- Uptime dashboard is live with alerting for downtime/error-rate spikes.
- One public landing page is live and captures qualified leads into a simple CRM pipeline.
- Founder onboarding workflow is scripted and repeatable in <30 minutes per customer.

---

## P0 Execution Order (No Non-Essential Features)
1. Stripe live checkout + billing status
2. Issuer dashboard onboarding + issuance path
3. Verify page trust UX
4. Uptime dashboard + alerts
5. Verification landing page
6. CRM + lead capture
7. Founder-led onboarding runbook

---

## 1) Stripe Live Checkout + Billing Status (P0)
### Must ship
- Live checkout session endpoint for selected plan (`starter`/`growth`).
- Stripe webhook ingestion for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Billing state shown in issuer dashboard with:
  - plan
  - status (`trialing`, `active`, `past_due`, `canceled`)
  - renewal date
  - payment action needed state

### Acceptance test
- Use Stripe test/live flow to complete checkout and confirm dashboard updates to `active` within 30s.

### Revenue KPI
- Time from signup to paid status < 10 minutes.

---

## 2) Issuer Dashboard: Onboarding + Issuance (P0)
### Must ship
- Single dashboard “First Credential Checklist”:
  1) Complete organization profile
  2) Confirm billing active
  3) Create first record
  4) Open public verify link
- Keep only essential nav:
  - Dashboard
  - Issue Record
  - Records
  - Billing
- Remove/disable any non-essential modules for pilot week.

### Acceptance test
- New issuer account can issue first credential with no manual backend intervention.

### KPI
- First successful issuance in < 15 minutes from first login.

---

## 3) Verify Page Trust UX (P0)
### Must ship
- Above-the-fold trust block:
  - Verification result (`VERIFIED` / `REVOKED` / `NOT FOUND`)
  - Issuer name
  - Credential ID (QRVID)
  - Issue date + last checked timestamp
- Integrity messaging:
  - “This credential is cryptographically referenced in QRV registry.”
- Clear CTA for disputes/support.

### Acceptance test
- 5 external testers can correctly interpret result state in <5 seconds.

### KPI
- Verification comprehension score >= 90% (quick user check).

---

## 4) Uptime Dashboard + Alerts (P0)
### Must ship
- Monitor: `qrv.network`, `issuer.qrv.network`, `verify.qrv.network`, `registry.qrv.network`, `api.qrv.network`.
- Display current status + last outage + response time.
- Alerts to founder channel (email/Slack) for:
  - downtime > 2 minutes
  - 5xx spike threshold

### Acceptance test
- Simulated failure triggers alert within 2 minutes.

### KPI
- Production availability >= 99.9% during pilot window.

---

## 5) Public Landing Page for Verification (P0)
### Must ship
- Single page focused on one job:
  - “Verify any QRV credential in seconds.”
- Sections only:
  - What QRV verifies
  - How to verify (3 steps)
  - Live verification CTA
  - Lead capture form (issuer interest)
  - Trust footer (status page link + contact)

### Acceptance test
- Page loads <2s on mobile and desktop; form submission succeeds.

### KPI
- Visitor → lead conversion >= 5% for targeted traffic.

---

## 6) Simple CRM / Lead Capture Pipeline (P0)
### Must ship
- Lead form fields:
  - name
  - company
  - use case
  - volume estimate
  - email
- Persist to lightweight datastore (current app store/DB table).
- Pipeline stages:
  - `new`
  - `qualified`
  - `proposal_sent`
  - `closed_won`
  - `closed_lost`
- Founder dashboard list with next action + date.

### Acceptance test
- New lead appears instantly and can move stages.

### KPI
- Response SLA to inbound lead < 4 hours.

---

## 7) Founder-Led Onboarding Workflow (P0)
### Must ship
- 30-minute call script:
  - 5 min qualification
  - 10 min setup
  - 10 min issuance walkthrough
  - 5 min close to paid pilot
- Shared checklist template for each account:
  - Billing active
  - First record issued
  - Verify page approved
  - Admin trained
- Follow-up sequence: D0, D2, D5.

### KPI
- Call-to-paid conversion target: >= 25%.

---

## 8) 7-Day Tactical Cadence
- **Day 1:** Stripe live + webhook reliability.
- **Day 2:** Dashboard onboarding simplification + first issuance flow.
- **Day 3:** Verify trust UX polish + smoke tests.
- **Day 4:** Uptime dashboard + alert routing.
- **Day 5:** Landing page + lead capture pipeline live.
- **Day 6:** Founder onboarding dry runs with 3 prospects.
- **Day 7:** Close first paid issuer and publish post-mortem notes.

---

## Daily Operating Metrics (Track at 9:00 and 17:00 UTC)
- New issuer signups
- Checkout starts
- Paid conversions
- Time-to-first-issuance
- Verify success rate
- Uptime / incidents
- Leads added + stage movement

## Guardrails
- No new features unless they directly improve:
  - revenue conversion
  - trust in verification output
  - uptime/reliability
  - onboarding speed
