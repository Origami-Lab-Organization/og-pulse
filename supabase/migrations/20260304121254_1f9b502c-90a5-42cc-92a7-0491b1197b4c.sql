
-- Storage policies for termination-documents bucket
CREATE POLICY "Admins can upload termination documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'termination-documents');

CREATE POLICY "Admins can view termination documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'termination-documents');

CREATE POLICY "Admins can delete termination documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'termination-documents');
