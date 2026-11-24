-- Rollback de 20261124150000_linha_de_base_do_resultado_chave.sql: remove linha de base, como
-- medir e prazo dos resultados-chave. O que foi gravado nessas colunas se perde.
-- Sem BEGIN/COMMIT próprio: rode com `psql --single-transaction` (ai-review-checklist).

ALTER TABLE public.project_key_results
  DROP COLUMN IF EXISTS baseline_value,
  DROP COLUMN IF EXISTS measurement,
  DROP COLUMN IF EXISTS target_date;
