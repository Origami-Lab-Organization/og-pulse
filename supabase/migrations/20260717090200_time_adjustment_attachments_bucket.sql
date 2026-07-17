-- Bucket privado para comprovantes de ajuste de ponto/hora extra.
-- Convenção de path: {tenant_id}/{employee_id}/{uuid}-{arquivo} — isolamento
-- por tenant garantido pelo 1º segmento de pasta, igual ao padrão de
-- lead-attachments (supabase/migrations/20260619120000_lead_attachments.sql).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-adjustment-attachments', 'time-adjustment-attachments', false,
  10485760, -- 10 MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can read" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'time-adjustment-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can upload" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'time-adjustment-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "time-adjustment-attachments: tenant can delete" ON storage.objects;
CREATE POLICY "time-adjustment-attachments: tenant can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'time-adjustment-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
