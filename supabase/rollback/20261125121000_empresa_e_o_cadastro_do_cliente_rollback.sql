-- Rollback de 20261125121000_empresa_e_o_cadastro_do_cliente.sql
--
-- O Ganho volta a não criar cliente e a empresa deixa de copiar a identificação para ele. Os
-- clientes já criados e as ligações feitas continuam (são dados, não regra).

DROP TRIGGER IF EXISTS trg_prospect_companies_sincroniza_cliente ON public.prospect_companies;
DROP FUNCTION IF EXISTS public.prospect_companies_sincroniza_cliente();

DROP TRIGGER IF EXISTS trg_prospects_ganho_torna_cliente ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_ganho_torna_cliente();

DROP FUNCTION IF EXISTS public.garantir_cliente_da_empresa(uuid);
