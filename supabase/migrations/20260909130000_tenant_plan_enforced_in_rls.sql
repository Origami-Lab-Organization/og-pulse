-- PUL-228 — Teste expirado é negado também pela API, não só na tela. Ver ADR-0028.
--
-- Todas as policies do Pulse decidem por dois predicados SECURITY DEFINER:
--   * user_belongs_to_tenant(_user_id, _tenant_id)  — pertencimento (leituras tenant-wide);
--   * has_capability(_user_id, _tenant_id, _cap)     — capacidade por papel/override (ADR-0027).
-- Fazer os dois exigirem tenant ATIVO fecha o acesso de um tenant com teste vencido em todas
-- as tabelas que usam RLS, sem tocar policy por policy.
--
-- Exceções de bootstrap (para a pessoa VER que o teste acabou, em vez de um erro seco):
--   * employees: a policy de leitura da própria linha (auth_id = auth.uid()) não usa os
--     predicados e continua valendo — o AuthContext carrega o funcionário;
--   * tenants: a leitura do próprio tenant passa a usar o pertencimento puro
--     (user_is_member_of_tenant), para o app ler plan/trial_ends_at e redirecionar para
--     /teste-encerrado (camada de tela, já entregue).
--
-- Fora daqui (registrado em PUL-228): service role ignora RLS por definição — Edge Functions
-- de convite/lembrete e os crons precisam checar tenant_is_active() por conta própria; e as
-- policies de storage que escrevem o EXISTS "na mão" (20260904275000) não passam por aqui.
--
-- Reversão: recriar user_belongs_to_tenant e has_capability com os corpos anteriores
-- (20260121002930 e 20260902130000) e a policy de tenants com user_belongs_to_tenant.

-- ---------------------------------------------------------------------------------------------
-- 1. tenant_is_active: a regra do plano em um lugar só
-- ---------------------------------------------------------------------------------------------

-- SECURITY DEFINER de propósito: é chamada de dentro de policies, onde o usuário comum não
-- tem (nem deve ter) leitura garantida de tenants. Só lê plan e trial_ends_at pela PK.
CREATE OR REPLACE FUNCTION public.tenant_is_active(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenants t
    WHERE t.id = _tenant_id
      AND (
        t.plan = 'active'
        OR (t.plan = 'trial' AND t.trial_ends_at > now())
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.tenant_is_active(uuid) TO authenticated;

COMMENT ON FUNCTION public.tenant_is_active(uuid) IS
  'Tenant ativo ou em teste dentro do prazo (PUL-224/PUL-228, ADR-0028). Predicado único do plano; '
  'usado por user_belongs_to_tenant e has_capability. Service role não passa por RLS: Edge Functions '
  'e crons devem chamá-la por conta própria.';

-- ---------------------------------------------------------------------------------------------
-- 2. Pertencimento puro, para o bootstrap
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_is_member_of_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees
    WHERE auth_id = _user_id
      AND tenant_id = _tenant_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.user_is_member_of_tenant(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.user_is_member_of_tenant(uuid, uuid) IS
  'Pertencimento ao tenant SEM olhar o plano (corpo original de user_belongs_to_tenant). Só para '
  'policies de bootstrap que precisam funcionar com teste expirado — hoje, a leitura de tenants.';

-- ---------------------------------------------------------------------------------------------
-- 3. Os dois predicados canônicos passam a exigir tenant ativo
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_is_member_of_tenant(_user_id, _tenant_id)
     AND public.tenant_is_active(_tenant_id)
$$;

COMMENT ON FUNCTION public.user_belongs_to_tenant(uuid, uuid) IS
  'Pertence ao tenant E o tenant está ativo (plano active, ou trial dentro do prazo). Desde '
  '20260909130000 (PUL-228, ADR-0028) teste expirado nega leituras e escritas tenant-wide.';

CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _tenant_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.tenant_is_active(_tenant_id)
     AND COALESCE(
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
  'Resolve capacidade efetiva: override da pessoa tem precedência sobre o papel; ausência nega. '
  'Desde 20260909130000 exige também tenant ativo (PUL-228, ADR-0028): teste expirado nega tudo, '
  'e my_capabilities devolve vazio. Predicado canônico da onda de capacidades (ADR-0027).';

-- ---------------------------------------------------------------------------------------------
-- 4. Bootstrap: o próprio tenant continua legível para o app mostrar o fim do teste
-- ---------------------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant"
ON public.tenants FOR SELECT
TO authenticated
USING (public.user_is_member_of_tenant(auth.uid(), id));
