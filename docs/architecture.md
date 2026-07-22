# One Companion & Homemakers Unified Platform Architecture

## Purpose

One Companion & Homemakers is planned as a unified care operations and marketplace platform rather than two separate products. Agency operations, provider marketplace workflows, client self-service, payments, documentation, reporting, and integrations should share one role-aware foundation so the organization can scale from a local care business into a broader care management platform without a later architectural rewrite.

## Platform principles

- **One shared data model:** clients, providers, services, bookings, documents, payments, reviews, and audit events should be represented consistently across internal operations and marketplace experiences.
- **Role-aware experiences:** clients, family members, caregivers, independent providers, employees, administrators, and support staff should see the same platform through permissions-based dashboards.
- **Security-first care records:** care documentation, medication reminders, incident reports, background checks, signatures, and stored documents must remain behind explicit authorization, audit logging, and secure storage controls.
- **Composable modules:** acquisition, scheduling, billing, documentation, provider profiles, booking, messaging, analytics, and integrations should be built as interoperable modules instead of isolated feature silos.
- **Integration-ready:** WordPress, WooCommerce, Tutor LMS, Stripe, Square, Google Calendar, Google Maps, Twilio, Gmail, QuickBooks, background-check vendors, electronic-signature providers, REST APIs, and webhooks should connect through stable service boundaries.

## Core platform domains

### 1. Client acquisition

The acquisition layer converts prospects into consultations, quotes, and client records. It includes landing pages, SEO and local service pages, referral programs, lead capture, free consultation booking, Google Business integration, contact forms, and quote requests.

### 2. Care services

The care services catalog defines the offerings that can be marketed, quoted, scheduled, documented, and billed. Initial categories include companion care, homemaker services, personal care, live-in care, respite care, transportation, wellness visits, meal preparation, grocery shopping, medication reminders, and home safety checks.

### 3. Scheduling

Scheduling is the operational source of truth for calendars, caregiver schedules, client schedules, provider availability, shift assignments, route planning, appointment reminders, and recurring visits. Marketplace bookings and agency-assigned visits should resolve into the same scheduling model.

### 4. Billing and payments

Billing connects estimates, invoices, online payments, recurring billing, payment plans, payroll exports, tax reporting, and financial dashboards. Payment events should reconcile with bookings, completed visits, provider earnings, client balances, and administrator reporting.

### 5. Care documentation

Care documentation includes visit notes, care plans, daily reports, incident reports, medication reminders, family updates, electronic signatures, and secure document storage. These workflows require strict permissions, audit trails, and clear separation between internal notes and family-facing updates.

### 6. Team management

Team management covers employee profiles, independent provider profiles, certifications, background checks, onboarding, training, time tracking, performance reviews, and internal messaging. The same identity and credentialing foundation should power both employed caregivers and marketplace providers.

### 7. Marketplace

The marketplace exposes provider discovery and booking capabilities through provider directories, provider search, service categories, availability, service areas, pricing, instant booking, and favorite providers. Marketplace activity should feed the same booking, payment, review, and reporting systems used by the agency workflow.

### 8. Provider profiles

Provider profiles should include biography, experience, certifications, languages, services offered, rates, reviews, photos, travel radius, and an availability calendar. Profile information should support public discovery while protecting private onboarding, compliance, and payment details.

### 9. Search and matching

Search and matching should support ZIP code search, city search, distance search, service filters, availability filters, language filters, experience filters, rating filters, and price filters. Matching logic should be reusable by public marketplace search, administrator scheduling, and client dashboard recommendations.

### 10. Booking engine

The booking engine coordinates instant booking, request booking, calendar integration, deposit collection, confirmation emails, reminders, cancellation management, and rescheduling. Booking status changes should update schedules, payments, provider dashboards, client dashboards, notifications, and reporting.

### 11. Ratings and reviews

Ratings and reviews include client reviews, provider reviews, verified reviews, star ratings, written testimonials, and response management. Review eligibility should be tied to completed and verified bookings or visits.

### 12. Provider dashboard

The provider dashboard should expose upcoming appointments, earnings, calendar management, messages, documents, availability, mileage, payments, reviews, and tax summaries. It should work for both employees and independent providers with permission-based differences.

### 13. Client dashboard

The client dashboard should expose care schedules, service booking, messages, family access, documents, payments, care history, and favorite providers. Family access should use delegated permissions so authorized relatives can view schedules, updates, documents, and billing details as appropriate.

### 14. Administrator dashboard

The administrator dashboard should provide operational controls for clients, providers, scheduling, billing, reports, compliance, website management, marketing, analytics, forms, and support tickets. Administrators should be able to oversee both agency-managed care and marketplace transactions in one place.

### 15. APIs and integrations

The integration layer should support WordPress, WooCommerce, Tutor LMS, Stripe, Square, Google Calendar, Google Maps, Twilio SMS, Gmail, QuickBooks, background-check providers, electronic-signature providers, a REST API, and outbound webhooks. Integrations should use explicit credentials, scoped permissions, retries, and audit logs where applicable.

### 16. Reporting and analytics

Reporting should track revenue, bookings, client growth, provider growth, occupancy, utilization, marketing performance, financial reports, and compliance reports. Metrics should be derived from shared platform events to avoid conflicting reports across departments.

### 17. Mobile experience

The mobile experience should support client, provider, and administrator use cases, including push notifications, GPS check-in/check-out, secure messaging, and offline visit notes. Offline workflows should sync through conflict-aware APIs and preserve auditability.

## Shared workflow model

1. A prospect arrives through acquisition content, referrals, Google Business, contact forms, or quote requests.
2. The prospect books a consultation or searches the marketplace for available services and providers.
3. Matching uses location, service needs, availability, language, experience, ratings, and price constraints.
4. A booking or agency assignment creates schedule entries, payment expectations, reminders, and dashboard updates.
5. Providers complete visits, capture notes, check in or out, submit mileage when applicable, and trigger family updates.
6. Billing, payroll exports, tax summaries, reviews, and analytics are generated from completed visits and payment events.
7. Administrators monitor compliance, support tickets, marketing, utilization, finances, and operational performance.

## Current implementation boundary

This repository currently provides a private WordPress plugin foundation for One Companion operations. The existing implementation intentionally emphasizes bootstrap wiring, activation and deactivation lifecycle, roles and capabilities, database migration structure, audit logging, admin/public surfaces, REST API endpoints, and documentation before sensitive care modules are built.

Sensitive operational features such as client records, care notes, medication reminders, payroll, background checks, transportation records, and secure document workflows must not be implemented with real data until permissions, audit logging, retention rules, and storage controls have been reviewed and approved.

## Implementation roadmap

1. Stabilize the shared identity, role, capability, audit, and migration framework.
2. Model the shared service catalog, client, provider, availability, schedule, booking, payment, document, review, and notification entities.
3. Build administrator controls for services, providers, clients, scheduling, billing, compliance, forms, support tickets, and reporting.
4. Add client and family dashboards for booking, schedules, documents, messaging, payments, care history, and favorite providers.
5. Add provider dashboards for availability, appointments, visit documentation, earnings, mileage, documents, messages, reviews, and tax summaries.
6. Connect acquisition surfaces, marketplace search, provider profiles, quote requests, consultation booking, and referral tracking.
7. Integrate payment, calendar, mapping, SMS, email, accounting, background-check, e-signature, WordPress, WooCommerce, Tutor LMS, REST API, and webhook workflows.
8. Expand to mobile experiences with push notifications, GPS check-in/check-out, secure messaging, and offline visit notes.

## Data boundaries

Do not commit real employee, client, health, payroll, background-check, family, payment, tax, transportation, credentialing, or care documentation records. Use only fictional fixtures and clearly marked examples.
