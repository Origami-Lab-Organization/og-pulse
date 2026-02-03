import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useCreateMilestone, useUpdateMilestone } from '@/hooks/useProjectMilestones';
import { ProjectMilestone, MILESTONE_STATUS_LABELS, MilestoneStatus } from '@/types/projectMilestone';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  plannedDate: z.string().min(1, 'Data planejada é obrigatória'),
  completedDate: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed']),
  orderIndex: z.coerce.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MilestoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone: ProjectMilestone | null;
}

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
    defaultValues: {
      title: '',
      description: '',
      plannedDate: '',
      completedDate: '',
      status: 'pending',
      orderIndex: 0,
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        title: milestone.title,
        description: milestone.description || '',
        plannedDate: milestone.planned_date,
        completedDate: milestone.completed_date || '',
        status: milestone.status,
        orderIndex: milestone.order_index,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        plannedDate: '',
        completedDate: '',
        status: 'pending',
        orderIndex: 0,
      });
    }
  }, [milestone, form]);

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateMilestone.mutate(
        {
          id: milestone.id,
          projectId,
          updates: {
            title: data.title,
            description: data.description,
            plannedDate: data.plannedDate,
            completedDate: data.completedDate || undefined,
            status: data.status as MilestoneStatus,
            orderIndex: data.orderIndex,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createMilestone.mutate(
        {
          projectId,
          title: data.title,
          description: data.description,
          plannedDate: data.plannedDate,
          orderIndex: data.orderIndex,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Marco' : 'Novo Marco'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o marco..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Planejada *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
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
              )}
            </div>

            {isEditing && (
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
            )}

            <FormField
              control={form.control}
              name="orderIndex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMilestone.isPending || updateMilestone.isPending}
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
