
-- Timesheet correction audit enhancements:
-- 1) reason_code for project edit logs
-- 2) dedicated audit logs for internal activity edits
-- 3) stricter activity_timesheets RLS

ALTER TABLE public.activity_timesheets
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.timesheet_edit_logs
  ADD COLUMN IF NOT EXISTS reason_code TEXT;

UPDATE public.timesheet_edit_logs
SET reason_code = 'other'
WHERE reason_code IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'timesheet_edit_logs_reason_code_check'
  ) THEN
    ALTER TABLE public.timesheet_edit_logs
      ADD CONSTRAINT timesheet_edit_logs_reason_code_check
      CHECK (
        reason_code IN (
          'wrong_item',
          'wrong_hours',
          'post_approval_fix',
          'employee_request',
          'other'
        )
      );
  END IF;
END $$;

ALTER TABLE public.timesheet_edit_logs
  ALTER COLUMN reason_code SET DEFAULT 'other',
  ALTER COLUMN reason_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.activity_timesheet_edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_timesheet_id UUID NOT NULL REFERENCES public.activity_timesheets(id) ON DELETE CASCADE,
  previous_hours NUMERIC NOT NULL,
  new_hours NUMERIC NOT NULL,
  reason_code TEXT NOT NULL CHECK (
    reason_code IN (
      'wrong_item',
      'wrong_hours',
      'post_approval_fix',
      'employee_request',
      'other'
    )
  ),
  justification TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_timesheet_edit_logs_timesheet
  ON public.activity_timesheet_edit_logs(activity_timesheet_id);

CREATE INDEX IF NOT EXISTS idx_activity_timesheet_edit_logs_edited_at
  ON public.activity_timesheet_edit_logs(edited_at);

ALTER TABLE public.activity_timesheet_edit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity timesheet edit logs in tenant" ON public.activity_timesheet_edit_logs;
DROP POLICY IF EXISTS "Admins and managers can insert activity timesheet edit logs" ON public.activity_timesheet_edit_logs;

CREATE POLICY "Users can view activity timesheet edit logs in tenant"
ON public.activity_timesheet_edit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.activity_timesheets at
    WHERE at.id = activity_timesheet_edit_logs.activity_timesheet_id
      AND public.user_belongs_to_tenant(auth.uid(), at.tenant_id)
  )
);

CREATE POLICY "Admins and managers can insert activity timesheet edit logs"
ON public.activity_timesheet_edit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.activity_timesheets at
    WHERE at.id = activity_timesheet_edit_logs.activity_timesheet_id
      AND public.is_admin_or_manager(auth.uid(), at.tenant_id)
  )
);

DROP POLICY IF EXISTS "activity_timesheets_select" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_insert" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_update" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_delete" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_insert_own" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_insert_manager_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_update_own_unlocked" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_update_manager_admin" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_delete_own_unlocked" ON public.activity_timesheets;
DROP POLICY IF EXISTS "activity_timesheets_delete_manager_admin" ON public.activity_timesheets;

CREATE POLICY "activity_timesheets_select"
ON public.activity_timesheets
FOR SELECT
USING (public.user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_insert_own"
ON public.activity_timesheets
FOR INSERT
WITH CHECK (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = activity_timesheets.employee_id
      AND e.auth_id = auth.uid()
  )
);

CREATE POLICY "activity_timesheets_insert_manager_admin"
ON public.activity_timesheets
FOR INSERT
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_update_own_unlocked"
ON public.activity_timesheets
FOR UPDATE
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = activity_timesheets.employee_id
      AND e.auth_id = auth.uid()
  )
)
WITH CHECK (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = activity_timesheets.employee_id
      AND e.auth_id = auth.uid()
  )
);

CREATE POLICY "activity_timesheets_update_manager_admin"
ON public.activity_timesheets
FOR UPDATE
USING (public.is_admin_or_manager(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_or_manager(auth.uid(), tenant_id));

CREATE POLICY "activity_timesheets_delete_own_unlocked"
ON public.activity_timesheets
FOR DELETE
USING (
  public.user_belongs_to_tenant(auth.uid(), tenant_id)
  AND is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.id = activity_timesheets.employee_id
      AND e.auth_id = auth.uid()
  )
);

CREATE POLICY "activity_timesheets_delete_manager_admin"
ON public.activity_timesheets
FOR DELETE
USING (public.is_admin_or_manager(auth.uid(), tenant_id));
