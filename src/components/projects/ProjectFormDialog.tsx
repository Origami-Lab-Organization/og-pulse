import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { formatCurrency, parseCurrency } from '@/lib/masks';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
  isContinuous: z.boolean().default(false),
  status: z.string().default('planning'),
  totalValue: z.coerce.number().min(0, 'Valor deve ser positivo'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1, 'Mínimo de 1 parcela'),
  firstInvoiceDate: z.string().optional(),
  dueDay: z.coerce.number().min(1).max(31).default(10),
}).refine((data) => data.isContinuous || (data.endDate && data.endDate.length > 0), {
  message: 'Data de fim é obrigatória para projetos com prazo determinado',
  path: ['endDate'],
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithRelations | null;
  onSubmit: (data: CreateProjectInput) => void;
  isSubmitting?: boolean;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isSubmitting,
}: ProjectFormDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const { data: clients = [] } = useClients();
  const { data: employees = [] } = useEmployees();

  const managers = employees.filter((e) => e.isGerente || e.cargo.toLowerCase().includes('gerente'));

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      clientId: '',
      managerId: '',
      startDate: '',
      endDate: '',
      isContinuous: false,
      status: 'planning',
      totalValue: 0,
      paymentMethod: 'mensal',
      installmentsCount: 1,
      firstInvoiceDate: '',
      dueDay: 10,
    },
  });

  // Reset form when project changes (for edit mode)
  useEffect(() => {
    if (open) {
      form.reset({
        name: project?.name || '',
        description: project?.description || '',
        clientId: project?.client_id || '',
        managerId: project?.manager_id || '',
        startDate: project?.start_date || '',
        endDate: project?.end_date || '',
        isContinuous: project?.is_continuous || false,
        status: project?.status || 'planning',
        totalValue: Number(project?.total_value) || 0,
        paymentMethod: project?.payment_method || 'mensal',
        installmentsCount: project?.installments_count || 1,
        firstInvoiceDate: project?.first_invoice_date || '',
        dueDay: project?.due_day || 10,
      });
      setActiveTab('basic');
    }
  }, [open, project, form]);

  const isContinuous = form.watch('isContinuous');

  const handleSubmit = (values: ProjectFormValues) => {
    onSubmit({
      name: values.name,
      description: values.description,
      clientId: values.clientId,
      managerId: values.managerId,
      startDate: values.startDate,
      endDate: values.isContinuous ? undefined : values.endDate,
      isContinuous: values.isContinuous,
      status: values.status as ProjectStatus,
      totalValue: values.totalValue,
      paymentMethod: values.paymentMethod,
      installmentsCount: values.installmentsCount,
      firstInvoiceDate: values.firstInvoiceDate,
      dueDay: values.dueDay,
    });
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
                              employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.nome}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

                  {!isContinuous && (
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
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="isContinuous"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Projeto Contínuo</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Marque esta opção para projetos sem prazo de término definido
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="financial" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total do Projeto *</FormLabel>
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

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
                        <FormLabel>Dia de Vencimento</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="31" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
