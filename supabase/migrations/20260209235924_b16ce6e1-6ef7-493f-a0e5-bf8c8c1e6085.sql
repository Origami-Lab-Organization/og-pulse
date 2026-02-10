CREATE TABLE public.project_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  edited_by uuid NOT NULL,
  justification text NOT NULL,
  changes_summary text,
  edited_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_edit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert project edit logs"
  ON public.project_edit_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), get_project_tenant_id(project_id), 'admin'::app_role));

CREATE POLICY "Admins and managers can view project edit logs"
  ON public.project_edit_logs FOR SELECT
  USING (is_admin_or_manager(auth.uid(), get_project_tenant_id(project_id)));