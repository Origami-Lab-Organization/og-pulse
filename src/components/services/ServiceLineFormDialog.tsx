import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ServiceLine, CreateServiceLineInput } from '@/types/serviceLine';

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceLineFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceLine: ServiceLine | null;
  onSubmit: (data: CreateServiceLineInput) => void;
  isLoading?: boolean;
}

export function ServiceLineFormDialog(props: ServiceLineFormDialogProps) {
  const { open, onOpenChange, serviceLine, onSubmit, isLoading } = props;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: serviceLine?.name ?? '',
      description: serviceLine?.description ?? '',
    });
  }, [open, serviceLine]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({ name: values.name, description: values.description || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{serviceLine ? 'Editar linha de serviço' : 'Nova linha de serviço'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da linha</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>
                    Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {serviceLine ? 'Salvar' : 'Criar linha'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
