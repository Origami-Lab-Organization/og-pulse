-- Arquivos da oportunidade — anexados direto na ficha, sem registrar atividade (09/10/2026).
--
-- Pedido do Guilherme: ao lado de Tarefas, uma aba "Arquivos" com tudo o que já foi anexado
-- nas atividades, e que também aceite anexar ali. Anexar pela atividade conta um toque, agenda
-- a cadência e pode mover a etapa (trigger prospect_activities_advance); a proposta assinada ou
-- o contrato social não são um toque. Por isso o arquivo solto ganha tabela própria, e a aba
-- lê as duas fontes: esta tabela e `prospect_activities.attachments`.
--
-- Mesmo bucket e mesma convenção de path dos anexos de atividade
-- ({tenant_id}/{prospect_id}/{uuid}-{arquivo}, 20260917180000): a policy de storage já decide
-- pelo 1º segmento (`prospeccao:ler` / `prospeccao:editar`), e a tabela usa as mesmas
-- capacidades — as duas barreiras batem.
--
-- Rollback: supabase/rollback/20261009130000_prospect_files_rollback.sql

CREATE TABLE public.prospect_files (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  path        text        NOT NULL,
  name        text        NOT NULL,
  size        bigint      NOT NULL,
  type        text        NOT NULL,
  created_by  uuid        REFERENCES public.employees(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prospect_files_name_valid CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  CONSTRAINT prospect_files_size_valid CHECK (size >= 0 AND size <= 10485760),
  CONSTRAINT prospect_files_type_valid
    CHECK (type IN ('application/pdf', 'image/png', 'image/jpeg', 'image/webp'))
);

COMMENT ON TABLE public.prospect_files IS
  'Arquivos anexados direto na oportunidade (09/10/2026), sem atividade: não contam toque nem '
  'mexem na cadência. Objetos no bucket prospect-attachments.';
COMMENT ON COLUMN public.prospect_files.path IS
  'Caminho no bucket prospect-attachments: {tenant_id}/{prospect_id}/{uuid}-{arquivo}.';

CREATE INDEX prospect_files_prospect_idx ON public.prospect_files (prospect_id);
CREATE UNIQUE INDEX prospect_files_path_key ON public.prospect_files (path);

-- O tenant vem SEMPRE da oportunidade (ADR-0021), e o arquivo tem de estar na pasta dela:
-- uma linha não pode apontar para objeto de outra organização ou de outra oportunidade.
CREATE OR REPLACE FUNCTION public.prospect_files_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT p.tenant_id INTO NEW.tenant_id FROM public.prospects p WHERE p.id = NEW.prospect_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oportunidade não encontrada.' USING ERRCODE = 'PU001';
  END IF;

  IF NEW.path NOT LIKE NEW.tenant_id::text || '/' || NEW.prospect_id::text || '/%' THEN
    RAISE EXCEPTION 'O arquivo não pertence a esta oportunidade.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_files_guard() IS
  'Herda o tenant da oportunidade e confere a pasta do arquivo. ERRCODE PU001.';

CREATE TRIGGER prospect_files_guard
  BEFORE INSERT OR UPDATE ON public.prospect_files
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_files_guard();

ALTER TABLE public.prospect_files ENABLE ROW LEVEL SECURITY;

-- Sem UPDATE: arquivo não se edita, se troca (exclui e anexa de novo).
GRANT SELECT, INSERT, DELETE ON public.prospect_files TO authenticated;

CREATE POLICY "Prospeccao readers can view prospect files" ON public.prospect_files
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert prospect files" ON public.prospect_files
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can delete prospect files" ON public.prospect_files
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));
