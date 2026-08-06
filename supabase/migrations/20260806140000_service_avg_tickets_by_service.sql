-- Corrige a GRANULARIDADE do ticket médio: por SERVIÇO, não por linha de serviço.
--
-- Motivo (diagnóstico em produção):
-- 1) O campo "Tipo de Serviço" do card (LeadKanbanCard / LeadDetailDialog) grava
--    `services.id` — um serviço individual do catálogo. Agrupar por
--    `service_lines` colapsava TODOS os serviços na única linha existente
--    ("Serviços Gerais"), produzindo uma média única que mistura negócios de
--    naturezas completamente diferentes (15 negócios → um único ticket médio).
-- 2) As 5 chaves legadas ficavam sempre com amostra 0: nenhum lead grava mais
--    aquelas strings desde a migração do catálogo (HU-001). Elas continuam
--    suportadas aqui para não perder histórico antigo, mas agora só ganham
--    linha na tabela quando existe de fato negócio fechado com aquela string.
--
-- Substitui 20260806130000_service_line_avg_tickets.sql. O DROP é seguro: a
-- tabela anterior guardava apenas valores calculados (nenhum override manual).

DROP FUNCTION IF EXISTS public.get_service_line_avg_tickets();
DROP FUNCTION IF EXISTS public.recalculate_service_line_avg_tickets_now();
DROP FUNCTION IF EXISTS public.recalculate_service_line_avg_tickets();
DROP FUNCTION IF EXISTS public._recalc_service_line_avg_tickets_core(uuid);

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'recalc-service-line-avg-tickets-quarterly') THEN
    PERFORM cron.unschedule('recalc-service-line-avg-tickets-quarterly');
  END IF;
END $$;

DROP TABLE IF EXISTS public.service_line_avg_tickets;

CREATE TABLE public.service_avg_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
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
  CONSTRAINT service_avg_tickets_key_check CHECK (
    (service_id IS NOT NULL AND legacy_source_key IS NULL) OR
    (service_id IS NULL AND legacy_source_key IS NOT NULL)
  )
);

CREATE UNIQUE INDEX service_avg_tickets_service_unique
  ON public.service_avg_tickets(tenant_id, service_id) WHERE service_id IS NOT NULL;
CREATE UNIQUE INDEX service_avg_tickets_legacy_unique
  ON public.service_avg_tickets(tenant_id, legacy_source_key) WHERE legacy_source_key IS NOT NULL;

ALTER TABLE public.service_avg_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_avg_tickets_select" ON public.service_avg_tickets
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

CREATE POLICY "service_avg_tickets_insert" ON public.service_avg_tickets
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

CREATE POLICY "service_avg_tickets_update" ON public.service_avg_tickets
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), tenant_id, 'admin') OR has_role(auth.uid(), tenant_id, 'manager'));

-- Núcleo do recálculo — nunca exposto via RPC direta (uso interno dos wrappers).
CREATE OR REPLACE FUNCTION public._recalc_service_avg_tickets_core(p_tenant_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_service integer;
  v_rows_legacy integer;
BEGIN
  -- 1) Por serviço do catálogo — exatamente o que o dropdown "Tipo de Serviço"
  -- grava em leads.service_line. Todo serviço ativo ganha linha (LEFT JOIN),
  -- mesmo sem negócio fechado ainda, para permitir valor manual.
  WITH service_deals AS (
    SELECT
      l.tenant_id,
      svc.id AS service_id,
      CASE WHEN b.final_total > 0 THEN b.final_total ELSE l.estimated_value END AS deal_value
    FROM public.leads l
    JOIN public.services svc ON svc.id::text = l.service_line
    LEFT JOIN public.budgets b ON b.id = l.budget_id
    WHERE l.crm_stage = 'closed'
      AND NOT l.archived
      AND COALESCE(l.closed_at, l.updated_at) >= now() - interval '12 months'
      AND (p_tenant_id IS NULL OR l.tenant_id = p_tenant_id)
  ),
  service_agg AS (
    SELECT tenant_id, service_id, AVG(deal_value) AS avg_value, COUNT(*) AS sample_size
    FROM service_deals
    WHERE deal_value > 0
    GROUP BY tenant_id, service_id
  )
  INSERT INTO public.service_avg_tickets AS t
    (tenant_id, service_id, label, computed_value, avg_ticket_value, computed_at, sample_size)
  SELECT
    s.tenant_id, s.id, s.name,
    COALESCE(a.avg_value, 0), COALESCE(a.avg_value, 0), now(), COALESCE(a.sample_size, 0)
  FROM public.services s
  LEFT JOIN service_agg a ON a.tenant_id = s.tenant_id AND a.service_id = s.id
  WHERE s.is_active AND (p_tenant_id IS NULL OR s.tenant_id = p_tenant_id)
  ON CONFLICT (tenant_id, service_id) WHERE service_id IS NOT NULL
  DO UPDATE SET
    label = EXCLUDED.label,
    computed_value = EXCLUDED.computed_value,
    computed_at = EXCLUDED.computed_at,
    sample_size = EXCLUDED.sample_size,
    avg_ticket_value = CASE WHEN t.is_manual_override THEN t.avg_ticket_value ELSE EXCLUDED.avg_ticket_value END,
    updated_at = now();
  GET DIAGNOSTICS v_rows_service = ROW_COUNT;

  -- 2) Chaves legadas — só criam linha quando há negócio fechado de verdade
  -- com aquela string (JOIN, não CROSS JOIN). Sem dados = sem linha na tela.
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
  )
  INSERT INTO public.service_avg_tickets AS t
    (tenant_id, legacy_source_key, label, computed_value, avg_ticket_value, computed_at, sample_size)
  SELECT
    a.tenant_id, a.legacy_key, kl.label,
    a.avg_value, a.avg_value, now(), a.sample_size
  FROM legacy_agg a
  JOIN (VALUES
    ('financiamento_inovacao', 'Financiamento da Inovação'),
    ('consultoria_estrategica', 'Consultoria Estratégica'),
    ('product_studio', 'Product Studio'),
    ('educacao_corporativa', 'Educação Corporativa'),
    ('ventures', 'Ventures')
  ) AS kl(key, label) ON kl.key = a.legacy_key
  ON CONFLICT (tenant_id, legacy_source_key) WHERE legacy_source_key IS NOT NULL
  DO UPDATE SET
    computed_value = EXCLUDED.computed_value,
    computed_at = EXCLUDED.computed_at,
    sample_size = EXCLUDED.sample_size,
    avg_ticket_value = CASE WHEN t.is_manual_override THEN t.avg_ticket_value ELSE EXCLUDED.avg_ticket_value END,
    updated_at = now();
  GET DIAGNOSTICS v_rows_legacy = ROW_COUNT;

  RETURN v_rows_service + v_rows_legacy;
END;
$$;

REVOKE ALL ON FUNCTION public._recalc_service_avg_tickets_core(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.recalculate_service_avg_tickets()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._recalc_service_avg_tickets_core(NULL);
$$;

REVOKE ALL ON FUNCTION public.recalculate_service_avg_tickets() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'recalc-service-avg-tickets-quarterly') THEN
    PERFORM cron.unschedule('recalc-service-avg-tickets-quarterly');
  END IF;
END $$;

-- 06:00 UTC = 03:00 em Brasília, dia 1 de jan/abr/jul/out (trimestral).
SELECT cron.schedule(
  'recalc-service-avg-tickets-quarterly',
  '0 6 1 1,4,7,10 *',
  $$SELECT public.recalculate_service_avg_tickets();$$
);

-- "Recalcular agora" — escopado ao tenant do chamador, admin/gerente apenas.
CREATE OR REPLACE FUNCTION public.recalculate_service_avg_tickets_now()
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

  v_rows := public._recalc_service_avg_tickets_core(v_tenant_id);
  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_service_avg_tickets_now() TO authenticated;

-- Leitura pública leve — só o valor por serviço, para o Kanban/Dashboard
-- estimarem sem precisar de acesso à tabela completa.
CREATE OR REPLACE FUNCTION public.get_service_avg_tickets()
RETURNS TABLE(service_id uuid, legacy_source_key text, avg_ticket_value numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT service_id, legacy_source_key, avg_ticket_value
  FROM public.service_avg_tickets
  WHERE tenant_id = public.get_user_tenant_id(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.get_service_avg_tickets() TO authenticated;

-- Backfill inicial.
SELECT public._recalc_service_avg_tickets_core(NULL);
