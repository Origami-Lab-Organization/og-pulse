-- Rollback do TD-0016: volta a permitir guardrail apontando para tenant inexistente.
ALTER TABLE public.strategy_guardrails DROP CONSTRAINT IF EXISTS strategy_guardrails_tenant_id_fkey;
