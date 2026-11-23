-- Projetos — lançar horas e custos só dentro do período do projeto (US-0030, 23/11/2026).
--
-- Decisões do Victor (23/11/2026):
--   * Projeto concluído (portfolio_stage = 'completed') não aceita lançar, editar nem apagar
--     horas e custos. Quem gere qualquer projeto (`projeto:gerir-qualquer`, o "admin" de
--     projetos desde 04/09) pode.
--   * Lançamento só entre a data de início e a data de fim do projeto, com as duas pontas.
--     Projeto contínuo ou sem data de fim só tem o limite do início. Vale para todos.
--   * Para o custo vale a data do custo; o pagamento pode ser depois do fim. Por isso o custo
--     ganha `paid_at`, separado de `cost_date` (até aqui, pagar gravava a data do pagamento
--     em `cost_date`). Custo não pago entra no planejado; pago, também no realizado — sem
--     mudança nessa regra.
--
-- A regra fica no banco, e não só na tela, porque há dois caminhos de escrita: a tela e o
-- chat (MCP `log_project_hours`, que grava com a sessão da pessoa). A recusa usa
-- ERRCODE 'PU001', que `mensagemParaUsuario` mostra como está.
--
-- O que NÃO é recusado:
--   * escrita sem usuário (auth.uid() nulo): migrations, rotinas do sistema e backfills, como
--     o snapshot de custo/hora, que atualizam horas de projetos já concluídos;
--   * mudança em hora que não mexe no lançamento (travar/aprovar, snapshot de custo, centro de
--     custo): só horas, data, projeto, pessoa e descrição contam como editar;
--   * hora com 0 h fora do período (upsert da grade que zera uma célula não é lançamento);
--   * custo sem `cost_date` (recorrentes legados e os criados no fechamento de negócio, que
--     usam o mês relativo).
-- Lançamentos fora do período que já existem continuam valendo; a regra só olha a data quando
-- ela é gravada ou alterada.
--
-- Rollback: supabase/rollback/20261123220000_lancamento_no_periodo_do_projeto_rollback.sql

-- 1. Data do pagamento separada da data do custo ------------------------------------------

ALTER TABLE public.project_costs ADD COLUMN IF NOT EXISTS paid_at date;

COMMENT ON COLUMN public.project_costs.paid_at IS
  'Data do pagamento (US-0030). A data do custo fica em cost_date; antes de 23/11/2026 pagar gravava a data do pagamento em cost_date.';

-- Custos já pagos: a única data que existe é a do pagamento, que estava em cost_date.
UPDATE public.project_costs
   SET paid_at = cost_date
 WHERE status = 'paid'
   AND paid_at IS NULL
   AND cost_date IS NOT NULL;

-- 2. Regra única: o projeto aceita este lançamento? ----------------------------------------

CREATE OR REPLACE FUNCTION public.assert_project_accepts_entry(
  _project_id uuid,
  _entry_date date,
  _check_period boolean
) RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  -- Sem usuário: migration, rotina ou backfill do sistema.
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT start_date, end_date, is_continuous, portfolio_stage, tenant_id
    INTO p
    FROM public.projects
   WHERE id = _project_id;

  -- Projeto apagado no mesmo comando (cascade): nada a proteger.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p.portfolio_stage = 'completed'
     AND NOT public.has_capability(auth.uid(), p.tenant_id, 'projeto:gerir-qualquer') THEN
    RAISE EXCEPTION 'Este projeto está concluído e não aceita lançamentos. Se precisar corrigir algo, fale com um administrador.'
      USING ERRCODE = 'PU001';
  END IF;

  IF NOT _check_period OR _entry_date IS NULL THEN
    RETURN;
  END IF;

  IF _entry_date < p.start_date THEN
    RAISE EXCEPTION 'A data % é anterior ao início do projeto (%).',
      to_char(_entry_date, 'DD/MM/YYYY'), to_char(p.start_date, 'DD/MM/YYYY')
      USING ERRCODE = 'PU001';
  END IF;

  IF NOT coalesce(p.is_continuous, false) AND p.end_date IS NOT NULL AND _entry_date > p.end_date THEN
    RAISE EXCEPTION 'A data % é posterior ao fim do projeto (%). Para lançar depois do fim, o GP precisa estender a data de fim.',
      to_char(_entry_date, 'DD/MM/YYYY'), to_char(p.end_date, 'DD/MM/YYYY')
      USING ERRCODE = 'PU001';
  END IF;
END;
$$;

-- Só os triggers abaixo chamam a regra; ela não fica exposta como RPC.
REVOKE ALL ON FUNCTION public.assert_project_accepts_entry(uuid, date, boolean) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.assert_project_accepts_entry(uuid, date, boolean) IS
  'US-0030: recusa (PU001) lançamento em projeto concluído sem projeto:gerir-qualquer e, com _check_period, data fora do período. Sem usuário, não recusa.';

-- 3. Horas de projeto -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_project_timesheet_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.assert_project_accepts_entry(OLD.project_id, OLD.work_date, false);
    RETURN OLD;
  END IF;

  -- Travar/aprovar, snapshot de custo e centro de custo não são editar o lançamento.
  IF TG_OP = 'UPDATE'
     AND NEW.hours IS NOT DISTINCT FROM OLD.hours
     AND NEW.work_date IS NOT DISTINCT FROM OLD.work_date
     AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
     AND NEW.project_member_id IS NOT DISTINCT FROM OLD.project_member_id
     AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;

  PERFORM public.assert_project_accepts_entry(
    NEW.project_id,
    NEW.work_date,
    -- Período: lançamento novo ou data/projeto trocados, e só com horas (zerar não é lançar).
    coalesce(NEW.hours, 0) > 0
      AND (TG_OP = 'INSERT'
           OR NEW.work_date IS DISTINCT FROM OLD.work_date
           OR NEW.project_id IS DISTINCT FROM OLD.project_id)
  );

  -- Mover a hora de projeto também mexe no projeto de origem.
  IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    PERFORM public.assert_project_accepts_entry(OLD.project_id, OLD.work_date, false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_project_timesheet_entry ON public.project_timesheets;
CREATE TRIGGER guard_project_timesheet_entry
  BEFORE INSERT OR UPDATE OR DELETE ON public.project_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_project_timesheet_entry();

-- 4. Custos do projeto ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_project_cost_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.assert_project_accepts_entry(OLD.project_id, OLD.cost_date, false);
    RETURN OLD;
  END IF;

  -- Qualquer escrita de pessoa no custo (editar, pagar, cancelar, excluir) é lançamento; o
  -- período só é conferido quando a data do custo é gravada ou alterada.
  PERFORM public.assert_project_accepts_entry(
    NEW.project_id,
    NEW.cost_date,
    TG_OP = 'INSERT' OR NEW.cost_date IS DISTINCT FROM OLD.cost_date
  );

  IF TG_OP = 'UPDATE' AND NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    PERFORM public.assert_project_accepts_entry(OLD.project_id, OLD.cost_date, false);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_project_cost_entry ON public.project_costs;
CREATE TRIGGER guard_project_cost_entry
  BEFORE INSERT OR UPDATE OR DELETE ON public.project_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_project_cost_entry();
