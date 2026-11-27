-- Rollback da US-0057 (20261127160000_insights_de_ia.sql). Apaga os pedidos, os insights e as
-- propostas; as faixas já aceitas continuam na empresa, como qualquer faixa informada pelo time.

DROP TABLE IF EXISTS public.prospect_porte_propostas;
DROP TABLE IF EXISTS public.prospect_company_insights;
DROP TABLE IF EXISTS public.prospect_insights_pedidos;
DROP TABLE IF EXISTS public.prospect_insights_runners;

DROP FUNCTION IF EXISTS public.prospect_porte_propostas_guarda();
DROP FUNCTION IF EXISTS public.prospect_company_insights_guarda();
DROP FUNCTION IF EXISTS public.insights_so_com_fonte(jsonb);
DROP FUNCTION IF EXISTS public.prospect_insights_pedidos_guarda();
DROP FUNCTION IF EXISTS public.insights_runner_disponivel();

DELETE FROM public.user_capability_overrides WHERE capability = 'prospeccao:gerar-insights';
DELETE FROM public.role_capabilities WHERE capability = 'prospeccao:gerar-insights';
DELETE FROM public.default_role_capabilities WHERE capability = 'prospeccao:gerar-insights';
DELETE FROM public.capabilities WHERE key = 'prospeccao:gerar-insights';
