-- GP-J5 (CA-03): anexos em comentários de oportunidades.
-- Bucket privado + RLS por tenant em storage.objects + coluna de metadados em lead_interactions.
-- Convenção de path: {tenant_id}/{lead_id}/{uuid}-{arquivo}
-- O isolamento por tenant é garantido pelo 1º segmento de pasta (= tenant_id).

-- 1) Metadados dos anexos no próprio comentário (lista de { path, name, size, type })
ALTER TABLE lead_interactions
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN lead_interactions.attachments IS
  'Lista de anexos do comentário: [{ path, name, size, type }] — arquivos no bucket lead-attachments';

-- 2) Bucket privado para os anexos — limite e tipos validados também no servidor (defense-in-depth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-attachments', 'lead-attachments', false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3) RLS em storage.objects — acesso restrito ao tenant dono do path.
-- O 1º segmento do path é o tenant_id; valida via helper SECURITY DEFINER do projeto
-- (public.user_belongs_to_tenant compara employees.auth_id = auth.uid()).
DROP POLICY IF EXISTS "lead-attachments: tenant can read" ON storage.objects;
CREATE POLICY "lead-attachments: tenant can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "lead-attachments: tenant can upload" ON storage.objects;
CREATE POLICY "lead-attachments: tenant can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "lead-attachments: tenant can delete" ON storage.objects;
CREATE POLICY "lead-attachments: tenant can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
