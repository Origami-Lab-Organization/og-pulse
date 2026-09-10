-- Rollback de 20260910170000 (PUL-256): volta a guarda ao comportamento de PUL-204.
--
-- ATENCAO: aplicar este rollback VOLTA A QUEBRAR o autocadastro. A guarda passa a barrar o
-- INSERT em `tenants`, porque no COMMIT dessa transacao o tenant ainda nao tem pessoa
-- vinculada. Só faz sentido se `register-tenant` passar a criar tudo numa transacao unica
-- (RPC), quando a saida antecipada deixa de ser necessaria.

CREATE OR REPLACE FUNCTION public.assert_tenant_keeps_profile_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant uuid;
BEGIN
  IF TG_TABLE_NAME = 'role_capabilities' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT r.tenant_id INTO _tenant FROM public.tenant_roles r WHERE r.id = OLD.role_id;
    ELSE
      SELECT r.tenant_id INTO _tenant FROM public.tenant_roles r WHERE r.id = NEW.role_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      _tenant := OLD.tenant_id;
    ELSE
      _tenant := NEW.tenant_id;
    END IF;
  END IF;

  IF _tenant IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_tenant_roles utr
    WHERE utr.tenant_id = _tenant
      AND public.has_capability(utr.user_id, _tenant, 'pessoa:editar-papel')
  ) THEN
    RAISE EXCEPTION
      'A operacao deixaria este tenant sem ninguem capaz de gerir perfis (pessoa:editar-papel). '
      'Conceda a capacidade a outro papel ou pessoa antes de remover esta.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;
