
-- Add jornada_diaria to employees
ALTER TABLE public.employees ADD COLUMN jornada_diaria integer NOT NULL DEFAULT 8;

-- Add jornada_diaria to employee_versions
ALTER TABLE public.employee_versions ADD COLUMN jornada_diaria integer NOT NULL DEFAULT 8;

-- Backfill existing employees
UPDATE public.employees SET jornada_diaria = ROUND(jornada_mensal::numeric / 22);

-- Backfill existing employee_versions
UPDATE public.employee_versions SET jornada_diaria = ROUND(jornada_mensal::numeric / 22);
