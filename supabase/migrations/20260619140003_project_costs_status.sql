-- J9-03: Adiciona campo status à tabela project_costs.
-- Valores: planned (padrão), paid, cancelled.
-- Backfill: registros com actual_amount_brl preenchido são marcados como paid.

ALTER TABLE public.project_costs
  ADD COLUMN status text NOT NULL DEFAULT 'planned',
  ADD CONSTRAINT project_costs_status_check
    CHECK (status IN ('planned', 'paid', 'cancelled'));

-- Backfill: registros já pagos
UPDATE public.project_costs
  SET status = 'paid'
  WHERE actual_amount_brl IS NOT NULL
    AND deleted_at IS NULL;

COMMENT ON COLUMN public.project_costs.status IS
  'Estado do custo: planned = aguardando pagamento, paid = pago, cancelled = cancelado.';
