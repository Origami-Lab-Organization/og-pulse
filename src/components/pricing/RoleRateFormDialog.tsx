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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleRateDB, CreateRoleRateInput, SENIORITY_OPTIONS } from '@/types/roleRate';
import { formatCurrency, parseCurrency } from '@/lib/masks';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface SeniorityLine {
  id: string;
  seniority: string;
  hourlyRate: string;
}

const roleRateSchema = z.object({
  roleName: z.string().min(2, 'Nome do papel deve ter no mínimo 2 caracteres'),
  description: z.string().optional(),
  isActive: z.boolean(),
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
  
  const [lines, setLines] = useState<SeniorityLine[]>([
    { id: crypto.randomUUID(), seniority: '', hourlyRate: '' }
  ]);

  const form = useForm<RoleRateFormValues>({
    resolver: zodResolver(roleRateSchema),
    defaultValues: {
      roleName: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (roleRate) {
        form.reset({
          roleName: roleRate.role_name,
          description: roleRate.description || '',
          isActive: roleRate.is_active,
        });
        setLines([{
          id: crypto.randomUUID(),
          seniority: roleRate.seniority,
          hourlyRate: formatCurrency(roleRate.hourly_rate),
        }]);
      } else {
        form.reset({
          roleName: '',
          description: '',
          isActive: true,
        });
        setLines([{ id: crypto.randomUUID(), seniority: '', hourlyRate: '' }]);
      }
    }
  }, [open, roleRate, form]);

  const addLine = () => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), seniority: '', hourlyRate: '' }]);
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: 'seniority' | 'hourlyRate', value: string) => {
    setLines(prev => prev.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const getAvailableSeniorities = (currentLineId: string) => {
    const selectedSeniorities = lines
      .filter(line => line.id !== currentLineId && line.seniority)
      .map(line => line.seniority);
    
    return SENIORITY_OPTIONS.filter(opt => !selectedSeniorities.includes(opt.value));
  };

  const validateLines = (): boolean => {
    const hasEmptyLines = lines.some(line => !line.seniority || !line.hourlyRate);
    return !hasEmptyLines && lines.length > 0;
  };

  const handleSubmit = (values: RoleRateFormValues) => {
    if (!validateLines()) {
      return;
    }

    if (lines.length === 1) {
      onSubmit({
        roleName: values.roleName,
        seniority: lines[0].seniority,
        hourlyRate: parseCurrency(lines[0].hourlyRate),
        description: values.description || undefined,
        isActive: values.isActive,
      });
    } else if (onSubmitMultiple) {
      const inputs: CreateRoleRateInput[] = lines.map(line => ({
        roleName: values.roleName,
        seniority: line.seniority,
        hourlyRate: parseCurrency(line.hourlyRate),
        description: values.description || undefined,
        isActive: values.isActive,
      }));
      onSubmitMultiple(inputs);
    }
  };

  const canAddMore = !isEditing && lines.length < SENIORITY_OPTIONS.length;
  const hasLineErrors = lines.some(line => !line.seniority || !line.hourlyRate);

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

            <div className="space-y-3">
              <FormLabel>Senioridades e Valores *</FormLabel>
              
              <div className="space-y-2">
                {lines.map((line) => {
                  const availableSeniorities = getAvailableSeniorities(line.id);
                  const currentSeniority = SENIORITY_OPTIONS.find(opt => opt.value === line.seniority);
                  
                  return (
                    <div key={line.id} className="flex items-center gap-2">
                      <Select
                        value={line.seniority}
                        onValueChange={(value) => updateLine(line.id, 'seniority', value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Senioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentSeniority && (
                            <SelectItem key={currentSeniority.value} value={currentSeniority.value}>
                              {currentSeniority.label}
                            </SelectItem>
                          )}
                          {availableSeniorities
                            .filter(opt => opt.value !== line.seniority)
                            .map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="R$ 0,00"
                        value={line.hourlyRate}
                        onChange={(e) => {
                          const formatted = formatCurrency(e.target.value);
                          updateLine(line.id, 'hourlyRate', formatted);
                        }}
                        className="flex-1"
                      />
                      
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(line.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {canAddMore && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar senioridade
                </Button>
              )}

              {hasLineErrors && (
                <p className="text-sm text-destructive">
                  Preencha a senioridade e o valor de todas as linhas
                </p>
              )}
            </div>

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
              <Button type="submit" disabled={isSubmitting || hasLineErrors}>
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
