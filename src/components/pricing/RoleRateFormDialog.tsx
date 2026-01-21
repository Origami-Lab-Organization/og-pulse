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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleRateDB, CreateRoleRateInput, SENIORITY_OPTIONS } from '@/types/roleRate';
import { formatCurrency, parseCurrency } from '@/lib/masks';
import { Loader2 } from 'lucide-react';

const roleRateSchema = z.object({
  roleName: z.string().min(2, 'Nome do papel deve ter no mínimo 2 caracteres'),
  seniority: z.string().min(1, 'Selecione uma senioridade'),
  hourlyRate: z.string().min(1, 'Informe o valor hora'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type RoleRateFormValues = z.infer<typeof roleRateSchema>;

interface RoleRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleRate?: RoleRateDB | null;
  onSubmit: (data: CreateRoleRateInput) => void;
  isSubmitting?: boolean;
}

export function RoleRateFormDialog({
  open,
  onOpenChange,
  roleRate,
  onSubmit,
  isSubmitting,
}: RoleRateFormDialogProps) {
  const isEditing = !!roleRate;

  const form = useForm<RoleRateFormValues>({
    resolver: zodResolver(roleRateSchema),
    defaultValues: {
      roleName: '',
      seniority: '',
      hourlyRate: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (roleRate) {
        form.reset({
          roleName: roleRate.role_name,
          seniority: roleRate.seniority,
          hourlyRate: formatCurrency(roleRate.hourly_rate),
          description: roleRate.description || '',
          isActive: roleRate.is_active,
        });
      } else {
        form.reset({
          roleName: '',
          seniority: '',
          hourlyRate: '',
          description: '',
          isActive: true,
        });
      }
    }
  }, [open, roleRate, form]);

  const handleSubmit = (values: RoleRateFormValues) => {
    onSubmit({
      roleName: values.roleName,
      seniority: values.seniority,
      hourlyRate: parseCurrency(values.hourlyRate),
      description: values.description || undefined,
      isActive: values.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Papel' : 'Novo Papel'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Papel *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Gerente de Produto"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seniority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senioridade *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a senioridade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SENIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Hora *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="R$ 0,00"
                      {...field}
                      onChange={(e) => {
                        const formatted = formatCurrency(e.target.value);
                        field.onChange(formatted);
                      }}
                    />
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
                      placeholder="Descrição opcional do papel..."
                      className="resize-none"
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Ativo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Papéis inativos não aparecem em orçamentos
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
