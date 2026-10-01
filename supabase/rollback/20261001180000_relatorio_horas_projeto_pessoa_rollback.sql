-- Reverte 20261001180000_relatorio_horas_projeto_pessoa.sql (só funções de leitura).
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.
DROP FUNCTION IF EXISTS public.project_hours_by_person(uuid, date, date);
DROP FUNCTION IF EXISTS public.project_hours_by_person_unguarded(uuid, date, date);
