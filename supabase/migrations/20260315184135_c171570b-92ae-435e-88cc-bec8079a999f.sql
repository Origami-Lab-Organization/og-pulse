
-- Add missing indexes on lead_activity_log
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_created_at ON public.lead_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_type ON public.lead_activity_log(activity_type);

-- Add change_reason column to budget_versions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_versions' AND column_name = 'change_reason'
  ) THEN
    ALTER TABLE public.budget_versions ADD COLUMN change_reason TEXT;
  END IF;
END $$;
