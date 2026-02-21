import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { LeadDB } from '@/types/lead';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  estimated_value: z.number().min(0).default(0),
  source: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadDB | null;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const isEditing = !!lead;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: lead?.name || '',
      company_name: lead?.company_name || '',
      contact_name: lead?.contact_name || '',
      contact_email: lead?.contact_email || '',
      contact_phone: lead?.contact_phone || '',
      estimated_value: lead?.estimated_value || 0,
      source: lead?.source || '',
      notes: lead?.notes || '',
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    if (isEditing && lead) {
      updateMutation.mutate(
        { id: lead.id, ...values },
        { onSuccess: () => { onOpenChange(false); form.reset(); } }
      );
    } else {
      createMutation.mutate({ ...values, name: values.name }, {
        onSuccess: () => { onOpenChange(false); form.reset(); },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do lead.' : 'Preencha os dados do novo lead.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Oportunidade *</FormLabel>
                <FormControl><Input placeholder="Ex: Projeto Website ABC" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="company_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato</FormLabel>
                  <FormControl><Input placeholder="Nome" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="email@..." {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="estimated_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Estimado</FormLabel>
                  <FormControl>
                    <CurrencyInput value={field.value} onValueChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <FormControl><Input placeholder="Indicação, site..." {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea placeholder="Notas sobre o lead..." {...field} /></FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar Lead'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
