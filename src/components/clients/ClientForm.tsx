import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2, Search, Upload, FileText, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Client, CreateClientInput } from '@/types/client';
import { formatCNPJ, formatCEP, formatPhone, unformatPhone } from '@/lib/masks';
import { toTitleCase } from '@/lib/formatters';
import { fetchAddressByCep } from '@/lib/viaCep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useClientContacts } from '@/hooks/useClients';
import { LogoUpload } from '@/components/ui/logo-upload';

// URL tolerante: aceita vazio ou domínio com/sem protocolo (ex.: "site.com", "https://site.com").
const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-./?%&=#]*)?$/i;

const formSchema = z.object({
  companyName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().optional(),
  segment: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Estado deve ter 2 caracteres').optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email('E-mail inválido').optional().or(z.literal('')),
        phone: z.string().optional(),
      }),
    )
    .optional(),
  website: z
    .string()
    .refine((v) => !v || WEBSITE_REGEX.test(v), 'URL inválida')
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FormData = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormData = {
  companyName: '',
  tradingName: '',
  cnpj: '',
  segment: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  contacts: [],
  website: '',
  notes: '',
  status: 'active',
};

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: CreateClientInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ClientForm = ({ client, onSubmit, onCancel, isLoading = false }: ClientFormProps) => {
  const { toast } = useToast();
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfExtracted, setPdfExtracted] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const isEditing = !!client;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: 'contacts',
  });

  const { data: existingContacts } = useClientContacts(client?.id);

  // Hidrata o formulário uma única vez por cliente (evita sobrescrever o que o usuário digitou).
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = client?.id ?? 'new';
    // Em edição, espera os contatos carregarem antes de hidratar.
    if (client && existingContacts === undefined) return;
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;

    if (client) {
      form.reset({
        companyName: client.companyName,
        tradingName: client.tradingName || '',
        cnpj: client.cnpj || '',
        segment: client.segment || '',
        cep: client.cep || '',
        logradouro: client.logradouro || '',
        numero: client.numero || '',
        complemento: client.complemento || '',
        bairro: client.bairro || '',
        cidade: client.cidade || '',
        estado: client.estado || '',
        contacts: (existingContacts || []).map((c) => ({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone ? formatPhone(c.phone) : '',
        })),
        website: client.website || '',
        notes: client.notes || '',
        status: client.status,
      });
      setCnpjDisplay(client.cnpj ? formatCNPJ(client.cnpj) : '');
      setCepDisplay(client.cep ? formatCEP(client.cep) : '');
      setLogoUrl(client.logoUrl || null);
    } else {
      form.reset(EMPTY_VALUES);
      setCnpjDisplay('');
      setCepDisplay('');
      setLogoUrl(null);
    }
  }, [client, existingContacts, form]);

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
        if (data.segment) {
          form.setValue('segment', toTitleCase(data.segment));
        }
        if (data.email || data.telefone) {
          const email = data.email ? String(data.email).toLowerCase().trim() : '';
          const phone = data.telefone
            ? formatPhone(String(data.telefone).replace(/\D/g, ''))
            : '';
          const current = form.getValues('contacts') || [];
          const [first, ...rest] = current;
          form.setValue('contacts', [
            {
              name: first?.name || '',
              email: email || first?.email || '',
              phone: phone || first?.phone || '',
            },
            ...rest,
          ]);
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

  const handleContactPhoneChange = (index: number, value: string) => {
    form.setValue(`contacts.${index}.phone`, formatPhone(value), { shouldValidate: true });
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
    const contacts = (data.contacts || []).map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone ? unformatPhone(c.phone) : '',
    }));
    onSubmit({ ...data, contacts, logoUrl } as CreateClientInput);
  };

  return (
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
            name="segment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segmento</FormLabel>
                <FormControl>
                  <Input placeholder="Segmento de atuação" {...field} />
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

        <div className="border-t pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Contatos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => appendContact({ name: '', email: '', phone: '' })}
            >
              <Plus className="h-4 w-4" />
              Adicionar contato
            </Button>
          </div>

          {contactFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum contato adicionado. Clique em “Adicionar contato” para incluir um.
            </p>
          ) : (
            <div className="space-y-4">
              {contactFields.map((contactField, index) => (
                <div key={contactField.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Contato {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeContact(index)}
                      aria-label={`Remover contato ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nome do contato</FormLabel>
                          <FormControl>
                            <Input placeholder="Pessoa de contato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contato@empresa.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              value={field.value || ''}
                              onChange={(e) => handleContactPhoneChange(index, e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas internas sobre o cliente"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ClientForm;
