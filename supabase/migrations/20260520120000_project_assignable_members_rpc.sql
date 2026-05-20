-- RPC: get_project_assignable_members
-- Returns the union of project_members (with employee_id set) and the project
-- manager for a given project, used by the activity board to populate
-- "Responsável" dropdowns/filters.
--
-- Why SECURITY DEFINER:
--   The activity board needs to render assignee names for everyone allocated
--   to the project. Regular employees can already see project_members rows
--   (RLS on project_members allows tenant members), but the embedded
--   employees(id, nome, ...) join is filtered by RLS on employees and the
--   existing co-member policy (user_shares_project_with_employee) silently
--   hides co-members for some users (e.g. the project manager when not in
--   project_members), producing the bug where only the current user shows up
--   in the dropdown.
--
-- Safety:
--   - Verifies the caller belongs to the project's tenant.
--   - Returns only low-sensitivity identity fields (no costs / salary).

CREATE OR REPLACE FUNCTION public.get_project_assignable_members(p_project_id uuid)
RETURNS TABLE (
  employee_id uuid,
  nome        text,
  cargo       text,
  foto_url    text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH project_info AS (
    SELECT id, tenant_id, manager_id
    FROM public.projects
    WHERE id = p_project_id
      AND public.user_belongs_to_tenant(auth.uid(), tenant_id)
  ),
  member_ids AS (
    SELECT pm.employee_id
    FROM public.project_members pm
    JOIN project_info pi ON pi.id = pm.project_id
    WHERE pm.employee_id IS NOT NULL
    UNION
    SELECT pi.manager_id
    FROM project_info pi
    WHERE pi.manager_id IS NOT NULL
  )
  SELECT
    e.id        AS employee_id,
    e.nome      AS nome,
    e.cargo     AS cargo,
    e.foto_url  AS foto_url
  FROM member_ids m
  JOIN public.employees e ON e.id = m.employee_id
  ORDER BY e.nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_assignable_members(uuid) TO authenticated;
