-- Rollback de 20261127120000_marcas_parceiro_e_cliente_antes_do_pulse (US-0051).
-- Volta a carteira da US-0049 (só Ganho ou projeto), apaga as marcas e a capacidade.

DROP FUNCTION IF EXISTS public.carteira_de_clientes(uuid);

CREATE OR REPLACE FUNCTION public.carteira_de_clientes(p_tenant uuid)
RETURNS TABLE (
  client_id uuid,
  empresa_id uuid,
  nome text,
  razao_social text,
  cnpj text,
  cidade text,
  estado text,
  relacao text,
  projetos_ativos integer,
  projetos integer,
  projeto_id uuid,
  projeto_nome text,
  projeto_status text,
  projeto_data date,
  ganho_id uuid,
  ganho_titulo text,
  ganho_responsavel uuid,
  ganho_em date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_capability(auth.uid(), p_tenant, 'cliente:ler')
    OR public.has_capability(auth.uid(), p_tenant, 'prospeccao:ler')
  ) THEN
    RAISE EXCEPTION 'Sem acesso à carteira de clientes.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    emp.id,
    coalesce(nullif(btrim(c.trading_name), ''), c.company_name),
    c.company_name,
    c.cnpj,
    c.cidade,
    c.estado,
    CASE WHEN coalesce(pr.ativos, 0) > 0 THEN 'cliente_ativo' ELSE 'ja_foi_cliente' END,
    coalesce(pr.ativos, 0),
    coalesce(pr.total, 0),
    ult.id,
    ult.name,
    ult.status::text,
    ult.data,
    gan.id,
    gan.title,
    gan.owner_id,
    gan.won_on
  FROM public.clients c
  LEFT JOIN LATERAL (
    SELECT pc.id
      FROM public.prospect_companies pc
     WHERE pc.client_id = c.id
     ORDER BY (pc.cnpj IS NULL), pc.created_at
     LIMIT 1
  ) emp ON true
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE p.status IN ('planning', 'active', 'paused'))::integer AS ativos,
           count(*)::integer AS total
      FROM public.projects p
     WHERE p.client_id = c.id
  ) pr ON true
  LEFT JOIN LATERAL (
    SELECT p.id, p.name, p.status,
           CASE WHEN p.status IN ('planning', 'active', 'paused') THEN p.start_date
                ELSE coalesce(p.completed_date, p.end_date, p.start_date) END AS data
      FROM public.projects p
     WHERE p.client_id = c.id
     ORDER BY (p.status IN ('planning', 'active', 'paused')) DESC,
              coalesce(p.completed_date, p.end_date, p.start_date) DESC NULLS LAST
     LIMIT 1
  ) ult ON true
  LEFT JOIN LATERAL (
    SELECT o.id, o.title, o.owner_id, o.won_on
      FROM public.prospects o
      JOIN public.prospect_companies pc ON pc.id = o.company_id
     WHERE pc.client_id = c.id
       AND o.stage = 'ganho'
     ORDER BY o.won_on DESC NULLS LAST
     LIMIT 1
  ) gan ON true
  WHERE c.tenant_id = p_tenant
    AND (coalesce(pr.total, 0) > 0 OR gan.id IS NOT NULL)
  ORDER BY 3;
END;
$$;

COMMENT ON FUNCTION public.carteira_de_clientes(uuid) IS
  'US-0049 (ADR-0056): a carteira da aba Clientes de Empresas — empresas com Ganho ou projeto, '
  'com a relação e o projeto ou Ganho que a explica. Exige cliente:ler ou prospeccao:ler no tenant.';

REVOKE ALL ON FUNCTION public.carteira_de_clientes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carteira_de_clientes(uuid) TO authenticated;

DROP TABLE IF EXISTS public.prospect_marcas_da_empresa;
DROP FUNCTION IF EXISTS public.prospect_marcas_da_empresa_guarda();

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;
DELETE FROM public.user_capability_overrides WHERE capability = 'cliente:marcar-antes-do-pulse';
DELETE FROM public.role_capabilities WHERE capability = 'cliente:marcar-antes-do-pulse';
DELETE FROM public.default_role_capabilities WHERE capability = 'cliente:marcar-antes-do-pulse';
ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
DELETE FROM public.capabilities WHERE key = 'cliente:marcar-antes-do-pulse';
