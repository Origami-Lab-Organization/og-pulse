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
import { Loader2, Gift, Wrench } from 'lucide-react';
import { Benefit, CreateBenefitInput } from '@/types/benefit';
import { Tool, CreateToolInput } from '@/types/tool';
import { formatCurrency } from '@/lib/masks';
import { cn } from '@/lib/utils';

export type ItemType = 'benefit' | 'tool';

const TYPE_LABELS: Record<ItemType, string> = {
  benefit: 'Benefício',
  tool: 'Ferramenta',
};

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  value: z.number({ invalid_type_error: 'Informe um valor válido' }).min(0, 'O valor não pode ser negativo'),
});

type FormValues = z.infer<typeof formSchema>;

interface BenefitToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Benefit | Tool | null;
  /** Pré-define o tipo quando editando — não pode trocar ao editar */
  defaultType?: ItemType;
  onSubmit: (type: ItemType, data: CreateBenefitInput | CreateToolInput) => void;
  isLoading?: boolean;
}

export function BenefitToolFormDialog({
  open,
  onOpenChange,
  item,
  defaultType = 'benefit',
  onSubmit,
  isLoading,
}: BenefitToolFormDialogProps) {
  const isEditing = !!item;
  const [selectedType, setSelectedType] = useState<ItemType>(defaultType);
  const [valueDisplay, setValueDisplay] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', value: 0 },
  });

  useEffect(() => {
    if (open) {
      if (item) {
        setSelectedType(defaultType);
        form.reset({ name: item.name, description: item.description ?? '', value: item.value });
        setValueDisplay(item.value > 0 ? formatCurrency(item.value) : '');
      } else {
        setSelectedType(defaultType);
        form.reset({ name: '', description: '', value: 0 });
        setValueDisplay('');
      }
    }
  }, [open, item, defaultType]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(selectedType, {
      name: values.name,
      description: values.description || undefined,
      value: values.value,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar ${TYPE_LABELS[selectedType]}` : 'Adicionar item'}
          </DialogTitle>
        </DialogHeader>

        {/* Type selector — só exibe ao criar */}
        {!isEditing && (
          <div className="flex rounded-lg border overflow-hidden">
            {(['benefit', 'tool'] as ItemType[]).map((type) => {
              const Icon = type === 'benefit' ? Gift : Wrench;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                    selectedType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={selectedType === 'benefit' ? 'Ex: Vale Refeição' : 'Ex: GitHub Copilot'}
                      {...field}
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
                    <Textarea placeholder="Descrição (opcional)" rows={2} {...field} />
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
                {isEditing ? 'Salvar' : `Criar ${TYPE_LABELS[selectedType]}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
