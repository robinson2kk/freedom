-- Record moderator decisions for accountability and later review.
CREATE TABLE IF NOT EXISTS community_chat_moderation_actions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  reviewer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK(action IN ('hide','remove','restore')),
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_moderation_message_time
  ON community_chat_moderation_actions(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_moderation_reviewer_time
  ON community_chat_moderation_actions(reviewer_user_id, created_at DESC);
