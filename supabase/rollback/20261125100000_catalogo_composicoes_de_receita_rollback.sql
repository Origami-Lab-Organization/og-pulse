-- Rollback de 20261125100000_catalogo_composicoes_de_receita.sql
--
-- Composição com mais de uma forma não cabe no modelo antigo (uma forma por linha): ela é
-- desativada e o `model_type` volta para a primeira forma, para respeitar o CHECK antigo.
-- Cobrança por hora e cortesia não existiam: essas composições também são desativadas e
-- ficam como `fixed`. Nada é apagado.

DROP TRIGGER IF EXISTS trg_service_revenue_models_composicao ON public.service_revenue_models;
DROP FUNCTION IF EXISTS public.service_revenue_models_composicao();
DROP INDEX IF EXISTS public.service_revenue_models_composicao_unica;

UPDATE public.service_revenue_models
   SET is_active = false,
       model_type = CASE WHEN formas[1] IN ('fixed', 'recurring', 'success_fee', 'indication', 'equity')
                         THEN formas[1] ELSE 'fixed' END
 WHERE model_type NOT IN ('fixed', 'recurring', 'success_fee', 'indication', 'equity');

ALTER TABLE public.service_revenue_models
  DROP CONSTRAINT IF EXISTS service_revenue_models_model_type_check;
ALTER TABLE public.service_revenue_models
  ADD CONSTRAINT service_revenue_models_model_type_check
  CHECK (model_type = ANY (ARRAY['fixed', 'recurring', 'success_fee', 'indication', 'equity']));

ALTER TABLE public.service_revenue_models DROP COLUMN IF EXISTS formas;

DROP POLICY IF EXISTS service_revenue_models_insert ON public.service_revenue_models;
CREATE POLICY service_revenue_models_insert ON public.service_revenue_models
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

DROP POLICY IF EXISTS service_revenue_models_update ON public.service_revenue_models;
CREATE POLICY service_revenue_models_update ON public.service_revenue_models
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

DROP POLICY IF EXISTS service_revenue_models_delete ON public.service_revenue_models;
CREATE POLICY service_revenue_models_delete ON public.service_revenue_models
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_chance_padrao_percent_check;
ALTER TABLE public.services DROP COLUMN IF EXISTS chance_padrao_percent;
