
DROP POLICY IF EXISTS "Tenant members can view project_member_months" ON public.project_member_months;
CREATE POLICY "Tenant members can view project_member_months"
  ON public.project_member_months FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE pm.id = project_member_months.project_member_id
        AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
    )
  );
