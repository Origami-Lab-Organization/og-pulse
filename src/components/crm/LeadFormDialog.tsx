import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { LeadDB } from '@/types/lead';
import { formatPhone } from '@/lib/masks';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  company_name: z.string().min(1, 'Nome da empresa é obrigatório'),
  client_id: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  source: z.string().optional(),
  responsible_id: z.string().min(1, 'Responsável é obrigatório'),
  name: z.string().min(1, 'Nome da oportunidade é obrigatório'),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (!data.contact_email && !data.contact_phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe ao menos email ou telefone', path: ['contact_email'] });
  }
});

type FormValues = z.infer<typeof schema>;

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: LeadDB | null;
}

export function LeadFormDialog({ open, onOpenChange, lead }: LeadFormDialogProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const { data: clients = [] } = useClients();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const isEditing = !!lead;

  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company_name: '',
      client_id: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      source: '',
      responsible_id: '',
      name: '',
      notes: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditing && lead) {
        const linkedClient = lead.client_id ? clients.find((c) => c.id === lead.client_id) : null;
        form.reset({
          company_name: linkedClient
            ? (linkedClient.tradingName || linkedClient.companyName)
            : (lead.company_name || ''),
          client_id: lead.client_id || '',
          contact_name: lead.contact_name || '',
          contact_email: lead.contact_email || '',
          contact_phone: lead.contact_phone || '',
          source: lead.source || '',
          responsible_id: lead.responsible_id || employee?.id || '',
          name: lead.name || '',
          notes: lead.notes || '',
        });
      } else {
        form.reset({
          company_name: '',
          client_id: '',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
          source: '',
          responsible_id: employee?.id || '',
          name: '',
          notes: '',
        });
      }
    }
  }, [open]);

  const contactEmail = form.watch('contact_email');
  const contactPhone = form.watch('contact_phone');
  const bothContactEmpty = !contactEmail && !contactPhone;
  const clientId = form.watch('client_id');
  const companyName = form.watch('company_name') || '';

  const filteredClients = companyName.trim()
    ? clients.filter((c) =>
        (c.tradingName || c.companyName).toLowerCase().includes(companyName.toLowerCase())
      )
    : clients.slice(0, 8);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { data: previousStakeholders = [] } = useQuery({
    queryKey: ['client-stakeholders', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stakeholders')
        .select('name, email, phone, job_title, project_id, created_at')
        .in(
          'project_id',
          (await supabase.from('projects').select('id').eq('client_id', clientId!)).data?.map((p) => p.id) || []
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter((s) => {
        if (seen.has(s.name)) return false;
        seen.add(s.name);
        return true;
      });
    },
    enabled: !!clientId,
  });

  const handleStakeholderSelect = (value: string) => {
    if (value === '__new__') {
      form.setValue('contact_name', '');
      form.setValue('contact_email', '');
      form.setValue('contact_phone', '');
      return;
    }
    const stakeholder = previousStakeholders.find((s) => s.name === value);
    if (stakeholder) {
      form.setValue('contact_name', stakeholder.name || '');
      form.setValue('contact_email', stakeholder.email || '');
      form.setValue('contact_phone', stakeholder.phone || '');
    }
  };

  const handleClose = () => onOpenChange(false);

  const onSubmit = async (values: FormValues) => {
    // Block if name matches an existing client but no client_id is linked
    if (!values.client_id && values.company_name) {
      const duplicate = clients.find(
        (c) => (c.tradingName || c.companyName).toLowerCase() === values.company_name!.toLowerCase()
      );
      if (duplicate) {
        form.setError('company_name', {
          message: 'Esta empresa já está cadastrada como cliente. Selecione-a no dropdown.',
        });
        return;
      }
    }

    const payload = {
      name: values.name,
      service_line: null,
      responsible_id: values.responsible_id || null,
      company_name: values.company_name || null,
      client_id: values.client_id || null,
      contact_name: values.contact_name || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      source: values.source || null,
      notes: values.notes || null,
      estimated_value: 0,
    };

    try {
      if (isEditing && lead) {
        await updateMutation.mutateAsync({ id: lead.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
    } catch {
      return; // errors already shown by mutation's onError
    }

    handleClose();
    if (!isEditing) {
      toast({
        title: 'Lead criado',
        description: 'O lead foi criado e está na coluna Triagem do kanban.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do lead.' : 'Preencha os dados do novo lead.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="lead-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto px-1 py-0.5 space-y-4"
          >
            {/* ── Oportunidade ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oportunidade</p>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Oportunidade *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Consultoria estratégica — Empresa ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="responsible_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        {loadingEmployees
                          ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</span>
                          : <SelectValue placeholder="Selecione o responsável" />
                        }
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees
                        .filter((e) => e.status === 'ativo')
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nome} — {emp.cargo}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

            </div>

            <Separator />

            {/* ── Empresa ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Empresa <span className="text-destructive normal-case">*</span>
              </p>
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="Digite ou selecione uma empresa..."
                        autoComplete="off"
                        value={field.value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val);
                          const exact = clients.find(
                            (c) => (c.tradingName || c.companyName).toLowerCase() === val.toLowerCase()
                          );
                          if (exact) {
                            form.setValue('client_id', exact.id);
                            form.clearErrors('company_name');
                          } else if (clientId) {
                            form.setValue('client_id', '');
                          }
                          setCompanyDropdownOpen(true);
                        }}
                        onBlur={() => setTimeout(() => setCompanyDropdownOpen(false), 150)}
                      />
                      {companyDropdownOpen && filteredClients.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                              onMouseDown={() => {
                                const name = client.tradingName || client.companyName;
                                field.onChange(name);
                                form.setValue('client_id', client.id);
                                setCompanyDropdownOpen(false);
                              }}
                            >
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {client.tradingName || client.companyName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {clientId && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Cliente existente vinculado
                      <button
                        type="button"
                        className="ml-1 underline hover:no-underline"
                        onClick={() => form.setValue('client_id', '')}
                      >
                        desvincular
                      </button>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator />

            {/* ── Contato ── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>

              {!!clientId && previousStakeholders.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1.5">Contatos anteriores</p>
                  <Select onValueChange={handleStakeholderSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar contato do histórico..." />
                    </SelectTrigger>
                    <SelectContent>
                      {previousStakeholders.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name}{s.job_title ? ` — ${s.job_title}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ Novo contato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do contato</FormLabel>
                  <FormControl><Input placeholder="Ex: João Silva" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@empresa.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className={cn('text-xs', form.formState.isSubmitted && bothContactEmpty ? 'text-destructive' : 'text-muted-foreground')}>
                Ao menos email ou telefone é obrigatório.
              </p>

              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem>
                  <FormLabel>Origem do lead</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Como esse lead chegou?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="evento">Evento</SelectItem>
                      <SelectItem value="parceiro">Parceiro</SelectItem>
                      <SelectItem value="abordagem_direta">Abordagem Direta</SelectItem>
                      <SelectItem value="expansao">Expansão</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Contexto da conversa, próximos passos, pontos de atenção..." rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          </form>
        </Form>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form="lead-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
