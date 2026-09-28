-- Reversão de 20260928120000_prospect_stage_changes.sql.
--
-- Destrutiva: o histórico de etapa gravado desde a migration se perde, e ele não pode ser
-- reconstruído depois (Reunião agendada/feita e Qualificada não têm data em outro lugar).
-- Exporte a tabela antes se precisar.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP TRIGGER IF EXISTS prospect_stage_changes_on_update ON public.prospects;
DROP TRIGGER IF EXISTS prospect_stage_changes_on_insert ON public.prospects;
DROP TABLE IF EXISTS public.prospect_stage_changes;
DROP FUNCTION IF EXISTS public.prospect_stage_changes_record();
