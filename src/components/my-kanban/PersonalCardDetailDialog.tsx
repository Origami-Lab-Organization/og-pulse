import { useEffect, useState } from 'react';
import { useForm, Controller, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { BellRing, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PersonalKanbanCardWithTags, PersonalKanbanColumnDB, PersonalKanbanSettingsDB } from '@/types/personalKanban';
import { COLUMN_LABELS } from '@/types/projectActivity';
import {
  useUpdatePersonalCard,
  useDeletePersonalCard,
  useLinkableProjects,
  useLinkCardToProject,
  useRenameLinkedActivity,
  useUnlinkCard,
} from '@/hooks/usePersonalKanban';
import { computeRemindAt, fitReminderToDue, normalizeTime, reminderOptions } from '@/lib/personalKanban';
import { PersonalTagInput } from './PersonalTagInput';

const NO_REMINDER = 'none';
const NO_PROJECT = 'none';

const schema = z.object({
  title: z.string().trim().min(1, 'Dê um título ao card').max(500),
  description: z.string().optional(),
  column_id: z.string(),
  due_date: z.date().optional().nullable(),
  due_time: z.string(),
  reminder: z.string(),
  project_id: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface PersonalCardDetailDialogProps {
  card: PersonalKanbanCardWithTags | null;
  columns: PersonalKanbanColumnDB[];
  settings: PersonalKanbanSettingsDB | undefined;
  getNextPosition: (columnId: string) => number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toFormValues(card: PersonalKanbanCardWithTags): FormValues {
  return {
    title: card.title,
    description: card.description ?? '',
    column_id: card.column_id,
    due_date: card.due_date ? parseISO(card.due_date) : null,
    due_time: normalizeTime(card.due_time) ?? '',
    reminder: card.reminder_minutes === null ? NO_REMINDER : String(card.reminder_minutes),
    project_id: NO_PROJECT,
  };
}

function reminderMinutes(value: string): number | null {
  return value === NO_REMINDER ? null : Number(value);
}

function toReminderValue(minutes: number | null): string {
  return minutes === null ? NO_REMINDER : String(minutes);
}

function buildUpdates(values: FormValues, card: PersonalKanbanCardWithTags, getNextPosition: (columnId: string) => number) {
  const dueDate = values.due_date ? format(values.due_date, 'yyyy-MM-dd') : null;
  const dueTime = dueDate && values.due_time ? values.due_time : null;
  const minutes = dueDate ? reminderMinutes(values.reminder) : null;
  const moved = values.column_id !== card.column_id;
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    due_date: dueDate,
    due_time: dueTime,
    reminder_minutes: minutes,
    remind_at: computeRemindAt(dueDate, dueTime, minutes),
    ...(moved ? { column_id: values.column_id, position: getNextPosition(values.column_id) } : {}),
  };
}

// Dar prazo sugere o lembrete padrão; tirar o prazo leva hora e lembrete junto.
function useDueSuggestions(form: UseFormReturn<FormValues>, settings: PersonalKanbanSettingsDB | undefined) {
  const defaultMinutes = settings?.default_reminder_minutes ?? null;

  const onDateChange = (date: Date | undefined) => {
    const hadDate = !!form.getValues('due_date');
    form.setValue('due_date', date ?? null, { shouldDirty: true });
    if (!date) {
      form.setValue('due_time', '', { shouldDirty: true });
      form.setValue('reminder', NO_REMINDER, { shouldDirty: true });
      return;
    }
    if (!hadDate && form.getValues('reminder') === NO_REMINDER) {
      form.setValue('reminder', toReminderValue(fitReminderToDue(defaultMinutes, !!form.getValues('due_time'))), { shouldDirty: true });
    }
  };

  const onTimeChange = (time: string) => {
    const hadTime = !!form.getValues('due_time');
    const current = reminderMinutes(form.getValues('reminder'));
    form.setValue('due_time', time, { shouldDirty: true });
    if (current === null) return;
    const next = !hadTime && time && defaultMinutes !== null ? defaultMinutes : fitReminderToDue(current, !!time);
    form.setValue('reminder', toReminderValue(next), { shouldDirty: true });
  };

  return { onDateChange, onTimeChange };
}

function formValuesRemindAt(values: FormValues): string | null {
  const dueDate = values.due_date ? format(values.due_date, 'yyyy-MM-dd') : null;
  return computeRemindAt(dueDate, values.due_time || null, dueDate ? reminderMinutes(values.reminder) : null);
}

function reminderStatusMessage(remindAt: string, card: PersonalKanbanCardWithTags): string {
  const formatWhen = (iso: string) => format(parseISO(iso), "dd/MM 'às' HH:mm");
  if (remindAt === card.remind_at && card.reminder_sent_at) return `Lembrete enviado em ${formatWhen(card.reminder_sent_at)}.`;
  if (parseISO(remindAt) <= new Date()) return 'Esse horário já passou: o lembrete sai em instantes.';
  return `Você será lembrado em ${formatWhen(remindAt)}.`;
}

function ReminderSummary(props: { card: PersonalKanbanCardWithTags; values: FormValues; settings: PersonalKanbanSettingsDB | undefined }) {
  const { card, values, settings } = props;
  const remindAt = formValuesRemindAt(values);
  if (!remindAt) return null;
  const channels = settings?.email_reminders ? 'Inbox, e-mail e notificações dos aparelhos ativados' : 'Inbox e notificações dos aparelhos ativados';

  return (
    <div className="flex gap-2 rounded-lg bg-accent-subtle px-3 py-2 text-xs text-foreground" role="status">
      <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <p>
        {reminderStatusMessage(remindAt, card)} <span className="text-muted-foreground">Por {channels}.</span>
      </p>
    </div>
  );
}

function DeleteCardButton(props: { title: string; projectName?: string; pending: boolean; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive-subtle hover:text-destructive sm:mr-auto" onClick={() => setConfirming(true)} disabled={props.pending}>
        Excluir card
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este card?</AlertDialogTitle>
            <AlertDialogDescription>
              "{props.title}" sai do seu kanban de vez. Isso não pode ser desfeito.
              {props.projectName && ` A atividade no projeto ${props.projectName} continua.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive-hover" onClick={props.onConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ScheduleFields(props: { form: UseFormReturn<FormValues>; columns: PersonalKanbanColumnDB[]; settings: PersonalKanbanSettingsDB | undefined; linked: boolean }) {
  const { form, columns, settings, linked } = props;
  const { onDateChange, onTimeChange } = useDueSuggestions(form, settings);
  const [dueDate, dueTime] = form.watch(['due_date', 'due_time']);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField control={form.control} name="column_id" render={({ field }) => (
        <FormItem>
          <FormLabel>Coluna</FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={linked}>
            <FormControl><SelectTrigger aria-describedby={linked ? 'column-linked-hint' : undefined}><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>{columns.map((column) => <SelectItem key={column.id} value={column.id}>{column.name}</SelectItem>)}</SelectContent>
          </Select>
          {linked && <p id="column-linked-hint" className="text-[11px] text-muted-foreground">Arraste no board: mover segue as regras do projeto.</p>}
        </FormItem>
      )} />
      <Controller control={form.control} name="due_date" render={({ field }) => (
        <FormItem>
          <FormLabel>Prazo</FormLabel>
          <FormControl><DatePicker value={field.value ?? undefined} onChange={onDateChange} placeholder="Sem prazo" /></FormControl>
        </FormItem>
      )} />
      <FormField control={form.control} name="due_time" render={({ field }) => (
        <FormItem>
          <FormLabel>Hora</FormLabel>
          <FormControl>
            <Input type="time" value={field.value} onChange={(event) => onTimeChange(event.target.value)} disabled={!dueDate} aria-describedby="due-time-hint" />
          </FormControl>
          <p id="due-time-hint" className="text-[11px] text-muted-foreground">Opcional. Sem hora, vale o dia todo.</p>
        </FormItem>
      )} />
      <FormField control={form.control} name="reminder" render={({ field }) => (
        <FormItem>
          <FormLabel>Lembrete</FormLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={!dueDate}>
            <FormControl><SelectTrigger><SelectValue placeholder="Sem lembrete" /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value={NO_REMINDER}>Sem lembrete</SelectItem>
              {reminderOptions(!!dueTime).map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormItem>
      )} />
    </div>
  );
}

function LinkedProjectInfo(props: { card: PersonalKanbanCardWithTags }) {
  const activity = props.card.project_activity!;
  const unlink = useUnlinkCard();
  const [confirming, setConfirming] = useState(false);
  const number = activity.card_number ? `#${activity.card_number} · ` : '';
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 space-y-0.5">
        <p className="flex items-center gap-1.5 text-sm font-medium"><Link2 className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden />{activity.project?.name ?? 'Projeto'}</p>
        <p className="text-xs text-muted-foreground">{number}{COLUMN_LABELS[activity.column_name]} no board do projeto. Título e etapa andam juntos.</p>
      </div>
      <Button type="button" variant="ghost" size="sm" className="shrink-0" disabled={unlink.isPending} onClick={() => setConfirming(true)}>Desvincular</Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular do projeto?</AlertDialogTitle>
            <AlertDialogDescription>A atividade continua no board do projeto. Este card deixa de acompanhar ela e volta a ser só seu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => unlink.mutate(props.card.id)}>Desvincular</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProjectPicker(props: { form: UseFormReturn<FormValues>; open: boolean }) {
  const { data: projects = [], isLoading } = useLinkableProjects(props.open);
  const selected = props.form.watch('project_id') !== NO_PROJECT;
  return (
    <FormField control={props.form.control} name="project_id" render={({ field }) => (
      <FormItem>
        <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
          <FormControl><SelectTrigger aria-label="Vincular a um projeto"><SelectValue placeholder="Sem projeto" /></SelectTrigger></FormControl>
          <SelectContent>
            <SelectItem value={NO_PROJECT}>Sem projeto</SelectItem>
            {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {selected
            ? 'Ao salvar, o card vira uma atividade no board do projeto, atribuída a você. Prazo, lembrete e tags continuam aqui.'
            : 'Vincule para o card virar atividade no board do projeto.'}
        </p>
      </FormItem>
    )} />
  );
}

function ProjectSection(props: { form: UseFormReturn<FormValues>; card: PersonalKanbanCardWithTags; open: boolean }) {
  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">Projeto</span>
      {props.card.project_activity ? <LinkedProjectInfo card={props.card} /> : <ProjectPicker form={props.form} open={props.open} />}
    </div>
  );
}

function CardExtras(props: { form: UseFormReturn<FormValues>; card: PersonalKanbanCardWithTags; open: boolean }) {
  const { card } = props;
  return (
    <>
      <ProjectSection form={props.form} card={card} open={props.open} />
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Tags</span>
        <PersonalTagInput cardId={card.id} cardTags={card.card_tags ?? []} />
      </div>
    </>
  );
}

function dialogDescription(card: PersonalKanbanCardWithTags | null): string {
  if (card?.project_activity) return 'Prazo, lembrete e tags são só seus. Título e etapa andam com a atividade do projeto.';
  return 'Só você vê este card.';
}

// Depois de salvar o card: renomeia a atividade vinculada, ou cria a atividade e vincula.
function useProjectSync(columns: PersonalKanbanColumnDB[]) {
  const linkCard = useLinkCardToProject();
  const renameActivity = useRenameLinkedActivity();

  return async (formValues: FormValues, card: PersonalKanbanCardWithTags, saved: { title: string; description: string | null }) => {
    const activity = card.project_activity;
    if (activity) {
      if (saved.title !== activity.title) await renameActivity.mutateAsync({ activityId: activity.id, title: saved.title });
      return;
    }
    if (formValues.project_id === NO_PROJECT) return;
    const stage = columns.find((column) => column.id === formValues.column_id)?.stage ?? 'todo';
    await linkCard.mutateAsync({ card: { ...card, ...saved }, projectId: formValues.project_id, stage });
  };
}

export function PersonalCardDetailDialog(props: PersonalCardDetailDialogProps) {
  const { card, columns, settings, getNextPosition, open, onOpenChange } = props;
  const updateCard = useUpdatePersonalCard();
  const deleteCard = useDeletePersonalCard();
  const syncProject = useProjectSync(columns);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', column_id: '', due_date: null, due_time: '', reminder: NO_REMINDER, project_id: NO_PROJECT },
  });
  const values = form.watch();

  useEffect(() => {
    if (card) form.reset(toFormValues(card));
  }, [card, form]);

  // Os hooks já avisam do erro; aqui só não fecha o dialog.
  const onSubmit = async (formValues: FormValues) => {
    if (!card) return;
    const updates = buildUpdates(formValues, card, getNextPosition);
    try {
      await updateCard.mutateAsync({ id: card.id, updates });
      await syncProject(formValues, card, updates);
      onOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Card pessoal</DialogTitle>
          <DialogDescription>{dialogDescription(card)}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl><Input className="text-base font-medium" placeholder="O que precisa ser feito?" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <ScheduleFields form={form} columns={columns} settings={settings} linked={!!card?.project_activity} />
            {card && <ReminderSummary card={card} values={values} settings={settings} />}

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Detalhes, links, próximos passos…" className="resize-none" rows={4} {...field} /></FormControl>
              </FormItem>
            )} />

            {card && <CardExtras form={form} card={card} open={open} />}

            <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
              {card && <DeleteCardButton title={card.title} projectName={card.project_activity?.project?.name} pending={deleteCard.isPending} onConfirm={() => deleteCard.mutate(card.id, { onSuccess: () => onOpenChange(false) })} />}
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
