-- PUL-258 — painel de uso dos clientes, para a Origami operar o produto.
--
-- Esta migration abre a ÚNICA leitura entre tenants que existe no Pulse. O boundary do
-- projeto diz "não expor dados entre tenants" e continua valendo para todo o resto: nenhuma
-- tela, hook ou policy do produto passa a enxergar outro tenant. A exceção mora aqui, numa
-- função, com três travas e um recorte de dado deliberadamente pobre.
--
-- POR QUE PRECISA EXISTIR. Depois do autocadastro (PUL-227), empresas entram sozinhas e a
-- Origami não tem como saber quem ativou, quem travou no primeiro dia e de quem o teste
-- vence amanhã. Sem isso, o produto vende e não acompanha — e a informação existe, só está
-- espalhada por 5 tabelas de cada cliente.
--
-- AS TRÊS TRAVAS
--
--   1. `tenants.is_platform_owner` — um índice único parcial garante UMA linha `true` em
--      toda a base. Não é `name ILIKE '%origami%'`: essa heurística já semeou dado no tenant
--      errado (memória do time, e a própria 20260910110000 existe para consertar isso).
--   2. capacidade `plataforma:ler-uso`, concedida só ao papel Admin do tenant dono. Não entra
--      em `default_role_capabilities`, então cliente novo NUNCA nasce com ela (ADR-0027).
--   3. a função exige as duas juntas: quem chama tem de estar no tenant dono E ter a
--      capacidade lá. Admin de cliente não alcança, mesmo que alguém conceda a capacidade
--      no tenant dele por engano.
--
-- O QUE A FUNÇÃO DEVOLVE, E O QUE ELA NUNCA DEVOLVE
--
-- Devolve CONTAGEM e DATA. Nunca nome de projeto, nome de cliente, valor de contrato,
-- margem, custo, salário ou hora de pessoa identificada. O painel responde "este cliente
-- está usando?", não "o que este cliente está fazendo" — a segunda pergunta não é nossa.
--
-- A exceção é o contato do administrador que criou a conta: nome, e-mail e telefone. É dado
-- pessoal, e entra por finalidade declarada — é o contato comercial da conta, o mesmo que a
-- própria `register-tenant` já envia por e-mail ao comercial (PUL-253). Os DEMAIS
-- funcionários do cliente aparecem só como número. O projete.app lista nome, e-mail e
-- WhatsApp de todo mundo; aqui isso seria expor a lista de funcionários de terceiros sem
-- finalidade, e não passa no boundary de dado pessoal.

-- ---------------------------------------------------------------------------
-- 1. Quem é o tenant dono da plataforma
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_platform_owner boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.is_platform_owner IS
  'Verdadeiro no tenant da Origami, que opera o produto. Exatamente uma linha em toda a '
  'base (indice unico parcial). Governa a leitura de uso entre tenants (PUL-258).';

-- Uma só, e o banco recusa a segunda.
CREATE UNIQUE INDEX IF NOT EXISTS tenants_single_platform_owner
  ON public.tenants ((true)) WHERE is_platform_owner;

-- O tenant da casa é o Origami com MAIS funcionários. `name ILIKE '%origami%'` sozinho cai
-- no tenant vazio: há dois com esse nome em produção, e a 20260910110000 documenta o
-- estrago que isso causou.
UPDATE public.tenants SET is_platform_owner = true
WHERE id = (
  SELECT t.id FROM public.tenants t
  WHERE t.name ILIKE '%origami%'
  ORDER BY (SELECT count(*) FROM public.employees e WHERE e.tenant_id = t.id) DESC, t.created_at
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE is_platform_owner);

-- ---------------------------------------------------------------------------
-- 2. A capacidade
-- ---------------------------------------------------------------------------

-- `domain` novo, 'plataforma': é o primeiro de uma família que não é do produto que o
-- cliente usa, e sim da operação do produto. `is_sensitive` porque ela atravessa tenant —
-- a mais sensível que existe no vocabulário.
INSERT INTO public.capabilities (key, domain, label, description, is_sensitive)
VALUES ('plataforma:ler-uso', 'plataforma', 'Ler uso da plataforma',
        'Ve o painel de uso dos clientes (/uso), com contagens e datas de cada empresa. '
        'Exclusiva do tenant que opera o produto.', true)
ON CONFLICT (key) DO NOTHING;

-- Só o Admin do tenant dono. Fora de `default_role_capabilities` de propósito: cliente novo
-- não nasce com ela, hoje nem nunca.
INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT tr.id, 'plataforma:ler-uso', true
FROM public.tenant_roles tr
JOIN public.tenants t ON t.id = tr.tenant_id AND t.is_platform_owner
WHERE tr.name = 'Admin'
ON CONFLICT (role_id, capability) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. A leitura
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER porque a RLS existe justamente para impedir isto; o guard é o IF abaixo,
-- não a policy. Padrão de ADR-0021 (definer com guarda de tenant), invertido: em vez de
-- confinar ao próprio tenant, confina a QUEM pode sair dele.
CREATE OR REPLACE FUNCTION public.platform_tenant_usage()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  plan text,
  trial_ends_at timestamptz,
  created_at timestamptz,
  segment text,
  -- contato comercial da conta (o admin que se cadastrou)
  owner_name text,
  owner_email text,
  owner_phone text,
  -- sinais de vida
  last_sign_in_at timestamptz,
  last_created_at timestamptz,
  -- marcos, em contagem
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

  -- As duas travas juntas. Sem tenant dono definido, ninguém lê nada.
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
    -- Última CRIAÇÃO de dado, que é diferente de última visita: tenant que só abre a tela
    -- aparece ativo aqui e paradão nesta coluna. É o diagnóstico que o painel entrega.
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
    (SELECT count(*)::integer FROM public.leads l WHERE l.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.cost_centers cc WHERE cc.tenant_id = t.id)
  FROM public.tenants t
  -- O admin que criou a conta: o funcionário mais antigo com papel de sistema admin.
  LEFT JOIN LATERAL (
    SELECT e.nome, e.email, e.telefone
    FROM public.employees e
    WHERE e.tenant_id = t.id AND e.system_role = 'admin'
    ORDER BY e.created_at
    LIMIT 1
  ) owner ON true
  -- O próprio tenant da casa fica fora: ele não é cliente, e as métricas dele distorceriam
  -- o funil de ativação (mesma escolha do projete.app).
  WHERE NOT t.is_platform_owner
  ORDER BY t.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.platform_tenant_usage() IS
  'Uso por cliente, para o painel /uso. UNICA leitura entre tenants do Pulse: exige estar no '
  'tenant dono e ter plataforma:ler-uso. Devolve contagem e data, nunca nome de projeto, '
  'cliente, valor, margem ou salario (PUL-258).';

REVOKE ALL ON FUNCTION public.platform_tenant_usage() FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_tenant_usage() TO authenticated;
