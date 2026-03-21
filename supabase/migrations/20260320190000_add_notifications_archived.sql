ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notifications_archived ON notifications(recipient_id, is_archived);
