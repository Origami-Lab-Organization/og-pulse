-- Rollback de 20261125124000_matriz_e_filiais.sql
--
-- As funções de conciliação voltam a casar só pelo CNPJ do cliente; filiais e junção saem.
-- Empresas já juntadas não se separam (o dado foi movido).

CREATE OR REPLACE FUNCTION public.conta_azul_reconcile_receivables(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.conta_azul_revenue_outside_projects(p_tenant_id uuid, p_from date, p_to date)
 RETURNS TABLE(person_ca_id text, person_name text, person_document text, client_id uuid, client_name text, installments bigint, gross_total numeric, paid_total numeric, last_due date, categories text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH fora AS (
    SELECT c.*
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'receita' AND c.removed_at IS NULL
       AND c.due_date BETWEEN p_from AND p_to
       AND NOT EXISTS (SELECT 1 FROM public.conta_azul_matches m WHERE m.conta_azul_installment_id = c.id)
  )
  SELECT f.person_ca_id, max(f.person_name), f.person_document,
         cl.id, cl.company_name,
         count(*), sum(coalesce(f.gross_amount, 0)), sum(coalesce(f.paid_amount, 0)), max(f.due_date),
         (SELECT string_agg(DISTINCT cat->>'name', ', ')
            FROM fora f2, jsonb_array_elements(f2.categories) cat
           WHERE f2.person_ca_id IS NOT DISTINCT FROM f.person_ca_id)
    FROM fora f
    LEFT JOIN LATERAL (
      SELECT k.id, k.company_name
        FROM public.clients k
       WHERE k.tenant_id = p_tenant_id
         AND f.person_document IS NOT NULL
         AND nullif(regexp_replace(coalesce(k.cnpj, ''), '\D', '', 'g'), '') = f.person_document
       LIMIT 1
    ) cl ON true
   GROUP BY f.person_ca_id, f.person_document, cl.id, cl.company_name
   ORDER BY sum(coalesce(f.gross_amount, 0)) DESC
$function$
;

DROP FUNCTION IF EXISTS public.cnpjs_do_cliente(uuid);
DROP FUNCTION IF EXISTS public.juntar_empresas(uuid, uuid);
DROP TRIGGER IF EXISTS trg_prospect_companies_filiais ON public.prospect_companies;
DROP FUNCTION IF EXISTS public.prospect_companies_filiais();
DROP INDEX IF EXISTS public.prospect_companies_filiais_idx;
ALTER TABLE public.prospect_companies DROP COLUMN IF EXISTS cnpj_busca;
ALTER TABLE public.prospect_companies DROP COLUMN IF EXISTS filiais;
