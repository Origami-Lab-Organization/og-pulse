-- Rollback de 20261123220000_lancamento_no_periodo_do_projeto.sql: tira as guardas de
-- lançamento (horas e custos) e a coluna paid_at.
--
-- Sem BEGIN/COMMIT próprio: rode com `psql --single-transaction` (ai-review-checklist).
--
-- Antes de apagar paid_at, a data do pagamento volta para cost_date nos custos pagos, como
-- era antes da US-0030 (pagar gravava a data do pagamento em cost_date). A data do custo
-- desses itens se perde — é o estado anterior.

DROP TRIGGER IF EXISTS guard_project_cost_entry ON public.project_costs;
DROP TRIGGER IF EXISTS guard_project_timesheet_entry ON public.project_timesheets;
DROP FUNCTION IF EXISTS public.guard_project_cost_entry();
DROP FUNCTION IF EXISTS public.guard_project_timesheet_entry();
DROP FUNCTION IF EXISTS public.assert_project_accepts_entry(uuid, date, boolean);

UPDATE public.project_costs
   SET cost_date = paid_at
 WHERE status = 'paid'
   AND paid_at IS NOT NULL;

ALTER TABLE public.project_costs DROP COLUMN IF EXISTS paid_at;
