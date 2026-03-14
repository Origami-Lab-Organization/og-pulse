import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Service, CreateServiceInput, PROJECT_TYPE_LABELS } from '@/types/service';
import { formatCurrency } from '@/lib/masks';
import { ProjectType } from '@/types/project';

const PROJECT_TYPES: ProjectType[] = ['fixed_scope', 'continuous', 'success_fee', 'non_revenue'];

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  projectType: z.enum(['fixed_scope', 'continuous', 'success_fee', 'non_revenue']),
  description: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSubmit: (data: CreateServiceInput) => void;
  isLoading?: boolean;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  isLoading,
}: ServiceFormDialogProps) {
  const [priceDisplay, setPriceDisplay] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', projectType: 'fixed_scope', description: '', unitPrice: undefined },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        service
          ? {
              name: service.name,
              projectType: service.projectType,
              description: service.description ?? '',
              unitPrice: service.unitPrice ?? undefined,
            }
          : { name: '', projectType: 'fixed_scope', description: '', unitPrice: undefined }
      );
      setPriceDisplay(service?.unitPrice ? formatCurrency(service.unitPrice) : '');
    }
  }, [open, service]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      name: values.name,
      projectType: values.projectType,
      description: values.description || undefined,
      unitPrice: values.unitPrice,
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Consultoria de Projeto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Projeto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PROJECT_TYPE_LABELS[type]}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o serviço (opcional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço Unitário</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00 (opcional)"
                      value={priceDisplay}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '');
                        setPriceDisplay(digits ? formatCurrency(digits) : '');
                        field.onChange(digits ? parseInt(digits, 10) / 100 : undefined);
                      }}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Se preenchido, será sugerido como valor estimado ao criar um lead com este serviço.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {service ? 'Salvar' : 'Criar Serviço'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
