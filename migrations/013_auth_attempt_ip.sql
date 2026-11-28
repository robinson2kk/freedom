-- Add privacy-preserving IP hashes for authentication rate limits.
-- Apply once to the FREEDOM D1 database before deploying the matching code.
ALTER TABLE auth_attempts ADD COLUMN ip_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time
  ON auth_attempts(ip_hash, attempted_at);
