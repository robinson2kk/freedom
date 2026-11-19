# FREEDOM Marketplace — Implementation Plan

**Status:** Foundation branch; not production-enabled  
**Brand:** FREEDOM  
**Commission:** 1,500 basis points (15%)  
**Professional payout:** Only after session completion checks  
**Launch taxonomy:** All six categories  
**Stack:** Cloudflare Pages Functions + D1

## Decisions
- Compare Razorpay Route and Cashfree Easy Split; keep the application gateway-neutral.
- Do not activate a gateway until the provider approves the marketplace's exact service categories, provider KYC, delayed settlement, refund and dispute flow in writing.
- The free educational/self-reflection resources and tracker remain free. Paid bookings are optional.
- All six professional categories are included in the taxonomy: clinical psychologist, counsellor, addiction recovery professional, psychiatrist, life & wellness coach, peer-support facilitator.
- Provider approval is an internal FREEDOM review, not a regulator's accreditation or clinical endorsement.

## Foundation files
- `migrations/007_marketplace_foundation.sql`: categories, services, slots, bookings, payments, commissions, settlements, refunds, disputes, webhook idempotency and audit ledger.
- `functions/api/marketplace/categories.js`: read-only category endpoint.

## Current implementation additions\n- `professional-dashboard.html`: authenticated dashboard for approved providers to create service drafts and availability.\n- `functions/api/professional/dashboard.js`: approved provider identity endpoint.\n- `functions/api/professional/services.js`: provider-owned service draft API; drafts are inactive by default.\n- `functions/api/professional/slots.js`: provider-owned availability API with overlap and duration checks.\n- `functions/api/admin/marketplace/services.js` and `admin-marketplace-services.html`: admin service content review; approval does not activate listing or payment.\n- Service review status and reviewer audit details are stored in the marketplace migration.\n\n## Financial invariants
1. Amounts are integer paise, INR.
2. Commission is 15% of the eligible booking gross amount, stored in basis points (1500).
3. Provider gross share is the remainder before gateway charges, taxes, refunds and other contractually disclosed adjustments.
4. Never initiate provider transfer on payment success alone.
5. Settlement requires completed-session eligibility, no open dispute/refund hold, verified payment and successful server-side ledger checks.
6. Gateway webhook events are signature-verified and idempotent.
7. Browser redirects/callbacks are not proof of payment.
8. Refunds and reversals must create ledger adjustments; do not overwrite financial history.

## Booking state machine
`pending_payment -> confirmed -> completed`
Alternative states: `cancelled`, `expired`, `refunded`, `disputed`.
Completion: `not_started -> professional_submitted -> customer_confirmed`; disputes route to admin review. No-response completion policy must be disclosed and implemented before production.

## API roadmap
- GET `/api/marketplace/categories`
- GET `/api/marketplace/professionals` (approved profiles only)
- POST `/api/professional/apply`
- POST `/api/professional/services`
- POST `/api/professional/availability`
- POST `/api/bookings/create`
- POST `/api/payments/create-order`
- POST `/api/payments/verify`
- POST `/api/payments/webhook/razorpay`
- POST `/api/payments/webhook/cashfree`
- POST `/api/bookings/complete`
- POST `/api/bookings/cancel`
- POST `/api/admin/marketplace/disputes`
- GET `/api/admin/marketplace/settlements`

All private routes require authenticated user identity, role checks, same-origin/CSRF protections, server-side validation, rate limits and audit logging.

## Delivery sequence
1. Apply and validate migration 007 in a non-production D1 database.
2. Extend application intake with six category-specific credential checklists.
3. Add secure private credential storage and admin verification workflow.
4. Add professional dashboard, service management and availability.
5. Add public search and profile pages; only approved profiles with listing consent appear.
6. Add slot holds and booking creation with race-safe database transactions.
7. Implement gateway adapters and sandbox webhook tests for both providers.
8. Implement completion, dispute, refund and settlement queue.
9. Complete privacy, security, tax, consumer-law and healthcare-law reviews.
10. Launch after payment-provider approval and production sign-off.

## Required production controls
- Private object storage for identity/credential documents; never public URLs.
- Secrets only in Cloudflare encrypted environment secrets.
- Signature verification against raw webhook body, unique event IDs and replay protection.
- Separate staging and production D1 databases and gateway credentials.
- Audit every admin and financial mutation.
- Keep sensitive tracker information separate from bookings and payments.
- Publish accurate terms, privacy, cancellation/refund, commission, grievance and provider agreements.
- Disclose legal entity identity, support and grievance contact before accepting payments.
- Do not market the service as emergency care or as a replacement for qualified professional care.

## Not yet implemented
No gateway credentials, provider accounts, live payment endpoints, booking UI, payout automation or production migration has been enabled by this foundation commit.
