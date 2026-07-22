import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import {
  TimesheetSubmission,
  ProjectTimesheetSubmission,
  SubmitWeekInput,
  SubmitProjectWeekInput,
  AdminEditInput,
  AdminBatchEditInput
} from '@/types/timesheetSubmission';

// ============= Legacy Global Submission Hooks =============

export const useWeekSubmission = (weekStart: string, tenantId: string | undefined) => {
  return useQuery({
    queryKey: ['timesheet-submission', weekStart, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('timesheet_submissions')
        .select('*')
        .eq('week_start', weekStart)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.submitted_by) {
        const { data: employee } = await supabase
          .from('employees')
          .select('nome')
          .eq('auth_id', data.submitted_by)
          .maybeSingle();
        
        return {
          ...data,
          submitted_by_employee: employee,
        } as TimesheetSubmission;
      }
      
      return data as TimesheetSubmission | null;
    },
    enabled: !!tenantId,
  });
};

export const useSubmitWeek = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ weekStart, totalHours, tenantId }: SubmitWeekInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 4);
      const weekEndStr = weekEndDate.toISOString().split('T')[0];

      const { data: submission, error: submissionError } = await supabase
        .from('timesheet_submissions')
        .upsert({
          tenant_id: tenantId,
          week_start: weekStart,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
          total_hours: totalHours,
        }, {
          onConflict: 'tenant_id,week_start',
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      const { error: lockError } = await supabase
        .from('project_timesheets')
        .update({ is_locked: true, updated_by: user.id })
        .gte('work_date', weekStart)
        .lte('work_date', weekEndStr);

      if (lockError) throw lockError;

      return submission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timesheet-submission', variables.weekStart] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      toast({
        title: 'Semana enviada',
        description: 'Os timesheets foram enviados e travados com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar semana',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============= Per-Project Submission Hooks =============

export const useProjectWeekSubmissions = (weekStart: string, projectIds: string[]) => {
  return useQuery({
    queryKey: ['project-timesheet-submissions', weekStart, projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return new Map<string, ProjectTimesheetSubmission>();
      
      const { data, error } = await supabase
        .from('project_timesheet_submissions')
        .select('*')
        .eq('week_start', weekStart)
        .in('project_id', projectIds);

      if (error) throw error;
      
      const submissionsMap = new Map<string, ProjectTimesheetSubmission>();
      
      for (const submission of data || []) {
        let submittedByEmployee = null;
        
        if (submission.submitted_by) {
          const { data: employee } = await supabase
            .from('employees')
            .select('nome')
            .eq('auth_id', submission.submitted_by)
            .maybeSingle();
          submittedByEmployee = employee;
        }
        
        submissionsMap.set(submission.project_id, {
          ...submission,
          status: submission.status as 'draft' | 'submitted',
          submitted_by_employee: submittedByEmployee,
        });
      }
      
      return submissionsMap;
    },
    enabled: projectIds.length > 0,
  });
};

export const useSubmitProjectWeek = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, weekStart, totalHours, memberIds }: SubmitProjectWeekInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 4);
      const weekEndStr = weekEndDate.toISOString().split('T')[0];

      // Calculate total locked hours for all members in this project for this week
      const { data: allLockedEntries } = await supabase
        .from('project_timesheets')
        .select('hours')
        .eq('project_id', projectId)
        .eq('is_locked', true)
        .gte('work_date', weekStart)
        .lte('work_date', weekEndStr);

      const existingLockedHours = (allLockedEntries || []).reduce((sum, e) => sum + e.hours, 0);
      const newTotalHours = existingLockedHours + totalHours;

      // Upsert project submission
      const { data: submission, error: submissionError } = await supabase
        .from('project_timesheet_submissions')
        .upsert({
          project_id: projectId,
          week_start: weekStart,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id,
          total_hours: newTotalHours,
        }, {
          onConflict: 'project_id,week_start',
        })
        .select()
        .single();

      if (submissionError) throw submissionError;

      // Lock timesheets - scoped to specific members if provided
      let lockQuery = supabase
        .from('project_timesheets')
        .update({ is_locked: true, updated_by: user.id })
        .eq('project_id', projectId)
        .gte('work_date', weekStart)
        .lte('work_date', weekEndStr);

      if (memberIds && memberIds.length > 0) {
        lockQuery = lockQuery.in('project_member_id', memberIds);
      }

      const { error: lockError } = await lockQuery;

      if (lockError) throw lockError;

      return submission;
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });

      // Best-effort: auto-resolve timesheet_pending notifications for this employee
      try {
        if (employee?.id) {
          await supabase
            .from('notifications' as any)
            .update({ is_resolved: true } as any)
            .eq('type', 'timesheet_pending')
            .eq('recipient_id', employee.id)
            .eq('is_resolved', false);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      } catch (e) {
        console.error('Error auto-resolving timesheet_pending notifications:', e);
      }

      // Best-effort: notify project manager about this submission
      try {
        if (employee?.id && employee?.tenant_id && variables.projectId) {
          const { data: project } = await supabase
            .from('projects' as any)
            .select('name, manager_id')
            .eq('id', variables.projectId)
            .maybeSingle();
          if (project && (project as any).manager_id && (project as any).manager_id !== employee.id) {
            const weekStartDate = new Date(variables.weekStart);
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekEndDate.getDate() + 4);
            const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const projectName = (project as any).name || '';
            const weekEnd = weekEndDate.toISOString().split('T')[0];
            await supabase.from('notifications' as any).insert({
              tenant_id: employee.tenant_id,
              recipient_id: (project as any).manager_id,
              type: 'timesheet_submitted',
              category: 'timesheet',
              priority: 'normal',
              action_type: 'info',
              title: `${employee.nome} enviou timesheet — ${projectName}`,
              message: `${employee.nome} enviou as horas da semana ${fmt(weekStartDate)} a ${fmt(weekEndDate)} no projeto "${projectName}". Total: ${variables.totalHours}h.`,
              metadata: {
                employee_name: employee.nome,
                project_name: projectName,
                week_start: variables.weekStart,
                week_end: weekEnd,
                total_hours: variables.totalHours,
              },
              is_read: false,
              is_resolved: false,
            } as any);
            queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
            queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
          }
        }
      } catch (e) {
        console.error('Error creating timesheet_submitted notification:', e);
      }

      toast({
        title: 'Projeto enviado',
        description: 'Os timesheets do projeto foram enviados e travados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar projeto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitAllProjects = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      projects,
      weekStart,
      weekDays,
      suggestions,
    }: {
      projects: { projectId: string; totalHours: number; memberIds?: string[] }[];
      weekStart: string;
      weekDays?: string[];
      /** Pré-preenchimento sugerido por projeto/data — lançado nos dias vazios. */
      suggestions?: Record<string, Record<string, number>>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 4);
      const weekEndStr = weekEndDate.toISOString().split('T')[0];

      const results = [];

      for (const project of projects) {
        // Ensure entries exist for all days for all members (create 0-hour entries if missing)
        if (weekDays && project.memberIds && project.memberIds.length > 0) {
          for (const memberId of project.memberIds) {
            const { data: existingEntries } = await supabase
              .from('project_timesheets')
              .select('work_date')
              .eq('project_id', project.projectId)
              .eq('project_member_id', memberId)
              .gte('work_date', weekStart)
              .lte('work_date', weekEndStr);

            const existingDates = new Set((existingEntries || []).map(e => e.work_date));
            const missingDays = weekDays.filter(d => !existingDates.has(d));

            if (missingDays.length > 0) {
              const projectSuggestions = suggestions?.[project.projectId];
              const inserts = missingDays.map(day => ({
                project_id: project.projectId,
                project_member_id: memberId,
                work_date: day,
                // Dias vazios recebem a sugestão (0 quando não houver).
                hours: projectSuggestions?.[day] ?? 0,
                is_locked: true,
              }));

              const { error: insertError } = await supabase
                .from('project_timesheets')
                .insert(inserts);

              if (insertError) throw insertError;
            }
          }
        }

        // Calculate total hours including existing locked
        const { data: allLockedEntries } = await supabase
          .from('project_timesheets')
          .select('hours')
          .eq('project_id', project.projectId)
          .eq('is_locked', true)
          .gte('work_date', weekStart)
          .lte('work_date', weekEndStr);

        const existingLockedHours = (allLockedEntries || []).reduce((sum, e) => sum + e.hours, 0);
        const newTotalHours = existingLockedHours + project.totalHours;

        const { data: submission, error: submissionError } = await supabase
          .from('project_timesheet_submissions')
          .upsert({
            project_id: project.projectId,
            week_start: weekStart,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            submitted_by: user.id,
            total_hours: newTotalHours,
          }, {
            onConflict: 'project_id,week_start',
          })
          .select()
          .single();

        if (submissionError) throw submissionError;

        // Lock all timesheets for this project/week
        let lockQuery = supabase
          .from('project_timesheets')
          .update({ is_locked: true, updated_by: user.id })
          .eq('project_id', project.projectId)
          .gte('work_date', weekStart)
          .lte('work_date', weekEndStr);

        if (project.memberIds && project.memberIds.length > 0) {
          lockQuery = lockQuery.in('project_member_id', project.memberIds);
        }

        const { error: lockError } = await lockQuery;

        if (lockError) throw lockError;

        results.push(submission);
      }

      // Travar também as atividades internas do funcionário na semana (decisão de
      // produto: "semana enviada = travada" cobre projetos E atividades).
      if (employee?.id) {
        const { error: activityLockError } = await supabase
          .from('activity_timesheets')
          .update({ is_locked: true })
          .eq('employee_id', employee.id)
          .gte('work_date', weekStart)
          .lte('work_date', weekEndStr);

        if (activityLockError) throw activityLockError;
      }

      // Notify managers — wrapped in try/catch so failures don't block the submit
      try {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, name, manager_id')
          .in('id', projects.map(p => p.projectId));

        const managerProjects = new Map<string, string[]>();
        (projectData || []).forEach((p: any) => {
          if (!p.manager_id) return;
          const existing = managerProjects.get(p.manager_id) || [];
          existing.push(p.name);
          managerProjects.set(p.manager_id, existing);
        });

        const { data: submitterEmployee } = await supabase
          .from('employees')
          .select('id, nome, tenant_id')
          .eq('auth_id', user.id)
          .single();

        if (submitterEmployee) {
          const weekStartDate = new Date(weekStart);
          const weekEndDate = new Date(weekStartDate);
          weekEndDate.setDate(weekEndDate.getDate() + 4);
          const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

          for (const [managerId, projectNames] of managerProjects) {
            if (managerId === submitterEmployee.id) continue;
            const totalHoursForManager = projects
              .filter(p => {
                const proj = (projectData || []).find((pd: any) => pd.id === p.projectId);
                return (proj as any)?.manager_id === managerId;
              })
              .reduce((sum, p) => sum + p.totalHours, 0);

            const firstProject = projectNames[0] || '';
            const title = projectNames.length === 1
              ? `${submitterEmployee.nome} enviou timesheet — ${firstProject}`
              : `${submitterEmployee.nome} enviou timesheet — ${projectNames.length} projetos`;
            const message = projectNames.length === 1
              ? `${submitterEmployee.nome} enviou as horas da semana ${fmt(weekStartDate)} a ${fmt(weekEndDate)} no projeto "${firstProject}". Total: ${totalHoursForManager}h.`
              : `${submitterEmployee.nome} enviou as horas da semana ${fmt(weekStartDate)} a ${fmt(weekEndDate)} em ${projectNames.length} projetos: ${projectNames.join(', ')}. Total: ${totalHoursForManager}h.`;

            await supabase.from('notifications' as any).insert({
              tenant_id: submitterEmployee.tenant_id,
              recipient_id: managerId,
              type: 'timesheet_submitted',
              category: 'timesheet',
              priority: 'normal',
              action_type: 'info',
              title,
              message,
              metadata: {
                employee_name: submitterEmployee.nome,
                project_names: projectNames,
                week_start: weekStart,
                week_end: weekEndDate.toISOString().split('T')[0],
                total_hours: totalHoursForManager,
              },
              is_read: false,
              is_resolved: false,
            } as any);
          }
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificações de timesheet:', notifError);
      }

      return results;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['activity-timesheets'] });

      // Best-effort: auto-resolve timesheet_pending notifications for this employee
      try {
        if (employee?.id) {
          await supabase
            .from('notifications' as any)
            .update({ is_resolved: true } as any)
            .eq('type', 'timesheet_pending')
            .eq('recipient_id', employee.id)
            .eq('is_resolved', false);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
        }
      } catch (e) {
        console.error('Error auto-resolving timesheet_pending notifications:', e);
      }

      toast({
        title: 'Todos os projetos enviados',
        description: 'Os timesheets de todos os projetos foram enviados e travados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar projetos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// ============= Admin Edit Hooks =============

export const useAdminEditTimesheet = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      timesheetId, 
      projectId,
      projectMemberId,
      workDate,
      previousHours, 
      newHours, 
      justification 
    }: AdminEditInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (timesheetId) {
        const { error: logError } = await supabase
          .from('timesheet_edit_logs')
          .insert({
            timesheet_id: timesheetId,
            previous_hours: previousHours,
            new_hours: newHours,
            justification,
            edited_by: user.id,
          });

        if (logError) throw logError;

        const { data, error } = await supabase
          .from('project_timesheets')
          .update({ 
            hours: newHours, 
            updated_by: user.id 
          })
          .eq('id', timesheetId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('project_timesheets')
          .insert({
            project_id: projectId,
            project_member_id: projectMemberId,
            work_date: workDate,
            hours: newHours,
            is_locked: true,
            updated_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        const { error: logError } = await supabase
          .from('timesheet_edit_logs')
          .insert({
            timesheet_id: data.id,
            previous_hours: 0,
            new_hours: newHours,
            justification,
            edited_by: user.id,
          });

        if (logError) throw logError;

        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      toast({
        title: 'Timesheet atualizado',
        description: 'A alteração foi registrada com justificativa.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar timesheet',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useAdminBatchEditTimesheets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({ changes, justification }: AdminBatchEditInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const results = [];

      for (const change of changes) {
        let timesheetId = change.timesheetId;

        if (!timesheetId) {
          const { data: newTimesheet, error: createError } = await supabase
            .from('project_timesheets')
            .insert({
              project_id: change.projectId,
              project_member_id: change.projectMemberId,
              work_date: change.workDate,
              hours: change.newHours,
              is_locked: true,
              updated_by: user.id,
            })
            .select()
            .single();

          if (createError) throw createError;
          timesheetId = newTimesheet.id;
        } else {
          const { error: updateError } = await supabase
            .from('project_timesheets')
            .update({
              hours: change.newHours,
              updated_by: user.id
            })
            .eq('id', timesheetId);

          if (updateError) throw updateError;
        }

        const { error: logError } = await supabase
          .from('timesheet_edit_logs')
          .insert({
            timesheet_id: timesheetId,
            previous_hours: change.previousHours,
            new_hours: change.newHours,
            justification,
            edited_by: user.id,
          });

        if (logError) throw logError;

        results.push({ timesheetId, success: true });
      }

      // Best-effort: notify the timesheet owner about the edit
      try {
        if (employee?.tenant_id && changes.length > 0) {
          const uniqueProjectIds = [...new Set(changes.map(c => c.projectId))];
          const uniqueMemberIds = [...new Set(changes.map(c => c.projectMemberId))];

          const [{ data: projectsData }, { data: membersData }] = await Promise.all([
            supabase.from('projects').select('id, name').in('id', uniqueProjectIds),
            supabase.from('project_members').select('id, employee_id').in('id', uniqueMemberIds),
          ]);

          const projectMap = new Map((projectsData || []).map((p: any) => [p.id, p.name]));
          const memberMap = new Map((membersData || []).map((m: any) => [m.id, m.employee_id]));

          const notifications = changes
            .map(change => {
              const recipientId = memberMap.get(change.projectMemberId);
              // Skip if recipient couldn't be resolved or editor is editing their own timesheet
              if (!recipientId || recipientId === employee.id) return null;

              const projectName = projectMap.get(change.projectId) || '';
              const workDate = new Date(change.workDate + 'T12:00:00');

              // Calculate the Monday of the edited week for the action URL
              const dow = workDate.getDay();
              const daysToMonday = dow === 0 ? -6 : 1 - dow;
              const monday = new Date(workDate);
              monday.setDate(monday.getDate() + daysToMonday);
              const mondayStr = format(monday, 'yyyy-MM-dd');

              return {
                type: 'timesheet_modified',
                category: 'timesheet',
                priority: 'normal',
                action_type: 'navigate',
                action_url: `/my-timesheet?week=${mondayStr}`,
                recipient_id: recipientId,
                tenant_id: employee.tenant_id,
                title: `Timesheet alterada por ${employee.nome} — ${format(workDate, 'dd/MM')}`,
                message: `Suas horas no projeto "${projectName}" foram ajustadas de ${change.previousHours}h para ${change.newHours}h.`,
                metadata: {
                  editor_name: employee.nome,
                  project_name: projectName,
                  date: change.workDate,
                  old_hours: change.previousHours,
                  new_hours: change.newHours,
                },
                is_read: false,
                is_resolved: false,
              };
            })
            .filter(Boolean);

          if (notifications.length > 0) {
            await supabase.from('notifications' as any).insert(notifications as any);
          }
        }
      } catch (notifError) {
        console.error('Failed to create timesheet_modified notifications:', notifError);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast({
        title: 'Timesheets atualizados',
        description: `${variables.changes.length} alteração(ões) registrada(s) com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar timesheets',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
