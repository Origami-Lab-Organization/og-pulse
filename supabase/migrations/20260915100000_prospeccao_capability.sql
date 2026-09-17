-- Prospecção — capacidades do módulo de pipeline frio.
--
-- Decisão de 15/09/2026 (Guilherme): a prospecção é um pipeline SEPARADO do comercial.
-- Ela mede atenção conquistada, não receita. Por isso ganha capacidade própria em vez de
-- emprestar `pipeline:*`: quem prospecta não precisa enxergar valor, orçamento e forecast
-- das oportunidades, e quem conduz oportunidade não precisa da lista fria. Separar agora
-- custa duas linhas; separar depois custa reescrever policy de quatro tabelas.
--
-- O estado inicial reproduz o acesso que a planilha de prospecção já tinha na prática:
-- semeadas para quem tem `pipeline:ler` / `pipeline:editar` (hoje Admin e Gerente), pelo
-- padrão INSERT-SELECT de 20260904210000. Mudar quem prospecta é toggle de perfil depois,
-- não migration nova.
--
-- Matriz: .harness/capability-matrix.md, seção "4. Pipeline e comercial".
-- Rollback: supabase/rollback/20260915100000_prospeccao_capability_rollback.sql

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('prospeccao:ler', 'prospeccao', 'Ler a prospecção',
   'Vê o pipeline de prospecção (/comercial/prospeccao): empresas e contatos frios, as '
   'atividades registradas e as métricas de cadência. Não dá acesso a valor de negócio.',
   false),
  ('prospeccao:editar', 'prospeccao', 'Editar a prospecção',
   'Cria e edita empresas e contatos de prospecção, registra atividades, descarta um '
   'contato e converte um contato qualificado em oportunidade.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Quem já lê o pipeline comercial passa a ler a prospecção; idem para escrita.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'prospeccao:ler', true
FROM public.role_capabilities rc
WHERE rc.capability = 'pipeline:ler' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'prospeccao:editar', true
FROM public.role_capabilities rc
WHERE rc.capability = 'pipeline:editar' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- Cliente novo nasce com o mesmo desenho (20260904260000).
INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'prospeccao:ler'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'pipeline:ler'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'prospeccao:editar'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'pipeline:editar'
ON CONFLICT (role_name, capability) DO NOTHING;

-- Exceções por pessoa acompanham: quem tem pipeline por override, tem prospecção também.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'prospeccao:ler', o.enabled,
       'espelhamento de pipeline:ler (módulo de prospecção, 15/09/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'pipeline:ler'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'prospeccao:editar', o.enabled,
       'espelhamento de pipeline:editar (módulo de prospecção, 15/09/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'pipeline:editar'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;
