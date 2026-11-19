-- FREEDOM community hub: opt-in aggregate self-reports and moderated public chat.
CREATE TABLE IF NOT EXISTS community_progress_reports (
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('pornography','masturbation','alcohol','smoking')),
  progress_status TEXT NOT NULL DEFAULT 'seeking_support'
    CHECK(progress_status IN ('seeking_support','making_progress','self_reported_recovery')),
  share_publicly INTEGER NOT NULL DEFAULT 1 CHECK(share_publicly IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, category),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_reports_public
ON community_progress_reports(share_publicly, category, progress_status);

CREATE TABLE IF NOT EXISTS community_chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL CHECK(length(message) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','hidden','removed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_community_chat_visible
ON community_chat_messages(status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_chat_reports (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewed','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(message_id) REFERENCES community_chat_messages(id) ON DELETE CASCADE,
  FOREIGN KEY(reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(message_id, reporter_user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_chat_reports_queue
ON community_chat_reports(status, created_at DESC);
