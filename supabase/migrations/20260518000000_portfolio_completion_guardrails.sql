ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS completed_date DATE;

CREATE OR REPLACE FUNCTION public.validate_project_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_milestones integer;
  pending_milestones integer;
  pending_installments integer;
BEGIN
  IF NEW.portfolio_stage = 'completed' THEN
    IF NEW.completed_date IS NULL THEN
      RAISE EXCEPTION 'Informe a data real de conclusão para concluir o projeto.'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.completed_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'A data real de conclusão não pode ser futura.'
        USING ERRCODE = '23514';
    END IF;

    SELECT
      count(*),
      count(*) FILTER (WHERE status IS DISTINCT FROM 'completed')
    INTO total_milestones, pending_milestones
    FROM public.project_milestones
    WHERE project_id = NEW.id;

    IF total_milestones = 0 THEN
      RAISE EXCEPTION 'Projeto não pode ser concluído: cronograma não cadastrado.'
        USING ERRCODE = '23514';
    END IF;

    IF pending_milestones > 0 THEN
      RAISE EXCEPTION 'Projeto não pode ser concluído: existem etapas do cronograma pendentes.'
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) FILTER (WHERE status IS DISTINCT FROM 'received')
    INTO pending_installments
    FROM public.project_installments
    WHERE project_id = NEW.id;

    IF pending_installments > 0 THEN
      RAISE EXCEPTION 'Projeto não pode ser concluído: existem pagamentos pendentes de recebimento.'
        USING ERRCODE = '23514';
    END IF;

    NEW.status = 'completed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_project_completion_on_projects ON public.projects;

CREATE TRIGGER validate_project_completion_on_projects
BEFORE INSERT OR UPDATE OF portfolio_stage, completed_date ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.validate_project_completion();
