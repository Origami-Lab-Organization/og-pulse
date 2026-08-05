-- Ticket médio por linha de serviço — usado para estimar o valor de
-- oportunidades sem orçamento vinculado (soma do cabeçalho de coluna do
-- Kanban, valor do card, e Forecast do Dashboard Comercial).
--
-- Duas fontes de "linha de serviço" coexistem hoje nos dados:
-- 1) Catálogo relacional real (service_lines <- services.service_line_id),
--    usado por leads criados/editados desde a migração do catálogo (HU-001).
-- 2) Categorias de texto livre legadas (financiamento_inovacao,
--    consultoria_estrategica, product_studio, educacao_corporativa,
--    ventures — ver SERVICE_LINE_OPTIONS em src/types/lead.ts), usadas por
--    negócios fechados mais antigos, sem UUID de serviço real.
-- Sem migração/backfill de leads antigos: a tabela guarda as duas formas em
-- paralelo (nunca as duas ao mesmo tempo na mesma linha).

CREATE TABLE public.service_line_avg_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_line_id uuid REFERENCES public.service_lines(id) ON DELETE CASCADE,
  legacy_source_key text CHECK (legacy_source_key IS NULL OR legacy_source_key IN (
    'financiamento_inovacao', 'consultoria_estrategica', 'product_studio',
    'educacao_corporativa', 'ventures'
  )),
  label text NOT NULL,
  avg_ticket_value numeric NOT NULL DEFAULT 0,
  computed_value numeric,
  computed_at timestamptz,
  sample_size integer NOT NULL DEFAULT 0,
  is_manual_override boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_line_avg_tickets_key_check CHECK (
    (service_line_id IS NOT NULL AND legacy_source_key IS NULL) OR
    (service_line_id IS NULL AND legacy_source_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX service_line_avg_tickets_line_unique
  ON public.service_line_avg_tickets(tenant_id, service_line_id) WHERE service_line_id IS NOT NULL;
CREATE UNIQUE INDEX service_line_avg_tickets_legacy_unique
  ON public.service_line_avg_tickets(tenant_id, legacy_source_key) WHERE legacy_source_key IS NOT NULL;

ALTER TABLE public.service_line_avg_tickets ENABLE ROW LEVEL SECURITY;

-- Ver/editar restrito a admin ou gerente (sem role novo — decisão do usuário).
CREATE POLICY "service_line_avg_tickets_select" ON public.service_line_avg_tickets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

CREATE POLICY "service_line_avg_tickets_insert" ON public.service_line_avg_tickets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

CREATE POLICY "service_line_avg_tickets_update" ON public.service_line_avg_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

-- Acelera a agregação trimestral (varredura por tenant/estágio/janela de 12 meses).
CREATE INDEX IF NOT EXISTS idx_leads_closed_window
  ON public.leads(tenant_id, crm_stage, closed_at) WHERE NOT archived;

-- Núcleo do recálculo — nunca exposto via RPC direta (uso interno dos wrappers abaixo).
CREATE OR REPLACE FUNCTION public._recalc_service_line_avg_tickets_core(p_tenant_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_real integer;
  v_rows_legacy integer;
BEGIN
  -- 1) Linhas reais do catálogo — inclui linhas ativas sem nenhum negócio
  -- fechado ainda (LEFT JOIN), para aparecerem na tela com sample_size=0.
  WITH real_line_deals AS (
    SELECT
      l.tenant_id,
      svc.service_line_id,
      CASE WHEN b.final_total > 0 THEN b.final_total ELSE l.estimated_value END AS deal_value
    FROM public.leads l
    JOIN public.services svc ON svc.id::text = l.service_line
    LEFT JOIN public.budgets b ON b.id = l.budget_id
    WHERE l.crm_stage = 'closed'
      AND NOT l.archived
      AND svc.service_line_id IS NOT NULL
      AND COALESCE(l.closed_at, l.updated_at) >= now() - interval '12 months'
      AND (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
  ),
  real_line_agg AS (
    SELECT tenant_id, service_line_id, AVG(deal_value) AS avg_value, COUNT(*) AS sample_size
    FROM real_line_deals
    WHERE deal_value > 0
    GROUP BY tenant_id, service_line_id
  )
  INSERT INTO public.service_line_avg_tickets AS t
    (tenant_id, service_line_id, label, computed_value, avg_ticket_value, computed_at, sample_size)
  SELECT
    sl.tenant_id, sl.id, sl.name,
    COALESCE(a.avg_value, 0), COALESCE(a.avg_value, 0), now(), COALESCE(a.sample_size, 0)
  FROM public.service_lines sl
  LEFT JOIN real_line_agg a ON a.tenant_id = sl.tenant_id AND a.service_line_id = sl.id
  WHERE sl.is_active AND (p_tenant_id IS NULL OR sl.tenant_id = p_tenant_id)
  ON CONFLICT (tenant_id, service_line_id) WHERE service_line_id IS NOT NULL
  DO UPDATE SET
    label = EXCLUDED.label,
    computed_value = EXCLUDED.computed_value,
    computed_at = EXCLUDED.computed_at,
    sample_size = EXCLUDED.sample_size,
    avg_ticket_value = CASE WHEN t.is_manual_override THEN t.avg_ticket_value ELSE EXCLUDED.avg_ticket_value END,
    updated_at = now();
  GET DIAGNOSTICS v_rows_real = ROW_COUNT;

  -- 2) Chaves legadas — sempre as 5 categorias fixas por tenant, mesmo sem
  -- nenhum negócio fechado nelas (CROSS JOIN), para não perder o histórico
  -- de negócios antigos que nunca tiveram um serviço real vinculado.
  WITH legacy_deals AS (
    SELECT
      l.tenant_id, l.service_line AS legacy_key,
      CASE WHEN b.final_total > 0 THEN b.final_total ELSE l.estimated_value END AS deal_value
    FROM public.leads l
    LEFT JOIN public.budgets b ON b.id = l.budget_id
    WHERE l.crm_stage = 'closed'
      AND NOT l.archived
      AND COALESCE(l.closed_at, l.updated_at) >= now() - interval '12 months'
      AND l.service_line IN (
        'financiamento_inovacao', 'consultoria_estrategica', 'product_studio',
        'educacao_corporativa', 'ventures'
      )
      AND (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
  ),
  legacy_agg AS (
    SELECT tenant_id, legacy_key, AVG(deal_value) AS avg_value, COUNT(*) AS sample_size
    FROM legacy_deals
    WHERE deal_value > 0
    GROUP BY tenant_id, legacy_key
  ),
  tenants_x_keys AS (
    SELECT t.id AS tenant_id, k.key, k.label
    FROM public.tenants t
    CROSS JOIN (VALUES
      ('financiamento_inovacao', 'Financiamento da Inovação'),
      ('consultoria_estrategica', 'Consultoria Estratégica'),
      ('product_studio', 'Product Studio'),
      ('educacao_corporativa', 'Educação Corporativa'),
      ('ventures', 'Ventures')
    ) AS k(key, label)
    WHERE p_tenant_id IS NULL OR t.id = p_tenant_id
  )
  INSERT INTO public.service_line_avg_tickets AS t
    (tenant_id, legacy_source_key, label, computed_value, avg_ticket_value, computed_at, sample_size)
  SELECT
    tk.tenant_id, tk.key, tk.label,
    COALESCE(a.avg_value, 0), COALESCE(a.avg_value, 0), now(), COALESCE(a.sample_size, 0)
  FROM tenants_x_keys tk
  LEFT JOIN legacy_agg a ON a.tenant_id = tk.tenant_id AND a.legacy_key = tk.key
  ON CONFLICT (tenant_id, legacy_source_key) WHERE legacy_source_key IS NOT NULL
  DO UPDATE SET
    computed_value = EXCLUDED.computed_value,
    computed_at = EXCLUDED.computed_at,
    sample_size = EXCLUDED.sample_size,
    avg_ticket_value = CASE WHEN t.is_manual_override THEN t.avg_ticket_value ELSE EXCLUDED.avg_ticket_value END,
    updated_at = now();
  GET DIAGNOSTICS v_rows_legacy = ROW_COUNT;

  RETURN v_rows_real + v_rows_legacy;
END;
$$;

-- Função de uso exclusivo do cron/wrappers — nunca deve ser exposta via RPC
-- direta para nenhum tenant (mesmo padrão de activate_scheduled_employee_versions).
REVOKE ALL ON FUNCTION public._recalc_service_line_avg_tickets_core(uuid) FROM PUBLIC;

-- Wrapper do cron trimestral — todos os tenants de uma vez.
CREATE OR REPLACE FUNCTION public.recalculate_service_line_avg_tickets()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._recalc_service_line_avg_tickets_core(NULL);
$$;

REVOKE ALL ON FUNCTION public.recalculate_service_line_avg_tickets() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'recalc-service-line-avg-tickets-quarterly') THEN
    PERFORM cron.unschedule('recalc-service-line-avg-tickets-quarterly');
  END IF;
END $$;

-- 06:00 UTC = 03:00 em Brasília, dia 1 de jan/abr/jul/out (trimestral).
SELECT cron.schedule(
  'recalc-service-line-avg-tickets-quarterly',
  '0 6 1 1,4,7,10 *',
  $$SELECT public.recalculate_service_line_avg_tickets();$$
);

-- Wrapper "Recalcular agora" — escopado ao tenant do chamador, admin/gerente apenas.
CREATE OR REPLACE FUNCTION public.recalculate_service_line_avg_tickets_now()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid := public.get_user_tenant_id(auth.uid());
  v_rows integer;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem tenant associado';
  END IF;

  IF NOT (public.has_role(auth.uid(), v_tenant_id, 'admin') OR public.has_role(auth.uid(), v_tenant_id, 'manager')) THEN
    RAISE EXCEPTION 'Apenas admin ou gerente podem recalcular o ticket médio' USING ERRCODE = '42501';
  END IF;

  v_rows := public._recalc_service_line_avg_tickets_core(v_tenant_id);
  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_service_line_avg_tickets_now() TO authenticated;

-- Leitura pública leve — só o valor por linha, para o Kanban/Dashboard
-- calcularem a estimativa sem precisar de acesso à tabela completa.
CREATE OR REPLACE FUNCTION public.get_service_line_avg_tickets()
RETURNS TABLE(service_line_id uuid, legacy_source_key text, avg_ticket_value numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service_line_id, legacy_source_key, avg_ticket_value
  FROM public.service_line_avg_tickets
  WHERE tenant_id = public.get_user_tenant_id(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.get_service_line_avg_tickets() TO authenticated;

-- Backfill inicial — popula a tabela para todos os tenants imediatamente,
-- em vez de esperar o próximo trimestre ou um clique manual em "Recalcular agora".
SELECT public._recalc_service_line_avg_tickets_core(NULL);
