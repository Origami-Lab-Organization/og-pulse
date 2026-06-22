import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateVacationRequest } from '@/hooks/useVacations';

const schema = z
  .object({
    startDate: z.date({ required_error: 'Selecione a data inicial' }),
    endDate: z.date({ required_error: 'Selecione a data final' }),
    notes: z.string().max(500, 'Máximo de 500 caracteres').optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: 'A data final deve ser maior ou igual à inicial',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableDays: number;
}

function daysBetween(start?: Date, end?: Date): number {
  if (!start || !end || end < start) return 0;
  return differenceInCalendarDays(end, start) + 1;
}

export function VacationRequestDialog({ open, onOpenChange, availableDays }: Props) {
  const createRequest = useCreateVacationRequest();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const start = form.watch('startDate');
  const end = form.watch('endDate');
  const days = useMemo(() => daysBetween(start, end), [start, end]);
  const exceedsBalance = days > availableDays;

  const onSubmit = (values: FormValues) => {
    const requestedDays = daysBetween(values.startDate, values.endDate);
    if (requestedDays > availableDays) return; // guarda extra; UI já bloqueia o botão
    createRequest.mutate(
      {
        startDate: format(values.startDate, 'yyyy-MM-dd'),
        endDate: format(values.endDate, 'yyyy-MM-dd'),
        daysRequested: requestedDays,
        notes: values.notes,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      },
    );
  };

  const renderDateField = (name: 'startDate' | 'endDate', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className={cn('justify-start text-left font-normal', !field.value && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar férias</DialogTitle>
          <DialogDescription>
            Você tem <strong>{availableDays} dias</strong> disponíveis. Escolha o período desejado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {renderDateField('startDate', 'Início')}
              {renderDateField('endDate', 'Fim')}
            </div>

            {days > 0 && (
              <p className={cn('text-sm', exceedsBalance ? 'text-destructive' : 'text-muted-foreground')}>
                Período de <strong>{days} dia(s)</strong>.
                {exceedsBalance && ' Excede o seu saldo disponível.'}
              </p>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: viagem em família"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRequest.isPending || days === 0 || exceedsBalance}>
                {createRequest.isPending ? 'Enviando...' : 'Solicitar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
