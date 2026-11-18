-- Public directory consent and credential-review audit fields.
ALTER TABLE professional_applications ADD COLUMN public_listing_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE professional_applications ADD COLUMN public_contact_method TEXT;
ALTER TABLE professional_applications ADD COLUMN session_fee INTEGER;
ALTER TABLE professional_applications ADD COLUMN verification_source TEXT;
ALTER TABLE professional_applications ADD COLUMN verification_notes TEXT;
ALTER TABLE professional_applications ADD COLUMN verified_by TEXT;
ALTER TABLE professional_applications ADD COLUMN verified_at TEXT;
ALTER TABLE professional_applications ADD COLUMN verification_expires_at TEXT;
