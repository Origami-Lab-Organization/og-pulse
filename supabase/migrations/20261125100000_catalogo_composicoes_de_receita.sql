-- US-0046 — Catálogo 2027: formas de receita e composições por serviço.
--
-- Decisões do Victor (24 e 25/11/2026), registradas em .harness/prd/refino-fluxo-comercial-a-projeto.md:
--   * formas de receita em lista fechada: escopo fixo (`fixed`), percentual (`success_fee`),
--     cobrança por hora (`hourly`), comissão por indicação (`indication`) e cortesia (`courtesy`);
--   * recorrente (`recurring`) e equity (`equity`) deixam de ser vendidos — ficam só nos
--     registros que já existem, para não perder o rastro;
--   * o admin cadastra as COMPOSIÇÕES permitidas por serviço (ex.: "Escopo fixo",
--     "Percentual" ou "Escopo fixo + Percentual") e o orçamento escolhe uma delas (épico 3);
--   * cortesia não combina com nada, porque não gera receita;
--   * chance padrão de realização por serviço, para a receita ponderada do percentual.
--
-- Cada linha de `service_revenue_models` passa a ser uma composição: a coluna nova `formas`
-- guarda as formas dela. A tabela só é usada pela tela do catálogo (conferido em 25/11/2026),
-- então evoluí-la evita uma tabela paralela. `model_type` continua, derivado de `formas`,
-- para quem ainda lê a coluna.

-- 1. Formas da composição -----------------------------------------------------------------

ALTER TABLE public.service_revenue_models
  ADD COLUMN IF NOT EXISTS formas text[];

UPDATE public.service_revenue_models
   SET formas = ARRAY[model_type]
 WHERE formas IS NULL;

ALTER TABLE public.service_revenue_models
  ALTER COLUMN formas SET NOT NULL;

COMMENT ON COLUMN public.service_revenue_models.formas IS
  'Formas de receita da composição (US-0046), ordenadas e sem repetição pelo gatilho '
  'trg_service_revenue_models_composicao. Novas: fixed, success_fee, hourly, indication, courtesy. '
  'Antigas, só em registros anteriores a 25/11/2026: recurring, equity.';

-- `model_type` vira derivado: a forma quando a composição tem uma só, `composicao` quando tem mais.
ALTER TABLE public.service_revenue_models
  DROP CONSTRAINT IF EXISTS service_revenue_models_model_type_check;
ALTER TABLE public.service_revenue_models
  ADD CONSTRAINT service_revenue_models_model_type_check
  CHECK (model_type = ANY (ARRAY['fixed', 'recurring', 'success_fee', 'indication', 'equity',
                                 'hourly', 'courtesy', 'composicao']));

-- 2. Regras da composição -----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.service_revenue_models_composicao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _validas  constant text[] := ARRAY['fixed', 'success_fee', 'hourly', 'indication', 'courtesy'];
  _antigas  constant text[] := ARRAY['recurring', 'equity'];
  _formas   text[];
BEGIN
  -- Compatibilidade com o front anterior à US-0046, que só conhece `model_type`: sem formas, ou
  -- trocando só o tipo, a composição passa a ser a forma única desse tipo.
  IF NEW.formas IS NULL
     OR (TG_OP = 'UPDATE'
         AND NEW.model_type IS DISTINCT FROM OLD.model_type
         AND NEW.formas IS NOT DISTINCT FROM OLD.formas) THEN
    NEW.formas := ARRAY[NEW.model_type];
  END IF;

  SELECT coalesce(array_agg(DISTINCT f ORDER BY f), '{}')
    INTO _formas
    FROM unnest(NEW.formas) AS f;

  IF cardinality(_formas) = 0 THEN
    RAISE EXCEPTION 'A composição precisa de ao menos uma forma de receita.';
  END IF;

  IF NOT (_formas <@ (_validas || _antigas)) THEN
    RAISE EXCEPTION 'Forma de receita desconhecida na composição.';
  END IF;

  -- Forma antiga só sobrevive em registro que já a tinha.
  IF _formas && _antigas
     AND (TG_OP = 'INSERT' OR _formas IS DISTINCT FROM OLD.formas) THEN
    RAISE EXCEPTION 'Recorrente e Equity não são mais vendidos: escolha outra forma de receita.';
  END IF;

  IF 'courtesy' = ANY (_formas) AND cardinality(_formas) > 1 THEN
    RAISE EXCEPTION 'Cortesia não combina com outra forma de receita.';
  END IF;

  NEW.formas := _formas;
  NEW.model_type := CASE WHEN cardinality(_formas) = 1 THEN _formas[1] ELSE 'composicao' END;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.service_revenue_models_composicao() IS
  'US-0046: normaliza as formas da composição (ordenadas, sem repetição), recusa forma '
  'desconhecida, forma antiga em composição nova e cortesia combinada, e deriva model_type.';

DROP TRIGGER IF EXISTS trg_service_revenue_models_composicao ON public.service_revenue_models;
CREATE TRIGGER trg_service_revenue_models_composicao
BEFORE INSERT OR UPDATE OF formas, model_type ON public.service_revenue_models
FOR EACH ROW EXECUTE FUNCTION public.service_revenue_models_composicao();

-- A mesma composição não se repete no serviço (entre as ativas). Repetições antigas (em
-- 25/11/2026, uma só, no tenant de demonstração) são desativadas, mantendo a mais antiga.
UPDATE public.service_revenue_models m
   SET is_active = false, updated_at = now()
 WHERE m.is_active
   AND EXISTS (
     SELECT 1 FROM public.service_revenue_models o
      WHERE o.service_id = m.service_id
        AND o.is_active
        AND o.formas = m.formas
        AND (o.created_at, o.id) < (m.created_at, m.id)
   );

CREATE UNIQUE INDEX IF NOT EXISTS service_revenue_models_composicao_unica
  ON public.service_revenue_models (service_id, formas)
  WHERE is_active;

-- 3. Quem edita: a mesma capacidade do resto do catálogo ---------------------------------
--
-- As composições eram escritas por `configuracao:editar`, enquanto linha e serviço usam
-- `catalogo:editar` (20260902200000). O catálogo passa a ter uma regra só. Quem tem a
-- capacidade é decisão do perfil de acesso: na Origami, só o Admin (US-0046, 25/11/2026).

DROP POLICY IF EXISTS service_revenue_models_insert ON public.service_revenue_models;
CREATE POLICY service_revenue_models_insert ON public.service_revenue_models
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS service_revenue_models_update ON public.service_revenue_models;
CREATE POLICY service_revenue_models_update ON public.service_revenue_models
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

DROP POLICY IF EXISTS service_revenue_models_delete ON public.service_revenue_models;
CREATE POLICY service_revenue_models_delete ON public.service_revenue_models
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'catalogo:editar'));

-- 4. Chance padrão da receita ponderada ---------------------------------------------------

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS chance_padrao_percent numeric(5, 2);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_chance_padrao_percent_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_chance_padrao_percent_check
  CHECK (chance_padrao_percent IS NULL OR (chance_padrao_percent > 0 AND chance_padrao_percent <= 100));

COMMENT ON COLUMN public.services.chance_padrao_percent IS
  'US-0046: chance padrão de realização (%) da receita do percentual, usada na receita '
  'ponderada do orçamento. O comercial ajusta no orçamento (épico 3). Nula = não informada.';
