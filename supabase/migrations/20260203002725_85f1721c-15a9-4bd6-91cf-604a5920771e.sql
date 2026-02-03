-- Add portfolio_stage column to projects table
ALTER TABLE public.projects 
ADD COLUMN portfolio_stage TEXT DEFAULT 'planning';

-- Update existing projects based on their current status
UPDATE public.projects 
SET portfolio_stage = CASE 
  WHEN status = 'planning' THEN 'planning'
  WHEN status = 'active' THEN 'value_delivery'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'planning'
END;