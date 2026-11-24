-- Rollback de 20261124160000_retrato_da_base.sql: tira a tarefa semanal, a função e as colunas
-- do retrato. O fit no Pulse volta a não ter funcionários, dívida, distância nem faturamento
-- estimado da Base (só o que o time informou).

SELECT cron.unschedule('retrato-da-base-semanal')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retrato-da-base-semanal');

DROP FUNCTION IF EXISTS public.atualizar_retrato_da_base(jsonb);

ALTER TABLE public.prospect_companies
  DROP COLUMN IF EXISTS base_retrato_em,
  DROP COLUMN IF EXISTS base_faturamento_base,
  DROP COLUMN IF EXISTS base_faturamento_estimado,
  DROP COLUMN IF EXISTS base_distancia_km,
  DROP COLUMN IF EXISTS base_divida_ajuizada,
  DROP COLUMN IF EXISTS base_funcionarios;
