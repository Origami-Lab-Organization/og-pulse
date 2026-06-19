import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useCreateEmployee,
  useAddEmployeeBenefit,
  useAddEmployeeTool,
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
import { formatCurrency } from "@/lib/formatters";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  formatPhone,
  formatCPF,
  formatCurrency as formatCurrencyMask,
  parseCurrency,
  validateCPF,
} from "@/lib/masks";
import { EmployeeBenefitsLocalTable, LocalBenefit } from "@/components/employees/EmployeeBenefitsLocalTable";
import { EmployeeToolsLocalTable, LocalTool } from "@/components/employees/EmployeeToolsLocalTable";
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
import { BankSelect } from "@/components/employees/BankSelect";

// ─── Schema ──────────────────────────────────────────────────────────────────

const baseFormSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  telefone: z.string().min(10, "Telefone é obrigatório"),
  cargo: z.string().min(1, "Cargo é obrigatório"),
  cpf: z
    .string()
    .min(11, "CPF é obrigatório")
    .refine((val) => validateCPF(val), { message: "CPF inválido" }),
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
  tipoContratacao: z.enum(["SOCIO", "CLT", "PJ", "MENOR_APRENDIZ", "ESTAGIO"] as const),
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
  pixKeyType: z.enum(["cpf", "cnpj", "telefone", "email", "aleatoria"]).nullable().optional(),
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

const STEP_IDS = ["dados", "financeiro", "beneficios", "ferramentas", "historico"] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_FIELDS: Partial<Record<StepId, (keyof FormData)[]>> = {
  dados: ["nome", "email", "telefone", "cpf", "cargo", "dataNascimento", "dataAdmissao", "systemRole"],
  financeiro: ["tipoContratacao", "jornadaDiaria", "salarioMensal", "bolsaAuxilio", "valorContratoPj", "proLabore", "dividendos"],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const EmployeeCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { employee: currentEmployee } = useAuth();

  const createEmployee = useCreateEmployee();
  const addBenefit = useAddEmployeeBenefit();
  const addTool = useAddEmployeeTool();
  const { data: payrollProfile } = usePayrollProfile();

  const [currentStep, setCurrentStep] = useState(0);
  const [localBenefits, setLocalBenefits] = useState<LocalBenefit[]>([]);
  const [localTools, setLocalTools] = useState<LocalTool[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

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
      dataAdmissao: new Date().toISOString().split("T")[0],
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

  useEffect(() => {
    if (systemRole === "admin" || systemRole === "manager") {
      form.setValue("isGerente", true);
    } else {
      form.setValue("isGerente", false);
    }
  }, [systemRole, form]);

  useEffect(() => {
    if (!payrollProfile) return;
    const breakdown = calculateEmployeeCost(
      {
        tipoContratacao: tipoContratacao as ContractType,
        salarioMensal,
        bolsaAuxilio,
        valorContratoPj,
        proLabore,
        dividendos,
        jornadaMensal: form.getValues("jornadaMensal"),
        beneficios: localBenefits.reduce((s, b) => s + b.monthlyValue, 0),
        encargosAdicionais: localTools.reduce((s, t) => s + t.monthlyCost, 0),
      },
      payrollProfile,
    );
    setCostBreakdown(breakdown);
    form.setValue("fgts", breakdown.details.fgts || 0);
    form.setValue("inssEmpresa", breakdown.details.inss || 0);
    form.setValue("decimoTerceiro", breakdown.details.provisao13 || 0);
    form.setValue("ferias", breakdown.details.provisaoFerias || 0);
    form.setValue("beneficios", localBenefits.reduce((s, b) => s + b.monthlyValue, 0));
    form.setValue("encargos", localTools.reduce((s, t) => s + t.monthlyCost, 0));
    setFgtsDisplay(formatCurrencyMask(String(breakdown.details.fgts || 0)));
    setDecimoDisplay(formatCurrencyMask(String(breakdown.details.provisao13 || 0)));
    setFeriasDisplay(formatCurrencyMask(String(breakdown.details.provisaoFerias || 0)));
  }, [
    tipoContratacao,
    salarioMensal,
    bolsaAuxilio,
    valorContratoPj,
    proLabore,
    dividendos,
    localBenefits,
    localTools,
    payrollProfile,
  ]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

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

    if (cpfClean.length === 11 && validateCPF(cpfClean) && currentEmployee?.tenant_id) {
      const { data: existing } = await supabase
        .from("employees")
        .select("id, nome")
        .eq("tenant_id", currentEmployee.tenant_id)
        .eq("cpf", cpfClean)
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
      toast({ title: "Erro", description: "Apenas imagens são permitidas", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "A imagem deve ter no máximo 5MB", variant: "destructive" });
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
        toast({ title: "Erro", description: "Falha ao enviar foto", variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("employee-photos").getPublicUrl(data.path);
      form.setValue("fotoUrl", urlData.publicUrl);
      setFotoPreview(urlData.publicUrl);
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar foto", variant: "destructive" });
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

  const handleNext = async () => {
    const stepId = STEP_IDS[currentStep];
    const fields = STEP_FIELDS[stepId];

    if (fields) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }

    // Validação manual da regra de salário (refine do schema não roda no trigger parcial)
    if (stepId === "financeiro") {
      const { tipoContratacao, salarioMensal, bolsaAuxilio, valorContratoPj, proLabore, dividendos } =
        form.getValues();
      let salaryOk = true;
      switch (tipoContratacao) {
        case "CLT":
        case "MENOR_APRENDIZ":
          salaryOk = salarioMensal > 0;
          break;
        case "ESTAGIO":
          salaryOk = bolsaAuxilio > 0;
          break;
        case "PJ":
          salaryOk = valorContratoPj > 0;
          break;
        case "SOCIO":
          salaryOk = proLabore > 0 || dividendos > 0;
          break;
      }
      if (!salaryOk) {
        form.setError("salarioMensal", {
          type: "manual",
          message: "Preencha o valor base conforme o tipo de contratação",
        });
        return;
      }
    }

    setCurrentStep((s) => Math.min(s + 1, STEP_IDS.length - 1));
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const buildPayload = (data: FormData): CreateEmployeeInput => {
    const { status: _status, jornadaDiaria, ...rest } = data;
    return {
      ...rest,
      jornadaMensal: jornadaDiaria * 22,
      jornadaDiaria,
      status: "aguardando_confirmacao",
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
    } as CreateEmployeeInput;
  };

  const handleSubmit = async (data: FormData) => {
    try {
      const newEmployee = await createEmployee.mutateAsync(buildPayload(data));

      const benefitPromises = localBenefits.map((b) =>
        addBenefit.mutateAsync({
          employeeId: newEmployee.id,
          name: b.name,
          description: b.description || undefined,
          monthlyValue: b.monthlyValue,
        }),
      );
      const toolPromises = localTools.map((t) =>
        addTool.mutateAsync({
          employeeId: newEmployee.id,
          name: t.name,
          description: t.description || undefined,
          monthlyCost: t.monthlyCost,
        }),
      );

      await Promise.all([...benefitPromises, ...toolPromises]);
      navigate(`/employees/${newEmployee.id}`);
    } catch {
      // toast tratado pela mutation onError
    }
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
          onClick={() => document.getElementById("photo-upload-create")?.click()}
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
          id="photo-upload-create"
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados Pessoais</CardTitle>
          <CardDescription>Informações de identificação do funcionário</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <Input type="email" placeholder="joao@empresa.com" {...field} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dados Bancários / PIX</CardTitle>
          <CardDescription>
            Onde o funcionário receberá seu salário — válido para todos os tipos de contratação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Chave PIX</p>
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
                        {(Object.keys(PIX_KEY_TYPE_LABELS) as PixKeyType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {PIX_KEY_TYPE_LABELS[type]}
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
                        {(Object.keys(BANK_ACCOUNT_TYPE_LABELS) as BankAccountType[]).map((type) => (
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
    const showProvisions = showsProvisionsSection(tipoContratacao as ContractType);
    const baseLabel = getBaseFieldLabel(tipoContratacao as ContractType);
    const subtotalSalarial = costBreakdown
      ? costBreakdown.baseAmount + costBreakdown.chargesAmount + costBreakdown.provisionsAmount
      : 0;

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dados da Contratação</CardTitle>
          <CardDescription>Configure o tipo de vínculo e valores do funcionário</CardDescription>
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
                        form.setValue("jornadaMensal", daily * 22);
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
              {(tipoContratacao === "CLT" || tipoContratacao === "MENOR_APRENDIZ") && (
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
                          onChange={(e) => handleCurrencyChange(e, "salarioMensal", setSalarioDisplay)}
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
                          onChange={(e) => handleCurrencyChange(e, "bolsaAuxilio", setBolsaAuxilioDisplay)}
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
                          onChange={(e) => handleCurrencyChange(e, "valorContratoPj", setValorContratoPjDisplay)}
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
                            onChange={(e) => handleCurrencyChange(e, "proLabore", setProLaboreDisplay)}
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
                            onChange={(e) => handleCurrencyChange(e, "dividendos", setDividendosDisplay)}
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

          {(showCharges || showProvisions) && tipoContratacao !== "PJ" && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-1">
                  {tipoContratacao === "ESTAGIO" ? "Provisões" : "Encargos e Provisões"}
                </h4>
                <p className="text-xs text-muted-foreground mb-3">Calculados automaticamente</p>

                {showCharges && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Encargos sobre Salário
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>
                          FGTS ({tipoContratacao === "MENOR_APRENDIZ" ? "2%" : "8%"})
                        </FormLabel>
                        <Input
                          disabled
                          value={formatCurrency(costBreakdown?.details.fgts || 0)}
                          className="bg-muted"
                        />
                      </FormItem>
                      {(costBreakdown?.details.inss || 0) > 0 && (
                        <FormItem>
                          <FormLabel>INSS Patronal</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(costBreakdown?.details.inss || 0)}
                            className="bg-muted"
                          />
                        </FormItem>
                      )}
                    </div>
                  </div>
                )}

                {showProvisions && tipoContratacao !== "SOCIO" && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Provisões Mensais</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tipoContratacao === "ESTAGIO" ? (
                        <FormItem>
                          <FormLabel>Provisão Recesso 1/12</FormLabel>
                          <Input
                            disabled
                            value={formatCurrency(costBreakdown?.details.provisaoRecesso || 0)}
                            className="bg-muted"
                          />
                        </FormItem>
                      ) : (
                        <>
                          <FormItem>
                            <FormLabel>13º prop. 1/12</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(costBreakdown?.details.provisao13 || 0)}
                              className="bg-muted"
                            />
                          </FormItem>
                          <FormItem>
                            <FormLabel>Férias prop. 1/12</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(costBreakdown?.details.provisaoFeriasBase || 0)}
                              className="bg-muted"
                            />
                          </FormItem>
                          <FormItem>
                            <FormLabel>1/3 de Férias</FormLabel>
                            <Input
                              disabled
                              value={formatCurrency(costBreakdown?.details.provisaoFeriasTerco || 0)}
                              className="bg-muted"
                            />
                          </FormItem>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {showCharges && showProvisions && tipoContratacao !== "ESTAGIO" && tipoContratacao !== "SOCIO" && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Encargos sobre Provisões
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>FGTS 13º (prov)</FormLabel>
                        <Input
                          disabled
                          value={formatCurrency(costBreakdown?.details.fgts13 || 0)}
                          className="bg-muted"
                        />
                      </FormItem>
                      <FormItem>
                        <FormLabel>FGTS Férias (prov)</FormLabel>
                        <Input
                          disabled
                          value={formatCurrency(costBreakdown?.details.fgtsFerias || 0)}
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
                Para contratos PJ, não há encargos trabalhistas ou provisões a calcular.
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
                  <span className="text-right font-medium">{formatCurrency(costBreakdown.baseAmount)}</span>
                  <span className="text-muted-foreground">Encargos</span>
                  <span className="text-right font-medium">{formatCurrency(costBreakdown.chargesAmount)}</span>
                  <span className="text-muted-foreground">Provisões</span>
                  <span className="text-right font-medium">{formatCurrency(costBreakdown.provisionsAmount)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>SUBTOTAL SALARIAL</span>
                  <span className="text-primary">{formatCurrency(subtotalSalarial)}</span>
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

  // ─── Render ───────────────────────────────────────────────────────────────────

  const isPending = createEmployee.isPending || addBenefit.isPending || addTool.isPending;

  return (
    <AppLayout
      title="Novo Funcionário"
      breadcrumbs={[
        { label: "Funcionários", href: "/employees" },
        { label: "Novo Funcionário" },
      ]}
      actions={
        <div className="flex items-center gap-3">
          <Badge variant="outline">Novo</Badge>
          <span className="text-sm text-muted-foreground">
            Passo {currentStep + 1} de {STEP_IDS.length}
          </span>
        </div>
      }
    >
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Tabs value={STEP_IDS[currentStep]} className="w-full">
            <TabsList className="grid w-full grid-cols-5 pointer-events-none">
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
            </TabsContent>

            <TabsContent value="beneficios" className="mt-4">
              <EmployeeBenefitsLocalTable
                benefits={localBenefits}
                onChange={setLocalBenefits}
                employeeName={form.watch("nome") || "Funcionário"}
              />
            </TabsContent>

            <TabsContent value="ferramentas" className="mt-4">
              <EmployeeToolsLocalTable
                tools={localTools}
                onChange={setLocalTools}
                employeeName={form.watch("nome") || "Funcionário"}
              />
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    Histórico de Versões
                  </CardTitle>
                  <CardDescription>
                    O histórico financeiro será criado automaticamente após o cadastro.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum histórico disponível para funcionários em cadastro.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Navegação por passos */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              Anterior
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {STEP_IDS.length}
            </span>

            {currentStep < STEP_IDS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Próximo
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isPending}
                onClick={form.handleSubmit(handleSubmit)}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar Funcionário"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </AppLayout>
  );
};

export default EmployeeCreate;
