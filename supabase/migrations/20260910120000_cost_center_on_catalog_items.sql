-- PUL-221 + PUL-220 — o item do catálogo aponta para um centro de custo, e a hora grava o
-- centro do momento do lançamento. Ver ADR-0031.
--
-- MODELO (decisão de 08/09/2026): o centro de custo é a âncora. Cada item — serviço do
-- catálogo ou atividade interna — pertence a UM centro. A hora lançada no item carrega o
-- centro DO ITEM, e esse centro fica **persistido na hora**, não resolvido por join na
-- leitura: mover um item de centro afeta só lançamentos futuros e nunca reescreve o
-- histórico (PUL-221, cenário 2).
--
-- POR QUE A COLUNA NASCE ANULÁVEL (expand-contract, database-skill). Em produção:
--   * o tenant real da Origami (`93e40db0`) tem 10 serviços, 7 atividades e 7 centros;
--   * o tenant "Pulse Demo Consultoria" tem 10 serviços e NENHUM centro;
--   * tenant novo nasce sem centros (decisão de PUL-217).
-- `NOT NULL` agora impediria esses tenants de existirem como estão e travaria a criação de
-- serviço em cliente novo antes de ele cadastrar um centro. A obrigatoriedade fica no
-- cadastro (PUL-219 recusa salvar sem centro) e o `NOT NULL` vira migration de contract
-- quando 100% dos itens de todos os tenants tiverem centro.
--
-- ACESSO. Não há policy nova: a coluna vive em `services` e `activity_types`, cujas
-- policies de escrita já exigem `catalogo:editar` (migration 20260902240000). O campo herda
-- a capacidade do cadastro onde mora — não se cria capacidade para um campo (ADR-0031).
--
-- Rollback: supabase/rollback/20260910120000_cost_center_on_catalog_items.down.sql

-- ---------------------------------------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------------------------------------

ALTER TABLE public.services
  ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

ALTER TABLE public.activity_types
  ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

-- O centro do MOMENTO do lançamento. Preenchido pelo trigger abaixo a partir do item.
ALTER TABLE public.activity_timesheets
  ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.services.cost_center_id IS
  'Centro de custo do serviço (PUL-221, ADR-0031). Um item pertence a um centro. Anulável por '
  'expand-contract: a obrigatoriedade está no cadastro (PUL-219).';
COMMENT ON COLUMN public.activity_types.cost_center_id IS
  'Centro de custo da atividade interna (PUL-221, ADR-0031).';
COMMENT ON COLUMN public.activity_timesheets.cost_center_id IS
  'Centro do MOMENTO do lançamento, copiado do item pelo trigger activity_timesheets_set_cost_center. '
  'Trocar o centro do item não reescreve estas linhas (PUL-221, cenário 2).';

CREATE INDEX services_cost_center_idx ON public.services (cost_center_id) WHERE cost_center_id IS NOT NULL;
CREATE INDEX activity_types_cost_center_idx ON public.activity_types (cost_center_id) WHERE cost_center_id IS NOT NULL;
-- Leitura de custo por centro e período é a consulta que esta coluna existe para servir.
CREATE INDEX activity_timesheets_cost_center_date_idx ON public.activity_timesheets (cost_center_id, work_date) WHERE cost_center_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 2. A hora herda o centro do item, no banco
-- ---------------------------------------------------------------------------------------

-- No banco, e não na tela, porque a hora entra por vários caminhos: grade semanal, MCP de
-- horas pelo chat, correção de terceiro. A regra precisa valer para todos.
CREATE OR REPLACE FUNCTION public.set_activity_timesheet_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NULL THEN
    SELECT a.cost_center_id INTO NEW.cost_center_id
    FROM public.activity_types a
    WHERE a.id = NEW.activity_type_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION public.set_activity_timesheet_cost_center() IS
  'Copia o centro do item para a hora quando quem insere não informou (PUL-221). SECURITY DEFINER '
  'porque quem lança hora não precisa de leitura garantida de activity_types por policy.';

-- Só em INSERT: em UPDATE, mexer no centro reescreveria histórico.
CREATE TRIGGER activity_timesheets_set_cost_center
  BEFORE INSERT ON public.activity_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activity_timesheet_cost_center();

-- ---------------------------------------------------------------------------------------
-- 3. Mapa de migração dos itens existentes (PUL-220, mapa aprovado em PUL-216)
-- ---------------------------------------------------------------------------------------

-- Casa por NOME dentro do próprio tenant, não por id: assim a migration vale em produção,
-- em cópia e no stub, e é idempotente. As duplicatas do catálogo (Consultoria Estratégica
-- ×2, Ventures ×3) vão para o mesmo centro, então o nome basta para todas.
DO $$
DECLARE
  v_service_map  text[][] := ARRAY[
    ARRAY['consultoria estratégica',   'sl04 consultoria estratégica'],
    ARRAY['financiamento da inovação', 'sl01 financiamento de inovação'],
    ARRAY['lei do bem',                'sl01 financiamento de inovação'],
    ARRAY['product studio',            'sl02 studio de produto'],
    ARRAY['sprint 0',                  'sl02 studio de produto'],
    ARRAY['ventures',                  'sl03 ventures'],
    -- Programa de Inovação: nenhum projeto aponta para ele. Proposto SL04 em PUL-216;
    -- trocar para SL01 é um clique na tela, não migration.
    ARRAY['programa de inovação',      'sl04 consultoria estratégica']
  ];
  v_activity_map text[][] := ARRAY[
    ARRAY['marketing',      'og001_comercial/marketing'],
    ARRAY['comercial',      'og001_comercial/marketing'],
    ARRAY['administrativo', 'og001_administrativo'],
    ARRAY['rh/dp',          'og001_administrativo'],
    ARRAY['hackaton',       'og001_administrativo']
    -- Folga/Férias e Atestado Médico ficam SEM centro de propósito: são hora não
    -- trabalhada e o destino delas é a pergunta P3 de PUL-216 (recomendação: centro
    -- dedicado 'OG000 Ausências'). Enquanto P3 não fechar, elas aparecem como "sem
    -- centro" na tela, o que é honesto.
  ];
  v_pair    text[];
  v_updated integer;
  v_total   integer := 0;
BEGIN
  FOREACH v_pair SLICE 1 IN ARRAY v_service_map LOOP
    UPDATE public.services s
       SET cost_center_id = c.id
      FROM public.cost_centers c
     WHERE c.tenant_id = s.tenant_id
       AND lower(btrim(c.name)) = v_pair[2]
       AND lower(btrim(s.name)) = v_pair[1]
       AND s.cost_center_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_total := v_total + v_updated;
  END LOOP;
  RAISE NOTICE 'cost_center: % serviço(s) vinculado(s)', v_total;

  v_total := 0;
  FOREACH v_pair SLICE 1 IN ARRAY v_activity_map LOOP
    UPDATE public.activity_types a
       SET cost_center_id = c.id
      FROM public.cost_centers c
     WHERE c.tenant_id = a.tenant_id
       AND lower(btrim(c.name)) = v_pair[2]
       AND lower(btrim(a.name)) = v_pair[1]
       AND a.cost_center_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    v_total := v_total + v_updated;
  END LOOP;
  RAISE NOTICE 'cost_center: % atividade(s) vinculada(s)', v_total;

  -- Horas já lançadas recebem o centro atual do item. Não existe histórico de troca de
  -- centro (a coluna nasce agora), então o centro atual É o centro do momento para elas.
  UPDATE public.activity_timesheets ts
     SET cost_center_id = a.cost_center_id
    FROM public.activity_types a
   WHERE a.id = ts.activity_type_id
     AND a.cost_center_id IS NOT NULL
     AND ts.cost_center_id IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'cost_center: % hora(s) de atividade classificada(s)', v_updated;
END $$;
