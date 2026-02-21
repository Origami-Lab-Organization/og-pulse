import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, FileText, DollarSign, ExternalLink } from 'lucide-react';
import { LeadWithBudget } from '@/types/lead';
import { ArchiveLeadDialog } from './ArchiveLeadDialog';
import { useUpdateLead } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
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

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithBudget | null;
}

export function LeadDetailDialog({ open, onOpenChange, lead }: LeadDetailDialogProps) {
  const navigate = useNavigate();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const updateLead = useUpdateLead();
  const { data: clients = [] } = useClients();
  const formRef = useRef<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      client_type: 'new',
      client_id: '',
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      source: '',
      notes: '',
    },
  });

  // Reset form when lead changes or dialog opens
  useEffect(() => {
    if (open && lead) {
      form.reset({
        name: lead.name || '',
        client_type: lead.client_id ? 'existing' : 'new',
        client_id: lead.client_id || '',
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        contact_email: lead.contact_email || '',
        contact_phone: lead.contact_phone || '',
        source: lead.source || '',
        notes: lead.notes || '',
      });
    }
  }, [open, lead]);

  const clientType = form.watch('client_type');

  const handleClientSelect = (clientId: string) => {
    form.setValue('client_id', clientId, { shouldDirty: true });
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      form.setValue('company_name', client.tradingName || client.companyName, { shouldDirty: true });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && lead && form.formState.isDirty) {
      const values = form.getValues();
      const payload: any = {
        id: lead.id,
        name: values.name,
        company_name: values.company_name || null,
        client_id: values.client_type === 'existing' ? values.client_id : null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        source: values.source || null,
        notes: values.notes || null,
      };
      updateLead.mutate(payload);
    }
    onOpenChange(newOpen);
  };

  const handleViewBudget = () => {
    if (lead?.budget_id) {
      onOpenChange(false);
      navigate(`/budgets/${lead.budget_id}`);
    }
  };

  if (!lead) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg [&>button:last-child]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between pr-2">
              <DialogTitle className="text-lg">Editar Lead</DialogTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                    <Archive className="h-4 w-4 mr-2" />
                    Arquivar Lead
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DialogDescription>Edite os campos e clique fora para salvar automaticamente.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <div className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Oportunidade *</FormLabel>
                  <FormControl><Input placeholder="Ex: Projeto Website ABC" {...field} /></FormControl>
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
                          form.setValue('client_id', '', { shouldDirty: true });
                        } else {
                          form.setValue('company_name', '', { shouldDirty: true });
                        }
                      }}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="existing" id="detail-existing" />
                        <Label htmlFor="detail-existing">Cliente existente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="detail-new" />
                        <Label htmlFor="detail-new">Nova empresa</Label>
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
                    <FormControl><Input placeholder="email@..." {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
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

              {/* Budget financial section */}
              {lead.budget && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="font-mono cursor-pointer hover:bg-accent"
                        onClick={handleViewBudget}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        {lead.budget.budget_number}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{lead.budget.title}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Custo Total</p>
                        <p className="font-medium">{formatCurrency(lead.budget.subtotal)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Preço de Venda</p>
                        <p className="font-medium">{formatCurrency(lead.budget.total_with_fees)}</p>
                      </div>
                    </div>

                    {lead.budget.discount_value > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Desconto</p>
                        <p className="font-medium text-destructive">- {formatCurrency(lead.budget.discount_value)}</p>
                      </div>
                    )}

                    <div className="rounded-md bg-primary/10 p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Valor Final</p>
                        <p className="text-lg font-bold text-primary flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(lead.budget.final_total)}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        {lead.budget.duration_months} {lead.budget.duration_months === 1 ? 'mês' : 'meses'}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={handleViewBudget}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Orçamento
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Form>
        </DialogContent>
      </Dialog>

      <ArchiveLeadDialog
        open={archiveOpen}
        onOpenChange={(v) => {
          setArchiveOpen(v);
          if (!v) onOpenChange(false);
        }}
        lead={lead}
      />
    </>
  );
}
