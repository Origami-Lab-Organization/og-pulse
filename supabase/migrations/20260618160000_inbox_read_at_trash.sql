-- FUNC-J3 — Caixa de Entrada: read_at + Lixeira (soft delete).
--
-- read_at: marca quando a notificação foi lida (complementa is_read).
-- deleted_at: soft delete — a "exclusão" move a notificação para a Lixeira.
--   A RLS de `notifications` não tem policy de DELETE (só SELECT/UPDATE/INSERT),
--   por isso o delete físico não funcionava. O soft delete via UPDATE respeita a
--   policy de UPDATE existente e ainda permite restaurar.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notifications.read_at IS
  'FUNC-J3: momento em que a notificação foi marcada como lida.';
COMMENT ON COLUMN public.notifications.deleted_at IS
  'FUNC-J3: soft delete — presente = está na Lixeira. Exclusão move para cá; restaurar limpa o campo.';

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_deleted
  ON public.notifications (recipient_id, deleted_at);
