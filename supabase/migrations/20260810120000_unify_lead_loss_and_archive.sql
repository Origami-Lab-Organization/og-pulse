-- Unifica "dar perda" e "arquivar" em um único desfecho.
--
-- Antes: a coluna "Fechado - Perda" do Kanban recebia crm_stage='closed_lost'
-- com archived=false (oportunidade seguia visível no Pipeline), enquanto
-- arquivar setava archived=true sem marcar a etapa de perda. Dois caminhos para
-- o mesmo desfecho, com estatísticas divididas.
--
-- Agora: a coluna "Fechado - Perda" não existe mais no Pipeline. Dar perda é
-- feito de dentro do card e sempre resulta em archived=true +
-- crm_stage='closed_lost'. Tudo que está arquivado conta como perda na aba
-- "Perdas".
--
-- Backfill necessário: sem ele, as oportunidades que hoje estão em
-- 'closed_lost' com archived=false sairiam da UI — a coluna deixou de ser
-- renderizada e a aba Perdas só lista archived=true.
--
-- O que este backfill deliberadamente NÃO faz: reescrever `crm_stage` dos
-- arquivamentos antigos para 'closed_lost'. Esses registros guardam a etapa em
-- que o negócio morreu, informação que não pode ser recuperada se apagada. Eles
-- já contam como perda por `archived = true`.

-- Perdas antigas que viviam na coluna do Kanban passam a ser arquivadas.
-- `archived_at` recebe o carimbo de perda já existente (lost_at), caindo em
-- updated_at quando a linha for anterior à criação de lost_at.
UPDATE public.leads
SET
  archived = true,
  archived_at = COALESCE(lost_at, updated_at)
WHERE crm_stage = 'closed_lost'
  AND archived = false;

-- Perdas já arquivadas que ainda não tinham o carimbo de perda.
UPDATE public.leads
SET lost_at = COALESCE(archived_at, updated_at)
WHERE archived = true
  AND crm_stage = 'closed_lost'
  AND lost_at IS NULL;

COMMENT ON COLUMN public.leads.lost_at IS 'Quando a oportunidade foi perdida. Perda e arquivamento são o mesmo evento: implica archived=true e crm_stage=''closed_lost''. Motivo/observações/concorrente ficam em archive_reason/archive_notes/competitor_name. Registros anteriores a esta unificação podem estar arquivados com a etapa original preservada.';
