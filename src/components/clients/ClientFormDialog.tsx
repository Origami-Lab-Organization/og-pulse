import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Client, CreateClientInput } from '@/types/client';
import { formatCNPJ, formatCEP } from '@/lib/masks';
import { toTitleCase } from '@/lib/formatters';
import { fetchAddressByCep } from '@/lib/viaCep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/ui/logo-upload';

const formSchema = z.object({
  companyName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Estado deve ter 2 caracteres').optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FormData = z.infer<typeof formSchema>;

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSubmit: (data: CreateClientInput) => void;
  isLoading?: boolean;
}

const ClientFormDialog = ({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading = false,
}: ClientFormDialogProps) => {
  const { toast } = useToast();
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtracted, setPdfExtracted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      tradingName: '',
      cnpj: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      setPdfExtracted(false);
      if (client) {
        form.reset({
          companyName: client.companyName,
          tradingName: client.tradingName || '',
          cnpj: client.cnpj || '',
          cep: client.cep || '',
          logradouro: client.logradouro || '',
          numero: client.numero || '',
          complemento: client.complemento || '',
          bairro: client.bairro || '',
          cidade: client.cidade || '',
          estado: client.estado || '',
          status: client.status,
        });
        setCnpjDisplay(client.cnpj ? formatCNPJ(client.cnpj) : '');
        setCepDisplay(client.cep ? formatCEP(client.cep) : '');
        setLogoUrl(client.logoUrl || null);
      } else {
        form.reset({
          companyName: '',
          tradingName: '',
          cnpj: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          status: 'active',
        });
        setCnpjDisplay('');
        setCepDisplay('');
        setLogoUrl(null);
      }
    }
  }, [open, client, form]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo PDF.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsExtractingPdf(true);
    setPdfExtracted(false);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];

        const { data, error } = await supabase.functions.invoke('parse-cnpj-card', {
          body: { pdfBase64: base64 },
        });

        if (error) {
          console.error('Error invoking function:', error);
          throw new Error(error.message || 'Erro ao processar o documento');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        // Preencher os campos do formulário com formatação Title Case
        if (data.razaoSocial) {
          form.setValue('companyName', toTitleCase(data.razaoSocial));
        }
        if (data.nomeFantasia) {
          form.setValue('tradingName', toTitleCase(data.nomeFantasia));
        }
        if (data.cnpj) {
          const cleanCnpj = data.cnpj.replace(/\D/g, '');
          form.setValue('cnpj', cleanCnpj);
          setCnpjDisplay(formatCNPJ(cleanCnpj));
        }
        if (data.cep) {
          const cleanCep = data.cep.replace(/\D/g, '');
          form.setValue('cep', cleanCep);
          setCepDisplay(formatCEP(cleanCep));
        }
        if (data.logradouro) {
          form.setValue('logradouro', toTitleCase(data.logradouro));
        }
        if (data.numero) {
          form.setValue('numero', data.numero);
        }
        if (data.complemento) {
          form.setValue('complemento', toTitleCase(data.complemento));
        }
        if (data.bairro) {
          form.setValue('bairro', toTitleCase(data.bairro));
        }
        if (data.cidade) {
          form.setValue('cidade', toTitleCase(data.cidade));
        }
        if (data.estado) {
          form.setValue('estado', data.estado.toUpperCase());
        }

        setPdfExtracted(true);
        toast({
          title: 'Dados extraídos',
          description: 'Os dados do Cartão CNPJ foram preenchidos automaticamente.',
        });
      } catch (err) {
        console.error('Error extracting PDF data:', err);
        toast({
          title: 'Erro ao extrair dados',
          description: err instanceof Error ? err.message : 'Não foi possível extrair os dados do PDF.',
          variant: 'destructive',
        });
      } finally {
        setIsExtractingPdf(false);
        // Reset file input
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo PDF.',
        variant: 'destructive',
      });
      setIsExtractingPdf(false);
    };

    reader.readAsDataURL(file);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjDisplay(formatted);
    form.setValue('cnpj', formatted);
  };

  const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setCepDisplay(formatted);
    form.setValue('cep', formatted);

    const cleanCep = e.target.value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setIsSearchingCep(true);
      const address = await fetchAddressByCep(cleanCep);
      setIsSearchingCep(false);

      if (address) {
        form.setValue('logradouro', address.logradouro);
        form.setValue('bairro', address.bairro);
        form.setValue('cidade', address.cidade);
        form.setValue('estado', address.estado);
      }
    }
  }, [form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({ ...data, logoUrl } as CreateClientInput);
    form.reset();
    setCnpjDisplay('');
    setCepDisplay('');
    setPdfExtracted(false);
    setLogoUrl(null);
  };

  const isEditing = !!client;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Upload de Cartão CNPJ - apenas para novo cadastro */}
            {!isEditing && (
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="cnpj-pdf-upload"
                  disabled={isExtractingPdf || isLoading}
                />
                <label
                  htmlFor="cnpj-pdf-upload"
                  className={`
                    flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-dashed
                    transition-colors cursor-pointer
                    ${isExtractingPdf ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
                    ${pdfExtracted ? 'border-accent bg-accent/10' : ''}
                  `}
                >
                  {isExtractingPdf ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">Extraindo dados...</p>
                        <p className="text-muted-foreground">Analisando o Cartão CNPJ</p>
                      </div>
                    </>
                  ) : pdfExtracted ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                      <div className="text-sm">
                        <p className="font-medium text-primary">Dados extraídos com sucesso!</p>
                        <p className="text-muted-foreground">Clique para enviar outro arquivo</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">Enviar Cartão CNPJ (PDF)</p>
                        <p className="text-muted-foreground">Opcional - preenche os campos automaticamente</p>
                      </div>
                      <Upload className="h-4 w-4 text-muted-foreground ml-auto" />
                    </>
                  )}
                </label>
              </div>
            )}

            {/* Upload de Logo */}
            <div className="border rounded-lg p-4">
              <LogoUpload
                currentLogoUrl={logoUrl}
                onLogoChange={setLogoUrl}
                entityType="client"
                entityId={client?.id}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome fantasia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={() => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00.000.000/0000-00"
                        value={cnpjDisplay}
                        onChange={handleCnpjChange}
                      />
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
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Endereço</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={() => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="00000-000"
                            value={cepDisplay}
                            onChange={handleCepChange}
                            className="pr-10"
                          />
                          {isSearchingCep && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!isSearchingCep && cepDisplay.length >= 9 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Sala, Andar, Bloco, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="UF" 
                          maxLength={2}
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;
