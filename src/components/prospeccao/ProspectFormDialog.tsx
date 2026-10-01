import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
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
import { useCreateProspectContact, useProspectContactDuplicate } from '@/hooks/useProspectContacts';
import { useCreateProspect, useProspects } from '@/hooks/useProspects';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { formatCNPJ, unformatCNPJ, validateCNPJ } from '@/lib/masks';
import { cardsByContact, openCardOf } from '@/lib/prospecting/contactList';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Textarea } from '@/components/ui/textarea';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import type { CompanyPrefill } from '@/types/cnpjLookup';
import type { ReceitaSnapshot } from '@/types/receita';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import { LEI_DO_BEM_LABEL, leiDoBemSignal, porteLabel } from '@/lib/prospecting/receita';
import { ProspectCompanySelect } from './ProspectCompanySelect';
import { ProspectContactSelect } from './ProspectContactSelect';
import {
  getProspectStageLabel,
  PROSPECT_LEVERS,
  type ProspectCompanyDB,
  type ProspectContactWithCompany,
  type ProspectWithCompany,
} from '@/types/prospect';

const schema = z.object({
  // Obrigatório só quando a pessoa está sendo cadastrada agora (validado no envio).
  contact_name: z.string().optional(),
  contact_role: z.string().optional(),
  contact_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  linkedin_url: z.string().optional(),
  instagram_url: z.string().max(300, 'Endereço longo demais').optional(),
  primary_channel: z.string().min(1, 'Escolha o canal principal'),
  owner_id: z.string().min(1, 'Escolha o responsável'),
  lever: z.string().optional(),
  estimated_value: z.number().min(0).optional(),
  notes: z.string().max(10000, 'Observação longa demais').optional(),
  // Só usados quando a empresa está sendo cadastrada agora.
  company_name: z.string().optional(),
  company_cnpj: z.string().optional(),
  company_linkedin: z.string().optional(),
  company_instagram: z.string().max(300, 'Endereço longo demais').optional(),
  company_website: z.string().optional(),
  company_segment: z.string().optional(),
  company_ring: z.string().optional(),
  company_tier: z.string().optional(),
  // Empresa que já é cliente da carteira (escolhida no seletor).
  company_client_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;
type Formulario = UseFormReturn<FormData>;

/** `prospeccao`: cria o card no Pipeline. `contato`: só cadastra a pessoa (tela Contatos). */
export type ProspectFormMode = 'prospeccao' | 'contato';

const MODO_CONTATO: ProspectFormMode = 'contato';

const TEXTOS: Record<ProspectFormMode, { titulo: string; descricao: string; salvar: string }> = {
  prospeccao: {
    titulo: 'Novo contato de prospecção',
    descricao: 'Busque o contato ou cadastre um novo. Ele entra na etapa “A abordar” do Pipeline.',
    salvar: 'Criar contato',
  },
  contato: {
    titulo: 'Novo contato',
    descricao: 'Busque antes de cadastrar: quem já existe aparece na lista. O contato fica em Contatos, fora do Pipeline.',
    salvar: 'Cadastrar contato',
  },
};

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo?: ProspectFormMode;
  /** Pessoa já escolhida — "Levar para a Prospecção", na ficha do contato. */
  contatoInicial?: ProspectContactWithCompany | null;
  /** Modo contato: escolheu quem já existe — a tela abre a ficha dele em vez de duplicar. */
  onExistingContact?: (contato: ProspectContactWithCompany) => void;
  /** A pessoa já tem card em andamento: abre o card em vez de criar outro. */
  onOpenCard?: (card: ProspectWithCompany) => void;
}

/**
 * Cadastro de contato (01/10/2026, ADR-0045). Começa pela pessoa, como o cadastro de empresa
 * começa pela empresa: quem já existe aparece para ser escolhido, e só quem não está
 * cadastrado ganha os campos de pessoa. Na Prospecção, a pessoa ganha o card em "A abordar";
 * na tela Contatos, fica só no cadastro.
 */
export function ProspectFormDialog(props: ProspectFormDialogProps) {
  const { open, onOpenChange, modo = 'prospeccao' } = props;
  const somenteContato = modo === MODO_CONTATO;
  const cadastro = useCadastroDeContato(props);
  const { form, salvando, escolheuPessoa } = cadastro;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TEXTOS[modo].titulo}</DialogTitle>
          <DialogDescription>{TEXTOS[modo].descricao}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="prospect-form" onSubmit={form.handleSubmit(cadastro.enviar)} className="space-y-4">
            <SecaoDoContato cadastro={cadastro} somenteContato={somenteContato} />
            {cadastro.cadastrandoPessoa && <SecaoDaPessoaNova cadastro={cadastro} />}
            {escolheuPessoa && !somenteContato && (
              <>
                <Separator />
                <p className="text-sm font-medium">Prospecção</p>
                <CamposDoCard form={form} aberto={open} />
              </>
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form="prospect-form" disabled={salvando || !escolheuPessoa}>
            {salvando ? 'Salvando...' : TEXTOS[modo].salvar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Estado e escrita do cadastro: quem é a pessoa, a empresa dela e o card, se houver. */
function useCadastroDeContato(props: ProspectFormDialogProps) {
  const { open, onOpenChange, modo = 'prospeccao', contatoInicial = null, onExistingContact } = props;
  const somenteContato = modo === MODO_CONTATO;
  const { employee } = useAuth();
  const criarEmpresa = useCreateProspectCompany();
  const criarPessoa = useCreateProspectContact();
  const criarCard = useCreateProspect();
  const gravarReceita = useSaveCompanyReceita();
  const { data: cards = [] } = useProspects();
  const cardsAbertos = useMemo(() => cardsAbertosPorContato(cards), [cards]);

  const [pessoa, setPessoa] = useState<ProspectContactWithCompany | null>(null);
  const [cadastrandoPessoa, setCadastrandoPessoa] = useState(false);
  const [erroDaPessoa, setErroDaPessoa] = useState<string | null>(null);
  const empresaNova = useEmpresaNova();
  const { reiniciar: reiniciarEmpresa } = empresaNova;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { primary_channel: 'email', owner_id: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({ primary_channel: 'email', owner_id: employee?.id ?? '' });
    setPessoa(contatoInicial);
    setCadastrandoPessoa(false);
    setErroDaPessoa(null);
    reiniciarEmpresa();
  }, [open, employee?.id, contatoInicial, form, reiniciarEmpresa]);

  const cardAberto = pessoa ? cardsAbertos.get(pessoa.id) ?? null : null;
  const duplicado =
    useProspectContactDuplicate(
      cadastrandoPessoa ? form.watch('contact_email') ?? '' : '',
      cadastrandoPessoa ? form.watch('linkedin_url') ?? '' : '',
    ).data ?? null;

  const escolherPessoa = (contato: ProspectContactWithCompany | null) => {
    setErroDaPessoa(null);
    setCadastrandoPessoa(false);
    if (contato && somenteContato) {
      // Na tela Contatos, escolher quem já existe é abrir a ficha — nunca cadastrar de novo.
      onOpenChange(false);
      onExistingContact?.(contato);
      return;
    }
    setPessoa(contato);
  };

  const iniciarCadastroDePessoa = (nome: string) => {
    setErroDaPessoa(null);
    setPessoa(null);
    setCadastrandoPessoa(true);
    form.setValue('contact_name', nome);
  };

  const cadastrarPessoa = async (values: FormData): Promise<ProspectContactWithCompany> => {
    const companyId = empresaNova.empresa?.id ?? (await empresaNova.criar(values, criarEmpresa, gravarReceita));
    return criarPessoa.mutateAsync(pessoaDoFormulario(values, companyId));
  };

  const concluir = async (contato: ProspectContactWithCompany, values: FormData) => {
    if (somenteContato) {
      toast({ title: 'Contato cadastrado', description: `${contato.name} está em Contatos, fora do Pipeline.` });
      return;
    }
    await criarCard.mutateAsync(cardDoFormulario(values, contato));
  };

  const enviar = async (values: FormData) => {
    const erro = validar(values, { pessoa, cadastrandoPessoa, cardAberto, duplicado, somenteContato, empresaNova });
    if (erro) return mostrarErro(erro, form, setErroDaPessoa);
    await concluir(pessoa ?? (await cadastrarPessoa(values)), values);
    onOpenChange(false);
  };

  const salvando = [criarEmpresa, criarPessoa, criarCard, gravarReceita].some((m) => m.isPending);

  return {
    form,
    pessoa,
    cadastrandoPessoa,
    escolheuPessoa: !!pessoa || cadastrandoPessoa,
    erroDaPessoa,
    cardAberto,
    cardsAbertos,
    duplicado,
    empresaNova,
    salvando,
    escolherPessoa,
    iniciarCadastroDePessoa,
    enviar,
    abrirCard: props.onOpenCard,
    fechar: () => onOpenChange(false),
  };
}

type CadastroDeContato = ReturnType<typeof useCadastroDeContato>;

function mostrarErro(erro: ErroDeValidacao, form: Formulario, setErroDaPessoa: (m: string) => void) {
  if (erro.campo) form.setError(erro.campo, { message: erro.mensagem });
  else setErroDaPessoa(erro.mensagem);
}

/** Os services aparam e trocam vazio por nulo: aqui só se diz o que vai para onde. */
function pessoaDoFormulario(values: FormData, companyId: string) {
  return {
    company_id: companyId,
    name: values.contact_name ?? '',
    role: values.contact_role,
    email: values.contact_email,
    phone: values.contact_phone,
    linkedin_url: values.linkedin_url,
    instagram_url: values.instagram_url,
  };
}

function cardDoFormulario(values: FormData, contato: ProspectContactWithCompany) {
  return {
    company_id: contato.company_id,
    contact_id: contato.id,
    primary_channel: values.primary_channel,
    owner_id: values.owner_id,
    lever: values.lever || null,
    estimated_value: values.estimated_value || null,
    notes: values.notes?.trim() || null,
  };
}

function cardsAbertosPorContato(cards: ProspectWithCompany[]): Map<string, ProspectWithCompany> {
  const mapa = new Map<string, ProspectWithCompany>();
  for (const [contactId, doContato] of cardsByContact(cards)) {
    const aberto = openCardOf(doContato);
    if (aberto) mapa.set(contactId, aberto);
  }
  return mapa;
}

interface SecaoDoContatoProps {
  cadastro: CadastroDeContato;
  somenteContato: boolean;
}

function SecaoDoContato(props: SecaoDoContatoProps) {
  const { cadastro, somenteContato } = props;
  const { pessoa, cardAberto, abrirCard } = cadastro;
  const mostrarCardAberto = !!pessoa && !!cardAberto && !somenteContato;
  const irParaOCard = abrirCard && cardAberto
    ? () => {
        cadastro.fechar();
        abrirCard(cardAberto);
      }
    : undefined;

  return (
    <div className="space-y-2">
      <FormLabel>Contato</FormLabel>
      <ProspectContactSelect
        value={pessoa}
        onChange={cadastro.escolherPessoa}
        onCreateNew={cadastro.iniciarCadastroDePessoa}
        openCards={cadastro.cardsAbertos}
        disabled={cadastro.salvando}
      />
      {pessoa && <ResumoDoContato contato={pessoa} />}
      {mostrarCardAberto && <AvisoDeCardAberto card={cardAberto} onAbrir={irParaOCard} />}
      {cadastro.erroDaPessoa && (
        <p role="alert" className="text-sm font-medium text-destructive">{cadastro.erroDaPessoa}</p>
      )}
    </div>
  );
}

function SecaoDaPessoaNova({ cadastro }: { cadastro: CadastroDeContato }) {
  const { form, duplicado } = cadastro;
  return (
    <>
      <SecaoDaEmpresa form={form} empresaNova={cadastro.empresaNova} disabled={cadastro.salvando} />
      <Separator />
      <p className="text-sm font-medium">Dados do contato</p>
      <CamposDaPessoa form={form} />
      {duplicado && <AvisoDeDuplicado contato={duplicado} onUsar={() => cadastro.escolherPessoa(duplicado)} />}
    </>
  );
}

// --------------------------------------------------------------------------
// Empresa (só para pessoa nova)
// --------------------------------------------------------------------------

/** Estado da empresa do contato novo: a escolhida no seletor ou a que está sendo cadastrada. */
function useEmpresaNova() {
  const [empresa, setEmpresa] = useState<ProspectCompanyDB | null>(null);
  const [cadastrando, setCadastrando] = useState(false);
  const [cnpjDisplay, setCnpjDisplay] = useState('');
  // Retrato da Receita da empresa nova: gravado junto com ela (empresa + sócios, ADR-0041).
  const [receita, setReceita] = useState<ReceitaSnapshot | null>(null);

  const reiniciar = useCallback(() => {
    setEmpresa(null);
    setCadastrando(false);
    setCnpjDisplay('');
    setReceita(null);
  }, []);

  const criar = async (
    values: FormData,
    criarEmpresa: ReturnType<typeof useCreateProspectCompany>,
    gravarReceita: ReturnType<typeof useSaveCompanyReceita>,
  ): Promise<string> => {
    const nova = await criarEmpresa.mutateAsync(empresaDoFormulario(values));
    // Falhar aqui não impede o contato: a empresa já existe, e a ficha tem "Atualizar".
    if (receita?.cnpj === unformatCNPJ(values.company_cnpj ?? '')) {
      await gravarReceita.mutateAsync({ companyId: nova.id, receita }).catch(() => undefined);
    }
    return nova.id;
  };

  return { empresa, setEmpresa, cadastrando, setCadastrando, cnpjDisplay, setCnpjDisplay, receita, setReceita, reiniciar, criar };
}

/** O service da empresa apara e troca vazio por nulo. */
function empresaDoFormulario(values: FormData) {
  return {
    name: values.company_name ?? '',
    cnpj: values.company_cnpj,
    linkedin_url: values.company_linkedin,
    instagram_url: values.company_instagram,
    website: values.company_website,
    segment: values.company_segment,
    ring: values.company_ring,
    tier: values.company_tier,
    client_id: values.company_client_id,
  };
}

type EmpresaNova = ReturnType<typeof useEmpresaNova>;

interface SecaoDaEmpresaProps {
  form: Formulario;
  empresaNova: EmpresaNova;
  disabled: boolean;
}

function SecaoDaEmpresa(props: SecaoDaEmpresaProps) {
  const { form, empresaNova, disabled } = props;
  const iniciarCadastroDeEmpresa = (prefill: CompanyPrefill) => {
    empresaNova.setEmpresa(null);
    empresaNova.setCadastrando(true);
    form.setValue('company_name', prefill.name);
    form.setValue('company_cnpj', prefill.cnpj ?? '');
    form.setValue('company_segment', prefill.segment ?? '');
    form.setValue('company_client_id', prefill.client_id ?? '');
    empresaNova.setCnpjDisplay(prefill.cnpj ? formatCNPJ(prefill.cnpj) : '');
    empresaNova.setReceita(prefill.receita ?? null);
  };

  return (
    <>
      <div className="space-y-2">
        <FormLabel>Empresa</FormLabel>
        <ProspectCompanySelect
          value={empresaNova.empresa}
          onChange={(c) => {
            empresaNova.setEmpresa(c);
            empresaNova.setCadastrando(false);
          }}
          onCreateNew={iniciarCadastroDeEmpresa}
          disabled={disabled}
        />
        {empresaNova.empresa && <ResumoDaEmpresa empresa={empresaNova.empresa} />}
      </div>
      {empresaNova.cadastrando && <CamposDaEmpresaNova form={form} empresaNova={empresaNova} />}
    </>
  );
}

function CamposDaEmpresaNova({ form, empresaNova }: { form: Formulario; empresaNova: EmpresaNova }) {
  // Busca na Receita pelo CNPJ digitado no cadastro: preenche só o que está vazio.
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const preencherPeloCnpj = async () => {
    setConsultandoCnpj(true);
    try {
      const dado = await lookupCnpj(form.getValues('company_cnpj') ?? '');
      empresaNova.setReceita(dado);
      preencherOQueEstaVazio(form, dado);
    } catch (e) {
      form.setError('company_cnpj', {
        message: e instanceof CnpjLookupError ? e.message : 'Não foi possível consultar o CNPJ.',
      });
    } finally {
      setConsultandoCnpj(false);
    }
  };

  return (
    <>
      <Separator />
      <p className="text-sm font-medium">Dados da empresa nova</p>
      {empresaNova.receita && <PreviaDaReceita receita={empresaNova.receita} />}
      {form.watch('company_client_id') && (
        <p className="text-xs text-muted-foreground">
          Ligada ao cliente da carteira: os dados básicos vêm do cadastro de Clientes.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoDeTexto form={form} name="company_name" label="Nome da empresa" largo />
        <FormField
          control={form.control}
          name="company_cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    value={empresaNova.cnpjDisplay}
                    placeholder="00.000.000/0000-00"
                    onChange={(e) => {
                      empresaNova.setCnpjDisplay(formatCNPJ(e.target.value));
                      field.onChange(unformatCNPJ(e.target.value));
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Buscar dados do CNPJ na Receita"
                  title="Buscar dados do CNPJ na Receita"
                  disabled={consultandoCnpj || !validateCNPJ(field.value ?? '')}
                  onClick={preencherPeloCnpj}
                >
                  {consultandoCnpj ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Search className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <CampoDeTexto
          form={form}
          name="company_linkedin"
          label="LinkedIn da empresa"
          descricao="CNPJ ou LinkedIn evitam empresa duplicada."
        />
        <CampoDeTexto form={form} name="company_instagram" label="Instagram da empresa" placeholder="@empresa ou link do perfil" />
        <CampoDeTexto form={form} name="company_website" label="Site" />
        <CampoDeTexto form={form} name="company_segment" label="Segmento" />
        <CampoDeTexto form={form} name="company_ring" label="Anel" />
        <CampoDeTexto form={form} name="company_tier" label="Tier" />
      </div>
    </>
  );
}

/** A Receita só preenche o que está vazio: o que a pessoa escreveu vence. */
function preencherOQueEstaVazio(form: Formulario, dado: ReceitaSnapshot) {
  if (!form.getValues('company_name')?.trim()) form.setValue('company_name', dado.nomeFantasia ?? dado.razaoSocial);
  if (!form.getValues('company_segment')?.trim()) form.setValue('company_segment', dado.segmento ?? '');
  form.clearErrors('company_cnpj');
}

// --------------------------------------------------------------------------
// Pessoa e card
// --------------------------------------------------------------------------

function CamposDaPessoa({ form }: { form: Formulario }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <CampoDeTexto form={form} name="contact_name" label="Nome" />
      <CampoDeTexto form={form} name="contact_role" label="Cargo" />
      <CampoDeTexto form={form} name="contact_email" label="E-mail" tipo="email" descricao="E-mail ou LinkedIn evitam contato duplicado." />
      <CampoDeTexto form={form} name="contact_phone" label="Telefone" />
      <CampoDeTexto form={form} name="linkedin_url" label="LinkedIn do contato" />
      <CampoDeTexto form={form} name="instagram_url" label="Instagram do contato" placeholder="@contato ou link do perfil" />
    </div>
  );
}

function CamposDoCard({ form, aberto }: { form: Formulario; aberto: boolean }) {
  const { data: diretorio = [] } = useEmployeeDirectory(aberto);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {PROSPECT_LEVERS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>É o corte que explica o que faz responder.</FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="estimated_value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Valor estimado</FormLabel>
            <FormControl>
              <CurrencyInput value={field.value ?? 0} onValueChange={field.onChange} showPrefix />
            </FormControl>
            <FormDescription>Opcional. Com orçamento, vale o total dele.</FormDescription>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

type CampoTextual = Exclude<keyof FormData, 'estimated_value'>;

function CampoDeTexto(props: {
  form: Formulario;
  name: CampoTextual;
  label: string;
  placeholder?: string;
  descricao?: string;
  tipo?: 'email';
  largo?: boolean;
}) {
  const { form, name, label, placeholder, descricao, tipo, largo } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={largo ? 'sm:col-span-2' : undefined}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={tipo} {...field} value={field.value ?? ''} placeholder={placeholder} />
          </FormControl>
          {descricao && <FormDescription>{descricao}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// --------------------------------------------------------------------------
// Avisos e resumos
// --------------------------------------------------------------------------

function ResumoDoContato({ contato }: { contato: ProspectContactWithCompany }) {
  const itens = [contato.company?.name, contato.role, contato.email, contato.phone].filter(Boolean);
  return (
    <p className="text-xs text-muted-foreground">
      {itens.length > 0 ? itens.join(' · ') : 'Contato sem dados complementares.'}
      {' '}Os dados da pessoa se editam em Contatos.
    </p>
  );
}

/** Um card em andamento por pessoa: o segundo seria a mesma conversa contada duas vezes. */
function AvisoDeCardAberto({ card, onAbrir }: { card: ProspectWithCompany; onAbrir?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-xs text-warning-emphasis">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <p>
          Este contato já está no Pipeline em <span className="font-medium">{getProspectStageLabel(card.stage)}</span>
          {card.company?.name && <> pela {card.company.name}</>}. Continue no card que já existe.
        </p>
        {onAbrir && (
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onAbrir}>
            Abrir card
          </Button>
        )}
      </div>
    </div>
  );
}

function AvisoDeDuplicado({ contato, onUsar }: { contato: ProspectContactWithCompany; onUsar: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-xs text-warning-emphasis">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <p>
          Já existe um contato com este e-mail ou LinkedIn: <span className="font-medium">{contato.name}</span>
          {contato.company?.name && <> ({contato.company.name})</>}.
        </p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onUsar}>
          Usar este contato
        </Button>
      </div>
    </div>
  );
}

/** O que a consulta achou, antes de salvar: o que vai junto com a empresa. */
function PreviaDaReceita({ receita }: { receita: ReceitaSnapshot }) {
  const sinal = leiDoBemSignal(receita.regimeTributario);
  const socios = receita.socios.length;
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-xs" role="status">
      <p className="font-medium text-foreground">Dados da Receita encontrados — vão junto com a empresa</p>
      <p className="mt-1 text-muted-foreground">
        {[
          LEI_DO_BEM_LABEL[sinal],
          porteLabel(receita.porte),
          receita.situacaoCadastral && `Situação: ${receita.situacaoCadastral}`,
          socios > 0 ? `${socios} ${socios === 1 ? 'sócio' : 'sócios'} na rede da empresa` : 'sem sócios informados',
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
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

// --------------------------------------------------------------------------
// Validação
// --------------------------------------------------------------------------

interface ContextoDeValidacao {
  pessoa: ProspectContactWithCompany | null;
  cadastrandoPessoa: boolean;
  cardAberto: ProspectWithCompany | null;
  duplicado: ProspectContactWithCompany | null;
  somenteContato: boolean;
  empresaNova: EmpresaNova;
}

type ErroDeValidacao = { campo?: keyof FormData; mensagem: string };

/** `campo` ausente: o erro é da escolha da pessoa e aparece embaixo do seletor. */
function validar(values: FormData, ctx: ContextoDeValidacao): ErroDeValidacao | null {
  if (ctx.pessoa) {
    return ctx.cardAberto && !ctx.somenteContato
      ? { mensagem: 'Este contato já tem um card em andamento no Pipeline.' }
      : null;
  }
  if (!ctx.cadastrandoPessoa) return { mensagem: 'Escolha um contato ou cadastre um novo.' };
  return validarPessoaNova(values, ctx);
}

/**
 * A pessoa nova precisa de nome e empresa, e o e-mail ou o LinkedIn não podem ser de outra
 * pessoa: deixar passar quebraria a deduplicação, que é o motivo de o cadastro existir.
 */
function validarPessoaNova(values: FormData, ctx: ContextoDeValidacao): ErroDeValidacao | null {
  if ((values.contact_name ?? '').trim().length < 2) {
    return { campo: 'contact_name', mensagem: 'Informe o nome do contato' };
  }
  if (ctx.duplicado) {
    return { campo: 'contact_email', mensagem: 'Já existe um contato com este e-mail ou LinkedIn. Use o existente.' };
  }
  return validarEmpresa(values, ctx.empresaNova);
}

/**
 * A empresa é obrigatória, e o CNPJ digitado tem que ser válido — deixar passar um CNPJ
 * inválido quebraria a deduplicação, que é justamente o que evita a mesma empresa entrar
 * duas vezes com dois donos diferentes.
 */
function validarEmpresa(values: FormData, empresaNova: EmpresaNova): ErroDeValidacao | null {
  if (empresaNova.empresa) return null;
  if (!empresaNova.cadastrando || !values.company_name?.trim()) {
    return { mensagem: 'Escolha a empresa do contato ou cadastre uma nova antes de salvar.' };
  }
  if (values.company_cnpj && !validateCNPJ(values.company_cnpj)) {
    return { campo: 'company_cnpj', mensagem: 'CNPJ inválido.' };
  }
  return null;
}
