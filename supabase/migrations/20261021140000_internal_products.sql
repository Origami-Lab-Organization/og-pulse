-- Produtos internos (21/10/2026). Decisão: ADR-0049.
--
-- Pedido do Italo: "preciso no Pulse ter uma gestão de produtos internos. O próprio Pulse hoje
-- está como um projeto, ele é um produto interno. Harness a mesma coisa." E, na sequência:
-- "o produto é o projeto". Então produto NÃO é tabela nova: é um projeto interno marcado como
-- produto, e a gestão (investimento acumulado, dono e equipe, roadmap e releases) é leitura
-- sobre o que o projeto já tem.
--
-- O que muda:
--   1. Cliente deixa de ser obrigatório para projeto NÃO faturável — a pendência que o
--      ADR-0035 deixou aberta, e que obrigava o Pulse a ter o cliente fictício "Origami Lab".
--      Projeto faturável continua exigindo cliente, por CHECK.
--   2. `projects.is_internal_product`: produto é projeto interno, então não fatura e, pelo
--      CHECK que já existe (ADR-0035), tem centro de custo próprio.
--   3. Capacidade `produto:ler` para a tela Produtos.
--   4. `internal_products_overview()`: a leitura da tela, numa chamada só.
--   5. O Pulse vira produto, e as horas já lançadas nele saem do centro do serviço para
--      "Projeto Interno", com rastro (decisão do Italo: a classificação estava errada).
--
-- Rollback: supabase/rollback/20261021140000_internal_products_rollback.sql

-- ── 1. Cliente opcional só para projeto não faturável ────────────────────────────────────

ALTER TABLE public.projects ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_billable_needs_client;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_billable_needs_client
  CHECK (NOT is_billable OR client_id IS NOT NULL);

COMMENT ON COLUMN public.projects.client_id IS
  'Cliente do projeto. Obrigatório quando is_billable (CHECK projects_billable_needs_client); '
  'projeto interno pode ter cliente (trabalho não pago para um cliente) ou não ter (produto '
  'próprio, ADR-0049).';

-- ── 2. Marca de produto interno ──────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_internal_product boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_internal_product_not_billable;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_internal_product_not_billable
  CHECK (NOT is_internal_product OR NOT is_billable);

COMMENT ON COLUMN public.projects.is_internal_product IS
  'Produto que a casa constrói para si (Pulse, Harness): permanente, com dono, roadmap e '
  'releases. Sempre não faturável, logo com centro de custo próprio (ADR-0035, ADR-0049). '
  'Projeto interno pontual fica não faturável sem esta marca.';

CREATE INDEX IF NOT EXISTS projects_internal_product_idx
  ON public.projects (tenant_id)
  WHERE is_internal_product;

-- ── 3. Capacidade da tela Produtos ───────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('produto:ler', 'projeto', 'Ver produtos internos',
   'Tela Produtos: os produtos que a casa constrói para si, com dono, equipe, roadmap, '
   'última release e horas investidas. O custo das horas segue financeiro:ler.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Nasce com quem vê o portfólio (Admin e Gerente): produto é projeto, e a lista de produtos é
-- um recorte do portfólio. Colaborador alocado acompanha o produto pela própria tela do projeto.
-- Guarda do último admin desligada só neste trecho, como em 20261001120000.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'produto:ler', true
FROM public.role_capabilities rc
WHERE rc.capability = 'portfolio:ler' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'produto:ler'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'portfolio:ler'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'produto:ler', o.enabled,
       'espelhamento de portfolio:ler (produtos internos, 21/10/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'portfolio:ler'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 4. Leitura da tela ───────────────────────────────────────────────────────────────────

-- Uma linha por produto do tenant de quem chama. SECURITY DEFINER com o tenant derivado de
-- `auth.uid()` (ADR-0021) e as duas capacidades conferidas aqui dentro: `produto:ler` decide
-- se há linha; `financeiro:ler` decide se o custo vem preenchido ou nulo. Agregado por produto,
-- então quem lê a tela não recebe hora nem custo de pessoa.
--
-- Investimento = horas lançadas × custo-hora gravado no próprio lançamento (o snapshot de
-- `set_project_timesheet_cost_snapshot`), o mesmo que o custo realizado do projeto usa.
-- Despesas do projeto (`project_costs`) ficam de fora nesta versão: as regras de recorrência
-- vivem no front (src/lib/projectCosts.ts) e duplicá-las aqui faria duas contas divergirem.
CREATE OR REPLACE FUNCTION public.internal_products_overview()
RETURNS TABLE (
  project_id           uuid,
  name                 text,
  portfolio_stage      text,
  status               text,
  manager_id           uuid,
  manager_name         text,
  team_size            integer,
  hours_total          numeric,
  hours_month          numeric,
  cost_total           numeric,
  cost_month           numeric,
  first_hour_on        date,
  next_milestone_title text,
  next_milestone_on    date,
  last_release_name    text,
  last_release_on      date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.tenant_id,
           public.has_capability(auth.uid(), e.tenant_id, 'financeiro:ler') AS sees_cost
    FROM public.employees e
    WHERE e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), e.tenant_id, 'produto:ler')
  ),
  products AS (
    SELECT p.id, p.name, p.portfolio_stage, p.status::text AS status, p.manager_id, me.sees_cost
    FROM me
    JOIN public.projects p ON p.tenant_id = me.tenant_id
    WHERE p.is_internal_product
  ),
  hours AS (
    SELECT t.project_id,
           sum(t.hours) AS hours_total,
           sum(t.hours) FILTER (
             WHERE date_trunc('month', t.work_date) = date_trunc('month', current_date)
           ) AS hours_month,
           sum(t.hours * t.cost_per_hour) AS cost_total,
           sum(t.hours * t.cost_per_hour) FILTER (
             WHERE date_trunc('month', t.work_date) = date_trunc('month', current_date)
           ) AS cost_month,
           min(t.work_date) AS first_hour_on
    FROM public.project_timesheets t
    WHERE t.project_id IN (SELECT id FROM products)
    GROUP BY t.project_id
  ),
  -- Equipe de agora: quem tem alocação do mês corrente em diante.
  team AS (
    SELECT pra.project_id, count(DISTINCT pra.employee_id)::integer AS team_size
    FROM public.project_role_allocations pra
    WHERE pra.project_id IN (SELECT id FROM products)
      AND pra.employee_id IS NOT NULL
      AND (pra.year * 100 + pra.month) >= (
        extract(year FROM current_date)::integer * 100 + extract(month FROM current_date)::integer
      )
    GROUP BY pra.project_id
  )
  SELECT p.id,
         p.name,
         p.portfolio_stage,
         p.status,
         p.manager_id,
         m.nome,
         coalesce(team.team_size, 0),
         coalesce(h.hours_total, 0),
         coalesce(h.hours_month, 0),
         CASE WHEN p.sees_cost THEN coalesce(h.cost_total, 0) END,
         CASE WHEN p.sees_cost THEN coalesce(h.cost_month, 0) END,
         h.first_hour_on,
         nm.title,
         nm.due_on,
         lr.name,
         lr.released_at
  FROM products p
  LEFT JOIN public.employees m ON m.id = p.manager_id
  LEFT JOIN hours h ON h.project_id = p.id
  LEFT JOIN team ON team.project_id = p.id
  LEFT JOIN LATERAL (
    SELECT ms.title, coalesce(ms.end_date, ms.start_date) AS due_on
    FROM public.project_milestones ms
    WHERE ms.project_id = p.id
      AND ms.status <> 'completed'
    ORDER BY coalesce(ms.end_date, ms.start_date) NULLS LAST
    LIMIT 1
  ) nm ON true
  LEFT JOIN LATERAL (
    SELECT r.name, r.released_at
    FROM public.project_activity_releases r
    WHERE r.project_id = p.id
      AND r.status = 'released'
    ORDER BY r.released_at DESC NULLS LAST
    LIMIT 1
  ) lr ON true
  ORDER BY p.name;
$$;

COMMENT ON FUNCTION public.internal_products_overview() IS
  'Tela Produtos (ADR-0049): por produto do tenant de quem chama, dono, equipe atual, horas e '
  'custo investidos (custo só com financeiro:ler), próximo marco e última release. Exige produto:ler.';

REVOKE ALL ON FUNCTION public.internal_products_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_products_overview() TO authenticated;

-- ── 5. O Pulse vira produto ──────────────────────────────────────────────────────────────

-- Rastro de cada hora que muda de centro. Só leitura por SQL: é registro de correção, não tela.
CREATE TABLE IF NOT EXISTS public.timesheet_cost_center_corrections (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id         uuid        NOT NULL,
  project_id           uuid        NOT NULL,
  from_cost_center_id  uuid,
  to_cost_center_id    uuid        NOT NULL,
  reason               text        NOT NULL,
  corrected_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.timesheet_cost_center_corrections IS
  'Horas que mudaram de centro de custo por correção de classificação, com o centro anterior. '
  'Primeiro uso: Origami Pulse virando produto interno (ADR-0049).';

ALTER TABLE public.timesheet_cost_center_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.timesheet_cost_center_corrections FROM anon, authenticated;

-- Pelo id, não pelo nome: há dois tenants "Origami Lab" em produção, e o nome pode repetir.
-- Em ambiente sem este projeto (local, homologação) o bloco só avisa e segue.
DO $$
DECLARE
  v_project_id  constant uuid := '2f5fd745-3365-48e4-98b1-7dbaf3abfe5d';
  v_tenant_id   uuid;
  v_center_id   uuid;
  v_corrected   integer;
BEGIN
  SELECT p.tenant_id INTO v_tenant_id FROM public.projects p WHERE p.id = v_project_id;
  IF NOT FOUND THEN
    RAISE NOTICE 'ADR-0049: projeto Origami Pulse não existe neste banco; nada a corrigir.';
    RETURN;
  END IF;

  SELECT c.id INTO v_center_id
  FROM public.cost_centers c
  WHERE c.tenant_id = v_tenant_id AND lower(btrim(c.name)) = 'projeto interno'
  LIMIT 1;
  IF v_center_id IS NULL THEN
    RAISE EXCEPTION 'ADR-0049: centro "Projeto Interno" ausente no tenant do Pulse.';
  END IF;

  UPDATE public.projects
     SET is_internal_product = true,
         is_billable = false,
         cost_center_id = v_center_id,
         client_id = NULL
   WHERE id = v_project_id;

  INSERT INTO public.timesheet_cost_center_corrections
    (timesheet_id, project_id, from_cost_center_id, to_cost_center_id, reason)
  SELECT t.id, t.project_id, t.cost_center_id, v_center_id,
         'Origami Pulse é produto interno: hora sai do centro do serviço para Projeto Interno (ADR-0049)'
  FROM public.project_timesheets t
  WHERE t.project_id = v_project_id
    AND t.cost_center_id IS DISTINCT FROM v_center_id;

  UPDATE public.project_timesheets
     SET cost_center_id = v_center_id
   WHERE project_id = v_project_id
     AND cost_center_id IS DISTINCT FROM v_center_id;
  GET DIAGNOSTICS v_corrected = ROW_COUNT;

  RAISE NOTICE 'ADR-0049: Origami Pulse marcado como produto interno; % hora(s) movida(s) para Projeto Interno.',
    v_corrected;
END $$;
