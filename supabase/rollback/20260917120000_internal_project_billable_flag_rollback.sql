-- Rollback de 20260917120000_internal_project_billable_flag.sql (ADR-0035).
--
-- Devolve o trigger à versão de PUL-246 (centro vindo só do serviço) e remove as colunas.
-- Nenhum projeto, hora ou centro de cliente é apagado: os centros "Projeto Interno" criados
-- ficam, porque podem já ter hora apontando para eles — apagar reclassificaria custo.
--
-- Depois disto, a hora de um projeto que era interno volta a herdar o centro do serviço, e
-- projeto sem serviço passa a lançar hora sem centro.

CREATE OR REPLACE FUNCTION public.set_project_timesheet_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NULL THEN
    SELECT s.cost_center_id INTO NEW.cost_center_id
      FROM public.projects p
      JOIN public.services s ON s.id::text = p.service_line
     WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_non_billable_needs_cost_center;

DROP INDEX IF EXISTS public.projects_cost_center_idx;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS cost_center_id;

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS is_billable;

DELETE FROM public.default_cost_centers WHERE lower(btrim(name)) = 'projeto interno';
