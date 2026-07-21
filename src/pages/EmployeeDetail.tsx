import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Employee,
  useEmployeeById,
  useEmployeeVersions,
  useUpdateEmployee,
  useEmployeeBenefits,
  useEmployeeTools,
} from "@/hooks/useEmployees";
import { CreateEmployeeInput } from "@/services/employeeService";
import {
  ContractType,
  CONTRACT_TYPE_LABELS,
  SystemRole,
  SYSTEM_ROLE_LABELS,
  PixKeyType,
  PIX_KEY_TYPE_LABELS,
  BankAccountType,
  BANK_ACCOUNT_TYPE_LABELS,
} from "@/types/employee";
import { usePayrollProfile } from "@/hooks/usePayrollProfile";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateEmployeeCost,
  CostBreakdown,
  getBaseFieldLabel,
  showsChargesSection,
  showsProvisionsSection,
} from "@/lib/employeeCostCalculator";
import { getMonthlyHoursFromDaily } from "@/lib/employeeCost";
import { useHolidays } from "@/hooks/useHolidays";
import { formatCurrency, todayLocalDateString } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Wrench,
  Heart,
  User,
  Briefcase,
  History,
  Calculator,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Clock,
  Ban,
  CalendarIcon,
  ArrowLeft,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  formatPhone,
  formatCPF,
  formatCurrency as formatCurrencyMask,
  parseCurrency,
  validateCPF,
} from "@/lib/masks";
import { EmployeeToolsTable } from "@/components/employees/EmployeeToolsTable";
import { EmployeeBenefitsTable } from "@/components/employees/EmployeeBenefitsTable";
import { EmployeeVersionsTable } from "@/components/employees/EmployeeVersionsTable";
import { BankSelect } from "@/components/employees/BankSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";

// ─── Schema (idêntico ao EmployeeFormDialog) ──────────────────────────────────

const baseFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  telefone: z.string().min(10, "Telefone é obrigatório"),
  cargo: z.string().min(1, "Cargo é obrigatório"),
  cpf: z
    .string()
    .min(11, "CPF é obrigatório")
    .refine((val) => validateCPF(val), {
      message: "CPF inválido",
    }),
  dataAdmissao: z.string().min(1, "Data de admissão é obrigatória"),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  fotoUrl: z.string().optional(),
  isGerente: z.boolean(),
  systemRole: z.enum(["admin", "manager", "user"] as const),
  status: z.enum([
    "ativo",
    "aguardando_confirmacao",
    "bloqueado",
    "arquivado",
    "desligado",
    "em_desligamento",
  ]),
  tipoContratacao: z.enum([
    "SOCIO",
    "CLT",
    "PJ",
    "MENOR_APRENDIZ",
    "ESTAGIO",
  ] as const),
  jornadaMensal: z.number().min(1),
  jornadaDiaria: z.number().min(1).max(24),
  salarioMensal: z.number().min(0),
  bolsaAuxilio: z.number().min(0),
  valorContratoPj: z.number().min(0),
  proLabore: z.number().min(0),
  dividendos: z.number().min(0),
  fgts: z.number().min(0),
  inssEmpresa: z.number().min(0),
  decimoTerceiro: z.number().min(0),
  ferias: z.number().min(0),
  beneficios: z.number().min(0),
  encargos: z.number().min(0),
  pixKeyType: z
    .enum(["cpf", "cnpj", "telefone", "email", "aleatoria"])
    .nullable()
    .optional(),
  pixKey: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAgency: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  bankAccountType: z.enum(["corrente", "poupanca"]).nullable().optional(),
});

const formSchema = baseFormSchema.refine(
  (data) => {
    switch (data.tipoContratacao) {
      case "CLT":
      case "MENOR_APRENDIZ":
        return data.salarioMensal > 0;
      case "ESTAGIO":
        return data.bolsaAuxilio > 0;
      case "PJ":
        return data.valorContratoPj > 0;
      case "SOCIO":
        return data.proLabore > 0 || data.dividendos > 0;
      default:
        return true;
    }
  },
  {
    message: "Preencha o valor base conforme o tipo de contratação",
    path: ["salarioMensal"],
  },
);

type FormData = z.infer<typeof baseFormSchema>;

type SubmitPayload = Partial<CreateEmployeeInput>;

// ─── Page ─────────────────────────────────────────────────────────────────────

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { employee: currentEmployee } = useAuth();

  const { data: employee, isLoading: loadingEmployee } = useEmployeeById(id);
  const { data: versions = [], isLoading: versionsLoading } =
    useEmployeeVersions(id);
  const { data: payrollProfile } = usePayrollProfile();
  const { data: holidays = [] } = useHolidays();
  const { data: employeeBenefits = [] } = useEmployeeBenefits(id);
  const { data: employeeTools = [] } = useEmployeeTools(id);
  const updateEmployee = useUpdateEmployee();

  const benefitsTotalMonthly = employeeBenefits.reduce((sum, b) => sum + Number(b.monthly_value), 0);
  const toolsTotalMonthly = employeeTools.reduce((sum, t) => sum + Number(t.monthly_cost), 0);

  // Version confirmation state
  const [versionConfirmOpen, setVersionConfirmOpen] = useState(false);
  const [versionEffectiveDate, setVersionEffectiveDate] = useState<Date>(
    new Date(),
  );
  const [pendingSubmitData, setPendingSubmitData] =
    useState<SubmitPayload | null>(null);

  // Cost breakdown
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(
    null,
  );

  // Photo state
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // Masked display values
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [cpfDisplay, setCpfDisplay] = useState("");
  const [salarioDisplay, setSalarioDisplay] = useState("");
  const [bolsaAuxilioDisplay, setBolsaAuxilioDisplay] = useState("");
  const [valorContratoPjDisplay, setValorContratoPjDisplay] = useState("");
  const [proLaboreDisplay, setProLaboreDisplay] = useState("");
  const [dividendosDisplay, setDividendosDisplay] = useState("");
  const [fgtsDisplay, setFgtsDisplay] = useState("");
  const [decimoDisplay, setDecimoDisplay] = useState("");
  const [feriasDisplay, setFeriasDisplay] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      cargo: "",
      cpf: "",
      dataAdmissao: todayLocalDateString(),
      dataNascimento: "",
      fotoUrl: "",
      isGerente: false,
      systemRole: "user",
      status: "aguardando_confirmacao",
      tipoContratacao: "CLT",
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

  const tipoContratacao = form.watch("tipoContratacao");
  const salarioMensal = form.watch("salarioMensal");
  const bolsaAuxilio = form.watch("bolsaAuxilio");
  const valorContratoPj = form.watch("valorContratoPj");
  const proLabore = form.watch("proLabore");
  const dividendos = form.watch("dividendos");
  const systemRole = form.watch("systemRole");

  // Sync isGerente based on systemRole
  useEffect(() => {
    if (systemRole === "admin" || systemRole === "manager") {
      form.setValue("isGerente", true);
    } else {
      form.setValue("isGerente", false);
    }
  }, [systemRole, form]);

  // Populate form when employee loads
  useEffect(() => {
    if (!employee) return;
    form.reset({
      nome: employee.nome,
      email: employee.email,
      telefone: employee.telefone || "",
      cargo: employee.cargo,
      cpf: employee.cpf || "",
      dataAdmissao: employee.dataAdmissao,
      dataNascimento: employee.dataNascimento || "",
      fotoUrl: employee.fotoUrl || "",
      isGerente: employee.isGerente,
      systemRole: employee.systemRole || "user",
      status: employee.status,
      tipoContratacao: employee.tipoContratacao || "CLT",
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
    setFotoPreview(employee.fotoUrl || null);
    setPhoneDisplay(employee.telefone ? formatPhone(employee.telefone) : "");
    setCpfDisplay(employee.cpf ? formatCPF(employee.cpf) : "");
    setSalarioDisplay(
      employee.salarioMensal ? formatCurrency(employee.salarioMensal) : "",
    );
    setBolsaAuxilioDisplay(
      employee.bolsaAuxilio ? formatCurrency(employee.bolsaAuxilio) : "",
    );
    setValorContratoPjDisplay(
      employee.valorContratoPj ? formatCurrency(employee.valorContratoPj) : "",
    );
    setProLaboreDisplay(
      employee.proLabore ? formatCurrency(employee.proLabore) : "",
    );
    setDividendosDisplay(
      employee.dividendos ? formatCurrency(employee.dividendos) : "",
    );
    setFgtsDisplay(employee.fgts ? formatCurrency(employee.fgts) : "");
    setDecimoDisplay(
      employee.decimoTerceiro ? formatCurrency(employee.decimoTerceiro) : "",
    );
    setFeriasDisplay(employee.ferias ? formatCurrency(employee.ferias) : "");
  }, [employee, form]);

  // Auto-calculate costs
  useEffect(() => {
    if (!payrollProfile) return;
    const breakdown = calculateEmployeeCost({
      tipoContratacao: tipoContratacao as ContractType,
      salarioBruto: salarioMensal,
      bolsaAuxilio,
      valorContratoPj,
      proLabore,
      dividendos,
      benefitsTotalMonthly,
      toolsTotalMonthly,
      payrollProfile,
    });
    setCostBreakdown(breakdown);
    form.setValue("fgts", breakdown.details.fgts);
    form.setValue("inssEmpresa", breakdown.details.inss);
    form.setValue(
      "decimoTerceiro",
      breakdown.details.provisao13 || breakdown.details.provisaoRecesso,
    );
    form.setValue("ferias", breakdown.details.provisaoFerias);
    form.setValue("encargos", breakdown.chargesAmount);
    setFgtsDisplay(formatCurrency(breakdown.details.fgts));
    setDecimoDisplay(
      formatCurrency(
        breakdown.details.provisao13 || breakdown.details.provisaoRecesso,
      ),
    );
    setFeriasDisplay(formatCurrency(breakdown.details.provisaoFerias));
  }, [
    tipoContratacao,
    salarioMensal,
    bolsaAuxilio,
    valorContratoPj,
    proLabore,
    dividendos,
    benefitsTotalMonthly,
    toolsTotalMonthly,
    payrollProfile,
    form,
  ]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    form.setValue("telefone", formatted.replace(/\D/g, ""));
  };

  const handleCpfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfDisplay(formatted);
    const cpfClean = formatted.replace(/\D/g, "");
    form.setValue("cpf", cpfClean);
    form.trigger("cpf");

    if (
      cpfClean.length === 11 &&
      validateCPF(cpfClean) &&
      currentEmployee?.tenant_id
    ) {
      const { data: existing } = await supabase
        .from("employees")
        .select("id, nome")
        .eq("tenant_id", currentEmployee.tenant_id)
        .eq("cpf", cpfClean)
        .neq("id", id || "")
        .maybeSingle();

      if (existing) {
        form.setError("cpf", {
          type: "manual",
          message: `CPF já cadastrado para ${existing.nome}`,
        });
      }
    }
  };

  const handleCurrencyChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof FormData,
    setDisplay: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const formatted = formatCurrencyMask(e.target.value);
    setDisplay(formatted);
    form.setValue(field, parseCurrency(formatted) as never);
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Apenas imagens são permitidas",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setTempImageSrc(imageUrl);
    setCropDialogOpen(true);
    event.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    try {
      const fileName = `${Date.now()}-avatar.jpg`;
      const { data, error } = await supabase.storage
        .from("employee-photos")
        .upload(fileName, croppedBlob, { contentType: "image/jpeg" });
      if (error) {
        toast({
          title: "Erro",
          description: "Falha ao enviar foto",
          variant: "destructive",
        });
        return;
      }
      const { data: urlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(data.path);
      form.setValue("fotoUrl", urlData.publicUrl);
      setFotoPreview(urlData.publicUrl);
    } catch {
      toast({
        title: "Erro",
        description: "Falha ao enviar foto",
        variant: "destructive",
      });
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
    form.setValue("fotoUrl", "");
  };

  const buildPayload = (data: FormData): SubmitPayload => {
    const { status: _status, jornadaDiaria, ...rest } = data;
    const today = new Date();
    return {
      ...rest,
      jornadaMensal: getMonthlyHoursFromDaily(jornadaDiaria, today.getFullYear(), today.getMonth(), holidays),
      jornadaDiaria,
      status: employee!.status,
      provisao13: costBreakdown?.details.provisao13 || 0,
      provisaoFerias: costBreakdown?.details.provisaoFerias || 0,
      provisaoRecesso: costBreakdown?.details.provisaoRecesso || 0,
      totalMonthlyCostEstimated: costBreakdown?.totalMonthlyCost || 0,
      totalAnnualCostEstimated: costBreakdown?.totalAnnualCost || 0,
      breakdownJson: costBreakdown || undefined,
      pixKeyType: data.pixKeyType ?? null,
      pixKey: data.pixKey ?? null,
      bankName: data.bankName ?? null,
      bankAgency: data.bankAgency ?? null,
      bankAccount: data.bankAccount ?? null,
      bankAccountType: data.bankAccountType ?? null,
    } as SubmitPayload;
  };

  const handleSubmit = (data: FormData) => {
    if (!employee) return;

    let hasVersionedChanges = false;
    const versionedFields = [
      "salarioMensal",
      "bolsaAuxilio",
      "valorContratoPj",
      "beneficios",
      "encargos",
      "fgts",
      "inssEmpresa",
      "decimoTerceiro",
      "ferias",
      "proLabore",
      "dividendos",
      "jornadaDiaria",
      "jornadaMensal",
      "tipoContratacao",
      "cargo",
      // Dados pessoais — também versionados (mesma tabela employee_versions), para que a aba
      // Histórico reflita qualquer edição cadastral, não só mudanças financeiras.
      "nome",
      "telefone",
      "cpf",
      "dataNascimento",
      "dataAdmissao",
      "fotoUrl",
      "systemRole",
      "isGerente",
      "pixKeyType",
      "pixKey",
      "bankName",
      "bankAccountType",
      "bankAgency",
      "bankAccount",
    ] as const;

    for (const field of versionedFields) {
      if (data[field] !== (employee as any)[field]) {
        hasVersionedChanges = true;
        break;
      }
    }

    if (hasVersionedChanges) {
      setPendingSubmitData(buildPayload(data));
      setVersionEffectiveDate(new Date());
      setVersionConfirmOpen(true);
      return;
    }

    updateEmployee.mutate({
      id: id!,
      updates: buildPayload(data),
      createNewVersion: false,
    });
  };

  const handleVersionConfirm = () => {
    // Evita duplo-clique/duplo-envio criar duas versões sobrepostas para o mesmo marco
    // financeiro (cada uma contaria seu próprio custo/benefícios na folha, dobrando o valor).
    if (!pendingSubmitData || updateEmployee.isPending) return;
    const dateStr = format(versionEffectiveDate, "yyyy-MM-dd");
    updateEmployee.mutate({
      id: id!,
      updates: pendingSubmitData,
      createNewVersion: true,
      effectiveFrom: dateStr,
    });
    setVersionConfirmOpen(false);
    setPendingSubmitData(null);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderPersonalDataFields = () => (
    <div className="space-y-6">
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
          onClick={() =>
            document.getElementById("photo-upload-detail")?.click()
          }
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {fotoPreview ? "Alterar Foto" : "Adicionar Foto"}
        </Button>
        <input
          id="photo-upload-detail"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <p className="text-xs text-muted-foreground">Foto opcional, máx. 5MB</p>
      </div>

      {tempImageSrc && (
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
      <Card >
        
        <CardHeader className="pb-1" />

        <CardContent className="space-y-1">
             <CardTitle className="text-base  ">Dados Pessoais</CardTitle>
            <CardDescription className="mb-1">
                Informações básicas do funcionário — obrigatórias para todos os tipos de contratação
              </CardDescription>
          
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
                        disabled
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
                        {(Object.keys(SYSTEM_ROLE_LABELS) as SystemRole[]).map(
                          (role) => (
                            <SelectItem key={role} value={role}>
                              {SYSTEM_ROLE_LABELS[role]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            </div>
        </CardContent>
      </Card>

            {/* Dados Bancários / PIX */}
             <Card>
        <CardHeader className="pb-1" />

        <CardContent className="space-y-4">
          <div>
            <CardTitle className="text-base m ">Dados Bancários</CardTitle>
            <CardDescription className="mb-2">
                Onde o funcionário receberá seu salário — válido para todos os tipos de contratação
              </CardDescription>

           
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pixKeyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Chave</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v || null)}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[]).map(
                          (type) => (
                            <SelectItem key={type} value={type}>
                              {PIX_KEY_TYPE_LABELS[type]}
                            </SelectItem>
                          ),
                        )}
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
                        value={field.value ?? ""}
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
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Conta Bancária (TED/DOC)
            </p>
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
                    <Select
                      onValueChange={(v) => field.onChange(v || null)}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(
                            BANK_ACCOUNT_TYPE_LABELS,
                          ) as BankAccountType[]
                        ).map((type) => (
                          <SelectItem key={type} value={type}>
                            {BANK_ACCOUNT_TYPE_LABELS[type]}
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
                name="bankAgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0001"
                        value={field.value ?? ""}
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
                        value={field.value ?? ""}
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
    const showProvisions = showsProvisionsSection(
      tipoContratacao as ContractType,
    );
    const baseLabel = getBaseFieldLabel(tipoContratacao as ContractType);
    const subtotalSalarial = costBreakdown
      ? costBreakdown.baseAmount +
        costBreakdown.chargesAmount +
        costBreakdown.provisionsAmount
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
                      {(
                        Object.keys(CONTRACT_TYPE_LABELS) as ContractType[]
                      ).map((type) => (
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
                        form.setValue("jornadaMensal", getMonthlyHoursFromDaily(daily, today.getFullYear(), today.getMonth(), holidays));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Valores</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(tipoContratacao === "CLT" ||
                tipoContratacao === "MENOR_APRENDIZ") && (
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
                          onChange={(e) =>
                            handleCurrencyChange(
                              e,
                              "salarioMensal",
                              setSalarioDisplay,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {tipoContratacao === "ESTAGIO" && (
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
                          onChange={(e) =>
                            handleCurrencyChange(
                              e,
                              "bolsaAuxilio",
                              setBolsaAuxilioDisplay,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {tipoContratacao === "PJ" && (
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
                          onChange={(e) =>
                            handleCurrencyChange(
                              e,
                              "valorContratoPj",
                              setValorContratoPjDisplay,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {tipoContratacao === "SOCIO" && (
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
                            onChange={(e) =>
                              handleCurrencyChange(
                                e,
                                "proLabore",
                                setProLaboreDisplay,
                              )
                            }
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
                            onChange={(e) =>
                              handleCurrencyChange(
                                e,
                                "dividendos",
                                setDividendosDisplay,
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="col-span-2 text-xs text-muted-foreground">
                    * Preencha Pró-Labore e/ou Dividendos. Encargos incidem
                    apenas sobre Pró-Labore.
                  </p>
                </>
              )}
            </div>
          </div>

          {(showCharges || showProvisions) && tipoContratacao !== "PJ" && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {tipoContratacao === "ESTAGIO"
                    ? "Provisões"
                    : "Encargos e Provisões"}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Calculados automaticamente
                </p>

                {showCharges && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Encargos sobre Salário
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>
                          FGTS (
                          {tipoContratacao === "MENOR_APRENDIZ" ? "2%" : "8%"})
                        </FormLabel>
                        <Input
                          disabled
                          value={formatCurrency(
                            costBreakdown?.details.fgts || 0,
                          )}
                          className="bg-muted"
                        />
                      </FormItem>
                      {(costBreakdown?.details.inss || 0) > 0 && (
                        <FormItem>
                          <FormLabel>INSS Patronal</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(
                              costBreakdown?.details.inss || 0,
                            )}
                            className="bg-muted"
                          />
                        </FormItem>
                      )}
                      {(costBreakdown?.details.inssFuncionario || 0) > 0 && (
                        <FormItem>
                          <FormLabel>INSS do Funcionário (retido)</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(
                              costBreakdown?.details.inssFuncionario || 0,
                            )}
                            className="bg-muted"
                          />
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

                {showProvisions && tipoContratacao !== "SOCIO" && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Provisões Mensais
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tipoContratacao === "ESTAGIO" ? (
                        <FormItem>
                          <FormLabel>Provisão Recesso 1/12</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(
                              costBreakdown?.details.provisaoRecesso || 0,
                            )}
                            className="bg-muted"
                          />
                        </FormItem>
                      ) : (
                        <>
                          <FormItem>
                            <FormLabel>13º prop. 1/12</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(
                                costBreakdown?.details.provisao13 || 0,
                              )}
                              className="bg-muted"
                            />
                          </FormItem>
                          <FormItem>
                            <FormLabel>Férias prop. 1/12</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(
                                costBreakdown?.details.provisaoFeriasBase || 0,
                              )}
                              className="bg-muted"
                            />
                          </FormItem>
                          <FormItem>
                            <FormLabel>1/3 de Férias</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(
                                costBreakdown?.details.provisaoFeriasTerco || 0,
                              )}
                              className="bg-muted"
                            />
                          </FormItem>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {showCharges &&
                  showProvisions &&
                  tipoContratacao !== "ESTAGIO" &&
                  tipoContratacao !== "SOCIO" && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Encargos sobre Provisões
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormItem>
                          <FormLabel>FGTS 13º (prov)</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(
                              costBreakdown?.details.fgts13 || 0,
                            )}
                            className="bg-muted"
                          />
                        </FormItem>
                        <FormItem>
                          <FormLabel>FGTS Férias (prov)</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(
                              costBreakdown?.details.fgtsFerias || 0,
                            )}
                            className="bg-muted"
                          />
                        </FormItem>
                      </div>
                    </div>
                  )}
              </div>
            </>
          )}

          {tipoContratacao === "PJ" && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Para contratos PJ, não há encargos trabalhistas ou provisões a
                calcular.
              </p>
            </>
          )}

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

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cálculo estimado; valide com contabilidade.
          </p>
        </CardContent>
      </Card>
    );
  };

  const statusBadge = () => {
    if (!employee) return null;
    switch (employee.status) {
      case "ativo":
        return (
          <Badge className="bg-green-600 hover:bg-green-600/80">Ativo</Badge>
        );
      case "aguardando_confirmacao":
        return (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-600 bg-amber-50"
          >
            <Clock className="h-3 w-3 mr-1" />
            Aguardando
          </Badge>
        );
      case "bloqueado":
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{employee.status}</Badge>;
    }
  };

  // ─── Loading / not found states ───────────────────────────────────────────────

  if (loadingEmployee) {
    return (
      <AppLayout
        title="Funcionário"
        breadcrumbs={[
          { label: "Funcionários", href: "/employees" },
          { label: "..." },
        ]}
      >
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout
        title="Funcionário não encontrado"
        breadcrumbs={[
          { label: "Funcionários", href: "/employees" },
          { label: "Não encontrado" },
        ]}
      >
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-muted-foreground">
            Este funcionário não foi encontrado ou você não tem permissão para
            acessá-lo.
          </p>
          <Button variant="outline" onClick={() => navigate("/employees")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Funcionários
          </Button>
        </div>
      </AppLayout>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <AppLayout
        title={employee.nome}
        breadcrumbs={[
          { label: "Funcionários", href: "/employees" },
          { label: employee.nome },
        ]}
        actions={
          <div className="flex items-center gap-3">
            {statusBadge()}
            <Button
              size="sm"
              disabled={updateEmployee.isPending}
              onClick={form.handleSubmit(handleSubmit)}
            >
              {updateEmployee.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="dados" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Dados</span>
                </TabsTrigger>
                <TabsTrigger
                  value="financeiro"
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">Contratação</span>
                </TabsTrigger>
                <TabsTrigger
                  value="beneficios"
                  className="flex items-center gap-2"
                >
                  <Heart className="h-4 w-4" />
                  <span className="hidden sm:inline">Benefícios</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ferramentas"
                  className="flex items-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Ferramentas</span>
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="mt-4">
                {renderPersonalDataFields()}
              </TabsContent>

              <TabsContent value="financeiro" className="mt-4">
                {renderFinancialFields()}
                <Alert className="mt-4 border-primary/30 bg-primary/5">
                  <History className="h-4 w-4" />
                  <AlertDescription>
                    Alterações em valores financeiros (salário, encargos,
                    jornada, cargo) criam automaticamente um novo marco,
                    preservando os dados anteriores para orçamentos e projetos
                    passados.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="beneficios" className="mt-4">
                <EmployeeBenefitsTable
                  employeeId={employee.id}
                  employeeName={employee.nome}
                />
              </TabsContent>

              <TabsContent value="ferramentas" className="mt-4">
                <EmployeeToolsTable
                  employeeId={employee.id}
                  employeeName={employee.nome}
                />
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Histórico de Versões
                    </CardTitle>
                    <CardDescription>
                      Veja todas as alterações financeiras feitas ao longo do
                      tempo. Cada versão preserva os dados usados em orçamentos
                      e projetos daquele período.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmployeeVersionsTable
                      versions={versions}
                      isLoading={versionsLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </AppLayout>

      {/* Version confirmation dialog */}
      <AlertDialog
        open={versionConfirmOpen}
        onOpenChange={(open) => {
          setVersionConfirmOpen(open);
          if (!open) setPendingSubmitData(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Marco Financeiro</AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos alterações em dados ou contratação (nome, telefone,
              jornada, salário, cargo, etc). A partir de quando esta mudança é válida?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Data de Vigência
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !versionEffectiveDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {versionEffectiveDate
                    ? format(versionEffectiveDate, "dd/MM/yyyy", {
                        locale: ptBR,
                      })
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
            <AlertDialogCancel disabled={updateEmployee.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleVersionConfirm} disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? "Salvando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeDetail;
