-- Rollback da US-0052 (20261127140000_regularizar_os_clientes.sql). Só o tenant da Origami.
--
-- Desfaz a estrutura: recria as cinco cópias juntadas e devolve a elas as Oportunidades e os
-- contatos que eram delas (ids lidos em 27/11/2026), solta as empresas ligadas, apaga as criadas,
-- tira os CNPJs gravados e a marca da Transportadora Cabral.
--
-- Não volta a identificação que o gatilho da US-0045 copiou da empresa para o cliente ao ligar
-- (razão social, nome fantasia, endereço da Receita): sem dado de cliente neste repositório.
-- A regra da relação volta revertendo a Edge Function empresas-receita.

DO $$
DECLARE
  v_tenant constant uuid := '93e40db0-4946-48ba-b40f-7ee9d02734e0';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant) THEN
    RETURN;
  END IF;

  -- 1. As cópias voltam, com o que era delas.
  INSERT INTO public.prospect_companies (id, tenant_id, name, client_id, created_by, created_at)
  VALUES
    ('62a659b3-81c3-480f-8bec-715f5691d23f', v_tenant, 'Bry', '150a61d9-f322-4b29-bf99-ed526e17c23d', '3306abba-362a-449d-a9f8-2c29a58a05db', '2026-02-21 17:39:02.69726+00'),
    ('e439f6a3-13f6-4f2c-8daf-ddb76bd70db2', v_tenant, 'Syngular Id', '0700da9b-df91-4ef7-9fcc-8a0c49c5df3b', '3306abba-362a-449d-a9f8-2c29a58a05db', '2026-02-21 17:16:52.040502+00'),
    ('41fff296-e29f-4276-8301-92ea8d81c9cb', v_tenant, 'LaudoAssist', NULL, '6819355f-d8c3-4c4c-8a32-7e5be34896f2', '2026-03-02 18:17:09.511303+00'),
    ('dfc4234e-679a-4fdf-9cbd-40dadccc39b8', v_tenant, 'Retífica Formiguense', NULL, '785f6001-9b92-4852-9a0f-631a0e4e9a1f', '2026-09-17 14:34:05.934214+00'),
    ('206d2b75-70bc-4177-bdee-387055a7e1df', v_tenant, 'Kione', NULL, '3306abba-362a-449d-a9f8-2c29a58a05db', '2026-03-18 12:12:11.555835+00')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.prospects o SET company_id = v.empresa
    FROM (VALUES
      ('649dba42-55a5-4805-8e26-88e720095095'::uuid, '62a659b3-81c3-480f-8bec-715f5691d23f'::uuid),
      ('fb084f25-ebb5-4329-b805-58c31d8b5774'::uuid, 'e439f6a3-13f6-4f2c-8daf-ddb76bd70db2'::uuid),
      ('7a9daacc-e553-411f-b44e-eff868b22590'::uuid, '41fff296-e29f-4276-8301-92ea8d81c9cb'::uuid),
      ('b6415da2-62d5-45bb-9af2-640efeeb1940'::uuid, 'dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid),
      ('1da43353-0440-4c0c-9dc4-54b6ea658b9f'::uuid, 'dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid),
      ('1c4d7094-25fa-45a3-93f9-bddb62fb46d1'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid),
      ('33b9b2fc-303c-4433-94d5-27169b25dd0f'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid),
      ('c2b315c0-6681-47e9-9867-cb26f74485a8'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid)
    ) AS v(oportunidade, empresa)
   WHERE o.id = v.oportunidade;

  UPDATE public.prospect_contacts x SET company_id = v.empresa
    FROM (VALUES
      ('1f72e2f3-3125-4292-80a7-8ef6cad4c57e'::uuid, '62a659b3-81c3-480f-8bec-715f5691d23f'::uuid),
      ('d27e73b5-d95e-4f64-a1b5-5aebf35e864c'::uuid, 'e439f6a3-13f6-4f2c-8daf-ddb76bd70db2'::uuid),
      ('bba0830f-6455-4095-9dff-fcbbd0982698'::uuid, 'e439f6a3-13f6-4f2c-8daf-ddb76bd70db2'::uuid),
      ('ed109c75-901a-43cb-881a-ec54490caf56'::uuid, '41fff296-e29f-4276-8301-92ea8d81c9cb'::uuid),
      ('d098b80d-0cf3-4335-9cfa-7b0a5eb0be78'::uuid, 'dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid),
      ('9c33c7e7-b651-4673-8e6f-2b27c260b31e'::uuid, 'dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid),
      ('6d18c276-3a47-40fc-be79-cf31c8ba5226'::uuid, 'dfc4234e-679a-4fdf-9cbd-40dadccc39b8'::uuid),
      ('8d97fb49-49c6-48e1-86cb-e09579df669a'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid),
      ('55c175d5-da07-41cb-aa97-6c01cdd83cc9'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid),
      ('587831bb-4e00-439a-97a2-8f48c70e064a'::uuid, '206d2b75-70bc-4177-bdee-387055a7e1df'::uuid)
    ) AS v(contato, empresa)
   WHERE x.id = v.contato;

  -- 2. As empresas ligadas voltam a ficar soltas; Facilita e Integrar sem CNPJ nem razão social.
  UPDATE public.prospect_companies SET client_id = NULL
   WHERE tenant_id = v_tenant
     AND id IN ('acdf5260-9b61-47f4-a18e-0d9772d8d523', 'b9932a23-9b8b-458e-98d8-d8c42da3eab2',
                '48c794db-3050-4614-9b6d-7aaceda1790d', '748eef2c-676f-43da-9010-37b15dd05300',
                'c5637609-5bf6-45af-8d1d-19bcc7183be3');
  UPDATE public.prospect_companies SET cnpj = NULL, razao_social = NULL
   WHERE tenant_id = v_tenant
     AND id IN ('48c794db-3050-4614-9b6d-7aaceda1790d', '748eef2c-676f-43da-9010-37b15dd05300');

  -- 3. As empresas criadas para a 99 e a P.IN saem.
  DELETE FROM public.prospect_companies
   WHERE tenant_id = v_tenant
     AND client_id IN ('46a5a511-0840-45fb-aa18-bb6fd86e1537', '98d1541b-5b06-4e8a-9df4-dca0c4dd028b')
     AND NOT EXISTS (SELECT 1 FROM public.prospects o WHERE o.company_id = prospect_companies.id)
     AND NOT EXISTS (SELECT 1 FROM public.prospect_contacts x WHERE x.company_id = prospect_companies.id);

  -- 4. UNIFOR-MG, GFSIS e Rodosafra sem o CNPJ gravado.
  UPDATE public.prospect_companies SET cnpj = NULL
   WHERE tenant_id = v_tenant
     AND id IN ('a5e475d4-fb8c-4da8-9ada-00dac850ea1b', '698a8d64-0bf3-4f45-b3ea-e2f079b3c9ba',
                'c0665b1f-3af8-42f7-a65f-334337155026');
  UPDATE public.clients SET cnpj = '20.501.128/0001-4'
   WHERE id = '75d16bea-d1e1-4e35-bcb2-0301dc146489' AND tenant_id = v_tenant;

  -- 5. A marca da Transportadora Cabral sai.
  DELETE FROM public.prospect_marcas_da_empresa
   WHERE tenant_id = v_tenant AND cnpj_raiz = '20504114' AND NOT parceiro;
  UPDATE public.prospect_marcas_da_empresa SET cliente_antes_do_pulse = NULL
   WHERE tenant_id = v_tenant AND cnpj_raiz = '20504114';
END;
$$;
