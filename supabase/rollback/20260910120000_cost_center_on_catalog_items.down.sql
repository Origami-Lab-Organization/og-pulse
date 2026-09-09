-- Reversão de 20260910120000_cost_center_on_catalog_items.sql (PUL-220, PUL-221).
-- Devolve o comportamento anterior: item sem centro e o balde "Atividades internas" intacto.
DROP TRIGGER IF EXISTS activity_timesheets_set_cost_center ON public.activity_timesheets;
DROP FUNCTION IF EXISTS public.set_activity_timesheet_cost_center();
DROP INDEX IF EXISTS public.activity_timesheets_cost_center_date_idx;
DROP INDEX IF EXISTS public.activity_types_cost_center_idx;
DROP INDEX IF EXISTS public.services_cost_center_idx;
ALTER TABLE public.activity_timesheets DROP COLUMN IF EXISTS cost_center_id;
ALTER TABLE public.activity_types DROP COLUMN IF EXISTS cost_center_id;
ALTER TABLE public.services DROP COLUMN IF EXISTS cost_center_id;
