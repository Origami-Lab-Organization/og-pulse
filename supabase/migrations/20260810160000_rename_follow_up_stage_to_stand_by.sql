-- Renomeia a etapa lateral do Pipeline de "Follow Up" para "Stand By".
--
-- Motivo: `follow_up` como valor de `crm_stage` colidia conceitualmente com a
-- tabela `lead_follow_ups`, que guarda as TAREFAS de retorno de contato. São
-- coisas diferentes — a etapa é onde a oportunidade espera; o follow-up é a
-- ação agendada — e o nome repetido levava a leitura ambígua no código e na
-- conversa do time. "Stand By" nomeia o estado sem sequestrar o termo da tarefa.
--
-- As tarefas seguem intocadas: tabela `lead_follow_ups`, índice
-- `idx_lead_follow_ups_pending_due` e a Edge Function notify-lead-follow-ups
-- mantêm os nomes.
--
-- Escrito de forma idempotente (os RENAME são guardados por checagem de
-- existência) porque 20260810140000 já foi aplicada em ambientes reais e esta
-- pode acabar reexecutada num `db push`.

-- 1) Colunas de estado.
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
      AND column_name = 'follow_up_return_stage'
  ) THEN
    ALTER TABLE public.leads RENAME COLUMN follow_up_return_stage TO stand_by_return_stage;
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads'
      AND column_name = 'follow_up_since'
  ) THEN
    ALTER TABLE public.leads RENAME COLUMN follow_up_since TO stand_by_since;
  END IF;
END $$;

COMMENT ON COLUMN public.leads.stand_by_return_stage IS 'Etapa do funil em que a oportunidade estava ao entrar em Stand By. É para onde ela volta ao ser retomada — sem isso o Stand By viraria etapa sequencial e o retorno cairia na coluna vizinha.';
COMMENT ON COLUMN public.leads.stand_by_since IS 'Quando a oportunidade entrou em Stand By (crm_stage = ''stand_by''). Limpo ao retomar.';

-- 2) Valor da etapa. `crm_stage` é `text` sem CHECK, então basta o UPDATE.
UPDATE public.leads
SET crm_stage = 'stand_by'
WHERE crm_stage = 'follow_up';

-- 3) Tipos de atividade. O CHECK precisa cair ANTES do UPDATE: ele ainda só
--    admite os nomes antigos, e a atualização violaria o constraint.
ALTER TABLE public.lead_activity_log
  DROP CONSTRAINT IF EXISTS lead_activity_log_activity_type_check;

UPDATE public.lead_activity_log
SET activity_type = 'moved_to_stand_by'
WHERE activity_type = 'moved_to_follow_up';

UPDATE public.lead_activity_log
SET activity_type = 'stand_by_resumed'
WHERE activity_type = 'follow_up_resumed';

ALTER TABLE public.lead_activity_log
  ADD CONSTRAINT lead_activity_log_activity_type_check CHECK (activity_type IN (
    'created',
    'stage_changed',
    'lead_updated',
    'budget_created',
    'budget_updated',
    'budget_unlinked',
    'archived',
    'unarchived',
    'closed',
    'closed_lost',
    'moved_to_stand_by',
    'stand_by_resumed',
    'note_added'
  ));
