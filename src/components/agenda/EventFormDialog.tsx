import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addMonths, format, getDay, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateCalendarEvent, useUpdateCalendarEvent } from '@/hooks/useMicrosoftGraph';
import { useLinkProjectRito, useRitoEligibleProjects } from '@/hooks/useProjectRitos';
import { PROJECT_RITO_LABEL, PROJECT_RITO_TYPE } from '@/types/projectRito';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { AttendeePicker } from './AttendeePicker';
import { RecurrenceFields } from './RecurrenceFields';
import {
  GRAPH_WEEKDAYS,
  RECURRENCE_END,
  RECURRENCE_FREQUENCY,
} from '@/types/microsoftGraph';
import type { CalendarEventDetail, RecurrenceInput } from '@/types/microsoftGraph';

const recurrenceSchema = z.object({
  frequency: z.enum([
    RECURRENCE_FREQUENCY.DAILY,
    RECURRENCE_FREQUENCY.WEEKLY,
    RECURRENCE_FREQUENCY.MONTHLY,
    RECURRENCE_FREQUENCY.YEARLY,
  ]),
  interval: z.number().int().min(1).max(99),
  daysOfWeek: z.array(z.enum(GRAPH_WEEKDAYS)),
  end: z.enum([RECURRENCE_END.ON_DATE, RECURRENCE_END.NEVER]),
  endDate: z.string(),
});

/**
 * Radix não aceita item de Select com valor vazio, então "nenhum projeto" usa
 * este sentinela e é traduzido para string vazia no formulário.
 */
const NO_RITO_PROJECT = 'none';

const formSchema = z
  .object({
    subject: z.string().trim().min(1, 'Título é obrigatório'),
    date: z.string().min(1, 'Data é obrigatória'),
    startTime: z.string().min(1, 'Início é obrigatório'),
    endTime: z.string().min(1, 'Término é obrigatório'),
    attendees: z.array(z.string().email()),
    location: z.string(),
    withTeamsMeeting: z.boolean(),
    notes: z.string(),
    isRecurring: z.boolean(),
    recurrence: recurrenceSchema,
    /** Vazio = não vincular. Opcional por decisão de produto (ADR-0011). */
    ritoProjectId: z.string(),
    ritoType: z.enum([
      PROJECT_RITO_TYPE.DAILY,
      PROJECT_RITO_TYPE.PLANNING,
      PROJECT_RITO_TYPE.REVIEW,
      PROJECT_RITO_TYPE.RETRO,
      PROJECT_RITO_TYPE.OUTRO,
    ]),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ['endTime'],
    message: 'O término precisa ser depois do início',
  })
  .superRefine((data, ctx) => {
    if (!data.isRecurring) return;

    if (
      data.recurrence.frequency === RECURRENCE_FREQUENCY.WEEKLY &&
      data.recurrence.daysOfWeek.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence'],
        message: 'Escolha pelo menos um dia da semana',
      });
    }

    if (
      data.recurrence.end === RECURRENCE_END.ON_DATE &&
      data.recurrence.endDate <= data.date
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurrence'],
        message: 'A data final precisa ser depois da primeira ocorrência',
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

/** Semanal a partir do dia da própria data, terminando em seis meses. */
function defaultRecurrence(date: Date): RecurrenceInput {
  return {
    frequency: RECURRENCE_FREQUENCY.WEEKLY,
    interval: 1,
    daysOfWeek: [GRAPH_WEEKDAYS[getDay(date)]],
    end: RECURRENCE_END.ON_DATE,
    endDate: format(addMonths(date, 6), 'yyyy-MM-dd'),
  };
}

/**
 * Horário atual arredondado para os 15 minutos seguintes — abre perto de agora
 * em vez de pular para a hora cheia.
 */
function currentTimeSlot(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  return format(now, 'HH:mm');
}

function addOneHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const end = new Date();
  end.setHours(hours + 1, minutes, 0, 0);
  return format(end, 'HH:mm');
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dia pré-selecionado ao abrir pela grade (modo criação). */
  initialDate: Date;
  /** Presente = editar este compromisso; ausente = criar novo. */
  event?: CalendarEventDetail | null;
}

/** Valores do formulário a partir de um evento existente. */
function valuesFromEvent(event: CalendarEventDetail): FormData {
  const start = event.start ? parseISO(event.start) : new Date();
  const end = event.end ? parseISO(event.end) : start;

  return {
    subject: event.subject,
    date: format(start, 'yyyy-MM-dd'),
    startTime: format(start, 'HH:mm'),
    endTime: format(end, 'HH:mm'),
    attendees: event.attendees.map((attendee) => attendee.email).filter(Boolean),
    location: event.location ?? '',
    withTeamsMeeting: Boolean(event.onlineMeetingUrl),
    // Vazio de propósito: a descrição só é enviada se a pessoa escrever algo.
    // `preview` é texto truncado e sem o bloco do Teams — usar como valor
    // inicial apagaria o corpo real do evento ao salvar.
    notes: '',
    isRecurring: false,
    recurrence: defaultRecurrence(start),
    ritoProjectId: '',
    ritoType: PROJECT_RITO_TYPE.DAILY,
  };
}

function valuesForNewEvent(initialDate: Date): FormData {
  const start = currentTimeSlot();
  return {
    subject: '',
    date: format(initialDate, 'yyyy-MM-dd'),
    startTime: start,
    endTime: addOneHour(start),
    attendees: [],
    location: '',
    withTeamsMeeting: false,
    notes: '',
    isRecurring: false,
    recurrence: defaultRecurrence(initialDate),
    ritoProjectId: '',
    ritoType: PROJECT_RITO_TYPE.DAILY,
  };
}

export function EventFormDialog({
  open,
  onOpenChange,
  initialDate,
  event = null,
}: EventFormDialogProps) {
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const linkRito = useLinkProjectRito();
  const projects = useRitoEligibleProjects();
  const isEditing = Boolean(event);
  const isSaving = createEvent.isPending || updateEvent.isPending;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: event ? valuesFromEvent(event) : valuesForNewEvent(initialDate),
  });

  useEffect(() => {
    if (open) {
      form.reset(event ? valuesFromEvent(event) : valuesForNewEvent(initialDate));
    }
  }, [open, initialDate, event, form]);

  const onSubmit = async (data: FormData) => {
    // Horário local sem sufixo Z — o fuso vai declarado à parte no Graph.
    const start = `${data.date}T${data.startTime}:00`;
    const end = `${data.date}T${data.endTime}:00`;
    const close = { onSuccess: () => onOpenChange(false) };

    if (event) {
      await updateEvent.mutateAsync(
        {
          eventId: event.id,
          input: {
            subject: data.subject.trim(),
            start,
            end,
            attendees: data.attendees,
            location: data.location.trim(),
            notes: data.notes.trim(),
          },
        },
        close,
      );
      return;
    }

    const created = await createEvent.mutateAsync({
      subject: data.subject.trim(),
      start,
      end,
      attendees: data.attendees,
      location: data.location.trim(),
      withTeamsMeeting: data.withTeamsMeeting,
      notes: data.notes.trim(),
      recurrence: data.isRecurring ? (data.recurrence as RecurrenceInput) : null,
    });

    // O vínculo só é possível depois da criação, porque o iCalUId nasce com o
    // evento. Falhar aqui não desfaz o compromisso, que já existe na agenda —
    // por isso o erro é reportado à parte em vez de parecer falha da criação.
    if (data.ritoProjectId && created.icalUid) {
      try {
        await linkRito.mutateAsync({
          projectId: data.ritoProjectId,
          ritoType: data.ritoType,
          icalUid: created.icalUid,
          eventTitle: created.subject,
          isSeries: data.isRecurring,
        });
      } catch {
        toast.warning('Compromisso criado, mas o vínculo com o rito não foi salvo.');
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex max-h-[90vh] flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'A alteração vai para sua agenda da Microsoft e os convidados são avisados. Recorrência e reunião do Teams são alteradas no Outlook.'
              : 'O compromisso é criado na sua agenda da Microsoft e os convidados recebem o convite por e-mail.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            {/* min-h-0 no wrapper e no filho: sem isso o flex não encolhe e a rolagem não acontece. */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Reunião de alinhamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convidados</FormLabel>
                  <FormControl>
                    <AttendeePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormDescription>
                    Busque pela equipe ou digite um e-mail externo. Opcional.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <Input placeholder="Sala de reunião, endereço ou online" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Repetir</FormLabel>
                    <FormDescription>Cria uma série recorrente.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            )}

            {!isEditing && form.watch('isRecurring') && (
              <FormField
                control={form.control}
                name="recurrence"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <RecurrenceFields
                        value={field.value as RecurrenceInput}
                        onChange={field.onChange}
                        error={fieldState.error?.message}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {!isEditing && (
            <FormField
              control={form.control}
              name="withTeamsMeeting"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Reunião do Teams</FormLabel>
                    <FormDescription>Gera o link de entrada automaticamente.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={
                        isEditing
                          ? 'Deixe em branco para manter a descrição atual'
                          : 'Pauta, contexto, links...'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Rito de projeto</p>
                  <p className="text-sm text-muted-foreground">
                    Opcional. Vincule se este compromisso é um rito de um projeto seu.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="ritoProjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto</FormLabel>
                      <Select
                        value={field.value || NO_RITO_PROJECT}
                        onValueChange={(value) =>
                          field.onChange(value === NO_RITO_PROJECT ? '' : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_RITO_PROJECT}>Nenhum</SelectItem>
                          {projects.data?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('ritoProjectId') && (
                  <FormField
                    control={form.control}
                    name="ritoType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rito</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PROJECT_RITO_LABEL).map(([type, label]) => (
                              <SelectItem key={type} value={type}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button variant="gradient" type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isEditing ? 'Salvar alterações' : 'Criar compromisso'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
