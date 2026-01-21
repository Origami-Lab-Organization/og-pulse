-- Add hours_per_month to project_members for cost calculation
ALTER TABLE public.project_members
ADD COLUMN hours_per_month NUMERIC NOT NULL DEFAULT 0;