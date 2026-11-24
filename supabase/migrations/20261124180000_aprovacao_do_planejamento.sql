-- US-0039 — Planejamento guiado por checklist: aprovação do admin quando o planejado fica
-- abaixo do orçado.
--
-- O orçamento vendido é o limite. Quando o resultado planejado (contrato − comissão − equipe
-- − custos) fica abaixo do orçado, o GP pede a aprovação do admin; o admin aprova e conclui,
-- ou devolve com motivo. Se o GP mudar o resultado depois de pedir, o pedido cai.
--
-- 1. Capacidade `planejamento:aprovar-abaixo-do-orcado`, nascendo com quem tem
--    `pessoa:editar-papel` (o admin), como pede a ADR-0027.
-- 2. Tabela `project_planning_approvals`: um pedido por linha, no máximo um aberto por
--    projeto. Guarda o resultado planejado no momento do pedido (para detectar a mudança) e
--    o motivo da devolução.
-- 3. Gatilho que só deixa um pedido aberto mudar de estado, e só para quem pode:
--    aprovar/devolver é da capacidade nova; cancelar é de quem gere o projeto.
-- 4. RLS por tenant: lê quem tem `financeiro:ler` (o pedido carrega resultado e margem);
--    pede e cancela quem edita o projeto (`projeto:editar` + `can_manage_project`).

-- ── 1. Capacidade ───────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('planejamento:aprovar-abaixo-do-orcado', 'projeto', 'Aprovar planejamento abaixo do orçado',
   'Concluir o planejamento de um projeto cujo resultado planejado ficou abaixo do orçamento '
   'vendido, ou devolver ao GP com o motivo (US-0039).',
   false)
ON CONFLICT (key) DO NOTHING;

-- Nasce com o admin (quem tem pessoa:editar-papel). Guarda do último admin desligada só neste
-- trecho, como em 20261021140000.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'planejamento:aprovar-abaixo-do-orcado', true
FROM public.role_capabilities rc
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'planejamento:aprovar-abaixo-do-orcado'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'pessoa:editar-papel'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'planejamento:aprovar-abaixo-do-orcado', o.enabled,
       'espelhamento de pessoa:editar-papel (aprovação do planejamento, US-0039, 24/11/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'pessoa:editar-papel'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Pedidos de aprovação ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_planning_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'returned', 'cancelled')),
  requested_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  -- Resultado planejado e orçado no momento do pedido: se o planejado mudar, o pedido cai.
  planned_result numeric(14,2) NOT NULL,
  budgeted_result numeric(14,2) NOT NULL,
  decided_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  decided_at timestamptz,
  return_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Devolver ao GP exige o motivo (decisão do Victor, 23/11/2026).
  CONSTRAINT project_planning_approvals_return_reason
    CHECK (status <> 'returned' OR length(btrim(coalesce(return_reason, ''))) > 0)
);

COMMENT ON TABLE public.project_planning_approvals IS
  'Pedido de aprovação do planejamento abaixo do orçado (US-0039). Um aberto por projeto.';

-- No máximo um pedido aberto por projeto.
CREATE UNIQUE INDEX IF NOT EXISTS project_planning_approvals_one_open
  ON public.project_planning_approvals (project_id)
  WHERE status = 'requested';

CREATE INDEX IF NOT EXISTS project_planning_approvals_project
  ON public.project_planning_approvals (project_id, requested_at DESC);

-- ── 3. Quem muda o quê ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.guard_project_planning_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'requested' THEN
      RAISE EXCEPTION 'O pedido de aprovação nasce aberto.' USING ERRCODE = 'PU001';
    END IF;
    NEW.requested_by := coalesce(public.employee_id_for(auth.uid(), NEW.tenant_id), NEW.requested_by);
    NEW.requested_at := now();
    NEW.decided_by := NULL;
    NEW.decided_at := NULL;
    RETURN NEW;
  END IF;

  -- O que foi pedido não muda: só o estado, quem decidiu e o motivo.
  NEW.tenant_id := OLD.tenant_id;
  NEW.project_id := OLD.project_id;
  NEW.requested_by := OLD.requested_by;
  NEW.requested_at := OLD.requested_at;
  NEW.planned_result := OLD.planned_result;
  NEW.budgeted_result := OLD.budgeted_result;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status <> 'requested' THEN
    RAISE EXCEPTION 'Este pedido já foi decidido. Recarregue o projeto.' USING ERRCODE = 'PU001';
  END IF;

  IF NEW.status IN ('approved', 'returned')
     AND NOT public.has_capability(auth.uid(), OLD.tenant_id, 'planejamento:aprovar-abaixo-do-orcado') THEN
    RAISE EXCEPTION 'Só o admin aprova ou devolve o planejamento abaixo do orçado.' USING ERRCODE = 'PU001';
  END IF;

  NEW.decided_by := public.employee_id_for(auth.uid(), OLD.tenant_id);
  NEW.decided_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_project_planning_approval ON public.project_planning_approvals;
CREATE TRIGGER guard_project_planning_approval
  BEFORE INSERT OR UPDATE ON public.project_planning_approvals
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_planning_approval();

-- ── 4. RLS ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_planning_approvals ENABLE ROW LEVEL SECURITY;

-- O pedido carrega resultado e margem: lê quem lê o financeiro dos projetos.
CREATE POLICY "Financial readers can view planning approvals"
  ON public.project_planning_approvals FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'financeiro:ler'));

-- Pede quem edita o projeto (GP do projeto ou quem gere qualquer projeto).
CREATE POLICY "Project editors can request planning approval"
  ON public.project_planning_approvals FOR INSERT TO authenticated
  WITH CHECK (
    public.has_capability(auth.uid(), tenant_id, 'projeto:editar')
    AND public.can_manage_project(auth.uid(), project_id)
    AND public.project_child_tenant_matches(project_id, tenant_id)
  );

-- Cancela quem edita o projeto; aprova ou devolve quem tem a capacidade (o gatilho separa).
CREATE POLICY "Project editors and approvers can update planning approvals"
  ON public.project_planning_approvals FOR UPDATE TO authenticated
  USING (
    public.has_capability(auth.uid(), tenant_id, 'planejamento:aprovar-abaixo-do-orcado')
    OR (
      public.has_capability(auth.uid(), tenant_id, 'projeto:editar')
      AND public.can_manage_project(auth.uid(), project_id)
    )
  )
  WITH CHECK (
    public.has_capability(auth.uid(), tenant_id, 'planejamento:aprovar-abaixo-do-orcado')
    OR (
      public.has_capability(auth.uid(), tenant_id, 'projeto:editar')
      AND public.can_manage_project(auth.uid(), project_id)
    )
  );

-- Sem DELETE: o histórico de pedidos fica.
