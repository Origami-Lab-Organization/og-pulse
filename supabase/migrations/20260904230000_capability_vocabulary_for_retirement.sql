-- PUL-206 — as quatro capacidades que faltavam para nenhuma policy depender de papel.
--
-- A aposentadoria do mecanismo antigo (decisão de 04/09) só é possível depois que nenhuma
-- policy leia `has_role` ou `is_admin_or_manager`. Sobraram 20, e 13 delas não tinham
-- capacidade que as representasse sem mudar quem alcança o quê. Estas quatro fecham a
-- lacuna, cada uma com o conjunto de papéis idêntico ao predicado que substitui.
--
-- As sete restantes são a governança do próprio mecanismo, e passam a usar
-- `pessoa:editar-papel` — que é literalmente "gerir perfis". Isso significa aceitar que
-- quem administra capacidade seja decidido por capacidade, o que era a objeção registrada
-- em TD-0019. A objeção continua válida em tese e a mitigação é a invariante do último
-- administrador (20260902170000), que existe exatamente para isso: o banco recusa a
-- operação que deixaria o tenant sem ninguém capaz de gerir perfis.

INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('estrategia:editar', 'estrategia',
   'Excluir ciclos, objetivos, resultados-chave e check-ins', false,
   'Apagar itens do planejamento estratégico. Criar e atualizar segue liberado a quem pertence ao tenant; apagar é o ato destrutivo e por isso tem capacidade própria.'),
  ('ferias:administrar', 'pessoas',
   'Administrar solicitação de férias de qualquer pessoa', true,
   'Ler e alterar solicitação de férias de terceiros fora do fluxo de aprovação designado. Quem aprova as férias do próprio time usa ferias:aprovar.'),
  ('lancamento:desfazer', 'financeiro',
   'Desfazer lançamento e submissão', true,
   'Apagar submissão de timesheet, remover lançamento financeiro de projeto e registrar correção no log de edição. É a válvula administrativa para desfazer o que já foi fechado.'),
  ('marca:editar', 'configuracao',
   'Trocar logo e identidade visual da empresa', false,
   'Subir, substituir e apagar o logotipo do tenant. É a identidade visual da própria empresa, não de cliente.'),
  ('alocacao:ler-tudo', 'alocacao',
   'Ver a alocação de qualquer projeto', false,
   'Alcança a planilha de equipe de projeto de que a pessoa não é gerente nem participante. Quem só precisa ver onde atua usa alocacao:ler.')
ON CONFLICT (key) DO NOTHING;

-- As três só-admin derivam de quem tem `pessoa:editar-papel`, o marcador de só-admin no
-- modelo; `estrategia:editar` deriva de `iniciativa:editar`, que é Admin + Gerente — o mesmo
-- conjunto de `is_admin_or_manager`. Derivar em vez de nomear papel mantém a paridade em
-- tenant que renomeou ou criou papel.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.key, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('ferias:administrar'), ('lancamento:desfazer'), ('alocacao:ler-tudo')) AS c(key)
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.key, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('estrategia:editar'), ('marca:editar')) AS c(key)
WHERE rc.capability = 'iniciativa:editar' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- Acumulação: quem alcança a capacidade de origem por exceção precisa alcançar a nova pela
-- mesma via, senão perde acesso na virada.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, c.key, true, 'espelhamento de user_roles (PUL-209)'
FROM public.user_capability_overrides o
CROSS JOIN (VALUES ('ferias:administrar'), ('lancamento:desfazer'), ('alocacao:ler-tudo')) AS c(key)
WHERE o.capability = 'pessoa:editar-papel' AND o.enabled
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, c.key, true, 'espelhamento de user_roles (PUL-209)'
FROM public.user_capability_overrides o
CROSS JOIN (VALUES ('estrategia:editar'), ('marca:editar')) AS c(key)
WHERE o.capability = 'iniciativa:editar' AND o.enabled
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;
