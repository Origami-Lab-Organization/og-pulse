-- PUL-201 / TD-0019 — as três capacidades que faltavam para virar a escrita só-admin.
--
-- A matriz nasceu forte em LEITURA e quase muda em ESCRITA: 37 policies `has_role(admin)`
-- ficaram fora dos grupos 1 a 4 porque trocá-las por `pessoa:editar` ou `catalogo:editar`
-- (Admin + Gerente no seed) daria a gerente o que hoje é só de admin. Faltava vocabulário,
-- não mecanismo.
--
-- `configuracao:editar` existe no projete.app como EDITAR_CONFIGURACOES e cobre o mesmo
-- território: parâmetros e cadastros-base do tenant. `pessoa:administrar` separa
-- "administrar o vínculo" (criar, remover, encerrar) de "editar a ficha" (`pessoa:editar`,
-- que gerente tem). `ponto:travar-periodo` é o único conjunto Admin + RH com semântica de
-- fechar competência.
--
-- SEED DERIVADO, não por nome de papel. As duas primeiras vão para todo papel que hoje tem
-- `pessoa:editar-papel`, e a terceira para todo papel que tem `ponto:auditar`, porque essas
-- duas foram semeadas dos mesmos predicados (só-admin e admin-ou-rh) no seed do estado
-- atual. Derivar da matriz em vez de escrever `name IN ('Admin','RH')` mantém a paridade
-- mesmo em tenant que renomeou o papel ou criou papel novo com poder administrativo — o
-- nome é livre desde a PUL-204.

INSERT INTO public.capabilities (key, domain, label, is_sensitive, description) VALUES
  ('configuracao:editar', 'configuracao',
   'Editar configurações da empresa', false,
   'Parâmetros e cadastros-base do tenant: encargos e perfil de folha, tabela de preços por cargo, configurações financeiras, feriados, benefícios e ferramentas do catálogo, modelos de receita e os dados da própria empresa. Não inclui o que cada pessoa recebe — isso é pessoa:administrar.'),
  ('pessoa:administrar', 'pessoas',
   'Criar, remover e encerrar vínculo de pessoas', true,
   'Admitir e excluir funcionário, conceder benefícios e ferramentas a uma pessoa, versionar a ficha e executar o desligamento com seus documentos e verbas. Editar dados de quem já está na base é pessoa:editar.'),
  ('ponto:travar-periodo', 'ponto',
   'Fechar e reabrir competência de ponto', false,
   'Travar um período de ponto para impedir lançamento retroativo, e reabrir quando necessário. Não dá acesso ao ponto de terceiros — isso é ponto:ler-terceiro.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, c.key, true
FROM public.role_capabilities rc
CROSS JOIN (VALUES ('configuracao:editar'), ('pessoa:administrar')) AS c(key)
WHERE rc.capability = 'pessoa:editar-papel' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'ponto:travar-periodo', true
FROM public.role_capabilities rc
WHERE rc.capability = 'ponto:auditar' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- ACUMULAÇÃO. Semear só o papel deixa de fora quem tem duas fontes de papel em
-- `user_roles`: uma pessoa `manager` + `rh` recebeu o papel Gerente (precedência do
-- espelhamento, PUL-209) e as capacidades de RH como override. `ponto:auditar`, de onde a
-- capacidade nova é derivada, chega a essa pessoa por override — não pelo papel. Sem este
-- bloco ela perderia a trava de ponto na virada 5c, e a paridade quebraria exatamente
-- onde o harness pegou.
--
-- A lógica é a mesma do trigger `mirror_user_roles_to_tenant_role`, restrita às três
-- capacidades novas: o que qualquer papel-espelho da pessoa concede e o papel escolhido
-- não. O motivo é o mesmo string do trigger de propósito — ele apaga e regrava esse
-- conjunto a cada mudança de `user_roles`, então usar outro texto criaria dois espelhos
-- concorrentes.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT utr.user_id, utr.tenant_id, rc.capability, true,
       'espelhamento de user_roles (PUL-209)'
FROM public.user_tenant_roles utr
JOIN public.user_roles ur
  ON ur.user_id = utr.user_id AND ur.tenant_id = utr.tenant_id
JOIN public.tenant_roles espelho
  ON espelho.tenant_id = ur.tenant_id
 AND espelho.name = CASE ur.role
                      WHEN 'admin'   THEN 'Admin'
                      WHEN 'manager' THEN 'Gerente'
                      WHEN 'rh'      THEN 'RH'
                      ELSE 'Colaborador'
                    END
JOIN public.role_capabilities rc
  ON rc.role_id = espelho.id AND rc.enabled
 AND rc.capability IN ('configuracao:editar', 'pessoa:administrar', 'ponto:travar-periodo')
WHERE NOT EXISTS (
  SELECT 1 FROM public.role_capabilities escolhido
  WHERE escolhido.role_id = utr.role_id
    AND escolhido.capability = rc.capability
    AND escolhido.enabled
)
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;
