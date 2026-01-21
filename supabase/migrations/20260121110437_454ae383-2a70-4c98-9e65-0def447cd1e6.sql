-- Create employee_tools table for tracking tools/subscriptions per employee
CREATE TABLE public.employee_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_tools ENABLE ROW LEVEL SECURITY;

-- RLS Policies - inherit from employee's tenant
CREATE POLICY "Users can view tools for employees in their tenant"
ON public.employee_tools
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_tools.employee_id
    AND user_belongs_to_tenant(auth.uid(), e.tenant_id)
  )
);

CREATE POLICY "Admins can insert employee tools"
ON public.employee_tools
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_tools.employee_id
    AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
  )
);

CREATE POLICY "Admins can update employee tools"
ON public.employee_tools
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_tools.employee_id
    AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
  )
);

CREATE POLICY "Admins can delete employee tools"
ON public.employee_tools
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = employee_tools.employee_id
    AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_tools_updated_at
BEFORE UPDATE ON public.employee_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();