-- US-0050 — matriz e filiais na mesma ficha (ADR-0056).
--
-- Decisões do Victor (25/11/2026): a empresa é a matriz e a ficha guarda os CNPJs das filiais; só
-- entra filial com a mesma raiz (8 primeiros dígitos); filial que já é empresa no Pulse é juntada à
-- da matriz, com confirmação. A nota do Conta Azul emitida para uma filial concilia com a empresa.
--
-- 1. `prospect_companies.filiais` (CNPJs, só dígitos) e `cnpj_busca` (CNPJ + filiais, para a busca
--    por parte do número). Um gatilho normaliza, confere a raiz e recusa CNPJ que já é de outra
--    empresa do tenant, como matriz ou como filial.
-- 2. `juntar_empresas(de, para)`: leva Oportunidades, contatos, sócios, histórico de faturamento e o
--    cliente da empresa `de` para `para`, guarda o CNPJ dela como filial e a apaga. Serve também à
--    regularização da US-0052 (Bry, Syngularid).
-- 3. `cnpjs_do_cliente(cliente)`: o CNPJ do cliente e os das filiais das empresas dele; a
--    conciliação do Conta Azul passa a casar por qualquer um deles.

-- 1. Filiais ---------------------------------------------------------------------------------------

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS filiais text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cnpj_busca text;

COMMENT ON COLUMN public.prospect_companies.filiais IS
  'US-0050: CNPJs das filiais (14 dígitos, mesma raiz da matriz em cnpj). Mantido pelo gatilho '
  'trg_prospect_companies_filiais, que recusa CNPJ que já é de outra empresa do tenant.';
COMMENT ON COLUMN public.prospect_companies.cnpj_busca IS
  'US-0050: CNPJ da matriz e das filiais, separados por espaço, para a busca por parte do número.';

CREATE INDEX IF NOT EXISTS prospect_companies_filiais_idx
  ON public.prospect_companies USING gin (filiais);

CREATE OR REPLACE FUNCTION public.prospect_companies_filiais()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_raiz text;
  v_cnpj text;
  v_dono text;
BEGIN
  -- Só dígitos, sem repetição e sem a própria matriz.
  NEW.filiais := coalesce((
    SELECT array_agg(DISTINCT d ORDER BY d)
      FROM unnest(NEW.filiais) f, LATERAL (SELECT regexp_replace(f, '\D', '', 'g') AS d) x
     WHERE d <> '' AND d IS DISTINCT FROM NEW.cnpj
  ), '{}');

  IF cardinality(NEW.filiais) > 0 THEN
    IF NEW.cnpj IS NULL THEN
      RAISE EXCEPTION 'Informe o CNPJ da matriz antes das filiais.' USING ERRCODE = '23514';
    END IF;
    v_raiz := left(NEW.cnpj, 8);
    FOREACH v_cnpj IN ARRAY NEW.filiais LOOP
      IF length(v_cnpj) <> 14 OR left(v_cnpj, 8) <> v_raiz THEN
        RAISE EXCEPTION 'O CNPJ % não é filial desta empresa.', v_cnpj USING ERRCODE = '23514';
      END IF;
    END LOOP;
  END IF;

  -- Nenhum CNPJ (matriz ou filial) pode ser de outra empresa do tenant.
  SELECT o.name INTO v_dono
    FROM public.prospect_companies o
   WHERE o.tenant_id = NEW.tenant_id
     AND o.id <> NEW.id
     AND (o.cnpj = ANY (NEW.filiais) OR o.filiais && NEW.filiais
          OR (NEW.cnpj IS NOT NULL AND NEW.cnpj = ANY (o.filiais)))
   LIMIT 1;
  IF v_dono IS NOT NULL THEN
    RAISE EXCEPTION 'Este CNPJ já é da empresa %.', v_dono USING ERRCODE = '23505';
  END IF;

  NEW.cnpj_busca := nullif(btrim(concat_ws(' ', NEW.cnpj, array_to_string(NEW.filiais, ' '))), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospect_companies_filiais ON public.prospect_companies;
CREATE TRIGGER trg_prospect_companies_filiais
BEFORE INSERT OR UPDATE OF cnpj, filiais ON public.prospect_companies
FOR EACH ROW EXECUTE FUNCTION public.prospect_companies_filiais();

-- As empresas que já existem ganham o cnpj_busca.
UPDATE public.prospect_companies SET cnpj_busca = cnpj WHERE cnpj IS NOT NULL AND cnpj_busca IS NULL;

-- 2. Juntar empresas -------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.juntar_empresas(p_de uuid, p_para uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_de public.prospect_companies%ROWTYPE;
  v_para public.prospect_companies%ROWTYPE;
  v_filiais text[];
BEGIN
  SELECT * INTO v_de FROM public.prospect_companies WHERE id = p_de FOR UPDATE;
  SELECT * INTO v_para FROM public.prospect_companies WHERE id = p_para FOR UPDATE;
  IF v_de.id IS NULL OR v_para.id IS NULL OR v_de.id = v_para.id OR v_de.tenant_id <> v_para.tenant_id THEN
    RAISE EXCEPTION 'Empresas inválidas para juntar.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.has_capability(auth.uid(), v_para.tenant_id, 'prospeccao:editar') THEN
    RAISE EXCEPTION 'Sem permissão para juntar empresas.' USING ERRCODE = '42501';
  END IF;
  IF v_de.client_id IS NOT NULL AND v_para.client_id IS NOT NULL AND v_de.client_id <> v_para.client_id THEN
    RAISE EXCEPTION 'As duas empresas são clientes diferentes; junte os clientes antes.' USING ERRCODE = '23514';
  END IF;

  UPDATE public.prospects SET company_id = v_para.id WHERE company_id = v_de.id;
  UPDATE public.prospect_contacts SET company_id = v_para.id WHERE company_id = v_de.id;
  UPDATE public.prospect_company_faturamentos SET company_id = v_para.id WHERE company_id = v_de.id;
  DELETE FROM public.prospect_company_partners s
   WHERE s.company_id = v_de.id
     AND EXISTS (SELECT 1 FROM public.prospect_company_partners t WHERE t.company_id = v_para.id AND t.nome = s.nome);
  UPDATE public.prospect_company_partners SET company_id = v_para.id WHERE company_id = v_de.id;

  -- A empresa juntada sai; o CNPJ dela (se for da mesma raiz) e as filiais ficam como filiais.
  v_filiais := v_para.filiais || v_de.filiais;
  IF v_de.cnpj IS NOT NULL AND v_para.cnpj IS NOT NULL AND left(v_de.cnpj, 8) = left(v_para.cnpj, 8) THEN
    v_filiais := v_filiais || v_de.cnpj;
  END IF;
  DELETE FROM public.prospect_companies WHERE id = v_de.id;

  UPDATE public.prospect_companies
     SET filiais = v_filiais,
         client_id = coalesce(v_para.client_id, v_de.client_id)
   WHERE id = v_para.id;
  RETURN v_para.id;
END;
$$;

COMMENT ON FUNCTION public.juntar_empresas(uuid, uuid) IS
  'US-0050: junta a empresa p_de na p_para (Oportunidades, contatos, sócios, faturamento, cliente; o '
  'CNPJ de mesma raiz vira filial) e apaga p_de. Exige prospeccao:editar no tenant.';

REVOKE ALL ON FUNCTION public.juntar_empresas(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.juntar_empresas(uuid, uuid) TO authenticated;

-- 3. Conta Azul: a nota da filial concilia com a empresa -------------------------------------------

CREATE OR REPLACE FUNCTION public.cnpjs_do_cliente(p_cliente uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), '')
    FROM public.clients c
   WHERE c.id = p_cliente
  UNION
  SELECT f
    FROM public.prospect_companies pc, unnest(pc.filiais) f
   WHERE pc.client_id = p_cliente
$$;

COMMENT ON FUNCTION public.cnpjs_do_cliente(uuid) IS
  'US-0050: CNPJs (só dígitos) com que o cliente fatura — o dele e os das filiais das empresas dele.';

REVOKE ALL ON FUNCTION public.cnpjs_do_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cnpjs_do_cliente(uuid) TO authenticated;

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
  -- US-0050: o CNPJ do cliente vale com os das filiais (cnpjs_do_cliente).
  WITH pulse AS (
    SELECT i.id, i.value, i.due_date,
           public.conta_azul_nf_key(i.invoice_number) AS nf,
           doc.cnpj
      FROM public.project_installments i
      JOIN public.projects pr ON pr.id = i.project_id AND pr.tenant_id = p_tenant_id
      LEFT JOIN LATERAL public.cnpjs_do_cliente(pr.client_id) AS doc(cnpj) ON true
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
           doc.cnpj
      FROM public.project_installments i
      JOIN public.projects pr ON pr.id = i.project_id AND pr.tenant_id = p_tenant_id
      LEFT JOIN LATERAL public.cnpjs_do_cliente(pr.client_id) AS doc(cnpj) ON true
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
$function$;

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
      -- US-0050: casa pelo CNPJ do cliente ou de uma filial das empresas dele.
      SELECT k.id, k.company_name
        FROM public.clients k
       WHERE k.tenant_id = p_tenant_id
         AND f.person_document IS NOT NULL
         AND f.person_document IN (SELECT public.cnpjs_do_cliente(k.id))
       LIMIT 1
    ) cl ON true
   GROUP BY f.person_ca_id, f.person_document, cl.id, cl.company_name
   ORDER BY sum(coalesce(f.gross_amount, 0)) DESC
$function$;
