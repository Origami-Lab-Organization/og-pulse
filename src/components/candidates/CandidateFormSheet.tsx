import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateJobApplication } from '@/hooks/useJobApplications';
import { VagaPretendida, VAGA_PRETENDIDA_LABELS } from '@/types/jobApplication';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const VAGAS_PRETENDIDAS = Object.entries(VAGA_PRETENDIDA_LABELS) as [VagaPretendida, string][];

const schema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(10, 'Telefone é obrigatório'),
  linkedin: z.string().optional(),
  vaga_pretendida: z.enum(
    Object.keys(VAGA_PRETENDIDA_LABELS) as [VagaPretendida, ...VagaPretendida[]]
  ).optional(),
  motivacao: z.string().min(1, 'Campo obrigatório'),
});

type FormValues = z.infer<typeof schema>;

interface CandidateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CandidateFormSheet({ open, onOpenChange }: CandidateFormSheetProps) {
  const [curriculo, setCurriculo] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createCandidate = useCreateJobApplication();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      linkedin: '',
      vaga_pretendida: undefined,
      motivacao: '',
    },
  });

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Formato não aceito. Use PDF ou DOCX.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('O arquivo excede o limite de 5MB.');
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
    e.target.value = '';
  };

  const handleClose = () => {
    form.reset();
    setCurriculo(null);
    setFileError(null);
    onOpenChange(false);
  };

  const onSubmit = async (values: FormValues) => {
    await createCandidate.mutateAsync(
      {
        nome: values.nome,
        email: values.email,
        telefone: values.telefone,
        linkedin: values.linkedin || undefined,
        vaga_pretendida: values.vaga_pretendida || undefined,
        motivacao: values.motivacao,
        ...(curriculo && { curriculo }),
      },
      {
        onSuccess: handleClose,
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 w-full sm:max-w-none sm:w-[40vw] sm:min-w-[420px]"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg pr-6">Adicionar Candidato</SheetTitle>
          <SheetDescription>
            Preencha os dados do candidato para adicioná-lo ao banco de talentos.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-4">

                {/* Nome */}
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do candidato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email + Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                        LinkedIn{' '}
                        <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/perfil" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vaga pretendida */}
                <FormField
                  control={form.control}
                  name="vaga_pretendida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Vaga pretendida{' '}
                        <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a área de interesse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VAGAS_PRETENDIDAS.map(([value, label]) => (
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

                <Separator />

                {/* Motivação */}
                <FormField
                  control={form.control}
                  name="motivacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Motivação{' '}
                        <span className="text-muted-foreground font-normal">(opcional)</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas sobre o candidato ou motivação informada..."
                          className="resize-none min-h-[100px]"
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
                    Currículo{' '}
                    <span className="text-muted-foreground font-normal">(PDF ou DOCX)</span>
                  </p>

                  {curriculo ? (
                    <div className="flex items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{curriculo.name}</span>
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
                        'flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                        isDragging
                          ? 'border-primary bg-primary/5'
                          : 'border-input bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                      )}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground mb-2" />
                      <p className="text-sm text-foreground">
                        <span className="font-medium">Clique para enviar</span>{' '}
                        <span className="text-muted-foreground">ou arraste o arquivo</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (Max. 5MB)</p>
                    </div>
                  )}

                  {fileError && (
                    <p className="text-sm font-medium text-destructive">{fileError}</p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>

              </div>
            </ScrollArea>

            <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCandidate.isPending}>
                {createCandidate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar candidato'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
