
CREATE TABLE public.strategy_guardrails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  cycle_id      UUID NOT NULL REFERENCES public.strategy_cycles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  threshold     NUMERIC NOT NULL,
  operator      VARCHAR(2) NOT NULL DEFAULT '>=',
  unit          VARCHAR(20),
  current_value NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX strategy_guardrails_cycle_idx  ON public.strategy_guardrails(cycle_id);
CREATE INDEX strategy_guardrails_tenant_idx ON public.strategy_guardrails(tenant_id);

ALTER TABLE public.strategy_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select" ON public.strategy_guardrails
  FOR SELECT USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "tenant_isolation_insert" ON public.strategy_guardrails
  FOR INSERT WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "tenant_isolation_update" ON public.strategy_guardrails
  FOR UPDATE USING (public.user_belongs_to_tenant(auth.uid(), tenant_id))
  WITH CHECK (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "tenant_isolation_delete" ON public.strategy_guardrails
  FOR DELETE USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.strategy_guardrails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
