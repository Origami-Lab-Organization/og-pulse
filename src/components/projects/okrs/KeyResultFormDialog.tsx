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
import { useCreateKeyResult, useUpdateKeyResult } from '@/hooks/useProjectOKRs';
import { ProjectKeyResult, KEY_RESULT_STATUS_LABELS, KeyResultStatus } from '@/types/projectOkr';

const formSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  targetValue: z.coerce.number().optional(),
  currentValue: z.coerce.number().optional(),
  unit: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']),
});

type FormData = z.infer<typeof formSchema>;

interface KeyResultFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  okrId: string;
  keyResult: ProjectKeyResult | null;
}

export function KeyResultFormDialog({
  open,
  onOpenChange,
  projectId,
  okrId,
  keyResult,
}: KeyResultFormDialogProps) {
  const createKeyResult = useCreateKeyResult();
  const updateKeyResult = useUpdateKeyResult();
  const isEditing = !!keyResult;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      targetValue: undefined,
      currentValue: 0,
      unit: '',
      status: 'pending',
    },
  });

  useEffect(() => {
    if (open) {
      if (keyResult) {
        form.reset({
          description: keyResult.description,
          targetValue: keyResult.target_value ?? undefined,
          currentValue: keyResult.current_value,
          unit: keyResult.unit || '',
          status: keyResult.status,
        });
      } else {
        form.reset({
          description: '',
          targetValue: undefined,
          currentValue: 0,
          unit: '',
          status: 'pending',
        });
      }
    }
  }, [open, keyResult, form]);

  const onSubmit = (data: FormData) => {
    if (isEditing) {
      updateKeyResult.mutate(
        {
          id: keyResult.id,
          projectId,
          updates: {
            description: data.description,
            targetValue: data.targetValue,
            currentValue: data.currentValue,
            unit: data.unit,
            status: data.status as KeyResultStatus,
          },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createKeyResult.mutate(
        {
          input: {
            okrId,
            description: data.description,
            targetValue: data.targetValue,
            unit: data.unit,
          },
          projectId,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Key Result' : 'Novo Key Result'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reduzir tempo de resposta para < 2s" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Meta</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Atual</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input placeholder="%, un, R$" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        {Object.entries(KEY_RESULT_STATUS_LABELS).map(([value, label]) => (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createKeyResult.isPending || updateKeyResult.isPending}
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
