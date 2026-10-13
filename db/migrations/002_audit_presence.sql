-- Migration 002: Presence columns and indexes for audit log and active admin tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_path text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);
