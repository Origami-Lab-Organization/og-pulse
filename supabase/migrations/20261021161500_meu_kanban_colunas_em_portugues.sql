-- Meu Kanban: colunas padrão em português (21/10/2026). Decisão: ADR-0050.
--
-- Separada da 20261021135000 de propósito: aquela foi aplicada antes do front novo, e o front
-- antigo acha as colunas pelo NOME ('To do', 'Doing', 'Done'). Renomear antes faria os cards de
-- projeto sumirem do kanban de todo mundo. Esta entra pelo build da Vercel, no mesmo deploy do
-- front que lê a etapa (`stage`) em vez do nome.
--
-- Rollback: supabase/rollback/20261021161500_meu_kanban_colunas_em_portugues_rollback.sql

-- Quem abriu o kanban pelo front antigo entre as duas migrations ganhou as três colunas com a
-- etapa padrão ('todo'). Corrige só as que ainda estão no padrão: etapa ou cor escolhidas pela
-- pessoa no front novo não são tocadas.
UPDATE public.personal_kanban_columns SET stage = 'doing', color = 'info'
 WHERE name = 'Doing' AND stage = 'todo' AND color = 'neutral';
UPDATE public.personal_kanban_columns SET stage = 'done', color = 'success'
 WHERE name = 'Done' AND stage = 'todo' AND color = 'neutral';

-- Os cards dessas colunas viram concluídos agora (o trigger só marca quando o card muda de coluna).
UPDATE public.personal_kanban_cards c
   SET completed_at = c.updated_at
  FROM public.personal_kanban_columns col
 WHERE col.id = c.column_id AND col.stage = 'done' AND c.completed_at IS NULL;

UPDATE public.personal_kanban_columns
   SET name = CASE name WHEN 'To do' THEN 'A fazer' WHEN 'Doing' THEN 'Fazendo' ELSE 'Feito' END
 WHERE (name, stage) IN (('To do', 'todo'), ('Doing', 'doing'), ('Done', 'done'));
