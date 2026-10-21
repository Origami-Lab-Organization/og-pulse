-- Meu Kanban: card pessoal vinculado a uma atividade de projeto (21/10/2026). Decisão: ADR-0050
-- (adendo "Vínculo com projeto").
--
-- O card pessoal vira atividade no board do projeto e os dois continuam ligados: o pessoal
-- guarda prazo, lembrete e tags (que a atividade não tem); título e etapa andam juntos.
--   - Do Meu Kanban para o projeto: o front grava na atividade (a policy de
--     project_activity_cards é do tenant inteiro) aplicando as regras do board.
--   - Do projeto para o Meu Kanban: trigger nesta migration. Quem move a atividade no board
--     (GP, colega, MCP, fechamento de sprint) não pode alterar o card pessoal de outra pessoa
--     pela RLS, então o trigger é SECURITY DEFINER e só toca cards vinculados àquela
--     atividade, no mesmo tenant dela.
--
-- Versão abaixo de 20261021140000 de propósito: esta é aplicada à mão antes do deploy, e o
-- `db push` do build recusa migration pendente mais antiga que a última aplicada.
--
-- Rollback: supabase/rollback/20261021137000_meu_kanban_vinculo_com_projeto_rollback.sql

ALTER TABLE public.personal_kanban_cards
  ADD COLUMN project_activity_card_id uuid
    REFERENCES public.project_activity_cards(id) ON DELETE SET NULL;

-- Uma pessoa acompanha cada atividade com um card só.
CREATE UNIQUE INDEX personal_kanban_cards_employee_activity_key
  ON public.personal_kanban_cards (employee_id, project_activity_card_id)
  WHERE project_activity_card_id IS NOT NULL;

CREATE INDEX idx_pkcard_activity ON public.personal_kanban_cards (project_activity_card_id)
  WHERE project_activity_card_id IS NOT NULL;

-- Etapa do Meu Kanban que corresponde à coluna do board do projeto. Espelha
-- PROJECT_TO_PERSONAL_STAGE (src/lib/personalKanban.ts).
CREATE OR REPLACE FUNCTION public.activity_column_stage(p_column text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_column = 'done' THEN 'done'
    WHEN p_column IN ('in_dev', 'in_test', 'in_deploy') THEN 'doing'
    ELSE 'todo'
  END;
$$;

-- Mesma função de 20261021135000, mais a checagem do vínculo: a atividade precisa ser do mesmo
-- tenant do card. A FK sozinha aceitaria o id de uma atividade de outra empresa.
CREATE OR REPLACE FUNCTION public.personal_kanban_cards_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_stage text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.remind_at IS DISTINCT FROM OLD.remind_at THEN
    NEW.reminder_sent_at := NULL;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.column_id IS DISTINCT FROM OLD.column_id THEN
    SELECT col.stage INTO v_stage FROM public.personal_kanban_columns col WHERE col.id = NEW.column_id;
    IF v_stage = 'done' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;

  IF NEW.project_activity_card_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.project_activity_card_id IS DISTINCT FROM OLD.project_activity_card_id
          OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.project_activity_cards a
        WHERE a.id = NEW.project_activity_card_id AND a.tenant_id = NEW.tenant_id
     ) THEN
    RAISE EXCEPTION 'Atividade de projeto inexistente neste tenant' USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

-- Projeto → Meu Kanban. Título: o do projeto vale para todos os cards vinculados. Etapa: se a
-- atividade mudou de etapa, o card pessoal vai para a primeira coluna dessa etapa no kanban do
-- dono, no fim da coluna. Mudança dentro da mesma etapa (In Dev → In Test) não mexe no card.
CREATE OR REPLACE FUNCTION public.sync_personal_cards_from_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stage text := public.activity_column_stage(NEW.column_name);
  v_card  record;
  v_target uuid;
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    UPDATE public.personal_kanban_cards
       SET title = NEW.title, updated_at = now()
     WHERE project_activity_card_id = NEW.id
       AND tenant_id = NEW.tenant_id
       AND title IS DISTINCT FROM NEW.title;
  END IF;

  IF NEW.column_name IS DISTINCT FROM OLD.column_name THEN
    FOR v_card IN
      SELECT pc.id, pc.employee_id
        FROM public.personal_kanban_cards pc
        JOIN public.personal_kanban_columns col ON col.id = pc.column_id
       WHERE pc.project_activity_card_id = NEW.id
         AND pc.tenant_id = NEW.tenant_id
         AND col.stage <> v_stage
    LOOP
      SELECT col.id INTO v_target
        FROM public.personal_kanban_columns col
       WHERE col.employee_id = v_card.employee_id AND col.stage = v_stage
       ORDER BY col.position
       LIMIT 1;
      CONTINUE WHEN v_target IS NULL;
      -- Atividade reaberta traz de volta o card que o arquivamento do Feito tinha tirado do board.
      UPDATE public.personal_kanban_cards
         SET column_id = v_target,
             position = (SELECT COALESCE(MAX(c.position), -1) + 1
                           FROM public.personal_kanban_cards c WHERE c.column_id = v_target),
             archived_at = NULL,
             updated_at = now()
       WHERE id = v_card.id;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_personal_cards_from_activity() FROM public, anon, authenticated;

COMMENT ON FUNCTION public.sync_personal_cards_from_activity() IS
  'Leva título e etapa da atividade de projeto para os cards do Meu Kanban vinculados a ela (ADR-0050). DEFINER: quem move a atividade não alcança o card pessoal alheio pela RLS; escreve só nos cards vinculados, no tenant da atividade.';

CREATE TRIGGER project_activity_cards_sync_personal
  AFTER UPDATE OF title, column_name ON public.project_activity_cards
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.column_name IS DISTINCT FROM NEW.column_name)
  EXECUTE FUNCTION public.sync_personal_cards_from_activity();
