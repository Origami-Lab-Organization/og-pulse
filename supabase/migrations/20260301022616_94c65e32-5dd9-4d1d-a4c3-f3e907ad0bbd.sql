
-- Add segment, cnpj, and employee_count columns to tenants table
ALTER TABLE public.tenants ADD COLUMN cnpj text;
ALTER TABLE public.tenants ADD COLUMN segment text;
ALTER TABLE public.tenants ADD COLUMN employee_count integer;
