-- PUL-206, passo 3 — cliente novo nasce com perfis, e o padrão passa a ser DADO.
--
-- LACUNA ENCONTRADA: `register-tenant` cria o tenant, o funcionário e a linha em
-- `user_roles`. Não cria perfil nenhum em `tenant_roles`. Depois da virada, isso significa
-- que quem entra num cliente novo fica sem capacidade alguma — o espelhamento procura o
-- papel por nome, não encontra, e a pessoa abre o Pulse sem acesso a nada. Os quatro
-- tenants atuais só têm perfil porque o seed da migração os criou nominalmente.
--
-- Com o objetivo de 80 a 100 clientes, "o que um cliente novo começa podendo" é uma
-- definição de produto e precisa ser inspecionável, não código escondido num INSERT. Então
-- vira tabela: os perfis padrão e a matriz padrão são dados, semeados a partir do que o
-- cliente de referência tem hoje — o que garante que o cliente novo começa exatamente com o
-- comportamento que já validamos.

CREATE TABLE IF NOT EXISTS public.default_tenant_roles (
  name       text PRIMARY KEY,
  is_default boolean NOT NULL DEFAULT false,
  position   integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.default_role_capabilities (
  role_name  text NOT NULL REFERENCES public.default_tenant_roles(name) ON DELETE CASCADE,
  capability text NOT NULL REFERENCES public.capabilities(key) ON DELETE CASCADE,
  PRIMARY KEY (role_name, capability)
);

ALTER TABLE public.default_tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_role_capabilities ENABLE ROW LEVEL SECURITY;

-- Leitura liberada a quem está autenticado: é catálogo de produto, não dado de cliente.
-- Escrita não tem policy nenhuma de propósito — muda por migration, como o vocabulário.
CREATE POLICY "Autenticados leem os perfis padrao" ON public.default_tenant_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados leem a matriz padrao" ON public.default_role_capabilities
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.default_tenant_roles (name, is_default, position) VALUES
  ('Admin', false, 1), ('Gerente', false, 2), ('RH', false, 3), ('Colaborador', true, 4)
ON CONFLICT (name) DO NOTHING;

-- A matriz padrão sai do tenant de referência: o que está em produção hoje, validado por
-- paridade. Copiar em vez de reescrever evita a divergência entre "o que o cliente atual
-- tem" e "o que o cliente novo recebe".
INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT tr.name, rc.capability
FROM public.role_capabilities rc
JOIN public.tenant_roles tr ON tr.id = rc.role_id
WHERE rc.enabled
  AND tr.name IN ('Admin', 'Gerente', 'RH', 'Colaborador')
  AND tr.tenant_id = (
    SELECT tenant_id FROM public.tenant_roles GROUP BY tenant_id ORDER BY count(*) DESC LIMIT 1
  )
ON CONFLICT (role_name, capability) DO NOTHING;

-- O semeador, idempotente: chamável para consertar tenant já criado sem perfil.
CREATE OR REPLACE FUNCTION public.seed_tenant_roles(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_roles (tenant_id, name, is_default)
  SELECT _tenant_id, d.name, d.is_default
  FROM public.default_tenant_roles d
  ORDER BY d.position
  ON CONFLICT (tenant_id, name) DO NOTHING;

  INSERT INTO public.role_capabilities (role_id, capability, enabled)
  SELECT tr.id, d.capability, true
  FROM public.default_role_capabilities d
  JOIN public.tenant_roles tr ON tr.tenant_id = _tenant_id AND tr.name = d.role_name
  ON CONFLICT (role_id, capability) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant_roles(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_tenant_roles_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_tenant_roles(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_roles ON public.tenants;
CREATE TRIGGER trg_seed_tenant_roles
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_tenant_roles_on_insert();

-- Conserta o que já existe: tenant sem perfil recebe o padrão. Nos quatro atuais é no-op.
DO $$
DECLARE t uuid;
BEGIN
  FOR t IN SELECT id FROM public.tenants WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_roles tr WHERE tr.tenant_id = tenants.id
  ) LOOP
    PERFORM public.seed_tenant_roles(t);
  END LOOP;
END $$;

COMMENT ON TABLE public.default_tenant_roles IS
  'Perfis com que um cliente novo nasce. Muda por migration — e a mudanca vale para os '
  'proximos clientes, nunca retroativamente (PUL-206).';
