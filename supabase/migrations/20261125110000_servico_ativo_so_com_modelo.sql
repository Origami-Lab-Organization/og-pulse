-- US-0046 — serviço só fica ativo com modelo de receita.
--
-- Decisão do Victor (25/11/2026): "o serviço da linha de serviço só será ativo se houver um
-- modelo de receita atrelado a ele". Modelo de receita é cada linha de `service_revenue_models`
-- (uma ou mais formas de receita, 20261125100000); vale o modelo ativo sem forma antiga
-- (recorrente ou equity não são mais vendidas).
--
-- Duas coisas diferentes deixam o serviço fora das escolhas, e a tela mostra cada uma:
--   * desativado por alguém  -> `desativado = true` (coluna nova, a vontade da pessoa);
--   * sem modelo de receita  -> inativo até ganhar um, sem ninguém precisar reativar.
-- `is_active` continua sendo o que todo o app lê ("pode ser escolhido"), agora derivado:
--   is_active = NOT desativado AND tem modelo de receita válido.

-- 1. A vontade da pessoa ---------------------------------------------------------------------

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS desativado boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.services.desativado IS
  'US-0046: desativado por alguém do catálogo. `is_active` é derivado: NOT desativado AND tem '
  'modelo de receita ativo sem forma antiga (gatilho trg_services_ativo_so_com_modelo).';

-- Quem está inativo hoje foi desativado por alguém.
UPDATE public.services SET desativado = NOT is_active;

-- 2. Tem modelo de receita válido ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.servico_tem_modelo_de_receita(_service_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.service_revenue_models m
     WHERE m.service_id = _service_id
       AND m.is_active
       AND NOT (m.formas && ARRAY['recurring', 'equity'])
  );
$$;

COMMENT ON FUNCTION public.servico_tem_modelo_de_receita(uuid) IS
  'US-0046: o serviço tem ao menos um modelo de receita ativo sem forma antiga.';

-- 3. O serviço deriva `is_active` ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.services_ativo_so_com_modelo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Compatibilidade com quem ainda liga e desliga `is_active` (front anterior à US-0046):
  -- mexer só em `is_active` é desativar ou reativar pela vontade da pessoa.
  IF TG_OP = 'UPDATE'
     AND NEW.is_active IS DISTINCT FROM OLD.is_active
     AND NEW.desativado IS NOT DISTINCT FROM OLD.desativado THEN
    NEW.desativado := NOT NEW.is_active;
  END IF;

  NEW.is_active := NOT NEW.desativado AND public.servico_tem_modelo_de_receita(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.services_ativo_so_com_modelo() IS
  'US-0046: is_active = NOT desativado AND servico_tem_modelo_de_receita(id).';

DROP TRIGGER IF EXISTS trg_services_ativo_so_com_modelo ON public.services;
CREATE TRIGGER trg_services_ativo_so_com_modelo
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.services_ativo_so_com_modelo();

-- 4. Mudou o modelo, o serviço recalcula ------------------------------------------------------

CREATE OR REPLACE FUNCTION public.modelo_de_receita_recalcula_servico()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _service_id uuid := coalesce(NEW.service_id, OLD.service_id);
BEGIN
  -- O UPDATE só dispara o gatilho do serviço, que recalcula `is_active`.
  UPDATE public.services
     SET updated_at = now()
   WHERE id = _service_id
     AND is_active IS DISTINCT FROM (NOT desativado AND public.servico_tem_modelo_de_receita(_service_id));

  IF TG_OP = 'UPDATE' AND OLD.service_id IS DISTINCT FROM NEW.service_id THEN
    UPDATE public.services
       SET updated_at = now()
     WHERE id = OLD.service_id
       AND is_active IS DISTINCT FROM (NOT desativado AND public.servico_tem_modelo_de_receita(OLD.service_id));
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.modelo_de_receita_recalcula_servico() IS
  'US-0046: criar, mudar ou apagar modelo de receita recalcula o is_active do serviço.';

DROP TRIGGER IF EXISTS trg_modelo_de_receita_recalcula_servico ON public.service_revenue_models;
CREATE TRIGGER trg_modelo_de_receita_recalcula_servico
AFTER INSERT OR UPDATE OR DELETE ON public.service_revenue_models
FOR EACH ROW EXECUTE FUNCTION public.modelo_de_receita_recalcula_servico();

-- 5. Recalcula todo mundo --------------------------------------------------------------------
-- Em 25/11/2026 só o tenant de demonstração tem serviço ativo sem modelo (ex.: "Prospecção");
-- ele fica inativo sem modelo, sem ser marcado como desativado.
UPDATE public.services SET updated_at = updated_at;
