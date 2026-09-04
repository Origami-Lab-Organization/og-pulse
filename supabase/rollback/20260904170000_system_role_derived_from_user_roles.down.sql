-- Rollback da PUL-203: `system_role` volta a ser gravável de forma independente, e a
-- divergência entre exibição e RLS volta a ser possível. Não desfaz a reconciliação — os
-- valores corrigidos ficam, porque estavam errados.

DROP TRIGGER IF EXISTS trg_enforce_employee_display_role ON public.employees;
DROP TRIGGER IF EXISTS trg_sync_employee_display_role ON public.user_roles;
DROP FUNCTION IF EXISTS public.enforce_employee_display_role();
DROP FUNCTION IF EXISTS public.sync_employee_display_role();
DROP FUNCTION IF EXISTS public.system_role_for_user(uuid, uuid);
