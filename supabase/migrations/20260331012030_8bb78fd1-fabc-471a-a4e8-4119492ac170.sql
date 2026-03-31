
-- Drop the vulnerable policy that allows cross-tenant access
DROP POLICY IF EXISTS "Users can view contracts in their tenant" ON storage.objects;

-- Create corrected policy with proper tenant isolation
CREATE POLICY "Users can view contracts in their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contracts' AND
  EXISTS (
    SELECT 1 FROM public.employees e
    JOIN public.projects p ON p.tenant_id = e.tenant_id
    WHERE e.auth_id = auth.uid()
    AND (storage.foldername(name))[1] = p.id::text
  )
);
