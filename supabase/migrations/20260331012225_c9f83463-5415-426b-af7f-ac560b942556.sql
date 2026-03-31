
-- =============================================
-- FIX 1: job_applications INSERT — restrict to valid tenant+vaga reference
-- The public form is legitimate, but we add a basic validation check
-- =============================================
DROP POLICY IF EXISTS "Anyone can submit a job application" ON public.job_applications;

CREATE POLICY "Anyone can submit a job application"
ON public.job_applications FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.job_openings jo
    WHERE jo.id = vaga_id
    AND jo.tenant_id = tenant_id
    AND jo.status = 'aberta'
  )
);

-- =============================================
-- FIX 2: market_analysis_jobs UPDATE — restrict to service_role only
-- Edge functions already use service_role key for updates
-- =============================================
DROP POLICY IF EXISTS "Service role can update jobs" ON public.market_analysis_jobs;

CREATE POLICY "Service role can update jobs"
ON public.market_analysis_jobs FOR UPDATE
TO service_role
USING (true);

-- =============================================
-- FIX 3: tenants INSERT — remove overly permissive anon/authenticated policy
-- Registration uses service_role via edge function, so this is not needed
-- =============================================
DROP POLICY IF EXISTS "Allow insert for registration" ON public.tenants;
