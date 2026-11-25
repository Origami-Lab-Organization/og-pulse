-- Rollback de 20261125118000_de_para_dos_projetos_ativos.sql
--
-- Devolve cada projeto ao serviço e ao modelo que tinha antes do de-para (retrato de 25/11/2026).

WITH antes (projeto, servico, modelo) AS (
  VALUES
    ('84ba39bd-20b4-4edf-90c9-41c93cab5460'::uuid, '3e79de15-94a4-4bfb-8fd4-ec0b1ab28b34', NULL::uuid), -- Consultoria 99 (Consultoria Estratégica)
    ('f56dbecf-6175-49f0-b086-dab5e5e7a319', '4014bc78-f669-43b7-98f7-024cb7b71f0f', NULL), -- Injepol (Dev. de Software antigo)
    ('ab45b3d2-e9e9-4096-a928-23d93f98cdc2', '4014bc78-f669-43b7-98f7-024cb7b71f0f', NULL), -- Plataforma Bry - Discovery
    ('3d1fd500-fe5e-4d24-99a8-385d7449ee0d', '4014bc78-f669-43b7-98f7-024cb7b71f0f', NULL), -- Prumo Obras - Fase 3
    ('c2039540-77a3-4b55-a742-f332ea262c7c', 'c02e2c1b-0fb4-4855-a0eb-c90227be11db', NULL), -- UNIFOR (Programa de Inovação)
    ('8c425155-0f85-4c55-8ef3-09f8e90d7ab3', NULL, NULL), -- Lei do Bem Avante
    ('249147db-c805-4eaf-8bd3-ab4f14e56b35', NULL, NULL), -- Lei do Bem Bry
    ('063e2458-13a0-45ae-9768-4707ac89d588', 'ad096345-d610-4e4d-8c15-cb7e8d93e97b', 'e4a5aaca-d678-488a-8ca0-cb4d59d2c247'), -- Lei do Bem Prumo (Financiamento da Inovação)
    ('de007a4f-2df2-4b13-ad01-9f07e5cd45ee', 'a055dc6f-0d1b-4559-8cac-50ea72f34f92', NULL), -- Lei do Bem Syngular (Lei do Bem antigo)
    ('0e0aad0e-73f8-4805-8e9c-bb3832cd7874', 'ad096345-d610-4e4d-8c15-cb7e8d93e97b', NULL), -- Subvenção da FINEP
    ('bc67dc38-b97a-47bb-8358-181281296307', NULL, NULL), -- Compete Minas
    ('edb76c2e-00dc-478c-bec6-c1fd88c1b7ea', 'c02e2c1b-0fb4-4855-a0eb-c90227be11db', NULL)  -- Fator S Lavras (Programa de Inovação)
)
UPDATE public.projects p
   SET service_line = a.servico,
       service_revenue_model_id = a.modelo
  FROM antes a
 WHERE p.id = a.projeto
   AND p.tenant_id = '93e40db0-4946-48ba-b40f-7ee9d02734e0';
