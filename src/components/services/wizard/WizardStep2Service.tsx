import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
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
import { WizardServiceData } from './types';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface WizardStep2ServiceProps {
  lineName: string;
  initial?: WizardServiceData;
  onContinue: (data: WizardServiceData) => void;
  onBack: () => void;
}

export function WizardStep2Service({
  lineName,
  initial,
  onContinue,
  onBack,
}: WizardStep2ServiceProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', description: initial?.description ?? '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onContinue)} className="space-y-5">
        <p className="text-base text-muted-foreground -mt-1">
          Entrega vendável específica dentro de uma linha de serviço. Exemplos:{' '}
          <span className="text-foreground/70">
            Diagnóstico, Implementação, Projeto sob demanda, Pacote de horas, Assessoria mensal.
          </span>
        </p>

        <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-2.5">
          <Layers className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">
            Linha:{' '}
            <span className="font-medium text-foreground">{lineName}</span>
          </span>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do serviço</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Desenvolvimento de MVP" autoFocus {...field} />
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
                  placeholder="Breve descrição do serviço"
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between pt-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
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
