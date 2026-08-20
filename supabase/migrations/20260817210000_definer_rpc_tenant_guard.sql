-- PUL-163 — RPCs SECURITY DEFINER devem validar o tenant do chamador.
--
-- Problema:
--   Funções SECURITY DEFINER rodam com privilégio elevado e ignoram RLS. Várias
--   recebem `p_tenant_id` do cliente e não verificam se quem chamou pertence
--   àquele tenant. Como EXECUTE é concedido a PUBLIC por padrão no Postgres,
--   qualquer usuário autenticado podia trocar o UUID no payload e ler dados de
--   outra empresa.
--
-- Estratégia:
--   1. Um único ponto de decisão (`assert_tenant_access`) que nega com erro
--      explícito, em vez de devolver vazio silenciosamente.
--   2. Nas funções de leitura chamadas pelo frontend, o corpo original NÃO é
--      reescrito: ele é renomeado para `*_unguarded` (revogado de PUBLIC) e a
--      função pública passa a ser um wrapper fino que valida e delega. Corpos de
--      180–220 linhas com CTEs ficam byte-idênticos, o que elimina risco de erro
--      de transcrição e de ambiguidade entre colunas de RETURNS TABLE e variáveis
--      plpgsql.
--   3. Funções internas (chamadas por trigger/cron/Edge Function com service
--      role) saem de PUBLIC — não precisam ser alcançáveis pelo cliente.
--
-- IMPORTANTE (herdado da PUL-172, que foi absorvida):
--   Nas RPCs de alocação, validar APENAS o pertencimento ao tenant. NÃO adicionar
--   escopo por gerente ou projeto: a tela Meu Time depende de ler a carga total
--   da pessoa, inclusive em projetos de outros GPs, para não sobre-alocar quem já
--   está cheio. Cross-tenant é vazamento; cross-projeto no mesmo tenant é
--   requisito de produto.
--
-- Ver ADR-0021.

-- 1. Ponto único de negação -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_tenant_access(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant não informado' USING ERRCODE = '22023';
  END IF;

  IF NOT public.user_belongs_to_tenant(auth.uid(), p_tenant_id) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não pertence ao tenant informado'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_tenant_access(uuid) IS
  'Falha com 42501 quando o chamador não pertence ao tenant informado. Ponto único '
  'de validação para RPCs SECURITY DEFINER que recebem tenant como parâmetro (PUL-163).';

GRANT EXECUTE ON FUNCTION public.assert_tenant_access(uuid) TO authenticated;

-- 2. get_crm_received_value — soma de parcelas recebidas (R$) --------------------
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_crm_received_value_unguarded'
  ) THEN
    ALTER FUNCTION public.get_crm_received_value(uuid)
      RENAME TO get_crm_received_value_unguarded;
  END IF;
END
$do$;

REVOKE ALL ON FUNCTION public.get_crm_received_value_unguarded(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_crm_received_value(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  RETURN public.get_crm_received_value_unguarded(p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_received_value(uuid) TO authenticated;

-- 3. get_allocation_employee_month_summary — carga/capacidade por mês -----------
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_allocation_employee_month_summary_unguarded'
  ) THEN
    ALTER FUNCTION public.get_allocation_employee_month_summary(uuid, integer, uuid, uuid, text)
      RENAME TO get_allocation_employee_month_summary_unguarded;
  END IF;
END
$do$;

REVOKE ALL ON FUNCTION
  public.get_allocation_employee_month_summary_unguarded(uuid, integer, uuid, uuid, text)
  FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_allocation_employee_month_summary(
  p_tenant_id  uuid,
  p_year       integer,
  p_manager_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_team_key   text DEFAULT NULL
)
RETURNS TABLE (
  employee_id      uuid,
  employee_name    text,
  cargo            text,
  jornada_diaria   numeric,
  status           text,
  hire_date        date,
  termination_date date,
  month            integer,
  planned_hours    numeric,
  actual_hours     numeric,
  capacity_hours   numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);

  RETURN QUERY
  SELECT *
  FROM public.get_allocation_employee_month_summary_unguarded(
    p_tenant_id, p_year, p_manager_id, p_project_id, p_team_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.get_allocation_employee_month_summary(uuid, integer, uuid, uuid, text)
  TO authenticated;

-- 5. generate_budget_number — numeração sequencial do tenant --------------------
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'generate_budget_number_unguarded'
  ) THEN
    ALTER FUNCTION public.generate_budget_number(uuid)
      RENAME TO generate_budget_number_unguarded;
  END IF;
END
$do$;

REVOKE ALL ON FUNCTION public.generate_budget_number_unguarded(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.generate_budget_number(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  RETURN public.generate_budget_number_unguarded(p_tenant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_budget_number(uuid) TO authenticated;

-- 6. get_employee_status — status do próprio usuário ---------------------------
--
-- Recebe p_auth_id e devolvia o status de QUALQUER employee. É chamada no login
-- (AuthContext) sempre com o id da própria sessão, então restringir a "si mesmo"
-- não altera nenhum consumidor.
CREATE OR REPLACE FUNCTION public.get_employee_status(p_auth_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.status
  FROM public.employees e
  WHERE e.auth_id = p_auth_id
    AND p_auth_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_employee_status(uuid) TO authenticated;

-- 7. Funções internas saem do alcance do cliente -------------------------------
--
-- Nenhuma é chamada pelo frontend. apply_absence_period roda em Edge Function com
-- service role (register-absence-period, decide-time-adjustment) e em
-- reprocess_time_bank_from_date (SECURITY DEFINER); count_employee_cost_business_days
-- é chamada por triggers e funções, todas SECURITY DEFINER — então a revogação de
-- PUBLIC não afeta nenhum caminho legítimo.
--
-- Antes, com EXECUTE em PUBLIC, qualquer autenticado podia chamá-las passando o
-- tenant que quisesse — inclusive apply_absence_period, que ESCREVE registro de
-- falta/abono.
--
-- NÃO revogado aqui: calculate_employee_hourly_cost_for_month. Ela também é
-- DEFINER e recebe tenant, mas simulate_allocation_margin_impact é SECURITY
-- INVOKER e a chama a partir do frontend — revogar de PUBLIC quebraria o painel
-- de impacto na margem. Guardá-la por dentro também não é trivial: ela roda em
-- trigger durante escrita do usuário (auth.uid() presente) e em cron/service role
-- (auth.uid() nulo), e é chamada por linha em recálculos em lote, onde um
-- user_belongs_to_tenant por chamada teria custo. Tratada à parte.
REVOKE ALL ON FUNCTION
  public.apply_absence_period(uuid, uuid, date, date, text)
  FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.count_employee_cost_business_days(uuid, date, date)
  FROM PUBLIC;
