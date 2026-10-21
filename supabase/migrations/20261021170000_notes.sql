-- Notas no cabeçalho (21/10/2026). Decisão: ADR-0051.
--
-- Pedido do Italo: "deveríamos ter um header no sistema, que nele teremos as notificações e
-- tal, igual o Projete. Podemos ter a parte de anotações também." Escolhas dele: notas
-- pessoais E compartilháveis — com pessoas escolhidas ou com a empresa inteira — e com anexos.
--
-- Regras que não são detalhe:
--   * só quem escreveu edita, compartilha, anexa e apaga; quem recebe lê;
--   * leitura em forma de CONJUNTO (ADR-0046): a policy compara `id IN (readable_note_ids())`;
--   * anexos em bucket privado, com a MESMA regra de leitura da nota;
--   * compartilhar com uma pessoa avisa no sino; abrir para a empresa inteira não avisa ninguém,
--     para não virar ruído.
--
-- Rollback: supabase/rollback/20261021170000_notes_rollback.sql

-- ── 1. Capacidade ────────────────────────────────────────────────────────────────────────

INSERT INTO public.capabilities (key, domain, label, description, is_sensitive) VALUES
  ('nota:usar', 'pessoal', 'Usar notas',
   'Notas no cabeçalho: escrever as próprias, compartilhar com pessoas ou com a empresa, '
   'anexar arquivos e ler as que foram compartilhadas.',
   false)
ON CONFLICT (key) DO NOTHING;

-- Nasce com todo mundo que aponta as próprias horas (todos os perfis): nota é ferramenta
-- pessoal, como o timesheet. Desligar para um perfil é toggle, não migration.
ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

INSERT INTO public.role_capabilities (role_id, capability, enabled)
SELECT rc.role_id, 'nota:usar', true
FROM public.role_capabilities rc
WHERE rc.capability = 'timesheet-proprio:apontar' AND rc.enabled
ON CONFLICT (role_id, capability) DO NOTHING;

INSERT INTO public.default_role_capabilities (role_name, capability)
SELECT drc.role_name, 'nota:usar'
FROM public.default_role_capabilities drc
WHERE drc.capability = 'timesheet-proprio:apontar'
ON CONFLICT (role_name, capability) DO NOTHING;

INSERT INTO public.user_capability_overrides (user_id, tenant_id, capability, enabled, reason)
SELECT DISTINCT o.user_id, o.tenant_id, 'nota:usar', o.enabled,
       'espelhamento de timesheet-proprio:apontar (notas, 21/10/2026)'
FROM public.user_capability_overrides o
WHERE o.capability = 'timesheet-proprio:apontar'
ON CONFLICT (user_id, tenant_id, capability) DO NOTHING;

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;

-- ── 2. Tabelas ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.notes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_id           uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title               text        NOT NULL DEFAULT '',
  content             text        NOT NULL DEFAULT '',
  -- Aberta para todo mundo da empresa, só leitura.
  shared_with_company boolean     NOT NULL DEFAULT false,
  -- Fixada no topo da lista de quem escreveu.
  is_pinned           boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_title_valid CHECK (char_length(title) <= 200),
  CONSTRAINT notes_content_valid CHECK (char_length(content) <= 50000)
);

CREATE INDEX notes_author_idx ON public.notes (author_id, updated_at DESC);
CREATE INDEX notes_company_idx ON public.notes (tenant_id) WHERE shared_with_company;

COMMENT ON TABLE public.notes IS
  'Notas do cabeçalho (ADR-0051): de uma pessoa, compartilháveis com pessoas (note_shares) ou '
  'com a empresa (shared_with_company). Só quem escreveu edita.';

-- Com quem a nota foi compartilhada, uma linha por pessoa.
CREATE TABLE public.note_shares (
  note_id     uuid        NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  employee_id uuid        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_shares_pkey PRIMARY KEY (note_id, employee_id)
);

CREATE INDEX note_shares_employee_idx ON public.note_shares (employee_id);

-- Anexos: o arquivo mora no bucket note-attachments, em {tenant_id}/{note_id}/{uuid}-{arquivo}.
CREATE TABLE public.note_attachments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id    uuid        NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  path       text        NOT NULL,
  name       text        NOT NULL,
  size       bigint      NOT NULL,
  type       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT note_attachments_path_key UNIQUE (path),
  CONSTRAINT note_attachments_name_valid CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  CONSTRAINT note_attachments_size_valid CHECK (size >= 0 AND size <= 10485760)
);

CREATE INDEX note_attachments_note_idx ON public.note_attachments (note_id);

-- ── 3. Predicados ────────────────────────────────────────────────────────────────────────

-- Notas que quem chama pode LER: as suas, as abertas para a empresa e as compartilhadas com
-- ela. Forma de conjunto, avaliada uma vez por consulta (ADR-0046). Tenant e pessoa vêm de
-- `auth.uid()` (ADR-0021); sem `nota:usar`, nenhuma.
CREATE OR REPLACE FUNCTION public.readable_note_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT e.id, e.tenant_id
    FROM public.employees e
    WHERE e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), e.tenant_id, 'nota:usar')
  )
  SELECT n.id
  FROM me
  JOIN public.notes n ON n.tenant_id = me.tenant_id
  WHERE n.author_id = me.id
     OR n.shared_with_company
     OR EXISTS (
       SELECT 1 FROM public.note_shares s
       WHERE s.note_id = n.id AND s.employee_id = me.id
     );
$$;

-- Quem chama escreveu a nota? É o único que edita, compartilha, anexa e apaga.
CREATE OR REPLACE FUNCTION public.is_note_author(_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes n
    JOIN public.employees e ON e.id = n.author_id
    WHERE n.id = _note_id
      AND e.auth_id = auth.uid()
      AND public.has_capability(auth.uid(), n.tenant_id, 'nota:usar')
  );
$$;

-- As pessoas (employees) que são quem chama — uma por empresa em que ela está.
CREATE OR REPLACE FUNCTION public.my_employee_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.employees e WHERE e.auth_id = auth.uid();
$$;

-- Nota de um caminho do bucket ({tenant_id}/{note_id}/...). Nulo se o caminho não tiver esse
-- formato: o cast direto falharia a consulta inteira em objeto de outro bucket.
CREATE OR REPLACE FUNCTION public.note_id_from_path(_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN split_part(_path, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN split_part(_path, '/', 2)::uuid
  END;
$$;

COMMENT ON FUNCTION public.readable_note_ids() IS
  'Notas que o usuário logado lê: próprias, abertas para a empresa ou compartilhadas com ele. '
  'Exige nota:usar. Forma de conjunto para a RLS (ADR-0046, ADR-0051).';
COMMENT ON FUNCTION public.is_note_author(uuid) IS
  'O usuário logado escreveu a nota (e tem nota:usar)? Único que edita, compartilha, anexa e apaga.';

REVOKE ALL ON FUNCTION public.readable_note_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_note_author(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_employee_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.readable_note_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_note_author(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_employee_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.note_id_from_path(text) TO authenticated;

-- ── 4. Guardas ───────────────────────────────────────────────────────────────────────────

-- Autor e empresa não mudam depois de criada; `updated_at` acompanha a edição.
CREATE OR REPLACE FUNCTION public.notes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'A nota não muda de autor nem de empresa.' USING ERRCODE = 'PU001';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_guard
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notes_guard();

-- Compartilhamento: empresa herdada da nota, e só com gente da mesma empresa, que não o autor.
CREATE OR REPLACE FUNCTION public.note_shares_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author uuid;
BEGIN
  SELECT n.tenant_id, n.author_id INTO NEW.tenant_id, v_author
  FROM public.notes n WHERE n.id = NEW.note_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota não encontrada.' USING ERRCODE = 'PU001';
  END IF;
  IF NEW.employee_id = v_author THEN
    RAISE EXCEPTION 'A nota já é de quem a escreveu.' USING ERRCODE = 'PU001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE e.id = NEW.employee_id AND e.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Só dá para compartilhar com alguém da mesma empresa.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.note_shares_guard() IS
  'Herda a empresa da nota e recusa compartilhar com o próprio autor ou com outra empresa. '
  'SECURITY DEFINER: o autor não lê employees de terceiros por policy (PUL-162).';

CREATE TRIGGER note_shares_guard
  BEFORE INSERT ON public.note_shares
  FOR EACH ROW EXECUTE FUNCTION public.note_shares_guard();

-- Anexo: empresa herdada da nota, e o arquivo tem de estar na pasta dela.
CREATE OR REPLACE FUNCTION public.note_attachments_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT n.tenant_id INTO NEW.tenant_id FROM public.notes n WHERE n.id = NEW.note_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota não encontrada.' USING ERRCODE = 'PU001';
  END IF;
  IF NEW.path NOT LIKE NEW.tenant_id::text || '/' || NEW.note_id::text || '/%' THEN
    RAISE EXCEPTION 'O arquivo não pertence a esta nota.' USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER note_attachments_guard
  BEFORE INSERT ON public.note_attachments
  FOR EACH ROW EXECUTE FUNCTION public.note_attachments_guard();

-- Compartilhar com alguém avisa no sino, com o caminho para abrir a nota.
CREATE OR REPLACE FUNCTION public.notify_note_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title  text;
  v_author text;
BEGIN
  SELECT coalesce(nullif(btrim(n.title), ''), 'Sem título'), a.nome
    INTO v_title, v_author
  FROM public.notes n
  JOIN public.employees a ON a.id = n.author_id
  WHERE n.id = NEW.note_id;

  INSERT INTO public.notifications
    (tenant_id, recipient_id, type, category, priority, title, message, reference_id, action_url)
  VALUES
    (NEW.tenant_id, NEW.employee_id, 'note_shared', 'nota', 'normal',
     'Nota compartilhada com você',
     v_author || ' compartilhou a nota "' || v_title || '".',
     NEW.note_id,
     '/dashboard?nota=' || NEW.note_id::text);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_note_shared() IS
  'Avisa no sino quem recebeu uma nota (ADR-0051). Abrir para a empresa inteira não avisa.';

CREATE TRIGGER notify_note_shared
  AFTER INSERT ON public.note_shares
  FOR EACH ROW EXECUTE FUNCTION public.notify_note_shared();

-- ── 5. RLS ───────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.note_shares TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.note_attachments TO authenticated;

CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.readable_note_ids()));

-- Quem cria assina: autor é a própria pessoa, na empresa dela, com a capacidade.
CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id IN (SELECT public.my_employee_ids())
    AND author_id = public.employee_id_for(auth.uid(), tenant_id)
    AND public.has_capability(auth.uid(), tenant_id, 'nota:usar')
  );

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO authenticated
  USING (public.is_note_author(id))
  WITH CHECK (public.is_note_author(id));

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO authenticated
  USING (public.is_note_author(id));

-- Quem escreveu vê com quem compartilhou; quem recebeu vê só a própria linha.
CREATE POLICY "note_shares_select" ON public.note_shares
  FOR SELECT TO authenticated
  USING (
    employee_id IN (SELECT public.my_employee_ids())
    OR public.is_note_author(note_id)
  );

CREATE POLICY "note_shares_insert" ON public.note_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_note_author(note_id));

CREATE POLICY "note_shares_delete" ON public.note_shares
  FOR DELETE TO authenticated
  USING (public.is_note_author(note_id));

CREATE POLICY "note_attachments_select" ON public.note_attachments
  FOR SELECT TO authenticated
  USING (note_id IN (SELECT public.readable_note_ids()));

CREATE POLICY "note_attachments_insert" ON public.note_attachments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_note_author(note_id));

CREATE POLICY "note_attachments_delete" ON public.note_attachments
  FOR DELETE TO authenticated
  USING (public.is_note_author(note_id));

-- ── 6. Bucket dos anexos ─────────────────────────────────────────────────────────────────

-- Privado, limite também no servidor: a validação da tela é conveniência, não barreira.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments', 'note-attachments', false,
  10485760, -- 10 MB
  ARRAY[
    'application/pdf',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Ler o arquivo = ler a nota. Subir e apagar = ter escrito a nota.
DROP POLICY IF EXISTS "note-attachments: readers can read" ON storage.objects;
CREATE POLICY "note-attachments: readers can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'note-attachments'
    AND public.note_id_from_path(name) IN (SELECT public.readable_note_ids())
  );

DROP POLICY IF EXISTS "note-attachments: author can upload" ON storage.objects;
CREATE POLICY "note-attachments: author can upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'note-attachments'
    AND public.is_note_author(public.note_id_from_path(name))
  );

DROP POLICY IF EXISTS "note-attachments: author can delete" ON storage.objects;
CREATE POLICY "note-attachments: author can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'note-attachments'
    AND public.is_note_author(public.note_id_from_path(name))
  );
