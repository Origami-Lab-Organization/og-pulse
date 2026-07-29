-- Bug: o botão "Limpar" da timesheet semanal (WeeklyTimesheetGrid) deleta as
-- horas de projeto E de atividades internas, mas só a de atividades surtia
-- efeito. Causa: project_timesheets nunca teve policy de DELETE para o
-- próprio funcionário — só "project_timesheets_delete_admin_or_pm"
-- (can_manage_project). O DELETE do funcionário era filtrado silenciosamente
-- pela RLS (0 linhas afetadas, sem erro). Mesmo sintoma já documentado em
-- 20260615120000_fix_feriado_20_abril_origami.sql, contornado ali com
-- row_security=OFF rodando como service role.
--
-- activity_timesheets já tem a policy equivalente
-- (activity_timesheets_delete_own_unlocked, ver 20260330212021). Esta policy
-- espelha a mesma checagem de posse/tenant de "Employees can update own
-- timesheets" e mantém a mesma restrição de negócio: nunca é possível apagar
-- lançamento já travado (is_locked = false).

CREATE POLICY "Employees can delete own timesheets"
ON public.project_timesheets FOR DELETE TO authenticated
USING (
  is_locked = false
  AND EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.employees e ON e.id = pm.employee_id
    JOIN public.projects p ON p.id = pm.project_id
    WHERE pm.id = project_timesheets.project_member_id
      AND pm.project_id = project_timesheets.project_id
      AND e.auth_id = auth.uid()
      AND public.user_belongs_to_tenant(auth.uid(), p.tenant_id)
  )
);
