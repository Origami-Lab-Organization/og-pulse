-- Gestão de férias: solicitação por funcionário, aprovação multi-gerente.
-- Regras de negócio (ver .harness/adr/0003-vacation-accrual-and-multi-manager-approval.md):
--   * Acúmulo: 30 dias por aniversário completo de 12 meses desde data_admissao (lump, acumulativo).
--   * Elegibilidade: somente CLT e MENOR_APRENDIZ.
--   * Aprovação: todos os gerentes dos projetos ativos do funcionário; qualquer rejeição recusa o pedido.
--   * Gerente -> aprovado por admin; admin -> auto-aprovado.
-- A invariante crítica (não solicitar mais dias que o saldo) é reforçada server-side por trigger,
-- além da checagem no service/UI (boundaries.md: não deixar lógica crítica apenas no cliente).

-- =========================================================
-- Tabelas
-- =========================================================

CREATE TABLE IF NOT EXISTS public.vacation_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days_requested  INTEGER NOT NULL CHECK (days_requested >= 1),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  auto_approved   BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT,
  rejection_reason TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

-- Uma linha por aprovador exigido. Modela "todos os gerentes precisam aprovar".
CREATE TABLE IF NOT EXISTS public.vacation_request_approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       UUID NOT NULL REFERENCES public.vacation_requests(id) ON DELETE CASCADE,
  approver_id      UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, approver_id)
);

CREATE INDEX IF NOT EXISTS idx_vacation_requests_tenant ON public.vacation_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_employee ON public.vacation_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON public.vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_approvals_request ON public.vacation_request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_vacation_approvals_approver ON public.vacation_request_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_vacation_approvals_status ON public.vacation_request_approvals(status);

CREATE TRIGGER trg_vacation_requests_updated_at
  BEFORE UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Trigger de elegibilidade + saldo (invariante crítica server-side)
-- =========================================================
-- Mantém os mesmos valores da regra TS em src/lib/vacationBalanceCalculator.ts:
--   anos completos desde a admissão * 30 dias, menos dias já reservados (pending) e usados (approved).

CREATE OR REPLACE FUNCTION public.enforce_vacation_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admission   DATE;
  v_contract    TEXT;
  v_years       INTEGER;
  v_earned      INTEGER;
  v_committed   INTEGER;
BEGIN
  -- Pedidos cancelados/rejeitados não consomem saldo.
  IF NEW.status NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT data_admissao, tipo_contratacao
    INTO v_admission, v_contract
    FROM public.employees
   WHERE id = NEW.employee_id;

  IF v_admission IS NULL THEN
    RAISE EXCEPTION 'Funcionário sem data de admissão definida' USING ERRCODE = 'check_violation';
  END IF;

  IF v_contract NOT IN ('CLT', 'MENOR_APRENDIZ') THEN
    RAISE EXCEPTION 'Tipo de contrato % não tem direito a férias', v_contract USING ERRCODE = 'check_violation';
  END IF;

  v_years  := EXTRACT(YEAR FROM age(current_date, v_admission));
  v_earned := v_years * 30;

  SELECT COALESCE(SUM(days_requested), 0)
    INTO v_committed
    FROM public.vacation_requests
   WHERE employee_id = NEW.employee_id
     AND status IN ('pending', 'approved')
     AND id <> NEW.id;

  IF v_committed + NEW.days_requested > v_earned THEN
    RAISE EXCEPTION 'Saldo de férias insuficiente: disponível %, solicitado %',
      (v_earned - v_committed), NEW.days_requested USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_vacation_balance
  BEFORE INSERT ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vacation_balance();

-- =========================================================
-- RLS
-- =========================================================

ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_request_approvals ENABLE ROW LEVEL SECURITY;

-- vacation_requests --------------------------------------------------------

-- Vê: o próprio solicitante, admins do tenant, ou quem é aprovador do pedido.
CREATE POLICY "vacation_requests_select"
  ON public.vacation_requests FOR SELECT TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
    )
    OR public.has_role(auth.uid(), tenant_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.vacation_request_approvals a
      JOIN public.employees e ON e.id = a.approver_id
      WHERE a.request_id = vacation_requests.id
        AND e.auth_id = auth.uid()
    )
  );

-- Cria: somente para si mesmo, no próprio tenant. Apenas admin pode inserir já 'approved'
-- (auto-aprovação do admin); demais entram como 'pending'.
CREATE POLICY "vacation_requests_insert"
  ON public.vacation_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_tenant(auth.uid(), tenant_id)
    AND employee_id IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
    )
    AND (status = 'pending' OR public.has_role(auth.uid(), tenant_id, 'admin'))
  );

-- Atualiza: admin/aprovador alteram o status de revisão; o solicitante só pode cancelar.
CREATE POLICY "vacation_requests_update"
  ON public.vacation_requests FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), tenant_id, 'admin')
    OR employee_id IN (
      SELECT id FROM public.employees
      WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.vacation_request_approvals a
      JOIN public.employees e ON e.id = a.approver_id
      WHERE a.request_id = vacation_requests.id
        AND e.auth_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), tenant_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.vacation_request_approvals a
      JOIN public.employees e ON e.id = a.approver_id
      WHERE a.request_id = vacation_requests.id
        AND e.auth_id = auth.uid()
    )
    OR (
      employee_id IN (
        SELECT id FROM public.employees
        WHERE auth_id = auth.uid() AND tenant_id = vacation_requests.tenant_id
      )
      AND status = 'cancelled'
    )
  );

-- vacation_request_approvals ----------------------------------------------

-- Vê: o aprovador, o solicitante do pedido, ou admins.
CREATE POLICY "vacation_approvals_select"
  ON public.vacation_request_approvals FOR SELECT TO authenticated
  USING (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vacation_requests r
      WHERE r.id = vacation_request_approvals.request_id
        AND (
          r.employee_id IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = r.tenant_id
          )
          OR public.has_role(auth.uid(), r.tenant_id, 'admin')
        )
    )
  );

-- Cria: o solicitante (ao montar a lista de aprovadores do próprio pedido) ou admin.
-- Linhas nascem sempre 'pending' — nunca já aprovadas.
CREATE POLICY "vacation_approvals_insert"
  ON public.vacation_request_approvals FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.vacation_requests r
      WHERE r.id = vacation_request_approvals.request_id
        AND (
          r.employee_id IN (
            SELECT id FROM public.employees
            WHERE auth_id = auth.uid() AND tenant_id = r.tenant_id
          )
          OR public.has_role(auth.uid(), r.tenant_id, 'admin')
        )
    )
  );

-- Atualiza: somente o próprio aprovador (decide o seu voto) ou admin.
CREATE POLICY "vacation_approvals_update"
  ON public.vacation_request_approvals FOR UPDATE TO authenticated
  USING (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vacation_requests r
      WHERE r.id = vacation_request_approvals.request_id
        AND public.has_role(auth.uid(), r.tenant_id, 'admin')
    )
  )
  WITH CHECK (
    approver_id IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.vacation_requests r
      WHERE r.id = vacation_request_approvals.request_id
        AND public.has_role(auth.uid(), r.tenant_id, 'admin')
    )
  );
