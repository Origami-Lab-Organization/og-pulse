CREATE TABLE IF NOT EXISTS public.timesheet_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  employee_reminder_day INTEGER NOT NULL DEFAULT 5,
  employee_reminder_time TIME NOT NULL DEFAULT '08:00:00',
  manager_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  manager_alert_time TIME NOT NULL DEFAULT '15:00:00',
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY['inbox'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.timesheet_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage reminder settings" ON public.timesheet_reminder_settings;
CREATE POLICY "Admin can manage reminder settings"
  ON public.timesheet_reminder_settings FOR ALL
  USING (
    tenant_id IN (
      SELECT e.tenant_id FROM public.employees e
      JOIN public.user_roles ur ON ur.user_id = e.auth_id
      WHERE ur.role = 'admin' AND e.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenant members can read reminder settings" ON public.timesheet_reminder_settings;
CREATE POLICY "Tenant members can read reminder settings"
  ON public.timesheet_reminder_settings FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.employees WHERE auth_id = auth.uid()
    )
  );

INSERT INTO public.timesheet_reminder_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;