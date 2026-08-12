-- Remove o caso especial "contrato" dos arquivos de projeto.
--
-- Motivo: o contrato passa a viver na pasta do projeto no OneDrive (ADR-0019),
-- junto dos demais documentos. O campo projects.contract_url nunca sustentou
-- regra de negocio — nao travava etapa, nao entrava em checklist, relatorio ou
-- calculo financeiro. Era exibicao mais um ponto de captura no fechamento, que
-- agora aponta para o OneDrive.
--
-- NAO destroi dado: os PDFs continuam no bucket project-contracts e as linhas
-- em project_files (category='contract') seguem intactas, com o storage_path
-- para recuperacao manual. So a coluna, a RPC e o trigger saem.

DROP TRIGGER IF EXISTS project_files_clear_contract_url ON public.project_files;
DROP FUNCTION IF EXISTS public.clear_project_contract_url();

-- Depende da coluna: precisa cair antes dela.
DROP FUNCTION IF EXISTS public.attach_project_contract(uuid, uuid, text, bigint, text);

ALTER TABLE public.projects
  DROP COLUMN IF EXISTS contract_url;

COMMENT ON TABLE public.project_files IS
  'Metadados de arquivos privados de projetos. Linhas com category=contract sao historicas (ver 20260811190000); o fluxo atual grava apenas category=document, e projeto com raiz vinculada guarda os arquivos no OneDrive.';
