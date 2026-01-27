import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import { ContractType, CONTRACT_TYPE_LABELS } from '@/types/employee';
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
import { Loader2, Wrench, Heart, User, Briefcase, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { formatPhone, formatCPF, formatCurrency, parseCurrency, validateCPF } from '@/lib/masks';
import { EmployeeToolsTable } from './EmployeeToolsTable';
import { EmployeeBenefitsTable } from './EmployeeBenefitsTable';
import { EmployeeBenefitsLocalTable, LocalBenefit } from './EmployeeBenefitsLocalTable';
import { EmployeeToolsLocalTable, LocalTool } from './EmployeeToolsLocalTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

export interface EmployeeFormSubmitData extends CreateEmployeeInput {
  localBenefits?: LocalBenefit[];
  localTools?: LocalTool[];
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  onSubmit: (data: EmployeeFormSubmitData) => void;
  isLoading?: boolean;
}

const STEPS = [
  { id: 'dados', label: 'Dados Pessoais', icon: User },
  { id: 'financeiro', label: 'Contratação', icon: Briefcase },
  { id: 'beneficios', label: 'Benefícios', icon: Heart },
  { id: 'ferramentas', label: 'Ferramentas', icon: Wrench },
];

const EmployeeFormDialog = ({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isLoading = false,
}: EmployeeFormDialogProps) => {
  const isEditing = !!employee;
  const [currentStep, setCurrentStep] = useState(0);

  // Local state for benefits and tools (for new employees)
  const [localBenefits, setLocalBenefits] = useState<LocalBenefit[]>([]);
  const [localTools, setLocalTools] = useState<LocalTool[]>([]);

  // Masked display values
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [salarioDisplay, setSalarioDisplay] = useState('');
  const [salarioLiquidoDisplay, setSalarioLiquidoDisplay] = useState('');
  const [proLaboreDisplay, setProLaboreDisplay] = useState('');
  const [fgtsDisplay, setFgtsDisplay] = useState('');
  const [inssDisplay, setInssDisplay] = useState('');
  const [decimoDisplay, setDecimoDisplay] = useState('');
  const [feriasDisplay, setFeriasDisplay] = useState('');

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
  const fgts = form.watch('fgts');
  const inssEmpresa = form.watch('inssEmpresa');
  const decimoTerceiro = form.watch('decimoTerceiro');
  const ferias = form.watch('ferias');
  const nome = form.watch('nome');

  // Calculate total encargos when individual values change
  useEffect(() => {
    const totalEncargos = fgts + inssEmpresa + decimoTerceiro + ferias;
    form.setValue('encargos', totalEncargos);
  }, [fgts, inssEmpresa, decimoTerceiro, ferias, form]);

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
      setFgtsDisplay(employee.fgts ? formatCurrency(employee.fgts) : '');
      setInssDisplay(employee.inssEmpresa ? formatCurrency(employee.inssEmpresa) : '');
      setDecimoDisplay(employee.decimoTerceiro ? formatCurrency(employee.decimoTerceiro) : '');
      setFeriasDisplay(employee.ferias ? formatCurrency(employee.ferias) : '');
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
      setFgtsDisplay('');
      setInssDisplay('');
      setDecimoDisplay('');
      setFeriasDisplay('');
      setCurrentStep(0);
      setLocalBenefits([]);
      setLocalTools([]);
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

  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      return await form.trigger(['nome', 'email', 'telefone', 'cpf', 'cargo', 'dataAdmissao', 'status', 'isGerente']);
    }
    if (currentStep === 1) {
      return await form.trigger(['tipoContratacao', 'jornadaMensal', 'salarioMensal', 'proLabore']);
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      localBenefits: isEditing ? undefined : localBenefits,
      localTools: isEditing ? undefined : localTools,
    } as EmployeeFormSubmitData);
    
    // Reset everything
    form.reset();
    setPhoneDisplay('');
    setCpfDisplay('');
    setSalarioDisplay('');
    setSalarioLiquidoDisplay('');
    setProLaboreDisplay('');
    setFgtsDisplay('');
    setInssDisplay('');
    setDecimoDisplay('');
    setFeriasDisplay('');
    setLocalBenefits([]);
    setLocalTools([]);
    setCurrentStep(0);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                isActive && "border-primary bg-primary text-primary-foreground",
                isCompleted && "border-primary bg-primary/20 text-primary",
                !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-5 w-5" />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div 
                className={cn(
                  "w-12 h-0.5 mx-1",
                  isCompleted ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

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

      {/* Salários - Todos os tipos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Valores</CardTitle>
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
                  <FormLabel>Salário Líquido</FormLabel>
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

            <FormField
              control={form.control}
              name="proLabore"
              render={() => (
                <FormItem>
                  <FormLabel>Pró-Labore</FormLabel>
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
          </div>
        </CardContent>
      </Card>

      {/* Encargos - Todos os tipos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Encargos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fgts"
              render={() => (
                <FormItem>
                  <FormLabel>FGTS</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={fgtsDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'fgts', setFgtsDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inssEmpresa"
              render={() => (
                <FormItem>
                  <FormLabel>INSS Empresa</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={inssDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'inssEmpresa', setInssDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decimoTerceiro"
              render={() => (
                <FormItem>
                  <FormLabel>13º Salário</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={decimoDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'decimoTerceiro', setDecimoDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ferias"
              render={() => (
                <FormItem>
                  <FormLabel>Férias + 1/3</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="R$ 0,00"
                      value={feriasDisplay}
                      onChange={(e) => handleCurrencyChange(e, 'ferias', setFeriasDisplay)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-3 p-3 bg-primary/10 rounded-lg flex justify-between items-center">
            <span className="font-medium">Total Encargos</span>
            <span className="font-bold text-lg">{formatCurrency(fgts + inssEmpresa + decimoTerceiro + ferias)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderPersonalDataFields();
      case 1:
        return renderFinancialFields();
      case 2:
        // Benefits - use local table for new, database table for editing
        return isEditing && employee ? (
          <EmployeeBenefitsTable employeeId={employee.id} employeeName={employee.nome} />
        ) : (
          <EmployeeBenefitsLocalTable 
            benefits={localBenefits} 
            onChange={setLocalBenefits}
            employeeName={nome || 'Novo Funcionário'}
          />
        );
      case 3:
        // Tools - use local table for new, database table for editing
        return isEditing && employee ? (
          <EmployeeToolsTable employeeId={employee.id} employeeName={employee.nome} />
        ) : (
          <EmployeeToolsLocalTable 
            tools={localTools} 
            onChange={setLocalTools}
            employeeName={nome || 'Novo Funcionário'}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do funcionário.'
              : `Etapa ${currentStep + 1} de ${STEPS.length}: ${STEPS[currentStep].label}`}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && renderStepIndicator()}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="min-h-[300px]">
              {renderCurrentStep()}
            </div>

            <div className="flex justify-between gap-3 pt-4 mt-4 border-t">
              <div>
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Anterior
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                
                {isLastStep || isEditing ? (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : isEditing ? (
                      'Salvar Alterações'
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Próximo
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
