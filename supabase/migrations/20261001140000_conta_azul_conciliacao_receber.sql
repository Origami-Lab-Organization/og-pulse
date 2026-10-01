-- Conta Azul — conciliação de contas a receber (ADR-0044, parte 3).
--
-- Casa a parcela do Pulse (`project_installments`) com a parcela de receita do Conta Azul:
--   forte — mesma NF e mesmo CNPJ do cliente. Casado sem pedir confirmação; se o Conta Azul
--           diz quitado, a parcela do Pulse vira recebida com a data da baixa (Italo, 01/10).
--   fraco — mesmo CNPJ, mesmo valor bruto e vencimento a até 7 dias. Só sugerido.
-- Desfazer volta a parcela ao que era antes da baixa automática e grava a recusa, para o
-- mesmo par não voltar a ser sugerido.
--
-- E o menu Financeiro fica só com Admin: o Gerente vê o recebimento pelo projeto, como hoje
-- (Italo, 01/10/2026). `conciliacao:receber` sai de quem não tem `conciliacao:pagar`.
--
-- Rollback: supabase/rollback/20261001140000_conta_azul_conciliacao_receber_rollback.sql

-- ── 1. Conciliação de receber só com Admin ──────────────────────────────────────────────

-- Remover capacidade que não é `pessoa:editar-papel` não piora a guarda do último admin, e
-- tenant com teste encerrado travaria o deploy (ver 20261001120000).
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

DELETE FROM public.role_capabilities rc
 WHERE rc.capability = 'conciliacao:receber'
   AND NOT EXISTS (
     SELECT 1 FROM public.role_capabilities p
      WHERE p.role_id = rc.role_id AND p.capability = 'conciliacao:pagar' AND p.enabled
   );

DELETE FROM public.default_role_capabilities d
 WHERE d.capability = 'conciliacao:receber'
   AND NOT EXISTS (
     SELECT 1 FROM public.default_role_capabilities p
      WHERE p.role_name = d.role_name AND p.capability = 'conciliacao:pagar'
   );

DELETE FROM public.user_capability_overrides o
 WHERE o.capability = 'conciliacao:receber'
   AND o.reason LIKE 'espelhamento de financeiro:ler (integração Conta Azul%';

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Casamentos e recusas ─────────────────────────────────────────────────────────────

CREATE TABLE public.conta_azul_matches (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  installment_id            uuid NOT NULL UNIQUE REFERENCES public.project_installments(id) ON DELETE CASCADE,
  conta_azul_installment_id uuid NOT NULL UNIQUE REFERENCES public.conta_azul_installments(id) ON DELETE CASCADE,
  strength                  text NOT NULL CHECK (strength IN ('forte', 'fraco')),
  -- NULL = sugestão esperando uma pessoa. Forte nasce confirmado (confirmed_by NULL).
  confirmed_at              timestamptz,
  confirmed_by              uuid,
  -- Quando este casamento marcou a parcela do Pulse como recebida. `received_applied_by`
  -- NULL = foi a baixa automática do casamento forte.
  received_applied_at       timestamptz,
  received_applied_by       uuid,
  -- O que a parcela era antes, para desfazer devolver exatamente isso.
  previous_status           public.installment_status,
  previous_payment_date     date,
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conta_azul_matches IS
  'Casamento parcela do Pulse × parcela de receita do Conta Azul (ADR-0044, parte 3). Escrito só pelas RPCs conta_azul_*.';

CREATE TABLE public.conta_azul_match_rejections (
  installment_id            uuid NOT NULL REFERENCES public.project_installments(id) ON DELETE CASCADE,
  conta_azul_installment_id uuid NOT NULL REFERENCES public.conta_azul_installments(id) ON DELETE CASCADE,
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rejected_by               uuid,
  rejected_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (installment_id, conta_azul_installment_id)
);

ALTER TABLE public.conta_azul_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conta_azul_match_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY conta_azul_matches_select
  ON public.conta_azul_matches FOR SELECT
  TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'conciliacao:receber'));

REVOKE ALL ON public.conta_azul_matches FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conta_azul_matches FROM authenticated;
GRANT SELECT ON public.conta_azul_matches TO authenticated;
REVOKE ALL ON public.conta_azul_match_rejections FROM anon, authenticated;

-- ── 3. Chave de NF ──────────────────────────────────────────────────────────────────────

-- Só dígitos e sem zero à esquerda: "NF 000123", "123" e "0123" são a mesma nota.
CREATE FUNCTION public.conta_azul_nf_key(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT nullif(ltrim(regexp_replace(coalesce(p_value, ''), '\D', '', 'g'), '0'), '')
$$;

-- ── 4. Casar (chamado pela sincronização, service role) ─────────────────────────────────

CREATE FUNCTION public.conta_azul_reconcile_receivables(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_fortes    integer;
  v_sugeridos integer;
  v_baixas    integer;
BEGIN
  -- Par forte: NF + CNPJ. Vários candidatos (uma NF para várias parcelas): fica o par em que
  -- cada lado é o melhor do outro, por vencimento e depois por valor. O resto espera.
  WITH pulse AS (
    SELECT i.id, i.value, i.due_date,
           public.conta_azul_nf_key(i.invoice_number) AS nf,
           nullif(regexp_replace(coalesce(cl.cnpj, ''), '\D', '', 'g'), '') AS cnpj
      FROM public.project_installments i
      JOIN public.projects pr ON pr.id = i.project_id AND pr.tenant_id = p_tenant_id
      LEFT JOIN public.clients cl ON cl.id = pr.client_id
     WHERE NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.installment_id = i.id)
  ), ca AS (
    SELECT c.id, c.gross_amount, c.due_date, public.conta_azul_nf_key(c.invoice_number) AS nf, c.person_document AS cnpj
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'receita' AND c.removed_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.conta_azul_installment_id = c.id)
  ), candidatos AS (
    SELECT p.id AS pid, c.id AS cid,
           row_number() OVER (PARTITION BY p.id ORDER BY abs(coalesce(c.due_date - p.due_date, 9999)), abs(coalesce(c.gross_amount, 0) - p.value)) AS rp,
           row_number() OVER (PARTITION BY c.id ORDER BY abs(coalesce(c.due_date - p.due_date, 9999)), abs(coalesce(c.gross_amount, 0) - p.value)) AS rc
      FROM pulse p
      JOIN ca c ON c.nf = p.nf AND c.cnpj = p.cnpj
     WHERE NOT EXISTS (
       SELECT 1 FROM public.conta_azul_match_rejections r
        WHERE r.installment_id = p.id AND r.conta_azul_installment_id = c.id
     )
  )
  INSERT INTO public.conta_azul_matches (tenant_id, installment_id, conta_azul_installment_id, strength, confirmed_at)
  SELECT p_tenant_id, pid, cid, 'forte', now() FROM candidatos WHERE rp = 1 AND rc = 1
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_fortes = ROW_COUNT;

  -- Par fraco: CNPJ + valor bruto + vencimento a até 7 dias. Só sugestão.
  WITH pulse AS (
    SELECT i.id, i.value, i.due_date,
           nullif(regexp_replace(coalesce(cl.cnpj, ''), '\D', '', 'g'), '') AS cnpj
      FROM public.project_installments i
      JOIN public.projects pr ON pr.id = i.project_id AND pr.tenant_id = p_tenant_id
      LEFT JOIN public.clients cl ON cl.id = pr.client_id
     WHERE NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.installment_id = i.id)
  ), ca AS (
    SELECT c.id, c.gross_amount, c.due_date, c.person_document AS cnpj
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'receita' AND c.removed_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.conta_azul_installment_id = c.id)
  ), candidatos AS (
    SELECT p.id AS pid, c.id AS cid,
           row_number() OVER (PARTITION BY p.id ORDER BY abs(c.due_date - p.due_date)) AS rp,
           row_number() OVER (PARTITION BY c.id ORDER BY abs(c.due_date - p.due_date)) AS rc
      FROM pulse p
      JOIN ca c ON c.cnpj = p.cnpj
     WHERE abs(c.gross_amount - p.value) <= 0.01
       AND abs(c.due_date - p.due_date) <= 7
       AND NOT EXISTS (
         SELECT 1 FROM public.conta_azul_match_rejections r
          WHERE r.installment_id = p.id AND r.conta_azul_installment_id = c.id
       )
  )
  INSERT INTO public.conta_azul_matches (tenant_id, installment_id, conta_azul_installment_id, strength)
  SELECT p_tenant_id, pid, cid, 'fraco' FROM candidatos WHERE rp = 1 AND rc = 1
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_sugeridos = ROW_COUNT;

  -- Baixa automática do casamento forte: quitado lá, ainda não recebido aqui.
  WITH alvo AS (
    SELECT m.id AS mid, i.id AS iid, i.status, i.payment_date, c.payment_date AS baixa
      FROM public.conta_azul_matches m
      JOIN public.project_installments i ON i.id = m.installment_id
      JOIN public.conta_azul_installments c ON c.id = m.conta_azul_installment_id
     WHERE m.tenant_id = p_tenant_id
       AND m.strength = 'forte'
       AND m.received_applied_at IS NULL
       AND c.status = 'quitado' AND c.payment_date IS NOT NULL AND c.removed_at IS NULL
       AND i.status <> 'received'
  ), marcados AS (
    UPDATE public.conta_azul_matches m
       SET received_applied_at = now(), previous_status = a.status, previous_payment_date = a.payment_date
      FROM alvo a
     WHERE m.id = a.mid
    RETURNING a.iid, a.baixa
  )
  UPDATE public.project_installments i
     SET status = 'received', payment_date = marcados.baixa
    FROM marcados
   WHERE i.id = marcados.iid;
  GET DIAGNOSTICS v_baixas = ROW_COUNT;

  RETURN jsonb_build_object('fortes', v_fortes, 'sugeridos', v_sugeridos, 'baixas', v_baixas);
END;
$$;

REVOKE ALL ON FUNCTION public.conta_azul_reconcile_receivables(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_reconcile_receivables(uuid) TO service_role;

-- ── 5. Ações da pessoa (definer com guarda de tenant, ADR-0021) ─────────────────────────

-- Lê o casamento travado e confere quem chama. Ponto único da guarda das três ações.
CREATE FUNCTION public.conta_azul_match_for_action(p_match_id uuid)
RETURNS public.conta_azul_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match public.conta_azul_matches;
BEGIN
  SELECT * INTO v_match FROM public.conta_azul_matches WHERE id = p_match_id FOR UPDATE;
  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Este casamento não existe mais. Atualize a tela.' USING ERRCODE = 'PU001';
  END IF;
  PERFORM public.assert_tenant_access(v_match.tenant_id);
  IF NOT public.has_capability(auth.uid(), v_match.tenant_id, 'conciliacao:receber') THEN
    RAISE EXCEPTION 'Você não tem permissão para conciliar contas a receber.' USING ERRCODE = '42501';
  END IF;
  RETURN v_match;
END;
$$;

REVOKE ALL ON FUNCTION public.conta_azul_match_for_action(uuid) FROM public, anon, authenticated;

CREATE FUNCTION public.conta_azul_confirm_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.conta_azul_match_for_action(p_match_id);
  UPDATE public.conta_azul_matches
     SET confirmed_at = now(), confirmed_by = auth.uid()
   WHERE id = p_match_id AND confirmed_at IS NULL;
END;
$$;

-- Desfaz o casamento. Se ele marcou a parcela como recebida, ela volta ao que era — desde que
-- ninguém tenha mexido no recebimento depois.
CREATE FUNCTION public.conta_azul_undo_match(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match public.conta_azul_matches;
BEGIN
  v_match := public.conta_azul_match_for_action(p_match_id);
  IF v_match.received_applied_at IS NOT NULL THEN
    UPDATE public.project_installments
       SET status = v_match.previous_status, payment_date = v_match.previous_payment_date
     WHERE id = v_match.installment_id AND status = 'received';
  END IF;
  INSERT INTO public.conta_azul_match_rejections (installment_id, conta_azul_installment_id, tenant_id, rejected_by)
  VALUES (v_match.installment_id, v_match.conta_azul_installment_id, v_match.tenant_id, auth.uid())
  ON CONFLICT DO NOTHING;
  DELETE FROM public.conta_azul_matches WHERE id = p_match_id;
END;
$$;

-- Leva para o Pulse a baixa do Conta Azul num casamento já confirmado por uma pessoa.
CREATE FUNCTION public.conta_azul_apply_payment(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_match   public.conta_azul_matches;
  v_baixa   date;
  v_status  public.installment_status;
  v_paid_at date;
BEGIN
  v_match := public.conta_azul_match_for_action(p_match_id);
  IF v_match.confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Confirme o casamento antes de levar a baixa para o Pulse.' USING ERRCODE = 'PU001';
  END IF;
  SELECT c.payment_date INTO v_baixa
    FROM public.conta_azul_installments c
   WHERE c.id = v_match.conta_azul_installment_id AND c.status = 'quitado' AND c.removed_at IS NULL;
  IF v_baixa IS NULL THEN
    RAISE EXCEPTION 'O Conta Azul ainda não tem a baixa desta parcela.' USING ERRCODE = 'PU001';
  END IF;
  SELECT status, payment_date INTO v_status, v_paid_at FROM public.project_installments WHERE id = v_match.installment_id;
  IF v_status = 'received' THEN
    RAISE EXCEPTION 'A parcela já está como recebida no Pulse.' USING ERRCODE = 'PU001';
  END IF;
  UPDATE public.conta_azul_matches
     SET received_applied_at = now(), received_applied_by = auth.uid(),
         previous_status = v_status, previous_payment_date = v_paid_at
   WHERE id = p_match_id;
  UPDATE public.project_installments SET status = 'received', payment_date = v_baixa WHERE id = v_match.installment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.conta_azul_confirm_match(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.conta_azul_undo_match(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.conta_azul_apply_payment(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.conta_azul_confirm_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_undo_match(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_apply_payment(uuid) TO authenticated;

-- ── 6. Leitura da tela (invoker: a RLS de cada tabela vale) ─────────────────────────────

-- Uma linha por par casado ou sugerido, e uma por parcela sozinha de cada lado, no período
-- (vencimento de qualquer um dos lados dentro dele).
CREATE FUNCTION public.conta_azul_receivables_reconciliation(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (
  match_id uuid, strength text, confirmed_at timestamptz, received_applied_at timestamptz, received_applied_auto boolean,
  installment_id uuid, project_id uuid, project_name text, client_name text, installment_number integer,
  pulse_value numeric, pulse_due_date date, pulse_status text, pulse_payment_date date, pulse_invoice_number text,
  ca_id uuid, ca_person_name text, ca_description text, ca_gross numeric, ca_net numeric, ca_due_date date,
  ca_status text, ca_payment_date date, ca_invoice_number text, ca_removed boolean
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH pulse AS (
    SELECT i.id, i.project_id, pr.name AS project_name, cl.company_name AS client_name, i.installment_number,
           i.value, i.due_date, i.status::text AS status, i.payment_date, i.invoice_number
      FROM public.project_installments i
      JOIN public.projects pr ON pr.id = i.project_id AND pr.tenant_id = p_tenant_id
      LEFT JOIN public.clients cl ON cl.id = pr.client_id
  ), ca AS (
    SELECT c.id, c.person_name, c.description, c.gross_amount, c.net_amount, c.due_date, c.status,
           c.payment_date, c.invoice_number, c.removed_at IS NOT NULL AS removed
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'receita'
  )
  SELECT m.id, m.strength, m.confirmed_at, m.received_applied_at, m.received_applied_at IS NOT NULL AND m.received_applied_by IS NULL,
         p.id, p.project_id, p.project_name, p.client_name, p.installment_number,
         p.value, p.due_date, p.status, p.payment_date, p.invoice_number,
         c.id, c.person_name, c.description, c.gross_amount, c.net_amount, c.due_date,
         c.status, c.payment_date, c.invoice_number, c.removed
    FROM public.conta_azul_matches m
    JOIN pulse p ON p.id = m.installment_id
    JOIN ca c ON c.id = m.conta_azul_installment_id
   WHERE m.tenant_id = p_tenant_id
     AND (p.due_date BETWEEN p_from AND p_to OR c.due_date BETWEEN p_from AND p_to)
  UNION ALL
  SELECT NULL, NULL, NULL, NULL, false,
         p.id, p.project_id, p.project_name, p.client_name, p.installment_number,
         p.value, p.due_date, p.status, p.payment_date, p.invoice_number,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false
    FROM pulse p
   WHERE p.due_date BETWEEN p_from AND p_to
     AND NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.installment_id = p.id)
  UNION ALL
  SELECT NULL, NULL, NULL, NULL, false,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
         c.id, c.person_name, c.description, c.gross_amount, c.net_amount, c.due_date,
         c.status, c.payment_date, c.invoice_number, c.removed
    FROM ca c
   WHERE c.due_date BETWEEN p_from AND p_to
     AND NOT c.removed
     AND NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.conta_azul_installment_id = c.id)
$$;

REVOKE ALL ON FUNCTION public.conta_azul_receivables_reconciliation(uuid, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.conta_azul_receivables_reconciliation(uuid, date, date) TO authenticated;
