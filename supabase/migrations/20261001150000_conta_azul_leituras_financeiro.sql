-- Conta Azul — leituras da tela Financeiro (ADR-0044): receita fora dos projetos e contas a pagar
-- por centro de custo e por categoria. Só leitura, SECURITY INVOKER: a RLS do espelho vale (receita
-- com `conciliacao:receber`, despesa com `conciliacao:pagar`).
--
-- O valor de cada parcela é distribuído na PROPORÇÃO do rateio, não pelo valor do rateio em si: a
-- documentação manda conferir se a soma do rateio bate com a parcela, e o rateio mora no evento —
-- somar o rateio de cada parcela de um evento parcelado contaria o evento várias vezes.
--
-- Rollback: supabase/rollback/20261001150000_conta_azul_leituras_financeiro_rollback.sql

-- Receita do Conta Azul que não casou com parcela de projeto, por cliente. Diz também se o cliente
-- existe no Pulse (mesmo CNPJ): "existe, mas sem parcela" e "nem existe" pedem ações diferentes.
CREATE FUNCTION public.conta_azul_revenue_outside_projects(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (
  person_ca_id text, person_name text, person_document text,
  client_id uuid, client_name text,
  installments bigint, gross_total numeric, paid_total numeric, last_due date, categories text
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
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
$$;

-- Contas a pagar por centro de custo do Conta Azul, já com a ligação ao centro do Pulse. Mês pela
-- competência (cai para o vencimento): é como o custo do Pulse é lido, pelo mês do trabalho.
CREATE FUNCTION public.conta_azul_payables_by_cost_center(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (ca_cost_center_id text, ca_cost_center_name text, cost_center_id uuid, amount numeric, installments bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH base AS (
    SELECT c.id, coalesce(c.gross_amount, 0) AS bruto, c.cost_centers,
           (SELECT sum(coalesce((cc->>'amount')::numeric, 0)) FROM jsonb_array_elements(c.cost_centers) cc) AS total_rateio
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'despesa' AND c.removed_at IS NULL
       AND coalesce(c.competence_date, c.due_date) BETWEEN p_from AND p_to
  ), distribuido AS (
    SELECT cc->>'id' AS ca_cc, cc->>'name' AS nome,
           b.bruto * coalesce((cc->>'amount')::numeric, 0) / b.total_rateio AS valor, b.id
      FROM base b, jsonb_array_elements(b.cost_centers) cc
     WHERE b.total_rateio > 0
    UNION ALL
    SELECT NULL, NULL, b.bruto, b.id FROM base b WHERE coalesce(b.total_rateio, 0) <= 0
  )
  SELECT d.ca_cc, max(d.nome), m.cost_center_id, round(sum(d.valor), 2), count(DISTINCT d.id)
    FROM distribuido d
    LEFT JOIN public.conta_azul_cost_centers m
      ON m.tenant_id = p_tenant_id AND m.ca_cost_center_id = d.ca_cc
   GROUP BY d.ca_cc, m.cost_center_id
$$;

-- Contas a pagar por categoria: para onde foi o dinheiro (folha, impostos, fornecedores...).
CREATE FUNCTION public.conta_azul_payables_by_category(p_tenant_id uuid, p_from date, p_to date)
RETURNS TABLE (category text, amount numeric, installments bigint)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH base AS (
    SELECT c.id, coalesce(c.gross_amount, 0) AS bruto, c.categories,
           (SELECT sum(coalesce((k->>'amount')::numeric, 0)) FROM jsonb_array_elements(c.categories) k) AS total_rateio
      FROM public.conta_azul_installments c
     WHERE c.tenant_id = p_tenant_id AND c.kind = 'despesa' AND c.removed_at IS NULL
       AND coalesce(c.competence_date, c.due_date) BETWEEN p_from AND p_to
  ), distribuido AS (
    SELECT k->>'name' AS categoria, b.bruto * coalesce((k->>'amount')::numeric, 0) / b.total_rateio AS valor, b.id
      FROM base b, jsonb_array_elements(b.categories) k
     WHERE b.total_rateio > 0
    UNION ALL
    SELECT NULL, b.bruto, b.id FROM base b WHERE coalesce(b.total_rateio, 0) <= 0
  )
  SELECT coalesce(d.categoria, 'Sem categoria no Conta Azul'), round(sum(d.valor), 2), count(DISTINCT d.id)
    FROM distribuido d
   GROUP BY 1
   ORDER BY 2 DESC
$$;

REVOKE ALL ON FUNCTION public.conta_azul_revenue_outside_projects(uuid, date, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.conta_azul_payables_by_cost_center(uuid, date, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.conta_azul_payables_by_category(uuid, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.conta_azul_revenue_outside_projects(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_payables_by_cost_center(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_payables_by_category(uuid, date, date) TO authenticated;
