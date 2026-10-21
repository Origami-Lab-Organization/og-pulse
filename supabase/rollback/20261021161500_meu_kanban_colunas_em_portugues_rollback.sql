-- Reversão de 20261021161500_meu_kanban_colunas_em_portugues.sql.
-- Devolve os nomes em inglês às colunas padrão cuja etapa ainda corresponde. As correções de
-- etapa e de `completed_at` ficam: estavam erradas antes.
UPDATE public.personal_kanban_columns
   SET name = CASE name WHEN 'A fazer' THEN 'To do' WHEN 'Fazendo' THEN 'Doing' ELSE 'Done' END
 WHERE (name, stage) IN (('A fazer', 'todo'), ('Fazendo', 'doing'), ('Feito', 'done'));
