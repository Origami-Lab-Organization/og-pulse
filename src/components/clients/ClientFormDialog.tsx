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
import { Loader2, Search } from 'lucide-react';
import { Client, CreateClientInput } from '@/types/client';
import { formatCNPJ, formatCEP } from '@/lib/masks';
import { fetchAddressByCep } from '@/lib/viaCep';

const formSchema = z.object({
  companyName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
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
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  const [cepDisplay, setCepDisplay] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      tradingName: '',
      cnpj: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        form.reset({
          companyName: client.companyName,
          tradingName: client.tradingName || '',
          cnpj: client.cnpj || '',
          cep: client.cep || '',
          logradouro: client.logradouro || '',
          numero: client.numero || '',
          bairro: client.bairro || '',
          cidade: client.cidade || '',
          estado: client.estado || '',
          status: client.status,
        });
        setCnpjDisplay(client.cnpj ? formatCNPJ(client.cnpj) : '');
        setCepDisplay(client.cep ? formatCEP(client.cep) : '');
      } else {
        form.reset({
          companyName: '',
          tradingName: '',
          cnpj: '',
          cep: '',
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          status: 'active',
        });
        setCnpjDisplay('');
        setCepDisplay('');
      }
    }
  }, [open, client, form]);

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
    onSubmit(data as CreateClientInput);
    form.reset();
    setCnpjDisplay('');
    setCepDisplay('');
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
