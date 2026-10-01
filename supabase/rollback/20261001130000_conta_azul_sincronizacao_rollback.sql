-- Reverte 20261001130000_conta_azul_sincronizacao.sql. Tudo aqui é cópia do Conta Azul,
-- exceto a ligação de centros de custo (cadastro manual do admin), que se perde.
-- Sem BEGIN/COMMIT próprio: envolver por fora com `psql --single-transaction`.

select cron.unschedule('conta-azul-sync')
 where exists (select 1 from cron.job where jobname = 'conta-azul-sync');

DROP TRIGGER IF EXISTS conta_azul_cost_centers_stamp_link ON public.conta_azul_cost_centers;
DROP FUNCTION IF EXISTS public.conta_azul_cost_centers_stamp_link();
DROP TABLE IF EXISTS public.conta_azul_cost_centers;
DROP TABLE IF EXISTS public.conta_azul_people;
DROP TABLE IF EXISTS public.conta_azul_installments;
DROP FUNCTION IF EXISTS public.conta_azul_claim_sync(uuid, integer);

ALTER TABLE public.conta_azul_connections
  DROP COLUMN IF EXISTS backfill_cursor,
  DROP COLUMN IF EXISTS backfill_done_at,
  DROP COLUMN IF EXISTS incremental_cursor,
  DROP COLUMN IF EXISTS last_full_scan_at,
  DROP COLUMN IF EXISTS syncing_until,
  DROP COLUMN IF EXISTS receivable_count,
  DROP COLUMN IF EXISTS payable_count;
