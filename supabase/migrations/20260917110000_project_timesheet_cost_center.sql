-- PUL-246 — a hora de projeto grava o centro de custo do momento, como a hora de atividade.
--
-- DECISÃO (17/09/2026, Italo): a hora de projeto herda o centro do SERVIÇO que o projeto vende,
-- e persiste no lançamento. Descartado dar centro próprio ao projeto — reabrir só se aparecer
-- caso real de projeto atravessando centros. Ver ADR-0031 e PUL-246.
--
-- O QUE ESTAVA ERRADO. A PUL-221 entregou "a hora grava o centro do momento" só para a hora de
-- atividade interna. A hora de projeto não persistia centro: ele era *derivado em leitura* por
-- `projects.service_line` -> `services.cost_center_id`. Consequência silenciosa: mover um
-- serviço de centro reescrevia o custo histórico de todos os projetos daquele serviço, e um
-- mês fechado deixava de fechar igual. Relatório tirado hoje e depois de um ajuste de catálogo
-- davam números diferentes para o mesmo período, sem nada explicando por quê.
--
-- POR QUE NO BANCO. A hora entra por vários caminhos — grade semanal, MCP de horas pelo chat,
-- correção de terceiro. Mesma razão da `set_activity_timesheet_cost_center`: regra na tela
-- valeria só para um deles.
--
-- COLUNA ANULÁVEL, de propósito (expand-contract). Hora de projeto cujo serviço não resolve
-- para um centro fica sem centro, e isso precisa continuar possível: `projects.service_line`
-- é `text` e pode guardar texto legado (a 20260917100000 conserta o `product_studio` conhecido,
-- e o que sobrar aparece no aviso de cobertura em Análises > Financeiro). `NOT NULL` aqui
-- travaria lançamento de hora em projeto sem serviço — trocaria uma leitura incompleta por uma
-- operação bloqueada.
--
-- ACESSO. Não há policy nova: a coluna vive em `project_timesheets`, cujas policies já
-- governam quem lança e quem lê. O campo herda a capacidade de quem escreve a hora.
--
-- Rollback: supabase/rollback/20260917110000_project_timesheet_cost_center_rollback.sql

-- ---------------------------------------------------------------------------------------
-- 1. Coluna e índice
-- ---------------------------------------------------------------------------------------

ALTER TABLE public.project_timesheets
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.project_timesheets.cost_center_id IS
  'Centro de custo do momento do lançamento, copiado do serviço que o projeto vende (PUL-246). '
  'Não é resolvido por join na leitura: mover o serviço de centro não reescreve o histórico.';

-- Espelha `activity_timesheets_cost_center_date_idx`: a leitura de custo por centro sempre
-- filtra por período junto com o centro.
CREATE INDEX IF NOT EXISTS project_timesheets_cost_center_date_idx
  ON public.project_timesheets (cost_center_id, work_date)
  WHERE cost_center_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 2. O centro vem do serviço do projeto, no INSERT
-- ---------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_project_timesheet_cost_center()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cost_center_id IS NULL THEN
    -- `s.id::text = p.service_line` e não o contrário: `service_line` é `text` e pode guardar
    -- texto legado, então o cast para uuid estouraria a inserção de hora num projeto antigo.
    SELECT s.cost_center_id INTO NEW.cost_center_id
      FROM public.projects p
      JOIN public.services s ON s.id::text = p.service_line
     WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END $$;

COMMENT ON FUNCTION public.set_project_timesheet_cost_center() IS
  'Copia o centro do serviço do projeto para a hora quando quem insere não informou (PUL-246). '
  'SECURITY DEFINER porque quem lança hora não precisa de leitura garantida de services por policy.';

-- Só em INSERT, como a irmã de atividade: em UPDATE, mexer no centro reescreveria histórico.
DROP TRIGGER IF EXISTS project_timesheets_set_cost_center ON public.project_timesheets;
CREATE TRIGGER project_timesheets_set_cost_center
  BEFORE INSERT ON public.project_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_timesheet_cost_center();

-- ---------------------------------------------------------------------------------------
-- 3. Backfill do histórico
-- ---------------------------------------------------------------------------------------

DO $$
DECLARE
  v_filled  integer;
  v_no_center integer;
BEGIN
  -- Classifica o passado com o centro vigente HOJE. É a melhor aproximação disponível: o
  -- centro do item só passou a existir em 10/09, então não há como saber o centro de uma hora
  -- de 2025. A partir daqui o valor congela, que é o ponto da história.
  UPDATE public.project_timesheets ts
     SET cost_center_id = s.cost_center_id
    FROM public.projects p
    JOIN public.services s ON s.id::text = p.service_line
   WHERE ts.project_id = p.id
     AND ts.cost_center_id IS NULL
     AND s.cost_center_id IS NOT NULL;

  GET DIAGNOSTICS v_filled = ROW_COUNT;

  SELECT count(*) INTO v_no_center
    FROM public.project_timesheets
   WHERE cost_center_id IS NULL;

  -- O que não classificou não some: aparece na linha "Sem centro de custo" de
  -- Análises > Financeiro, que é onde alguém decide o que fazer com ele (PUL-247).
  RAISE NOTICE 'PUL-246: % hora(s) de projeto classificada(s); % continua(m) sem centro (projeto sem serviço resolvível)',
    v_filled, v_no_center;
END $$;
