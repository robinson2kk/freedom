CREATE TABLE IF NOT EXISTS public_request_limits (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  route TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_public_request_limits_route_ip_time
ON public_request_limits(route, ip_hash, created_at);
