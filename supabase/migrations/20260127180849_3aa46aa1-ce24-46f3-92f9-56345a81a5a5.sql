-- =============================================
-- Phase 1: Database Migration for Employee Cost System
-- =============================================

-- 1. Create payroll_profiles table for configurable payroll rates
CREATE TABLE public.payroll_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fgts_rate_clt numeric NOT NULL DEFAULT 0.08,
  fgts_rate_apprentice numeric NOT NULL DEFAULT 0.02,
  inss_patronal_rate numeric NOT NULL DEFAULT 0.20,
  rat_rate numeric NOT NULL DEFAULT 0.03,
  terceiros_rate numeric NOT NULL DEFAULT 0.058,
  outros_rate numeric NOT NULL DEFAULT 0,
  inss_patronal_prolabore_rate numeric NOT NULL DEFAULT 0.20,
  fgts_prolabore_rate numeric NOT NULL DEFAULT 0,
  apply_fgts_on_13th boolean NOT NULL DEFAULT true,
  apply_inss_on_13th boolean NOT NULL DEFAULT true,
  apply_rat_on_13th boolean NOT NULL DEFAULT true,
  apply_terceiros_on_13th boolean NOT NULL DEFAULT true,
  apply_outros_on_13th boolean NOT NULL DEFAULT false,
  apply_fgts_on_vacation boolean NOT NULL DEFAULT true,
  apply_inss_on_vacation boolean NOT NULL DEFAULT true,
  apply_rat_on_vacation boolean NOT NULL DEFAULT true,
  apply_terceiros_on_vacation boolean NOT NULL DEFAULT true,
  apply_outros_on_vacation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS on payroll_profiles
ALTER TABLE public.payroll_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_profiles
CREATE POLICY "Users can view payroll profiles in their tenant"
ON public.payroll_profiles
FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert payroll profiles"
ON public.payroll_profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can update payroll profiles"
ON public.payroll_profiles
FOR UPDATE
USING (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can delete payroll profiles"
ON public.payroll_profiles
FOR DELETE
USING (has_role(auth.uid(), tenant_id, 'admin'));

-- Trigger for updated_at on payroll_profiles
CREATE TRIGGER update_payroll_profiles_updated_at
  BEFORE UPDATE ON public.payroll_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Alter employees table - add new columns for cost calculation
ALTER TABLE public.employees 
  ADD COLUMN IF NOT EXISTS bolsa_auxilio numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_contrato_pj numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dividendos numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provisao_13 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provisao_ferias numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provisao_recesso numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_monthly_cost_estimated numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_annual_cost_estimated numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS breakdown_json jsonb;

-- 3. Alter employee_benefits table - add origin and active status
ALTER TABLE public.employee_benefits
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS origin_key text;

-- 4. Alter employee_tools table - add billing cycle and active status
ALTER TABLE public.employee_tools
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS annual_amount numeric NOT NULL DEFAULT 0;