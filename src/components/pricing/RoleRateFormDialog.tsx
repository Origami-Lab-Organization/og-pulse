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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
  isMultiple: z.boolean(),
  // Simple mode
  seniority: z.string().optional(),
  hourlyRate: z.string().optional(),
  // Multiple mode
  juniorEnabled: z.boolean(),
  juniorRate: z.string().optional(),
  plenoEnabled: z.boolean(),
  plenoRate: z.string().optional(),
  seniorEnabled: z.boolean(),
  seniorRate: z.string().optional(),
  // Common
  description: z.string().optional(),
  isActive: z.boolean(),
}).refine((data) => {
  if (!data.isMultiple) {
    return !!data.seniority && !!data.hourlyRate;
  }
  const hasAtLeastOne = data.juniorEnabled || data.plenoEnabled || data.seniorEnabled;
  const juniorValid = !data.juniorEnabled || !!data.juniorRate;
  const plenoValid = !data.plenoEnabled || !!data.plenoRate;
  const seniorValid = !data.seniorEnabled || !!data.seniorRate;
  return hasAtLeastOne && juniorValid && plenoValid && seniorValid;
}, {
  message: 'Selecione pelo menos uma senioridade e preencha o valor hora',
  path: ['juniorEnabled'],
});

type RoleRateFormValues = z.infer<typeof roleRateSchema>;

interface RoleRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleRate?: RoleRateDB | null;
  onSubmit: (data: CreateRoleRateInput) => void;
  onSubmitMultiple?: (data: CreateRoleRateInput[]) => void;
  isSubmitting?: boolean;
}

export function RoleRateFormDialog({
  open,
  onOpenChange,
  roleRate,
  onSubmit,
  onSubmitMultiple,
  isSubmitting,
}: RoleRateFormDialogProps) {
  const isEditing = !!roleRate;
  const [isMultipleMode, setIsMultipleMode] = useState(false);

  const form = useForm<RoleRateFormValues>({
    resolver: zodResolver(roleRateSchema),
    defaultValues: {
      roleName: '',
      isMultiple: false,
      seniority: '',
      hourlyRate: '',
      juniorEnabled: false,
      juniorRate: '',
      plenoEnabled: false,
      plenoRate: '',
      seniorEnabled: false,
      seniorRate: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (roleRate) {
        form.reset({
          roleName: roleRate.role_name,
          isMultiple: false,
          seniority: roleRate.seniority,
          hourlyRate: formatCurrency(roleRate.hourly_rate),
          juniorEnabled: false,
          juniorRate: '',
          plenoEnabled: false,
          plenoRate: '',
          seniorEnabled: false,
          seniorRate: '',
          description: roleRate.description || '',
          isActive: roleRate.is_active,
        });
        setIsMultipleMode(false);
      } else {
        form.reset({
          roleName: '',
          isMultiple: false,
          seniority: '',
          hourlyRate: '',
          juniorEnabled: false,
          juniorRate: '',
          plenoEnabled: false,
          plenoRate: '',
          seniorEnabled: false,
          seniorRate: '',
          description: '',
          isActive: true,
        });
        setIsMultipleMode(false);
      }
    }
  }, [open, roleRate, form]);

  const handleMultipleModeChange = (checked: boolean) => {
    setIsMultipleMode(checked);
    form.setValue('isMultiple', checked);
    if (checked) {
      form.setValue('seniority', '');
      form.setValue('hourlyRate', '');
    } else {
      form.setValue('juniorEnabled', false);
      form.setValue('juniorRate', '');
      form.setValue('plenoEnabled', false);
      form.setValue('plenoRate', '');
      form.setValue('seniorEnabled', false);
      form.setValue('seniorRate', '');
    }
  };

  const handleSubmit = (values: RoleRateFormValues) => {
    if (values.isMultiple && onSubmitMultiple) {
      const inputs: CreateRoleRateInput[] = [];
      
      if (values.juniorEnabled && values.juniorRate) {
        inputs.push({
          roleName: values.roleName,
          seniority: 'junior',
          hourlyRate: parseCurrency(values.juniorRate),
          description: values.description || undefined,
          isActive: values.isActive,
        });
      }
      
      if (values.plenoEnabled && values.plenoRate) {
        inputs.push({
          roleName: values.roleName,
          seniority: 'pleno',
          hourlyRate: parseCurrency(values.plenoRate),
          description: values.description || undefined,
          isActive: values.isActive,
        });
      }
      
      if (values.seniorEnabled && values.seniorRate) {
        inputs.push({
          roleName: values.roleName,
          seniority: 'senior',
          hourlyRate: parseCurrency(values.seniorRate),
          description: values.description || undefined,
          isActive: values.isActive,
        });
      }
      
      onSubmitMultiple(inputs);
    } else {
      onSubmit({
        roleName: values.roleName,
        seniority: values.seniority!,
        hourlyRate: parseCurrency(values.hourlyRate!),
        description: values.description || undefined,
        isActive: values.isActive,
      });
    }
  };

  const watchJuniorEnabled = form.watch('juniorEnabled');
  const watchPlenoEnabled = form.watch('plenoEnabled');
  const watchSeniorEnabled = form.watch('seniorEnabled');

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

            {/* Toggle for multiple seniorities - only show when creating */}
            {!isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Criar múltiplas senioridades</p>
                  <p className="text-sm text-muted-foreground">
                    Cadastre o mesmo papel com diferentes níveis e valores
                  </p>
                </div>
                <Switch
                  checked={isMultipleMode}
                  onCheckedChange={handleMultipleModeChange}
                />
              </div>
            )}

            {/* Simple mode - single seniority */}
            {!isMultipleMode && (
              <>
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
              </>
            )}

            {/* Multiple mode - checkboxes with rates */}
            {isMultipleMode && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Selecione as senioridades e informe os valores
                </p>
                
                {/* Junior */}
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="juniorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="w-16 font-normal">Júnior</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="juniorRate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            disabled={!watchJuniorEnabled}
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Pleno */}
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="plenoEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="w-16 font-normal">Pleno</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plenoRate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            disabled={!watchPlenoEnabled}
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Senior */}
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="seniorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="w-16 font-normal">Sênior</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seniorRate"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="R$ 0,00"
                            disabled={!watchSeniorEnabled}
                            {...field}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="juniorEnabled"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
