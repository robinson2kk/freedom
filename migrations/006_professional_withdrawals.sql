-- Applicant withdrawal and profile-removal requests. Requests are reviewed manually; no immediate deletion.
CREATE TABLE IF NOT EXISTS professional_withdrawal_requests (
 id TEXT PRIMARY KEY,
 full_name TEXT NOT NULL,
 email TEXT NOT NULL,
 reason TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','reviewing','completed','declined')),
 submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
 reviewed_by TEXT,
 reviewed_at TEXT,
 admin_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_professional_withdrawals_status_date ON professional_withdrawal_requests(status,submitted_at);
CREATE INDEX IF NOT EXISTS idx_professional_withdrawals_email ON professional_withdrawal_requests(email);
