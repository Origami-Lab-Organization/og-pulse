-- Meu Kanban: configuração por pessoa e lembrete de compromisso (21/10/2026). Decisão: ADR-0050.
--
-- 1. Etapa da coluna. Até aqui o board reconhecia "a fazer / fazendo / feito" pelo NOME da
--    coluna ('To do', 'Doing', 'Done'), em src/types/personalKanban.ts e no widget do
--    dashboard: bastava renomear uma coluna para os cards de projeto sumirem dela. Agora cada
--    coluna declara a etapa (`stage`) e o nome fica livre. Em produção as 63 colunas (21
--    pessoas × 3) eram exatamente as três do padrão. Os NOMES continuam em inglês aqui: o
--    front antigo ainda acha as colunas pelo nome, e esta migration foi aplicada antes do
--    front novo subir. A troca para A fazer / Fazendo / Feito é a 20261021161500, que entra
--    no deploy junto com o front.
-- 2. Hora e lembrete no card. `due_date` segue sendo o dia; `due_time` é a hora local,
--    opcional. `remind_at` é o instante do lembrete, calculado no navegador, que conhece o
--    fuso de quem marcou (o banco não guarda fuso de pessoa nem de tenant).
-- 3. Limpeza do Feito: card concluído há mais de N dias sai do board (`archived_at`) e pode
--    ser restaurado. `completed_at` marca quando o card entrou numa coluna de etapa "feito".
-- 4. Preferências por pessoa: lembrete padrão, dias até arquivar, e-mail ligado ou não.
-- 5. Inscrições de push do navegador (Web Push/VAPID). Tabela genérica: o lembrete do
--    kanban é o primeiro uso, não o único possível.
-- 6. Dois cron jobs: lembretes a cada minuto (só chama a Edge Function quando há lembrete
--    vencido) e arquivamento diário (SQL puro).
--
-- Rollback: supabase/rollback/20261021135000_meu_kanban_lembretes_e_configuracao_rollback.sql

-- ── 1. Etapa e cor da coluna ──────────────────────────────────────────────────
ALTER TABLE public.personal_kanban_columns
  ADD COLUMN stage text NOT NULL DEFAULT 'todo',
  -- Chave de token do tema (src/lib/personalKanban.ts), nunca hex: a cor acompanha o tema.
  ADD COLUMN color text NOT NULL DEFAULT 'neutral';

UPDATE public.personal_kanban_columns SET stage = 'doing', color = 'info'    WHERE name = 'Doing';
UPDATE public.personal_kanban_columns SET stage = 'done',  color = 'success' WHERE name = 'Done';

ALTER TABLE public.personal_kanban_columns
  ADD CONSTRAINT personal_kanban_columns_stage_valid CHECK (stage IN ('todo', 'doing', 'done')),
  ADD CONSTRAINT personal_kanban_columns_color_valid
    CHECK (color IN ('neutral', 'info', 'success', 'warning', 'destructive', 'slate', 'palm')),
  ADD CONSTRAINT personal_kanban_columns_name_valid CHECK (char_length(btrim(name)) BETWEEN 1 AND 60);

-- ── 2 e 3. Hora, lembrete e arquivamento no card ──────────────────────────────
ALTER TABLE public.personal_kanban_cards
  ADD COLUMN due_time         time,
  ADD COLUMN reminder_minutes integer,
  ADD COLUMN remind_at        timestamptz,
  ADD COLUMN reminder_sent_at timestamptz,
  ADD COLUMN completed_at     timestamptz,
  ADD COLUMN archived_at      timestamptz;

ALTER TABLE public.personal_kanban_cards
  -- Hora sem dia não é prazo.
  ADD CONSTRAINT personal_kanban_cards_time_needs_date CHECK (due_time IS NULL OR due_date IS NOT NULL),
  -- Lembrete existe por inteiro ou não existe: antecedência, instante e prazo juntos.
  ADD CONSTRAINT personal_kanban_cards_reminder_consistent CHECK (
    (reminder_minutes IS NULL AND remind_at IS NULL)
    OR (reminder_minutes BETWEEN 0 AND 10080 AND remind_at IS NOT NULL AND due_date IS NOT NULL)
  );

-- Cards que já estão no Feito contam como concluídos desde a última alteração.
UPDATE public.personal_kanban_cards c
   SET completed_at = c.updated_at
  FROM public.personal_kanban_columns col
 WHERE col.id = c.column_id AND col.stage = 'done';

-- O que o cron de lembrete procura a cada minuto.
CREATE INDEX idx_pkcard_remind_pending ON public.personal_kanban_cards (remind_at)
  WHERE remind_at IS NOT NULL AND reminder_sent_at IS NULL AND archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.personal_kanban_cards_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_stage text;
BEGIN
  -- Compromisso remarcado volta a ser lembrado. Sem isto, quem adia algo que já foi lembrado
  -- nunca mais recebe aviso.
  IF TG_OP = 'UPDATE' AND NEW.remind_at IS DISTINCT FROM OLD.remind_at THEN
    NEW.reminder_sent_at := NULL;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    SELECT col.stage INTO v_stage FROM public.personal_kanban_columns col WHERE col.id = NEW.column_id;
    IF v_stage = 'done' THEN
      -- Entre duas colunas de "feito", vale a primeira conclusão.
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER personal_kanban_cards_before_write
  BEFORE INSERT OR UPDATE ON public.personal_kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.personal_kanban_cards_before_write();

-- Mudar a etapa de uma coluna conclui (ou reabre) os cards que estão nela.
CREATE OR REPLACE FUNCTION public.personal_kanban_columns_after_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.stage = 'done' THEN
    UPDATE public.personal_kanban_cards SET completed_at = now()
     WHERE column_id = NEW.id AND completed_at IS NULL;
  ELSIF OLD.stage = 'done' THEN
    UPDATE public.personal_kanban_cards SET completed_at = NULL
     WHERE column_id = NEW.id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER personal_kanban_columns_after_stage_change
  AFTER UPDATE OF stage ON public.personal_kanban_columns
  FOR EACH ROW WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION public.personal_kanban_columns_after_stage_change();

-- ── 4. Preferências por pessoa ────────────────────────────────────────────────
-- Os DEFAULTs abaixo SÃO a base com que todo kanban nasce. O front lê a linha; não repete
-- os valores.
CREATE TABLE public.personal_kanban_settings (
  employee_id              uuid        PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id                uuid        NOT NULL,
  -- Antecedência sugerida ao dar prazo a um card. NULL = sem lembrete.
  default_reminder_minutes integer     DEFAULT 15,
  -- 0 = nunca arquivar.
  archive_done_after_days  integer     NOT NULL DEFAULT 14,
  email_reminders          boolean     NOT NULL DEFAULT true,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_kanban_settings_reminder_valid
    CHECK (default_reminder_minutes IS NULL OR default_reminder_minutes BETWEEN 0 AND 10080),
  CONSTRAINT personal_kanban_settings_archive_valid CHECK (archive_done_after_days BETWEEN 0 AND 365)
);

COMMENT ON TABLE public.personal_kanban_settings IS
  'Preferências do Meu Kanban de cada funcionário (ADR-0050). Os defaults são a base com que todo kanban nasce.';

-- Quem já tem board nasce com a base.
INSERT INTO public.personal_kanban_settings (employee_id, tenant_id)
SELECT DISTINCT employee_id, tenant_id FROM public.personal_kanban_columns
ON CONFLICT (employee_id) DO NOTHING;

ALTER TABLE public.personal_kanban_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.personal_kanban_settings TO authenticated;

-- O par (funcionário, tenant) precisa ser o do login: não dá para gravar a linha em outro
-- tenant. `(SELECT auth.uid())` vira InitPlan (ADR-0046).
CREATE POLICY "personal_kanban_settings_own" ON public.personal_kanban_settings
  FOR ALL TO authenticated
  USING ((employee_id, tenant_id) IN (
    SELECT e.id, e.tenant_id FROM public.employees e WHERE e.auth_id = (SELECT auth.uid())))
  WITH CHECK ((employee_id, tenant_id) IN (
    SELECT e.id, e.tenant_id FROM public.employees e WHERE e.auth_id = (SELECT auth.uid())));

-- ── 5. Inscrições de push ─────────────────────────────────────────────────────
-- Uma linha por navegador/aparelho que aceitou notificação. Endpoint e chaves só permitem
-- mandar push com a chave VAPID privada, que vive nos segredos da Edge Function.
CREATE TABLE public.push_subscriptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL,
  endpoint        text        NOT NULL,
  p256dh          text        NOT NULL,
  auth            text        NOT NULL,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  -- O mesmo navegador pode servir duas pessoas (computador compartilhado).
  CONSTRAINT push_subscriptions_employee_endpoint_key UNIQUE (employee_id, endpoint),
  CONSTRAINT push_subscriptions_endpoint_https CHECK (endpoint LIKE 'https://%')
);

COMMENT ON TABLE public.push_subscriptions IS
  'Inscrições Web Push por funcionário e navegador (ADR-0050). Lidas só pela Edge Function de envio.';

CREATE INDEX idx_push_subscriptions_employee ON public.push_subscriptions (employee_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

CREATE POLICY "push_subscriptions_own" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING ((employee_id, tenant_id) IN (
    SELECT e.id, e.tenant_id FROM public.employees e WHERE e.auth_id = (SELECT auth.uid())))
  WITH CHECK ((employee_id, tenant_id) IN (
    SELECT e.id, e.tenant_id FROM public.employees e WHERE e.auth_id = (SELECT auth.uid())));

-- ── 6. Funções e cron jobs ────────────────────────────────────────────────────
-- Reserva os lembretes vencidos e marca como enviados na mesma instrução: duas execuções
-- simultâneas nunca pegam o mesmo card (SKIP LOCKED). Entrega no máximo uma vez — se o envio
-- falhar depois da reserva, o lembrete não volta. Lembrete vencido há mais de 6 h (cron
-- parado, prazo marcado no passado) não é mandado: aviso atrasado assim só atrapalha.
CREATE OR REPLACE FUNCTION public.claim_due_personal_kanban_reminders(p_limit integer DEFAULT 500)
RETURNS TABLE (
  card_id          uuid,
  employee_id      uuid,
  tenant_id        uuid,
  title            text,
  due_date         date,
  due_time         time,
  reminder_minutes integer
)
LANGUAGE sql
SET search_path = ''
AS $$
  WITH due AS (
    SELECT c.id
      FROM public.personal_kanban_cards c
      JOIN public.personal_kanban_columns col ON col.id = c.column_id
     WHERE c.remind_at <= now()
       AND c.remind_at > now() - interval '6 hours'
       AND c.reminder_sent_at IS NULL
       AND c.archived_at IS NULL
       AND col.stage <> 'done'
     ORDER BY c.remind_at
     LIMIT p_limit
       FOR UPDATE OF c SKIP LOCKED
  )
  UPDATE public.personal_kanban_cards c
     SET reminder_sent_at = now()
    FROM due
   WHERE c.id = due.id
  RETURNING c.id, c.employee_id, c.tenant_id, c.title, c.due_date, c.due_time, c.reminder_minutes;
$$;

REVOKE ALL ON FUNCTION public.claim_due_personal_kanban_reminders(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_personal_kanban_reminders(integer) TO service_role;

COMMENT ON FUNCTION public.claim_due_personal_kanban_reminders(integer) IS
  'Uso exclusivo da Edge Function notify-personal-kanban-reminders (ADR-0050).';

-- Há o que lembrar agora? O cron pergunta isto a cada minuto e só chama a Edge Function
-- quando a resposta é sim — 1.440 consultas baratas por dia em vez de 1.440 invocações.
CREATE OR REPLACE FUNCTION public.has_due_personal_kanban_reminders()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.personal_kanban_cards c
      JOIN public.personal_kanban_columns col ON col.id = c.column_id
     WHERE c.remind_at <= now()
       AND c.remind_at > now() - interval '6 hours'
       AND c.reminder_sent_at IS NULL
       AND c.archived_at IS NULL
       AND col.stage <> 'done'
  );
$$;

REVOKE ALL ON FUNCTION public.has_due_personal_kanban_reminders() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.archive_done_personal_kanban_cards()
RETURNS integer
LANGUAGE sql
SET search_path = ''
AS $$
  WITH archived AS (
    UPDATE public.personal_kanban_cards c
       SET archived_at = now()
      FROM public.personal_kanban_columns col, public.personal_kanban_settings s
     WHERE col.id = c.column_id
       AND s.employee_id = c.employee_id
       AND col.stage = 'done'
       AND c.archived_at IS NULL
       AND s.archive_done_after_days > 0
       AND COALESCE(c.completed_at, c.updated_at) < now() - make_interval(days => s.archive_done_after_days)
    RETURNING 1
  )
  SELECT count(*)::integer FROM archived;
$$;

REVOKE ALL ON FUNCTION public.archive_done_personal_kanban_cards() FROM public, anon, authenticated;

select cron.unschedule('notify-personal-kanban-reminders')   where exists (select 1 from cron.job where jobname = 'notify-personal-kanban-reminders');
select cron.unschedule('archive-personal-kanban-done-daily') where exists (select 1 from cron.job where jobname = 'archive-personal-kanban-done-daily');

select cron.schedule('notify-personal-kanban-reminders', '* * * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/notify-personal-kanban-reminders',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) as request_id
  where public.has_due_personal_kanban_reminders()
$job$);

-- 06:30 UTC = 03:30 em Brasília, fora do horário de uso.
select cron.schedule('archive-personal-kanban-done-daily', '30 6 * * *', $job$
  select public.archive_done_personal_kanban_cards()
$job$);
