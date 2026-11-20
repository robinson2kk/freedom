-- FREEDOM companion feedback and lightweight abuse controls.
CREATE TABLE IF NOT EXISTS website_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  feedback_type TEXT NOT NULL CHECK(feedback_type IN ('website','recovery-tools','ruby-ai','bug-report','suggestion','other')),
  message TEXT NOT NULL CHECK(length(message) BETWEEN 10 AND 1500),
  contact_email TEXT,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_feedback_queue ON website_feedback(status, created_at DESC);
CREATE TABLE IF NOT EXISTS public_request_limits (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_public_request_limits_window ON public_request_limits(ip_hash, route, created_at DESC);
