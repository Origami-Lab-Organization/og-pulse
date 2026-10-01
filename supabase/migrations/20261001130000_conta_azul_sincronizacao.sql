-- Conta Azul — sincronização (ADR-0044, parte 2).
--
-- Espelho MÍNIMO das parcelas do Conta Azul (só o que a conciliação usa, sem payload bruto) e
-- dos centros de custo, mais a ligação centro do Conta Azul → centro do Pulse, que é cadastro
-- manual do admin. Quem escreve o espelho é a Edge Function conta-azul-sync (service role); a
-- tela só lê — e lê dividido: receita com `conciliacao:receber`, despesa com
-- `conciliacao:pagar` (despesa traz pagamento de folha).
--
-- Contrato: .harness/integrations/conta-azul.md
-- Rollback: supabase/rollback/20261001130000_conta_azul_sincronizacao_rollback.sql

-- ── 1. Estado da sincronização na conexão ───────────────────────────────────────────────

ALTER TABLE public.conta_azul_connections
  -- Próximo mês (por vencimento) da carga inicial. NULL antes de começar.
  ADD COLUMN backfill_cursor    date,
  ADD COLUMN backfill_done_at   timestamptz,
  -- Última alteração já lida no Conta Azul. Gravado no começo da carga inicial, para o
  -- incremental pegar também o que mudou enquanto ela rodava.
  ADD COLUMN incremental_cursor timestamptz,
  -- Varredura diária que marca como removida a parcela que sumiu do Conta Azul (a API não
  -- documenta como exclusão aparece no incremental).
  ADD COLUMN last_full_scan_at  timestamptz,
  -- Trava da sincronização: cron e "Sincronizar agora" não rodam juntos na mesma conexão.
  ADD COLUMN syncing_until      timestamptz,
  ADD COLUMN receivable_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN payable_count      integer NOT NULL DEFAULT 0;

CREATE FUNCTION public.conta_azul_claim_sync(p_connection_id uuid, p_seconds integer DEFAULT 180)
RETURNS boolean
LANGUAGE sql
SET search_path = ''
AS $$
  WITH claimed AS (
    UPDATE public.conta_azul_connections
       SET syncing_until = now() + make_interval(secs => p_seconds)
     WHERE id = p_connection_id
       AND (syncing_until IS NULL OR syncing_until < now())
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

REVOKE ALL ON FUNCTION public.conta_azul_claim_sync(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_claim_sync(uuid, integer) TO service_role;

-- ── 2. Parcelas do Conta Azul ───────────────────────────────────────────────────────────

CREATE TABLE public.conta_azul_installments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id     uuid NOT NULL REFERENCES public.conta_azul_connections(id) ON DELETE CASCADE,
  ca_installment_id text NOT NULL,
  ca_event_id       text,
  kind              text NOT NULL CHECK (kind IN ('receita', 'despesa')),
  description       text,
  due_date          date,
  competence_date   date,
  -- Data da última baixa. A busca do Conta Azul não traz; vem da parcela por id.
  payment_date      date,
  -- Normalizado: o Conta Azul usa um enum na busca e outro na parcela por id.
  status            text NOT NULL CHECK (status IN
                      ('em_aberto', 'quitado', 'atrasado', 'parcial', 'renegociado', 'perdido', 'cancelado', 'desconhecido')),
  gross_amount      numeric(14, 2),
  net_amount        numeric(14, 2),
  paid_amount       numeric(14, 2),
  open_amount       numeric(14, 2),
  person_ca_id      text,
  person_name       text,
  -- Só CNPJ. CPF não entra (ADR-0044, item 4).
  person_document   text,
  invoice_number    text,
  invoice_type      text,
  reference_code    text,
  -- [{id, name, amount}] do rateio por categoria.
  categories        jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{id, name, amount, gross}] do rateio por centro de custo.
  cost_centers      jsonb NOT NULL DEFAULT '[]'::jsonb,
  ca_updated_at     timestamptz,
  synced_at         timestamptz NOT NULL DEFAULT now(),
  -- Sumiu do Conta Azul na varredura diária. Volta a NULL se reaparecer.
  removed_at        timestamptz,
  UNIQUE (connection_id, ca_installment_id)
);

COMMENT ON TABLE public.conta_azul_installments IS
  'Espelho mínimo das parcelas do Conta Azul (ADR-0044). Escrito só pela conta-azul-sync; receita lida com conciliacao:receber, despesa com conciliacao:pagar.';

CREATE INDEX conta_azul_installments_tenant_kind_due ON public.conta_azul_installments (tenant_id, kind, due_date);
CREATE INDEX conta_azul_installments_tenant_invoice ON public.conta_azul_installments (tenant_id, invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX conta_azul_installments_tenant_document ON public.conta_azul_installments (tenant_id, person_document) WHERE person_document IS NOT NULL;

ALTER TABLE public.conta_azul_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY conta_azul_installments_select
  ON public.conta_azul_installments FOR SELECT
  TO authenticated
  USING (
    (kind = 'receita' AND public.has_capability(auth.uid(), tenant_id, 'conciliacao:receber'))
    OR (kind = 'despesa' AND public.has_capability(auth.uid(), tenant_id, 'conciliacao:pagar'))
  );

REVOKE ALL ON public.conta_azul_installments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conta_azul_installments FROM authenticated;
GRANT SELECT ON public.conta_azul_installments TO authenticated;

-- ── 3. Pessoas (cache interno) ──────────────────────────────────────────────────────────

-- A parcela traz só id e nome da pessoa; o CNPJ, que a conciliação usa, exige uma chamada por
-- pessoa. Guardado aqui para não repetir a chamada a cada sincronização. Sem policy.
CREATE TABLE public.conta_azul_people (
  connection_id uuid NOT NULL REFERENCES public.conta_azul_connections(id) ON DELETE CASCADE,
  ca_person_id  text NOT NULL,
  name          text,
  -- Só CNPJ.
  document      text,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (connection_id, ca_person_id)
);

ALTER TABLE public.conta_azul_people ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conta_azul_people FROM anon, authenticated;

-- ── 4. Centros de custo do Conta Azul e a ligação com os do Pulse ───────────────────────

CREATE TABLE public.conta_azul_cost_centers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id      uuid NOT NULL REFERENCES public.conta_azul_connections(id) ON DELETE CASCADE,
  ca_cost_center_id  text NOT NULL,
  code               text,
  name               text NOT NULL,
  is_active          boolean NOT NULL DEFAULT true,
  -- Ligação manual com o centro do Pulse. Vários do Conta Azul podem apontar para o mesmo.
  cost_center_id     uuid REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  linked_by          uuid,
  linked_at          timestamptz,
  synced_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connection_id, ca_cost_center_id)
);

ALTER TABLE public.conta_azul_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY conta_azul_cost_centers_select
  ON public.conta_azul_cost_centers FOR SELECT
  TO authenticated
  USING (
    public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir')
    OR public.has_capability(auth.uid(), tenant_id, 'conciliacao:receber')
    OR public.has_capability(auth.uid(), tenant_id, 'conciliacao:pagar')
  );

-- A FK não olha tenant: o WITH CHECK garante que o centro do Pulse é da mesma empresa.
CREATE POLICY conta_azul_cost_centers_link
  ON public.conta_azul_cost_centers FOR UPDATE
  TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'))
  WITH CHECK (
    public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir')
    AND (
      cost_center_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.cost_centers c
         WHERE c.id = conta_azul_cost_centers.cost_center_id
           AND c.tenant_id = conta_azul_cost_centers.tenant_id
      )
    )
  );

REVOKE ALL ON public.conta_azul_cost_centers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conta_azul_cost_centers FROM authenticated;
GRANT SELECT ON public.conta_azul_cost_centers TO authenticated;
-- A tela muda só a ligação; o resto é do Conta Azul.
GRANT UPDATE (cost_center_id) ON public.conta_azul_cost_centers TO authenticated;

CREATE FUNCTION public.conta_azul_cost_centers_stamp_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id THEN
    NEW.linked_by := auth.uid();
    NEW.linked_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER conta_azul_cost_centers_stamp_link
  BEFORE UPDATE ON public.conta_azul_cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.conta_azul_cost_centers_stamp_link();

-- ── 5. Cron ─────────────────────────────────────────────────────────────────────────────

-- A cada 15 min. A carga inicial anda em lotes que cabem numa execução; depois dela, cada
-- execução lê só o que mudou. Mesmo padrão dos outros crons (public.cron_secret, 20260831120000).
select cron.unschedule('conta-azul-sync')
 where exists (select 1 from cron.job where jobname = 'conta-azul-sync');

select cron.schedule('conta-azul-sync', '*/15 * * * *', $job$
  select net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/conta-azul-sync',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 150000
  ) as request_id
$job$);
