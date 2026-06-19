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
import { Loader2 } from 'lucide-react';
import { Benefit, CreateBenefitInput } from '@/types/benefit';
import { formatCurrency } from '@/lib/masks';

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  value: z.number({ invalid_type_error: 'Informe um valor válido' }).min(0, 'O valor não pode ser negativo'),
});

type FormValues = z.infer<typeof formSchema>;

interface BenefitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  benefit: Benefit | null;
  onSubmit: (data: CreateBenefitInput) => void;
  isLoading?: boolean;
}

export function BenefitFormDialog({ open, onOpenChange, benefit, onSubmit, isLoading }: BenefitFormDialogProps) {
  const [valueDisplay, setValueDisplay] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', value: 0 },
  });

  useEffect(() => {
    if (open) {
      if (benefit) {
        form.reset({ name: benefit.name, description: benefit.description ?? '', value: benefit.value });
        setValueDisplay(benefit.value > 0 ? formatCurrency(benefit.value) : '');
      } else {
        form.reset({ name: '', description: '', value: 0 });
        setValueDisplay('');
      }
    }
  }, [open, benefit]);

  const handleSubmit = (values: FormValues) => {
    onSubmit({ name: values.name, description: values.description || undefined, value: values.value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{benefit ? 'Editar Benefício' : 'Novo Benefício'}</DialogTitle>
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
                    <Input placeholder="Ex: Vale Refeição" {...field} />
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
                    <Textarea placeholder="Descreva o benefício (opcional)" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor mensal *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        className="pl-9"
                        value={valueDisplay}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          setValueDisplay(digits ? formatCurrency(digits) : '');
                          field.onChange(digits ? parseInt(digits, 10) / 100 : 0);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {benefit ? 'Salvar' : 'Criar Benefício'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
