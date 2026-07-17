-- Bucket privado para selfies de marcação de ponto.
-- Convenção de path: {tenant_id}/{employee_id}/{uuid}.jpg — isolamento por
-- tenant garantido pelo 1º segmento de pasta, igual ao padrão de
-- lead-attachments/time-adjustment-attachments.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-punch-selfies', 'time-punch-selfies', false,
  3145728, -- 3 MB — foto de webcam comprimida, não precisa do limite de 10MB dos anexos
  ARRAY['image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "time-punch-selfies: tenant can read" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'time-punch-selfies'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "time-punch-selfies: tenant can upload" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'time-punch-selfies'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "time-punch-selfies: tenant can delete" ON storage.objects;
CREATE POLICY "time-punch-selfies: tenant can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'time-punch-selfies'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
