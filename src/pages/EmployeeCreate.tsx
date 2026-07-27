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
import { employeeVersionService } from "@/services/employeeVersionService";
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
} from "@/lib/employeeCostCalculator";
import { getMonthlyHoursFromDaily } from "@/lib/employeeCost";
import { useHolidays } from "@/hooks/useHolidays";
import { formatCurrency, todayLocalDateString, parseDateString } from "@/lib/formatters";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { BankSelect } from "@/components/employees/BankSelect";
import { EmployeeSidebar } from "@/components/employees/EmployeeSidebar";
import { EmployeeCostBreakdownBox } from "@/components/employees/EmployeeCostBreakdownBox";

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
  alocaEmProjetos: z.boolean(),
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
  contratoExperiencia: z.boolean(),
  experienciaPeriodo1Fim: z.string().nullable().optional(),
  experienciaProrrogado: z.boolean(),
  experienciaPeriodo2Fim: z.string().nullable().optional(),
});

const formSchema = baseFormSchema.superRefine((data, ctx) => {
  let salaryOk = true;
  switch (data.tipoContratacao) {
    case "CLT":
    case "MENOR_APRENDIZ":
      salaryOk = data.salarioMensal > 0;
      break;
    case "ESTAGIO":
      salaryOk = data.bolsaAuxilio > 0;
      break;
    case "PJ":
      salaryOk = data.valorContratoPj > 0;
      break;
    case "SOCIO":
      salaryOk = data.proLabore > 0 || data.dividendos > 0;
      break;
  }
  if (!salaryOk) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Preencha o valor base conforme o tipo de contratação",
      path: ["salarioMensal"],
    });
  }

  // Contrato de experiência (CLT Art. 445 §único) — máximo 90 dias, até 2 períodos.
  if (data.tipoContratacao === "CLT" && data.contratoExperiencia) {
    if (!data.experienciaPeriodo1Fim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o fim do 1º período",
        path: ["experienciaPeriodo1Fim"],
      });
    } else if (data.dataAdmissao && data.experienciaPeriodo1Fim <= data.dataAdmissao) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deve ser depois da admissão",
        path: ["experienciaPeriodo1Fim"],
      });
    }

    if (data.experienciaProrrogado) {
      if (!data.experienciaPeriodo2Fim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe o fim do 2º período",
          path: ["experienciaPeriodo2Fim"],
        });
      } else if (data.experienciaPeriodo1Fim && data.experienciaPeriodo2Fim <= data.experienciaPeriodo1Fim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Deve ser depois do fim do 1º período",
          path: ["experienciaPeriodo2Fim"],
        });
      }
    }

    const fimPrevisto = data.experienciaProrrogado ? data.experienciaPeriodo2Fim : data.experienciaPeriodo1Fim;
    if (data.dataAdmissao && fimPrevisto) {
      const dias = Math.round(
        (parseDateString(fimPrevisto).getTime() - parseDateString(data.dataAdmissao).getTime()) / 86400000,
      );
      if (dias > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Período de experiência não pode passar de 90 dias no total",
          path: [data.experienciaProrrogado ? "experienciaPeriodo2Fim" : "experienciaPeriodo1Fim"],
        });
      }
    }
  }
});

type FormData = z.infer<typeof baseFormSchema>;

const STEP_IDS = ["identificacao", "financeiro", "beneficios_ferramentas", "historico"] as const;
type StepId = (typeof STEP_IDS)[number];

const STEP_FIELDS: Partial<Record<StepId, (keyof FormData)[]>> = {
  identificacao: ["nome", "email", "telefone", "cpf", "cargo", "dataNascimento", "dataAdmissao", "systemRole", "alocaEmProjetos"],
  financeiro: [
    "tipoContratacao",
    "jornadaDiaria",
    "salarioMensal",
    "bolsaAuxilio",
    "valorContratoPj",
    "proLabore",
    "dividendos",
    "contratoExperiencia",
    "experienciaPeriodo1Fim",
    "experienciaProrrogado",
    "experienciaPeriodo2Fim",
  ],
};

function daysBetween(startIso: string, endIso: string): number {
  return Math.round((parseDateString(endIso).getTime() - parseDateString(startIso).getTime()) / 86400000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EmployeeCreate = () => {
  const navigate = useNavigate();
  const { employee: currentEmployee } = useAuth();

  const createEmployee = useCreateEmployee();
  const addBenefit = useAddEmployeeBenefit();
  const addTool = useAddEmployeeTool();
  const { data: payrollProfile } = usePayrollProfile();
  const { data: holidays = [] } = useHolidays();

  const [currentStep, setCurrentStep] = useState(0);
  const [localBenefits, setLocalBenefits] = useState<LocalBenefit[]>([]);
  const [localTools, setLocalTools] = useState<LocalTool[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);

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
      alocaEmProjetos: true,
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
      contratoExperiencia: false,
      experienciaPeriodo1Fim: null,
      experienciaProrrogado: false,
      experienciaPeriodo2Fim: null,
    },
  });

  const tipoContratacao = form.watch("tipoContratacao");
  const salarioMensal = form.watch("salarioMensal");
  const bolsaAuxilio = form.watch("bolsaAuxilio");
  const valorContratoPj = form.watch("valorContratoPj");
  const proLabore = form.watch("proLabore");
  const dividendos = form.watch("dividendos");
  const systemRole = form.watch("systemRole");
  const dataAdmissao = form.watch("dataAdmissao");
  const contratoExperiencia = form.watch("contratoExperiencia");
  const experienciaPeriodo1Fim = form.watch("experienciaPeriodo1Fim");
  const experienciaProrrogado = form.watch("experienciaProrrogado");
  const experienciaPeriodo2Fim = form.watch("experienciaPeriodo2Fim");

  useEffect(() => {
    if (systemRole === "admin" || systemRole === "manager") {
      form.setValue("isGerente", true);
    } else {
      form.setValue("isGerente", false);
    }
  }, [systemRole, form]);

  useEffect(() => {
    if (!payrollProfile) return;
    const breakdown = calculateEmployeeCost({
      tipoContratacao: tipoContratacao as ContractType,
      salarioBruto: salarioMensal,
      bolsaAuxilio,
      valorContratoPj,
      proLabore,
      dividendos,
      benefitsTotalMonthly: localBenefits.reduce((s, b) => s + b.monthlyValue, 0),
      toolsTotalMonthly: localTools.reduce((s, t) => s + t.monthlyCost, 0),
      payrollProfile,
    });
    setCostBreakdown(breakdown);
    form.setValue("fgts", breakdown.details.fgts || 0);
    form.setValue("inssEmpresa", breakdown.details.inss || 0);
    form.setValue("decimoTerceiro", breakdown.details.provisao13 || 0);
    form.setValue("ferias", breakdown.details.provisaoFerias || 0);
    form.setValue("beneficios", localBenefits.reduce((s, b) => s + b.monthlyValue, 0));
    form.setValue("encargos", breakdown.chargesAmount);
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

      // Validação manual do contrato de experiência (mesmo motivo: superRefine não roda no trigger parcial)
      if (tipoContratacao === "CLT" && form.getValues("contratoExperiencia")) {
        const admissao = form.getValues("dataAdmissao");
        const periodo1Fim = form.getValues("experienciaPeriodo1Fim");
        const prorrogado = form.getValues("experienciaProrrogado");
        const periodo2Fim = form.getValues("experienciaPeriodo2Fim");

        if (!periodo1Fim) {
          form.setError("experienciaPeriodo1Fim", { type: "manual", message: "Informe o fim do 1º período" });
          return;
        }
        if (admissao && periodo1Fim <= admissao) {
          form.setError("experienciaPeriodo1Fim", { type: "manual", message: "Deve ser depois da admissão" });
          return;
        }
        if (prorrogado) {
          if (!periodo2Fim) {
            form.setError("experienciaPeriodo2Fim", { type: "manual", message: "Informe o fim do 2º período" });
            return;
          }
          if (periodo2Fim <= periodo1Fim) {
            form.setError("experienciaPeriodo2Fim", { type: "manual", message: "Deve ser depois do fim do 1º período" });
            return;
          }
        }
        const fimPrevisto = prorrogado ? periodo2Fim : periodo1Fim;
        if (admissao && fimPrevisto) {
          const dias = Math.round(
            (parseDateString(fimPrevisto).getTime() - parseDateString(admissao).getTime()) / 86400000,
          );
          if (dias > 90) {
            form.setError(prorrogado ? "experienciaPeriodo2Fim" : "experienciaPeriodo1Fim", {
              type: "manual",
              message: "Período de experiência não pode passar de 90 dias no total",
            });
            return;
          }
        }
      }
    }

    setCurrentStep((s) => Math.min(s + 1, STEP_IDS.length - 1));
  };

  const handlePrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const buildPayload = (data: FormData): CreateEmployeeInput => {
    const { status: _status, jornadaDiaria, ...rest } = data;
    const today = new Date();
    return {
      ...rest,
      jornadaMensal: getMonthlyHoursFromDaily(jornadaDiaria, today.getFullYear(), today.getMonth(), holidays),
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

      // Versão de abertura — captura dados/contratação já com admissão como vigência, para
      // a aba Histórico nunca começar vazia (ver createInitialVersion, employeeVersionService.ts).
      try {
        await employeeVersionService.createInitialVersion(newEmployee.id, newEmployee);
      } catch (versionError) {
        console.error("Error creating initial employee version:", versionError);
        // Não bloqueia o cadastro — mesmo padrão de tolerância a falha de versionamento
        // usado em employeeService.ts (o bootstrap lazy em update() cobre esse caso depois).
      }

      navigate(`/employees/${newEmployee.id}`);
    } catch {
      // toast tratado pela mutation onError
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderPersonalDataFields = () => (
    <div className="space-y-6">
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

            <FormField
              control={form.control}
              name="alocaEmProjetos"
              render={({ field }) => (
                <FormItem className="sm:col-span-2 flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-sm font-medium">Aloca em projetos</FormLabel>
                    <FormDescription className="text-xs">
                      Desative para colaboradores que não lançam timesheet (RH, financeiro, backoffice). Eles deixam de aparecer no seletor de alocação e na grade de capacidade, mas continuam na folha e nos relatórios de pessoas.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
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
    const baseLabel = getBaseFieldLabel(tipoContratacao as ContractType);

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

          {tipoContratacao === "CLT" && (
            <>
              <Separator />
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="contratoExperiencia"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-sm font-medium">Contrato de experiência</FormLabel>
                        <FormDescription className="text-xs">
                          Período de até 90 dias (CLT Art. 445 §único), podendo ser dividido em 2 períodos com 1 prorrogação.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {contratoExperiencia && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4">
                    <FormField
                      control={form.control}
                      name="experienciaPeriodo1Fim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fim do 1º período *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ?? ""} />
                          </FormControl>
                          {dataAdmissao && experienciaPeriodo1Fim && (
                            <FormDescription className="text-xs">
                              Duração: {daysBetween(dataAdmissao, experienciaPeriodo1Fim)} dias
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="experienciaProrrogado"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 flex items-center justify-between rounded-lg border p-4">
                          <FormLabel className="text-sm font-medium">Haverá prorrogação (2º período)?</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {experienciaProrrogado && (
                      <FormField
                        control={form.control}
                        name="experienciaPeriodo2Fim"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim do 2º período *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ""} />
                            </FormControl>
                            {dataAdmissao && experienciaPeriodo2Fim && (
                              <FormDescription className="text-xs">
                                Duração total: {daysBetween(dataAdmissao, experienciaPeriodo2Fim)} dias
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <EmployeeCostBreakdownBox
            costBreakdown={costBreakdown}
            tipoContratacao={tipoContratacao as ContractType}
          />
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <EmployeeSidebar
              nome={form.watch("nome")}
              cargo={form.watch("cargo")}
              fotoUrl={form.watch("fotoUrl")}
              onFotoChange={(url) => form.setValue("fotoUrl", url)}
              costBreakdown={costBreakdown}
              tipoContratacao={tipoContratacao as ContractType}
            />

            <div className="min-w-0 flex-1">
              <Tabs value={STEP_IDS[currentStep]} className="w-full">
                <TabsList className="grid w-full grid-cols-4 pointer-events-none">
                  <TabsTrigger value="identificacao" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Identificação</span>
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Contratação</span>
                  </TabsTrigger>
                  <TabsTrigger value="beneficios_ferramentas" className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Benefícios & Ferramentas</span>
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">Histórico</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="identificacao" className="mt-4">
                  {renderPersonalDataFields()}
                </TabsContent>

                <TabsContent value="financeiro" className="mt-4">
                  {renderFinancialFields()}
                </TabsContent>

                <TabsContent value="beneficios_ferramentas" className="mt-4 space-y-6">
                  <EmployeeBenefitsLocalTable
                    benefits={localBenefits}
                    onChange={setLocalBenefits}
                    employeeName={form.watch("nome") || "Funcionário"}
                  />
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
            </div>
          </div>

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
