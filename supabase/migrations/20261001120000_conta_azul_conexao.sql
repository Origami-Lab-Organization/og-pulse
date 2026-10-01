-- Conta Azul — conexão por empresa e as capacidades da conciliação (ADR-0044, parte 1).
--
-- Cada empresa do Pulse liga a PRÓPRIA conta do Conta Azul. O token dá acesso de
-- ADMINISTRADOR ao ERP — a API não tem escopo de leitura —, então:
--   * `conta_azul_tokens` e `conta_azul_oauth_states` não têm policy nenhuma: só as Edge
--     Functions (service role) leem e escrevem. O navegador nunca vê token.
--   * O token chega aqui já cifrado (AES-256-GCM), com a chave nos secrets das Edge
--     Functions. O banco sozinho — ou quem tem só a service key — entrega texto cifrado.
-- A linha da conexão (empresa ligada, status, última sincronização) não tem segredo: é lida
-- por quem gere a integração e por quem concilia, para a tela dizer "conectado a X".
--
-- Contrato: .harness/integrations/conta-azul.md
-- Matriz: .harness/capability-matrix.md, seção "10. Integrações e conciliação".
-- Rollback: supabase/rollback/20261001120000_conta_azul_conexao_rollback.sql

-- ── 1. Capacidades ───────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('integracoes:gerir', 'integracoes', 'Gerir integrações',
   'Conecta e desconecta o Conta Azul da empresa, pede sincronização e liga os centros de '
   'custo do Pulse aos do Conta Azul.',
   true),
  ('conciliacao:receber', 'conciliacao', 'Conciliar contas a receber',
   'Vê as parcelas de projeto ao lado das contas a receber do Conta Azul e confirma ou '
   'desfaz casamentos.',
   true),
  ('conciliacao:pagar', 'conciliacao', 'Conciliar contas a pagar',
   'Vê as contas a pagar do Conta Azul — inclusive pagamento de folha — ao lado dos custos '
   'do Pulse, e confirma ou desfaz casamentos.',
   true)
ON CONFLICT (key) DO NOTHING;

-- Cada capacidade nova nasce com quem já tem a capacidade vizinha (padrão de 20260915100000):
--   integracoes:gerir   ← configuracao:editar  (Admin) — é configuração da empresa
--   conciliacao:receber ← financeiro:ler       (Admin, Gerente) — parcela de projeto, ADR-0022
--   conciliacao:pagar   ← folha:ler            (Admin) — traz pagamento de folha
-- Mudar quem tem depois é toggle de perfil, não migration nova.
--
-- A guarda do último admin (20260902170000) roda também em INSERT e confere, no COMMIT, se o
-- tenant ainda tem alguém com `pessoa:editar-papel` — por `has_capability`, que nega tudo em
-- tenant com teste encerrado. Inserir capacidade nos perfis de TODOS os tenants esbarraria
-- nesses e pararia o deploy, como em 29/09/2026 (20260929120000). Acrescentar capacidade nova
-- não tem como tirar `pessoa:editar-papel` de ninguém: a guarda sai só neste trecho.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, e.nova, true
FROM public.role_capabilities rc
JOIN (VALUES
  ('integracoes:gerir',   'configuracao:editar'),
  ('conciliacao:receber', 'financeiro:ler'),
  ('conciliacao:pagar',   'folha:ler')
) AS e(nova, origem) ON e.origem = rc.capability
WHERE rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

-- Cliente novo nasce com o mesmo desenho (20260904260000).
INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, e.nova
FROM public.default_role_capabilities drc
JOIN (VALUES
  ('integracoes:gerir',   'configuracao:editar'),
  ('conciliacao:receber', 'financeiro:ler'),
  ('conciliacao:pagar',   'folha:ler')
) AS e(nova, origem) ON e.origem = drc.capability
ON CONFLICT (role_name, capability) DO NOTHING;

-- Exceções por pessoa acompanham a capacidade de origem.
INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, e.nova, o.enabled,
       'espelhamento de ' || e.origem || ' (integração Conta Azul, 01/10/2026)'
FROM public.user_capability_overrides o
JOIN (VALUES
  ('integracoes:gerir',   'configuracao:editar'),
  ('conciliacao:receber', 'financeiro:ler'),
  ('conciliacao:pagar',   'folha:ler')
) AS e(nova, origem) ON e.origem = o.capability
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Conexão ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.conta_azul_connections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Uma conexão por empresa do Pulse.
  tenant_id        uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- `id_empresa` do Conta Azul. Único no Pulse inteiro: a mesma conta ligada a dois tenants
  -- duplicaria o financeiro dela em dois lugares (ADR-0044, item 2).
  ca_company_id    text NOT NULL UNIQUE,
  ca_document      text,
  ca_legal_name    text,
  ca_trade_name    text,
  -- `reconectar`: a renovação do token falhou de vez (acesso revogado no Conta Azul ou
  -- refresh token morto). Só uma nova autorização resolve.
  status           text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'reconectar')),
  connected_by     uuid,
  connected_at     timestamptz NOT NULL DEFAULT now(),
  last_sync_at     timestamptz,
  -- Mensagem para a tela, já sem token, código ou payload.
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conta_azul_connections IS
  'Conta do Conta Azul ligada a cada empresa do Pulse (ADR-0044). Sem segredo: o token mora em conta_azul_tokens.';

CREATE TRIGGER conta_azul_connections_updated_at
  BEFORE UPDATE ON public.conta_azul_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conta_azul_connections ENABLE ROW LEVEL SECURITY;

-- Escrita só pelas Edge Functions (service role). A tela lê para mostrar o estado.
CREATE POLICY conta_azul_connections_select
  ON public.conta_azul_connections FOR SELECT
  TO authenticated
  USING (
    public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir')
    OR public.has_capability(auth.uid(), tenant_id, 'conciliacao:receber')
    OR public.has_capability(auth.uid(), tenant_id, 'conciliacao:pagar')
  );

REVOKE ALL ON public.conta_azul_connections FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.conta_azul_connections FROM authenticated;
GRANT SELECT ON public.conta_azul_connections TO authenticated;

-- ── 3. Token (cifrado) ───────────────────────────────────────────────────────────────────

CREATE TABLE public.conta_azul_tokens (
  connection_id        uuid PRIMARY KEY REFERENCES public.conta_azul_connections(id) ON DELETE CASCADE,
  -- `base64(iv).base64(texto cifrado)`, AES-256-GCM. Nunca o token em claro.
  access_token_cipher  text NOT NULL,
  refresh_token_cipher text NOT NULL,
  access_expires_at    timestamptz NOT NULL,
  -- Trava da renovação. O refresh token rotaciona a cada uso: duas renovações ao mesmo tempo
  -- e a segunda manda um token que já morreu — a conexão cai. Quem renova pega a trava antes.
  refreshing_until     timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conta_azul_tokens IS
  'Token OAuth cifrado de cada conexão Conta Azul. Sem policy: só service role. Ver ADR-0044, item 3.';

CREATE TRIGGER conta_azul_tokens_updated_at
  BEFORE UPDATE ON public.conta_azul_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conta_azul_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conta_azul_tokens FROM anon, authenticated;

-- ── 4. Estado do OAuth ───────────────────────────────────────────────────────────────────

-- O `state` amarra o retorno do Conta Azul a quem pediu a conexão: sem ele, um link de
-- retorno forjado ligaria a conta de outra pessoa à empresa de quem clicou.
CREATE TABLE public.conta_azul_oauth_states (
  state       text PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conta_azul_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conta_azul_oauth_states FROM anon, authenticated;

-- ── 5. Trava da renovação ────────────────────────────────────────────────────────────────

-- Pega a trava se ninguém estiver renovando (ou se a trava anterior venceu). Usa o relógio
-- do banco, não o da Edge Function, para duas execuções concorrentes concordarem.
CREATE FUNCTION public.conta_azul_claim_refresh(p_connection_id uuid, p_seconds integer DEFAULT 30)
RETURNS boolean
LANGUAGE sql
SET search_path = ''
AS $$
  WITH claimed AS (
    UPDATE public.conta_azul_tokens
       SET refreshing_until = now() + make_interval(secs => p_seconds)
     WHERE connection_id = p_connection_id
       AND (refreshing_until IS NULL OR refreshing_until < now())
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM claimed);
$$;

REVOKE ALL ON FUNCTION public.conta_azul_claim_refresh(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.conta_azul_claim_refresh(uuid, integer) TO service_role;
