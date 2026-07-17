import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Employee, useEmployeeVersions } from '@/hooks/useEmployees';
import { CreateEmployeeInput } from '@/services/employeeService';
import { ContractType, CONTRACT_TYPE_LABELS, SystemRole, SYSTEM_ROLE_LABELS, PixKeyType, PIX_KEY_TYPE_LABELS, BankAccountType, BANK_ACCOUNT_TYPE_LABELS } from '@/types/employee';
import { usePayrollProfile } from '@/hooks/usePayrollProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateEmployeeCost, CostBreakdown, getBaseFieldLabel, showsChargesSection, showsProvisionsSection } from '@/lib/employeeCostCalculator';
import { getMonthlyHoursFromDaily } from '@/lib/employeeCost';
import { useHolidays } from '@/hooks/useHolidays';
import { formatCurrency } from '@/lib/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Separator } from '@/components/ui/separator';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wrench, Heart, User, Briefcase, ChevronLeft, ChevronRight, Check, History, Calculator, AlertCircle, Camera, Upload, Trash2, Clock, Ban, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatPhone, formatCPF, formatCurrency as formatCurrencyMask, parseCurrency, validateCPF } from '@/lib/masks';
import { EmployeeToolsTable } from './EmployeeToolsTable';
import { EmployeeBenefitsTable } from './EmployeeBenefitsTable';
import { EmployeeBenefitsLocalTable, LocalBenefit } from './EmployeeBenefitsLocalTable';
import { EmployeeToolsLocalTable, LocalTool } from './EmployeeToolsLocalTable';
import { EmployeeVersionsTable } from './EmployeeVersionsTable';
import { BankSelect } from './BankSelect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';

const baseFormSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  telefone: z.string().min(10, 'Telefone é obrigatório'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  cpf: z.string().min(11, 'CPF é obrigatório').refine((val) => validateCPF(val), {
    message: 'CPF inválido',
  }),
  dataAdmissao: z.string().min(1, 'Data de admissão é obrigatória'),
  dataNascimento: z.string().min(1, 'Data de nascimento é obrigatória'),
  fotoUrl: z.string().optional(),
  isGerente: z.boolean(),
  systemRole: z.enum(['admin', 'manager', 'user'] as const),
  status: z.enum(['ativo', 'aguardando_confirmacao', 'bloqueado', 'arquivado', 'desligado', 'em_desligamento']),
  tipoContratacao: z.enum(['SOCIO', 'CLT', 'PJ', 'MENOR_APRENDIZ', 'ESTAGIO'] as const),
  jornadaMensal: z.number().min(1, 'Jornada deve ser maior que 0'),
  jornadaDiaria: z.number().min(1, 'Jornada deve ser maior que 0').max(24, 'Máximo 24 horas'),
  salarioMensal: z.number().min(0, 'Salário não pode ser negativo'),
  bolsaAuxilio: z.number().min(0, 'Bolsa-auxílio não pode ser negativa'),
  valorContratoPj: z.number().min(0, 'Valor do contrato não pode ser negativo'),
  proLabore: z.number().min(0, 'Pró-labore não pode ser negativo'),
  dividendos: z.number().min(0, 'Dividendos não podem ser negativos'),
  fgts: z.number().min(0),
  inssEmpresa: z.number().min(0),
  decimoTerceiro: z.number().min(0),
  ferias: z.number().min(0),
  beneficios: z.number().min(0),
  encargos: z.number().min(0),
  pixKeyType: z.enum(['cpf', 'cnpj', 'telefone', 'email', 'aleatoria']).nullable().optional(),
  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: z.enum(['corrente', 'poupanca']).nullable().optional(),
});

const formSchema = baseFormSchema.refine((data) => {
  switch (data.tipoContratacao) {
    case 'CLT':
    case 'MENOR_APRENDIZ':
      return data.salarioMensal > 0;
    case 'ESTAGIO':
      return data.bolsaAuxilio > 0;
    case 'PJ':
      return data.valorContratoPj > 0;
    case 'SOCIO':
      return data.proLabore > 0 || data.dividendos > 0;
    default:
      return true;
  }
}, {
  message: 'Preencha o valor base conforme o tipo de contratação',
  path: ['salarioMensal'],
});

type FormData = z.infer<typeof baseFormSchema>;

export interface EmployeeFormSubmitData extends CreateEmployeeInput {
  localBenefits?: LocalBenefit[];
  localTools?: LocalTool[];
  createNewVersion?: boolean;
  effectiveFrom?: string;
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [versionConfirmOpen, setVersionConfirmOpen] = useState(false);
  const [versionEffectiveDate, setVersionEffectiveDate] = useState<Date>(new Date());
  const [pendingSubmitData, setPendingSubmitData] = useState<EmployeeFormSubmitData | null>(null);

  // Get current user for tenant context
  const { employee: currentEmployee } = useAuth();

  // Fetch versions for editing mode
  const { data: versions = [], isLoading: versionsLoading } = useEmployeeVersions(
    isEditing ? employee?.id : undefined
  );

  // Fetch payroll profile for cost calculation
  const { data: payrollProfile } = usePayrollProfile();

  // Feriados para derivar a jornada mensal a partir da diária (dias úteis reais do mês)
  const { data: holidays = [] } = useHolidays();

  // Local state for benefits and tools (for new employees)
  const [localBenefits, setLocalBenefits] = useState<LocalBenefit[]>([]);
  const [localTools, setLocalTools] = useState<LocalTool[]>([]);

  // Cost breakdown state
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

  // Photo upload state
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const { toast } = useToast();

  // Masked display values
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [cpfDisplay, setCpfDisplay] = useState('');
  const [salarioDisplay, setSalarioDisplay] = useState('');
  const [bolsaAuxilioDisplay, setBolsaAuxilioDisplay] = useState('');
  const [valorContratoPjDisplay, setValorContratoPjDisplay] = useState('');
  const [proLaboreDisplay, setProLaboreDisplay] = useState('');
  const [dividendosDisplay, setDividendosDisplay] = useState('');
  const [fgtsDisplay, setFgtsDisplay] = useState('');
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
      dataNascimento: '',
      fotoUrl: '',
      isGerente: false,
      systemRole: 'user',
      status: 'aguardando_confirmacao',
      tipoContratacao: 'CLT',
        jornadaMensal: 176,
        jornadaDiaria: 8,
      salarioMensal: 0,
      bolsaAuxilio: 0,
      valorContratoPj: 0,
      proLabore: 0,
      dividendos: 0,
      fgts: 0,
      inssEmpresa: 0,
      decimoTerceiro: 0,
      ferias: 0,
      beneficios: 0,
      encargos: 0,
      pixKeyType: null,
      pixKey: null,
      bankName: null,
      bankAgency: null,
      bankAccount: null,
      bankAccountType: null,
    },
  });

  const { formState: { isDirty } } = form;

  // Verificar se há mudanças não salvas (formulário ou benefícios/ferramentas locais para novos funcionários)
  const hasUnsavedChanges = isDirty || (!isEditing && (localBenefits.length > 0 || localTools.length > 0));

  const tipoContratacao = form.watch('tipoContratacao');
  const salarioMensal = form.watch('salarioMensal');
  const bolsaAuxilio = form.watch('bolsaAuxilio');
  const valorContratoPj = form.watch('valorContratoPj');
  const proLabore = form.watch('proLabore');
  const dividendos = form.watch('dividendos');
  const nome = form.watch('nome');
  const systemRole = form.watch('systemRole');

  // Sync isGerente based on systemRole - admins and managers are automatically gerentes
  useEffect(() => {
    if (systemRole === 'admin' || systemRole === 'manager') {
      form.setValue('isGerente', true);
    } else {
      form.setValue('isGerente', false);
    }
  }, [systemRole, form]);

  // Handle dialog close with confirmation only if there are unsaved changes
  const handleClose = (openState: boolean) => {
    if (!openState) {
      // User is trying to close - only show confirmation if there are changes
      if (hasUnsavedChanges) {
        setShowExitConfirm(true);
      } else {
        onOpenChange(false);
      }
    } else {
      onOpenChange(openState);
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    onOpenChange(false);
  };

  // Calculate costs automatically when inputs change
  useEffect(() => {
    if (!payrollProfile) return;

    const benefitsTotal = localBenefits
      .reduce((sum, b) => sum + b.monthlyValue, 0);
    const toolsTotal = localTools
      .reduce((sum, t) => sum + t.monthlyCost, 0);

    const breakdown = calculateEmployeeCost({
      tipoContratacao: tipoContratacao as ContractType,
      salarioBruto: salarioMensal,
      bolsaAuxilio: bolsaAuxilio,
      valorContratoPj: valorContratoPj,
      proLabore: proLabore,
      dividendos: dividendos,
      benefitsTotalMonthly: benefitsTotal,
      toolsTotalMonthly: toolsTotal,
      payrollProfile,
    });

    setCostBreakdown(breakdown);

    // Update form values with calculated charges
    form.setValue('fgts', breakdown.details.fgts);
    form.setValue('inssEmpresa', breakdown.details.inss);
    form.setValue('decimoTerceiro', breakdown.details.provisao13 || breakdown.details.provisaoRecesso);
    form.setValue('ferias', breakdown.details.provisaoFerias);
    form.setValue('encargos', breakdown.chargesAmount);

    // Update display values
    setFgtsDisplay(formatCurrency(breakdown.details.fgts));
    setDecimoDisplay(formatCurrency(breakdown.details.provisao13 || breakdown.details.provisaoRecesso));
    setFeriasDisplay(formatCurrency(breakdown.details.provisaoFerias));
  }, [tipoContratacao, salarioMensal, bolsaAuxilio, valorContratoPj, proLabore, dividendos, payrollProfile, localBenefits, localTools, form]);

  useEffect(() => {
    if (employee) {
      form.reset({
        nome: employee.nome,
        email: employee.email,
        telefone: employee.telefone || '',
        cargo: employee.cargo,
        cpf: employee.cpf || '',
        dataAdmissao: employee.dataAdmissao,
        dataNascimento: employee.dataNascimento || '',
        fotoUrl: employee.fotoUrl || '',
        isGerente: employee.isGerente,
        systemRole: employee.systemRole || 'user',
        status: employee.status,
        tipoContratacao: employee.tipoContratacao || 'CLT',
        jornadaMensal: employee.jornadaMensal || 176,
        jornadaDiaria: employee.jornadaDiaria || 8,
        salarioMensal: employee.salarioMensal,
        bolsaAuxilio: employee.bolsaAuxilio || 0,
        valorContratoPj: employee.valorContratoPj || 0,
        proLabore: employee.proLabore || 0,
        dividendos: employee.dividendos || 0,
        fgts: employee.fgts || 0,
        inssEmpresa: employee.inssEmpresa || 0,
        decimoTerceiro: employee.decimoTerceiro || 0,
        ferias: employee.ferias || 0,
        beneficios: employee.beneficios,
        encargos: employee.encargos,
        pixKeyType: employee.pixKeyType ?? null,
        pixKey: employee.pixKey ?? null,
        bankName: employee.bankName ?? null,
        bankAgency: employee.bankAgency ?? null,
        bankAccount: employee.bankAccount ?? null,
        bankAccountType: employee.bankAccountType ?? null,
      });
      // Set display values and photo preview
      setFotoPreview(employee.fotoUrl || null);
      setPhoneDisplay(employee.telefone ? formatPhone(employee.telefone) : '');
      setCpfDisplay(employee.cpf ? formatCPF(employee.cpf) : '');
      setSalarioDisplay(employee.salarioMensal ? formatCurrency(employee.salarioMensal) : '');
      setBolsaAuxilioDisplay(employee.bolsaAuxilio ? formatCurrency(employee.bolsaAuxilio) : '');
      setValorContratoPjDisplay(employee.valorContratoPj ? formatCurrency(employee.valorContratoPj) : '');
      setProLaboreDisplay(employee.proLabore ? formatCurrency(employee.proLabore) : '');
      setDividendosDisplay(employee.dividendos ? formatCurrency(employee.dividendos) : '');
      setFgtsDisplay(employee.fgts ? formatCurrency(employee.fgts) : '');
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
        dataNascimento: '',
        fotoUrl: '',
        isGerente: false,
        systemRole: 'user',
        status: 'aguardando_confirmacao',
        tipoContratacao: 'CLT',
        jornadaMensal: 176,
        jornadaDiaria: 8,
        salarioMensal: 0,
        bolsaAuxilio: 0,
        valorContratoPj: 0,
        proLabore: 0,
        dividendos: 0,
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
      setBolsaAuxilioDisplay('');
      setValorContratoPjDisplay('');
      setProLaboreDisplay('');
      setDividendosDisplay('');
      setFgtsDisplay('');
      setDecimoDisplay('');
      setFeriasDisplay('');
      setFotoPreview(null);
      setCurrentStep(0);
      setLocalBenefits([]);
      setLocalTools([]);
      setCostBreakdown(null);
    }
  }, [employee, form, open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    form.setValue('telefone', formatted.replace(/\D/g, ''));
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfDisplay(formatted);
    const cpfClean = formatted.replace(/\D/g, '');
    form.setValue('cpf', cpfClean);
    form.trigger('cpf');
    
    // Verificar duplicidade se CPF válido
    if (cpfClean.length === 11 && validateCPF(cpfClean) && currentEmployee?.tenant_id) {
      const { data: existing } = await supabase
        .from('employees')
        .select('id, nome')
        .eq('tenant_id', currentEmployee.tenant_id)
        .eq('cpf', cpfClean)
        .neq('id', employee?.id || '')
        .maybeSingle();
      
      if (existing) {
        form.setError('cpf', { 
          type: 'manual', 
          message: `CPF já cadastrado para ${existing.nome}` 
        });
      }
    }
  };

  const handleCurrencyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FormData,
    setDisplay: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const formatted = formatCurrencyMask(e.target.value);
    setDisplay(formatted);
    form.setValue(field, parseCurrency(formatted) as never);
  };

  // Photo select handler - opens crop dialog
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Apenas imagens são permitidas', variant: 'destructive' });
      return;
    }
    
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 5MB', variant: 'destructive' });
      return;
    }
    
    // Create temporary URL and open crop dialog
    const imageUrl = URL.createObjectURL(file);
    setTempImageSrc(imageUrl);
    setCropDialogOpen(true);
    
    // Clear input to allow selecting same file again
    event.target.value = '';
  };

  // Handle crop complete - upload cropped image
  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg' });
      
      if (error) {
        toast({ title: 'Erro', description: 'Falha ao enviar foto', variant: 'destructive' });
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(data.path);
      
      form.setValue('fotoUrl', urlData.publicUrl);
      setFotoPreview(urlData.publicUrl);
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao enviar foto', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (tempImageSrc) {
        URL.revokeObjectURL(tempImageSrc);
        setTempImageSrc(null);
      }
    }
  };

  const handleRemovePhoto = () => {
    setFotoPreview(null);
    form.setValue('fotoUrl', '');
  };

  const validateCurrentStep = async () => {
    if (currentStep === 0) {
      return await form.trigger(['nome', 'email', 'telefone', 'cpf', 'cargo', 'dataAdmissao', 'dataNascimento', 'status', 'systemRole']);
    }
    if (currentStep === 1) {
      // Validate based on contract type
      const tipo = form.getValues('tipoContratacao');
      const fieldsToValidate: (keyof FormData)[] = ['tipoContratacao', 'jornadaDiaria'];
      
      switch (tipo) {
        case 'CLT':
        case 'MENOR_APRENDIZ':
          fieldsToValidate.push('salarioMensal');
          break;
        case 'ESTAGIO':
          fieldsToValidate.push('bolsaAuxilio');
          break;
        case 'PJ':
          fieldsToValidate.push('valorContratoPj');
          break;
        case 'SOCIO':
          fieldsToValidate.push('proLabore', 'dividendos');
          break;
      }
      
      return await form.trigger(fieldsToValidate);
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

  const buildSubmitPayload = (data: FormData, hasVersionedChanges: boolean, effectiveFrom?: string): EmployeeFormSubmitData => {
    const { status: _status, jornadaDiaria, ...dataWithoutStatus } = data;
    const today = new Date();
    const jornadaMensalCalculated = getMonthlyHoursFromDaily(jornadaDiaria, today.getFullYear(), today.getMonth(), holidays);
    return {
      ...dataWithoutStatus,
      jornadaMensal: jornadaMensalCalculated,
      jornadaDiaria,
      status: isEditing ? employee!.status : 'aguardando_confirmacao',
      provisao13: costBreakdown?.details.provisao13 || 0,
      provisaoFerias: costBreakdown?.details.provisaoFerias || 0,
      provisaoRecesso: costBreakdown?.details.provisaoRecesso || 0,
      totalMonthlyCostEstimated: costBreakdown?.totalMonthlyCost || 0,
      totalAnnualCostEstimated: costBreakdown?.totalAnnualCost || 0,
      breakdownJson: costBreakdown || undefined,
      localBenefits: isEditing ? undefined : localBenefits,
      localTools: isEditing ? undefined : localTools,
      createNewVersion: hasVersionedChanges,
      effectiveFrom,
    } as EmployeeFormSubmitData;
  };

  const handleSubmit = (data: FormData) => {
    // Detect if versioned fields changed (only for editing)
    let hasVersionedChanges = false;
    if (isEditing && employee) {
      const versionedFields = [
        'salarioMensal', 'bolsaAuxilio', 'valorContratoPj', 'beneficios', 'encargos',
        'fgts', 'inssEmpresa', 'decimoTerceiro', 'ferias', 
        'proLabore', 'dividendos', 'jornadaDiaria', 'jornadaMensal', 'tipoContratacao', 'cargo'
      ] as const;
      
      for (const field of versionedFields) {
        if (data[field] !== (employee as any)[field]) {
          hasVersionedChanges = true;
          break;
        }
      }
    }

    if (hasVersionedChanges && isEditing) {
      // Show confirmation dialog with date picker
      const payload = buildSubmitPayload(data, true);
      setPendingSubmitData(payload);
      setVersionEffectiveDate(new Date());
      setVersionConfirmOpen(true);
      return;
    }

    onSubmit(buildSubmitPayload(data, false));
  };

  const handleVersionConfirm = () => {
    if (pendingSubmitData) {
      const dateStr = format(versionEffectiveDate, 'yyyy-MM-dd');
      onSubmit({ ...pendingSubmitData, effectiveFrom: dateStr });
    }
    setVersionConfirmOpen(false);
    setPendingSubmitData(null);
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
      {/* Photo Upload Section with Hover to Delete */}
      <div className="flex flex-col items-center gap-4 pb-4 border-b">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-muted">
            {fotoPreview ? (
              <AvatarImage src={fotoPreview} alt="Foto do funcionário" />
            ) : (
              <AvatarFallback className="bg-muted">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
          
          {/* Hover overlay with trash icon */}
          {fotoPreview && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={handleRemovePhoto}
            >
              <Trash2 className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('photo-upload')?.click()}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {fotoPreview ? 'Alterar Foto' : 'Adicionar Foto'}
        </Button>
        
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <p className="text-xs text-muted-foreground">Foto opcional, máx. 5MB</p>
      </div>

      {/* Image Crop Dialog */}
      {tempImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
        <Card className="mt-6">
        <CardContent className="space-y-4">
          <div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          name="dataNascimento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Nascimento *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
          name="systemRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil no Sistema *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(SYSTEM_ROLE_LABELS) as SystemRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {SYSTEM_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Dados Bancários / PIX */}
     <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados Bancários / PIX</CardTitle>
          <CardDescription>Onde o funcionário receberá seu salário</CardDescription>
        </CardHeader>
            <p className="text-xs font-medium text-muted-foreground mb-3">Chave PIX</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pixKeyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Chave</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[]).map((type) => (
                          <SelectItem key={type} value={type}>{PIX_KEY_TYPE_LABELS[type]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pixKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave PIX</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 11999999999 ou email@empresa.com"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Conta Bancária (TED/DOC)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco</FormLabel>
                    <FormControl>
                      <BankSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v || null)} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(BANK_ACCOUNT_TYPE_LABELS) as BankAccountType[]).map((type) => (
                          <SelectItem key={type} value={type}>{BANK_ACCOUNT_TYPE_LABELS[type]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0001"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="12345-6"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFinancialFields = () => {
    const showCharges = showsChargesSection(tipoContratacao as ContractType);
    const showProvisions = showsProvisionsSection(tipoContratacao as ContractType);
    const baseLabel = getBaseFieldLabel(tipoContratacao as ContractType);
    
    const subtotalSalarial = costBreakdown
      ? costBreakdown.baseAmount + costBreakdown.chargesAmount + costBreakdown.provisionsAmount
      : 0;
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dados da Contratação</CardTitle>
          <CardDescription>
            Configure o tipo de vínculo e valores do funcionário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo e Jornada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              name="jornadaDiaria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jornada Diária (horas) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="8"
                      min={1}
                      max={24}
                      {...field}
                      onChange={(e) => {
                        const daily = parseInt(e.target.value) || 0;
                        field.onChange(daily);
                        const today = new Date();
                        form.setValue('jornadaMensal', getMonthlyHoursFromDaily(daily, today.getFullYear(), today.getMonth(), holidays));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Separator />
          
          {/* Valores - Dinâmico por tipo */}
          <div>
            <h4 className="text-sm font-medium mb-3">Valores</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CLT / Menor Aprendiz: Salário Bruto */}
              {(tipoContratacao === 'CLT' || tipoContratacao === 'MENOR_APRENDIZ') && (
                <FormField
                  control={form.control}
                  name="salarioMensal"
                  render={() => (
                    <FormItem className="col-span-2 md:col-span-1">
                      <FormLabel>{baseLabel} *</FormLabel>
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
              )}

              {/* Estagiário: Bolsa-Auxílio */}
              {tipoContratacao === 'ESTAGIO' && (
                <FormField
                  control={form.control}
                  name="bolsaAuxilio"
                  render={() => (
                    <FormItem className="col-span-2 md:col-span-1">
                      <FormLabel>{baseLabel} *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          value={bolsaAuxilioDisplay}
                          onChange={(e) => handleCurrencyChange(e, 'bolsaAuxilio', setBolsaAuxilioDisplay)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* PJ: Valor Mensal do Contrato */}
              {tipoContratacao === 'PJ' && (
                <FormField
                  control={form.control}
                  name="valorContratoPj"
                  render={() => (
                    <FormItem className="col-span-2 md:col-span-1">
                      <FormLabel>{baseLabel} *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="R$ 0,00"
                          value={valorContratoPjDisplay}
                          onChange={(e) => handleCurrencyChange(e, 'valorContratoPj', setValorContratoPjDisplay)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Sócio: Pró-Labore + Dividendos */}
              {tipoContratacao === 'SOCIO' && (
                <>
                  <FormField
                    control={form.control}
                    name="proLabore"
                    render={() => (
                      <FormItem>
                        <FormLabel>Pró-Labore (mensal)</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="dividendos"
                    render={() => (
                      <FormItem>
                        <FormLabel>Dividendos (mensal)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="R$ 0,00"
                            value={dividendosDisplay}
                            onChange={(e) => handleCurrencyChange(e, 'dividendos', setDividendosDisplay)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="col-span-2 text-xs text-muted-foreground">
                    * Preencha Pró-Labore e/ou Dividendos. Encargos incidem apenas sobre Pró-Labore.
                  </p>
                </>
              )}
            </div>
          </div>
          
          {/* Encargos e Provisões - Se aplicável */}
          {(showCharges || showProvisions) && tipoContratacao !== 'PJ' && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {tipoContratacao === 'ESTAGIO' ? 'Provisões' : 'Encargos e Provisões'}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Calculados automaticamente
                </p>
                
                {/* Encargos sobre Salário */}
                {showCharges && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Encargos sobre Salário</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>FGTS ({tipoContratacao === 'MENOR_APRENDIZ' ? '2%' : '8%'})</FormLabel>
                        <Input disabled value={formatCurrency(costBreakdown?.details.fgts || 0)} className="bg-muted" />
                      </FormItem>
                      {(costBreakdown?.details.inss || 0) > 0 && (
                        <FormItem>
                          <FormLabel>INSS Patronal</FormLabel>
                          <Input disabled value={formatCurrency(costBreakdown?.details.inss || 0)} className="bg-muted" />
                        </FormItem>
                      )}
                      {(costBreakdown?.details.inssFuncionario || 0) > 0 && (
                        <FormItem>
                          <FormLabel>INSS do Funcionário (retido)</FormLabel>
                          <Input disabled value={formatCurrency(costBreakdown?.details.inssFuncionario || 0)} className="bg-muted" />
                        </FormItem>
                      )}
                    </div>
                    {(costBreakdown?.details.inssFuncionario || 0) > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Descontado do salário bruto e recolhido pela empresa mensalmente ao INSS —
                        não é somado ao custo total, pois já está incluso na Base.
                      </p>
                    )}
                  </div>
                )}

                {/* Provisões Mensais */}
                {showProvisions && tipoContratacao !== 'SOCIO' && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Provisões Mensais</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tipoContratacao === 'ESTAGIO' ? (
                        <FormItem>
                          <FormLabel>Provisão Recesso 1/12</FormLabel>
                          <Input disabled value={formatCurrency(costBreakdown?.details.provisaoRecesso || 0)} className="bg-muted" />
                        </FormItem>
                      ) : (
                        <>
                          <FormItem>
                            <FormLabel>13º prop. 1/12</FormLabel>
                            <Input disabled value={formatCurrency(costBreakdown?.details.provisao13 || 0)} className="bg-muted" />
                          </FormItem>
                          <FormItem>
                            <FormLabel>Férias prop. 1/12</FormLabel>
                            <Input disabled value={formatCurrency(costBreakdown?.details.provisaoFeriasBase || 0)} className="bg-muted" />
                          </FormItem>
                          <FormItem>
                            <FormLabel>1/3 de Férias</FormLabel>
                            <Input disabled value={formatCurrency(costBreakdown?.details.provisaoFeriasTerco || 0)} className="bg-muted" />
                          </FormItem>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Encargos sobre Provisões */}
                {showCharges && showProvisions && tipoContratacao !== 'ESTAGIO' && tipoContratacao !== 'SOCIO' && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Encargos sobre Provisões</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>FGTS 13º (prov)</FormLabel>
                        <Input disabled value={formatCurrency(costBreakdown?.details.fgts13 || 0)} className="bg-muted" />
                      </FormItem>
                      <FormItem>
                        <FormLabel>FGTS Férias (prov)</FormLabel>
                        <Input disabled value={formatCurrency(costBreakdown?.details.fgtsFerias || 0)} className="bg-muted" />
                      </FormItem>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* PJ - Mensagem informativa */}
          {tipoContratacao === 'PJ' && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Para contratos PJ, não há encargos trabalhistas ou provisões a calcular.
              </p>
            </>
          )}
          
          {/* Resumo Integrado */}
          {costBreakdown && (
            <>
              <Separator />
              <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Resumo de Custo
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Base</span>
                  <span className="text-right font-medium">
                    {formatCurrency(costBreakdown.baseAmount)}
                  </span>
                  <span className="text-muted-foreground">Encargos</span>
                  <span className="text-right font-medium">
                    {formatCurrency(costBreakdown.chargesAmount)}
                  </span>
                  <span className="text-muted-foreground">Provisões</span>
                  <span className="text-right font-medium">
                    {formatCurrency(costBreakdown.provisionsAmount)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>SUBTOTAL SALARIAL</span>
                  <span className="text-primary">
                    {formatCurrency(subtotalSalarial)}
                  </span>
                </div>
              </div>
            </>
          )}
          
          {/* Aviso compacto e centralizado */}
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cálculo estimado; valide com contabilidade.
          </p>
        </CardContent>
      </Card>
    );
  };

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

  const renderEditTabs = () => (
    <Tabs defaultValue="dados" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="dados" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Dados</span>
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Contratação</span>
        </TabsTrigger>
        <TabsTrigger value="beneficios" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Benefícios</span>
        </TabsTrigger>
        <TabsTrigger value="ferramentas" className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Ferramentas</span>
        </TabsTrigger>
        <TabsTrigger value="historico" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Histórico</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="dados" className="mt-4">
        {renderPersonalDataFields()}
      </TabsContent>
      <TabsContent value="financeiro" className="mt-4">
        {renderFinancialFields()}
        
        {/* Info about automatic versioning */}
        <Alert className="mt-4 border-primary/30 bg-primary/5">
          <History className="h-4 w-4" />
          <AlertDescription>
            Alterações em valores financeiros (salário, encargos, jornada, cargo) criam automaticamente um novo marco, 
            preservando os dados anteriores para orçamentos e projetos passados.
          </AlertDescription>
        </Alert>
      </TabsContent>
      <TabsContent value="beneficios" className="mt-4">
        {employee && <EmployeeBenefitsTable employeeId={employee.id} employeeName={employee.nome} />}
      </TabsContent>
      <TabsContent value="ferramentas" className="mt-4">
        {employee && <EmployeeToolsTable employeeId={employee.id} employeeName={employee.nome} />}
      </TabsContent>
      <TabsContent value="historico" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </CardTitle>
            <CardDescription>
              Veja todas as alterações financeiras feitas ao longo do tempo. Cada versão preserva os dados usados em orçamentos e projetos daquele período.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeVersionsTable versions={versions} isLoading={versionsLoading} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">
                {isEditing ? 'Editar Funcionário' : 'Novo Funcionário'}
              </DialogTitle>
              {isEditing && employee && (() => {
                switch (employee.status) {
                  case 'ativo':
                    return (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600/80">
                        Ativo
                      </Badge>
                    );
                  case 'aguardando_confirmacao':
                    return (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                        <Clock className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                    );
                  case 'bloqueado':
                    return (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />
                        Bloqueado
                      </Badge>
                    );
                  default:
                    return <Badge variant="secondary">{employee.status}</Badge>;
                }
              })()}
            </div>
            <DialogDescription>
              {isEditing
                ? 'Atualize as informações do funcionário.'
                : `Etapa ${currentStep + 1} de ${STEPS.length}: ${STEPS[currentStep].label}`}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
              {isEditing ? (
                // Edit mode: Traditional tabs
                <div className="min-h-[300px]">
                  {renderEditTabs()}
                </div>
              ) : (
                // Create mode: Wizard steps
                <>
                  {renderStepIndicator()}
                  <div className="min-h-[300px]">
                    {renderCurrentStep()}
                  </div>
                </>
              )}

              <div className="flex justify-between gap-3 pt-4 mt-4 border-t">
                <div>
                  {!isEditing && currentStep > 0 && (
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
                  {!isEditing && isLastStep ? (
                    <Button 
                      type="button" 
                      disabled={isLoading}
                      onClick={form.handleSubmit(handleSubmit)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Finalizar Cadastro
                        </>
                      )}
                    </Button>
                  ) : !isEditing ? (
                    <Button type="button" onClick={handleNext}>
                      Próximo
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      disabled={isLoading}
                      onClick={form.handleSubmit(handleSubmit)}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar Alterações'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados preenchidos serão perdidos. Tem certeza que deseja sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version Confirmation Dialog with Date Picker */}
      <AlertDialog open={versionConfirmOpen} onOpenChange={(open) => {
        setVersionConfirmOpen(open);
        if (!open) setPendingSubmitData(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Marco Financeiro</AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos alterações em campos financeiros (jornada, salário, cargo, etc).
              A partir de quando esta mudança é válida?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Data de Vigência</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !versionEffectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {versionEffectiveDate
                    ? format(versionEffectiveDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={versionEffectiveDate}
                  onSelect={(date) => date && setVersionEffectiveDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleVersionConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeFormDialog;
