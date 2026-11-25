-- US-0047 — cada serviço do catálogo escolhe a regra de fit que usa.
--
-- O fit por serviço (US-0014) tem quatro regras escritas no código, com sinais e pesos próprios
-- e sem IA (ADR-0042, ADR-0055): `studio` (Dev. de Software), `lei_do_bem`, `captacao` e
-- `consultoria`. As chaves nomeiam as colunas da Base na VPS (pulse.empresas.fit_*), então não
-- mudam. O que muda (Victor, 24/11/2026): o fit passa a mostrar os serviços do catálogo, e cada
-- serviço diz qual regra usa — ou nenhuma (nulo = "Sem fit").

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS regra_de_fit text;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_regra_de_fit_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_regra_de_fit_check
  CHECK (regra_de_fit IS NULL OR regra_de_fit = ANY (ARRAY['studio', 'lei_do_bem', 'captacao', 'consultoria']));

COMMENT ON COLUMN public.services.regra_de_fit IS
  'US-0047: regra de fit por serviço que este serviço usa (studio, lei_do_bem, captacao, '
  'consultoria; nulo = sem fit). O cálculo fica em src/lib/prospecting/fit.ts e na VPS.';
