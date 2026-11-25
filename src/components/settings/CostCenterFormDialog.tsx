import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CostCenterFormDialogProps } from '@/types/costCenter';
import { duplicateCostCenterMessage, findDuplicateCostCenter } from '@/lib/costCenter';

const NAME_MIN = 2;
const NAME_MAX = 80;
const DESCRIPTION_MAX = 200;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(NAME_MIN, `Informe um nome com pelo menos ${NAME_MIN} caracteres.`)
    .max(NAME_MAX, `Use até ${NAME_MAX} caracteres.`),
  description: z.string().trim().max(DESCRIPTION_MAX, `Use até ${DESCRIPTION_MAX} caracteres.`),
});

type FormValues = z.infer<typeof schema>;

/**
 * Formulário de centro de custo (PUL-217). Nome repetido é recusado aqui, apontando o
 * existente e sugerindo reativar quando ele está inativo; o índice único do banco
 * (`cost_centers_tenant_name_key`) é a garantia final.
 */
export function CostCenterFormDialog(props: CostCenterFormDialogProps) {
  const { open, onOpenChange, costCenter, existing, onSubmit, isSubmitting } = props;
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', description: '' } });

  useEffect(() => {
    if (open) form.reset({ name: costCenter?.name ?? '', description: costCenter?.description ?? '' });
  }, [open, costCenter, form]);

  const submit = (values: FormValues) => {
    const duplicate = findDuplicateCostCenter(existing, values.name, costCenter?.id);
    if (duplicate) {
      form.setError('name', { type: 'validate', message: duplicateCostCenterMessage(duplicate) });
      return;
    }
    onSubmit({ name: values.name, description: values.description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{costCenter ? 'Editar centro de custo' : 'Novo centro de custo'}</DialogTitle>
          <DialogDescription>
            Cada serviço, atividade interna e pessoa aponta para um centro; é por ele que custo e receita são lidos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: SL04 Consultoria Estratégica" autoComplete="off" maxLength={NAME_MAX} {...field} />
                  </FormControl>
                  <FormDescription>Use o mesmo nome que a empresa já usa, código incluído.</FormDescription>
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
                    <Textarea placeholder="O que entra neste centro" rows={3} maxLength={DESCRIPTION_MAX} {...field} />
                  </FormControl>
                  <FormDescription>Opcional. Ajuda quem lança hora a escolher o centro certo.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {costCenter ? 'Salvar' : 'Criar centro'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
