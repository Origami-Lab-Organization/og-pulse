-- Reversão de 20261021135000_meu_kanban_lembretes_e_configuracao.sql.
-- Perde: preferências do kanban, inscrições de push, hora/lembrete dos cards e o registro de
-- arquivamento (cards arquivados voltam ao board). Os nomes das colunas não mudam aqui: se a
-- 20261021161500 (nomes em português) já tiver rodado, reverter ela antes.

select cron.unschedule('notify-personal-kanban-reminders')   where exists (select 1 from cron.job where jobname = 'notify-personal-kanban-reminders');
select cron.unschedule('archive-personal-kanban-done-daily') where exists (select 1 from cron.job where jobname = 'archive-personal-kanban-done-daily');

DROP FUNCTION IF EXISTS public.archive_done_personal_kanban_cards();
DROP FUNCTION IF EXISTS public.has_due_personal_kanban_reminders();
DROP FUNCTION IF EXISTS public.claim_due_personal_kanban_reminders(integer);

DROP TABLE IF EXISTS public.push_subscriptions;
DROP TABLE IF EXISTS public.personal_kanban_settings;

DROP TRIGGER IF EXISTS personal_kanban_columns_after_stage_change ON public.personal_kanban_columns;
DROP FUNCTION IF EXISTS public.personal_kanban_columns_after_stage_change();
DROP TRIGGER IF EXISTS personal_kanban_cards_before_write ON public.personal_kanban_cards;
DROP FUNCTION IF EXISTS public.personal_kanban_cards_before_write();

DROP INDEX IF EXISTS public.idx_pkcard_remind_pending;

ALTER TABLE public.personal_kanban_cards
  DROP CONSTRAINT IF EXISTS personal_kanban_cards_reminder_consistent,
  DROP CONSTRAINT IF EXISTS personal_kanban_cards_time_needs_date,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS reminder_sent_at,
  DROP COLUMN IF EXISTS remind_at,
  DROP COLUMN IF EXISTS reminder_minutes,
  DROP COLUMN IF EXISTS due_time;

ALTER TABLE public.personal_kanban_columns
  DROP CONSTRAINT IF EXISTS personal_kanban_columns_name_valid,
  DROP CONSTRAINT IF EXISTS personal_kanban_columns_color_valid,
  DROP CONSTRAINT IF EXISTS personal_kanban_columns_stage_valid,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS stage;
