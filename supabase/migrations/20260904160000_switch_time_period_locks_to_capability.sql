-- PUL-201 grupo 5c — fechar competência de ponto decide por capacidade.
-- Uma policy: time_tracking_period_locks (ALL). O predicado era a forma plana
-- `has_role(admin) OR has_role(rh)`, e as duas pontas viram UMA capacidade — a atribuição
-- (Admin + RH) fica no seed, derivada de quem tem `ponto:auditar`. Paridade exata.

-- time_tracking_period_locks (1)
DROP POLICY IF EXISTS "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks;
CREATE POLICY "time_tracking_period_locks_write_admin_rh" ON public.time_tracking_period_locks
  FOR ALL TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'ponto:travar-periodo'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'ponto:travar-periodo'));
