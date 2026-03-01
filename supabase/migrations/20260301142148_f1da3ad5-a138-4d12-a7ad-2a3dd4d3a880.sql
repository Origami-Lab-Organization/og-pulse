
CREATE POLICY "Service role can insert tenants"
ON public.tenants FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Allow insert for registration"
ON public.tenants FOR INSERT
TO anon, authenticated
WITH CHECK (true);
