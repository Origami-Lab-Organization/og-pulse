-- Rollback do grupo 5c (PUL-201): restaura o predicado por papel.
-- Não é aplicado pela CLI; executar manualmente se a virada precisar ser desfeita.

-- time_tracking_period_locks (1)
DROP POLICY IF EXISTS "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks;
CREATE POLICY "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks
  FOR ALL TO authenticated
  USING ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)))
  WITH CHECK ((has_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_role(auth.uid(), tenant_id, 'rh'::app_role)));
