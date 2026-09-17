-- Rollback de 20260917110000_project_timesheet_cost_center.sql (PUL-246).
--
-- Remove mecanismo e coluna. Nenhum dado de cliente é apagado: a hora, o projeto e o serviço
-- continuam íntegros, e a leitura de custo por centro volta a derivar o centro da hora de
-- projeto pelo serviço, como fazia antes.
--
-- O que se perde é o carimbo do momento — depois disto, mover um serviço de centro volta a
-- reclassificar o histórico daquele projeto.

DROP TRIGGER IF EXISTS project_timesheets_set_cost_center ON public.project_timesheets;
DROP FUNCTION IF EXISTS public.set_project_timesheet_cost_center();
DROP INDEX IF EXISTS public.project_timesheets_cost_center_date_idx;

ALTER TABLE public.project_timesheets
  DROP COLUMN IF EXISTS cost_center_id;
