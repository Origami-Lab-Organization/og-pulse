-- Add is_continuous flag to projects table
ALTER TABLE public.projects
ADD COLUMN is_continuous BOOLEAN NOT NULL DEFAULT false;

-- Make end_date nullable for continuous projects
ALTER TABLE public.projects
ALTER COLUMN end_date DROP NOT NULL;