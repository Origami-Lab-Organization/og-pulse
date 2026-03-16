
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id);

CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON public.projects(lead_id);

UPDATE public.projects p
SET lead_id = l.id
FROM public.leads l
WHERE p.budget_id IS NOT NULL
  AND p.budget_id = l.budget_id
  AND p.lead_id IS NULL;
