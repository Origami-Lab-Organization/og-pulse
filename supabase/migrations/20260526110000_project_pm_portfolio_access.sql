-- Seguindo .harness/patterns/security.md e OWASP A01:
-- leitura do portfolio e por tenant, mas escrita em projeto passa a ser por recurso.

CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    LEFT JOIN public.employees manager
      ON manager.id = p.manager_id
      AND manager.tenant_id = p.tenant_id
    WHERE p.id = _project_id
      AND (
        public.has_role(_user_id, p.tenant_id, 'admin')
        OR manager.auth_id = _user_id
      )
  );
$$;

COMMENT ON FUNCTION public.can_manage_project(uuid, uuid)
IS 'Security definer helper for RLS: allows admins or the employee assigned as projects.manager_id to write project-scoped resources.';

CREATE OR REPLACE FUNCTION public.project_child_tenant_matches(_project_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.tenant_id = _tenant_id
  );
$$;

COMMENT ON FUNCTION public.project_child_tenant_matches(uuid, uuid)
IS 'Security definer helper for RLS WITH CHECK clauses on project child tables.';

DROP POLICY IF EXISTS "Users can view projects in their tenant" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins and managers can delete projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_tenant" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_admin_manager" ON public.projects;
DROP POLICY IF EXISTS "projects_update_admin_or_pm" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_admin" ON public.projects;

CREATE POLICY "projects_select_tenant"
ON public.projects FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "projects_insert_admin_manager"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "projects_update_admin_or_pm"
ON public.projects FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), id))
WITH CHECK (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND public.can_manage_project(auth.uid(), id)
);

CREATE POLICY "projects_delete_admin"
ON public.projects FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'));

-- Core planning/financial child tables.
DROP POLICY IF EXISTS "Admins and managers can insert project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins and managers can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins and managers can delete project members" ON public.project_members;
DROP POLICY IF EXISTS "project_members_insert_admin_or_pm" ON public.project_members;
DROP POLICY IF EXISTS "project_members_update_admin_or_pm" ON public.project_members;
DROP POLICY IF EXISTS "project_members_delete_admin_or_pm" ON public.project_members;

CREATE POLICY "project_members_insert_admin_or_pm"
ON public.project_members FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_members_update_admin_or_pm"
ON public.project_members FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_members_delete_admin_or_pm"
ON public.project_members FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project installments" ON public.project_installments;
DROP POLICY IF EXISTS "Admins and managers can update project installments" ON public.project_installments;
DROP POLICY IF EXISTS "Admins and managers can delete project installments" ON public.project_installments;
DROP POLICY IF EXISTS "project_installments_insert_admin_or_pm" ON public.project_installments;
DROP POLICY IF EXISTS "project_installments_update_admin_or_pm" ON public.project_installments;
DROP POLICY IF EXISTS "project_installments_delete_admin_or_pm" ON public.project_installments;

CREATE POLICY "project_installments_insert_admin_or_pm"
ON public.project_installments FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_installments_update_admin_or_pm"
ON public.project_installments FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_installments_delete_admin_or_pm"
ON public.project_installments FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project suppliers" ON public.project_suppliers;
DROP POLICY IF EXISTS "Admins and managers can update project suppliers" ON public.project_suppliers;
DROP POLICY IF EXISTS "Admins and managers can delete project suppliers" ON public.project_suppliers;
DROP POLICY IF EXISTS "project_suppliers_insert_admin_or_pm" ON public.project_suppliers;
DROP POLICY IF EXISTS "project_suppliers_update_admin_or_pm" ON public.project_suppliers;
DROP POLICY IF EXISTS "project_suppliers_delete_admin_or_pm" ON public.project_suppliers;

CREATE POLICY "project_suppliers_insert_admin_or_pm"
ON public.project_suppliers FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_suppliers_update_admin_or_pm"
ON public.project_suppliers FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_suppliers_delete_admin_or_pm"
ON public.project_suppliers FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project materials" ON public.project_materials;
DROP POLICY IF EXISTS "Admins and managers can update project materials" ON public.project_materials;
DROP POLICY IF EXISTS "Admins and managers can delete project materials" ON public.project_materials;
DROP POLICY IF EXISTS "project_materials_insert_admin_or_pm" ON public.project_materials;
DROP POLICY IF EXISTS "project_materials_update_admin_or_pm" ON public.project_materials;
DROP POLICY IF EXISTS "project_materials_delete_admin_or_pm" ON public.project_materials;

CREATE POLICY "project_materials_insert_admin_or_pm"
ON public.project_materials FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_materials_update_admin_or_pm"
ON public.project_materials FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_materials_delete_admin_or_pm"
ON public.project_materials FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

-- Detail tabs: OKRs, stakeholders and milestones.
DROP POLICY IF EXISTS "Admins and managers can insert project okrs" ON public.project_okrs;
DROP POLICY IF EXISTS "Admins and managers can update project okrs" ON public.project_okrs;
DROP POLICY IF EXISTS "Admins and managers can delete project okrs" ON public.project_okrs;
DROP POLICY IF EXISTS "project_okrs_insert_admin_or_pm" ON public.project_okrs;
DROP POLICY IF EXISTS "project_okrs_update_admin_or_pm" ON public.project_okrs;
DROP POLICY IF EXISTS "project_okrs_delete_admin_or_pm" ON public.project_okrs;

CREATE POLICY "project_okrs_insert_admin_or_pm"
ON public.project_okrs FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_okrs_update_admin_or_pm"
ON public.project_okrs FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_okrs_delete_admin_or_pm"
ON public.project_okrs FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project key results" ON public.project_key_results;
DROP POLICY IF EXISTS "Admins and managers can update project key results" ON public.project_key_results;
DROP POLICY IF EXISTS "Admins and managers can delete project key results" ON public.project_key_results;
DROP POLICY IF EXISTS "project_key_results_insert_admin_or_pm" ON public.project_key_results;
DROP POLICY IF EXISTS "project_key_results_update_admin_or_pm" ON public.project_key_results;
DROP POLICY IF EXISTS "project_key_results_delete_admin_or_pm" ON public.project_key_results;

CREATE POLICY "project_key_results_insert_admin_or_pm"
ON public.project_key_results FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_okrs o
    WHERE o.id = project_key_results.okr_id
      AND public.can_manage_project(auth.uid(), o.project_id)
  )
);

CREATE POLICY "project_key_results_update_admin_or_pm"
ON public.project_key_results FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_okrs o
    WHERE o.id = project_key_results.okr_id
      AND public.can_manage_project(auth.uid(), o.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_okrs o
    WHERE o.id = project_key_results.okr_id
      AND public.can_manage_project(auth.uid(), o.project_id)
  )
);

CREATE POLICY "project_key_results_delete_admin_or_pm"
ON public.project_key_results FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_okrs o
    WHERE o.id = project_key_results.okr_id
      AND public.can_manage_project(auth.uid(), o.project_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
DROP POLICY IF EXISTS "project_stakeholders_insert_admin_or_pm" ON public.project_stakeholders;
DROP POLICY IF EXISTS "project_stakeholders_update_admin_or_pm" ON public.project_stakeholders;
DROP POLICY IF EXISTS "project_stakeholders_delete_admin_or_pm" ON public.project_stakeholders;

CREATE POLICY "project_stakeholders_insert_admin_or_pm"
ON public.project_stakeholders FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_stakeholders_update_admin_or_pm"
ON public.project_stakeholders FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_stakeholders_delete_admin_or_pm"
ON public.project_stakeholders FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Admins and managers can update project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "Admins and managers can delete project milestones" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_insert" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_update" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_delete" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_insert_admin_or_pm" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_update_admin_or_pm" ON public.project_milestones;
DROP POLICY IF EXISTS "project_milestones_delete_admin_or_pm" ON public.project_milestones;

CREATE POLICY "project_milestones_insert_admin_or_pm"
ON public.project_milestones FOR INSERT TO authenticated
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_milestones_update_admin_or_pm"
ON public.project_milestones FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (public.can_manage_project(auth.uid(), project_id));

CREATE POLICY "project_milestones_delete_admin_or_pm"
ON public.project_milestones FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

-- Newer planning tables with tenant_id.
DROP POLICY IF EXISTS "Tenant members can insert project_roles" ON public.project_roles;
DROP POLICY IF EXISTS "Tenant members can update project_roles" ON public.project_roles;
DROP POLICY IF EXISTS "Tenant members can delete project_roles" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_insert_admin_or_pm" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_update_admin_or_pm" ON public.project_roles;
DROP POLICY IF EXISTS "project_roles_delete_admin_or_pm" ON public.project_roles;

CREATE POLICY "project_roles_insert_admin_or_pm"
ON public.project_roles FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_roles_update_admin_or_pm"
ON public.project_roles FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_roles_delete_admin_or_pm"
ON public.project_roles FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Tenant members can insert project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can update project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "Tenant members can delete project_role_allocations" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_insert_admin_or_pm" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_update_admin_or_pm" ON public.project_role_allocations;
DROP POLICY IF EXISTS "project_role_allocations_delete_admin_or_pm" ON public.project_role_allocations;

CREATE POLICY "project_role_allocations_insert_admin_or_pm"
ON public.project_role_allocations FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_role_allocations_update_admin_or_pm"
ON public.project_role_allocations FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_role_allocations_delete_admin_or_pm"
ON public.project_role_allocations FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

-- Activity board resources from the project detail.
DROP POLICY IF EXISTS "Users can create activity cards in their tenant" ON public.project_activity_cards;
DROP POLICY IF EXISTS "Users can update activity cards in their tenant" ON public.project_activity_cards;
DROP POLICY IF EXISTS "Users can delete activity cards in their tenant" ON public.project_activity_cards;
DROP POLICY IF EXISTS "project_activity_cards_insert_admin_or_pm" ON public.project_activity_cards;
DROP POLICY IF EXISTS "project_activity_cards_update_admin_or_pm" ON public.project_activity_cards;
DROP POLICY IF EXISTS "project_activity_cards_delete_admin_or_pm" ON public.project_activity_cards;

CREATE POLICY "project_activity_cards_insert_admin_or_pm"
ON public.project_activity_cards FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_cards_update_admin_or_pm"
ON public.project_activity_cards FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_cards_delete_admin_or_pm"
ON public.project_activity_cards FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "tenant isolation" ON public.project_activity_sprints;
DROP POLICY IF EXISTS "project_activity_sprints_select_tenant" ON public.project_activity_sprints;
DROP POLICY IF EXISTS "project_activity_sprints_insert_admin_or_pm" ON public.project_activity_sprints;
DROP POLICY IF EXISTS "project_activity_sprints_update_admin_or_pm" ON public.project_activity_sprints;
DROP POLICY IF EXISTS "project_activity_sprints_delete_admin_or_pm" ON public.project_activity_sprints;

CREATE POLICY "project_activity_sprints_select_tenant"
ON public.project_activity_sprints FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_activity_sprints_insert_admin_or_pm"
ON public.project_activity_sprints FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_sprints_update_admin_or_pm"
ON public.project_activity_sprints FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_sprints_delete_admin_or_pm"
ON public.project_activity_sprints FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "tenant isolation" ON public.project_activity_settings;
DROP POLICY IF EXISTS "project_activity_settings_select_tenant" ON public.project_activity_settings;
DROP POLICY IF EXISTS "project_activity_settings_insert_admin_or_pm" ON public.project_activity_settings;
DROP POLICY IF EXISTS "project_activity_settings_update_admin_or_pm" ON public.project_activity_settings;
DROP POLICY IF EXISTS "project_activity_settings_delete_admin_or_pm" ON public.project_activity_settings;

CREATE POLICY "project_activity_settings_select_tenant"
ON public.project_activity_settings FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_activity_settings_insert_admin_or_pm"
ON public.project_activity_settings FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_settings_update_admin_or_pm"
ON public.project_activity_settings FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_settings_delete_admin_or_pm"
ON public.project_activity_settings FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Tenant members can insert releases" ON public.project_activity_releases;
DROP POLICY IF EXISTS "Tenant members can update releases" ON public.project_activity_releases;
DROP POLICY IF EXISTS "Tenant members can delete releases" ON public.project_activity_releases;
DROP POLICY IF EXISTS "project_activity_releases_insert_admin_or_pm" ON public.project_activity_releases;
DROP POLICY IF EXISTS "project_activity_releases_update_admin_or_pm" ON public.project_activity_releases;
DROP POLICY IF EXISTS "project_activity_releases_delete_admin_or_pm" ON public.project_activity_releases;

CREATE POLICY "project_activity_releases_insert_admin_or_pm"
ON public.project_activity_releases FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_releases_update_admin_or_pm"
ON public.project_activity_releases FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_releases_delete_admin_or_pm"
ON public.project_activity_releases FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Tenant members can manage release_sprints via release" ON public.project_activity_release_sprints;
DROP POLICY IF EXISTS "project_activity_release_sprints_select_tenant" ON public.project_activity_release_sprints;
DROP POLICY IF EXISTS "project_activity_release_sprints_insert_admin_or_pm" ON public.project_activity_release_sprints;
DROP POLICY IF EXISTS "project_activity_release_sprints_update_admin_or_pm" ON public.project_activity_release_sprints;
DROP POLICY IF EXISTS "project_activity_release_sprints_delete_admin_or_pm" ON public.project_activity_release_sprints;

CREATE POLICY "project_activity_release_sprints_select_tenant"
ON public.project_activity_release_sprints FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_releases r
    WHERE r.id = project_activity_release_sprints.release_id
      AND public.user_belongs_to_tenant(auth.uid(), r.tenant_id)
  )
);

CREATE POLICY "project_activity_release_sprints_insert_admin_or_pm"
ON public.project_activity_release_sprints FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_activity_releases r
    JOIN public.project_activity_sprints s ON s.id = project_activity_release_sprints.sprint_id
    WHERE r.id = project_activity_release_sprints.release_id
      AND s.project_id = r.project_id
      AND public.can_manage_project(auth.uid(), r.project_id)
  )
);

CREATE POLICY "project_activity_release_sprints_update_admin_or_pm"
ON public.project_activity_release_sprints FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_releases r
    WHERE r.id = project_activity_release_sprints.release_id
      AND public.can_manage_project(auth.uid(), r.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_activity_releases r
    JOIN public.project_activity_sprints s ON s.id = project_activity_release_sprints.sprint_id
    WHERE r.id = project_activity_release_sprints.release_id
      AND s.project_id = r.project_id
      AND public.can_manage_project(auth.uid(), r.project_id)
  )
);

CREATE POLICY "project_activity_release_sprints_delete_admin_or_pm"
ON public.project_activity_release_sprints FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_releases r
    WHERE r.id = project_activity_release_sprints.release_id
      AND public.can_manage_project(auth.uid(), r.project_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can insert project commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "Admins and managers can update project commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "Admins and managers can delete project commissions" ON public.project_commissions;
DROP POLICY IF EXISTS "project_commissions_insert_admin_or_pm" ON public.project_commissions;
DROP POLICY IF EXISTS "project_commissions_update_admin_or_pm" ON public.project_commissions;
DROP POLICY IF EXISTS "project_commissions_delete_admin_or_pm" ON public.project_commissions;

CREATE POLICY "project_commissions_insert_admin_or_pm"
ON public.project_commissions FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1 FROM public.project_installments i
    WHERE i.id = project_commissions.installment_id
      AND i.project_id = project_commissions.project_id
  )
);

CREATE POLICY "project_commissions_update_admin_or_pm"
ON public.project_commissions FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND EXISTS (
    SELECT 1 FROM public.project_installments i
    WHERE i.id = project_commissions.installment_id
      AND i.project_id = project_commissions.project_id
  )
);

CREATE POLICY "project_commissions_delete_admin_or_pm"
ON public.project_commissions FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Admins and managers can insert project member months" ON public.project_member_months;
DROP POLICY IF EXISTS "Admins and managers can update project member months" ON public.project_member_months;
DROP POLICY IF EXISTS "Admins and managers can delete project member months" ON public.project_member_months;
DROP POLICY IF EXISTS "project_member_months_insert_admin_or_pm" ON public.project_member_months;
DROP POLICY IF EXISTS "project_member_months_update_admin_or_pm" ON public.project_member_months;
DROP POLICY IF EXISTS "project_member_months_delete_admin_or_pm" ON public.project_member_months;

CREATE POLICY "project_member_months_insert_admin_or_pm"
ON public.project_member_months FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.id = project_member_months.project_member_id
      AND public.can_manage_project(auth.uid(), pm.project_id)
  )
);

CREATE POLICY "project_member_months_update_admin_or_pm"
ON public.project_member_months FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.id = project_member_months.project_member_id
      AND public.can_manage_project(auth.uid(), pm.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.id = project_member_months.project_member_id
      AND public.can_manage_project(auth.uid(), pm.project_id)
  )
);

CREATE POLICY "project_member_months_delete_admin_or_pm"
ON public.project_member_months FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.id = project_member_months.project_member_id
      AND public.can_manage_project(auth.uid(), pm.project_id)
  )
);

DROP POLICY IF EXISTS "Admins and managers can insert project supplier months" ON public.project_supplier_months;
DROP POLICY IF EXISTS "Admins and managers can update project supplier months" ON public.project_supplier_months;
DROP POLICY IF EXISTS "Admins and managers can delete project supplier months" ON public.project_supplier_months;
DROP POLICY IF EXISTS "project_supplier_months_insert_admin_or_pm" ON public.project_supplier_months;
DROP POLICY IF EXISTS "project_supplier_months_update_admin_or_pm" ON public.project_supplier_months;
DROP POLICY IF EXISTS "project_supplier_months_delete_admin_or_pm" ON public.project_supplier_months;

CREATE POLICY "project_supplier_months_insert_admin_or_pm"
ON public.project_supplier_months FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    WHERE ps.id = project_supplier_months.project_supplier_id
      AND public.can_manage_project(auth.uid(), ps.project_id)
  )
);

CREATE POLICY "project_supplier_months_update_admin_or_pm"
ON public.project_supplier_months FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    WHERE ps.id = project_supplier_months.project_supplier_id
      AND public.can_manage_project(auth.uid(), ps.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    WHERE ps.id = project_supplier_months.project_supplier_id
      AND public.can_manage_project(auth.uid(), ps.project_id)
  )
);

CREATE POLICY "project_supplier_months_delete_admin_or_pm"
ON public.project_supplier_months FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_suppliers ps
    WHERE ps.id = project_supplier_months.project_supplier_id
      AND public.can_manage_project(auth.uid(), ps.project_id)
  )
);

DROP POLICY IF EXISTS "tenant_isolation_tags" ON public.project_activity_tags;
DROP POLICY IF EXISTS "project_activity_tags_select_tenant" ON public.project_activity_tags;
DROP POLICY IF EXISTS "project_activity_tags_insert_admin_or_pm" ON public.project_activity_tags;
DROP POLICY IF EXISTS "project_activity_tags_update_admin_or_pm" ON public.project_activity_tags;
DROP POLICY IF EXISTS "project_activity_tags_delete_admin_or_pm" ON public.project_activity_tags;

CREATE POLICY "project_activity_tags_select_tenant"
ON public.project_activity_tags FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_activity_tags_insert_admin_or_pm"
ON public.project_activity_tags FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_tags_update_admin_or_pm"
ON public.project_activity_tags FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_tags_delete_admin_or_pm"
ON public.project_activity_tags FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "tenant_isolation_card_tags" ON public.project_activity_card_tags;
DROP POLICY IF EXISTS "project_activity_card_tags_select_tenant" ON public.project_activity_card_tags;
DROP POLICY IF EXISTS "project_activity_card_tags_insert_admin_or_pm" ON public.project_activity_card_tags;
DROP POLICY IF EXISTS "project_activity_card_tags_delete_admin_or_pm" ON public.project_activity_card_tags;

CREATE POLICY "project_activity_card_tags_select_tenant"
ON public.project_activity_card_tags FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_tags.card_id
      AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

CREATE POLICY "project_activity_card_tags_insert_admin_or_pm"
ON public.project_activity_card_tags FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.project_activity_cards c
    JOIN public.project_activity_tags t ON t.id = project_activity_card_tags.tag_id
    WHERE c.id = project_activity_card_tags.card_id
      AND t.project_id = c.project_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
);

CREATE POLICY "project_activity_card_tags_delete_admin_or_pm"
ON public.project_activity_card_tags FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_tags.card_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
);

DROP POLICY IF EXISTS "tenant isolation" ON public.project_activity_checklist_templates;
DROP POLICY IF EXISTS "project_activity_checklist_templates_select_tenant" ON public.project_activity_checklist_templates;
DROP POLICY IF EXISTS "project_activity_checklist_templates_insert_admin_or_pm" ON public.project_activity_checklist_templates;
DROP POLICY IF EXISTS "project_activity_checklist_templates_update_admin_or_pm" ON public.project_activity_checklist_templates;
DROP POLICY IF EXISTS "project_activity_checklist_templates_delete_admin_or_pm" ON public.project_activity_checklist_templates;

CREATE POLICY "project_activity_checklist_templates_select_tenant"
ON public.project_activity_checklist_templates FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "project_activity_checklist_templates_insert_admin_or_pm"
ON public.project_activity_checklist_templates FOR INSERT TO authenticated
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_checklist_templates_update_admin_or_pm"
ON public.project_activity_checklist_templates FOR UPDATE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id))
WITH CHECK (
  public.can_manage_project(auth.uid(), project_id)
  AND public.project_child_tenant_matches(project_id, tenant_id)
);

CREATE POLICY "project_activity_checklist_templates_delete_admin_or_pm"
ON public.project_activity_checklist_templates FOR DELETE TO authenticated
USING (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "tenant isolation" ON public.project_activity_card_checklist;
DROP POLICY IF EXISTS "project_activity_card_checklist_select_tenant" ON public.project_activity_card_checklist;
DROP POLICY IF EXISTS "project_activity_card_checklist_insert_admin_or_pm" ON public.project_activity_card_checklist;
DROP POLICY IF EXISTS "project_activity_card_checklist_update_admin_or_pm" ON public.project_activity_card_checklist;
DROP POLICY IF EXISTS "project_activity_card_checklist_delete_admin_or_pm" ON public.project_activity_card_checklist;

CREATE POLICY "project_activity_card_checklist_select_tenant"
ON public.project_activity_card_checklist FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_checklist.card_id
      AND public.user_belongs_to_tenant(auth.uid(), c.tenant_id)
  )
);

CREATE POLICY "project_activity_card_checklist_insert_admin_or_pm"
ON public.project_activity_card_checklist FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_checklist.card_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
);

CREATE POLICY "project_activity_card_checklist_update_admin_or_pm"
ON public.project_activity_card_checklist FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_checklist.card_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_checklist.card_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
);

CREATE POLICY "project_activity_card_checklist_delete_admin_or_pm"
ON public.project_activity_card_checklist FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.project_activity_cards c
    WHERE c.id = project_activity_card_checklist.card_id
      AND public.can_manage_project(auth.uid(), c.project_id)
  )
);
