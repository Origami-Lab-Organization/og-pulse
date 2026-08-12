-- Corrige quem enxerga e quem escreve arquivos de projeto.
--
-- can_view_project_document nasceu (20260619150000) resolvendo "membro do
-- projeto" por project_members. Depois do ADR-0006 essa tabela ficou vazia para
-- todo projeto montado pela aba Equipe, entao na pratica a equipe alocada nao
-- enxergava os arquivos nem a aba. Isto restaura a intencao original da policy
-- lendo project_role_allocations; nao amplia o escopo desenhado.
--
-- Junto, a escrita passa a refletir a regra do time: membro alocado sobe
-- arquivo e exclui apenas o que ele mesmo subiu; GP e admin excluem qualquer um.
--
-- Pastas/subpastas NAO entram aqui: a arvore sera espelho do OneDrive e o
-- desenho depende do ADR-0019.

CREATE OR REPLACE FUNCTION public.is_project_team_member(
  _user_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_role_allocations pra
    JOIN public.employees e ON e.id = pra.employee_id
    WHERE pra.project_id = _project_id
      AND e.auth_id = _user_id
  )
  -- Fonte legada mantida ate a Fase 4 do ADR-0006 remover project_members:
  -- projetos anteriores ao cutover ainda so existem la.
  OR EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    WHERE pm.project_id = _project_id
      AND e.auth_id = _user_id
  );
$$;

COMMENT ON FUNCTION public.is_project_team_member(uuid, uuid) IS
  'Security definer helper para RLS: pessoa alocada no projeto (project_role_allocations, com fallback legado em project_members ate a Fase 4 do ADR-0006).';

REVOKE ALL ON FUNCTION public.is_project_team_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_team_member(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_project_document(
  _user_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND public.user_belongs_to_tenant(_user_id, p.tenant_id)
      AND (
        public.is_admin_or_manager(_user_id, p.tenant_id)
        OR public.is_project_team_member(_user_id, p.id)
      )
  );
$$;

-- Mesmo defeito, mesma correcao: can_link_project_rito (20260805220000) declara
-- no proprio COMMENT que "membro alocado" pode vincular rito, mas resolvia isso
-- por project_members.
CREATE OR REPLACE FUNCTION public.can_link_project_rito(
  _user_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_project(_user_id, _project_id)
    OR public.is_project_team_member(_user_id, _project_id);
$$;

-- ─── Escrita: membro sobe, autor ou GP exclui ────────────────────────────────
DROP POLICY IF EXISTS "project_files_insert_admin_or_pm" ON public.project_files;
DROP POLICY IF EXISTS "project_files_insert_team_member" ON public.project_files;
CREATE POLICY "project_files_insert_team_member"
  ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_project_document(auth.uid(), project_id)
    AND public.project_child_tenant_matches(project_id, tenant_id)
  );

DROP POLICY IF EXISTS "project_files_delete_admin_or_pm" ON public.project_files;
DROP POLICY IF EXISTS "project_files_delete_owner_or_pm" ON public.project_files;
CREATE POLICY "project_files_delete_owner_or_pm"
  ON public.project_files FOR DELETE TO authenticated
  USING (
    public.can_manage_project(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = public.project_files.uploaded_by
        AND e.auth_id = auth.uid()
    )
  );

-- O objeto no storage segue a mesma regra da linha de metadados: quem pode
-- registrar o arquivo precisa conseguir gravar os bytes, e quem pode apagar a
-- linha precisa conseguir apagar o objeto.
DROP POLICY IF EXISTS "project_contracts_insert_admin_or_pm" ON storage.objects;
DROP POLICY IF EXISTS "project_contracts_insert_team_member" ON storage.objects;
CREATE POLICY "project_contracts_insert_team_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-contracts'
    AND public.user_belongs_to_tenant(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
    AND public.can_view_project_document(
      auth.uid(),
      ((storage.foldername(name))[2])::uuid
    )
    AND public.project_child_tenant_matches(
      ((storage.foldername(name))[2])::uuid,
      ((storage.foldername(name))[1])::uuid
    )
  );

DROP POLICY IF EXISTS "project_contracts_delete_admin_or_pm" ON storage.objects;
DROP POLICY IF EXISTS "project_contracts_delete_team_member" ON storage.objects;
CREATE POLICY "project_contracts_delete_team_member"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-contracts'
    AND (
      public.can_manage_project(
        auth.uid(),
        ((storage.foldername(name))[2])::uuid
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_files pf
        JOIN public.employees e ON e.id = pf.uploaded_by
        WHERE pf.storage_path = storage.objects.name
          AND e.auth_id = auth.uid()
      )
    )
  );
