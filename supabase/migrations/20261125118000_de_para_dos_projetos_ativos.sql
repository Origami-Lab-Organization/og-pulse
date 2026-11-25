-- US-0048 — de-para dos projetos ativos para o catálogo 2027.
--
-- Decisões do refino (Victor Couto, 24 e 25/11/2026; .harness/prd/refino-fluxo-comercial-a-projeto.md):
-- só os ativos mudam; oportunidades e projetos encerrados ficam como estão. Compete Minas é
-- Fomento. UNIFOR é Projetos › Dev. de Software. Ficam como estão: Clube de Benefícios (Ventures,
-- que será arquivada), Origami Pulse (produto interno, sai do portfólio no épico 7) e Injetoras NS
-- (termina este mês, sem CNPJ). Aplicado em produção a pedido do Victor em 25/11/2026.
--
-- O modelo segue a cobrança do projeto: Lei do Bem e Subvenção da FINEP em Percentual; os demais
-- em Escopo fixo (parcelas com data). O GP pode trocar depois na edição do projeto.
-- Só casa com os ids da Origami em produção; em outro banco não altera nada.

WITH de_para (projeto, servico, modelo) AS (
  VALUES
    -- Projetos › Consultoria › Escopo fixo
    ('84ba39bd-20b4-4edf-90c9-41c93cab5460'::uuid, '773dbc59-6b10-421e-a863-b24a58037c71', '857d62e5-172d-45f1-9223-f47da3d95942'::uuid), -- Consultoria 99
    -- Projetos › Dev. de Software › Escopo fixo
    ('f56dbecf-6175-49f0-b086-dab5e5e7a319', '441110d5-3823-4627-b56d-ed3cb189db0a', '0c309651-2ca5-4243-8810-92a5fd782bac'), -- Inteligência de Negócio - Injepol
    ('ab45b3d2-e9e9-4096-a928-23d93f98cdc2', '441110d5-3823-4627-b56d-ed3cb189db0a', '0c309651-2ca5-4243-8810-92a5fd782bac'), -- Plataforma Bry - Discovery
    ('3d1fd500-fe5e-4d24-99a8-385d7449ee0d', '441110d5-3823-4627-b56d-ed3cb189db0a', '0c309651-2ca5-4243-8810-92a5fd782bac'), -- Prumo Obras - Fase 3
    ('c2039540-77a3-4b55-a742-f332ea262c7c', '441110d5-3823-4627-b56d-ed3cb189db0a', '0c309651-2ca5-4243-8810-92a5fd782bac'), -- Projeto Envio de Notas e Boletos (UNIFOR)
    -- Fomento › Lei do Bem › Percentual
    ('8c425155-0f85-4c55-8ef3-09f8e90d7ab3', '149d6929-3181-40ac-9a44-80de90e10ccc', '7714cb58-93aa-416d-9657-6ffb591cd1ea'), -- Lei do Bem Avante
    ('249147db-c805-4eaf-8bd3-ab4f14e56b35', '149d6929-3181-40ac-9a44-80de90e10ccc', '7714cb58-93aa-416d-9657-6ffb591cd1ea'), -- Lei do Bem Bry
    ('063e2458-13a0-45ae-9768-4707ac89d588', '149d6929-3181-40ac-9a44-80de90e10ccc', '7714cb58-93aa-416d-9657-6ffb591cd1ea'), -- Lei do Bem Prumo
    ('de007a4f-2df2-4b13-ad01-9f07e5cd45ee', '149d6929-3181-40ac-9a44-80de90e10ccc', '7714cb58-93aa-416d-9657-6ffb591cd1ea'), -- Lei do Bem Syngular
    -- Fomento › Acesso a Capital
    ('0e0aad0e-73f8-4805-8e9c-bb3832cd7874', '7cfe72ac-ba49-4dab-8467-9c7e6d67be3e', '339275e6-f633-4a7f-9ba9-211bc7e2ca21'), -- Subvenção da FINEP › Percentual
    ('bc67dc38-b97a-47bb-8358-181281296307', '7cfe72ac-ba49-4dab-8467-9c7e6d67be3e', '8b0b84b9-f02c-441f-858e-d64fee46b3f1'), -- Compete Minas › Escopo fixo
    -- Governo › Workshop Sebrae › Escopo fixo
    ('edb76c2e-00dc-478c-bec6-c1fd88c1b7ea', '53a0a092-1741-4d43-9bfe-f9bd92d7b8bd', 'e3af40ed-8957-4d15-af41-5faaa4046db8')  -- Projeto Fator S | UFLA (Lavras)
)
UPDATE public.projects p
   SET service_line = d.servico,
       service_revenue_model_id = d.modelo
  FROM de_para d
 WHERE p.id = d.projeto
   AND p.tenant_id = '93e40db0-4946-48ba-b40f-7ee9d02734e0'
   AND p.status IN ('planning', 'active', 'paused');
