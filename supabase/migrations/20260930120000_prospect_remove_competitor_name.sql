-- Prospecção — sai o campo "Concorrente" do contato (30/09/2026).
--
-- Pedido de 30/09/2026 (Guilherme): o campo `prospects.competitor_name`, herdado da
-- Oportunidade em 20260929120000, sai do contato, junto com o histórico dele. Era texto
-- livre, só exibido: nenhuma métrica o lia, e nada o ligava ao motivo de perda.
--
-- FICA o motivo de perda `concorrente` ("Perdemos para concorrente"), da lista fechada de
-- `prospects_discard_reason_valid`: é o porquê da perda, e entra nas métricas.
--
-- HISTÓRICO. O valor existia em dois lugares, e sai dos dois:
--   - `public.prospects.competitor_name` — a coluna é removida;
--   - `legado_oportunidades.leads.competitor_name` — a cópia arquivada das Oportunidades.
--     Ali a coluna FICA, esvaziada: o rollback de 20260929120000 recria `public.leads` com
--     `INSERT ... SELECT *` a partir deste arquivo, e sem a coluna o SELECT * desalinharia.
--   O log antigo (`lead_activity_log`) nunca guardou o concorrente — nada a limpar lá.
--
-- IRREVERSÍVEL NO DADO: o rollback devolve a coluna, vazia. Quem precisar do valor antigo
-- exporta `legado_oportunidades.leads (id, competitor_name)` ANTES de aplicar.
--
-- Rollback: supabase/rollback/20260930120000_prospect_remove_competitor_name_rollback.sql

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_competitor_name_length;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS competitor_name;

DO $$
BEGIN
  -- O arquivo só existe onde 20260929120000 rodou; em banco novo não há o que limpar.
  IF to_regclass('legado_oportunidades.leads') IS NOT NULL THEN
    UPDATE legado_oportunidades.leads
       SET competitor_name = NULL
     WHERE competitor_name IS NOT NULL;
  END IF;
END;
$$;
