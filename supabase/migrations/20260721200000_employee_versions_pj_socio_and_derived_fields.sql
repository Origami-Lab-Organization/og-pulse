-- Completa o versionamento financeiro: valor_contrato_pj/dividendos (mesma lacuna que
-- bolsa_auxilio tinha para Estágio, agora corrigida também para PJ/Sócio) e
-- total_annual_cost_estimated/breakdown_json (campos derivados, sem efeito em nenhum
-- cálculo histórico, mas úteis para a aba Histórico mostrar o snapshot completo do período).
--
-- valor_contrato_pj/dividendos SÃO lidos por calculateEmployeeCost (src/lib/
-- employeeCostCalculator.ts) como base de custo para PJ/SOCIO — sem congelar por versão,
-- um colaborador PJ/Sócio que muda de tipo de contratação perderia retroativamente o valor
-- do contrato/dividendos nos meses antigos, mesmo bug já corrigido para bolsa_auxilio
-- (Estágio) em 20260721180000_employee_versions_bolsa_auxilio.sql.
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS valor_contrato_pj NUMERIC;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS dividendos NUMERIC;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS total_annual_cost_estimated NUMERIC;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS breakdown_json JSONB;

-- Reaplica activate_scheduled_employee_versions() incluindo valor_contrato_pj/dividendos/
-- total_annual_cost_estimated/breakdown_json na ativação de marcos agendados — mesmo
-- raciocínio de bolsa_auxilio: sem isso, uma mudança futura nesses campos seria capturada
-- e retirada do UPDATE imediato (employeeService.ts, isFutureDated), mas nunca chegaria a
-- ser aplicada em employees, mesmo depois de effective_from chegar.
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
    bolsa_auxilio = COALESCE(ev.bolsa_auxilio, e.bolsa_auxilio),
    valor_contrato_pj = COALESCE(ev.valor_contrato_pj, e.valor_contrato_pj),
    dividendos = COALESCE(ev.dividendos, e.dividendos),
    total_annual_cost_estimated = COALESCE(ev.total_annual_cost_estimated, e.total_annual_cost_estimated),
    breakdown_json = COALESCE(ev.breakdown_json, e.breakdown_json)
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
      OR e.valor_contrato_pj IS DISTINCT FROM COALESCE(ev.valor_contrato_pj, e.valor_contrato_pj)
      OR e.dividendos IS DISTINCT FROM COALESCE(ev.dividendos, e.dividendos)
      OR e.total_annual_cost_estimated IS DISTINCT FROM COALESCE(ev.total_annual_cost_estimated, e.total_annual_cost_estimated)
      OR e.breakdown_json IS DISTINCT FROM COALESCE(ev.breakdown_json, e.breakdown_json)
    );

  ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_escalation;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_scheduled_employee_versions() FROM PUBLIC;
