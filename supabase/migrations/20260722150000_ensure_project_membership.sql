-- ─────────────────────────────────────────────────────────────────────────────
-- Vínculo pessoa↔projeto para o timesheet (sincronização §5.3)
--
-- Problema: a alocação (aba Equipe / Tela de Alocação) grava só em
-- project_role_allocations. O timesheet lista projetos lançáveis a partir de
-- project_members, e o lançamento em project_timesheets exige project_member_id.
-- Um projeto alocado pelo modelo novo, sem linha em project_members, não aparece
-- para lançar — e o funcionário NÃO pode criar project_members (RLS admin/GP).
--
-- Solução: RPC SECURITY DEFINER que materializa (idempotente) o vínculo em
-- project_members a partir de uma alocação existente, para o timesheet ter um
-- project_member_id contra o qual lançar. Só materializa se:
--   (a) existe alocação (project_role_allocations) para o par projeto/pessoa; E
--   (b) o solicitante é o próprio funcionário OU pode gerir o projeto.
-- O papel é derivado da alocação (papel orçado ou custom), com fallback.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_project_membership(
  p_project_id uuid,
  p_employee_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_role text;
  v_budget_role_id uuid;
BEGIN
  -- (a) só materializa vínculo que reflete uma alocação real
  IF NOT EXISTS (
    SELECT 1 FROM public.project_role_allocations pra
    WHERE pra.project_id = p_project_id AND pra.employee_id = p_employee_id
  ) THEN
    RAISE EXCEPTION 'Sem alocação para materializar vínculo';
  END IF;

  -- (b) só o próprio funcionário ou quem gere o projeto
  IF NOT (
    public.can_manage_project(auth.uid(), p_project_id)
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = p_employee_id AND e.auth_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para materializar este vínculo';
  END IF;

  SELECT id INTO v_id FROM public.project_members
  WHERE project_id = p_project_id AND employee_id = p_employee_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT
    COALESCE(br.role_name, pra.custom_role_name, 'Colaborador'),
    pra.budget_role_id
  INTO v_role, v_budget_role_id
  FROM public.project_role_allocations pra
  LEFT JOIN public.budget_roles br ON br.id = pra.budget_role_id
  WHERE pra.project_id = p_project_id AND pra.employee_id = p_employee_id
  ORDER BY pra.year DESC, pra.month DESC
  LIMIT 1;

  INSERT INTO public.project_members (project_id, employee_id, role, budget_role_id)
  VALUES (p_project_id, p_employee_id, COALESCE(v_role, 'Colaborador'), v_budget_role_id)
  ON CONFLICT (project_id, employee_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.project_members
    WHERE project_id = p_project_id AND employee_id = p_employee_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_project_membership(uuid, uuid) TO authenticated;
