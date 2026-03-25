import { useState, useCallback, useRef } from "react";
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
import { Loader2, Upload, FileText, X, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { jobApplicationService } from "@/services/jobApplicationService";
import logo from "@/assets/logo.png";

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

const JobApplication = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setIsSubmitting(true);
    try {
      await jobApplicationService.create(
        {
          nome: values.nome,
          email: values.email,
          telefone: values.telefone,
          linkedin: values.linkedin,
          motivacao: values.motivacao,
          ...(curriculo && { curriculo })
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

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <p className="font-medium text-foreground">Link inválido</p>
            <p className="text-sm text-muted-foreground mt-1">
              Este formulário de candidatura não está disponível.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Candidatura enviada!
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Obrigado pelo interesse. Analisaremos sua candidatura e
                entraremos em contato em breve.
              </p>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-xs text-muted-foreground uppercase tracking-widest">
          © ORIGAMI LAB — ARCHITECTURAL INTELLIGENCE
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 py-10">
      <Card className="w-full max-w-[500px]">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <img
                src={logo}
                alt="Origami"
                className="h-7 w-7 object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl">Trabalhe Conosco</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo e faça parte do nosso time.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email + Telefone */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="exemplo@email.com"
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
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(XX) XXXXX-XXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* LinkedIn */}
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

              {/* Motivação */}
              <FormField
                control={form.control}
                name="motivacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Por que você quer trabalhar na Origami?
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Conte um pouco sobre suas motivações..."
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
                  Anexar currículo{" "}
                  <span className="text-muted-foreground font-normal">
                    (PDF ou DOCX)
                  </span>
                </p>

                {curriculo ? (
                  <div className="flex items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate">
                        {curriculo.name}
                      </span>
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
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Clique para enviar</span>{" "}
                      <span className="text-muted-foreground">
                        ou arraste o arquivo
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
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

              {/* Erro geral */}
              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive text-center">
                  {form.formState.errors.root.message}
                </p>
              )}

              {/* Submit */}
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

      <p className="mt-6 text-xs text-muted-foreground uppercase tracking-widest">
        © ORIGAMI LAB
      </p>
    </div>
  );
};

export default JobApplication;
