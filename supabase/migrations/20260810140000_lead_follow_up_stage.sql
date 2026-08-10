-- Follow Up: estado lateral do Pipeline comercial.
--
-- Uma oportunidade que não avança mas não é perda (timing errado, cliente sem
-- orçamento agora) sai do funil para a coluna "Follow Up", com data de retorno
-- de contato obrigatória. Não é etapa sequencial: entra de qualquer etapa e
-- volta para a etapa de origem, guardada em `follow_up_return_stage`.
--
-- `crm_stage` é `text` sem CHECK (ver 20260221012624), então o valor
-- 'follow_up' não exige alteração da coluna — só os carimbos do estado,
-- espelhando o que 20260806120000 fez para 'closed_lost'/`lost_at`.
--
-- A data de retorno NÃO é coluna nova: é um `lead_follow_ups` pendente. Assim o
-- retorno já aparece na timeline, no indicador do card e no lembrete agendado,
-- sem duplicar o conceito de "próximo contato".

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_return_stage text,
  ADD COLUMN IF NOT EXISTS follow_up_since timestamptz;

COMMENT ON COLUMN public.leads.follow_up_return_stage IS 'Etapa do funil em que a oportunidade estava ao entrar em Follow Up. É para onde ela volta ao ser retomada — sem isso o Follow Up viraria etapa sequencial e o retorno cairia na coluna vizinha.';
COMMENT ON COLUMN public.leads.follow_up_since IS 'Quando a oportunidade entrou em Follow Up (crm_stage = ''follow_up''). Limpo ao retomar.';

-- lead_activity_log.activity_type: recriação idempotente do CHECK incluindo os
-- dois novos eventos. Mesmo padrão de 20260806120000 — a lista precisa ser
-- reescrita inteira porque o constraint é fechado.
ALTER TABLE public.lead_activity_log
  DROP CONSTRAINT IF EXISTS lead_activity_log_activity_type_check;

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
    'moved_to_follow_up',
    'follow_up_resumed',
    'note_added'
  ));

-- Índice para a varredura diária do lembrete (notify-lead-follow-ups): busca
-- pendentes por janela de data, descartando os já avisados no dia.
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_pending_due
  ON public.lead_follow_ups (status, scheduled_at, notified);
