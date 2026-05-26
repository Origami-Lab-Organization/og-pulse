DROP TABLE IF EXISTS public.project_roles CASCADE;

CREATE TABLE IF NOT EXISTS public.project_role_allocations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id        uuid NOT NULL,
  employee_id      uuid NOT NULL REFERENCES public.employees(id),
  budget_role_id   uuid REFERENCES public.budget_roles(id),
  custom_role_name text,
  year             int NOT NULL,
  month            int NOT NULL CHECK (month BETWEEN 1 AND 12),
  planned_hours    numeric(6,1) DEFAULT 0 CHECK (planned_hours >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_role_allocations_unique_month
    UNIQUE (employee_id, project_id, year, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_role_allocations TO authenticated;
GRANT ALL ON public.project_role_allocations TO service_role;

ALTER TABLE public.project_role_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view project_role_allocations" ON public.project_role_allocations;
CREATE POLICY "Tenant members can view project_role_allocations"
ON public.project_role_allocations FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can insert project_role_allocations" ON public.project_role_allocations;
CREATE POLICY "Tenant members can insert project_role_allocations"
ON public.project_role_allocations FOR INSERT TO authenticated
WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can update project_role_allocations" ON public.project_role_allocations;
CREATE POLICY "Tenant members can update project_role_allocations"
ON public.project_role_allocations FOR UPDATE TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Tenant members can delete project_role_allocations" ON public.project_role_allocations;
CREATE POLICY "Tenant members can delete project_role_allocations"
ON public.project_role_allocations FOR DELETE TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_pra_project  ON public.project_role_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_pra_employee ON public.project_role_allocations(employee_id);
CREATE INDEX IF NOT EXISTS idx_pra_tenant   ON public.project_role_allocations(tenant_id);

DROP TRIGGER IF EXISTS update_project_role_allocations_updated_at ON public.project_role_allocations;
CREATE TRIGGER update_project_role_allocations_updated_at
BEFORE UPDATE ON public.project_role_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();