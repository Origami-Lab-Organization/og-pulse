-- US-0053 — Estudo da conta: links, notas e arquivos da empresa, com os arquivos no OneDrive.
--
-- Decisões do Victor (26/11/2026): uma pasta por empresa no OneDrive do Comercial; o admin escolhe
-- a pasta do Comercial uma vez, em Configurações › Integrações; tirar um arquivo do estudo também o
-- apaga do OneDrive (o Pulse faz isso pelo Graph, com a conta de quem tira).
--
-- 1. `onedrive_do_comercial`: a pasta do Comercial de cada tenant. Lida por quem usa a Prospecção,
--    gravada só com `integracoes:gerir`. Uma linha por tenant; outro tenant não a vê.
-- 2. `prospect_companies.onedrive_*`: a pasta da empresa, criada no primeiro arquivo. Segue a RLS da
--    empresa (`prospeccao:ler` / `prospeccao:editar`).
-- 3. `prospect_company_estudo`: os itens do estudo (link, nota ou arquivo). Ler com
--    `prospeccao:ler`, incluir e tirar com `prospeccao:editar`; a empresa tem de ser do mesmo tenant.
--    O arquivo em si mora no OneDrive; aqui ficam só o nome, o tamanho e os ids para abrir e apagar.

-- 1. Pasta do Comercial ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.onedrive_do_comercial (
  tenant_id   uuid        PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  drive_id    text        NOT NULL CHECK (length(drive_id) BETWEEN 1 AND 300),
  item_id     text        NOT NULL CHECK (length(item_id) BETWEEN 1 AND 300),
  caminho     text        NOT NULL CHECK (length(caminho) BETWEEN 1 AND 1000),
  ligada_por  uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  ligada_em   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.onedrive_do_comercial IS
  'US-0053: pasta do OneDrive onde ficam as pastas das empresas (uma por tenant), escolhida pelo admin.';

ALTER TABLE public.onedrive_do_comercial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prospeccao readers can view the comercial onedrive folder" ON public.onedrive_do_comercial
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler')
      OR public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'));

CREATE POLICY "Integration admins can set the comercial onedrive folder" ON public.onedrive_do_comercial
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'));

CREATE POLICY "Integration admins can change the comercial onedrive folder" ON public.onedrive_do_comercial
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'));

CREATE POLICY "Integration admins can unlink the comercial onedrive folder" ON public.onedrive_do_comercial
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'integracoes:gerir'));

-- 2. Pasta da empresa ------------------------------------------------------------------------------

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS onedrive_drive_id text CHECK (onedrive_drive_id IS NULL OR length(onedrive_drive_id) <= 300),
  ADD COLUMN IF NOT EXISTS onedrive_item_id  text CHECK (onedrive_item_id IS NULL OR length(onedrive_item_id) <= 300);

COMMENT ON COLUMN public.prospect_companies.onedrive_item_id IS
  'US-0053: pasta da empresa dentro da pasta do Comercial no OneDrive; criada no primeiro arquivo do estudo.';

-- 3. Itens do estudo -------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_company_estudo (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id  uuid        NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  tipo        text        NOT NULL CHECK (tipo IN ('link', 'nota', 'arquivo')),
  titulo      text        NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 300),
  url         text        CHECK (url IS NULL OR length(url) <= 2000),
  texto       text        CHECK (texto IS NULL OR length(texto) <= 10000),
  drive_id    text        CHECK (drive_id IS NULL OR length(drive_id) <= 300),
  item_id     text        CHECK (item_id IS NULL OR length(item_id) <= 300),
  tamanho     bigint      CHECK (tamanho IS NULL OR tamanho >= 0),
  created_by  uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_company_estudo_link_tem_url CHECK (tipo <> 'link' OR url IS NOT NULL),
  CONSTRAINT prospect_company_estudo_nota_tem_texto CHECK (tipo <> 'nota' OR texto IS NOT NULL),
  CONSTRAINT prospect_company_estudo_arquivo_no_onedrive CHECK (tipo <> 'arquivo' OR (drive_id IS NOT NULL AND item_id IS NOT NULL))
);

COMMENT ON TABLE public.prospect_company_estudo IS
  'US-0053: links, notas e arquivos do estudo da conta. O arquivo mora no OneDrive (drive_id, item_id).';

CREATE INDEX IF NOT EXISTS prospect_company_estudo_empresa_idx
  ON public.prospect_company_estudo (tenant_id, company_id, created_at DESC);

ALTER TABLE public.prospect_company_estudo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prospeccao readers can view the account study" ON public.prospect_company_estudo
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

-- A empresa tem de ser do mesmo tenant: sem isso, um id de outro tenant entraria pelo insert.
CREATE POLICY "Prospeccao editors can add to the account study" ON public.prospect_company_estudo
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar')
    AND EXISTS (
      SELECT 1 FROM public.prospect_companies c
      WHERE c.id = prospect_company_estudo.company_id AND c.tenant_id = prospect_company_estudo.tenant_id
    )
  );

CREATE POLICY "Prospeccao editors can remove from the account study" ON public.prospect_company_estudo
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));
