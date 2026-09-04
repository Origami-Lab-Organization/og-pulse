-- Rollback do PUL-211: restaura as policies SEM filtro de tenant.
-- Reintroduz a escrita cross-tenant. Não é aplicado pela CLI; existe para o caso de a
-- correção quebrar um fluxo não previsto, e nesse caso a janela deve ser curta.

DROP POLICY IF EXISTS "Admins can upload employee photos in their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update employee photos in their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete employee photos in their tenant" ON storage.objects;

CREATE POLICY "Admins can upload employee photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update employee photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete employee photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )
);
