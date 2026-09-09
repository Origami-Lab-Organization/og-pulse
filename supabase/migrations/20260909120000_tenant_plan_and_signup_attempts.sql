-- PUL-224 / PUL-227 — Plano e período de teste do tenant; registro de tentativas de cadastro.
--
-- Decisões de 09/09/2026 (Italo): autocadastro aberto; teste grátis de 14 dias; depois, a empresa
-- fala com italo@origamilab.com.br para continuar; o plano vive no banco como fonte de verdade.
--
-- 1) tenants.plan / trial_ends_at / plan_changed_at / plan_changed_by.
-- 2) Tenants que já existem nasceram antes do plano: ficam 'active', sem prazo.
-- 3) Tenant novo nasce 'trial' com 14 dias corridos (trigger BEFORE INSERT).
-- 4) As colunas de plano só mudam por service role ou por sessão direta no banco
--    (trigger BEFORE UPDATE). A policy de UPDATE de tenants (configuracao:editar) continua
--    valendo para os demais campos. Plano NÃO é capacidade: ADR-0027, ponto 7 — o tenant
--    nunca é configurável pelo próprio mecanismo. Quem libera é a Origami.
-- 5) signup_attempts: limite de chamadas do autocadastro (função register-tenant). Sem policy
--    de propósito: só a service role lê e escreve. Guarda apenas hashes (LGPD).
--
-- Reversão: DROP das colunas, triggers, funções e da tabela; nenhuma linha de negócio é apagada.

-- ---------------------------------------------------------------------------------------------
-- 1. Colunas de plano
-- ---------------------------------------------------------------------------------------------

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_changed_by text;

-- 2. Backfill: quem já existe é cliente ativo. Sem isso, o bloqueio de teste expirado
--    (PUL-228) trancaria a Origami fora do próprio sistema.
UPDATE public.tenants
   SET plan = 'active',
       trial_ends_at = NULL,
       plan_changed_at = now(),
       plan_changed_by = 'migration:20260909120000'
 WHERE plan = 'trial'
   AND trial_ends_at IS NULL;

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_plan_check CHECK (plan IN ('trial', 'active'));

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_trial_has_end;
ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_trial_has_end CHECK (plan <> 'trial' OR trial_ends_at IS NOT NULL);

COMMENT ON COLUMN public.tenants.plan IS
  'trial | active. Decidido pela Origami, nunca pelo tenant (PUL-224).';
COMMENT ON COLUMN public.tenants.trial_ends_at IS
  'Fim do período de teste: 14 dias corridos a partir da criação. NULL quando plan = active.';
COMMENT ON COLUMN public.tenants.plan_changed_at IS
  'Quando o plano mudou pela última vez (trilha).';
COMMENT ON COLUMN public.tenants.plan_changed_by IS
  'Quem mudou o plano: role do JWT, usuário de banco ou rótulo informado na própria alteração.';

-- ---------------------------------------------------------------------------------------------
-- 3. Tenant novo nasce em teste por 14 dias
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tenants_default_trial()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'trial' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := now() + interval '14 days';
  END IF;
  NEW.plan_changed_at := coalesce(NEW.plan_changed_at, now());
  NEW.plan_changed_by := coalesce(NEW.plan_changed_by, 'autocadastro');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_default_trial ON public.tenants;
CREATE TRIGGER trg_tenants_default_trial
BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tenants_default_trial();

-- ---------------------------------------------------------------------------------------------
-- 4. Só a Origami muda o plano
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tenants_guard_plan_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  -- Sessão direta no banco (psql, SQL Editor) não tem claims: fica ''. Service role tem 'service_role'.
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  plan_changed boolean := (NEW.plan, NEW.trial_ends_at) IS DISTINCT FROM (OLD.plan, OLD.trial_ends_at);
BEGIN
  IF NOT plan_changed THEN
    -- A trilha só se move junto com o plano.
    NEW.plan_changed_at := OLD.plan_changed_at;
    NEW.plan_changed_by := OLD.plan_changed_by;
    RETURN NEW;
  END IF;

  IF jwt_role NOT IN ('', 'service_role') THEN
    RAISE EXCEPTION 'O plano do tenant só pode ser alterado pela Origami.'
      USING ERRCODE = '42501';
  END IF;

  NEW.plan_changed_at := now();
  NEW.plan_changed_by := coalesce(
    nullif(NEW.plan_changed_by, OLD.plan_changed_by),
    nullif(jwt_role, ''),
    session_user::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_guard_plan_columns ON public.tenants;
CREATE TRIGGER trg_tenants_guard_plan_columns
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.tenants_guard_plan_columns();

-- ---------------------------------------------------------------------------------------------
-- 5. Tentativas de autocadastro (limite de chamadas)
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text NOT NULL,
  outcome text NOT NULL DEFAULT 'attempt',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signup_attempts_ip_idx ON public.signup_attempts (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS signup_attempts_email_idx ON public.signup_attempts (email_hash, created_at DESC);

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_attempts FROM anon, authenticated;

COMMENT ON TABLE public.signup_attempts IS
  'Tentativas de autocadastro (register-tenant). Só hashes de IP e e-mail; linhas expiram em 1 dia por limpeza da própria função. Sem policy: só service role.';
