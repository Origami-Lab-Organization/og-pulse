-- Add system_role column to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS system_role text NOT NULL DEFAULT 'user';

-- Migrate existing data: is_gerente = true -> 'admin', false -> 'user'
UPDATE public.employees 
SET system_role = CASE WHEN is_gerente = true THEN 'admin' ELSE 'user' END
WHERE system_role = 'user';

-- Add check constraint for valid values
ALTER TABLE public.employees 
ADD CONSTRAINT employees_system_role_check 
CHECK (system_role IN ('admin', 'manager', 'user'));