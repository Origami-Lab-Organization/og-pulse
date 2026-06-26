import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, Loader2 } from 'lucide-react';
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
import { WizardLineData } from './types';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface WizardStep1LineProps {
  initial?: WizardLineData;
  onContinue: (data: WizardLineData) => void;
  onCancel: () => void;
}

export function WizardStep1Line({ initial, onContinue, onCancel }: WizardStep1LineProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', description: initial?.description ?? '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onContinue)} className="space-y-5">
        <p className="text-base text-muted-foreground -mt-1">
          Categoria-raiz do portfólio que agrupa serviços de propósito comum. Exemplos:{' '}
          <span className="text-foreground/70">
            Consultoria, Implementação, Treinamentos, Projetos Sob Demanda.
          </span>
        </p>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Ventures, Product Studio" autoFocus {...field} />
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
                Descrição{' '}
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Breve descrição desta linha"
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            Continuar
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
