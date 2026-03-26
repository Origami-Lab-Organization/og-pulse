import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import DOMPurify from "dompurify";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Upload,
  FileText,
  X,
  CheckCircle2,
  Send,
  MapPin,
  Briefcase,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Star,
  BookOpen,
  TrendingUp,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jobApplicationService } from "@/services/jobApplicationService";
import { jobOpeningService } from "@/services/jobOpeningService";
import {
  JobOpeningDB,
  RegimeContratacao,
  Modalidade,
  REGIME_LABELS,
  MODALIDADE_LABELS
} from "@/types/jobOpening";
import logo from "@/assets/logo.png";

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone é obrigatório"),
  linkedin: z.string().optional(),
  motivacao: z.string().min(1, "Conte um pouco sobre suas motivações")
});

type FormValues = z.infer<typeof schema>;

function SafeHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

const REGIME_BADGE_CLASSES: Record<RegimeContratacao, string> = {
  clt: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  pj: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  estagio:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  "clt-pj":
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800"
};

const MODALIDADE_BADGE_CLASSES: Record<Modalidade, string> = {
  remoto:
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
  hibrido:
    "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
  presencial:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800"
};

function formatSalary(de: number | null, ate: number | null) {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  if (de && ate)
    return { de: `R$ ${fmt(de)}`, ate: `R$ ${fmt(ate)}`, single: null };
  if (de) return { de: null, ate: null, single: `A partir de R$ ${fmt(de)}` };
  if (ate) return { de: null, ate: null, single: `Até R$ ${fmt(ate)}` };
  return null;
}

function SalaryBadge({ vaga }: { vaga: JobOpeningDB }) {
  if (vaga.nao_divulgar_salario) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 border border-slate-200 px-3 py-1.5 dark:bg-slate-800/50 dark:border-slate-700">
        <DollarSign className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          A combinar
        </span>
      </div>
    );
  }
  const salary = formatSalary(vaga.salario_de, vaga.salario_ate);
  if (!salary) return null;

  if (salary.single) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 dark:bg-emerald-950/40 dark:border-emerald-800">
        <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {salary.single}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 dark:bg-emerald-950/40 dark:border-emerald-800">
      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {salary.de}
        </span>
        <span className="text-xs text-emerald-500 dark:text-emerald-500 font-medium">
          à
        </span>
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {salary.ate}
        </span>
      </div>
    </div>
  );
}

const SECTION_ICONS = {
  sobre: BookOpen,
  responsabilidades: ListChecks,
  requisitos: Star,
  diferenciais: TrendingUp
};

function VagaCard({ vaga }: { vaga: JobOpeningDB }) {
  const [expanded, setExpanded] = useState(true);
  const hasSalary =
    vaga.nao_divulgar_salario || vaga.salario_de || vaga.salario_ate;

  return (
    <Card className="w-full max-w-[620px] border-primary/20 overflow-hidden">
      {/* Accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

      <CardHeader className="pb-3 pt-5">
        {/* Flags row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              REGIME_BADGE_CLASSES[vaga.regime_contratacao]
            )}
          >
            {REGIME_LABELS[vaga.regime_contratacao]}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              MODALIDADE_BADGE_CLASSES[vaga.modalidade]
            )}
          >
            {MODALIDADE_LABELS[vaga.modalidade]}
          </span>
          {vaga.senioridade && (
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700">
              {vaga.senioridade}
            </span>
          )}
        </div>

        <CardTitle className="text-xl leading-snug">{vaga.titulo}</CardTitle>
        <CardDescription className="text-sm font-medium text-foreground/70">
          {vaga.area}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-5">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {vaga.localizacao && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {vaga.localizacao}
            </span>
          )}
          {vaga.beneficios && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {vaga.beneficios}
            </span>
          )}
        </div>

        {/* Salary highlight */}
        {hasSalary && <SalaryBadge vaga={vaga} />}

        {/* Expandable description */}
        {vaga.sobre_a_vaga && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Ocultar descrição
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver descrição da vaga
                </>
              )}
            </button>

            {expanded && (
              <div className="mt-3 space-y-4 text-sm border-t pt-4">
                {/* Sobre a vaga */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <SECTION_ICONS.sobre className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="font-semibold text-foreground">
                      Sobre a vaga
                    </p>
                  </div>
                  <SafeHtml
                    html={vaga.sobre_a_vaga}
                    className="text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic"
                  />
                </div>

                {vaga.responsabilidades && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <SECTION_ICONS.responsabilidades className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="font-semibold text-foreground">
                        Responsabilidades
                      </p>
                    </div>
                    <SafeHtml
                      html={vaga.responsabilidades}
                      className="text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold"
                    />
                  </div>
                )}

                {vaga.requisitos_obrigatorios && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <SECTION_ICONS.requisitos className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="font-semibold text-foreground">
                        Requisitos
                      </p>
                    </div>
                    <SafeHtml
                      html={vaga.requisitos_obrigatorios}
                      className="text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_b]:font-semibold [&_strong]:font-semibold"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const JobApplicationVaga = () => {
  const { tenantId, vagaId } = useParams<{
    tenantId: string;
    vagaId: string;
  }>();
  const { theme, setTheme } = useTheme();

  const [vaga, setVaga] = useState<JobOpeningDB | null>(null);
  const [vagaLoading, setVagaLoading] = useState(true);
  const [vagaError, setVagaError] = useState(false);

  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!vagaId) {
      setVagaLoading(false);
      setVagaError(true);
      return;
    }
    jobOpeningService
      .getPublic(vagaId)
      .then((data) => {
        if (!data) setVagaError(true);
        else setVaga(data);
      })
      .catch(() => setVagaError(true))
      .finally(() => setVagaLoading(false));
  }, [vagaId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      linkedin: "",
      motivacao: ""
    }
  });

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Formato não aceito. Use PDF ou DOCX.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("O arquivo excede o limite de 5MB.");
      return;
    }
    setCurriculo(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    if (!tenantId) return;
    if (!curriculo) {
      setFileError("Currículo é obrigatório.");
      return;
    }
    setIsSubmitting(true);
    try {
      await jobApplicationService.create(
        {
          nome: values.nome,
          email: values.email,
          telefone: values.telefone,
          linkedin: values.linkedin,
          motivacao: values.motivacao,
          ...(curriculo && { curriculo }),
          ...(vaga && {
            vaga_id: vaga.id,
            vaga_titulo: vaga.titulo,
            responsavel_id: vaga.responsavel_id ?? null
          })
        },
        tenantId
      );
      setSubmitted(true);
    } catch {
      form.setError("root", {
        message: "Ocorreu um erro ao enviar sua candidatura. Tente novamente."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tenantId || (!vagaLoading && vagaError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6 pb-6">
            <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Vaga não encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Esta vaga não está mais disponível ou o link é inválido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (vagaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Candidatura enviada!
              </p>
              {vaga && (
                <p className="text-sm font-medium text-primary mt-0.5">
                  {vaga.titulo}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                Obrigado pelo interesse. Analisaremos sua candidatura e
                entraremos em contato em breve.
              </p>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-xs text-muted-foreground uppercase tracking-widest">
          © ORIGAMI LAB
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background p-4 py-10">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="fixed top-4 right-4 z-50 rounded-full p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Alternar tema"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {/* Logo header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <img src={logo} alt="Origami" className="h-5 w-5 object-contain" />
        </div>
        <span className="font-semibold text-foreground text-lg">
          Origami Lab
        </span>
      </div>

      {/* Vaga card */}
      {vaga && <VagaCard vaga={vaga} />}

      <Separator className="my-6 w-full max-w-[620px]" />

      {/* Application form */}
      <Card className="w-full max-w-[620px]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Candidatar-se</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para enviar sua candidatura
            {vaga ? ` para a vaga de ${vaga.titulo}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome completo <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        E-mail <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Telefone <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(37) 9 9999-9999"
                          {...field}
                          onChange={(e) =>
                            field.onChange(maskPhone(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="linkedin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      LinkedIn{" "}
                      <span className="text-muted-foreground font-normal">
                        (opcional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/in/perfil"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motivacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Por que você quer trabalhar na Origami?{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Conte sobre suas motivações e como você pode contribuir..."
                        className="resize-none min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currículo */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium leading-none">
                  Anexar currículo <span className="text-destructive">*</span>{" "}
                  <span className="text-muted-foreground font-normal">
                    (PDF ou DOCX)
                  </span>
                </p>
                {curriculo ? (
                  <div className="flex items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{curriculo.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurriculo(null)}
                      className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-7 cursor-pointer transition-colors",
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-input bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                    <p className="text-sm text-center">
                      <span className="font-medium">Clique para enviar</span>{" "}
                      <span className="text-muted-foreground">
                        ou arraste o arquivo
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">
                      PDF, DOCX (Max. 5MB)
                    </p>
                  </div>
                )}
                {fileError && (
                  <p className="text-sm font-medium text-destructive">
                    {fileError}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive text-center">
                  {form.formState.errors.root.message}
                </p>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar candidatura
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="mt-8 text-xs text-muted-foreground uppercase tracking-widest">
        © ORIGAMI LAB
      </p>
    </div>
  );
};

export default JobApplicationVaga;
