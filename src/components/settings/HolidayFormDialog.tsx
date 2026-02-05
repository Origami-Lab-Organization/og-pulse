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
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Holiday, HolidayFormData, MONTH_NAMES, HolidayType } from '@/types/holiday';
import { useCreateHoliday, useUpdateHoliday } from '@/hooks/useHolidays';
import { format } from 'date-fns';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  holiday_type: z.enum(['fixed', 'floating', 'one_time']),
  fixed_day: z.coerce.number().min(1).max(31).optional(),
  fixed_month: z.coerce.number().min(1).max(12).optional(),
  specific_date: z.string().optional(),
});

interface HolidayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holiday?: Holiday | null;
}

export function HolidayFormDialog({ open, onOpenChange, holiday }: HolidayFormDialogProps) {
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const isEditing = !!holiday;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      holiday_type: 'fixed',
      fixed_day: 1,
      fixed_month: 1,
      specific_date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const holidayType = form.watch('holiday_type');

  useEffect(() => {
    if (holiday) {
      form.reset({
        name: holiday.name,
        holiday_type: holiday.holiday_type as HolidayType,
        fixed_day: holiday.fixed_day || 1,
        fixed_month: holiday.fixed_month || 1,
        specific_date: holiday.specific_date || format(new Date(), 'yyyy-MM-dd'),
      });
    } else {
      form.reset({
        name: '',
        holiday_type: 'fixed',
        fixed_day: 1,
        fixed_month: 1,
        specific_date: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [holiday, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData: HolidayFormData = {
      name: values.name,
      holiday_type: values.holiday_type,
    };

    if (values.holiday_type === 'fixed') {
      formData.fixed_day = values.fixed_day;
      formData.fixed_month = values.fixed_month;
    } else {
      formData.specific_date = values.specific_date;
      if (values.holiday_type === 'floating' && values.specific_date) {
        formData.reference_year = new Date(values.specific_date).getFullYear();
      }
    }

    if (isEditing && holiday) {
      await updateHoliday.mutateAsync({ id: holiday.id, formData });
    } else {
      await createHoliday.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Feriado' : 'Adicionar Feriado'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Feriado *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dia do Trabalho" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="holiday_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="fixed" />
                        <Label htmlFor="fixed" className="font-normal cursor-pointer">
                          Fixo (repete todo ano na mesma data)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="floating" id="floating" />
                        <Label htmlFor="floating" className="font-normal cursor-pointer">
                          Móvel (data varia por ano - ex: Carnaval)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one_time" id="one_time" />
                        <Label htmlFor="one_time" className="font-normal cursor-pointer">
                          Pontual (apenas uma data específica)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {holidayType === 'fixed' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fixed_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fixed_month"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês *</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={String(field.value)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MONTH_NAMES.map((month, index) => (
                            <SelectItem key={index + 1} value={String(index + 1)}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {(holidayType === 'floating' || holidayType === 'one_time') && (
              <FormField
                control={form.control}
                name="specific_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createHoliday.isPending || updateHoliday.isPending}
              >
                {createHoliday.isPending || updateHoliday.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
