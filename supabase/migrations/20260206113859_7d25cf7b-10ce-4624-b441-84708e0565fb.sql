-- Create table for per-project timesheet submissions
CREATE TABLE public.project_timesheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  total_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, week_start)
);

-- Enable RLS
ALTER TABLE public.project_timesheet_submissions ENABLE ROW LEVEL SECURITY;

-- Create function to get tenant_id from project
CREATE OR REPLACE FUNCTION public.get_project_tenant_id(_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.projects
  WHERE id = _project_id
  LIMIT 1
$$;

-- RLS Policies
-- Users can view submissions for projects in their tenant
CREATE POLICY "Users can view project submissions in their tenant"
ON public.project_timesheet_submissions
FOR SELECT
USING (
  public.user_belongs_to_tenant(auth.uid(), public.get_project_tenant_id(project_id))
);

-- Admins and managers can insert submissions
CREATE POLICY "Admins and managers can insert project submissions"
ON public.project_timesheet_submissions
FOR INSERT
WITH CHECK (
  public.is_admin_or_manager(auth.uid(), public.get_project_tenant_id(project_id))
);

-- Admins and managers can update submissions
CREATE POLICY "Admins and managers can update project submissions"
ON public.project_timesheet_submissions
FOR UPDATE
USING (
  public.is_admin_or_manager(auth.uid(), public.get_project_tenant_id(project_id))
);

-- Only admins can delete submissions
CREATE POLICY "Admins can delete project submissions"
ON public.project_timesheet_submissions
FOR DELETE
USING (
  public.has_role(auth.uid(), public.get_project_tenant_id(project_id), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_project_timesheet_submissions_updated_at
BEFORE UPDATE ON public.project_timesheet_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();