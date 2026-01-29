-- Add status column to role_rates table
ALTER TABLE public.role_rates 
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Migrate existing data from is_active to status
UPDATE public.role_rates SET status = 'active' WHERE is_active = true;
UPDATE public.role_rates SET status = 'inactive' WHERE is_active = false;

-- Add check constraint to ensure valid status values
ALTER TABLE public.role_rates 
ADD CONSTRAINT role_rates_status_check 
CHECK (status IN ('active', 'inactive', 'archived'));