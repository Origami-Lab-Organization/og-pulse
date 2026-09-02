-- PUL-208 (ADR-0027, divergencia D2): consolidar o predicado "admin ou gerente do tenant"
-- num nome unico, antes de a onda de capacidades trocar as policies.
--
-- Por que: desde 20260331013008 as funcoes `is_admin_or_manager` e `is_manager_in_tenant`
-- tem corpo IDENTICO (mesma assinatura, LANGUAGE sql, STABLE, SECURITY DEFINER, mesmo
-- search_path e a mesma consulta a user_roles com role IN ('admin','manager')). O nome
-- `is_manager_in_tenant` sugere um recorte que a funcao nao faz — e sugeria de fato
-- quando foi escrita, porque o corpo original era `employees.is_gerente = true`. O
-- predicado mudou por baixo das policies sem que nenhuma policy mudasse de nome.
--
-- Quem for migrar essas policies para `has_capability` (PUL-200/PUL-201) encontraria dois
-- nomes, presumiria dois recortes e erraria. As 5 policies afetadas sao justamente as de
-- dado mais sensivel (remuneracao e rescisao), onde errar e caro.
--
-- SEM MUDANCA DE COMPORTAMENTO. Duas equivalencias sustentam isso:
--   1. is_manager_in_tenant(u,t) === is_admin_or_manager(u,t)  (corpos identicos)
--   2. has_role(u,t,'admin') OR is_admin_or_manager(u,t) === is_admin_or_manager(u,t)
--      porque is_admin_or_manager ja inclui 'admin'. A redundancia sai por legibilidade;
--      o conjunto de quem passa e exatamente o mesmo.
--
-- `is_manager_in_tenant` NAO e removida aqui: passa a delegar para `is_admin_or_manager`
-- e fica marcada como deprecada. Motivo: o estado efetivo do banco e INFERIDO a partir das
-- migrations (ver "Metodo e limite de confianca" em .harness/capability-matrix.md) — pode
-- existir policy criada fora deste diretorio ainda referenciando a funcao. Dropar seria
-- erro em runtime, nao em migration. A remocao acontece em PUL-206, depois de conferir
-- pg_policies contra o banco alvo.

-- ---------------------------------------------------------------------------
-- 1. employees — SELECT (origem: 20260301031026)
-- ---------------------------------------------------------------------------
-- Nota: esta e a policy da divergencia D1. Ela aprova a LINHA INTEIRA de employees para
-- admin e gerente, incluindo salario_mensal, pro_labore, dividendos, cpf e dados
-- bancarios. Esta migration NAO altera esse recorte — apenas o nome do predicado.
-- A correcao de D1 depende da decisao P3 do negocio e exige projecao por coluna
-- (SECURITY DEFINER, padrao de get_employee_directory), nao ajuste de policy.
DROP POLICY IF EXISTS "Admins and managers can view all employees in tenant" ON public.employees;
CREATE POLICY "Admins and managers can view all employees in tenant"
ON public.employees
FOR SELECT
TO authenticated
USING (
  is_admin_or_manager(auth.uid(), tenant_id)
);

-- ---------------------------------------------------------------------------
-- 2. employees — UPDATE (origem: 20260331022307)
-- ---------------------------------------------------------------------------
-- O nome diz "Admins", mas o predicado sempre incluiu gerente. Nome preservado de
-- proposito: renomear policy nesta migration acrescentaria uma segunda mudanca a uma
-- entrega cujo objetivo e ser provadamente inerte. Fica registrado para PUL-201.
DROP POLICY IF EXISTS "Admins can update employees in their tenant" ON public.employees;
CREATE POLICY "Admins can update employees in their tenant"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  is_admin_or_manager(auth.uid(), tenant_id)
);

-- ---------------------------------------------------------------------------
-- 3. employee_terminations — SELECT (origem: 20260304120700)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can view terminations" ON public.employee_terminations;
CREATE POLICY "Managers can view terminations"
ON public.employee_terminations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_terminations.employee_id
      AND is_admin_or_manager(auth.uid(), e.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- 4. termination_documents — SELECT (origem: 20260304120700)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can view termination documents" ON public.termination_documents;
CREATE POLICY "Managers can view termination documents"
ON public.termination_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_terminations et
    JOIN public.employees e ON e.id = et.employee_id
    WHERE et.id = termination_documents.termination_id
      AND is_admin_or_manager(auth.uid(), e.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- 5. payroll_adjustments — SELECT (origem: 20260304120700)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Managers can view payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Managers can view payroll adjustments"
ON public.payroll_adjustments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.employee_terminations et
    JOIN public.employees e ON e.id = et.employee_id
    WHERE et.id = payroll_adjustments.termination_id
      AND is_admin_or_manager(auth.uid(), e.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- 6. is_manager_in_tenant passa a delegar, e fica deprecada
-- ---------------------------------------------------------------------------
-- Mantida como wrapper para nao quebrar consumidor nao mapeado. Como delega, deixa de ser
-- uma segunda definicao do predicado: qualquer mudanca futura em is_admin_or_manager
-- alcanca os dois nomes, e a divergencia D2 nao pode reaparecer.
CREATE OR REPLACE FUNCTION public.is_manager_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_manager(_user_id, _tenant_id);
$$;

COMMENT ON FUNCTION public.is_manager_in_tenant(uuid, uuid) IS
  'DEPRECADA (PUL-208, ADR-0027). Delega para is_admin_or_manager, de quem o corpo era '
  'identico desde 20260331013008. Nao usar em codigo novo: o predicado canonico e '
  'is_admin_or_manager, e a onda de capacidades o substitui por has_capability. '
  'Remocao em PUL-206, apos conferir pg_policies contra o banco alvo.';

COMMENT ON FUNCTION public.is_admin_or_manager(uuid, uuid) IS
  'Predicado canonico "admin ou gerente do tenant" (le user_roles). A ser substituido por '
  'has_capability na onda de capacidades — ver ADR-0027 e .harness/capability-matrix.md.';
