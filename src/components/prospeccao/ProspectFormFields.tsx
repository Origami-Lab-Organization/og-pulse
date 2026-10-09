import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateProspectCompany, useProspectCompanyByCnpj } from '@/hooks/useProspectCompanies';
import { useEmployeeDirectory } from '@/hooks/useEmployeeDirectory';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import { INTERACTION_CHANNELS } from '@/lib/interactionChannels';
import { formatCNPJ, unformatCNPJ, validateCNPJ } from '@/lib/masks';
import { LEI_DO_BEM_LABEL, leiDoBemSignal, porteLabel } from '@/lib/prospecting/receita';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import type { CompanyPrefill } from '@/types/cnpjLookup';
import type { ReceitaSnapshot } from '@/types/receita';
import { FATURAMENTO_BASE_PADRAO, PROSPECT_LEVERS, type ProspectCompanyDB } from '@/types/prospect';
import { FaturamentoAnualField } from './FaturamentoAnualField';
import { ProspectCompanySelect } from './ProspectCompanySelect';

/**
 * Peças comuns aos dois cadastros comerciais (09/10/2026): o de contato (tela Contatos,
 * `ContactFormDialog`) e o de oportunidade (quadro, `OpportunityFormDialog`). Os dois começam
 * pela empresa — escolher a que existe ou cadastrar uma nova — e usam o mesmo formulário, para
 * a validação e a deduplicação da empresa serem uma só.
 */

export const schema = z.object({
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
  company_faturamento: z.number().min(0).optional(),
  company_faturamento_base: z.enum(['estimado', 'apurado']).optional(),
  // Empresa que já é cliente da carteira (escolhida no seletor).
  company_client_id: z.string().optional(),
});

export type FormData = z.infer<typeof schema>;
export type Formulario = UseFormReturn<FormData>;

// --------------------------------------------------------------------------
// Empresa
// --------------------------------------------------------------------------

/** Estado da empresa do cadastro: a escolhida no seletor ou a que está sendo cadastrada. */
export function useEmpresaNova(form: Formulario) {
  const [empresa, setEmpresa] = useState<ProspectCompanyDB | null>(null);
  const [cadastrando, setCadastrando] = useState(false);
  // O CNPJ é a chave da empresa: digitado o de uma que já existe, o cadastro novo não procede.
  const existente = useProspectCompanyByCnpj(cadastrando ? form.watch('company_cnpj') ?? '' : '').data ?? null;
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

  const usarExistente = (empresaExistente: ProspectCompanyDB) => {
    setEmpresa(empresaExistente);
    setCadastrando(false);
    setReceita(null);
  };

  return {
    empresa,
    setEmpresa,
    cadastrando,
    setCadastrando,
    existente,
    usarExistente,
    cnpjDisplay,
    setCnpjDisplay,
    receita,
    setReceita,
    reiniciar,
    criar,
  };
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
    faturamento_anual: values.company_faturamento ?? null,
    faturamento_anual_base: values.company_faturamento_base,
  };
}

export type EmpresaNova = ReturnType<typeof useEmpresaNova>;

interface SecaoDaEmpresaProps {
  form: Formulario;
  empresaNova: EmpresaNova;
  disabled: boolean;
}

export function SecaoDaEmpresa(props: SecaoDaEmpresaProps) {
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
      {empresaNova.existente && (
        <AvisoDeEmpresaExistente empresa={empresaNova.existente} onUsar={() => empresaNova.usarExistente(empresaNova.existente!)} />
      )}
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
        <CampoDeFaturamento form={form} />
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
// Negócio (a oportunidade)
// --------------------------------------------------------------------------

export function CamposDaOportunidade({ form, aberto }: { form: Formulario; aberto: boolean }) {
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

type CampoTextual = Exclude<keyof FormData, 'estimated_value' | 'company_faturamento' | 'company_faturamento_base'>;

function CampoDeFaturamento({ form }: { form: Formulario }) {
  return (
    <FormField
      control={form.control}
      name="company_faturamento"
      render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Faturamento anual</FormLabel>
          <FaturamentoAnualField
            id="empresa-nova-faturamento"
            valor={field.value ?? 0}
            base={form.watch('company_faturamento_base') ?? FATURAMENTO_BASE_PADRAO}
            onValorChange={field.onChange}
            onBaseChange={(base) => form.setValue('company_faturamento_base', base)}
          />
        </FormItem>
      )}
    />
  );
}

export function CampoDeTexto(props: {
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

function AvisoDeEmpresaExistente({ empresa, onUsar }: { empresa: ProspectCompanyDB; onUsar: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning-subtle p-3 text-xs text-warning-emphasis">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <p>
          Este CNPJ já está cadastrado como <span className="font-medium">{empresa.name}</span>
          {empresa.razao_social && empresa.razao_social !== empresa.name && <> ({empresa.razao_social})</>}.
        </p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onUsar}>
          Usar esta empresa
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

export function ResumoDaEmpresa({ empresa }: { empresa: ProspectCompanyDB }) {
  const itens = [
    empresa.cnpj ? formatCNPJ(empresa.cnpj) : null,
    empresa.segment,
    empresa.ring ? `Anel ${empresa.ring}` : null,
    empresa.tier ? `Tier ${empresa.tier}` : null,
  ].filter(Boolean);

  return (
    <p className="text-xs text-muted-foreground">
      {itens.length > 0 ? itens.join(' · ') : 'Empresa sem dados complementares.'}
      {' '}Editável em Empresas e na ficha da oportunidade.
    </p>
  );
}

// --------------------------------------------------------------------------
// Validação
// --------------------------------------------------------------------------

export type ErroDeValidacao = { campo?: keyof FormData; mensagem: string };

/**
 * A empresa é obrigatória, e o CNPJ digitado tem que ser válido — deixar passar um CNPJ
 * inválido quebraria a deduplicação, que é justamente o que evita a mesma empresa entrar
 * duas vezes com dois donos diferentes.
 */
export function validarEmpresa(values: FormData, empresaNova: EmpresaNova): ErroDeValidacao | null {
  if (empresaNova.empresa) return null;
  if (!empresaNova.cadastrando || !values.company_name?.trim()) {
    return { mensagem: 'Escolha a empresa ou cadastre uma nova antes de salvar.' };
  }
  if (values.company_cnpj && !validateCNPJ(values.company_cnpj)) {
    return { campo: 'company_cnpj', mensagem: 'CNPJ inválido.' };
  }
  if (empresaNova.existente) {
    return { campo: 'company_cnpj', mensagem: `Já cadastrada como "${empresaNova.existente.name}". Use a existente.` };
  }
  return null;
}
