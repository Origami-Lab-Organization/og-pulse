-- US-0046 — o projeto guarda o modelo de receita.
--
-- Pedido do Victor (25/11/2026): a escolha de serviço do projeto mostra a linha, o serviço e o
-- modelo de receita, porque cada GP vai ajustar os projetos em andamento depois. Até aqui o
-- projeto só guardava o serviço (`projects.service_line`, texto com o id do serviço).
--
-- A coluna nasce vazia e é opcional: projetos antigos ficam sem modelo até o GP escolher. Quando
-- preenchida, o modelo tem de ser do serviço do projeto e do mesmo tenant.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS service_revenue_model_id uuid
    REFERENCES public.service_revenue_models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_service_revenue_model_idx
  ON public.projects (service_revenue_model_id)
  WHERE service_revenue_model_id IS NOT NULL;

COMMENT ON COLUMN public.projects.service_revenue_model_id IS
  'US-0046: modelo de receita do projeto, um dos modelos do serviço em service_line. Opcional; '
  'o gatilho trg_projects_modelo_do_servico recusa modelo de outro serviço ou de outro tenant.';

CREATE OR REPLACE FUNCTION public.projects_modelo_do_servico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Trocar só o serviço (como faz o front anterior à US-0046) limpa o modelo do serviço antigo.
  IF TG_OP = 'UPDATE'
     AND NEW.service_line IS DISTINCT FROM OLD.service_line
     AND NEW.service_revenue_model_id IS NOT DISTINCT FROM OLD.service_revenue_model_id THEN
    NEW.service_revenue_model_id := NULL;
  END IF;

  IF NEW.service_revenue_model_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.service_revenue_models m
     WHERE m.id = NEW.service_revenue_model_id
       AND m.tenant_id = NEW.tenant_id
       AND m.service_id::text = NEW.service_line
  ) THEN
    RAISE EXCEPTION 'O modelo de receita escolhido não é do serviço do projeto.';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.projects_modelo_do_servico() IS
  'US-0046: o modelo de receita do projeto é do serviço do projeto (service_line) e do mesmo tenant.';

DROP TRIGGER IF EXISTS trg_projects_modelo_do_servico ON public.projects;
CREATE TRIGGER trg_projects_modelo_do_servico
BEFORE INSERT OR UPDATE OF service_revenue_model_id, service_line ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.projects_modelo_do_servico();
