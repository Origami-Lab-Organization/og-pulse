-- Add new columns to employees table
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS tipo_contratacao TEXT NOT NULL DEFAULT 'CLT',
  ADD COLUMN IF NOT EXISTS jornada_mensal INTEGER NOT NULL DEFAULT 176,
  ADD COLUMN IF NOT EXISTS salario_liquido NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fgts NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inss_empresa NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decimo_terceiro NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ferias NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_labore NUMERIC NOT NULL DEFAULT 0;

-- Update existing employees to have placeholder values for cpf and telefone if null
UPDATE public.employees SET cpf = '000.000.000-00' WHERE cpf IS NULL;
UPDATE public.employees SET telefone = '(00) 00000-0000' WHERE telefone IS NULL;

-- Make cpf and telefone required
ALTER TABLE public.employees 
  ALTER COLUMN cpf SET NOT NULL,
  ALTER COLUMN telefone SET NOT NULL;

-- Create employee_benefits table
CREATE TABLE public.employee_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on employee_benefits
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;

-- RLS policies for employee_benefits (similar to employee_tools)
CREATE POLICY "Users can view benefits for employees in their tenant" 
ON public.employee_benefits 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_benefits.employee_id 
  AND user_belongs_to_tenant(auth.uid(), e.tenant_id)
));

CREATE POLICY "Admins can insert employee benefits" 
ON public.employee_benefits 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_benefits.employee_id 
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

CREATE POLICY "Admins can update employee benefits" 
ON public.employee_benefits 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_benefits.employee_id 
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

CREATE POLICY "Admins can delete employee benefits" 
ON public.employee_benefits 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_benefits.employee_id 
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

-- Add trigger for updated_at
CREATE TRIGGER update_employee_benefits_updated_at
  BEFORE UPDATE ON public.employee_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();