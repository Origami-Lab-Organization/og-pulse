import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { LeadDB, SERVICE_LINE_OPTIONS } from '@/types/lead';
import { formatPhone } from '@/lib/masks';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  service_line: z.string().min(1, 'Linha de serviço é obrigatória'),
  client_type: z.enum(['existing', 'new']),
  client_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.client_type !== 'existing' || (data.client_id && data.client_id.length > 0),
  { message: 'Selecione um cliente', path: ['client_id'] }
);

type FormValues = z.infer<typeof schema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadDB | null;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const { data: clients = [] } = useClients();
  const isEditing = !!lead;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: lead?.name || '',
      service_line: lead?.service_line || '',
      client_type: lead?.client_id ? 'existing' : 'new',
      client_id: lead?.client_id || '',
      company_name: lead?.company_name || '',
      contact_name: lead?.contact_name || '',
      contact_email: lead?.contact_email || '',
      contact_phone: lead?.contact_phone || '',
      source: lead?.source || '',
      notes: lead?.notes || '',
    },
  });

  const clientType = form.watch('client_type');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleClientSelect = (clientId: string) => {
    form.setValue('client_id', clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      form.setValue('company_name', client.tradingName || client.companyName);
    }
  };

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      name: values.name,
      service_line: values.service_line,
      company_name: values.company_name || null,
      client_id: values.client_type === 'existing' ? values.client_id : null,
      contact_name: values.contact_name || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      source: values.source || null,
      notes: values.notes || null,
    };

    if (isEditing && lead) {
      updateMutation.mutate(
        { id: lead.id, ...payload },
        { onSuccess: () => { onOpenChange(false); form.reset(); } }
      );
    } else {
      createMutation.mutate(payload, {
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

            <FormField control={form.control} name="service_line" render={({ field }) => (
              <FormItem>
                <FormLabel>Linha de Serviço *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a linha de serviço" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SERVICE_LINE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="client_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Empresa</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (val === 'new') {
                        form.setValue('client_id', '');
                      } else {
                        form.setValue('company_name', '');
                      }
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing" />
                      <Label htmlFor="existing">Cliente existente</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new">Nova empresa</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )} />

            {clientType === 'existing' ? (
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select value={field.value} onValueChange={handleClientSelect}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.tradingName || client.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            ) : (
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato</FormLabel>
                  <FormControl><Input placeholder="Nome" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={field.value}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="site">Site</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                      <SelectItem value="cold_call">Cold Call</SelectItem>
                      <SelectItem value="parceiro">Parceiro</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
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
