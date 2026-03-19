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
import { useClients } from '@/hooks/useClients';
import { useEmployees } from '@/hooks/useEmployees';
import { useServices } from '@/hooks/useServices';
import { formatCurrency, parseCurrency } from '@/lib/masks';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  serviceLine: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
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
}).refine((data) => data.isContinuous || (data.endDate && data.endDate.length > 0), {
  message: 'Data de fim é obrigatória para projetos com prazo determinado',
  path: ['endDate'],
}).refine((data) => !data.isContinuous || data.serviceLine === 'ventures' || (data.renewalDate && data.renewalDate.length > 0), {
  message: 'Data de renovação é obrigatória para projetos contínuos',
  path: ['renewalDate'],
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithRelations | null;
  onSubmit: (data: CreateProjectInput, justification?: string) => void;
  isSubmitting?: boolean;
  requireJustification?: boolean;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isSubmitting,
  requireJustification = false,
}: ProjectFormDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [justification, setJustification] = useState('');
  const { data: clients = [] } = useClients();
  const { data: employees = [] } = useEmployees();
  const { data: services = [] } = useServices();

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
    },
  });

  // Reset form when project changes (for edit mode)
  useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name || '',
        serviceLine: project?.service_line || '',
        description: project?.description || '',
        clientId: project?.client_id || '',
        managerId: project?.manager_id || '',
        startDate: project?.start_date || '',
        endDate: project?.end_date || '',
        isContinuous: project?.is_continuous || false,
        renewalDate: (project as any)?.renewal_date || '',
        status: project?.status || 'planning',
        totalValue: Number(project?.total_value) || 0,
        paymentMethod: project?.payment_method || 'mensal',
        installmentsCount: project?.installments_count || 1,
        firstInvoiceDate: project?.first_invoice_date || '',
        dueDay: project?.due_day || 10,
        successFeePercent: (project as any)?.success_fee_percent ?? undefined,
      });
      setActiveTab('basic');
      setJustification('');
    }
  }, [open, project, form]);

  const isContinuous = form.watch('isContinuous');
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
    onSubmit({
      name: values.name,
      serviceLine: values.serviceLine || undefined,
      description: values.description,
      clientId: values.clientId,
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
              </TabsList>

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
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  <FormField
                    control={form.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gerente do Projeto *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || (requireJustification && justification.trim().length < 10)}>
                {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
