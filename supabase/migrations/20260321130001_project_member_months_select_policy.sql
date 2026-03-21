-- Allow all tenant members to read project_member_months for projects they belong to.
-- This is required for the "Meus Projetos" allocation tab to show hours data.
-- RLS was already enabled on this table but no SELECT policy existed.

CREATE POLICY "Tenant members can view project_member_months"
  ON public.project_member_months
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_member_months.project_id
        AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
    )
  );
