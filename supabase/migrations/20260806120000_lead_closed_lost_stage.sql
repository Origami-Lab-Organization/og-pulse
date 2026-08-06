-- Nova coluna do Kanban de Pipeline: "Fechado - Perda" (crm_stage = 'closed_lost').
-- crm_stage é `text` sem CHECK constraint (ver 20260221012624), então o novo
-- valor não exige alteração de schema nessa coluna — só o carimbo de quando a
-- oportunidade foi perdida, espelhando `closed_at` (usado quando ganha).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lost_at timestamptz;

COMMENT ON COLUMN public.leads.lost_at IS 'Quando a oportunidade foi movida para o estágio closed_lost (Fechado - Perda). Motivo/observações/concorrente reaproveitam archive_reason/archive_notes/competitor_name — não implica archived=true.';

-- lead_activity_log.activity_type: a migration original (20260314120000) criou
-- um CHECK constraint fechado; uma recriação posterior da tabela
-- (20260315175449) ficou sem CHECK nenhum. Recriamos aqui de forma idempotente
-- (DROP IF EXISTS + ADD) já incluindo 'closed_lost', restaurando a garantia de
-- integridade e cobrindo o novo tipo de atividade em um único passo.
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
    'note_added'
  ));
