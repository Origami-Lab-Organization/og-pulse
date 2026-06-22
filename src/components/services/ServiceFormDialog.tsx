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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Service, CreateServiceInput } from '@/types/service';
import { ServiceLine } from '@/types/serviceLine';

const formSchema = z.object({
  serviceLineId: z.string().min(1, 'Selecione uma linha de serviço'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  /** Linhas ativas disponíveis para vínculo. */
  serviceLines: ServiceLine[];
  /** Linha pré-selecionada ao criar um serviço (ex.: o "+" dentro de uma linha). */
  defaultServiceLineId?: string;
  onSubmit: (data: CreateServiceInput) => void;
  isLoading?: boolean;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  serviceLines,
  defaultServiceLineId,
  onSubmit,
  isLoading,
}: ServiceFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { serviceLineId: '', name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    if (service) {
      form.reset({
        serviceLineId: service.serviceLineId ?? defaultServiceLineId ?? '',
        name: service.name,
        description: service.description ?? '',
      });
    } else {
      form.reset({
        serviceLineId: defaultServiceLineId ?? '',
        name: '',
        description: '',
      });
    }
  }, [open, service, defaultServiceLineId]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      serviceLineId: values.serviceLineId,
      name: values.name,
      description: values.description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="serviceLineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linha de serviço</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma linha" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceLines.map((line) => (
                        <SelectItem key={line.id} value={line.id}>
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do serviço</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Desenvolvimento de MVP" {...field} />
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
                      placeholder="Breve descrição do serviço (opcional)"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    As condições de cobrança são definidas nos modelos de receita do serviço.
                  </FormDescription>
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
                {service ? 'Salvar' : 'Criar serviço'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
