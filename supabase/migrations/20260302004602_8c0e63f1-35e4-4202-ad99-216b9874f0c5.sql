
CREATE TABLE public.market_analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  module VARCHAR(20) NOT NULL,
  module_label VARCHAR(255) NOT NULL,
  form_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  result_markdown TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_market_analysis_jobs_status ON public.market_analysis_jobs(id, status);

ALTER TABLE public.market_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs" ON public.market_analysis_jobs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own jobs" ON public.market_analysis_jobs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Service role can update jobs" ON public.market_analysis_jobs
  FOR UPDATE USING (true);
