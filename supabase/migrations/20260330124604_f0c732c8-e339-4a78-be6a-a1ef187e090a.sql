-- Grant table-level permissions for job_applications
GRANT SELECT, INSERT, UPDATE ON public.job_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;