-- ADR-0035 — faturável é atributo do PROJETO, e o custo do projeto interno vai para centro próprio.
--
-- PROVOCAÇÃO (Italo, 17/09): "o serviço é que vou falar se ele é cobrável ou não? Como vou
-- controlar projetos com horas não pagas pelo cliente? O próprio Pulse é um projeto interno."
--
-- POR QUE O SERVIÇO NÃO SERVE. Hoje `services.project_type` aceita `non_revenue`, mas serviço
-- é o que a casa VENDE. Marcar "Product Studio" como non_revenue zeraria os 7 projetos de
-- cliente que usam esse serviço; criar um "Product Studio Interno" poria no catálogo comercial
-- um item que ninguém vende, oferecido no seletor de Tipo de Serviço do Pipeline. O mesmo
-- trabalho atende cliente e constrói o produto próprio: ser vendido é do CONTRATO.
--
-- A REGRA, na mesma forma de PUL-218 (pessoa que não lança hora tem centro vinculado):
--
--   projeto faturável      -> a hora herda o centro do serviço; sem centro próprio
--   projeto NÃO faturável  -> centro próprio OBRIGATÓRIO, e a hora vai para ele
--
-- Garantido por CHECK e não por tela. Sem isso, o custo do produto interno cai no centro do
-- estúdio junto com o trabalho vendido, e a margem do estúdio passa a carregar custo sem
-- receita correspondente.
--
-- DEFAULT `true`: nenhum projeto existente muda de comportamento com esta migration.
--
-- ACESSO. Sem policy nova: as colunas vivem em `projects`, cujas policies já governam quem
-- cria e edita projeto. O campo herda a capacidade do cadastro onde mora (ADR-0031).
--
-- Rollback: supabase/rollback/20260917120000_internal_project_billable_flag_rollback.sql

-- ---------------------------------------------------------------------------------------
-- 1. O centro "Projeto Interno" passa a ser padrão do produto
-- ---------------------------------------------------------------------------------------

INSERT INTO public.default_cost_centers (name, description, position)
SELECT
  'Projeto Interno',
  'Custo do que a casa constrói para si mesma: produto próprio, ferramentas internas e P&D. Não tem receita.',
  4
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_cost_centers WHERE lower(btrim(name)) = 'projeto interno'
);

-- O semeador de PUL-249 é idempotente por "o tenant ainda não tem NENHUM centro", então só
-- alcança empresa nova. Quem já tem centros — a Origami com os sete dela — não receberia este.
-- Aqui a idempotência é por NOME, de propósito: o centro não é estética de catálogo, é
-- requisito do mecanismo abaixo. Sem ele, o admin de um tenant existente precisaria adivinhar
-- o que cadastrar antes de marcar o primeiro projeto como interno.
INSERT INTO public.cost_centers (tenant_id, name, description, is_active)
SELECT
  t.id,
  'Projeto Interno',
  'Custo do que a casa constrói para si mesma: produto próprio, ferramentas internas e P&D. Não tem receita.',
  true
FROM public.tenants t
WHERE EXISTS (SELECT 1 FROM public.cost_centers c WHERE c.tenant_id = t.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.cost_centers c
     WHERE c.tenant_id = t.id AND lower(btrim(c.name)) = 'projeto interno'
  );

-- ---------------------------------------------------------------------------------------
-- 2. Colunas em `projects`
-- ---------------------------------------------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_billable boolean NOT NULL DEFAULT true;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.projects.is_billable IS
  'O cliente paga por este projeto? (ADR-0035). O serviço diz QUE trabalho é; o projeto diz se '
  'alguém paga por ele. Falso = projeto interno, custo sem receita.';

COMMENT ON COLUMN public.projects.cost_center_id IS
  'Centro de custo do projeto, obrigatório quando is_billable = false (ADR-0035). Quando '
  'preenchido, vence o centro do serviço na hora lançada. Projeto faturável deixa nulo e herda '
  'o centro do serviço que vende.';

-- A regra no dado, não na tela: quem chama a API direto também não passa.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_non_billable_needs_cost_center;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_non_billable_needs_cost_center
  CHECK (is_billable OR cost_center_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS projects_cost_center_idx
  ON public.projects (cost_center_id)
  WHERE cost_center_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 3. A hora do projeto interno vai para o centro do projeto
-- ---------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_project_timesheet_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NULL THEN
    -- O centro do projeto vence o do serviço: é o que separa o custo do produto próprio do
    -- trabalho vendido pelo mesmo serviço. LEFT JOIN, e não INNER: projeto interno pode não
    -- ter serviço nenhum, e com INNER ele sairia sem centro justamente no caso que a regra
    -- existe para cobrir.
    SELECT COALESCE(p.cost_center_id, s.cost_center_id) INTO NEW.cost_center_id
      FROM public.projects p
      LEFT JOIN public.services s ON s.id::text = p.service_line
     WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION public.set_project_timesheet_cost_center() IS
  'Copia para a hora o centro do projeto quando ele tem um (projeto interno, ADR-0035) e, se '
  'não tiver, o centro do serviço que o projeto vende (PUL-246). SECURITY DEFINER porque quem '
  'lança hora não precisa de leitura garantida de services por policy.';

-- ---------------------------------------------------------------------------------------
-- 4. Aviso do estado atual
-- ---------------------------------------------------------------------------------------

DO $$
DECLARE
  v_centers  integer;
  v_internal integer;
BEGIN
  SELECT count(*) INTO v_centers
    FROM public.cost_centers WHERE lower(btrim(name)) = 'projeto interno';

  SELECT count(*) INTO v_internal
    FROM public.projects WHERE NOT is_billable;

  RAISE NOTICE 'ADR-0035: centro "Projeto Interno" presente em % tenant(s); % projeto(s) marcado(s) como nao faturavel',
    v_centers, v_internal;
END $$;
