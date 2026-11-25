-- Rollback de 20261125110000_servico_ativo_so_com_modelo.sql
--
-- `is_active` volta a ser só a vontade da pessoa: ativo quem não foi desativado, tenha ou não
-- modelo de receita.

DROP TRIGGER IF EXISTS trg_modelo_de_receita_recalcula_servico ON public.service_revenue_models;
DROP FUNCTION IF EXISTS public.modelo_de_receita_recalcula_servico();
DROP TRIGGER IF EXISTS trg_services_ativo_so_com_modelo ON public.services;
DROP FUNCTION IF EXISTS public.services_ativo_so_com_modelo();
DROP FUNCTION IF EXISTS public.servico_tem_modelo_de_receita(uuid);

UPDATE public.services SET is_active = NOT desativado;

ALTER TABLE public.services DROP COLUMN IF EXISTS desativado;
