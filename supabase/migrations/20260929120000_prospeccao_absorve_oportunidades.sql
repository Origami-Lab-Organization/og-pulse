-- Prospecção absorve Oportunidades (29/09/2026).
--
-- Pedido de 29/09/2026 (Italo): o item "Oportunidades" (/pipeline, tabela `leads`) sai do
-- menu Comercial, e tudo o que estava nele passa para a Prospecção — que desde 28/09 já é o
-- quadro comercial de ponta a ponta, do primeiro toque ao Ganho ou à Perda
-- (20260928200000). Decisões tomadas com ele:
--
--   1. ORÇAMENTO nasce do contato da Prospecção: `budgets.prospect_id` (um orçamento por
--      contato, como era um por oportunidade). O valor do contato segue o ADR-0017 —
--      orçamento com total > 0, senão o valor estimado.
--   2. GANHO oferece criar o Projeto: `projects.prospect_id` substitui `projects.lead_id`.
--   3. O essencial da oportunidade ganha campo no contato: `estimated_value`, `notes` e
--      `competitor_name`. Título, serviços, Stand By e observação de arquivamento vão como
--      texto para `notes` — nada fica para trás.
--   4. O legado sai de vez: `leads` e `lead_*`, a RPC `get_crm_received_value`, o cron de
--      lembrete e as capacidades `pipeline:*`.
--
-- ARQUIVO ANTES DO DROP. Uma cópia fiel de `leads` e das filhas fica no schema
-- `legado_oportunidades`, fora da API (PostgREST expõe só `public`) e sem GRANT para anon ou
-- authenticated. É o que permite reverter (supabase/rollback/...) e conferir a migração
-- depois. Apagar o schema é uma linha, numa onda seguinte, quando ninguém mais precisar.
--
-- DE-PARA DE ETAPA (`leads.crm_stage` -> `prospects.stage`):
--   screening (Prospecção/Oportunidade) -> respondeu        — há conversa, sem reunião
--   qualification (Qualificação)         -> reuniao_feita
--   proposal / negotiation               -> qualificado      — Oportunidade qualificada
--   closed (Fechado - Ganho)             -> ganho            — won_on = dia do fechamento
--   closed_lost, ou arquivada            -> descartado       — Perda, com motivo
--   stand_by                             -> a etapa de retorno guardada (e o Stand By vai
--                                           para as observações)
--
-- DE-PARA DE MOTIVO (`archive_reason` -> `discard_reason`, lista fechada):
--   price -> proposta_preco, competitor -> concorrente, no_budget -> sem_orcamento,
--   deadline e canceled -> momento_errado, out_of_portfolio -> sem_fit,
--   other e sem motivo -> sem_interesse (o texto original vai para as observações).
--
-- DE-PARA DE ORIGEM (`source` -> `lever`): indicacao -> recomendacao, evento -> feira,
--   parceiro -> indicacao_parceiros, abordagem_direta -> outbound, inbound e expansao iguais,
--   outro e vazio -> sem alavanca.
--
-- CONTATO QUE JÁ VEIO DA PROSPECÇÃO (`leads.prospect_id` ou `prospects.converted_lead_id`)
-- não duplica: a oportunidade volta para dentro do contato de origem, que sai de
-- "Convertido". Os demais viram contato novo, em empresa reaproveitada pela ordem cliente ->
-- CNPJ do cliente -> nome idêntico (a mesma de `apps/mcp-prospeccao/src/duplicidade.ts`),
-- ou em empresa nova.
--
-- HISTÓRICO SÓ COM DATA REAL (a regra de 20260928120000): cadastro na data da oportunidade,
-- cada mudança de etapa registrada em `lead_activity_log` e o desfecho entram como
-- `reconstruido`. Os triggers de histórico, cadência e desfecho ficam desligados durante a
-- cópia — é migração de dado, não movimento de contato, e deixá-los ligados gravaria tudo
-- com a data de hoje.
--
-- ANEXOS: os arquivos continuam no bucket `lead-attachments`; cada anexo migrado leva
-- `"bucket": "lead-attachments"` e a tela lê de lá. Copiar objeto de storage não é coisa que
-- SQL faça com segurança. A policy do bucket passa a exigir as capacidades da Prospecção,
-- iguais às de `prospect-attachments` — hoje ela aceitava qualquer membro do tenant.
--
-- Rollback: supabase/rollback/20260929120000_prospeccao_absorve_oportunidades_rollback.sql

-- ---------------------------------------------------------------------------
-- 0. Arquivo do legado
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS legado_oportunidades;
REVOKE ALL ON SCHEMA legado_oportunidades FROM PUBLIC;

CREATE TABLE legado_oportunidades.leads             AS TABLE public.leads;
CREATE TABLE legado_oportunidades.lead_interactions AS TABLE public.lead_interactions;
CREATE TABLE legado_oportunidades.lead_follow_ups   AS TABLE public.lead_follow_ups;
CREATE TABLE legado_oportunidades.lead_services     AS TABLE public.lead_services;
CREATE TABLE legado_oportunidades.lead_activity_log AS TABLE public.lead_activity_log;
CREATE TABLE legado_oportunidades.projects_lead_id  AS
  SELECT id AS project_id, lead_id FROM public.projects WHERE lead_id IS NOT NULL;
-- Os contatos convertidos como estavam: a oportunidade volta para dentro deles (seção 6).
CREATE TABLE legado_oportunidades.prospects_convertidos AS
  SELECT * FROM public.prospects WHERE converted_lead_id IS NOT NULL;
-- As capacidades do Pipeline e quem as tinha.
CREATE TABLE legado_oportunidades.capabilities AS
  SELECT * FROM public.capabilities WHERE key IN ('pipeline:ler', 'pipeline:editar');
CREATE TABLE legado_oportunidades.role_capabilities AS
  SELECT * FROM public.role_capabilities WHERE capability IN ('pipeline:ler', 'pipeline:editar');
CREATE TABLE legado_oportunidades.user_capability_overrides AS
  SELECT * FROM public.user_capability_overrides WHERE capability IN ('pipeline:ler', 'pipeline:editar');
CREATE TABLE legado_oportunidades.default_role_capabilities AS
  SELECT * FROM public.default_role_capabilities WHERE capability IN ('pipeline:ler', 'pipeline:editar');

-- Quando a migração rodou: o rollback reconhece por esta hora o que ela gravou.
CREATE TABLE legado_oportunidades.execucao AS SELECT now() AS em;

COMMENT ON SCHEMA legado_oportunidades IS
  'Cópia fiel do Pipeline de Oportunidades (leads e lead_*) no dia em que ele foi absorvido '
  'pela Prospecção (20260929120000). Fora da API. Base do rollback e da conferência.';

-- ---------------------------------------------------------------------------
-- 1. O contato ganha o essencial da oportunidade
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS estimated_value numeric(14, 2),
  ADD COLUMN IF NOT EXISTS notes           text,
  ADD COLUMN IF NOT EXISTS competitor_name text;

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_estimated_value_valid
    CHECK (estimated_value IS NULL OR estimated_value >= 0),
  ADD CONSTRAINT prospects_notes_length
    CHECK (notes IS NULL OR char_length(notes) <= 10000),
  ADD CONSTRAINT prospects_competitor_name_length
    CHECK (competitor_name IS NULL OR char_length(competitor_name) <= 160);

COMMENT ON TABLE public.prospects IS
  'Contatos do quadro comercial (15/09/2026), do primeiro toque ao Ganho ou à Perda. Desde '
  '29/09/2026 absorve o antigo Pipeline de Oportunidades: valor estimado, observações, '
  'concorrente, orçamento (budgets.prospect_id) e projeto (projects.prospect_id).';
COMMENT ON COLUMN public.prospects.estimated_value IS
  'Valor estimado do negócio, antes de haver orçamento. O valor do contato é o total do '
  'orçamento quando > 0, senão este (ADR-0017). No Ganho, o valor vendido é won_value.';
COMMENT ON COLUMN public.prospects.notes IS
  'Observações livres do contato. Recebeu, na migração de 29/09/2026, título, serviços, Stand '
  'By e observação de arquivamento da oportunidade de origem.';
COMMENT ON COLUMN public.prospects.competitor_name IS
  'Concorrente na disputa, quando houver. Texto livre, como era em leads.competitor_name.';

-- ---------------------------------------------------------------------------
-- 2. Orçamento e projeto passam a apontar para o contato
-- ---------------------------------------------------------------------------

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL;

-- Um orçamento por contato, como era um por oportunidade: as revisões são versões do
-- mesmo orçamento (budget_versions), não orçamentos novos.
CREATE UNIQUE INDEX IF NOT EXISTS budgets_prospect_id_key
  ON public.budgets (prospect_id)
  WHERE prospect_id IS NOT NULL;

COMMENT ON COLUMN public.budgets.prospect_id IS
  'Contato da Prospecção de onde o orçamento nasceu. Substitui leads.budget_id (29/09/2026).';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS projects_prospect_id_idx
  ON public.projects (prospect_id)
  WHERE prospect_id IS NOT NULL;

COMMENT ON COLUMN public.projects.prospect_id IS
  'Contato da Prospecção cujo Ganho originou o projeto. Substitui projects.lead_id (29/09/2026).';

-- ---------------------------------------------------------------------------
-- 3. De-paras
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _etapa (crm_stage text PRIMARY KEY, stage text NOT NULL) ON COMMIT DROP;
INSERT INTO _etapa VALUES
  ('screening', 'respondeu'),
  ('qualification', 'reuniao_feita'),
  ('proposal', 'qualificado'),
  ('negotiation', 'qualificado'),
  ('closed', 'ganho'),
  ('closed_lost', 'descartado');

CREATE TEMP TABLE _motivo (archive_reason text PRIMARY KEY, discard_reason text NOT NULL) ON COMMIT DROP;
INSERT INTO _motivo VALUES
  ('price', 'proposta_preco'),
  ('competitor', 'concorrente'),
  ('no_budget', 'sem_orcamento'),
  ('deadline', 'momento_errado'),
  ('canceled', 'momento_errado'),
  ('out_of_portfolio', 'sem_fit'),
  ('other', 'sem_interesse');

CREATE TEMP TABLE _alavanca (source text PRIMARY KEY, lever text NOT NULL) ON COMMIT DROP;
INSERT INTO _alavanca VALUES
  ('indicacao', 'recomendacao'),
  ('evento', 'feira'),
  ('parceiro', 'indicacao_parceiros'),
  ('abordagem_direta', 'outbound'),
  ('inbound', 'inbound'),
  ('expansao', 'expansao');

-- Rótulos da interface antiga, só para escrever as observações em português.
CREATE TEMP TABLE _rotulo (crm_stage text PRIMARY KEY, label text NOT NULL) ON COMMIT DROP;
INSERT INTO _rotulo VALUES
  ('screening', 'Prospecção/Oportunidade'),
  ('qualification', 'Qualificação'),
  ('proposal', 'Proposta Enviada'),
  ('negotiation', 'Negociação'),
  ('closed', 'Fechado - Ganho'),
  ('closed_lost', 'Perdido'),
  ('stand_by', 'Stand By');

-- Autoria: `leads.created_by` não tem FK e guarda ora o id do funcionário, ora o auth_id.
CREATE TEMP TABLE _autor ON COMMIT DROP AS
SELECT l.id AS lead_id,
       (SELECT e.id FROM public.employees e
         WHERE e.tenant_id = l.tenant_id AND (e.id = l.created_by OR e.auth_id = l.created_by)
         ORDER BY (e.id = l.created_by) DESC
         LIMIT 1) AS employee_id
  FROM public.leads l;

-- ---------------------------------------------------------------------------
-- 4. Uma linha por oportunidade, com tudo já traduzido
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _op ON COMMIT DROP AS
SELECT
  l.id                                   AS lead_id,
  l.tenant_id,
  -- Contato de origem, quando a oportunidade veio da Prospecção.
  COALESCE(
    (SELECT p.id FROM public.prospects p WHERE p.id = l.prospect_id AND p.tenant_id = l.tenant_id),
    (SELECT p.id FROM public.prospects p
      WHERE p.converted_lead_id = l.id AND p.tenant_id = l.tenant_id
      ORDER BY p.created_at LIMIT 1)
  )                                      AS origem_id,
  l.client_id,
  c.cnpj                                 AS client_cnpj,
  btrim(COALESCE(NULLIF(btrim(l.company_name), ''), NULLIF(btrim(c.company_name), ''), l.name))
                                         AS empresa,
  COALESCE(NULLIF(btrim(l.contact_name), ''), NULLIF(btrim(c.contact_name), ''),
           'Contato de ' || btrim(COALESCE(NULLIF(btrim(l.company_name), ''), l.name)))
                                         AS contato,
  NULLIF(btrim(l.contact_email), '')     AS email,
  NULLIF(btrim(l.contact_phone), '')     AS telefone,
  l.responsible_id                       AS owner_id,
  a.lever,
  CASE
    WHEN l.archived OR l.crm_stage = 'closed_lost' THEN 'descartado'
    WHEN l.crm_stage = 'stand_by' THEN COALESCE(rs.stage, 'respondeu')
    ELSE COALESCE(e.stage, 'respondeu')
  END                                    AS stage,
  l.estimated_value,
  NULLIF(btrim(l.competitor_name), '')   AS competitor_name,
  l.budget_id,
  l.created_at,
  au.employee_id                         AS created_by,
  l.first_touch_at,
  l.closed_at,
  COALESCE(l.lost_at, l.archived_at, l.updated_at) AS perdido_em,
  COALESCE(m.discard_reason, 'sem_interesse')      AS discard_reason,
  -- Observações: o que não tem campo próprio no contato, em texto, com rótulo.
  NULLIF(concat_ws(E'\n\n',
    'Oportunidade: ' || l.name,
    NULLIF(btrim(l.notes), ''),
    (SELECT 'Serviços: ' || string_agg(s.name, ', ' ORDER BY s.name)
       FROM public.lead_services ls JOIN public.services s ON s.id = ls.service_id
      WHERE ls.lead_id = l.id),
    CASE WHEN l.crm_stage = 'stand_by' THEN
      'Estava em Stand By desde ' || to_char(l.stand_by_since AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY')
      || COALESCE(', para voltar a ' || rr.label, '') || '.'
    END,
    CASE WHEN l.archived AND l.crm_stage NOT IN ('closed_lost') THEN
      'Arquivada na etapa ' || COALESCE(ro.label, l.crm_stage) || '.'
    END,
    CASE WHEN l.archive_reason = 'other' OR (l.archived AND l.archive_reason IS NULL) THEN
      'Motivo da perda na época: outro.'
    END,
    'Observação da perda: ' || NULLIF(btrim(l.archive_notes), '')
  ), '')                                 AS notes,
  -- ADR-0017: orçamento com total > 0, senão estimativa. É o valor do Ganho.
  COALESCE(NULLIF(b.final_total, 0), NULLIF(l.estimated_value, 0)) AS valor_resolvido
FROM public.leads l
LEFT JOIN public.clients c    ON c.id = l.client_id
LEFT JOIN public.budgets b    ON b.id = l.budget_id
LEFT JOIN _etapa e            ON e.crm_stage = l.crm_stage
LEFT JOIN _etapa rs           ON rs.crm_stage = l.stand_by_return_stage
LEFT JOIN _rotulo rr          ON rr.crm_stage = l.stand_by_return_stage
LEFT JOIN _rotulo ro          ON ro.crm_stage = l.crm_stage
LEFT JOIN _motivo m           ON m.archive_reason = l.archive_reason
LEFT JOIN _alavanca a         ON a.source = l.source
LEFT JOIN _autor au           ON au.lead_id = l.id;

ALTER TABLE _op ADD COLUMN prospect_id uuid, ADD COLUMN company_id uuid;

-- A mesma oportunidade não pode voltar para dois contatos, nem dois contatos de origem
-- para a mesma oportunidade: guarda explícita, que derruba o build com mensagem legível.
DO $$
BEGIN
  IF EXISTS (SELECT origem_id FROM _op WHERE origem_id IS NOT NULL GROUP BY origem_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Contato de prospecção ligado a mais de uma oportunidade — resolver antes de migrar.';
  END IF;
END $$;

-- Oportunidade que veio da Prospecção volta para o contato de origem.
UPDATE _op o
   SET prospect_id = o.origem_id,
       company_id  = p.company_id
  FROM public.prospects p
 WHERE p.id = o.origem_id;

-- ---------------------------------------------------------------------------
-- 5. Empresas
-- ---------------------------------------------------------------------------

-- Reaproveita, na ordem: empresa já ligada ao mesmo cliente, CNPJ do cliente, nome idêntico
-- — só quando há UM candidato. Com dois homônimos, cria-se empresa nova em vez de adivinhar.
UPDATE _op o
   SET company_id = (
     SELECT pc.id FROM public.prospect_companies pc
      WHERE pc.tenant_id = o.tenant_id AND pc.client_id = o.client_id
      ORDER BY pc.created_at LIMIT 1)
 WHERE o.company_id IS NULL AND o.client_id IS NOT NULL;

UPDATE _op o
   SET company_id = pc.id
  FROM public.prospect_companies pc
 WHERE o.company_id IS NULL
   AND o.client_cnpj IS NOT NULL
   AND pc.tenant_id = o.tenant_id
   AND pc.cnpj = regexp_replace(o.client_cnpj, '\D', '', 'g');

UPDATE _op o
   SET company_id = u.id
  FROM (
    SELECT tenant_id, lower(btrim(name)) AS norm, (array_agg(id))[1] AS id
      FROM public.prospect_companies
     GROUP BY tenant_id, lower(btrim(name))
    HAVING count(*) = 1
  ) u
 WHERE o.company_id IS NULL
   AND u.tenant_id = o.tenant_id
   AND u.norm = lower(o.empresa);

-- As que sobram: uma empresa nova por (tenant, nome), compartilhada entre as oportunidades
-- dela. O CNPJ do cliente só vai junto se ainda não estiver em outra empresa do tenant.
CREATE TEMP TABLE _empresa_nova ON COMMIT DROP AS
SELECT DISTINCT ON (o.tenant_id, lower(o.empresa))
       gen_random_uuid()   AS id,
       o.tenant_id,
       left(o.empresa, 160) AS name,
       lower(o.empresa)    AS norm,
       o.client_id,
       CASE
         WHEN regexp_replace(COALESCE(o.client_cnpj, ''), '\D', '', 'g') ~ '^[0-9]{14}$'
          AND NOT EXISTS (
            SELECT 1 FROM public.prospect_companies pc
             WHERE pc.tenant_id = o.tenant_id
               AND pc.cnpj = regexp_replace(o.client_cnpj, '\D', '', 'g'))
         THEN regexp_replace(o.client_cnpj, '\D', '', 'g')
       END                 AS cnpj,
       o.created_by,
       o.created_at
  FROM _op o
 WHERE o.company_id IS NULL
 ORDER BY o.tenant_id, lower(o.empresa), o.client_id NULLS LAST, o.created_at;

-- Duas empresas novas com o mesmo CNPJ (dois nomes para o mesmo cliente): só a primeira
-- fica com ele — o índice único recusaria a segunda.
UPDATE _empresa_nova n
   SET cnpj = NULL
 WHERE cnpj IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM _empresa_nova k
      WHERE k.tenant_id = n.tenant_id AND k.cnpj = n.cnpj
        AND (k.created_at, k.id::text) < (n.created_at, n.id::text));

INSERT INTO public.prospect_companies (id, tenant_id, name, cnpj, client_id, created_by, created_at)
SELECT id, tenant_id, name, cnpj, client_id, created_by, created_at
  FROM _empresa_nova;

UPDATE _op o
   SET company_id = n.id
  FROM _empresa_nova n
 WHERE o.company_id IS NULL
   AND n.tenant_id = o.tenant_id
   AND n.norm = lower(o.empresa);

UPDATE _op SET prospect_id = gen_random_uuid() WHERE prospect_id IS NULL;

-- O de-para fica no arquivo: é por ele que se confere a migração e se desfaz.
CREATE TABLE legado_oportunidades.de_para AS
  SELECT lead_id, prospect_id, company_id, origem_id IS NOT NULL AS contato_existente
    FROM _op;
CREATE TABLE legado_oportunidades.empresas_criadas AS
  SELECT id AS company_id FROM _empresa_nova;

-- ---------------------------------------------------------------------------
-- 6. Contatos — triggers de histórico, cadência e desfecho desligados
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DISABLE TRIGGER prospect_stage_changes_on_insert;
ALTER TABLE public.prospects DISABLE TRIGGER prospect_stage_changes_on_update;
ALTER TABLE public.prospects DISABLE TRIGGER prospects_outcome_rules;
ALTER TABLE public.prospects DISABLE TRIGGER prospects_protect_first_touch;
ALTER TABLE public.prospect_activities DISABLE TRIGGER prospect_activities_set_sequence;
ALTER TABLE public.prospect_activities DISABLE TRIGGER prospect_activities_advance;

-- Canal principal: o mais usado nas interações da oportunidade; sem interação, e-mail.
CREATE TEMP TABLE _canal ON COMMIT DROP AS
SELECT DISTINCT ON (lead_id) lead_id, channel
  FROM public.lead_interactions
 GROUP BY lead_id, channel
 ORDER BY lead_id, count(*) DESC, max(interaction_date) DESC;

-- Contatos novos.
INSERT INTO public.prospects (
  id, tenant_id, company_id, contact_name, contact_email, contact_phone, primary_channel,
  owner_id, lever, stage, next_activity_on, discard_reason, discarded_at, won_on, won_value,
  closed_at, estimated_value, notes, competitor_name, created_by, created_at
)
SELECT
  o.prospect_id, o.tenant_id, o.company_id, o.contato, o.email, o.telefone,
  COALESCE(cn.channel, 'email'),
  o.owner_id, o.lever, o.stage,
  NULL,
  CASE WHEN o.stage = 'descartado' THEN o.discard_reason END,
  CASE WHEN o.stage = 'descartado' THEN o.perdido_em END,
  CASE WHEN o.stage = 'ganho'
       THEN (COALESCE(o.closed_at, o.created_at) AT TIME ZONE 'America/Sao_Paulo')::date END,
  CASE WHEN o.stage = 'ganho' THEN o.valor_resolvido END,
  CASE WHEN o.stage = 'ganho' THEN COALESCE(o.closed_at, o.created_at)
       WHEN o.stage = 'descartado' THEN o.perdido_em END,
  NULLIF(o.estimated_value, 0), o.notes, o.competitor_name, o.created_by, o.created_at
  FROM _op o
  LEFT JOIN _canal cn ON cn.lead_id = o.lead_id
 WHERE o.origem_id IS NULL;

-- Contatos de origem: recebem a oportunidade e saem de "Convertido". Dado do contato que já
-- existia prevalece; o da oportunidade só preenche o que estava vazio.
UPDATE public.prospects p
   SET stage            = o.stage,
       owner_id         = COALESCE(o.owner_id, p.owner_id),
       contact_email    = COALESCE(p.contact_email, o.email),
       contact_phone    = COALESCE(p.contact_phone, o.telefone),
       lever            = COALESCE(p.lever, o.lever),
       next_activity_on = NULL,
       discard_reason   = CASE WHEN o.stage = 'descartado' THEN o.discard_reason END,
       discarded_at     = CASE WHEN o.stage = 'descartado' THEN o.perdido_em END,
       won_on           = CASE WHEN o.stage = 'ganho'
                               THEN (COALESCE(o.closed_at, o.created_at) AT TIME ZONE 'America/Sao_Paulo')::date END,
       won_value        = CASE WHEN o.stage = 'ganho' THEN o.valor_resolvido END,
       closed_at        = CASE WHEN o.stage = 'ganho' THEN COALESCE(o.closed_at, o.created_at)
                               WHEN o.stage = 'descartado' THEN o.perdido_em END,
       estimated_value  = NULLIF(o.estimated_value, 0),
       notes            = o.notes,
       competitor_name  = o.competitor_name
  FROM _op o
 WHERE o.origem_id = p.id;

-- ---------------------------------------------------------------------------
-- 7. Interações -> atividades (numeradas depois das que o contato já tinha)
-- ---------------------------------------------------------------------------

-- Interação no Pipeline era conversa com quem já estava em negociação: entra com resposta.
INSERT INTO public.prospect_activities (
  tenant_id, prospect_id, activity_date, channel, owner_id, sequence_no, got_response,
  notes, attachments, created_by, created_at
)
SELECT
  o.tenant_id,
  o.prospect_id,
  i.interaction_date,
  i.channel,
  COALESCE(i.created_by, o.owner_id),
  COALESCE(p.activity_count, 0)
    + row_number() OVER (PARTITION BY o.prospect_id ORDER BY i.interaction_date, i.created_at, i.id),
  true,
  NULLIF(btrim(i.message), ''),
  COALESCE(
    (SELECT jsonb_agg(anexo || jsonb_build_object('bucket', 'lead-attachments'))
       FROM jsonb_array_elements(COALESCE(i.attachments, '[]'::jsonb)) anexo),
    '[]'::jsonb),
  i.created_by,
  i.created_at
  FROM public.lead_interactions i
  JOIN _op o ON o.lead_id = i.lead_id
  JOIN public.prospects p ON p.id = o.prospect_id;

-- Contagem de toques e 1º toque: a oportunidade trazia a data do 1º toque quando veio da
-- Prospecção; senão vale a 1ª interação, e sem interação a data de cadastro.
UPDATE public.prospects p
   SET activity_count = COALESCE(t.ultimo, p.activity_count),
       first_touch_at = COALESCE(p.first_touch_at, o.first_touch_at, t.primeiro,
                                 (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date)
  FROM _op o
  LEFT JOIN (
    SELECT prospect_id, max(sequence_no) AS ultimo, min(activity_date) AS primeiro
      FROM public.prospect_activities
     GROUP BY prospect_id
  ) t ON t.prospect_id = o.prospect_id
 WHERE p.id = o.prospect_id;

-- Contato que continua em trabalho volta para a lista do dia: sem próxima data ele sumiria.
UPDATE public.prospects p
   SET next_activity_on = (now() AT TIME ZONE 'America/Sao_Paulo')::date
  FROM _op o
 WHERE p.id = o.prospect_id
   AND p.stage NOT IN ('ganho', 'descartado')
   AND NOT EXISTS (
     SELECT 1 FROM public.lead_follow_ups f
      WHERE f.lead_id = o.lead_id AND f.status = 'pending');

ALTER TABLE public.prospect_activities ENABLE TRIGGER prospect_activities_advance;
ALTER TABLE public.prospect_activities ENABLE TRIGGER prospect_activities_set_sequence;

-- ---------------------------------------------------------------------------
-- 8. Follow-ups -> tarefas
-- ---------------------------------------------------------------------------

-- "Pulado" não existe em tarefa: fica concluída, com a marca no texto.
INSERT INTO public.prospect_tasks (
  tenant_id, prospect_id, description, due_date, owner_id, done_at, done_by, created_by,
  created_at, updated_at
)
SELECT
  o.tenant_id,
  o.prospect_id,
  left(CASE WHEN f.status = 'skipped' THEN '[Pulado] ' ELSE '' END || btrim(f.description), 2000),
  (f.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date,
  COALESCE(f.assigned_to, o.owner_id),
  CASE WHEN f.status IN ('done', 'skipped') THEN f.updated_at END,
  CASE WHEN f.status IN ('done', 'skipped') THEN f.completed_by END,
  f.created_by,
  f.created_at,
  f.updated_at
  FROM public.lead_follow_ups f
  JOIN _op o ON o.lead_id = f.lead_id
 WHERE btrim(f.description) <> '';

-- Próxima atividade = o follow-up pendente mais próximo, que era o "próximo passo" da tela.
UPDATE public.prospects p
   SET next_activity_on = f.proximo
  FROM _op o
  JOIN (
    SELECT lead_id, min((scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date) AS proximo
      FROM public.lead_follow_ups
     WHERE status = 'pending'
     GROUP BY lead_id
  ) f ON f.lead_id = o.lead_id
 WHERE p.id = o.prospect_id
   AND p.stage NOT IN ('ganho', 'descartado');

-- ---------------------------------------------------------------------------
-- 9. Histórico de etapa — só com data real
-- ---------------------------------------------------------------------------

-- Cadastro dos contatos novos, na data da oportunidade.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source, changed_by)
SELECT o.tenant_id, o.prospect_id, NULL, 'a_abordar',
       (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido', o.created_by
  FROM _op o
 WHERE o.origem_id IS NULL;

-- Contatos de origem saem de "Convertido" no dia em que a oportunidade nasceu, para a etapa
-- em que ela começou (a origem da 1ª mudança registrada; sem nenhuma, a de hoje).
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source, changed_by)
SELECT o.tenant_id, o.prospect_id, 'convertido',
       COALESCE(
         (SELECT ef.stage
            FROM public.lead_activity_log g
            JOIN _etapa ef ON ef.crm_stage = g.metadata->>'from_stage'
           WHERE g.lead_id = o.lead_id AND g.activity_type = 'stage_changed'
           ORDER BY g.created_at LIMIT 1),
         o.stage),
       (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido', o.created_by
  FROM _op o
 WHERE o.origem_id IS NOT NULL;

-- Cada mudança de etapa registrada no Pipeline, traduzida. Mudança que o de-para junta numa
-- etapa só (Proposta -> Negociação) não é mudança e fica de fora.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source, changed_by)
SELECT o.tenant_id, o.prospect_id, ef.stage, et.stage,
       CASE WHEN et.stage = 'descartado' THEN o.discard_reason END,
       (g.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido', g.created_by
  FROM public.lead_activity_log g
  JOIN _op o     ON o.lead_id = g.lead_id
  JOIN _etapa et ON et.crm_stage = g.metadata->>'to_stage'
  LEFT JOIN _etapa ef ON ef.crm_stage = g.metadata->>'from_stage'
 WHERE g.activity_type = 'stage_changed'
   AND et.stage IS DISTINCT FROM ef.stage;

-- Desfecho sem mudança registrada (oportunidade antiga, ou arquivada sem passar por Perdido).
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source)
SELECT p.tenant_id, p.id, NULL, p.stage,
       CASE WHEN p.stage = 'descartado' THEN p.discard_reason END,
       CASE WHEN p.stage = 'ganho' THEN p.won_on
            ELSE (p.discarded_at AT TIME ZONE 'America/Sao_Paulo')::date END,
       'reconstruido'
  FROM _op o
  JOIN public.prospects p ON p.id = o.prospect_id
 WHERE p.stage IN ('ganho', 'descartado')
   AND NOT EXISTS (
     SELECT 1 FROM public.prospect_stage_changes s
      WHERE s.prospect_id = p.id AND s.to_stage = p.stage
        AND s.occurred_on >= (o.created_at AT TIME ZONE 'America/Sao_Paulo')::date);

ALTER TABLE public.prospects ENABLE TRIGGER prospects_protect_first_touch;
ALTER TABLE public.prospects ENABLE TRIGGER prospects_outcome_rules;
ALTER TABLE public.prospects ENABLE TRIGGER prospect_stage_changes_on_update;
ALTER TABLE public.prospects ENABLE TRIGGER prospect_stage_changes_on_insert;

-- ---------------------------------------------------------------------------
-- 10. Orçamento e projeto reapontados
-- ---------------------------------------------------------------------------

UPDATE public.budgets b
   SET prospect_id = x.prospect_id
  FROM (
    SELECT DISTINCT ON (budget_id) budget_id, prospect_id
      FROM _op
     WHERE budget_id IS NOT NULL
     ORDER BY budget_id, created_at DESC
  ) x
 WHERE b.id = x.budget_id;

UPDATE public.projects pr
   SET prospect_id = o.prospect_id
  FROM _op o
 WHERE pr.lead_id = o.lead_id;

-- ---------------------------------------------------------------------------
-- 11. Conferência — nada some sem o build saber
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  faltando integer;
BEGIN
  SELECT count(*) INTO faltando
    FROM _op o
   WHERE NOT EXISTS (SELECT 1 FROM public.prospects p WHERE p.id = o.prospect_id);
  IF faltando > 0 THEN
    RAISE EXCEPTION '% oportunidade(s) sem contato na Prospecção — migração abortada.', faltando;
  END IF;

  SELECT count(*) INTO faltando
    FROM public.lead_interactions i
   WHERE NOT EXISTS (
     SELECT 1 FROM _op o JOIN public.prospect_activities a ON a.prospect_id = o.prospect_id
      WHERE o.lead_id = i.lead_id AND a.created_at = i.created_at);
  IF faltando > 0 THEN
    RAISE EXCEPTION '% interação(ões) sem atividade na Prospecção — migração abortada.', faltando;
  END IF;

  SELECT count(*) INTO faltando
    FROM public.projects pr
   WHERE pr.lead_id IS NOT NULL AND pr.prospect_id IS NULL;
  IF faltando > 0 THEN
    RAISE EXCEPTION '% projeto(s) perderiam a origem comercial — migração abortada.', faltando;
  END IF;

  IF EXISTS (SELECT 1 FROM public.prospects WHERE stage = 'convertido') THEN
    RAISE EXCEPTION 'Ainda há contato em "Convertido" sem oportunidade — migração abortada.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. "Convertido" deixa de existir no contato
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_converted_has_lead;
ALTER TABLE public.prospects DROP COLUMN IF EXISTS converted_lead_id;

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado',
  'ganho', 'descartado',
  'sem_resposta'
));

COMMENT ON COLUMN public.prospects.stage IS
  'Etapa do quadro comercial. Seis etapas de trabalho (a_abordar, em_cadencia, respondeu, '
  'reuniao_agendada, reuniao_feita, qualificado) e dois desfechos, sempre decididos pela '
  'pessoa: ganho e descartado (Perda na interface). sem_resposta só em linhas antigas; '
  'convertido saiu em 29/09/2026 (existe só no histórico de etapa).';

-- ---------------------------------------------------------------------------
-- 13. Anexos antigos passam a obedecer às capacidades da Prospecção
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "lead-attachments: tenant can read" ON storage.objects;
DROP POLICY IF EXISTS "lead-attachments: tenant can upload" ON storage.objects;
DROP POLICY IF EXISTS "lead-attachments: tenant can delete" ON storage.objects;

-- Só leitura e exclusão: anexo novo vai para `prospect-attachments`.
CREATE POLICY "lead-attachments: prospeccao readers can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lead-attachments'
    AND public.has_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'prospeccao:ler')
  );

CREATE POLICY "lead-attachments: prospeccao editors can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lead-attachments'
    AND public.has_capability(auth.uid(), ((storage.foldername(name))[1])::uuid, 'prospeccao:editar')
  );

-- ---------------------------------------------------------------------------
-- 14. O legado sai
-- ---------------------------------------------------------------------------

-- Lembrete diário dos follow-ups: a função some junto com a tabela que ela lia.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-lead-follow-ups-daily') THEN
    PERFORM cron.unschedule('notify-lead-follow-ups-daily');
  END IF;
END $$;

-- `_unguarded` existe em produção sem arquivo no repositório (drift achado no dump de
-- 29/09/2026); a guardada só a chama.
DROP FUNCTION IF EXISTS public.get_crm_received_value(uuid);
DROP FUNCTION IF EXISTS public.get_crm_received_value_unguarded(uuid);

-- Painel de uso: "oportunidades" passa a contar contatos da Prospecção. O nome da coluna
-- fica, para não quebrar o painel que já lê `opportunity_count`.
CREATE OR REPLACE FUNCTION public.platform_tenant_usage()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  plan text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  segment text,
  owner_name text,
  owner_email text,
  owner_phone text,
  last_sign_in_at timestamptz,
  last_created_at timestamptz,
  people_count integer,
  signed_in_count integer,
  tour_seen_count integer,
  client_count integer,
  service_count integer,
  project_count integer,
  member_count integer,
  logged_hours_count integer,
  opportunity_count integer,
  cost_center_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT id INTO _owner FROM public.tenants WHERE is_platform_owner LIMIT 1;

  IF _owner IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.user_tenant_roles utr
       WHERE utr.user_id = auth.uid()
         AND utr.tenant_id = _owner
         AND public.has_capability(auth.uid(), _owner, 'plataforma:ler-uso')
     )
  THEN
    RAISE EXCEPTION 'Sem acesso ao uso da plataforma.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.plan,
    t.trial_ends_at,
    t.created_at,
    t.segment,
    owner.nome,
    owner.email,
    owner.telefone,
    (SELECT max(u.last_sign_in_at)
       FROM public.employees e JOIN auth.users u ON u.id = e.auth_id
      WHERE e.tenant_id = t.id),
    GREATEST(
      (SELECT max(p.created_at) FROM public.projects p WHERE p.tenant_id = t.id),
      (SELECT max(c.created_at) FROM public.clients c WHERE c.tenant_id = t.id),
      (SELECT max(pt.created_at) FROM public.project_timesheets pt
         JOIN public.projects p2 ON p2.id = pt.project_id WHERE p2.tenant_id = t.id),
      (SELECT max(at2.created_at) FROM public.activity_timesheets at2 WHERE at2.tenant_id = t.id)
    ),
    (SELECT count(*)::integer FROM public.employees e WHERE e.tenant_id = t.id),
    (SELECT count(u.last_sign_in_at)::integer
       FROM public.employees e JOIN auth.users u ON u.id = e.auth_id WHERE e.tenant_id = t.id),
    (SELECT count(e.tour_seen_at)::integer FROM public.employees e WHERE e.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.clients c WHERE c.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.services s WHERE s.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.projects p WHERE p.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.project_members pm
       JOIN public.projects p3 ON p3.id = pm.project_id WHERE p3.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.project_timesheets pt2
       JOIN public.projects p4 ON p4.id = pt2.project_id WHERE p4.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.prospects pp WHERE pp.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.cost_centers cc WHERE cc.tenant_id = t.id)
  FROM public.tenants t
  LEFT JOIN LATERAL (
    SELECT e.nome, e.email, e.telefone
    FROM public.employees e
    WHERE e.tenant_id = t.id AND e.system_role = 'admin'
    ORDER BY e.created_at
    LIMIT 1
  ) owner ON true
  WHERE NOT t.is_platform_owner
  ORDER BY t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.platform_tenant_usage() IS
  'Uso por cliente, para o painel /uso. UNICA leitura entre tenants do Pulse: exige estar no '
  'tenant dono e ter plataforma:ler-uso. Devolve contagem e data, nunca nome de projeto, '
  'cliente, valor, margem ou salario (PUL-258). opportunity_count conta contatos da '
  'Prospecção desde 29/09/2026.';

REVOKE ALL ON FUNCTION public.platform_tenant_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_tenant_usage() TO authenticated;

-- Sem CASCADE, de propósito: dependente que o repositório não conhece derruba o build com o
-- nome dele, em vez de sumir calado junto com a tabela.
ALTER TABLE public.projects DROP COLUMN IF EXISTS lead_id;

DROP TABLE public.lead_activity_log;
DROP TABLE public.lead_follow_ups;
DROP TABLE public.lead_interactions;
DROP TABLE public.lead_services;
DROP TABLE public.leads;

-- Quem via ou editava Oportunidades continua vendo e editando: agora elas estão na
-- Prospecção. O espelhamento de 20260915100000 já fez isso uma vez; aqui pega quem ganhou
-- `pipeline:*` depois dele. Só acrescenta — nenhum acesso à Prospecção é retirado.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, replace(rc.capability, 'pipeline:', 'prospeccao:'), true
  FROM public.role_capabilities rc
 WHERE rc.capability IN ('pipeline:ler', 'pipeline:editar') AND rc.enabled
-- Papel que desligou a Prospecção de propósito continua desligado: decisão explícita vence.
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT d.role_name, replace(d.capability, 'pipeline:', 'prospeccao:')
  FROM public.default_role_capabilities d
 WHERE d.capability IN ('pipeline:ler', 'pipeline:editar')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT o.user_id, o.tenant_id, replace(o.capability, 'pipeline:', 'prospeccao:'), true,
       'espelhamento de ' || o.capability || ' (Oportunidades absorvidas pela Prospecção, 29/09/2026)'
  FROM public.user_capability_overrides o
 WHERE o.capability IN ('pipeline:ler', 'pipeline:editar') AND o.enabled
   AND NOT EXISTS (
     SELECT 1 FROM public.user_capability_overrides k
      WHERE k.user_id = o.user_id AND k.tenant_id = o.tenant_id
        AND k.capability = replace(o.capability, 'pipeline:', 'prospeccao:'));

-- Capacidades do Pipeline: primeiro quem aponta para elas (as FKs são RESTRICT).
DELETE FROM public.user_capability_overrides WHERE capability IN ('pipeline:ler', 'pipeline:editar');
DELETE FROM public.role_capabilities         WHERE capability IN ('pipeline:ler', 'pipeline:editar');
DELETE FROM public.default_role_capabilities WHERE capability IN ('pipeline:ler', 'pipeline:editar');
DELETE FROM public.capabilities              WHERE key        IN ('pipeline:ler', 'pipeline:editar');
