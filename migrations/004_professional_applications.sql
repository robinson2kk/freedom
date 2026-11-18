-- Professional network applications. Store only information needed for initial review.
CREATE TABLE IF NOT EXISTS professional_applications (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  applicant_type TEXT NOT NULL,
  qualifications TEXT,
  registration_body TEXT,
  registration_number TEXT,
  experience_years INTEGER,
  support_areas TEXT NOT NULL,
  languages TEXT,
  location TEXT,
  service_mode TEXT NOT NULL,
  availability TEXT,
  service_type TEXT NOT NULL,
  bio TEXT,
  consent_privacy INTEGER NOT NULL DEFAULT 0,
  consent_verification INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_professional_applications_status_date
ON professional_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_professional_applications_email
ON professional_applications(email);
