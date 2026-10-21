import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreateProjectInput,
  ProjectWithRelations,
  PROJECT_STATUS_LABELS,
  PAYMENT_METHOD_OPTIONS,
  ProjectStatus,
} from '@/types/project';
import { BILLING_TYPE_LABELS } from '@/types/service';
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { useCostCenters } from '@/hooks/useCostCenters';
import { formatCurrency, parseCurrency } from '@/lib/masks';
import { ProjectKindField } from '@/components/projects/ProjectKindField';
import { PROJECT_KIND } from '@/lib/projectKind.constants';
import { projectKindOf, requiresClient } from '@/lib/projectKind';
import type { ProjectKind } from '@/types/projectKind';

/** Centro padrão do produto e do projeto interno (ADR-0035): sugerido, nunca imposto. */
const INTERNAL_COST_CENTER_NAME = 'projeto interno';

function internalCostCenterId(centers: { id: string; name: string; is_active: boolean }[]): string {
  const internal = centers.find(
    (center) => center.is_active && center.name.trim().toLowerCase() === INTERNAL_COST_CENTER_NAME,
  );
  return internal?.id ?? '';
}

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  serviceLine: z.string().optional(),
  description: z.string().optional(),
  kind: z.enum([PROJECT_KIND.CLIENT, PROJECT_KIND.INTERNAL, PROJECT_KIND.PRODUCT]).default(PROJECT_KIND.CLIENT),
  clientId: z.string().optional(),
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
  isContinuous: z.boolean().default(false),
  renewalDate: z.string().optional(),
  status: z.string().default('planning'),
  totalValue: z.coerce.number().min(0, 'Valor deve ser positivo'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1, 'Mínimo de 1 parcela'),
  firstInvoiceDate: z.string().optional(),
  dueDay: z.coerce.number().min(1).max(90).default(10),
  successFeePercent: z.coerce.number().min(0).max(100).optional(),
  costCenterId: z.string().optional(),
}).refine((data) => !requiresClient(data.kind) || Boolean(data.clientId), {
  // Só projeto de cliente exige cliente; o banco garante o mesmo por CHECK (ADR-0049).
  message: 'Cliente é obrigatório',
  path: ['clientId'],
}).refine((data) => data.isContinuous || (data.endDate && data.endDate.length > 0), {
  message: 'Data de fim é obrigatória para projetos com prazo determinado',
  path: ['endDate'],
}).refine((data) => data.kind === PROJECT_KIND.CLIENT || Boolean(data.costCenterId), {
  // Sem centro, o custo do projeto interno não tem onde ser lido (ADR-0035). O banco também
  // recusa, por CHECK; aqui a pessoa descobre antes de salvar.
  message: 'Escolha o centro de custo que recebe o custo deste projeto',
  path: ['costCenterId'],
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type ProjectFormExtras = ProjectWithRelations & {
  service?: { name?: string | null } | null;
  renewal_date?: string | null;
  success_fee_percent?: number | null;
  is_billable?: boolean | null;
  cost_center_id?: string | null;
  is_internal_product?: boolean | null;
};

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithRelations | null;
  onSubmit: (data: CreateProjectInput, justification?: string) => void;
  isSubmitting?: boolean;
  requireJustification?: boolean;
  canChangeManager?: boolean;
  /** Tipo inicial de um projeto novo — "Novo produto" abre já como produto interno. */
  defaultKind?: ProjectKind;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isSubmitting,
  requireJustification = false,
  canChangeManager = true,
  defaultKind = PROJECT_KIND.CLIENT,
}: ProjectFormDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [justification, setJustification] = useState('');
  const { data: clients = [] } = useClients();
  const { data: employees = [] } = useEmployees();
  const { data: services = [] } = useServices();
  const { data: costCenters = [] } = useCostCenters();

  // Filter managers - employees with manager or admin role
  const managers = employees.filter((e) => e.systemRole === 'manager' || e.systemRole === 'admin');

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      serviceLine: '',
      description: '',
      clientId: '',
      managerId: '',
      startDate: '',
      endDate: '',
      isContinuous: false,
      renewalDate: '',
      status: 'planning',
      totalValue: 0,
      paymentMethod: 'mensal',
      installmentsCount: 1,
      firstInvoiceDate: '',
      dueDay: 10,
      successFeePercent: undefined,
      kind: PROJECT_KIND.CLIENT,
      costCenterId: '',
    },
  });

  // Reset form when project changes (for edit mode)
  useEffect(() => {
    if (open) {
      const projectWithExtras = project as ProjectFormExtras | null | undefined;
      // Resolve service_line: prefer UUID that exists in catalog, else match by service name
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let resolvedServiceLine = '';
      if (project?.service_line) {
        if (uuidPattern.test(project.service_line) && services.some(s => s.id === project.service_line)) {
          resolvedServiceLine = project.service_line;
        } else {
          const serviceName = projectWithExtras?.service?.name;
          if (serviceName) {
            resolvedServiceLine = services.find(s => s.name === serviceName)?.id || '';
          }
        }
      }

      form.reset({
        name: project?.name || '',
        serviceLine: resolvedServiceLine,
        description: project?.description || '',
        clientId: project?.client_id || '',
        managerId: project?.manager_id || '',
        startDate: project?.start_date || '',
        endDate: project?.end_date || '',
        isContinuous: project?.is_continuous || false,
        renewalDate: projectWithExtras?.renewal_date || '',
        status: project?.status || 'planning',
        totalValue: Number(project?.total_value) || 0,
        paymentMethod: project?.payment_method || 'mensal',
        installmentsCount: project?.installments_count || 1,
        firstInvoiceDate: project?.first_invoice_date || '',
        dueDay: project?.due_day || 10,
        successFeePercent: projectWithExtras?.success_fee_percent ?? undefined,
        kind: projectWithExtras ? projectKindOf(projectWithExtras) : defaultKind,
        costCenterId: projectWithExtras?.cost_center_id || '',
      });
      setActiveTab('basic');
      setJustification('');
    }
  }, [open, project, form, services, defaultKind]);

  // Projeto novo interno ou produto já chega com o centro "Projeto Interno", quando a lista de
  // centros estiver carregada. Efeito à parte para não resetar o formulário quando ela chegar.
  useEffect(() => {
    if (!open || project || costCenters.length === 0) return;
    if (form.getValues('kind') === PROJECT_KIND.CLIENT || form.getValues('costCenterId')) return;
    form.setValue('costCenterId', internalCostCenterId(costCenters));
  }, [open, project, costCenters, form]);

  const isContinuous = form.watch('isContinuous');
  const watchedKind = form.watch('kind') as ProjectKind;

  /** Projeto interno e produto já chegam com o centro "Projeto Interno", se existir e estiver vazio. */
  const handleKindChange = (kind: ProjectKind) => {
    if (kind === PROJECT_KIND.PRODUCT) form.setValue('clientId', '');
    if (kind === PROJECT_KIND.CLIENT || form.getValues('costCenterId')) return;
    form.setValue('costCenterId', internalCostCenterId(costCenters));
  };
  const watchedServiceLine = form.watch('serviceLine');
  const selectedService = services.find(s => s.id === watchedServiceLine);
  const isFinanciamento = watchedServiceLine === 'financiamento_inovacao'
    || selectedService?.name?.toLowerCase().includes('financiamento') === true;
  const isVentures = watchedServiceLine === 'ventures'
    || selectedService?.name?.toLowerCase().includes('ventures') === true;

  const handleSubmit = (values: ProjectFormValues) => {
    if (requireJustification && justification.trim().length < 10) {
      return;
    }
    if (values.isContinuous && !isVentures && (!values.renewalDate || values.renewalDate.length === 0)) {
      form.setError('renewalDate', { message: 'Data de renovação é obrigatória para projetos contínuos' });
      return;
    }
    onSubmit({
      name: values.name,
      serviceLine: values.serviceLine || undefined,
      description: values.description,
      // Produto não tem cliente; projeto interno pode ter ou não (ADR-0049).
      clientId: values.kind === PROJECT_KIND.PRODUCT ? null : values.clientId || null,
      managerId: values.managerId,
      startDate: values.startDate,
      endDate: values.isContinuous ? undefined : values.endDate,
      isContinuous: values.isContinuous,
      renewalDate: values.isContinuous && values.serviceLine !== 'ventures' ? values.renewalDate : undefined,
      status: values.status as ProjectStatus,
      totalValue: values.totalValue,
      paymentMethod: values.paymentMethod,
      installmentsCount: values.installmentsCount,
      firstInvoiceDate: values.firstInvoiceDate || undefined,
      dueDay: values.dueDay,
      successFeePercent: values.successFeePercent,
      isBillable: values.kind === PROJECT_KIND.CLIENT,
      costCenterId: values.kind === PROJECT_KIND.CLIENT ? undefined : values.costCenterId,
      isInternalProduct: values.kind === PROJECT_KIND.PRODUCT,
    }, requireJustification ? justification.trim() : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          <DialogDescription>
            {project
              ? 'Atualize as informações do projeto'
              : 'Preencha as informações para criar um novo projeto'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 [&_*:focus]:ring-primary-deep [&_*:focus-visible]:ring-primary-deep"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Produto não fatura (ADR-0049): sem valor nem parcela, a aba financeira some. */}
              {watchedKind !== PROJECT_KIND.PRODUCT && (
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="financial">Financeiro</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="basic" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Website Corporativo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceLine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Serviço</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.filter(s => s.isActive).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span>{s.name}</span>
                              <span className="ml-1.5 text-muted-foreground text-xs">
                                — {BILLING_TYPE_LABELS[s.billingType] ?? s.billingType}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ProjectKindField control={form.control} name="kind" onKindChange={handleKindChange} />

                {watchedKind !== PROJECT_KIND.CLIENT && (
                  <FormField
                    control={form.control}
                    name="costCenterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Custo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o centro de custo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {costCenters.filter((c) => c.is_active).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          As horas deste projeto vão para este centro, em vez do centro do serviço.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve descrição do projeto..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {watchedKind !== PROJECT_KIND.PRODUCT && (
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{requiresClient(watchedKind) ? 'Cliente *' : 'Cliente (opcional)'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.companyName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  )}

                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchedKind === PROJECT_KIND.PRODUCT ? 'Responsável pelo produto *' : 'Gerente do Projeto *'}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={!canChangeManager}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o gerente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {managers.length > 0 ? (
                              managers.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.nome}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                Nenhum gerente disponível.
                                <br />
                                Atribua o perfil "Gerente de Projetos" ou "Administrador" a um funcionário.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {!isVentures && (
                <FormField
                  control={form.control}
                  name="isContinuous"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-primary-deep data-[state=checked]:bg-primary-deep data-[state=checked]:border-primary-deep data-[state=checked]:text-primary-deep-foreground"
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Projeto Contínuo</FormLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px]">
                          <p>Marque esta opção para projetos sem prazo de término definido</p>
                        </TooltipContent>
                      </Tooltip>
                    </FormItem>
                  )}
                />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isContinuous && !isVentures ? (
                    <FormField
                      control={form.control}
                      name="renewalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Renovação *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : !isContinuous ? (
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Fim *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>

                {isContinuous && !isFinanciamento && !isVentures && (
                  <p className="text-sm text-muted-foreground">
                    Data de renovação automática do contrato. Será gerada uma NF por mês até esta data.
                  </p>
                )}

              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isContinuous ? 'Valor Recorrente Mensal *' : 'Valor Total do Projeto *'}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="R$ 0,00"
                          value={field.value ? formatCurrency(field.value) : ''}
                          onChange={(e) => {
                            const formatted = formatCurrency(e.target.value);
                            e.target.value = formatted;
                            field.onChange(parseCurrency(formatted));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isFinanciamento && (
                <div className={`grid ${isContinuous ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
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

                  {!isContinuous && (
                    <FormField
                      control={form.control}
                      name="installmentsCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Parcelas</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                )}

                {isFinanciamento && (
                  <FormField
                    control={form.control}
                    name="successFeePercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual de Sucesso (%)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" step="0.1" placeholder="Ex: 10" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstInvoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data da Primeira NF</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isFinanciamento ? 'Prazo de Pagamento (dias)' : 'Dia de Vencimento'}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max={isFinanciamento ? 90 : 31} placeholder={isFinanciamento ? 'Ex: 30' : undefined} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {requireJustification && (
              <div className="space-y-2 pt-4 border-t">
                <label className="text-sm font-medium">
                  Justificativa da alteração *
                </label>
                <Textarea
                  placeholder="Descreva o motivo da alteração neste projeto concluído (mínimo 10 caracteres)..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                />
                {justification.length > 0 && justification.trim().length < 10 && (
                  <p className="text-sm text-destructive">A justificativa deve ter no mínimo 10 caracteres.</p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (requireJustification && justification.trim().length < 10)}
                className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
              >
                {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
