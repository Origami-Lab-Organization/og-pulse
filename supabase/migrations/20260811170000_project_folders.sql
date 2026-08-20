-- Pastas e subpastas de arquivos do projeto.
--
-- Regra (glossario "Arquivos do projeto"):
--   - GP e admin criam, renomeiam e excluem pastas.
--   - Membro alocado sobe arquivo (policy em 20260811160000).
--   - Pasta so e excluida quando vazia.
--
-- Formato de indice: as colunas external_* nascem nulas e existem porque a
-- arvore vai virar espelho do OneDrive (ADR-0019). Enquanto a integracao nao
-- existe, esta tabela e a fonte; depois dela passa a ser o indice local dos
-- driveItems, sem migration de tabela cheia. Nao ha coluna de bytes: o arquivo
-- continua no bucket project-contracts.

CREATE TABLE IF NOT EXISTS public.project_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.project_folders(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 120),
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  external_provider text CHECK (external_provider IS NULL OR external_provider IN ('onedrive')),
  external_id text,
  external_synced_at timestamptz,
  CONSTRAINT project_folders_tenant_matches_project
    CHECK (public.project_child_tenant_matches(project_id, tenant_id))
);

CREATE INDEX IF NOT EXISTS project_folders_project_parent_idx
  ON public.project_folders(project_id, parent_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS project_folders_external_id_unique
  ON public.project_folders(external_provider, external_id)
  WHERE external_id IS NOT NULL;

-- NULL nao colide em UNIQUE, entao raiz e subpasta precisam de indices separados.
CREATE UNIQUE INDEX IF NOT EXISTS project_folders_unique_name_in_parent
  ON public.project_folders(project_id, parent_id, lower(trim(name)))
  WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_folders_unique_name_at_root
  ON public.project_folders(project_id, lower(trim(name)))
  WHERE parent_id IS NULL;

ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_folders_select_tenant" ON public.project_folders;
CREATE POLICY "project_folders_select_tenant"
  ON public.project_folders FOR SELECT TO authenticated
  USING (public.can_view_project_document(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_folders_insert_admin_or_pm" ON public.project_folders;
CREATE POLICY "project_folders_insert_admin_or_pm"
  ON public.project_folders FOR INSERT TO authenticated
  WITH CHECK (
    public.can_manage_project(auth.uid(), project_id)
    AND public.project_child_tenant_matches(project_id, tenant_id)
  );

DROP POLICY IF EXISTS "project_folders_update_admin_or_pm" ON public.project_folders;
CREATE POLICY "project_folders_update_admin_or_pm"
  ON public.project_folders FOR UPDATE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id))
  WITH CHECK (public.can_manage_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "project_folders_delete_admin_or_pm" ON public.project_folders;
CREATE POLICY "project_folders_delete_admin_or_pm"
  ON public.project_folders FOR DELETE TO authenticated
  USING (public.can_manage_project(auth.uid(), project_id));

-- Pai precisa ser do mesmo projeto, sem ciclo e sem profundidade patologica
-- (a tela navega por breadcrumb, nao por arvore infinita).
CREATE OR REPLACE FUNCTION public.validate_project_folder_parent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ancestor uuid;
  v_ancestor_project uuid;
  v_depth int := 0;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Uma pasta não pode ser pai de si mesma';
  END IF;

  v_ancestor := NEW.parent_id;

  WHILE v_ancestor IS NOT NULL LOOP
    v_depth := v_depth + 1;

    IF v_depth > 10 THEN
      RAISE EXCEPTION 'Limite de 10 níveis de subpasta atingido';
    END IF;

    SELECT parent_id, project_id
    INTO v_ancestor, v_ancestor_project
    FROM public.project_folders
    WHERE id = v_ancestor;

    IF v_ancestor_project IS DISTINCT FROM NEW.project_id THEN
      RAISE EXCEPTION 'A pasta pai pertence a outro projeto';
    END IF;

    IF v_ancestor = NEW.id THEN
      RAISE EXCEPTION 'Movimentação criaria um ciclo de pastas';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_folders_validate_parent ON public.project_folders;
CREATE TRIGGER project_folders_validate_parent
  BEFORE INSERT OR UPDATE OF parent_id, project_id ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_project_folder_parent();

-- Arquivo passa a morar numa pasta (NULL = raiz).
ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.project_folders(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS project_files_folder_idx
  ON public.project_files(project_id, folder_id, created_at DESC);

-- Exclusao so com a pasta vazia. ON DELETE RESTRICT ja barra subpasta e
-- arquivo; o trigger troca o erro de FK por mensagem util na tela.
CREATE OR REPLACE FUNCTION public.block_delete_non_empty_project_folder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.project_folders WHERE parent_id = OLD.id) THEN
    RAISE EXCEPTION 'A pasta contém subpastas. Esvazie antes de excluir.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_files WHERE folder_id = OLD.id) THEN
    RAISE EXCEPTION 'A pasta contém arquivos. Esvazie antes de excluir.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS project_folders_block_delete_non_empty ON public.project_folders;
CREATE TRIGGER project_folders_block_delete_non_empty
  BEFORE DELETE ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.block_delete_non_empty_project_folder();

CREATE OR REPLACE FUNCTION public.project_folder_belongs_to_project(
  _folder_id uuid,
  _project_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _folder_id IS NULL OR EXISTS (
    SELECT 1
    FROM public.project_folders f
    WHERE f.id = _folder_id
      AND f.project_id = _project_id
  );
$$;

COMMENT ON FUNCTION public.project_folder_belongs_to_project(uuid, uuid) IS
  'Security definer helper para RLS: impede anexar arquivo a pasta de outro projeto.';

REVOKE ALL ON FUNCTION public.project_folder_belongs_to_project(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_folder_belongs_to_project(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "project_files_insert_team_member" ON public.project_files;
CREATE POLICY "project_files_insert_team_member"
  ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_project_document(auth.uid(), project_id)
    AND public.project_child_tenant_matches(project_id, tenant_id)
    AND public.project_folder_belongs_to_project(folder_id, project_id)
  );

COMMENT ON TABLE public.project_folders IS
  'Pastas e subpastas de arquivos do projeto. GP/admin gerenciam; exclusao apenas quando vazia. external_* reservado para o espelho do OneDrive (ADR-0019).';
COMMENT ON COLUMN public.project_files.folder_id IS
  'Pasta onde o arquivo esta. NULL = raiz da aba Arquivos.';
