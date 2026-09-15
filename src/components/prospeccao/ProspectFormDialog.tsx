import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCreateProspectCompany } from '@/hooks/useProspectCompanies';
import { useCreateProspect } from '@/hooks/useProspects';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { useAuth } from '@/contexts/AuthContext';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { formatCNPJ, unformatCNPJ, validateCNPJ } from '@/lib/masks';
import { ProspectCompanySelect } from './ProspectCompanySelect';
import type { ProspectCompanyDB } from '@/types/prospect';

const schema = z.object({
  contact_name: z.string().min(2, 'Informe o nome do contato'),
  contact_role: z.string().optional(),
  contact_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  primary_channel: z.string().min(1, 'Escolha o canal principal'),
  owner_id: z.string().min(1, 'Escolha o responsável'),
  lever: z.string().optional(),
  // Só usados quando a empresa está sendo cadastrada agora.
  company_name: z.string().optional(),
  company_cnpj: z.string().optional(),
  company_linkedin: z.string().optional(),
  company_website: z.string().optional(),
  company_segment: z.string().optional(),
  company_ring: z.string().optional(),
  company_tier: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectFormDialog({ open, onOpenChange }: ProspectFormDialogProps) {
  const { employee } = useAuth();
  const { data: diretorio = [] } = useEmployeeDirectory(open);
  const criarEmpresa = useCreateProspectCompany();
  const criarContato = useCreateProspect();

  const [empresa, setEmpresa] = useState<ProspectCompanyDB | null>(null);
  const [cadastrandoEmpresa, setCadastrandoEmpresa] = useState(false);
  const [cnpjDisplay, setCnpjDisplay] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primary_channel: 'email', owner_id: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ primary_channel: 'email', owner_id: employee?.id ?? '' });
    setEmpresa(null);
    setCadastrandoEmpresa(false);
    setCnpjDisplay('');
  }, [open, employee?.id, form]);

  const iniciarCadastroDeEmpresa = (nome: string) => {
    setEmpresa(null);
    setCadastrandoEmpresa(true);
    form.setValue('company_name', nome);
  };

  const onSubmit = async (values: FormData) => {
    const erro = validarEmpresa(values, empresa, cadastrandoEmpresa);
    if (erro) {
      form.setError(erro.campo as keyof FormData, { message: erro.mensagem });
      return;
    }

    let companyId = empresa?.id;
    if (!companyId) {
      const nova = await criarEmpresa.mutateAsync({
        name: values.company_name!.trim(),
        cnpj: values.company_cnpj || null,
        linkedin_url: values.company_linkedin || null,
        website: values.company_website || null,
        segment: values.company_segment || null,
        ring: values.company_ring || null,
        tier: values.company_tier || null,
      });
      companyId = nova.id;
    }

    await criarContato.mutateAsync({
      company_id: companyId,
      contact_name: values.contact_name.trim(),
      contact_role: values.contact_role || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      linkedin_url: values.linkedin_url || null,
      primary_channel: values.primary_channel,
      owner_id: values.owner_id,
      lever: values.lever || null,
    });

    onOpenChange(false);
  };

  const salvando = criarEmpresa.isPending || criarContato.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo contato de prospecção</DialogTitle>
          <DialogDescription>
            Escolha a empresa ou cadastre uma nova. O contato entra em &ldquo;A abordar&rdquo; e já
            aparece nas atividades de hoje.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="prospect-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Empresa</FormLabel>
              <ProspectCompanySelect
                value={empresa}
                onChange={(c) => {
                  setEmpresa(c);
                  setCadastrandoEmpresa(false);
                }}
                onCreateNew={iniciarCadastroDeEmpresa}
                disabled={salvando}
              />
              {empresa && <ResumoDaEmpresa empresa={empresa} />}
            </div>

            {cadastrandoEmpresa && (
              <>
                <Separator />
                <p className="text-sm font-medium">Dados da empresa nova</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nome da empresa</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input
                            value={cnpjDisplay}
                            placeholder="00.000.000/0000-00"
                            onChange={(e) => {
                              setCnpjDisplay(formatCNPJ(e.target.value));
                              field.onChange(unformatCNPJ(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn da empresa</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormDescription>CNPJ ou LinkedIn evitam empresa duplicada.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_segment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segmento</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_ring"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anel</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <Separator />
            <p className="text-sm font-medium">Contato</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn do contato</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="primary_channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal principal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INTERACTION_CHANNELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>É o canal do registro de um clique.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diretorio.map((pessoa) => (
                          <SelectItem key={pessoa.id} value={pessoa.id}>{pessoa.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lever"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alavanca / origem da lista</FormLabel>
                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="Ex.: lista do evento X" /></FormControl>
                    <FormDescription>
                      É o corte que explica o que faz responder.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form="prospect-form" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar contato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumoDaEmpresa({ empresa }: { empresa: ProspectCompanyDB }) {
  const itens = [
    empresa.cnpj ? formatCNPJ(empresa.cnpj) : null,
    empresa.segment,
    empresa.ring ? `Anel ${empresa.ring}` : null,
    empresa.tier ? `Tier ${empresa.tier}` : null,
  ].filter(Boolean);

  return (
    <p className="text-xs text-muted-foreground">
      {itens.length > 0 ? itens.join(' · ') : 'Empresa sem dados complementares.'}
      {' '}Editável no card do contato.
    </p>
  );
}

/**
 * A empresa é obrigatória, e o CNPJ digitado tem que ser válido — deixar passar um CNPJ
 * inválido quebraria a deduplicação, que é justamente o que evita a mesma empresa entrar
 * duas vezes com dois donos diferentes.
 */
function validarEmpresa(
  values: FormData,
  empresa: ProspectCompanyDB | null,
  cadastrando: boolean,
): { campo: string; mensagem: string } | null {
  if (empresa) return null;
  if (!cadastrando || !values.company_name?.trim()) {
    return { campo: 'contact_name', mensagem: 'Escolha uma empresa ou cadastre uma nova antes de salvar.' };
  }
  if (values.company_cnpj && !validateCNPJ(values.company_cnpj)) {
    return { campo: 'company_cnpj', mensagem: 'CNPJ inválido.' };
  }
  return null;
}
