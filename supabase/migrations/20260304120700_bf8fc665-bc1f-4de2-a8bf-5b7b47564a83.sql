
-- Enums for termination tables
CREATE TYPE public.termination_type AS ENUM ('voluntary', 'involuntary', 'contract_end', 'internship_end', 'retirement', 'mutual_agreement');
CREATE TYPE public.termination_reason_category AS ENUM ('performance', 'restructuring', 'personal_request', 'contract_expiration', 'disciplinary', 'other');
CREATE TYPE public.termination_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.termination_document_type AS ENUM ('resignation_letter', 'termination_letter', 'mutual_agreement', 'trct', 'homologation', 'receipt', 'other');
CREATE TYPE public.payroll_adjustment_type AS ENUM ('salary_proportional', 'vacation', 'thirteenth_salary', 'fgts', 'fgts_fine', 'overtime', 'benefits_discount', 'advance_discount', 'other');

-- 1. employee_terminations
CREATE TABLE public.employee_terminations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  termination_date DATE NOT NULL,
  notification_date DATE,
  termination_type public.termination_type NOT NULL,
  reason TEXT,
  reason_category public.termination_reason_category NOT NULL DEFAULT 'other',
  notice_period_days INTEGER DEFAULT 0,
  notice_worked BOOLEAN DEFAULT false,
  final_payroll_adjustments JSONB,
  severance_package JSONB,
  exit_interview_completed BOOLEAN DEFAULT false,
  exit_interview_notes TEXT,
  status public.termination_status NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_terminations ENABLE ROW LEVEL SECURITY;

-- 2. termination_documents
CREATE TABLE public.termination_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termination_id UUID NOT NULL REFERENCES public.employee_terminations(id) ON DELETE CASCADE,
  document_name VARCHAR NOT NULL,
  document_type public.termination_document_type NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.termination_documents ENABLE ROW LEVEL SECURITY;

-- 3. payroll_adjustments
CREATE TABLE public.payroll_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  termination_id UUID NOT NULL REFERENCES public.employee_terminations(id) ON DELETE CASCADE,
  adjustment_type public.payroll_adjustment_type NOT NULL,
  description VARCHAR,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_credit BOOLEAN NOT NULL DEFAULT true,
  calculation_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- 4. Add termination_id to employees
ALTER TABLE public.employees ADD COLUMN termination_id UUID REFERENCES public.employee_terminations(id);

-- RLS policies for employee_terminations
CREATE POLICY "Admins can manage terminations" ON public.employee_terminations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_terminations.employee_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_terminations.employee_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)));

CREATE POLICY "Managers can view terminations" ON public.employee_terminations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_terminations.employee_id AND is_manager_in_tenant(auth.uid(), e.tenant_id)));

-- RLS policies for termination_documents
CREATE POLICY "Admins can manage termination documents" ON public.termination_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = termination_documents.termination_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = termination_documents.termination_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)));

CREATE POLICY "Managers can view termination documents" ON public.termination_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = termination_documents.termination_id AND is_manager_in_tenant(auth.uid(), e.tenant_id)));

-- RLS policies for payroll_adjustments
CREATE POLICY "Admins can manage payroll adjustments" ON public.payroll_adjustments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = payroll_adjustments.termination_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = payroll_adjustments.termination_id AND has_role(auth.uid(), e.tenant_id, 'admin'::app_role)));

CREATE POLICY "Managers can view payroll adjustments" ON public.payroll_adjustments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.employee_terminations et JOIN public.employees e ON e.id = et.employee_id WHERE et.id = payroll_adjustments.termination_id AND is_manager_in_tenant(auth.uid(), e.tenant_id)));

-- Trigger for updated_at on employee_terminations
CREATE TRIGGER update_employee_terminations_updated_at BEFORE UPDATE ON public.employee_terminations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
