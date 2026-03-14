import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreVertical, Archive, DollarSign, ExternalLink, Trash2, Loader2, ArrowRight, Pencil, History } from 'lucide-react';
import { LeadWithBudget, CRM_LEAD_COLUMNS, CRMStage } from '@/types/lead';
import { ArchiveLeadDialog } from './ArchiveLeadDialog';
import { DeleteLeadDialog } from './DeleteLeadDialog';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { useUpdateLead, useUpdateLeadStage } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { PROJECT_TYPE_LABELS } from '@/types/service';
import { ProjectType } from '@/types/project';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { formatPhone } from '@/lib/masks';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  service_line: z.string().optional(),
  responsible_id: z.string().optional(),
  client_type: z.enum(['existing', 'new']),
  client_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  estimated_value: z.coerce.number().min(0).optional(),
}).refine(
  (data) => data.client_type !== 'existing' || (data.client_id && data.client_id.length > 0),
  { message: 'Selecione um cliente', path: ['client_id'] }
);

type FormValues = z.infer<typeof schema>;

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadWithBudget | null;
  onAdvanceToClose?: () => void;
}

const STAGE_ORDER: CRMStage[] = ['screening', 'qualification', 'proposal', 'negotiation', 'closed'];

function canAdvanceFrom(stage: CRMStage, lead: LeadWithBudget): { allowed: boolean; reason?: string } {
  if (stage === 'screening') {
    if (!lead.service_line) return { allowed: false, reason: 'Defina o Tipo de Serviço primeiro' };
  }
  if (stage === 'proposal') {
    if (!lead.budget_id) return { allowed: false, reason: 'Atribua um orçamento antes de avançar para negociação' };
  }
  if (stage === 'closed') {
    return { allowed: false, reason: undefined };
  }
  return { allowed: true };
}


export function LeadDetailDialog({ open, onOpenChange, lead, onAdvanceToClose }: LeadDetailDialogProps) {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = employee?.isAdmin;
  const updateLead = useUpdateLead();
  const updateStage = useUpdateLeadStage();
  const { data: clients = [] } = useClients();
  const { data: employees = [] } = useEmployees();
  const { data: services = [] } = useServices();
  const PROJECT_TYPES: ProjectType[] = ['fixed_scope', 'continuous', 'success_fee', 'non_revenue'];
  const servicesByType = PROJECT_TYPES.reduce((acc, type) => {
    acc[type] = services.filter((s) => s.projectType === type);
    return acc;
  }, {} as Record<ProjectType, typeof services>);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      service_line: '',
      responsible_id: '',
      client_type: 'new',
      client_id: '',
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      source: '',
      notes: '',
      estimated_value: undefined,
    },
  });

  useEffect(() => {
    if (open && lead) {
      form.reset({
        name: lead.name || '',
        service_line: lead.service_line || '',
        responsible_id: lead.responsible_id || '',
        client_type: lead.client_id ? 'existing' : 'new',
        client_id: lead.client_id || '',
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        contact_email: lead.contact_email || '',
        contact_phone: lead.contact_phone || '',
        source: lead.source || '',
        notes: lead.notes || '',
        estimated_value: lead.estimated_value || undefined,
      });
      setCompanySearch(lead.company_name || '');
      setIsEditing(false);
    }
  }, [open, lead]);

  const serviceLine = form.watch('service_line');
  const selectedService = services.find((s) => s.id === serviceLine);

  const filteredClients = companySearch.trim().length > 0
    ? clients.filter((c) => {
        const name = (c.tradingName || c.companyName || '').toLowerCase();
        return name.includes(companySearch.toLowerCase());
      }).slice(0, 5)
    : [];

  const handleCompanyInputChange = (value: string) => {
    setCompanySearch(value);
    form.setValue('company_name', value, { shouldDirty: true });
    form.setValue('client_type', 'new', { shouldDirty: true });
    form.setValue('client_id', '', { shouldDirty: true });
    setCompanyDropdownOpen(value.trim().length > 0);
  };

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      const name = client.tradingName || client.companyName;
      setCompanySearch(name);
      form.setValue('company_name', name, { shouldDirty: true });
      form.setValue('client_id', clientId, { shouldDirty: true });
      form.setValue('client_type', 'existing', { shouldDirty: true });
    }
    setCompanyDropdownOpen(false);
  };

  const handleSave = () => {
    if (!lead) return;
    const values = form.getValues();
    const payload: any = {
      id: lead.id,
      name: values.name,
      service_line: values.service_line || null,
      responsible_id: values.responsible_id || null,
      company_name: values.company_name || null,
      client_id: values.client_type === 'existing' ? values.client_id : null,
      contact_name: values.contact_name || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      source: values.source || null,
      notes: values.notes || null,
      estimated_value: values.estimated_value ?? lead.estimated_value,
    };
    updateLead.mutate(payload, { onSuccess: () => setIsEditing(false) });
  };

  const handleDiscard = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleViewBudget = () => {
    if (lead?.budget_id) {
      onOpenChange(false);
      navigate(`/budgets/${lead.budget_id}`);
    }
  };

  if (!lead) return null;

  const isArchived = lead.archived;
  const isDisabled = isArchived || !isEditing;
  const currentStageIndex = STAGE_ORDER.indexOf(lead.crm_stage);
  const nextStage = currentStageIndex < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentStageIndex + 1] : null;
  const nextStageLabel = nextStage ? CRM_LEAD_COLUMNS.find((c) => c.id === nextStage)?.label : null;

  const advanceGate = !isArchived && nextStage
    ? canAdvanceFrom(lead.crm_stage, lead)
    : null;

  const handleAdvanceStage = () => {
    if (!nextStage || !advanceGate?.allowed) return;
    if (nextStage === 'closed') {
      onAdvanceToClose?.();
      return;
    }
    updateStage.mutate({ id: lead.id, stage: nextStage, fromStage: lead.crm_stage }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl [&>button:last-child]:hidden"
          onInteractOutside={(e) => {
            if (isEditing && form.formState.isDirty) {
              e.preventDefault();
              setConfirmCloseOpen(true);
            }
          }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between pr-2">
              <div className="flex items-center gap-2 min-w-0">
                <DialogTitle className="text-lg line-clamp-1">{lead.name}</DialogTitle>
                {isArchived && (
                  <Badge variant="secondary" className="shrink-0 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    Arquivado
                  </Badge>
                )}
              </div>

              {advanceGate && (
                <button
                  type="button"
                  onClick={handleAdvanceStage}
                  disabled={!advanceGate.allowed || updateStage.isPending}
                  title={!advanceGate.allowed ? advanceGate.reason : undefined}
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium shrink-0 mx-2 outline-none focus-visible:outline-none',
                    advanceGate.allowed
                      ? 'text-primary hover:underline cursor-pointer'
                      : 'text-muted-foreground opacity-50 cursor-not-allowed'
                  )}
                >
                  {nextStageLabel}
                  {updateStage.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <ArrowRight className="h-3 w-3" />
                  }
                </button>
              )}

              {!isArchived ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    {!isEditing && (
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar Lead
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Lead
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : isAdmin ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            {isArchived && (
              <p className="text-xs text-muted-foreground">
                Arquivado em {lead.archived_at ? new Date(lead.archived_at).toLocaleDateString('pt-BR') : '-'}
                {lead.archive_reason ? ` — ${lead.archive_reason}` : ''}
              </p>
            )}
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <LeadActivityTimeline leadId={lead.id} />
            </TabsContent>

            <TabsContent value="details">
          <Form {...form}>
            <div className="space-y-4">

              {/* ── Oportunidade ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oportunidade</p>

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Oportunidade *</FormLabel>
                    <FormControl><Input placeholder="Ex: Projeto Website ABC" {...field} disabled={isDisabled} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="service_line" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Serviço</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isDisabled}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROJECT_TYPES.map((type) =>
                            servicesByType[type].length > 0 && (
                              <SelectGroup key={type}>
                                <SelectLabel>{PROJECT_TYPE_LABELS[type]}</SelectLabel>
                                {servicesByType[type].map((svc) => (
                                  <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                                ))}
                              </SelectGroup>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="responsible_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsável</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isDisabled}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.filter(e => e.status === 'ativo').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                {!lead.budget_id && selectedService?.unitPrice != null && (
                  <FormField control={form.control} name="estimated_value" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Estimado</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          disabled={isDisabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Notas sobre o lead..." {...field} disabled={isDisabled} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* ── Empresa + Contato ── */}
              <div className="grid grid-cols-2 gap-6">
                {/* Empresa */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</p>

                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <div className="relative">
                      <Input
                        ref={companyInputRef}
                        placeholder="Digite ou selecione uma empresa"
                        value={companySearch}
                        onChange={(e) => handleCompanyInputChange(e.target.value)}
                        onFocus={() => companySearch.trim().length > 0 && setCompanyDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setCompanyDropdownOpen(false), 150)}
                        disabled={isDisabled}
                      />
                      {companyDropdownOpen && filteredClients.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                              onMouseDown={() => handleClientSelect(client.id)}
                            >
                              {client.tradingName || client.companyName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormItem>
                </div>

                {/* Contato */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato</p>

                  <FormField control={form.control} name="contact_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do contato</FormLabel>
                      <FormControl><Input placeholder="Nome" {...field} disabled={isDisabled} /></FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="contact_email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input placeholder="email@..." {...field} disabled={isDisabled} /></FormControl>
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
                            disabled={isDisabled}
                          />
                        </FormControl>
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange} disabled={isDisabled}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a origem" />
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
                </div>
              </div>

              {/* ── Orçamento ── */}
              {lead.budget && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Orçamento</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Custo Total</p>
                        <p className="font-medium">{formatCurrency(lead.budget.subtotal)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Preço de Venda</p>
                        <p className="font-medium">{formatCurrency(lead.budget.total_with_fees)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Margem</p>
                        <p className="font-medium">
                          {lead.budget.total_with_fees > 0
                            ? `${(((lead.budget.total_with_fees - lead.budget.subtotal) / lead.budget.total_with_fees) * 100).toFixed(1)}%`
                            : '0%'}
                        </p>
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
            </TabsContent>
          </Tabs>

          {isEditing && !isArchived && (
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { form.reset(); setIsEditing(false); }}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave} disabled={updateLead.isPending}>
                {updateLead.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja fechar sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArchiveLeadDialog
        open={archiveOpen}
        onOpenChange={(v) => {
          setArchiveOpen(v);
          if (!v) onOpenChange(false);
        }}
        lead={lead}
      />

      <DeleteLeadDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        leadId={lead.id}
        leadName={lead.name}
        onDeleted={() => onOpenChange(false)}
      />
    </>
  );
}
