
-- 1. Rename status to confidence_level on project_key_results
ALTER TABLE public.project_key_results 
  RENAME COLUMN status TO confidence_level;

ALTER TABLE public.project_key_results 
  ALTER COLUMN confidence_level SET DEFAULT 'medium';

-- Update existing values: pending->medium, in_progress->medium, completed->very_high
UPDATE public.project_key_results SET confidence_level = 'medium' WHERE confidence_level IN ('pending', 'in_progress');
UPDATE public.project_key_results SET confidence_level = 'very_high' WHERE confidence_level = 'completed';

-- 2. Create key_result_history table
CREATE TABLE public.key_result_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_result_id uuid NOT NULL REFERENCES public.project_key_results(id) ON DELETE CASCADE,
  current_value numeric,
  confidence_level text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

ALTER TABLE public.key_result_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view key result history in their tenant"
ON public.key_result_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM project_key_results kr
    JOIN project_okrs o ON o.id = kr.okr_id
    JOIN projects p ON p.id = o.project_id
    WHERE kr.id = key_result_history.key_result_id
      AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert key result history"
ON public.key_result_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM project_key_results kr
    JOIN project_okrs o ON o.id = kr.okr_id
    JOIN projects p ON p.id = o.project_id
    WHERE kr.id = key_result_history.key_result_id
      AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);

CREATE POLICY "Admins and managers can delete key result history"
ON public.key_result_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM project_key_results kr
    JOIN project_okrs o ON o.id = kr.okr_id
    JOIN projects p ON p.id = o.project_id
    WHERE kr.id = key_result_history.key_result_id
      AND is_admin_or_manager(auth.uid(), p.tenant_id)
  )
);
