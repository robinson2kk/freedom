-- FREEDOM marketplace foundation.
-- This migration creates booking/payment ledgers only. No gateway is activated by this migration.
ALTER TABLE professional_applications ADD COLUMN marketplace_category TEXT;
ALTER TABLE professional_applications ADD COLUMN provider_onboarding_status TEXT NOT NULL DEFAULT 'not_started';

CREATE TABLE IF NOT EXISTS marketplace_categories (
  id TEXT PRIMARY KEY,
  public_label TEXT NOT NULL,
  public_scope TEXT NOT NULL,
  credential_checklist TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO marketplace_categories
(id, public_label, public_scope, credential_checklist) VALUES
('clinical_psychologist','Clinical Psychologist','Clinical assessment and psychological services within applicable professional scope.','Relevant qualification; applicable active RCI registration; identity and expiry review.'),
('counsellor','Counsellor','Counselling and supportive services within documented training and competence.','Relevant qualification/training; experience; scope and safeguarding review.'),
('addiction_recovery','Addiction Recovery Professional','Non-emergency recovery support within documented qualifications and competence.','Relevant training/qualification; experience; scope and referral boundaries.'),
('psychiatrist','Psychiatrist','Medical psychiatric services by appropriately registered medical practitioners.','Recognised medical qualification; applicable active medical registration; specialty evidence.'),
('wellness_coach','Life & Wellness Coach','Non-clinical coaching for wellbeing goals and habits; no diagnosis or treatment.','Coach training; experience; non-clinical scope and safeguarding review.'),
('peer_support','Peer-Support Facilitator','Non-clinical peer support and signposting; no diagnosis or treatment.','Peer-support training; role boundaries; safeguarding and escalation training.');

CREATE TABLE IF NOT EXISTS professional_services (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 15 AND 240),
  price_paise INTEGER NOT NULL CHECK(price_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('online','in_person','both')),
  active INTEGER NOT NULL DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(application_id) REFERENCES professional_applications(id)
);
CREATE INDEX IF NOT EXISTS idx_market_services_provider_active
ON professional_services(application_id, active);

CREATE TABLE IF NOT EXISTS professional_slots (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  status TEXT NOT NULL DEFAULT 'available'
    CHECK(status IN ('available','held','booked','blocked','completed')),
  hold_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(application_id) REFERENCES professional_applications(id),
  FOREIGN KEY(service_id) REFERENCES professional_services(id),
  CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_market_slots_search
ON professional_slots(status, starts_at, service_id);

CREATE TABLE IF NOT EXISTS marketplace_bookings (
  id TEXT PRIMARY KEY,
  customer_user_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  slot_id TEXT NOT NULL UNIQUE,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK(status IN ('pending_payment','confirmed','cancelled','completed','refunded','disputed','expired')),
  completion_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK(completion_status IN ('not_started','professional_submitted','customer_confirmed','disputed','admin_approved')),
  terms_version TEXT NOT NULL,
  cancellation_policy_version TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(application_id) REFERENCES professional_applications(id),
  FOREIGN KEY(service_id) REFERENCES professional_services(id),
  FOREIGN KEY(slot_id) REFERENCES professional_slots(id)
);
CREATE INDEX IF NOT EXISTS idx_market_bookings_customer
ON marketplace_bookings(customer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_bookings_provider_status
ON marketplace_bookings(application_id, status);

CREATE TABLE IF NOT EXISTS marketplace_payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  gateway TEXT NOT NULL CHECK(gateway IN ('razorpay','cashfree')),
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  status TEXT NOT NULL DEFAULT 'created'
    CHECK(status IN ('created','pending','paid','failed','partially_refunded','refunded')),
  webhook_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES marketplace_bookings(id),
  UNIQUE(gateway, gateway_order_id),
  UNIQUE(gateway, gateway_payment_id)
);
CREATE INDEX IF NOT EXISTS idx_market_payments_booking
ON marketplace_payments(booking_id);

CREATE TABLE IF NOT EXISTS marketplace_commissions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  gross_amount_paise INTEGER NOT NULL,
  commission_rate_bps INTEGER NOT NULL DEFAULT 1500,
  commission_amount_paise INTEGER NOT NULL,
  provider_gross_share_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','earned','reversed','adjusted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES marketplace_bookings(id)
);

CREATE TABLE IF NOT EXISTS marketplace_settlements (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  application_id TEXT NOT NULL,
  gateway TEXT NOT NULL CHECK(gateway IN ('razorpay','cashfree')),
  gateway_transfer_id TEXT,
  amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
  status TEXT NOT NULL DEFAULT 'held'
    CHECK(status IN ('held','eligible','initiated','settled','failed','reversed')),
  eligible_at TEXT,
  initiated_at TEXT,
  settled_at TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES marketplace_bookings(id),
  FOREIGN KEY(application_id) REFERENCES professional_applications(id)
);
CREATE INDEX IF NOT EXISTS idx_market_settlement_queue
ON marketplace_settlements(status, eligible_at);

CREATE TABLE IF NOT EXISTS marketplace_refunds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  gateway_refund_id TEXT,
  amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK(status IN ('requested','processing','succeeded','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES marketplace_bookings(id)
);

CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  raised_by_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK(status IN ('open','under_review','resolved_customer','resolved_professional','closed')),
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(booking_id) REFERENCES marketplace_bookings(id)
);

CREATE TABLE IF NOT EXISTS marketplace_webhook_events (
  id TEXT PRIMARY KEY,
  gateway TEXT NOT NULL CHECK(gateway IN ('razorpay','cashfree')),
  gateway_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK(processing_status IN ('received','processed','failed','ignored')),
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  UNIQUE(gateway, gateway_event_id)
);

CREATE TABLE IF NOT EXISTS marketplace_audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_market_audit_entity
ON marketplace_audit_log(entity_type, entity_id, created_at DESC);
