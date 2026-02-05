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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Supplier, CreateSupplierInput, SUPPLIER_CATEGORIES } from '@/types/supplier';
import { formatCNPJ, formatCEP, formatPhone } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viaCep';
import { toTitleCase } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LogoUpload } from '@/components/ui/logo-upload';

const formSchema = z.object({
  companyName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().optional(),
  category: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Estado deve ter 2 caracteres').optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FormData = z.infer<typeof formSchema>;

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSubmit: (data: CreateSupplierInput) => void;
  isLoading?: boolean;
}

const SupplierFormDialog = ({
  open,
  onOpenChange,
  supplier,
  onSubmit,
  isLoading = false,
}: SupplierFormDialogProps) => {
  const { toast } = useToast();
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
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
      category: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      notes: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          companyName: supplier.companyName,
          tradingName: supplier.tradingName || '',
          cnpj: supplier.cnpj || '',
          category: supplier.category || '',
          contactName: supplier.contactName || '',
          contactEmail: supplier.contactEmail || '',
          contactPhone: supplier.contactPhone || '',
          cep: supplier.cep || '',
          logradouro: supplier.logradouro || '',
          numero: supplier.numero || '',
          complemento: supplier.complemento || '',
          bairro: supplier.bairro || '',
          cidade: supplier.cidade || '',
          estado: supplier.estado || '',
          notes: supplier.notes || '',
          status: supplier.status,
        });
        setCnpjDisplay(supplier.cnpj ? formatCNPJ(supplier.cnpj) : '');
        setCepDisplay(supplier.cep ? formatCEP(supplier.cep) : '');
        setPhoneDisplay(supplier.contactPhone ? formatPhone(supplier.contactPhone) : '');
        setLogoUrl(supplier.logoUrl || null);
        setPdfExtracted(false);
      } else {
        form.reset({
          companyName: '',
          tradingName: '',
          cnpj: '',
          category: '',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          notes: '',
          status: 'active',
        });
        setCnpjDisplay('');
        setCepDisplay('');
        setPhoneDisplay('');
        setLogoUrl(null);
        setPdfExtracted(false);
      }
    }
  }, [open, supplier, form]);

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

        if (error) throw new Error(error.message || 'Erro ao processar o documento');
        if (data.error) throw new Error(data.error);

        // Preencher os campos com formatação Title Case
        if (data.razaoSocial) form.setValue('companyName', toTitleCase(data.razaoSocial));
        if (data.nomeFantasia) form.setValue('tradingName', toTitleCase(data.nomeFantasia));
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
        if (data.logradouro) form.setValue('logradouro', toTitleCase(data.logradouro));
        if (data.numero) form.setValue('numero', data.numero);
        if (data.complemento) form.setValue('complemento', toTitleCase(data.complemento));
        if (data.bairro) form.setValue('bairro', toTitleCase(data.bairro));
        if (data.cidade) form.setValue('cidade', toTitleCase(data.cidade));
        if (data.estado) form.setValue('estado', data.estado.toUpperCase());

        setPdfExtracted(true);
        toast({
          title: 'Dados extraídos',
          description: 'Os dados do Cartão CNPJ foram preenchidos automaticamente.',
        });
      } catch (err) {
        toast({
          title: 'Erro ao extrair dados',
          description: err instanceof Error ? err.message : 'Não foi possível extrair os dados do PDF.',
          variant: 'destructive',
        });
      } finally {
        setIsExtractingPdf(false);
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhoneDisplay(formatted);
    form.setValue('contactPhone', formatted);
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
    onSubmit({ ...data, logoUrl } as CreateSupplierInput);
    form.reset();
    setCnpjDisplay('');
    setCepDisplay('');
    setPhoneDisplay('');
    setPdfExtracted(false);
    setLogoUrl(null);
  };

  const isEditing = !!supplier;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Upload de PDF - Apenas para novo cadastro */}
            {!isEditing && (
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="supplier-cnpj-pdf-upload"
                  disabled={isExtractingPdf || isLoading}
                />
                <label
                  htmlFor="supplier-cnpj-pdf-upload"
                  className={`
                    flex items-center justify-center gap-3 p-4 rounded-lg border-2 border-dashed
                    transition-colors cursor-pointer
                    ${isExtractingPdf ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'}
                    ${pdfExtracted ? 'border-primary bg-primary/5' : ''}
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
                entityType="supplier"
                entityId={supplier?.id}
                disabled={isLoading}
              />
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Dados da Empresa</h3>
              
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
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SUPPLIER_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
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
            </div>

            {/* Contato */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Contato</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={() => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(00) 00000-0000"
                          value={phoneDisplay}
                          onChange={handlePhoneChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Endereço</h3>
              
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
                        <Input placeholder="UF" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Observações */}
            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações adicionais sobre o fornecedor..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
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

export default SupplierFormDialog;
