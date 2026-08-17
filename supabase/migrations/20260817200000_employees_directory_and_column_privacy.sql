-- PUL-162 — Salário e dados pessoais não podem vazar entre colegas de projeto.
--
-- Problema:
--   A policy "Employees can view project co-members" concede SELECT da LINHA INTEIRA
--   de employees para quem compartilha projeto. RLS é row-level: aprovado o USING,
--   todas as colunas ficam legíveis. Isso expõe salario_mensal, salario_liquido,
--   pro_labore, dividendos, total_monthly_cost_estimated, cpf, data_nascimento,
--   telefone e dados bancários/PIX a qualquer colega de projeto, sem passar por tela.
--
--   O comentário da migration original (20260512200000) mostra que a intenção era
--   outra: "view basic info ... so assignee dropdowns can show names". A intenção
--   estava certa; o mecanismo (policy de linha) não sabe limitar coluna.
--
-- Decisão:
--   Substituir a policy ampla por um diretório com projeção controlada, no mesmo
--   padrão já usado por get_project_assignable_members (20260520120000): função
--   SECURITY DEFINER que devolve apenas campos de identidade.
--
--   Escopo do diretório: tenant inteiro (não só co-membros). É estritamente mais
--   seguro que hoje (nenhum dado financeiro/PII) e ainda corrige dois defeitos
--   existentes: nome de aprovador de férias aparecia como "Desconhecido" quando o
--   admin não era co-membro, e o seletor de convidados de evento só enxergava
--   co-membros quando o objetivo é convidar qualquer pessoa da empresa.
--
-- Ver ADR-0020.

-- 1. Diretório de identidade do tenant -----------------------------------------
--
-- Segurança:
--   - O tenant é DERIVADO de auth.uid(); não é parâmetro. Isso remove por
--     construção a classe de bug de RPC que confia no tenant_id do chamador
--     (ver PUL-163).
--   - Projeção fixa: nenhuma coluna de remuneração, custo ou dado pessoal
--     sensível pode ser retornada, mesmo que a tabela ganhe colunas novas.
CREATE OR REPLACE FUNCTION public.get_employee_directory()
RETURNS TABLE (
  id       uuid,
  nome     text,
  cargo    text,
  foto_url text,
  email    text,
  status   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.nome,
    e.cargo,
    e.foto_url,
    e.email,
    e.status
  FROM public.employees e
  WHERE e.tenant_id = public.get_user_tenant_id(auth.uid())
  ORDER BY e.nome;
$$;

COMMENT ON FUNCTION public.get_employee_directory() IS
  'Diretório de identidade do tenant do chamador: id, nome, cargo, foto e e-mail. '
  'Projeção fixa e sem dados financeiros ou pessoais sensíveis — substitui a leitura '
  'de linha inteira que a policy de co-membro concedia (PUL-162).';

GRANT EXECUTE ON FUNCTION public.get_employee_directory() TO authenticated;

-- 1b. Ids dos admins do tenant --------------------------------------------------
--
-- Necessário para o fluxo de férias resolver os aprovadores (admin → aprovador
-- final). Antes isso era feito lendo employees por auth_id, o que dependia da
-- policy de co-membro e já falhava quando o admin não compartilhava projeto com
-- o solicitante — daí o "Desconhecido" na lista de aprovações.
--
-- Devolve apenas ids; nenhum dado pessoal.
CREATE OR REPLACE FUNCTION public.get_tenant_admin_employee_ids()
RETURNS TABLE (employee_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.employees e
  JOIN public.user_roles ur
    ON ur.user_id = e.auth_id
   AND ur.tenant_id = e.tenant_id
  WHERE e.tenant_id = public.get_user_tenant_id(auth.uid())
    AND ur.role = 'admin';
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_admin_employee_ids() TO authenticated;

-- 2. Remoção da policy que expunha a linha inteira ------------------------------
--
-- Após esta remoção, SELECT em employees fica restrito a:
--   - o próprio registro          ("Employees can view own record")
--   - admin e gerente do tenant   ("Admins and managers can view all employees in tenant")
-- Identidade de colegas passa a ser servida exclusivamente pelo diretório acima.
DROP POLICY IF EXISTS "Employees can view project co-members" ON public.employees;

-- A função user_shares_project_with_employee era usada APENAS por esta policy e
-- fica sem consumidor. Mantida (não dropada) para não quebrar nenhuma referência
-- externa não mapeada — é STABLE, SECURITY DEFINER com search_path fixo e não
-- concede acesso por si só. Candidata a remoção numa limpeza posterior.
