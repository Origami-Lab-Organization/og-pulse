import { useEffect, useRef, useState, startTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Send, BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextArea } from "./RichTextArea";
import {
  useCreateJobOpening,
  useUpdateJobOpening
} from "@/hooks/useJobOpenings";
import { useProjectManagers } from "@/hooks/useEmployees";
import {
  JobOpeningDB,
  JobOpeningStatus,
  JOB_AREAS,
  SENIORIDADE_OPTIONS,
  ABOUT_ORIGAMI_LAB_DEFAULT
} from "@/types/jobOpening";

const schema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  area: z.string().min(1, "Área é obrigatória"),
  regime_contratacao: z.enum(["clt", "pj", "estagio", "clt-pj"], {
    required_error: "Regime é obrigatório"
  }),
  modalidade: z.enum(["presencial", "hibrido", "remoto"], {
    required_error: "Modalidade é obrigatória"
  }),
  localizacao: z.string().optional(),
  salario_de: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Deve ser maior que zero").optional()
  ),
  salario_ate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().positive("Deve ser maior que zero").optional()
  ),
  nao_divulgar_salario: z.boolean(),
  beneficios: z.string().optional(),
  sobre_a_vaga: z.string().min(1, "Campo obrigatório"),
  senioridade: z.string().optional(),
  responsabilidades: z.string().min(1, "Campo obrigatório"),
  requisitos_obrigatorios: z.string().min(1, "Campo obrigatório"),
  diferenciais: z.string().optional(),
  sobre_empresa: z.string().min(1, "Campo obrigatório"),
  status: z.enum(["aberta", "rascunho", "encerrada"]),
  prazo_candidaturas: z.string().optional(),
  responsavel_id: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

interface JobOpeningFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOpening?: JobOpeningDB | null;
}

const DEFAULT_VALUES: FormValues = {
  titulo: "",
  area: "",
  regime_contratacao: "clt",
  modalidade: "remoto",
  localizacao: "",
  salario_de: undefined,
  salario_ate: undefined,
  nao_divulgar_salario: false,
  beneficios: "",
  sobre_a_vaga: "",
  senioridade: "",
  responsabilidades: "",
  requisitos_obrigatorios: "",
  diferenciais: "",
  sobre_empresa: ABOUT_ORIGAMI_LAB_DEFAULT,
  status: "rascunho",
  prazo_candidaturas: "",
  responsavel_id: ""
};

function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  }).format(num / 100);
}

function parseCurrencyToNumber(masked: string): number | undefined {
  const digits = masked.replace(/\D/g, "");
  if (!digits) return undefined;
  const num = parseInt(digits, 10);
  return num === 0 ? undefined : num / 100;
}

function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00"
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const toDisplay = (v: number | undefined) =>
    v != null ? maskCurrency(String(Math.round(v * 100))) : "";

  const [display, setDisplay] = useState(() => toDisplay(value));
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setDisplay(toDisplay(value));
    }
  }, [value]);

  return (
    <Input
      value={display}
      onChange={(e) => {
        const masked = maskCurrency(e.target.value);
        setDisplay(masked);
        onChange(parseCurrencyToNumber(masked));
      }}
      placeholder={placeholder}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-start text-xs uppercase">
        <span className="bg-background pr-3 text-muted-foreground font-semibold tracking-wider">
          {children}
        </span>
      </div>
    </div>
  );
}

export function JobOpeningFormSheet({
  open,
  onOpenChange,
  jobOpening
}: JobOpeningFormSheetProps) {
  const createJobOpening = useCreateJobOpening();
  const updateJobOpening = useUpdateJobOpening();
  const { data: managers = [] } = useProjectManagers();
  const submitActionRef = useRef<"draft" | "publish">("draft");

  const isEditing = !!jobOpening;
  const isPending = createJobOpening.isPending || updateJobOpening.isPending;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES
  });

  const naoSalario = form.watch("nao_divulgar_salario");

  // Reset form when sheet opens or job opening changes
  useEffect(() => {
    if (open) {
      startTransition(() => {
        if (jobOpening) {
          form.reset({
            titulo: jobOpening.titulo,
            area: jobOpening.area,
            regime_contratacao: jobOpening.regime_contratacao,
            modalidade: jobOpening.modalidade,
            localizacao: jobOpening.localizacao ?? "",
            salario_de: jobOpening.salario_de ?? undefined,
            salario_ate: jobOpening.salario_ate ?? undefined,
            nao_divulgar_salario: jobOpening.nao_divulgar_salario,
            beneficios: jobOpening.beneficios ?? "",
            sobre_a_vaga: jobOpening.sobre_a_vaga,
            senioridade: jobOpening.senioridade ?? "",
            responsabilidades: jobOpening.responsabilidades,
            requisitos_obrigatorios: jobOpening.requisitos_obrigatorios,
            diferenciais: jobOpening.diferenciais ?? "",
            sobre_empresa: jobOpening.sobre_empresa,
            status: jobOpening.status,
            prazo_candidaturas: jobOpening.prazo_candidaturas ?? "",
            responsavel_id: jobOpening.responsavel_id ?? ""
          });
        } else {
          form.reset(DEFAULT_VALUES);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobOpening?.id]);

  const handleClose = () => {
    form.reset(DEFAULT_VALUES);
    onOpenChange(false);
  };

  const onSubmit = async (values: FormValues) => {
    const action = submitActionRef.current;
    const resolvedStatus: JobOpeningStatus =
      action === "publish" ? "aberta" : "rascunho";

    const payload = {
      titulo: values.titulo,
      area: values.area,
      regime_contratacao: values.regime_contratacao,
      modalidade: values.modalidade,
      localizacao: values.localizacao || null,
      salario_de: values.nao_divulgar_salario
        ? null
        : (values.salario_de ?? null),
      salario_ate: values.nao_divulgar_salario
        ? null
        : (values.salario_ate ?? null),
      nao_divulgar_salario: values.nao_divulgar_salario,
      beneficios: values.beneficios || null,
      sobre_a_vaga: values.sobre_a_vaga,
      senioridade: values.senioridade || null,
      responsabilidades: values.responsabilidades,
      requisitos_obrigatorios: values.requisitos_obrigatorios,
      diferenciais: values.diferenciais || null,
      sobre_empresa: values.sobre_empresa,
      status: resolvedStatus,
      prazo_candidaturas: values.prazo_candidaturas || null,
      responsavel_id: values.responsavel_id || null
    };

    if (isEditing) {
      await updateJobOpening.mutateAsync(
        { id: jobOpening.id, updates: payload },
        { onSuccess: handleClose }
      );
    } else {
      await createJobOpening.mutateAsync(payload, { onSuccess: handleClose });
    }
  };

  const handleSaveDraft = () => {
    submitActionRef.current = "draft";
    form.handleSubmit(onSubmit)();
  };

  const handlePublish = () => {
    submitActionRef.current = "publish";
    form.handleSubmit(onSubmit)();
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 w-full sm:max-w-none sm:w-[55vw] sm:min-w-[540px]"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-lg pr-6">
            {isEditing ? "Editar Vaga" : "Nova Vaga"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Atualize as informações da vaga."
              : "Preencha os detalhes da vaga para publicar ou salvar como rascunho."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-5">
                {/* ── SEÇÃO 1: Informações Básicas ── */}
                <SectionLabel>Informações Básicas</SectionLabel>

                {/* Título */}
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da vaga</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Desenvolvedor Full Stack Sênior"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Área + Regime */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a área" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {JOB_AREAS.map((area) => (
                              <SelectItem key={area} value={area}>
                                {area}
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
                    name="regime_contratacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Regime de contratação</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clt">CLT</SelectItem>
                            <SelectItem value="pj">PJ</SelectItem>
                            <SelectItem value="clt-pj">CLT ou PJ</SelectItem>
                            <SelectItem value="estagio">Estágio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Modalidade + Localização */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="modalidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modalidade</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="presencial">
                              Presencial
                            </SelectItem>
                            <SelectItem value="hibrido">Híbrido</SelectItem>
                            <SelectItem value="remoto">Remoto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="localizacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Localização{" "}
                          <span className="text-muted-foreground font-normal">
                            (opcional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Formiga, MG" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Faixa salarial */}
                <div className="space-y-2">
                  <FormLabel>Faixa salarial</FormLabel>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name="nao_divulgar_salario"
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="nao-divulgar"
                          />
                          <label
                            htmlFor="nao-divulgar"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Não divulgar salário
                          </label>
                        </div>
                      )}
                    />
                  </div>
                  {!naoSalario && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="salario_de"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              De
                            </FormLabel>
                            <FormControl>
                              <CurrencyInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="R$ 5.000,00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salario_ate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Até
                            </FormLabel>
                            <FormControl>
                              <CurrencyInput
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="R$ 10.000,00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Benefícios */}
                <FormField
                  control={form.control}
                  name="beneficios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Benefícios{" "}
                        <span className="text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ex: Vale-refeição, plano de saúde, home office..."
                          className="resize-none min-h-[72px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── SEÇÃO 2: Descrição da Vaga ── */}
                <SectionLabel>Descrição da Vaga</SectionLabel>

                {/* Sobre a vaga */}
                <Controller
                  control={form.control}
                  name="sobre_a_vaga"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Sobre a vaga</FormLabel>
                      <RichTextArea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Descreva o contexto, missão e propósito da vaga..."
                        minHeight="120px"
                        error={!!fieldState.error}
                      />
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Senioridade */}
                <FormField
                  control={form.control}
                  name="senioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Senioridade{" "}
                        <span className="text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o nível" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SENIORIDADE_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Responsabilidades */}
                <Controller
                  control={form.control}
                  name="responsabilidades"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Responsabilidades</FormLabel>
                      <RichTextArea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Liste as principais responsabilidades do cargo..."
                        minHeight="100px"
                        error={!!fieldState.error}
                      />
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Requisitos obrigatórios */}
                <Controller
                  control={form.control}
                  name="requisitos_obrigatorios"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Requisitos obrigatórios</FormLabel>
                      <RichTextArea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Liste os requisitos obrigatórios para a vaga..."
                        minHeight="100px"
                        error={!!fieldState.error}
                      />
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* Diferenciais */}
                <Controller
                  control={form.control}
                  name="diferenciais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Diferenciais{" "}
                        <span className="text-muted-foreground font-normal">
                          (nice to have, opcional)
                        </span>
                      </FormLabel>
                      <RichTextArea
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Conhecimentos ou experiências que são um diferencial..."
                        minHeight="80px"
                      />
                    </FormItem>
                  )}
                />

                {/* Sobre a empresa */}
                <Controller
                  control={form.control}
                  name="sobre_empresa"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Sobre a Origami Lab</FormLabel>
                      <RichTextArea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Descrição da empresa..."
                        minHeight="80px"
                        error={!!fieldState.error}
                      />
                      {fieldState.error && (
                        <p className="text-sm font-medium text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                {/* ── SEÇÃO 3: Configurações ── */}
                <SectionLabel>Configurações</SectionLabel>

                {/* Status */}
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status inicial</FormLabel>
                      <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 w-fit">
                        <button
                          type="button"
                          onClick={() => field.onChange("rascunho")}
                          className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                            field.value === "rascunho"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Rascunho
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("aberta")}
                          className={cn(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                            field.value === "aberta"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Aberta
                        </button>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Prazo para candidaturas */}
                <FormField
                  control={form.control}
                  name="prazo_candidaturas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prazo para candidaturas{" "}
                        <span className="text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Responsável pela vaga */}
                <FormField
                  control={form.control}
                  name="responsavel_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Responsável pela vaga{" "}
                        <span className="text-muted-foreground font-normal">
                          (opcional)
                        </span>
                      </FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">
                            Sem responsável
                          </SelectItem>
                          {managers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <SheetFooter className="px-6 py-4 border-t shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isPending}
                >
                  {isPending && submitActionRef.current === "draft" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BookMarked className="mr-2 h-4 w-4" />
                  )}
                  Salvar como Rascunho
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handlePublish}
                  disabled={isPending}
                >
                  {isPending && submitActionRef.current === "publish" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Publicar Vaga
                </Button>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
