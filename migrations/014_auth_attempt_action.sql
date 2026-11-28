-- Separate sign-in failures from account-creation attempts.
-- Existing rows default to login; new requests explicitly set their action.
ALTER TABLE auth_attempts ADD COLUMN action TEXT NOT NULL DEFAULT 'login';
CREATE INDEX IF NOT EXISTS idx_auth_attempts_action_time
  ON auth_attempts(action, attempted_at);
