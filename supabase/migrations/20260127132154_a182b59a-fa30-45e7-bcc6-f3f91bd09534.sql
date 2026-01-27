-- Update status constraint to allow 'aguardando_confirmacao'
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_status_check CHECK (status IN ('ativo', 'inativo', 'aguardando_confirmacao'));

-- Update existing employees that are pending first login to 'aguardando_confirmacao'
UPDATE public.employees 
SET status = 'aguardando_confirmacao' 
WHERE must_change_password = true AND status = 'ativo';