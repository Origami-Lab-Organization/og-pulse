-- Update payroll_profiles defaults for Simples Nacional regime
ALTER TABLE public.payroll_profiles 
  ALTER COLUMN inss_patronal_rate SET DEFAULT 0,
  ALTER COLUMN rat_rate SET DEFAULT 0,
  ALTER COLUMN terceiros_rate SET DEFAULT 0,
  ALTER COLUMN inss_patronal_prolabore_rate SET DEFAULT 0,
  ALTER COLUMN apply_inss_on_13th SET DEFAULT false,
  ALTER COLUMN apply_rat_on_13th SET DEFAULT false,
  ALTER COLUMN apply_terceiros_on_13th SET DEFAULT false,
  ALTER COLUMN apply_inss_on_vacation SET DEFAULT false,
  ALTER COLUMN apply_rat_on_vacation SET DEFAULT false,
  ALTER COLUMN apply_terceiros_on_vacation SET DEFAULT false;