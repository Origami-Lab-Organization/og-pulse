-- US-0052 — regularizar os clientes atuais, caso a caso (ADR-0056).
--
-- Só o tenant da Origami Lab, pelos ids lidos em produção em 25 e 27/11/2026. Em outro banco
-- (local, preview) as linhas não existem e nada acontece. Idempotente: cada passo só age se a
-- linha ainda está como estava.
--
-- Decisões do Victor (25/11/2026, tabela da história; 27/11/2026, o que o retrato novo mostrou):
--   * Bry e Syngularid: a empresa sem CNPJ é juntada à de CNPJ. O mesmo para as cópias sem CNPJ
--     de Laudo Assist, Retífica Formiguense e Kione (27/11).
--   * Prumo e Tecno2000: ligadas à empresa de mesmo CNPJ.
--   * Facilita Minas, Integrar e Injetoras NS já tinham empresa (com o Ganho), sem CNPJ e solta:
--     liga a existente em vez de criar outra (27/11). 99 e P.IN ganham empresa nova.
--   * UNIFOR-MG: CNPJ corrigido para 20.501.128/0001-46 no cliente e na empresa.
--   * Gfsis e Rodosafra não foram clientes: a empresa recebe o CNPJ do cadastro (27/11) e fica
--     solta; os orçamentos continuam no cadastro. A Base deixa de contar o cadastro como "Já foi
--     cliente" (Edge Function empresas-receita, mesma US).
--   * Transportadora Cabral: "Cliente antes do Pulse", 2024 (US-0051).
--   * BPA Ventures e Origami Lab ficam como estão.
--
-- Os dados da Receita das empresas que ganham CNPJ vêm depois, pela consulta de CNPJ da
-- Prospecção; a página da empresa já lê a Base pelo CNPJ.
--
-- Rollback: supabase/rollback/20261127140000_regularizar_os_clientes_rollback.sql

DO $$
DECLARE
  v_tenant constant uuid := '93e40db0-4946-48ba-b40f-7ee9d02734e0';
  v_par record;
  v_antes bigint[];
  v_depois bigint[];
  v_fora text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
    RETURN;
  END IF;

  SELECT ARRAY[
    (SELECT count(*) FROM public.prospects o JOIN public.prospect_companies pc ON pc.id = o.company_id WHERE pc.tenant_id = v_tenant),
    (SELECT count(*) FROM public.prospect_contacts x JOIN public.prospect_companies pc ON pc.id = x.company_id WHERE pc.tenant_id = v_tenant),
    (SELECT count(*) FROM public.projects WHERE tenant_id = v_tenant),
    (SELECT count(*) FROM public.budgets WHERE tenant_id = v_tenant)
  ] INTO v_antes;

  -- 1. Juntar a cópia sem CNPJ na empresa com CNPJ ------------------------------------------------
  -- Como `juntar_empresas` (US-0050), sem a checagem de sessão, e levando também o estudo da conta.
  FOR v_par IN
    SELECT * FROM (VALUES
      ('62a659b3-81c3-480f-8bec-715f5691d23f'::uuid, 'b1383acc-ce95-4ae7-862f-374cfd31a01f'::uuid), -- Bry
      ('e439f6a3-13f6-4f2c-8daf-ddb76bd70db2'::uuid, 'af07aedb-241c-4b76-9e82-fcffb096f8c0'::uuid), -- Syngularid
      ('41fff296-e29f-4276-8301-92ea8d81c9cb'::uuid, '3a8a2dff-a06f-490e-bec2-266305559e92'::uuid), -- Laudo Assist
      ('dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid, '437a99a4-e61d-4d9e-a9d7-769b2ed857f4'::uuid), -- Retífica Formiguense
      ('206d2b75-70bc-4177-bdee-387055a7e1df'::uuid, '373e1c59-d75f-49b4-89dd-bba1c40cf4db'::uuid)  -- Kione
    ) AS p(de, para)
  LOOP
    CONTINUE WHEN (SELECT count(*) FROM public.prospect_companies
                    WHERE id IN (v_par.de, v_par.para) AND tenant_id = v_tenant) <> 2;

    UPDATE public.prospects SET company_id = v_par.para WHERE company_id = v_par.de;
    UPDATE public.prospect_contacts SET company_id = v_par.para WHERE company_id = v_par.de;
    UPDATE public.prospect_company_faturamentos SET company_id = v_par.para WHERE company_id = v_par.de;
    UPDATE public.prospect_company_estudo SET company_id = v_par.para WHERE company_id = v_par.de;
    DELETE FROM public.prospect_company_partners s
     WHERE s.company_id = v_par.de
       AND EXISTS (SELECT 1 FROM public.prospect_company_partners t WHERE t.company_id = v_par.para AND t.nome = s.nome);
    UPDATE public.prospect_company_partners SET company_id = v_par.para WHERE company_id = v_par.de;

    UPDATE public.prospect_companies p
       SET client_id = d.client_id
      FROM public.prospect_companies d
     WHERE p.id = v_par.para AND d.id = v_par.de
       AND p.client_id IS NULL AND d.client_id IS NOT NULL;

    DELETE FROM public.prospect_companies WHERE id = v_par.de;
  END LOOP;

  -- 2. Ligar a empresa que já existe ao cliente ----------------------------------------------------
  -- A empresa recebe o CNPJ e a razão social do cadastro quando não tem; o gatilho da US-0045
  -- copia a identificação dela para o cliente.
  UPDATE public.prospect_companies pc
     SET cnpj = coalesce(pc.cnpj, nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), '')),
         razao_social = coalesce(pc.razao_social, c.company_name),
         client_id = c.id
    FROM public.clients c,
         (VALUES
           ('acdf5260-9b61-47f4-a18e-0d9772d8d523'::uuid, 'b488935c-2052-4600-bba0-ab96177ed648'::uuid), -- Prumo Engenharia
           ('b9932a23-9b8b-458e-98d8-d8c42da3eab2'::uuid, '0c89bfde-c874-4ac7-835f-d150f534607d'::uuid), -- Tecno2000
           ('48c794db-3050-4614-9b6d-7aaceda1790d'::uuid, 'e325b440-c8af-4dcf-a463-fde3426a092c'::uuid), -- Facilita Minas
           ('748eef2c-676f-43da-9010-37b15dd05300'::uuid, 'f0634892-9706-4c90-b734-187988fb3304'::uuid), -- Integrar
           ('c5637609-5bf6-45af-8d1d-19bcc7183be3'::uuid, 'fdd27a49-b6fb-4541-8e5c-93481e827265'::uuid)  -- Injetoras NS
         ) AS l(empresa, cliente)
   WHERE pc.id = l.empresa AND c.id = l.cliente
     AND pc.tenant_id = v_tenant AND c.tenant_id = v_tenant
     AND pc.client_id IS NULL;

  -- 3. Criar a empresa do cliente que não tem ------------------------------------------------------
  INSERT INTO public.prospect_companies (tenant_id, name, razao_social, cnpj, client_id)
  SELECT c.tenant_id,
         coalesce(nullif(btrim(c.trading_name), ''), c.company_name),
         c.company_name,
         nullif(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), ''),
         c.id
    FROM public.clients c
   WHERE c.id IN ('46a5a511-0840-45fb-aa18-bb6fd86e1537',  -- 99
                  '98d1541b-5b06-4e8a-9df4-dca0c4dd028b')  -- P.IN
     AND c.tenant_id = v_tenant
     AND NOT EXISTS (SELECT 1 FROM public.prospect_companies pc WHERE pc.client_id = c.id);

  -- 4. UNIFOR-MG: o CNPJ completo, no cliente e na empresa ----------------------------------------
  UPDATE public.clients
     SET cnpj = '20501128000146'
   WHERE id = '75d16bea-d1e1-4e35-bcb2-0301dc146489' AND tenant_id = v_tenant
     AND cnpj = '20.501.128/0001-4';
  UPDATE public.prospect_companies
     SET cnpj = '20501128000146'
   WHERE id = 'a5e475d4-fb8c-4da8-9ada-00dac850ea1b' AND tenant_id = v_tenant
     AND cnpj IS NULL;

  -- 5. Gfsis e Rodosafra: só empresa, com o CNPJ do cadastro --------------------------------------
  UPDATE public.prospect_companies pc
     SET cnpj = v.cnpj
    FROM (VALUES
           ('698a8d64-0bf3-4f45-b3ea-e2f079b3c9ba'::uuid, '54069632000130'), -- GFSIS
           ('c0665b1f-3af8-42f7-a65f-334337155026'::uuid, '26549889000901')  -- Rodosafra (filial)
         ) AS v(empresa, cnpj)
   WHERE pc.id = v.empresa AND pc.tenant_id = v_tenant AND pc.cnpj IS NULL;

  -- 6. Transportadora Cabral: cliente antes do Pulse, 2024 ----------------------------------------
  INSERT INTO public.prospect_marcas_da_empresa (tenant_id, cnpj, empresa_nome, cidade, estado, cliente_antes_do_pulse)
  VALUES (v_tenant, '20504114000186', 'Transportadora Cabral', 'Formiga', 'MG', 2024)
  ON CONFLICT (tenant_id, cnpj_raiz) DO UPDATE
     SET cliente_antes_do_pulse = coalesce(public.prospect_marcas_da_empresa.cliente_antes_do_pulse, 2024);

  -- 7. Provas: nada se perdeu, e cada cliente da carteira tem uma empresa --------------------------
  SELECT ARRAY[
    (SELECT count(*) FROM public.prospects o JOIN public.prospect_companies pc ON pc.id = o.company_id WHERE pc.tenant_id = v_tenant),
    (SELECT count(*) FROM public.prospect_contacts x JOIN public.prospect_companies pc ON pc.id = x.company_id WHERE pc.tenant_id = v_tenant),
    (SELECT count(*) FROM public.projects WHERE tenant_id = v_tenant),
    (SELECT count(*) FROM public.budgets WHERE tenant_id = v_tenant)
  ] INTO v_depois;
  IF v_antes IS DISTINCT FROM v_depois THEN
    RAISE EXCEPTION 'US-0052: contagens mudaram (Oportunidades, contatos, projetos, orçamentos): % -> %', v_antes, v_depois;
  END IF;

  SELECT string_agg(coalesce(c.trading_name, c.company_name) || ' (' || n.empresas || ')', ', ')
    INTO v_fora
    FROM public.clients c
    CROSS JOIN LATERAL (SELECT count(*) AS empresas FROM public.prospect_companies pc WHERE pc.client_id = c.id) n
   WHERE c.tenant_id = v_tenant
     AND n.empresas <> 1
     AND (EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = c.id)
          OR EXISTS (SELECT 1 FROM public.prospects o JOIN public.prospect_companies pc ON pc.id = o.company_id
                      WHERE pc.client_id = c.id AND o.stage = 'ganho')
          OR EXISTS (SELECT 1 FROM public.prospect_marcas_da_empresa m
                      WHERE m.tenant_id = v_tenant AND m.cliente_antes_do_pulse IS NOT NULL
                        AND m.cnpj_raiz = left(regexp_replace(coalesce(c.cnpj, ''), '\D', '', 'g'), 8)));
  IF v_fora IS NOT NULL THEN
    RAISE EXCEPTION 'US-0052: clientes da carteira sem exatamente uma empresa: %', v_fora;
  END IF;
END;
$$;
