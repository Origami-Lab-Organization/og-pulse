-- Rollback de 20261125113000_projeto_guarda_modelo_de_receita.sql
--
-- O projeto volta a guardar só o serviço; o modelo de receita escolhido pelos GPs se perde.

DROP TRIGGER IF EXISTS trg_projects_modelo_do_servico ON public.projects;
DROP FUNCTION IF EXISTS public.projects_modelo_do_servico();
DROP INDEX IF EXISTS public.projects_service_revenue_model_idx;
ALTER TABLE public.projects DROP COLUMN IF EXISTS service_revenue_model_id;
