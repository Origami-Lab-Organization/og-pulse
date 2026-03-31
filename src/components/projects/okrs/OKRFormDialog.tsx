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
import { useCreateOKR, useUpdateOKR } from '@/hooks/useProjectOKRs';
import { ProjectOKR, OKR_STATUS_LABELS, OKRStatus } from '@/types/projectOkr';

const formSchema = z.object({
  objective: z.string().min(1, 'Objetivo é obrigatório'),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
});

type FormData = z.infer<typeof formSchema>;

interface OKRFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  okr: ProjectOKR | null;
}

export function OKRFormDialog({ open, onOpenChange, projectId, okr }: OKRFormDialogProps) {
  const createOKR = useCreateOKR();
  const updateOKR = useUpdateOKR();
  const isEditing = !!okr;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      objective: '',
      description: '',
      targetDate: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (open) {
      if (okr) {
        form.reset({
          objective: okr.objective,
          description: okr.description || '',
          targetDate: okr.target_date || '',
          status: okr.status,
        });
      } else {
        form.reset({
          objective: '',
          description: '',
          targetDate: '',
          status: 'pending',
        });
      }
    }
  }, [open, okr, form]);

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateOKR.mutate(
        {
          id: okr.id,
          projectId,
          updates: {
            objective: data.objective,
            description: data.description,
            targetDate: data.targetDate,
            status: data.status as OKRStatus,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createOKR.mutate(
        {
          projectId,
          objective: data.objective,
          description: data.description,
          targetDate: data.targetDate,
          status: data.status as OKRStatus,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aumentar satisfação do cliente" {...field} />
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
                    <Textarea
                      placeholder="Descreva o objetivo em mais detalhes..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Meta</FormLabel>
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
                        {Object.entries(OKR_STATUS_LABELS).map(([value, label]) => (
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
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createOKR.isPending || updateOKR.isPending}>
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
