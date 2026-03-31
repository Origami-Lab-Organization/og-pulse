
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Admins can upload termination documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view termination documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete termination documents" ON storage.objects;

-- SELECT: tenant-scoped via employee_terminations join
CREATE POLICY "Tenant users can view termination documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'termination-documents'
  AND EXISTS (
    SELECT 1
    FROM public.employee_terminations et
    JOIN public.employees e ON et.employee_id = e.id
    WHERE et.id = (SPLIT_PART(name, '/', 1))::uuid
    AND e.tenant_id = (SELECT tenant_id FROM public.employees WHERE auth_id = auth.uid() LIMIT 1)
  )
);

-- INSERT: tenant-scoped
CREATE POLICY "Tenant users can upload termination documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'termination-documents'
  AND EXISTS (
    SELECT 1
    FROM public.employee_terminations et
    JOIN public.employees e ON et.employee_id = e.id
    WHERE et.id = (SPLIT_PART(name, '/', 1))::uuid
    AND e.tenant_id = (SELECT tenant_id FROM public.employees WHERE auth_id = auth.uid() LIMIT 1)
  )
);

-- DELETE: tenant-scoped
CREATE POLICY "Tenant users can delete termination documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'termination-documents'
  AND EXISTS (
    SELECT 1
    FROM public.employee_terminations et
    JOIN public.employees e ON et.employee_id = e.id
    WHERE et.id = (SPLIT_PART(name, '/', 1))::uuid
    AND e.tenant_id = (SELECT tenant_id FROM public.employees WHERE auth_id = auth.uid() LIMIT 1)
  )
);
