import { useEffect, useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { ActivityType, CreateActivityTypeInput } from '@/hooks/useActivityTypes';
import { useEmployees } from '@/hooks/useEmployees';

const PRESET_COLORS = [
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Amarelo', value: '#eab308' },
  { label: 'Cinza', value: '#6b7280' },
];

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  color: z.string().min(1, 'Cor é obrigatória'),
  applies_to_all: z.enum(['all', 'specific']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType?: ActivityType | null;
  existingEmployeeIds?: string[];
  onSubmit: (data: CreateActivityTypeInput) => void;
  isSubmitting: boolean;
}

export function ActivityTypeFormDialog({
  open,
  onOpenChange,
  activityType,
  existingEmployeeIds = [],
  onSubmit,
  isSubmitting,
}: Props) {
  const { data: employees = [] } = useEmployees();
  const activeEmployees = employees.filter(e => e.status === 'ativo');

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      color: '#6366f1',
      applies_to_all: 'all',
    },
  });

  const appliesToAll = form.watch('applies_to_all');

  useEffect(() => {
    if (open) {
      if (activityType) {
        form.reset({
          name: activityType.name,
          description: activityType.description ?? '',
          color: activityType.color,
          applies_to_all: activityType.applies_to_all ? 'all' : 'specific',
        });
        setSelectedEmployeeIds(existingEmployeeIds);
      } else {
        form.reset({
          name: '',
          description: '',
          color: '#6366f1',
          applies_to_all: 'all',
        });
        setSelectedEmployeeIds([]);
      }
      setEmployeeSearch('');
    }
  }, [open, activityType, existingEmployeeIds]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      description: data.description,
      color: data.color,
      applies_to_all: data.applies_to_all === 'all',
      employee_ids: data.applies_to_all === 'specific' ? selectedEmployeeIds : [],
    });
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id],
    );
  };

  const filteredEmployees = activeEmployees.filter(e =>
    e.nome.toLowerCase().includes(employeeSearch.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{activityType ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome*</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Administrativo" {...field} />
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
                    <Textarea placeholder="Descrição opcional..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => field.onChange(c.value)}
                          className="h-7 w-7 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c.value,
                            borderColor: field.value === c.value ? '#000' : 'transparent',
                            transform: field.value === c.value ? 'scale(1.2)' : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applies_to_all"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aplicar a</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="all" id="all" />
                        <Label htmlFor="all">Todos os funcionários</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="specific" id="specific" />
                        <Label htmlFor="specific">Funcionários específicos</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {appliesToAll === 'specific' && (
              <div className="space-y-2">
                <Input
                  placeholder="Buscar funcionário..."
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  className="h-8 text-sm"
                />

                {selectedEmployeeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEmployeeIds.map(id => {
                      const emp = activeEmployees.find(e => e.id === id);
                      if (!emp) return null;
                      return (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {emp.nome}
                          <button type="button" onClick={() => toggleEmployee(id)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto border rounded-md divide-y">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3">Nenhum funcionário encontrado.</p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onChange={() => toggleEmployee(emp.id)}
                          className="rounded"
                        />
                        {emp.nome}
                        {emp.cargo && (
                          <span className="text-xs text-muted-foreground ml-auto">{emp.cargo}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : activityType ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
