-- PUL-200 (ADR-0027) — esquema de capacidades: papel e capacidade viram DADO.
--
-- Problema:
--   Quem pode o quê está hoje em 373 checagens espalhadas por 97 arquivos de src/ e em
--   predicados fixos de policy. Qualquer ajuste de acesso — "liberar custo para tal
--   perfil" — exige migration e release, e o enum global `app_role` não expressa recortes
--   diferentes por cliente (PUL-122 projeta 80–100 clientes).
--
-- Decisão:
--   Espelhar o modelo já em produção no projete.app (Papel / PapelPermissao /
--   UsuarioPermissaoOverride), com a linha entre código e dado no mesmo lugar:
--
--     vocabulário de capacidades  -> código (esta migration semeia; ninguém insere depois)
--     papéis do tenant            -> dado
--     papel × capacidade          -> dado   <- é a "flag de perfil"
--     exceção por pessoa          -> dado, auditável
--
--   Capacidade nova exige deploy; quem tem cada capacidade é clique.
--
--   O enforcement NÃO porta do projete.app: lá a autorização roda em server action e o
--   navegador nunca fala com o banco. Aqui o cliente fala direto com o Postgres via JWT,
--   então a resolução tem de viver em SQL — `has_capability`, chamada dentro das policies.
--   O front (`useCan`) lê a mesma fonte, mas só decide o que renderizar.
--
-- ESTA MIGRATION É INERTE: cria o esquema AO LADO do atual e não troca nenhuma policy.
-- `user_roles`, `app_role`, `has_role` e `is_admin_or_manager` seguem intactos e no
-- comando. A virada acontece em PUL-201, e só depois da prova de paridade (PUL-209).
--
-- Ver ADR-0027 e .harness/capability-matrix.md.

-- 1. Vocabulário de capacidades -------------------------------------------------
--
-- Tabela em vez de enum de propósito: no Postgres não se remove valor de enum, e
-- adicionar valor impede o uso na mesma transação (o projete.app documenta esse atrito
-- na migration 20260721010000). A propriedade que importa — "capacidade nova exige
-- deploy" — é preservada pela RLS: esta tabela não aceita escrita por usuário nenhum.
CREATE TABLE IF NOT EXISTS public.capabilities (
  key          text PRIMARY KEY,
  domain       text NOT NULL,
  label        text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.capabilities IS
  'Vocabulário de capacidades. Semeado por migration e imutável em runtime — nenhuma '
  'policy concede escrita. Capacidade nova exige deploy (ADR-0027).';
COMMENT ON COLUMN public.capabilities.is_sensitive IS
  'Marca capacidade que protege dado financeiro, de folha ou pessoal. Toda capacidade '
  'sensível PRECISA de predicado de RLS equivalente ou mais restritivo: esconder campo '
  'na tela sem policy não protege nada (ADR-0022, ADR-0027).';

-- 2. Papéis por tenant ----------------------------------------------------------
--
-- Nome livre, definido pelo cliente — é o que `app_role` (enum global) não permite.
-- A pessoa tem UM papel por tenant; acumulação de funções se resolve por papel
-- customizado ou por override, nunca por N papéis. Isso elimina a pergunta de
-- precedência entre papéis e a ambiguidade de qual papel a interface exibe.
CREATE TABLE IF NOT EXISTS public.tenant_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

COMMENT ON TABLE public.tenant_roles IS
  'Papéis de acesso do tenant, com nome definido pelo cliente (ADR-0027).';

CREATE INDEX IF NOT EXISTS tenant_roles_tenant_idx ON public.tenant_roles (tenant_id);

-- 3. Papel × capacidade — a flag de perfil --------------------------------------
CREATE TABLE IF NOT EXISTS public.role_capabilities (
  role_id    uuid NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE RESTRICT,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (role_id, capability)
);

COMMENT ON TABLE public.role_capabilities IS
  'Matriz papel × capacidade. É a flag de perfil: ligar aqui libera de fato, porque a '
  'RLS lê a mesma linha via has_capability (ADR-0027).';
COMMENT ON COLUMN public.role_capabilities.updated_by IS
  'auth.uid() de quem alterou. Configuração troca revisão de PR por clique — sem trilha, '
  'o custo não tem compensação (ADR-0027).';

CREATE INDEX IF NOT EXISTS role_capabilities_lookup_idx
  ON public.role_capabilities (role_id, capability) WHERE enabled;

-- 4. Papel da pessoa ------------------------------------------------------------
--
-- A PK (user_id, tenant_id) impõe UM papel por pessoa por tenant no schema — e não em
-- código, que era o defeito de employeeService (DELETE de tudo + INSERT de um).
CREATE TABLE IF NOT EXISTS public.user_tenant_roles (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES public.tenant_roles(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (user_id, tenant_id)
);

COMMENT ON TABLE public.user_tenant_roles IS
  'Papel da pessoa no tenant. PK (user_id, tenant_id) garante um papel por pessoa; '
  'ON DELETE RESTRICT no papel impede apagar papel que deixaria alguém sem acesso.';

CREATE INDEX IF NOT EXISTS user_tenant_roles_role_idx ON public.user_tenant_roles (role_id);

-- 5. Exceção por pessoa ---------------------------------------------------------
--
-- `enabled` explícito: true concede capacidade que o papel não dá, false revoga
-- capacidade que o papel dá. É diferente de `employees.is_gerente` — a flag ad-hoc que
-- este modelo substitui — porque não compete com o papel, compõe com ele, sobre um
-- vocabulário fechado e com listagem de quem tem exceção.
--
-- Override é para exceção, nunca para suprir papel que falta: se muitas pessoas têm o
-- mesmo override, falta um papel, e a correção é criar o papel (ADR-0027).
CREATE TABLE IF NOT EXISTS public.user_capability_overrides (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE RESTRICT,
  enabled    boolean NOT NULL,
  reason     text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (user_id, tenant_id, capability)
);

COMMENT ON TABLE public.user_capability_overrides IS
  'Exceção de capacidade por pessoa: enabled=true concede, enabled=false revoga. '
  'Auditável por desenho — exceção invisível é o defeito de is_gerente com outro nome.';

-- 6. has_capability — a resolução, em SQL ---------------------------------------
--
-- Mesma semântica de calcularPermissoes (projete.app/src/lib/permissoes.ts): capacidades
-- habilitadas do papel, com os overrides aplicados por cima. Aqui o COALESCE faz isso em
-- uma passada — override primeiro, papel depois, e `false` por omissão, o que dá de graça
-- o comportamento "capacidade desconhecida nega".
--
-- STABLE: o Postgres cacheia por statement, e o predicado é avaliado linha a linha.
-- SECURITY DEFINER: precisa ler as tabelas de configuração ignorando a RLS delas — é
-- também o que evita recursão de policy quando a própria administração de perfis passar
-- a ser protegida por capacidade.
-- Assinatura seguindo has_role(_user_id, _tenant_id, ...), por consistência.
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _tenant_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT o.enabled
      FROM public.user_capability_overrides o
      WHERE o.user_id = _user_id
        AND o.tenant_id = _tenant_id
        AND o.capability = _capability
    ),
    (
      SELECT rc.enabled
      FROM public.user_tenant_roles utr
      JOIN public.role_capabilities rc ON rc.role_id = utr.role_id
      WHERE utr.user_id = _user_id
        AND utr.tenant_id = _tenant_id
        AND rc.capability = _capability
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.has_capability(uuid, uuid, text) IS
  'Resolve capacidade efetiva: override da pessoa tem precedência sobre o papel; ausência '
  'nega. Predicado canônico da onda de capacidades — substitui is_admin_or_manager nas '
  'policies a partir de PUL-201 (ADR-0027).';

GRANT EXECUTE ON FUNCTION public.has_capability(uuid, uuid, text) TO authenticated;

-- 7. my_capabilities — o que o front consome ------------------------------------
--
-- Uma chamada devolve o conjunto efetivo do usuário no tenant, em vez de o front montar
-- a resolução a partir de três tabelas. O front usa isso para RENDERIZAR; a barreira
-- continua sendo a policy.
CREATE OR REPLACE FUNCTION public.my_capabilities(_tenant_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.key
  FROM public.capabilities c
  WHERE public.has_capability(auth.uid(), _tenant_id, c.key)
$$;

COMMENT ON FUNCTION public.my_capabilities(uuid) IS
  'Capacidades efetivas do usuário autenticado no tenant. Consumo do front para decidir '
  'renderização — nunca é a barreira de acesso (ADR-0027).';

GRANT EXECUTE ON FUNCTION public.my_capabilities(uuid) TO authenticated;

-- 8. RLS das tabelas de configuração --------------------------------------------
--
-- Nesta fase a ESCRITA usa o predicado antigo (has_role admin), de propósito: proteger a
-- administração de perfis com a própria capacidade criaria um problema de bootstrap —
-- antes do seed ninguém teria a capacidade, e o tenant nasceria sem administração. A
-- troca para `has_capability('pessoa:editar-papel')` acontece em PUL-201, quando o seed
-- já existe e a paridade está provada.
--
-- A LEITURA é mínima: a pessoa lê o próprio vínculo e as próprias exceções; a matriz do
-- tenant é legível por membro (o front precisa dela, e papel de sistema não é dado
-- sensível como salário); admin lê tudo.

ALTER TABLE public.capabilities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_capability_overrides ENABLE ROW LEVEL SECURITY;

-- capabilities: vocabulário é legível por qualquer autenticado; escrita não existe para
-- ninguém (nem admin) — só migration, via service_role, que ignora RLS.
CREATE POLICY "Authenticated can read capability vocabulary"
ON public.capabilities FOR SELECT TO authenticated
USING (true);

-- tenant_roles
CREATE POLICY "Tenant members can read tenant roles"
ON public.tenant_roles FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage tenant roles"
ON public.tenant_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- role_capabilities
CREATE POLICY "Tenant members can read role capabilities"
ON public.role_capabilities FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_roles r
    WHERE r.id = role_capabilities.role_id
      AND public.user_belongs_to_tenant(auth.uid(), r.tenant_id)
  )
);

CREATE POLICY "Admins can manage role capabilities"
ON public.role_capabilities FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_roles r
    WHERE r.id = role_capabilities.role_id
      AND public.has_role(auth.uid(), r.tenant_id, 'admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenant_roles r
    WHERE r.id = role_capabilities.role_id
      AND public.has_role(auth.uid(), r.tenant_id, 'admin'::app_role)
  )
);

-- user_tenant_roles: a pessoa lê o próprio vínculo; admin lê e escreve todos.
CREATE POLICY "Users can read own tenant role"
ON public.user_tenant_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read tenant roles of members"
ON public.user_tenant_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Ninguém altera o próprio papel, nem sendo admin: auto-promoção é barrada no banco,
-- não só na tela (PUL-204).
CREATE POLICY "Admins can assign roles to others"
ON public.user_tenant_roles FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin'::app_role)
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- user_capability_overrides: mesma regra, incluindo a barra de auto-concessão.
CREATE POLICY "Users can read own overrides"
ON public.user_capability_overrides FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read overrides of members"
ON public.user_capability_overrides FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can manage overrides of others"
ON public.user_capability_overrides FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), tenant_id, 'admin'::app_role)
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), tenant_id, 'admin'::app_role)
  AND user_id <> auth.uid()
);

-- 9. Vocabulário inicial --------------------------------------------------------
--
-- As 46 capacidades levantadas em .harness/capability-matrix.md. Este INSERT é o que
-- torna real a regra "capacidade nova exige deploy": a tabela não aceita escrita por
-- usuário nenhum, então o vocabulário só cresce por migration.
--
-- ON CONFLICT DO NOTHING para permitir reexecução parcial sem perder marcação já
-- ajustada. `is_sensitive = true` marca o que protege dado financeiro, de folha ou
-- pessoal — essas são as últimas a migrar em PUL-201 e as que exigem policy
-- equivalente antes de qualquer toggle.
INSERT INTO public.capabilities (key, domain, label, is_sensitive) VALUES
  ('financeiro:ler',                     'financeiro',   'Ver financeiro de projeto (custo, comissão, parcela, fornecedor)', true),
  ('financeiro:editar',                  'financeiro',   'Editar financeiro de projeto',                     true),
  ('margem:ler',                         'financeiro',   'Ver margem',                                       true),
  ('margem:ler-detalhe-mao-de-obra',     'financeiro',   'Ver detalhe de mão de obra na margem',             true),
  ('custo-hora:ler',                     'financeiro',   'Ver tarifa/hora e parâmetros de precificação',     true),
  ('horas-projeto:ler',                  'projeto',      'Ver horas do projeto',                             false),
  ('folha:ler',                          'folha',        'Ver folha de pagamento',                           true),
  ('remuneracao-pessoa:ler',             'folha',        'Ver remuneração individual',                       true),
  ('remuneracao-pessoa:editar',          'folha',        'Editar remuneração individual',                    true),
  ('parametro-folha:ler',                'folha',        'Ver parâmetros de folha (alíquotas)',              true),
  ('pessoa:ler-identidade',              'pessoas',      'Ver identidade de colegas (nome, cargo, foto)',    false),
  ('pessoa:ler-ficha-completa',          'pessoas',      'Ver ficha completa (CPF, nascimento, dados bancários)', true),
  ('pessoa:editar',                      'pessoas',      'Editar cadastro de pessoa',                        true),
  ('pessoa:editar-papel',                'pessoas',      'Atribuir papel e capacidade a pessoas',            true),
  ('pessoa:editar-elegibilidade-alocacao','pessoas',     'Definir se a pessoa aloca em projetos',            false),
  ('desligamento:executar',              'pessoas',      'Conduzir desligamento',                            true),
  ('pipeline:ler',                       'comercial',    'Ver Pipeline de Oportunidades',                    false),
  ('pipeline:editar',                    'comercial',    'Editar Oportunidade (follow-up, interação, serviço)', false),
  ('orcamento:ler',                      'comercial',    'Ver Orçamentos',                                   true),
  ('orcamento:editar',                   'comercial',    'Editar Orçamentos',                                true),
  ('catalogo:ler',                       'comercial',    'Ver catálogo de serviços',                         false),
  ('catalogo:editar',                    'comercial',    'Editar catálogo de serviços',                      false),
  ('cliente:ler',                        'comercial',    'Ver clientes',                                     false),
  ('cliente:editar',                     'comercial',    'Editar clientes',                                  false),
  ('projeto:ler',                        'projeto',      'Ver projeto',                                      false),
  ('projeto:editar',                     'projeto',      'Editar projeto',                                   false),
  ('portfolio:ler',                      'projeto',      'Ver portfólio',                                    false),
  ('arquivo-projeto:ler',                'projeto',      'Ver arquivos do projeto',                          false),
  ('alocacao:ler',                       'alocacao',     'Ver alocação',                                     false),
  ('alocacao:editar',                    'alocacao',     'Editar alocação',                                  false),
  ('timesheet-proprio:apontar',          'timesheet',    'Apontar as próprias horas',                        false),
  ('timesheet-terceiro:ler',             'timesheet',    'Ver horas de terceiros',                           false),
  ('ponto:ler-proprio',                  'ponto',        'Ver o próprio ponto e banco de horas',             false),
  ('ponto:ler-terceiro',                 'ponto',        'Ver ponto de terceiros',                           true),
  ('ponto:aprovar',                      'ponto',        'Aprovar ponto',                                    false),
  ('ponto:auditar',                      'ponto',        'Auditar ponto',                                    true),
  ('ponto:configurar',                   'ponto',        'Configurar regras de ponto',                       false),
  ('ferias:solicitar',                   'pessoas',      'Solicitar férias',                                 false),
  ('ferias:aprovar',                     'pessoas',      'Aprovar férias',                                   false),
  ('ferias:gerir',                       'pessoas',      'Gerir férias do time',                             false),
  ('vaga:editar',                        'recrutamento', 'Editar vagas',                                     false),
  ('candidatura:ler',                    'recrutamento', 'Ver candidaturas',                                 true),
  ('curriculo:ler',                      'recrutamento', 'Ver currículos',                                   true),
  ('okr:editar',                         'estrategia',   'Editar OKRs',                                      false),
  ('iniciativa:editar',                  'estrategia',   'Editar iniciativas',                               false),
  ('guardrail-estrategia:editar',        'estrategia',   'Editar guardrails de estratégia',                  false)
ON CONFLICT (key) DO NOTHING;

-- 10. GRANTs --------------------------------------------------------------------
--
-- O projeto concede explicitamente em tabela nova (ver 20260717203954, módulo de ponto)
-- em vez de depender dos default privileges do schema. GRANT define o que o papel pode
-- TENTAR; a RLS acima é que filtra — por isso `capabilities` recebe apenas SELECT: não
-- existe caminho de escrita para usuário, nem para admin.
GRANT SELECT                             ON public.capabilities              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.tenant_roles              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.role_capabilities         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.user_tenant_roles         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE     ON public.user_capability_overrides TO authenticated;
