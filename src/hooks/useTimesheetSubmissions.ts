import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
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

  return useMutation({
    mutationFn: async ({ 
      projects, 
      weekStart,
      weekDays,
    }: { 
      projects: { projectId: string; totalHours: number; memberIds?: string[] }[]; 
      weekStart: string;
      weekDays?: string[];
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
              const inserts = missingDays.map(day => ({
                project_id: project.projectId,
                project_member_id: memberId,
                work_date: day,
                hours: 0,
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
          for (const [managerId, projectNames] of managerProjects) {
            if (managerId === submitterEmployee.id) continue;
            await supabase.from('notifications').insert({
              tenant_id: submitterEmployee.tenant_id,
              recipient_id: managerId,
              type: 'timesheet_submitted',
              title: `${submitterEmployee.nome} enviou timesheet`,
              message: projectNames.length === 1
                ? `Horas enviadas no projeto ${projectNames[0]}.`
                : `Horas enviadas em ${projectNames.length} projetos: ${projectNames.join(', ')}.`,
            });
          }
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificações de timesheet:', notifError);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
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

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets-by-date-range'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['project-timesheet-submissions'] });
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
