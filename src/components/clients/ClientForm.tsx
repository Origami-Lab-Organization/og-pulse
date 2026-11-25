import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Loader2 } from 'lucide-react';
import { Client, CreateClientInput } from '@/types/client';
import { formatCNPJ } from '@/lib/masks';
import { LogoUpload } from '@/components/ui/logo-upload';

// URL tolerante: aceita vazio ou domínio com/sem protocolo (ex.: "site.com", "https://site.com").
const WEBSITE_REGEX = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-./?%&=#]*)?$/i;

const formSchema = z.object({
  companyName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().optional(),
  segment: z.string().optional(),
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
  website: '',
  notes: '',
  status: 'active',
};

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: CreateClientInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  /** US-0049: cliente com empresa — identificação vem dela e se muda na empresa (ADR-0056). */
  identificacaoDaEmpresa?: boolean;
}

const ClientForm = ({ client, onSubmit, onCancel, isLoading = false, identificacaoDaEmpresa = false }: ClientFormProps) => {
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const isEditing = !!client;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Hidrata o formulário uma única vez por cliente (evita sobrescrever o que o usuário digitou).
  const hydratedRef = useRef<string | null>(null);
  useEffect(() => {
    const key = client?.id ?? 'new';
    if (hydratedRef.current === key) return;
    hydratedRef.current = key;

    if (client) {
      form.reset({
        companyName: client.companyName,
        tradingName: client.tradingName || '',
        cnpj: client.cnpj || '',
        segment: client.segment || '',
        website: client.website || '',
        notes: client.notes || '',
        status: client.status,
      });
      setCnpjDisplay(client.cnpj ? formatCNPJ(client.cnpj) : '');
      setLogoUrl(client.logoUrl || null);
    } else {
      form.reset(EMPTY_VALUES);
      setCnpjDisplay('');
      setLogoUrl(null);
    }
  }, [client, form]);

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpjDisplay(formatted);
    form.setValue('cnpj', formatted);
  };

  // US-0045: endereço vem da Receita pela empresa, e contatos são os da empresa: o formulário
  // não envia nenhum dos dois, e o que já está gravado fica como está.
  const handleSubmit = (data: FormData) => {
    onSubmit({ ...data, logoUrl } as CreateClientInput);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  <Input placeholder="Nome da empresa" {...field} disabled={identificacaoDaEmpresa} />
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
                  <Input placeholder="Nome fantasia" {...field} disabled={identificacaoDaEmpresa} />
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
                    disabled={identificacaoDaEmpresa}
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
          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://empresa.com" {...field} disabled={identificacaoDaEmpresa} />
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
