-- Versiona o total de benefícios/ferramentas junto com o marco financeiro do
-- colaborador (ex.: transição Menor Aprendiz -> CLT), para que Folha de
-- Pagamento e Custo x Hora reflitam corretamente o histórico. Congelado no
-- fechamento da versão (employeeService.ts) — a versão aberta não guarda
-- total, o app usa a soma ao vivo de employee_benefits/employee_tools nesse caso.
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS total_benefits_cost NUMERIC;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS total_tools_cost NUMERIC;

-- Garante no máximo uma versão aberta por colaborador — createVersion()/employeeService.ts
-- dependem desse invariante para achar "a versão vigente" de forma inequívoca.
CREATE UNIQUE INDEX IF NOT EXISTS employee_versions_one_open_per_employee
  ON public.employee_versions (employee_id) WHERE effective_until IS NULL;

-- Ativa diariamente qualquer marco financeiro agendado para uma data já
-- alcançada (effective_from <= hoje) na versão ainda aberta de cada
-- colaborador, copiando os valores para a linha "atual" de employees. Sem
-- isso, um marco com data futura nunca aplicaria seus valores (o app só
-- grava a versão futura, não sobrescreve employees antes da data de
-- vigência chegar).
CREATE OR REPLACE FUNCTION public.activate_scheduled_employee_versions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- prevent_employee_self_escalation (BEFORE UPDATE) exige auth.uid() com papel
  -- admin/manager — inexistente numa execução via pg_cron — mesmo padrão de
  -- desativar/reativar já usado em 20260519212459_....sql para updates em lote.
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
    total_monthly_cost_estimated = COALESCE(ev.total_monthly_cost_estimated, e.total_monthly_cost_estimated)
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
    );

  ALTER TABLE public.employees ENABLE TRIGGER prevent_employee_self_escalation;
END;
$$;

-- Função de uso exclusivo do cron (roda como owner do job, fora do contexto
-- PostgREST) — nunca deve ser exposta via /rest/v1/rpc para nenhum tenant.
REVOKE ALL ON FUNCTION public.activate_scheduled_employee_versions() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'activate-scheduled-employee-versions-daily') THEN
    PERFORM cron.unschedule('activate-scheduled-employee-versions-daily');
  END IF;
END $$;

-- 03:00 UTC = 00:00 em Brasília (UTC-3) — início do dia de vigência.
SELECT cron.schedule(
  'activate-scheduled-employee-versions-daily',
  '0 3 * * *',
  $$SELECT public.activate_scheduled_employee_versions();$$
);
