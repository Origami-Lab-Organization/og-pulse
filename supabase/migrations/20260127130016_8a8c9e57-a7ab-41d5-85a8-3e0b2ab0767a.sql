-- Create employee_versions table for financial data versioning
CREATE TABLE public.employee_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE DEFAULT NULL,
  salario_mensal NUMERIC NOT NULL DEFAULT 0,
  salario_liquido NUMERIC NOT NULL DEFAULT 0,
  beneficios NUMERIC NOT NULL DEFAULT 0,
  encargos NUMERIC NOT NULL DEFAULT 0,
  fgts NUMERIC NOT NULL DEFAULT 0,
  inss_empresa NUMERIC NOT NULL DEFAULT 0,
  decimo_terceiro NUMERIC NOT NULL DEFAULT 0,
  ferias NUMERIC NOT NULL DEFAULT 0,
  pro_labore NUMERIC NOT NULL DEFAULT 0,
  jornada_mensal INTEGER NOT NULL DEFAULT 176,
  tipo_contratacao TEXT NOT NULL DEFAULT 'CLT',
  cargo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_employee_versions_employee_id ON public.employee_versions(employee_id);
CREATE INDEX idx_employee_versions_effective_dates ON public.employee_versions(employee_id, effective_from, effective_until);

-- Enable RLS
ALTER TABLE public.employee_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view employee versions in their tenant"
ON public.employee_versions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_versions.employee_id
  AND user_belongs_to_tenant(auth.uid(), e.tenant_id)
));

CREATE POLICY "Admins can insert employee versions"
ON public.employee_versions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_versions.employee_id
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

CREATE POLICY "Admins can update employee versions"
ON public.employee_versions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_versions.employee_id
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

CREATE POLICY "Admins can delete employee versions"
ON public.employee_versions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_versions.employee_id
  AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
));

-- Create initial versions for all existing employees
INSERT INTO public.employee_versions (
  employee_id,
  effective_from,
  salario_mensal,
  salario_liquido,
  beneficios,
  encargos,
  fgts,
  inss_empresa,
  decimo_terceiro,
  ferias,
  pro_labore,
  jornada_mensal,
  tipo_contratacao,
  cargo
)
SELECT 
  id,
  COALESCE(data_admissao, CURRENT_DATE),
  salario_mensal,
  salario_liquido,
  beneficios,
  encargos,
  fgts,
  inss_empresa,
  decimo_terceiro,
  ferias,
  pro_labore,
  jornada_mensal,
  tipo_contratacao,
  cargo
FROM public.employees;

-- Create a function to get employee version at a specific date
CREATE OR REPLACE FUNCTION public.get_employee_version_at_date(
  p_employee_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  version_id UUID,
  salario_mensal NUMERIC,
  salario_liquido NUMERIC,
  beneficios NUMERIC,
  encargos NUMERIC,
  fgts NUMERIC,
  inss_empresa NUMERIC,
  decimo_terceiro NUMERIC,
  ferias NUMERIC,
  pro_labore NUMERIC,
  jornada_mensal INTEGER,
  tipo_contratacao TEXT,
  cargo TEXT,
  effective_from DATE,
  effective_until DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ev.id,
    ev.salario_mensal,
    ev.salario_liquido,
    ev.beneficios,
    ev.encargos,
    ev.fgts,
    ev.inss_empresa,
    ev.decimo_terceiro,
    ev.ferias,
    ev.pro_labore,
    ev.jornada_mensal,
    ev.tipo_contratacao,
    ev.cargo,
    ev.effective_from,
    ev.effective_until
  FROM employee_versions ev
  WHERE ev.employee_id = p_employee_id
    AND ev.effective_from <= p_date
    AND (ev.effective_until IS NULL OR ev.effective_until > p_date)
  ORDER BY ev.effective_from DESC
  LIMIT 1;
END;
$$;