-- PUL-206 — as cinco funções que sobraram chamando `has_role`, removida na aposentadoria.
--
-- O inventário da contração cobriu policies, triggers conhecidos e `src/`. Não cobriu o
-- CORPO das funções, e cinco continuaram chamando `public.has_role` depois de ela ser
-- derrubada. Como a chamada só acontece em runtime, o deploy passou e a quebra apareceu
-- para o usuário:
--
--   enforce_past_month_allocation_edit  trigger em project_role_allocations UPDATE OF
--                                       planned_hours — editar hora planejada de mês
--                                       passado estourava "function public.has_role(...)
--                                       does not exist". Foi o defeito relatado.
--   vacation_request_is_admin           usada por 3 policies de vacation_request_approvals
--   vacation_request_owner_or_admin     (SELECT/INSERT/UPDATE) — LER aprovação de férias
--                                       já erra hoje, provado em produção com ROLLBACK.
--   reopen_project_gpo_report           reabrir relatório de GPO entregue
--   simulate_allocation_margin_impact   simulação de impacto na margem
--
-- Paridade zero. Medido em produção antes de escrever esta migration: os conjuntos
-- `pessoa:editar-papel`, `projeto:gerir-qualquer` e `ferias:administrar` têm as MESMAS 8
-- pessoas, zero divergência entre eles. Então trocar `has_role(admin)` por qualquer um
-- deles não move ninguém — o que muda é o vocabulário passar a existir e virar
-- interruptor na tela de perfis.

-- 1. As duas capacidades que faltavam -------------------------------------------
--
-- `simulate_allocation_margin_impact` não ganha capacidade nova: o predicado era
-- `has_role(admin) OR can_manage_project(...)`, e `can_manage_project` já é
-- "gerente do projeto OU projeto:gerir-qualquer". Como quem é admin tem
-- `projeto:gerir-qualquer`, a primeira metade é redundante e sai.
--
-- As funções de férias usam `ferias:administrar`, criada em 20260904230000 exatamente
-- para o predicado só-admin deste domínio.

INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('alocacao:editar-mes-fechado', 'alocacao',
   'Corrigir hora planejada de mês já fechado', false,
   'Alterar planejamento de alocação de um mês anterior ao corrente. O mês fechado é a base de comparação com o realizado, então mexer nele reescreve histórico — por isso é capacidade separada de alocacao:editar. Fecha a lacuna de vocabulário registrada em TD-0019.'),
  ('gpo:reabrir-relatorio', 'projeto',
   'Reabrir relatório de GPO já entregue', true,
   'Devolver ao rascunho um relatório de GPO com status entregue. Entregue é o estado que o cliente viu; reabrir descola o que está registrado do que foi comunicado, e por isso não acompanha a edição comum do relatório.')
ON CONFLICT (key) DO NOTHING;

-- Derivam de quem tem `pessoa:editar-papel`, o marcador de só-admin no modelo. Derivar em
-- vez de nomear papel mantém a paridade em tenant que renomeou ou criou perfil.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.key, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- Acumulação: quem alcança a capacidade de origem por exceção precisa alcançar a nova pela
-- mesma via, senão perde acesso na virada.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, c.key, true, 'espelhamento de user_roles (PUL-209)'
FROM public.user_capability_overrides o
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE o.capability = 'pessoa:editar-papel' AND o.enabled
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

-- Cliente novo nasce dos perfis padrão (20260904260000). Sem esta linha, o Admin de um
-- cliente cadastrado amanhã não teria as duas capacidades e cairia no mesmo defeito.
INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT d.role_name, c.key
FROM public.default_role_capabilities d
CROSS JOIN (VALUES ('alocacao:editar-mes-fechado'), ('gpo:reabrir-relatorio')) AS c(key)
WHERE d.capability = 'pessoa:editar-papel'
ON CONFLICT (role_name, capability) DO NOTHING;

-- 2. As cinco funções --------------------------------------------------------------
--
-- Corpo gerado a partir de `pg_get_functiondef` do banco de produção, trocando APENAS o
-- predicado e a mensagem. Escrever à mão perdeu, na primeira tentativa, o
-- `set_config('app.gpo_transition', ...)` e a limpeza de `delivered_at` de
-- `reopen_project_gpo_report` — que teria trocado um defeito por outro.

CREATE OR REPLACE FUNCTION public.enforce_past_month_allocation_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.planned_hours IS DISTINCT FROM OLD.planned_hours
     AND make_date(OLD.year, OLD.month, 1) < date_trunc('month', now())::date
     AND NOT public.has_capability(auth.uid(), OLD.tenant_id, 'alocacao:editar-mes-fechado')
  THEN
    RAISE EXCEPTION 'O mês % / % já está fechado e a hora planejada dele não pode mais ser alterada por você. Quem administra o sistema consegue corrigir; se a diferença é de execução, registre no mês corrente.',
      lpad(OLD.month::text, 2, '0'), OLD.year
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vacation_request_is_admin(_request_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vacation_requests r
    WHERE r.id = _request_id
      AND public.has_capability(_user_id, r.tenant_id, 'ferias:administrar')
  );
$function$;

CREATE OR REPLACE FUNCTION public.vacation_request_owner_or_admin(_request_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.vacation_requests r
    LEFT JOIN public.employees e ON e.id = r.employee_id
    WHERE r.id = _request_id
      AND (e.auth_id = _user_id OR public.has_capability(_user_id, r.tenant_id, 'ferias:administrar'))
  );
$function$;

CREATE OR REPLACE FUNCTION public.reopen_project_gpo_report(_report_id uuid)
 RETURNS project_gpo_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result public.project_gpo_reports;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.project_gpo_reports r
    WHERE r.id = _report_id AND r.status = 'delivered'
      AND public.has_capability(auth.uid(), r.tenant_id, 'gpo:reabrir-relatorio')
  ) THEN
    RAISE EXCEPTION 'Este relatório não pode ser reaberto por você. Reabrir é permissão de quem administra o sistema, e só vale para relatório já entregue.'
      USING ERRCODE = 'PU001';
  END IF;
  PERFORM set_config('app.gpo_transition', 'reopen', true);
  UPDATE public.project_gpo_reports
     SET status = 'draft', delivered_at = NULL, delivered_by = NULL,
         reopened_at = now(),
         reopened_by = (SELECT id FROM public.employees WHERE auth_id = auth.uid()),
         updated_at = now()
   WHERE id = _report_id RETURNING * INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_allocation_margin_impact(p_project_id uuid, p_employee_id uuid, p_months jsonb)
 RETURNS TABLE(custo_estimado numeric, horas_total numeric, custo_hora_medio numeric, margem_atual numeric, margem_simulada numeric, margem_baseline numeric, delta_pp numeric, tol_pp numeric, verdict text, has_baseline boolean, is_non_revenue boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid; v_revenue numeric; v_budget_id uuid;
  v_taxes_pct numeric; v_commission_pct numeric; v_tol numeric;
  v_taxes numeric; v_commissions numeric; v_other numeric := 0;
  v_current_labor numeric := 0; v_baseline_labor numeric := 0;
  v_est numeric := 0; v_hours numeric := 0;
  v_has_baseline boolean := false; v_is_non_revenue boolean := false;
  v_margem_atual numeric; v_margem_simulada numeric; v_margem_baseline numeric;
  v_delta numeric; v_verdict text;
BEGIN
  SELECT p.tenant_id, COALESCE(pf.total_value, 0), p.budget_id
  INTO v_tenant_id, v_revenue, v_budget_id
  FROM public.projects p
  LEFT JOIN public.project_financials pf ON pf.project_id = p.id
  WHERE p.id = p_project_id;

  IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Projeto não encontrado'; END IF;
  IF NOT (public.can_manage_project(auth.uid(), p_project_id)) THEN
    RAISE EXCEPTION 'Sem permissão para simular impacto na margem deste projeto';
  END IF;

  SELECT fs.taxes_percent, fs.commission_percent, fs.margin_tolerance_pp
  INTO v_taxes_pct, v_commission_pct, v_tol
  FROM public.financial_settings fs WHERE fs.tenant_id = v_tenant_id;

  v_taxes_pct := COALESCE(v_taxes_pct, 0);
  v_commission_pct := COALESCE(v_commission_pct, 0);
  v_tol := COALESCE(v_tol, 3);

  SELECT
    COALESCE(SUM((m->>'hours')::numeric
      * COALESCE(public.calculate_employee_hourly_cost_for_month(
          v_tenant_id, p_employee_id,
          make_date((m->>'year')::int, (m->>'month')::int, 1)), 0)), 0),
    COALESCE(SUM((m->>'hours')::numeric), 0)
  INTO v_est, v_hours
  FROM jsonb_array_elements(COALESCE(p_months, '[]'::jsonb)) AS m;

  v_is_non_revenue := (v_revenue <= 0);

  IF v_is_non_revenue THEN
    RETURN QUERY SELECT round(v_est, 2), v_hours,
      CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
      NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, v_tol,
      NULL::text, false, v_is_non_revenue;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(pc.planned_amount_brl), 0) INTO v_other
  FROM public.project_costs pc
  WHERE pc.project_id = p_project_id AND pc.deleted_at IS NULL;

  SELECT COALESCE(SUM(pra.planned_hours * COALESCE(pra.cost_per_hour,
    public.calculate_employee_hourly_cost_for_month(pra.tenant_id, pra.employee_id, make_date(pra.year, pra.month, 1)), 0)), 0)
  INTO v_current_labor
  FROM public.project_role_allocations pra WHERE pra.project_id = p_project_id;

  IF v_budget_id IS NOT NULL THEN
    SELECT COALESCE(SUM(brm.hours * br.hourly_rate), 0) INTO v_baseline_labor
    FROM public.budget_roles br
    JOIN public.budget_role_months brm ON brm.budget_role_id = br.id
    WHERE br.budget_id = v_budget_id;
    v_has_baseline := EXISTS (SELECT 1 FROM public.budget_roles br WHERE br.budget_id = v_budget_id);
  END IF;

  v_taxes := (v_taxes_pct / 100.0) * v_revenue;
  v_commissions := (v_commission_pct / 100.0) * v_revenue;
  v_margem_atual := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other)) / v_revenue) * 100;
  v_margem_simulada := ((v_revenue - v_taxes - v_commissions - (v_current_labor + v_other + v_est)) / v_revenue) * 100;

  IF v_has_baseline THEN
    v_margem_baseline := ((v_revenue - v_taxes - v_commissions - (v_baseline_labor + v_other)) / v_revenue) * 100;
    v_delta := v_margem_simulada - v_margem_baseline;
    v_verdict := CASE
      WHEN v_margem_simulada >= v_margem_baseline - v_tol THEN 'fits'
      WHEN v_margem_simulada >= v_margem_baseline - (2 * v_tol) THEN 'tightens'
      ELSE 'breaks' END;
  END IF;

  RETURN QUERY SELECT round(v_est, 2), v_hours,
    CASE WHEN v_hours > 0 THEN round(v_est / v_hours, 2) ELSE 0 END,
    round(v_margem_atual, 2), round(v_margem_simulada, 2),
    round(v_margem_baseline, 2), round(v_delta, 2), v_tol,
    v_verdict, v_has_baseline, v_is_non_revenue;
END;
$function$;

-- 3. Convenção de mensagem para o usuário ------------------------------------------
--
-- As duas mensagens acima sobem com SQLSTATE `PU001`, e não com um código padrão do
-- Postgres. É a marca de "esta frase foi escrita para quem está na tela".
--
-- Existe porque o defeito relatado tinha duas metades. A primeira era a função sumida.
-- A segunda é que o front despejava `error.message` cru no toast, então o usuário leu
-- "function public.has_role(uuid, uuid, unknown) does not exist" — que não diz o que
-- fazer e nem sequer era sobre permissão. Com o código próprio, a interface sabe
-- distinguir: `PU001` é frase pronta e vai para a tela como está; qualquer outro código
-- é falha técnica, e a tela mostra texto acionável em vez do original.
--
-- Regra para quem escrever a próxima: RAISE destinado ao usuário usa `PU001` e diz o que
-- fazer. RAISE de invariante interna usa o código padrão e não precisa ser bonito.
