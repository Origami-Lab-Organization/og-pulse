import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Flag, Rocket, Layers, ClipboardCheck, LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/useProjectMilestones';
import {
  ProjectMilestone,
  MILESTONE_STATUS_LABELS,
  MILESTONE_TYPE_LABELS,
  MILESTONE_TYPE_DESCRIPTIONS,
  MilestoneStatus,
  MilestoneType,
  isPointType,
} from '@/types/projectMilestone';

const MILESTONE_TYPE_ICONS: Record<MilestoneType, LucideIcon> = {
  marco: Flag,
  release: Rocket,
  epico: Layers,
  entrega_interna: ClipboardCheck,
};

const MILESTONE_TYPES: MilestoneType[] = ['marco', 'release', 'epico', 'entrega_interna'];

const formSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório'),
    deliverables: z.string().optional(),
    milestoneType: z.enum(['marco', 'release', 'epico', 'entrega_interna']),
    date: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    completedDate: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed']),
  })
  .superRefine((data, ctx) => {
    if (isPointType(data.milestoneType)) {
      if (!data.date) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Data é obrigatória' });
      }
      return;
    }
    if (!data.startDate) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Data de início é obrigatória' });
    }
    if (!data.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Data de fim é obrigatória' });
    }
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Data de fim deve ser igual ou posterior à data de início',
      });
    }
  });

type FormData = z.infer<typeof formSchema>;

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone: ProjectMilestone | null;
}

const emptyDefaults: FormData = {
  title: '',
  deliverables: '',
  milestoneType: 'marco',
  date: '',
  startDate: '',
  endDate: '',
  completedDate: '',
  status: 'pending',
};

export function MilestoneFormDialog({
  open,
  onOpenChange,
  projectId,
  milestone,
}: MilestoneFormDialogProps) {
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const isEditing = !!milestone;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults,
  });

  const milestoneType = form.watch('milestoneType');
  const isPoint = isPointType(milestoneType);

  useEffect(() => {
    if (!open) return;

    if (milestone) {
      const point = isPointType(milestone.milestone_type);
      form.reset({
        title: milestone.title,
        deliverables: milestone.deliverables || '',
        milestoneType: milestone.milestone_type,
        date: point ? milestone.start_date : '',
        startDate: point ? '' : milestone.start_date,
        endDate: point ? '' : milestone.end_date,
        completedDate: milestone.completed_date || '',
        status: milestone.status,
      });
    } else {
      form.reset(emptyDefaults);
    }
  }, [open, milestone, form]);

  const handleTypeChange = (newType: MilestoneType) => {
    const wasPoint = isPointType(form.getValues('milestoneType'));
    const willBePoint = isPointType(newType);

    if (wasPoint && !willBePoint) {
      // Pontual → período: usa a data já digitada como início, força confirmar o fim.
      form.setValue('startDate', form.getValues('date') || '');
      form.setValue('endDate', '');
    } else if (!wasPoint && willBePoint) {
      // Período → pontual: usa o início já digitado como a data única.
      form.setValue('date', form.getValues('startDate') || '');
    }
    form.setValue('milestoneType', newType);
  };

  const onSubmit = (data: FormData) => {
    const startDate = isPointType(data.milestoneType) ? data.date! : data.startDate!;
    const endDate = isPointType(data.milestoneType) ? data.date! : data.endDate!;

    if (isEditing) {
      updateMilestone.mutate(
        {
          id: milestone.id,
          projectId,
          updates: {
            title: data.title,
            deliverables: data.deliverables,
            startDate,
            endDate,
            completedDate: data.completedDate || undefined,
            status: data.status as MilestoneStatus,
            milestoneType: data.milestoneType,
          },
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMilestone.mutate(
        {
          projectId,
          title: data.title,
          deliverables: data.deliverables,
          startDate,
          endDate,
          milestoneType: data.milestoneType,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Item do Roadmap' : 'Novo Item do Roadmap'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <FormLabel>Tipo *</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {MILESTONE_TYPES.map((type) => {
                  const Icon = MILESTONE_TYPE_ICONS[type];
                  const isSelected = milestoneType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-colors',
                        isSelected ? 'border-primary-deep bg-primary-deep/10' : 'hover:bg-muted',
                      )}
                    >
                      <span className={cn('flex items-center gap-1.5 text-sm font-medium', isSelected ? 'text-primary-deep' : 'text-foreground')}>
                        <Icon className="h-3.5 w-3.5" />
                        {MILESTONE_TYPE_LABELS[type]}
                      </span>
                      <span className="text-xs text-muted-foreground">{MILESTONE_TYPE_DESCRIPTIONS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Kickoff do Projeto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliverables"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entregáveis</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva os entregáveis deste item..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isPoint ? (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fim *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Conclusão</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(MILESTONE_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMilestone.isPending || updateMilestone.isPending}
                className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
              >
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
