import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2 } from 'lucide-react';
import {
  useTimesheetReminderSettings,
  useUpdateTimesheetReminderSettings,
  UpdateTimesheetReminderSettingsInput,
} from '@/hooks/useTimesheetReminderSettings';

const DAYS_OF_WEEK = [
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
];

const schema = z.object({
  employee_reminder_enabled: z.boolean(),
  employee_reminder_day: z.coerce.number().min(1).max(7),
  employee_reminder_time: z.string().min(1),
  manager_alert_enabled: z.boolean(),
  manager_alert_time: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function TimesheetReminderSettings() {
  const { data: settings, isLoading } = useTimesheetReminderSettings();
  const updateMutation = useUpdateTimesheetReminderSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_reminder_enabled: true,
      employee_reminder_day: 5,
      employee_reminder_time: '08:00',
      manager_alert_enabled: true,
      manager_alert_time: '15:00',
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        employee_reminder_enabled: settings.employee_reminder_enabled,
        employee_reminder_day: settings.employee_reminder_day,
        employee_reminder_time: settings.employee_reminder_time.slice(0, 5),
        manager_alert_enabled: settings.manager_alert_enabled,
        manager_alert_time: settings.manager_alert_time.slice(0, 5),
      });
    }
  }, [settings, form]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values as UpdateTimesheetReminderSettingsInput);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lembretes de Timesheet</CardTitle>
        <CardDescription>
          Configure os lembretes automáticos enviados aos funcionários e gerentes sobre horas pendentes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Funcionários */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Lembrete para Funcionários</h3>

              <FormField
                control={form.control}
                name="employee_reminder_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-sm font-medium">Ativar lembrete</FormLabel>
                      <FormDescription className="text-xs">
                        Notifica funcionários com horas não enviadas no dia configurado.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employee_reminder_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do lembrete</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                        disabled={!form.watch('employee_reminder_enabled')}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o dia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="employee_reminder_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário do lembrete (UTC)</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          disabled={!form.watch('employee_reminder_enabled')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Gerentes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Alerta para Gerentes</h3>

              <FormField
                control={form.control}
                name="manager_alert_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-sm font-medium">Ativar alerta</FormLabel>
                      <FormDescription className="text-xs">
                        Notifica gerentes de projetos com membros que ainda não enviaram horas.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manager_alert_time"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Horário do alerta (UTC)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={!form.watch('manager_alert_enabled')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Canais */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Canais de Notificação</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked disabled />
                  <span className="text-sm">Caixa de entrada</span>
                </div>
                <TooltipProvider>
                  {['E-mail', 'WhatsApp', 'SMS'].map((channel) => (
                    <Tooltip key={channel}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-not-allowed w-fit">
                          <Checkbox disabled />
                          <span className="text-sm text-muted-foreground">{channel}</span>
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Em breve</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Este canal estará disponível em breve.</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configurações
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
