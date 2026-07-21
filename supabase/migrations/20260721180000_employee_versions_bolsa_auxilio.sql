-- Versiona bolsa_auxilio junto com o marco financeiro do colaborador — mesmo
-- motivo de total_benefits_cost/total_tools_cost (20260721150000_...): sem
-- isso, um colaborador Estágio que muda de tipo de contratação (ex.:
-- Estágio -> CLT) perde retroativamente todo o salário-base histórico nos
-- relatórios, porque calculateEmployeeCost usa bolsa_auxilio (não
-- salario_mensal) como base para o tipo ESTAGIO, e esse campo nunca foi
-- congelado em employee_versions — sempre lia do cadastro atual, que é
-- sobrescrito na transição.
--
-- Null em versões já existentes (criadas antes desta coluna existir) — cai
-- para o cadastro atual nesse caso (resolveVersionSegments, payrollAnalysis.ts),
-- mesmo comportamento de antes; passa a ser preenchido a partir de agora em
-- toda criação/fechamento de versão (employeeService.ts).
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS bolsa_auxilio NUMERIC;

-- Reaplica activate_scheduled_employee_versions() (20260721150000_...) incluindo
-- bolsa_auxilio na ativação de marcos agendados — sem isso, uma mudança futura de
-- bolsa_auxilio seria capturada e retirada do UPDATE imediato (employeeService.ts,
-- isFutureDated), mas nunca chegaria a ser aplicada em employees, mesmo depois de
-- effective_from chegar (não havia coluna em employee_versions para o cron copiar).
-- COALESCE evita sobrescrever com NULL uma versão aberta anterior a esta migration.
CREATE OR REPLACE FUNCTION public.activate_scheduled_employee_versions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.employees DISABLE TRIGGER prevent_employee_self_escalation;

  UPDATE public.employees e
  SET
    tipo_contratacao = ev.tipo_contratacao,
    salario_mensal = ev.salario_mensal,
    salario_liquido = ev.salario_liquido,
    beneficios = ev.beneficios,
    encargos = ev.encargos,
    fgts = ev.fgts,
    inss_empresa = ev.inss_empresa,
    decimo_terceiro = ev.decimo_terceiro,
    ferias = ev.ferias,
    pro_labore = ev.pro_labore,
    jornada_mensal = ev.jornada_mensal,
    jornada_diaria = ev.jornada_diaria,
    cargo = ev.cargo,
    total_monthly_cost_estimated = COALESCE(ev.total_monthly_cost_estimated, e.total_monthly_cost_estimated),
    bolsa_auxilio = COALESCE(ev.bolsa_auxilio, e.bolsa_auxilio)
  FROM public.employee_versions ev
  WHERE ev.employee_id = e.id
    AND ev.effective_until IS NULL
    AND ev.effective_from <= CURRENT_DATE
    AND (
      e.tipo_contratacao IS DISTINCT FROM ev.tipo_contratacao
      OR e.salario_mensal IS DISTINCT FROM ev.salario_mensal
      OR e.salario_liquido IS DISTINCT FROM ev.salario_liquido
      OR e.beneficios IS DISTINCT FROM ev.beneficios
      OR e.encargos IS DISTINCT FROM ev.encargos
      OR e.fgts IS DISTINCT FROM ev.fgts
      OR e.inss_empresa IS DISTINCT FROM ev.inss_empresa
      OR e.decimo_terceiro IS DISTINCT FROM ev.decimo_terceiro
      OR e.ferias IS DISTINCT FROM ev.ferias
      OR e.pro_labore IS DISTINCT FROM ev.pro_labore
      OR e.jornada_mensal IS DISTINCT FROM ev.jornada_mensal
      OR e.jornada_diaria IS DISTINCT FROM ev.jornada_diaria
      OR e.cargo IS DISTINCT FROM ev.cargo
      OR e.total_monthly_cost_estimated IS DISTINCT FROM COALESCE(ev.total_monthly_cost_estimated, e.total_monthly_cost_estimated)
      OR e.bolsa_auxilio IS DISTINCT FROM COALESCE(ev.bolsa_auxilio, e.bolsa_auxilio)
    );

  ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_escalation;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_scheduled_employee_versions() FROM PUBLIC;
