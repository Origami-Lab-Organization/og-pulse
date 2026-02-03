-- Add sponsorship_level column to project_stakeholders
ALTER TABLE public.project_stakeholders 
ADD COLUMN sponsorship_level TEXT;