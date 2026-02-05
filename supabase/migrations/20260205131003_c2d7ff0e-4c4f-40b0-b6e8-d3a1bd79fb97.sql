-- Create company_holidays table
CREATE TABLE public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('fixed', 'floating', 'one_time')),
  fixed_day INTEGER CHECK (fixed_day >= 1 AND fixed_day <= 31),
  fixed_month INTEGER CHECK (fixed_month >= 1 AND fixed_month <= 12),
  specific_date DATE,
  reference_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- Admins can manage holidays (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can insert holidays" ON public.company_holidays
  FOR INSERT WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can update holidays" ON public.company_holidays
  FOR UPDATE USING (has_role(auth.uid(), tenant_id, 'admin'));

CREATE POLICY "Admins can delete holidays" ON public.company_holidays
  FOR DELETE USING (has_role(auth.uid(), tenant_id, 'admin'));

-- All users can view holidays in their tenant
CREATE POLICY "Users can view holidays" ON public.company_holidays
  FOR SELECT USING (user_belongs_to_tenant(auth.uid(), tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_company_holidays_updated_at
  BEFORE UPDATE ON public.company_holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed holidays for existing tenants
INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Confraternização Universal', 'fixed', 1, 1 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Tiradentes', 'fixed', 21, 4 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Dia do Trabalho', 'fixed', 1, 5 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Independência do Brasil', 'fixed', 7, 9 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Nossa Senhora Aparecida', 'fixed', 12, 10 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Finados', 'fixed', 2, 11 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Proclamação da República', 'fixed', 15, 11 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, fixed_day, fixed_month)
SELECT id, 'Natal', 'fixed', 25, 12 FROM tenants;

-- Floating holidays 2025
INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Carnaval (Segunda)', 'floating', '2025-03-03', 2025 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Carnaval (Terça)', 'floating', '2025-03-04', 2025 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Sexta-feira Santa', 'floating', '2025-04-18', 2025 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Corpus Christi', 'floating', '2025-06-19', 2025 FROM tenants;

-- Floating holidays 2026
INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Carnaval (Segunda)', 'floating', '2026-02-16', 2026 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Carnaval (Terça)', 'floating', '2026-02-17', 2026 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Sexta-feira Santa', 'floating', '2026-04-03', 2026 FROM tenants;

INSERT INTO public.company_holidays (tenant_id, name, holiday_type, specific_date, reference_year)
SELECT id, 'Corpus Christi', 'floating', '2026-06-04', 2026 FROM tenants;