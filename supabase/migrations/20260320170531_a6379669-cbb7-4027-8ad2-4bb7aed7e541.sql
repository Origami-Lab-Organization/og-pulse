
-- 1. Add columns to notifications table
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS action_type text,
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb,
  ADD COLUMN IF NOT EXISTS is_resolved boolean NOT NULL DEFAULT false;

-- 2. Create holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date date NOT NULL,
  name text NOT NULL,
  is_national boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, date)
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can read holidays"
  ON public.holidays FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert holidays"
  ON public.holidays FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins can update holidays"
  ON public.holidays FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "Admins can delete holidays"
  ON public.holidays FOR DELETE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_category
  ON public.notifications (recipient_id, is_read, category);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_type_created
  ON public.notifications (tenant_id, type, created_at);

CREATE INDEX IF NOT EXISTS idx_holidays_tenant_date
  ON public.holidays (tenant_id, date);

-- 4. Backfill existing data
UPDATE public.notifications SET category = 'reimbursement' WHERE type LIKE 'reimbursement%';
UPDATE public.notifications SET category = 'timesheet' WHERE type LIKE 'timesheet%';
