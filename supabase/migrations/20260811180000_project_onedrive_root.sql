-- Vinculo do projeto com a pasta raiz escolhida no OneDrive (ADR-0019).
--
-- Guarda apenas o ponteiro: nenhum arquivo muda de lugar e nenhuma permissao e
-- transferida por esta migration. A sincronizacao da arvore e outro passo e
-- depende da decisao pendente do ADR-0019.
--
-- drive_id anda junto do item_id de proposito: no Graph, um driveItem id so
-- resolve dentro do drive dele. Guardar so o item transformaria a raiz em
-- ponteiro ambiguo no dia em que a raiz vier de uma biblioteca do SharePoint.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS onedrive_drive_id text,
  ADD COLUMN IF NOT EXISTS onedrive_root_item_id text,
  ADD COLUMN IF NOT EXISTS onedrive_root_path text,
  ADD COLUMN IF NOT EXISTS onedrive_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS onedrive_linked_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;

-- Vinculo e tudo-ou-nada: meia raiz (item sem drive) quebraria a chamada ao
-- Graph em runtime, longe da origem do erro.
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_onedrive_root_complete;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_onedrive_root_complete
  CHECK (
    (onedrive_drive_id IS NULL AND onedrive_root_item_id IS NULL)
    OR (onedrive_drive_id IS NOT NULL AND onedrive_root_item_id IS NOT NULL)
  );

COMMENT ON COLUMN public.projects.onedrive_drive_id IS
  'Drive do OneDrive/SharePoint onde a pasta raiz do projeto vive. Null = projeto sem vinculo.';
COMMENT ON COLUMN public.projects.onedrive_root_item_id IS
  'driveItem id da pasta raiz escolhida pelo GP.';
COMMENT ON COLUMN public.projects.onedrive_root_path IS
  'Caminho legivel da raiz, so para exibicao. Nao usar para resolver o item — o caminho muda quando alguem renomeia a pasta no OneDrive.';

-- A escrita ja e coberta pela policy de UPDATE de projects
-- (can_manage_project): so admin e GP do projeto vinculam a raiz.
