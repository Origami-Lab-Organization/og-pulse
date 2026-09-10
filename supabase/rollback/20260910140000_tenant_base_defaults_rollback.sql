-- Rollback de 20260910140000_tenant_base_defaults.sql (PUL-249).
--
-- ATENÇÃO — este rollback NÃO apaga dado de cliente. Os centros de custo, linhas de serviço
-- e perfis de encargos semeados ficam onde estão, de propósito: depois do deploy o cliente
-- pode ter renomeado um centro, vinculado serviço a ele (`services.cost_center_id`) e
-- lançado hora que gravou aquele centro (`activity_timesheets.cost_center_id`, ADR-0031).
-- Apagar seria reescrever histórico e bater no ON DELETE RESTRICT.
--
-- O que este arquivo faz é desligar o mecanismo: o trigger volta a semear só os perfis, as
-- funções novas somem e os catálogos de produto somem. Empresa criada depois disto volta a
-- nascer sem base cadastrada.
--
-- Para remover o dado semeado de um tenant específico, faça à mão e na ordem, conferindo
-- antes se nada aponta para ele:
--   SELECT count(*) FROM services         WHERE cost_center_id = '<id>';
--   SELECT count(*) FROM activity_types   WHERE cost_center_id = '<id>';
--   SELECT count(*) FROM activity_timesheets WHERE cost_center_id = '<id>';

-- 1. O trigger volta ao comportamento de PUL-206: só perfis.
CREATE OR REPLACE FUNCTION public.seed_tenant_roles_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_roles(NEW.id);
  RETURN NULL;
END;
$$;

-- 2. Fora os semeadores novos. `seed_tenant_roles` NÃO é tocada: é de PUL-206.
DROP FUNCTION IF EXISTS public.seed_tenant_defaults(uuid);
DROP FUNCTION IF EXISTS public.seed_tenant_payroll_profile(uuid);
DROP FUNCTION IF EXISTS public.seed_tenant_service_lines(uuid);
DROP FUNCTION IF EXISTS public.seed_tenant_cost_centers(uuid);

-- 3. Fora os catálogos de produto.
DROP TABLE IF EXISTS public.default_service_lines;
DROP TABLE IF EXISTS public.default_cost_centers;
