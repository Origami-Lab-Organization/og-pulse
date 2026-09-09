-- PUL-219/221, correção de modelo — serviço igual com modelo de cobrança diferente vira UM
-- serviço com dois modelos. Decisão do Italo em 09/09/2026: "serviços iguais mas apenas com
-- modelo diferente deveriam ficar juntos; se for duplicado pode apagar".
--
-- O QUE ESTAVA ERRADO. O catálogo é Linha → Serviço → Modelo de Cobrança e `services` nunca
-- teve restrição de nome único: `services` só tem a chave primária (verificado em produção).
-- `serviceService.ts` já trata o erro `23505` de unicidade, um erro que o banco nunca podia
-- gerar. Sem a trava, a casa criou um serviço novo a cada modelo de cobrança:
--   * "Consultoria Estratégica" ×2 — um `fixed`, um `recurring`;
--   * "Ventures" ×3 — um sem modelo, um `success_fee`, um `fixed`.
-- Como `service_revenue_models` já é N:1 com `services`, o modelo certo sempre esteve
-- disponível: um serviço, vários modelos.
--
-- REFERÊNCIAS QUE PRECISAM MUDAR DE DONO (levantadas em produção, não presumidas):
--   * `service_revenue_models.service_id` — FK CASCADE. Mover ANTES de apagar, senão o
--     CASCADE leva os modelos junto.
--   * `projects.service_line` e `leads.service_line` — `text` que guarda `service_id`
--     (o nome da coluna mente; ADR-0031). 3 projetos e 2 oportunidades apontam para
--     duplicatas hoje.
--   * `lead_services.service_id` — FK RESTRICT, com UNIQUE (lead_id, service_id): ao
--     reapontar, uma linha que colidiria com o sobrevivente é removida em vez de duplicar.
--   * `budgets.template_for_service_id` — FK SET NULL.
--   * `services.cost_center_id` — o sobrevivente herda o centro do absorvido se estiver sem.
--
-- ESCOPO DA DUPLICATA: mesmo tenant, mesma LINHA de serviço, mesmo nome normalizado. Mesmo
-- nome em linhas diferentes NÃO é duplicata e fica intacto — é o caso de "Captação de
-- recursos" no tenant Pulse Demo Consultoria, que vive em duas linhas distintas.
--
-- APAGAR COM RASTRO. O ADR-0003 diz que nada se apaga; aqui o Italo autorizou apagar a
-- duplicata. Para a exclusão não ser cega, cada absorvido é registrado em
-- `catalog_merge_log` com o que foi movido, antes do DELETE. É o que permite auditar e
-- reconstruir depois.
--
-- Rollback: supabase/rollback/20260910130000_merge_duplicate_services.down.sql

-- ---------------------------------------------------------------------------------------
-- 1. Log da consolidação
-- ---------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.catalog_merge_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merged_at           timestamptz NOT NULL DEFAULT now(),
  tenant_id           uuid        NOT NULL,
  entity              text        NOT NULL,
  survivor_id         uuid        NOT NULL,
  survivor_name       text        NOT NULL,
  merged_id           uuid        NOT NULL,
  merged_name         text        NOT NULL,
  moved_models        integer     NOT NULL DEFAULT 0,
  moved_projects      integer     NOT NULL DEFAULT 0,
  moved_leads         integer     NOT NULL DEFAULT 0,
  moved_lead_services integer     NOT NULL DEFAULT 0,
  moved_budgets       integer     NOT NULL DEFAULT 0,
  reason              text        NOT NULL
);

COMMENT ON TABLE public.catalog_merge_log IS
  'Rastro de consolidação de itens do catálogo (PUL-219/221). Uma linha por item absorvido, '
  'com o que foi movido antes do DELETE. Escrita só por migration; sem policy de propósito.';

ALTER TABLE public.catalog_merge_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_merge_log FROM anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. Consolidação
-- ---------------------------------------------------------------------------------------

DO $$
DECLARE
  -- Linha nula tratada como um valor, senão dois serviços sem linha e mesmo nome não
  -- seriam vistos como duplicata (NULL nunca é igual a NULL).
  c_no_line  uuid := '00000000-0000-0000-0000-000000000000';
  v_group    record;
  v_dup      record;
  v_survivor uuid;
  v_surv_name text;
  v_models   integer;
  v_projects integer;
  v_leads    integer;
  v_ls       integer;
  v_budgets  integer;
  v_merged   integer := 0;
BEGIN
  FOR v_group IN
    SELECT s.tenant_id,
           coalesce(s.service_line_id, c_no_line) AS line_key,
           lower(btrim(s.name))                   AS norm
      FROM public.services s
     GROUP BY s.tenant_id, coalesce(s.service_line_id, c_no_line), lower(btrim(s.name))
    HAVING count(*) > 1
  LOOP
    -- Sobrevivente: o mais usado (projetos + oportunidades apontando), desempate pelo mais
    -- antigo. Mantém o serviço que a operação já referencia, minimizando o que muda.
    SELECT s.id, s.name INTO v_survivor, v_surv_name
      FROM public.services s
     WHERE s.tenant_id = v_group.tenant_id
       AND coalesce(s.service_line_id, c_no_line) = v_group.line_key
       AND lower(btrim(s.name)) = v_group.norm
     ORDER BY (
       (SELECT count(*) FROM public.projects p WHERE p.service_line = s.id::text)
       + (SELECT count(*) FROM public.leads l WHERE l.service_line = s.id::text)
     ) DESC, s.created_at ASC
     LIMIT 1;

    FOR v_dup IN
      SELECT s.id, s.name, s.cost_center_id
        FROM public.services s
       WHERE s.tenant_id = v_group.tenant_id
         AND coalesce(s.service_line_id, c_no_line) = v_group.line_key
         AND lower(btrim(s.name)) = v_group.norm
         AND s.id <> v_survivor
    LOOP
      -- Modelos de cobrança passam para o sobrevivente. Não há unicidade por
      -- (service_id, model_type): dois modelos do mesmo tipo convivem, e é o cadastro que
      -- decide se um deles é redundante.
      UPDATE public.service_revenue_models SET service_id = v_survivor WHERE service_id = v_dup.id;
      GET DIAGNOSTICS v_models = ROW_COUNT;

      UPDATE public.projects SET service_line = v_survivor::text WHERE service_line = v_dup.id::text;
      GET DIAGNOSTICS v_projects = ROW_COUNT;

      UPDATE public.leads SET service_line = v_survivor::text WHERE service_line = v_dup.id::text;
      GET DIAGNOSTICS v_leads = ROW_COUNT;

      -- UNIQUE (lead_id, service_id): o que colidiria com o sobrevivente sai, não duplica.
      DELETE FROM public.lead_services ls
       WHERE ls.service_id = v_dup.id
         AND EXISTS (SELECT 1 FROM public.lead_services k WHERE k.lead_id = ls.lead_id AND k.service_id = v_survivor);
      UPDATE public.lead_services SET service_id = v_survivor WHERE service_id = v_dup.id;
      GET DIAGNOSTICS v_ls = ROW_COUNT;

      UPDATE public.budgets SET template_for_service_id = v_survivor WHERE template_for_service_id = v_dup.id;
      GET DIAGNOSTICS v_budgets = ROW_COUNT;

      -- O sobrevivente herda o centro do absorvido se ainda não tiver um.
      UPDATE public.services
         SET cost_center_id = v_dup.cost_center_id
       WHERE id = v_survivor AND cost_center_id IS NULL AND v_dup.cost_center_id IS NOT NULL;

      INSERT INTO public.catalog_merge_log (
        tenant_id, entity, survivor_id, survivor_name, merged_id, merged_name,
        moved_models, moved_projects, moved_leads, moved_lead_services, moved_budgets, reason
      ) VALUES (
        v_group.tenant_id, 'service', v_survivor, v_surv_name, v_dup.id, v_dup.name,
        v_models, v_projects, v_leads, v_ls, v_budgets,
        'PUL-219: serviço igual com modelo de cobrança diferente vira um serviço com vários modelos'
      );

      DELETE FROM public.services WHERE id = v_dup.id;
      v_merged := v_merged + 1;
      RAISE NOTICE 'servico consolidado: "%" (%) -> "%" (%): % modelo(s), % projeto(s), % oportunidade(s)',
        v_dup.name, v_dup.id, v_surv_name, v_survivor, v_models, v_projects, v_leads;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'consolidacao: % servico(s) absorvido(s)', v_merged;
END $$;

-- ---------------------------------------------------------------------------------------
-- 3. A porta fica fechada
-- ---------------------------------------------------------------------------------------

-- Sem isto, a próxima pessoa que precisar de outro modelo de cobrança cria outro serviço e
-- a duplicata volta. `serviceService.ts` já traduz 23505 para "Já existe um serviço com este
-- nome" — a mensagem existia antes do erro poder acontecer.
CREATE UNIQUE INDEX services_tenant_line_name_key
  ON public.services (
    tenant_id,
    coalesce(service_line_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(name))
  );

COMMENT ON INDEX public.services_tenant_line_name_key IS
  'Um serviço por nome dentro da mesma linha (PUL-219). Modelo de cobrança diferente é outro '
  'service_revenue_models, não outro serviço. Mesmo nome em linhas diferentes é permitido.';
