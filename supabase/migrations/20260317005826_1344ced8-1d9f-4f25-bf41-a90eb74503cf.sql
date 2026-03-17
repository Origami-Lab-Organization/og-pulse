-- Expand services_project_type_check to accept both old and new naming conventions
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_project_type_check;
ALTER TABLE public.services ADD CONSTRAINT services_project_type_check
  CHECK (project_type IN ('fixed_scope', 'continuous', 'recurring', 'success_fee', 'non_revenue', 'no_revenue'));

-- Normalize existing rows to use the new naming (billing_type values)
UPDATE public.services SET project_type = 'recurring'  WHERE project_type = 'continuous';
UPDATE public.services SET project_type = 'no_revenue' WHERE project_type = 'non_revenue';