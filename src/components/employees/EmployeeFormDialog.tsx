import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import { ContractType, CONTRACT_TYPE_LABELS, calculateCLTCharges } from '@/types/employee';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wrench, Heart, User, Briefcase, Calculator } from 'lucide-react';
import { formatPhone, formatCPF, formatCurrency, parseCurrency, validateCPF } from '@/lib/masks';
import { EmployeeToolsTable } from './EmployeeToolsTable';
import { EmployeeBenefitsTable } from './EmployeeBenefitsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  telefone: z.string().min(10, 'Telefone é obrigatório'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  cpf: z.string().min(11, 'CPF é obrigatório').refine((val) => validateCPF(val), {
    message: 'CPF inválido',
  }),
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  isGerente: z.boolean(),
  status: z.enum(['ativo', 'inativo']),
  tipoContratacao: z.enum(['SOCIO', 'CLT', 'PJ', 'JOVEM_APRENDIZ', 'ESTAGIO'] as const),
  jornadaMensal: z.number().min(1, 'Jornada deve ser maior que 0'),
  salarioMensal: z.number().min(0, 'Salário não pode ser negativo'),
  salarioLiquido: z.number().min(0, 'Salário líquido não pode ser negativo'),
  proLabore: z.number().min(0, 'Pró-labore não pode ser negativo'),
  fgts: z.number().min(0),
  inssEmpresa: z.number().min(0),
  decimoTerceiro: z.number().min(0),
  ferias: z.number().min(0),
  beneficios: z.number().min(0),
  encargos: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSubmit: (data: CreateEmployeeInput) => void;
  isLoading?: boolean;
}

const EmployeeFormDialog = ({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isLoading = false,
}: EmployeeFormDialogProps) => {
  const isEditing = !!employee;
  const [activeTab, setActiveTab] = useState('dados');

  // Masked display values
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [salarioDisplay, setSalarioDisplay] = useState('');
  const [salarioLiquidoDisplay, setSalarioLiquidoDisplay] = useState('');
  const [proLaboreDisplay, setProLaboreDisplay] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      cargo: '',
      cpf: '',
      dataAdmissao: new Date().toISOString().split('T')[0],
      isGerente: false,
      status: 'ativo',
      tipoContratacao: 'CLT',
      jornadaMensal: 176,
      salarioMensal: 0,
      salarioLiquido: 0,
      proLabore: 0,
      fgts: 0,
      inssEmpresa: 0,
      decimoTerceiro: 0,
      ferias: 0,
      beneficios: 0,
      encargos: 0,
    },
  });

  const tipoContratacao = form.watch('tipoContratacao');
  const salarioMensal = form.watch('salarioMensal');

  // Auto-calculate CLT charges
  const cltCharges = useMemo(() => {
    if (tipoContratacao === 'CLT' && salarioMensal > 0) {
      return calculateCLTCharges(salarioMensal);
    }
    return { fgts: 0, inssEmpresa: 0, decimoTerceiro: 0, ferias: 0, totalEncargos: 0 };
  }, [tipoContratacao, salarioMensal]);

  // Update form when CLT charges change
  useEffect(() => {
    if (tipoContratacao === 'CLT') {
      form.setValue('fgts', cltCharges.fgts);
      form.setValue('inssEmpresa', cltCharges.inssEmpresa);
      form.setValue('decimoTerceiro', cltCharges.decimoTerceiro);
      form.setValue('ferias', cltCharges.ferias);
      form.setValue('encargos', cltCharges.totalEncargos);
    }
  }, [cltCharges, tipoContratacao, form]);

  useEffect(() => {
    if (employee) {
      form.reset({
        nome: employee.nome,
        email: employee.email,
        telefone: employee.telefone || '',
        cargo: employee.cargo,
        cpf: employee.cpf || '',
        dataAdmissao: employee.dataAdmissao,
        isGerente: employee.isGerente,
        status: employee.status,
        tipoContratacao: employee.tipoContratacao || 'CLT',
        jornadaMensal: employee.jornadaMensal || 176,
        salarioMensal: employee.salarioMensal,
        salarioLiquido: employee.salarioLiquido || 0,
        proLabore: employee.proLabore || 0,
        fgts: employee.fgts || 0,
        inssEmpresa: employee.inssEmpresa || 0,
        decimoTerceiro: employee.decimoTerceiro || 0,
        ferias: employee.ferias || 0,
        beneficios: employee.beneficios,
        encargos: employee.encargos,
      });
      // Set display values
      setPhoneDisplay(employee.telefone ? formatPhone(employee.telefone) : '');
      setCpfDisplay(employee.cpf ? formatCPF(employee.cpf) : '');
      setSalarioDisplay(employee.salarioMensal ? formatCurrency(employee.salarioMensal) : '');
      setSalarioLiquidoDisplay(employee.salarioLiquido ? formatCurrency(employee.salarioLiquido) : '');
      setProLaboreDisplay(employee.proLabore ? formatCurrency(employee.proLabore) : '');
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        cargo: '',
        cpf: '',
        dataAdmissao: new Date().toISOString().split('T')[0],
        isGerente: false,
        status: 'ativo',
        tipoContratacao: 'CLT',
        jornadaMensal: 176,
        salarioMensal: 0,
        salarioLiquido: 0,
        proLabore: 0,
        fgts: 0,
        inssEmpresa: 0,
        decimoTerceiro: 0,
        ferias: 0,
        beneficios: 0,
        encargos: 0,
      });
      // Reset display values
      setPhoneDisplay('');
      setCpfDisplay('');
      setSalarioDisplay('');
      setSalarioLiquidoDisplay('');
      setProLaboreDisplay('');
      setActiveTab('dados');
    }
  }, [employee, form, open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    form.setValue('telefone', formatted.replace(/\D/g, ''));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfDisplay(formatted);
    form.setValue('cpf', formatted.replace(/\D/g, ''));
    form.trigger('cpf');
  };

  const handleCurrencyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FormData,
    setDisplay: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatCurrency(e.target.value);
    setDisplay(formatted);
    form.setValue(field, parseCurrency(formatted) as never);
  };

  const handleSubmit = (data: FormData) => {
    onSubmit(data as CreateEmployeeInput);
    form.reset();
    // Reset display values
    setPhoneDisplay('');
    setCpfDisplay('');
    setSalarioDisplay('');
    setSalarioLiquidoDisplay('');
    setProLaboreDisplay('');
  };

  const renderPersonalDataFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <FormControl>
                <Input placeholder="João da Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="joao@empresa.com" 
                  disabled={isEditing}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefone"
          render={() => (
            <FormItem>
              <FormLabel>Telefone *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="(11) 99999-9999" 
                  value={phoneDisplay}
                  onChange={handlePhoneChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpf"
          render={() => (
            <FormItem>
              <FormLabel>CPF *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="000.000.000-00" 
                  value={cpfDisplay}
                  onChange={handleCpfChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cargo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo *</FormLabel>
              <FormControl>
                <Input placeholder="Desenvolvedor Sênior" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dataAdmissao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Admissão *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isGerente"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Administrador?</FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderFinancialFields = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="tipoContratacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Contratação *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTRACT_TYPE_LABELS[type]}
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
          name="jornadaMensal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jornada Mensal (horas) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="176"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* SÓCIO - Pró-labore */}
      {tipoContratacao === 'SOCIO' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pró-labore</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="proLabore"
              render={() => (
                <FormItem>
                  <FormLabel>Valor Mensal *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={proLaboreDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'proLabore', setProLaboreDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* CLT - Salário e encargos automáticos */}
      {tipoContratacao === 'CLT' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Salário e Encargos CLT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salarioMensal"
                render={() => (
                  <FormItem>
                    <FormLabel>Salário Bruto *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 0,00"
                        value={salarioDisplay}
                        onChange={(e) => handleCurrencyChange(e, 'salarioMensal', setSalarioDisplay)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salarioLiquido"
                render={() => (
                  <FormItem>
                    <FormLabel>Salário Líquido (informativo)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="R$ 0,00"
                        value={salarioLiquidoDisplay}
                        onChange={(e) => handleCurrencyChange(e, 'salarioLiquido', setSalarioLiquidoDisplay)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Encargos calculados automaticamente ({((cltCharges.totalEncargos / (salarioMensal || 1)) * 100).toFixed(1)}% do salário bruto)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">FGTS (8%)</span>
                  <span className="font-medium">{formatCurrency(cltCharges.fgts)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">INSS Empresa (20%)</span>
                  <span className="font-medium">{formatCurrency(cltCharges.inssEmpresa)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">13º Salário (8.33%)</span>
                  <span className="font-medium">{formatCurrency(cltCharges.decimoTerceiro)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">Férias + 1/3 (11.11%)</span>
                  <span className="font-medium">{formatCurrency(cltCharges.ferias)}</span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                <span className="font-medium">Total Encargos</span>
                <span className="font-bold text-lg">{formatCurrency(cltCharges.totalEncargos)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PJ - Valor mensal */}
      {tipoContratacao === 'PJ' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Valor PJ</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="salarioMensal"
              render={() => (
                <FormItem>
                  <FormLabel>Valor Mensal *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={salarioDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'salarioMensal', setSalarioDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* JOVEM APRENDIZ / ESTÁGIO - Bolsa */}
      {(tipoContratacao === 'JOVEM_APRENDIZ' || tipoContratacao === 'ESTAGIO') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {tipoContratacao === 'JOVEM_APRENDIZ' ? 'Salário Aprendiz' : 'Bolsa Estágio'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="salarioMensal"
              render={() => (
                <FormItem>
                  <FormLabel>Valor Mensal *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={salarioDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'salarioMensal', setSalarioDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do funcionário abaixo.'
              : 'Preencha as informações para adicionar um novo funcionário. Um email de convite será enviado automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="beneficios" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Benefícios
              </TabsTrigger>
              <TabsTrigger value="ferramentas" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Ferramentas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {renderPersonalDataFields()}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="financeiro" className="mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {renderFinancialFields()}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="beneficios" className="mt-4">
              {employee && (
                <EmployeeBenefitsTable employeeId={employee.id} employeeName={employee.nome} />
              )}
            </TabsContent>

            <TabsContent value="ferramentas" className="mt-4">
              {employee && (
                <EmployeeToolsTable employeeId={employee.id} employeeName={employee.nome} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="financeiro" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Contratação
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <TabsContent value="dados" className="mt-4">
                  {renderPersonalDataFields()}
                </TabsContent>

                <TabsContent value="financeiro" className="mt-4">
                  {renderFinancialFields()}
                </TabsContent>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Adicionar Funcionário'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
