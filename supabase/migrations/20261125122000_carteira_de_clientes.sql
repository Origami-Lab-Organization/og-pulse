-- US-0049 — uma tela só para empresas e clientes (ADR-0056).
--
-- A página Clientes sai; a tela Empresas ganha a aba Clientes, com a carteira calculada: cliente é
-- a empresa com Ganho ou com projeto (US-0045). Orçamento não conta.
--
-- 1. `carteira_de_clientes(p_tenant)`: a lista da aba. Definer para que quem só tem `cliente:ler`
--    (GP sem Prospecção) veja a relação sem ganhar leitura da Prospecção nem dos projetos dos
--    outros. Devolve só nome, CNPJ, cidade, relação e o projeto ou Ganho que a explica: nada de
--    valor, custo ou margem.
-- 2. A identificação do cliente é editada pelo comercial (`prospeccao:editar`) e pelo admin. Esta
--    migration passa a aceitar `prospeccao:editar` onde hoje vale `cliente:editar`, sem tirar
--    `cliente:editar` ainda: o front em produção continua funcionando até o merge. A capacidade
--    sai em 20261125123000.

-- 1. A carteira ------------------------------------------------------------------------------------

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

-- 2. Quem edita: o comercial e o admin --------------------------------------------------------------

DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
CREATE POLICY "Admins and managers can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update clients" ON public.clients;
CREATE POLICY "Admins and managers can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;
CREATE POLICY "Admins and managers can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can insert client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can insert client_contacts" ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can update client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can update client_contacts" ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

DROP POLICY IF EXISTS "Admins and managers can delete client_contacts" ON public.client_contacts;
CREATE POLICY "Admins and managers can delete client_contacts" ON public.client_contacts
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
         OR public.has_capability(auth.uid(), tenant_id, 'cliente:editar'));

-- Stakeholder do cliente (sem projeto, ADR-0037): o mesmo de quem edita o cliente. O do projeto
-- continua com projeto:editar e a gestão do projeto.
DROP POLICY IF EXISTS "Admins and managers can insert project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can insert project stakeholders" ON public.project_stakeholders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND (public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar'))))
  );

DROP POLICY IF EXISTS "Admins and managers can update project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can update project stakeholders" ON public.project_stakeholders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND (public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar'))))
  );

DROP POLICY IF EXISTS "Admins and managers can delete project stakeholders" ON public.project_stakeholders;
CREATE POLICY "Admins and managers can delete project stakeholders" ON public.project_stakeholders
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.projects p
             WHERE p.id = project_stakeholders.project_id
               AND public.has_capability(auth.uid(), p.tenant_id, 'projeto:editar')
               AND public.can_manage_project(auth.uid(), p.id))
    OR (project_id IS NULL AND EXISTS (
      SELECT 1 FROM public.clients c
       WHERE c.id = project_stakeholders.client_id
         AND (public.has_capability(auth.uid(), c.tenant_id, 'prospeccao:editar')
              OR public.has_capability(auth.uid(), c.tenant_id, 'cliente:editar'))))
  );
