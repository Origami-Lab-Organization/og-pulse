-- GP-J9: contratos privados vinculados ao projeto.
-- Convencao de path: {tenant_id}/{project_id}/{uuid}.pdf

-- Mantem esta migration autocontida para ambientes que ainda nao aplicaram
-- 20260526110000_project_pm_portfolio_access.sql.
CREATE OR REPLACE FUNCTION public.can_manage_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    LEFT JOIN public.employees manager
      ON manager.id = p.manager_id
      AND manager.tenant_id = p.tenant_id
    WHERE p.id = _project_id
      AND (
        public.has_role(_user_id, p.tenant_id, 'admin')
        OR manager.auth_id = _user_id
      )
  );
$$;

COMMENT ON FUNCTION public.can_manage_project(uuid, uuid) IS
  'Security definer helper for RLS: permite escrita a admins ou ao employee definido como manager_id do projeto.';

CREATE OR REPLACE FUNCTION public.project_child_tenant_matches(
  _project_id uuid,
  _tenant_id uuid
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
      AND p.tenant_id = _tenant_id
  );
$$;

COMMENT ON FUNCTION public.project_child_tenant_matches(uuid, uuid) IS
  'Security definer helper para validar que um recurso filho pertence ao mesmo tenant do projeto.';

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (length(trim(category)) > 0),
  file_name text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  mime_type text NOT NULL CHECK (mime_type = 'application/pdf'),
  storage_path text NOT NULL UNIQUE,
  uploaded_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_files_tenant_matches_project
    CHECK (public.project_child_tenant_matches(project_id, tenant_id))
);

CREATE INDEX IF NOT EXISTS project_files_project_id_idx
  ON public.project_files(project_id, created_at DESC);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

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
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          JOIN public.employees e ON e.id = pm.employee_id
          WHERE pm.project_id = p.id
            AND e.auth_id = _user_id
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_project_document(uuid, uuid) IS
  'Security definer restrito para RLS: documentos sao visiveis a admins, managers e membros do projeto, sempre no tenant do usuario.';

REVOKE ALL ON FUNCTION public.can_view_project_document(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_project_document(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "project_files_select_tenant" ON public.project_files;
CREATE POLICY "project_files_select_tenant"
  ON public.project_files FOR SELECT TO authenticated
  USING (public.can_view_project_document(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_files_insert_admin_or_pm" ON public.project_files;
CREATE POLICY "project_files_insert_admin_or_pm"
  ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_project(auth.uid(), project_id)
    AND public.project_child_tenant_matches(project_id, tenant_id)
  );

DROP POLICY IF EXISTS "project_files_delete_admin_or_pm" ON public.project_files;
CREATE POLICY "project_files_delete_admin_or_pm"
  ON public.project_files FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- Bucket exclusivo da J9. O bucket legado `contracts` tambem armazena Value Book
-- (inclusive DOC/DOCX), portanto nao pode receber as restricoes deste fluxo.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-contracts', 'project-contracts', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "project_contracts_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "project_contracts_insert_admin_or_pm" ON storage.objects;
DROP POLICY IF EXISTS "project_contracts_delete_admin_or_pm" ON storage.objects;

CREATE POLICY "project_contracts_select_tenant"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-contracts'
    AND public.can_view_project_document(
      auth.uid(),
      ((storage.foldername(name))[2])::uuid
    )
  );

CREATE POLICY "project_contracts_insert_admin_or_pm"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-contracts'
    AND public.user_belongs_to_tenant(
      auth.uid(),
      ((storage.foldername(name))[1])::uuid
    )
    AND public.can_manage_project(
      auth.uid(),
      ((storage.foldername(name))[2])::uuid
    )
    AND public.project_child_tenant_matches(
      ((storage.foldername(name))[2])::uuid,
      ((storage.foldername(name))[1])::uuid
    )
  );

CREATE POLICY "project_contracts_delete_admin_or_pm"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-contracts'
    AND public.can_manage_project(
      auth.uid(),
      ((storage.foldername(name))[2])::uuid
    )
  );

COMMENT ON TABLE public.project_files IS
  'Metadados de arquivos privados de projetos; GP-J9 inicialmente suporta um contrato PDF.';
COMMENT ON COLUMN public.projects.contract_url IS
  'Path privado no bucket project-contracts. Gerar URL assinada somente no momento do acesso.';

CREATE OR REPLACE FUNCTION public.attach_project_contract(
  p_tenant_id uuid,
  p_project_id uuid,
  p_file_name text,
  p_file_size bigint,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_file_id uuid;
  v_employee_id uuid;
BEGIN
  SELECT id INTO v_employee_id
  FROM public.employees
  WHERE auth_id = auth.uid()
    AND tenant_id = p_tenant_id
  LIMIT 1;

  INSERT INTO public.project_files (
    tenant_id,
    project_id,
    category,
    file_name,
    file_size,
    mime_type,
    storage_path,
    uploaded_by
  ) VALUES (
    p_tenant_id,
    p_project_id,
    'contract',
    p_file_name,
    p_file_size,
    'application/pdf',
    p_storage_path,
    v_employee_id
  )
  RETURNING id INTO v_file_id;

  UPDATE public.projects
  SET contract_url = p_storage_path
  WHERE id = p_project_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado ou sem permissão';
  END IF;

  RETURN v_file_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_project_contract(uuid, uuid, text, bigint, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_project_contract(uuid, uuid, text, bigint, text)
  TO authenticated;

COMMENT ON FUNCTION public.attach_project_contract(uuid, uuid, text, bigint, text) IS
  'Registra metadados e atualiza contract_url atomicamente, respeitando as RLS do chamador.';
