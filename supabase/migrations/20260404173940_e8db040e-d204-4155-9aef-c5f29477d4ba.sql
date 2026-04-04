
-- =============================================
-- Strategy Module: OKRs & Initiatives
-- =============================================

-- 1. strategy_cycles
CREATE TABLE public.strategy_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  review_outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_cycles_status_check CHECK (status IN ('planned', 'active', 'closed')),
  CONSTRAINT strategy_cycles_review_outcome_check CHECK (review_outcome IS NULL OR review_outcome IN ('exceeded', 'achieved', 'partial', 'not_achieved'))
);

CREATE INDEX idx_strategy_cycles_tenant_id ON public.strategy_cycles(tenant_id);
CREATE INDEX idx_strategy_cycles_status ON public.strategy_cycles(status);

ALTER TABLE public.strategy_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view cycles" ON public.strategy_cycles FOR SELECT TO authenticated USING (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Managers can insert cycles" ON public.strategy_cycles FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can update cycles" ON public.strategy_cycles FOR UPDATE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete cycles" ON public.strategy_cycles FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));

-- 2. strategy_objectives
CREATE TABLE public.strategy_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.strategy_cycles(id) ON DELETE CASCADE,
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.employees(id),
  status text NOT NULL DEFAULT 'on_track',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_objectives_status_check CHECK (status IN ('on_track', 'at_risk', 'off_track'))
);

CREATE INDEX idx_strategy_objectives_tenant_id ON public.strategy_objectives(tenant_id);
CREATE INDEX idx_strategy_objectives_cycle_id ON public.strategy_objectives(cycle_id);
CREATE INDEX idx_strategy_objectives_status ON public.strategy_objectives(status);

ALTER TABLE public.strategy_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view objectives" ON public.strategy_objectives FOR SELECT TO authenticated USING (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Managers can insert objectives" ON public.strategy_objectives FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can update objectives" ON public.strategy_objectives FOR UPDATE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete objectives" ON public.strategy_objectives FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));

-- 3. strategy_key_results
CREATE TABLE public.strategy_key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES public.strategy_objectives(id) ON DELETE CASCADE,
  name text NOT NULL,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL,
  unit text,
  confidence integer NOT NULL DEFAULT 5,
  owner_id uuid NOT NULL REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_key_results_confidence_check CHECK (confidence >= 0 AND confidence <= 10)
);

CREATE INDEX idx_strategy_key_results_tenant_id ON public.strategy_key_results(tenant_id);
CREATE INDEX idx_strategy_key_results_objective_id ON public.strategy_key_results(objective_id);

ALTER TABLE public.strategy_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view key results" ON public.strategy_key_results FOR SELECT TO authenticated USING (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Managers can insert key results" ON public.strategy_key_results FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can update key results" ON public.strategy_key_results FOR UPDATE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete key results" ON public.strategy_key_results FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));

-- 4. strategy_checkins
CREATE TABLE public.strategy_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key_result_id uuid NOT NULL REFERENCES public.strategy_key_results(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  value numeric NOT NULL,
  confidence integer NOT NULL,
  comment text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_checkins_confidence_check CHECK (confidence >= 0 AND confidence <= 10)
);

CREATE INDEX idx_strategy_checkins_tenant_id ON public.strategy_checkins(tenant_id);
CREATE INDEX idx_strategy_checkins_key_result_id ON public.strategy_checkins(key_result_id);

ALTER TABLE public.strategy_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view checkins" ON public.strategy_checkins FOR SELECT TO authenticated USING (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Tenant users can insert checkins" ON public.strategy_checkins FOR INSERT TO authenticated WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Managers can update checkins" ON public.strategy_checkins FOR UPDATE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete checkins" ON public.strategy_checkins FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));

-- 5. strategy_initiatives
CREATE TABLE public.strategy_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES public.strategy_objectives(id) ON DELETE CASCADE,
  title text NOT NULL,
  priority text NOT NULL DEFAULT 'média',
  effort integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'backlog',
  owner_id uuid NOT NULL REFERENCES public.employees(id),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT strategy_initiatives_priority_check CHECK (priority IN ('alta', 'média', 'baixa')),
  CONSTRAINT strategy_initiatives_effort_check CHECK (effort IN (1, 2, 3)),
  CONSTRAINT strategy_initiatives_status_check CHECK (status IN ('backlog', 'in_progress', 'review', 'done'))
);

CREATE INDEX idx_strategy_initiatives_tenant_id ON public.strategy_initiatives(tenant_id);
CREATE INDEX idx_strategy_initiatives_objective_id ON public.strategy_initiatives(objective_id);
CREATE INDEX idx_strategy_initiatives_status ON public.strategy_initiatives(status);

ALTER TABLE public.strategy_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view initiatives" ON public.strategy_initiatives FOR SELECT TO authenticated USING (user_belongs_to_tenant(auth.uid(), tenant_id));
CREATE POLICY "Managers can insert initiatives" ON public.strategy_initiatives FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can update initiatives" ON public.strategy_initiatives FOR UPDATE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
CREATE POLICY "Managers can delete initiatives" ON public.strategy_initiatives FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid(), tenant_id));
