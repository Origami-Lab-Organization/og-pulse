-- Arquivos de projeto deixam de ser exclusivamente PDF e ganham exclusao.
-- Escrita e leitura continuam pela tabela (RLS de 20260619150000 ja cobre
-- INSERT/DELETE por admin ou GP), sem RPC nova: o unico efeito que precisava
-- ser atomico — zerar projects.contract_url ao apagar o contrato — vira trigger.

-- 1. Libera o mime type. O CHECK inline da criacao fixava 'application/pdf'.
ALTER TABLE public.project_files
  DROP CONSTRAINT IF EXISTS project_files_mime_type_check;

ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_mime_type_check
  CHECK (length(trim(mime_type)) > 0);

-- Nome exibido nao pode ser vazio — e ele que identifica o arquivo na lista.
ALTER TABLE public.project_files
  DROP CONSTRAINT IF EXISTS project_files_file_name_check;

ALTER TABLE public.project_files
  ADD CONSTRAINT project_files_file_name_check
  CHECK (length(trim(file_name)) > 0);

-- 2. Bucket aceita qualquer mime; o limite de 10MB do bucket permanece.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE id = 'project-contracts';

-- 3. Apagar o contrato zera projects.contract_url na mesma transacao. Sem isso,
--    a tela do projeto continuaria apontando para um path que nao existe mais.
--    SECURITY INVOKER de proposito: quem pode apagar o arquivo
--    (project_files_delete_admin_or_pm) satisfaz o mesmo can_manage_project
--    exigido pela policy de UPDATE de projects — nao ha ganho de privilegio.
CREATE OR REPLACE FUNCTION public.clear_project_contract_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.category = 'contract' THEN
    UPDATE public.projects
    SET contract_url = NULL
    WHERE id = OLD.project_id
      AND tenant_id = OLD.tenant_id
      AND contract_url = OLD.storage_path;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.clear_project_contract_url() IS
  'Trigger de DELETE em project_files: zera projects.contract_url quando o arquivo removido era o contrato vigente.';

DROP TRIGGER IF EXISTS project_files_clear_contract_url ON public.project_files;

CREATE TRIGGER project_files_clear_contract_url
  AFTER DELETE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_project_contract_url();

COMMENT ON TABLE public.project_files IS
  'Metadados de arquivos privados de projetos: contrato (category=contract, refletido em projects.contract_url) e documentos gerais (category=document).';
