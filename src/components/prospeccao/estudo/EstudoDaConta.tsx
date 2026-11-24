import { useId, useState, type ReactNode } from 'react';
import { Check, Circle, Search, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FitPorServico } from '../CompanyFitSection';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyPartners } from '@/hooks/useCompanyReceita';
import { useFaturamentoDoTime, useFuncionariosDoTime, useTrazerSocio } from '@/hooks/useEstudoDaConta';
import { useUpdateProspectContact } from '@/hooks/useProspectContacts';
import { useUpdateOpportunityContactRole, useUpdateProspect } from '@/hooks/useProspects';
import { emTitulo } from '@/lib/prospecting/empresasReceita';
import { faltasDaPessoa, oQueFalta, pessoasPorPapel, sociosParaTrazer } from '@/lib/prospecting/estudoDaConta';
import { linkedinPeopleSearchUrl } from '@/lib/prospecting/receita';
import { cn } from '@/lib/utils';
import {
  getContactRoleLabel,
  getFaturamentoBaseLabel,
  PROSPECT_LEVERS,
  type ProspectCompanyDB,
  type ProspectOpportunityContact,
  type ProspectWithCompany,
} from '@/types/prospect';
import type { ItemDoEstudo } from '@/types/estudoDaConta';
import type { ProspectCompanyPartnerDB } from '@/types/receita';
import { BantNaOportunidade } from '../bant/BantNaOportunidade';
import { MeiosDeContato } from '../OpportunityContactsCard';
import { OpportunityContactRoleSelect } from '../OpportunityContactRoleSelect';

interface EstudoDaContaProps {
  prospect: ProspectWithCompany;
  somenteLeitura: boolean;
  /** "Não atende" no BANT sugere a Perda com o motivo (US-0022). */
  onSugerirPerda?: (motivo: string | null) => void;
}

/**
 * Aba "Estudo da conta" da oportunidade (US-0020): o que falta, as pessoas pelo papel na decisão,
 * os sócios da Receita ainda não trazidos, os funcionários confirmados e a alavanca. Só orienta:
 * a oportunidade avança sem o estudo. O desk research entra depois do ADR de IA.
 */
export function EstudoDaConta({ prospect, somenteLeitura, onSugerirPerda }: EstudoDaContaProps) {
  const { can } = useAuth();
  const podeEditar = !somenteLeitura && can('prospeccao:editar');
  const empresa = prospect.company ?? null;
  return (
    <div className="space-y-6">
      <BantNaOportunidade prospect={prospect} podeEditar={podeEditar} onSugerirPerda={onSugerirPerda} />
      <OQueFalta itens={oQueFalta(prospect, empresa)} />
      <Pessoas prospect={prospect} podeEditar={podeEditar} />
      {empresa && <Socios prospectId={prospect.id} empresa={empresa} podeEditar={podeEditar} />}
      {empresa && (
        <Secao titulo="Fit por serviço" descricao="Qual serviço oferecer: cada nota abre o porquê. Regra explícita, sem IA; o retrato da Base entra com funcionários, dívida, distância e faturamento.">
          <FitPorServico empresa={empresa} />
        </Secao>
      )}
      {empresa && (
        <Secao titulo="Porte" descricao="Confirme se você souber (pelo LinkedIn, pelo site, por conversa). Prevalece sobre a estimativa da base, na empresa.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Faturamento empresa={empresa} podeEditar={podeEditar} />
            <Funcionarios empresa={empresa} podeEditar={podeEditar} />
          </div>
        </Secao>
      )}
      <Alavanca prospect={prospect} podeEditar={podeEditar} />
    </div>
  );
}

interface SecaoProps {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

function Secao(props: SecaoProps) {
  const { titulo, descricao, children } = props;
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
        {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

/** Cenário 5: só orienta. */
function OQueFalta({ itens }: { itens: ItemDoEstudo[] }) {
  const faltam = itens.filter((i) => !i.feito).length;
  return (
    <Secao titulo="O que falta" descricao={faltam ? 'O estudo orienta a abordagem; a oportunidade pode avançar sem ele.' : 'Estudo completo.'}>
      <ul className="flex flex-wrap gap-2">
        {itens.map((i) => (
          <li
            key={i.chave}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
              i.feito ? 'border-transparent bg-success-subtle text-success-emphasis' : 'text-muted-foreground',
            )}
          >
            {i.feito ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
            {i.rotulo}
            <span className="sr-only">{i.feito ? ': feito' : ': falta'}</span>
          </li>
        ))}
      </ul>
    </Secao>
  );
}

/** Cenários 1 e 2: as pessoas da oportunidade pelo papel na decisão. */
function Pessoas({ prospect, podeEditar }: { prospect: ProspectWithCompany; podeEditar: boolean }) {
  const grupos = pessoasPorPapel(prospect.contacts ?? []);
  return (
    <Secao titulo="Pessoas a abordar" descricao="Pelo papel na decisão. Inclua ou retire pessoas no cartão Contatos, ao lado.">
      {grupos.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pessoa ainda. Traga um sócio abaixo ou inclua um contato.</p>}
      {grupos.map((g) => (
        <div key={g.papel ?? 'sem'} className="space-y-1.5">
          <p className={cn('text-xs font-medium', g.papel ? 'text-foreground' : 'text-warning-emphasis')}>
            {g.rotulo} <span className="font-normal text-muted-foreground">· {g.pessoas.length}</span>
          </p>
          <ul className="divide-y rounded-lg border">
            {g.pessoas.map((p) => <Pessoa key={p.contact_id} prospectId={prospect.id} vinculo={p} podeEditar={podeEditar} />)}
          </ul>
        </div>
      ))}
    </Secao>
  );
}

interface PessoaProps {
  prospectId: string;
  vinculo: ProspectOpportunityContact;
  podeEditar: boolean;
}

function Pessoa(props: PessoaProps) {
  const { prospectId, vinculo, podeEditar } = props;
  const [completando, setCompletando] = useState(false);
  const pessoa = vinculo.contact;
  const nome = pessoa?.name ?? 'Contato';
  const faltas = faltasDaPessoa(pessoa);
  const podeCompletar = podeEditar && !!pessoa && faltas.length > 0;
  return (
    <li className="space-y-2 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <QuemE nome={nome} cargo={pessoa?.role ?? null} faltas={faltas} />
        <PapelDaPessoa prospectId={prospectId} vinculo={vinculo} nome={nome} podeEditar={podeEditar} />
      </div>
      <div className="flex items-center gap-2">
        <MeiosDeContato pessoa={pessoa} />
        {podeCompletar && !completando && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setCompletando(true)}>Completar</Button>
        )}
      </div>
      {completando && pessoa && <CompletarPessoa pessoa={pessoa} onFechar={() => setCompletando(false)} />}
    </li>
  );
}

function QuemE(props: { nome: string; cargo: string | null; faltas: string[] }) {
  const { nome, cargo, faltas } = props;
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">
        <span className="font-medium">{nome}</span>
        {cargo && <span className="text-muted-foreground"> · {cargo}</span>}
      </p>
      {faltas.length > 0 && <p className="text-xs text-muted-foreground">Falta: {faltas.join(', ')}</p>}
    </div>
  );
}

function PapelDaPessoa(props: { prospectId: string; vinculo: ProspectOpportunityContact; nome: string; podeEditar: boolean }) {
  const { prospectId, vinculo, nome, podeEditar } = props;
  const mudar = useUpdateOpportunityContactRole();
  if (!podeEditar) {
    const papel = getContactRoleLabel(vinculo.role);
    return papel ? <Badge variant="secondary" className="shrink-0 font-normal">{papel}</Badge> : null;
  }
  return (
    <OpportunityContactRoleSelect
      value={vinculo.role}
      nome={nome}
      disabled={mudar.isPending}
      className="w-[150px] shrink-0"
      onChange={(role) => mudar.mutate({ prospectId, contactId: vinculo.contact_id, role })}
    />
  );
}

type PessoaDoVinculo = NonNullable<ProspectOpportunityContact['contact']>;

/** Cargo, LinkedIn e Instagram, no cadastro da pessoa (valem para todas as oportunidades dela). */
function CompletarPessoa({ pessoa, onFechar }: { pessoa: PessoaDoVinculo; onFechar: () => void }) {
  const salvar = useUpdateProspectContact();
  const [campos, setCampos] = useState({ role: pessoa.role ?? '', linkedin_url: pessoa.linkedin_url ?? '', instagram_url: pessoa.instagram_url ?? '' });
  const ids = { cargo: useId(), linkedin: useId(), instagram: useId() };
  const definir = (campo: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement>) => setCampos((c) => ({ ...c, [campo]: e.target.value }));
  const confirmar = () =>
    salvar.mutate(
      { id: pessoa.id, input: { name: pessoa.name, email: pessoa.email, phone: pessoa.phone, ...campos } },
      { onSuccess: onFechar },
    );
  return (
    <div className="grid gap-2 rounded-md bg-muted/40 p-2.5 sm:grid-cols-3">
      <CampoCurto id={ids.cargo} rotulo="Cargo" valor={campos.role} onChange={definir('role')} />
      <CampoCurto id={ids.linkedin} rotulo="LinkedIn" valor={campos.linkedin_url} onChange={definir('linkedin_url')} />
      <CampoCurto id={ids.instagram} rotulo="Instagram" valor={campos.instagram_url} onChange={definir('instagram_url')} placeholder="@perfil" />
      <div className="flex justify-end gap-2 sm:col-span-3">
        <Button variant="ghost" size="sm" onClick={onFechar} disabled={salvar.isPending}>Cancelar</Button>
        <Button size="sm" onClick={confirmar} disabled={salvar.isPending}>Salvar</Button>
      </div>
    </div>
  );
}

function CampoCurto(props: { id: string; rotulo: string; valor: string; placeholder?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const { id, rotulo, valor, placeholder, onChange } = props;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{rotulo}</Label>
      <Input id={id} value={valor} placeholder={placeholder} onChange={onChange} className="h-8 text-[13px]" />
    </div>
  );
}

/** Cenário 3: sócio da Receita vira pessoa da oportunidade. */
interface SociosProps {
  prospectId: string;
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
}

function Socios(props: SociosProps) {
  const { prospectId, empresa, podeEditar } = props;
  const { data: socios = [] } = useCompanyPartners(empresa.id);
  const paraTrazer = sociosParaTrazer(socios);
  if (paraTrazer.length === 0) return null;
  return (
    <Secao titulo="Sócios da Receita" descricao="Ainda não estão entre as pessoas a abordar.">
      <ul className="divide-y rounded-lg border">
        {paraTrazer.map((s) => <Socio key={s.id} socio={s} empresa={empresa} prospectId={prospectId} podeEditar={podeEditar} />)}
      </ul>
    </Secao>
  );
}

function Socio(props: { socio: ProspectCompanyPartnerDB; empresa: ProspectCompanyDB; prospectId: string; podeEditar: boolean }) {
  const { socio, empresa, prospectId, podeEditar } = props;
  const trazer = useTrazerSocio(prospectId);
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{emTitulo(socio.nome)}</p>
        {socio.qualificacao && <p className="truncate text-xs text-muted-foreground">{socio.qualificacao}</p>}
      </div>
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs font-normal" asChild>
        <a href={linkedinPeopleSearchUrl(socio.nome, empresa.nome_fantasia ?? empresa.name)} target="_blank" rel="noopener noreferrer">
          <Search className="mr-1 h-3 w-3" aria-hidden="true" />
          Procurar no LinkedIn
        </a>
      </Button>
      {podeEditar && (
        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => trazer.mutate(socio)} disabled={trazer.isPending}>
          <UserPlus className="mr-1 h-3 w-3" aria-hidden="true" />
          Trazer para a oportunidade
        </Button>
      )}
    </li>
  );
}

/** Cenário 4: prevalece sobre a RAIS na tela Empresas e no faturamento estimado. */
function Funcionarios({ empresa, podeEditar }: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const salvar = useFuncionariosDoTime();
  const id = useId();
  const atual = empresa.funcionarios_informados;
  const [texto, setTexto] = useState(atual != null ? String(atual) : '');
  const numero = texto.trim() === '' ? null : Number(texto.replace(/\D/g, ''));
  const mudou = numero !== (atual ?? null);
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">Funcionários</Label>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input id={id} inputMode="numeric" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Vale a RAIS" disabled={!podeEditar} className="h-9" />
        </div>
        {podeEditar && (
          <Button size="sm" className="h-9" disabled={!mudou || salvar.isPending} onClick={() => salvar.mutate({ companyId: empresa.id, funcionarios: numero })}>
            Salvar
          </Button>
        )}
      </div>
      <p className="text-[11.5px] text-muted-foreground">{atual != null ? 'Confirmados pelo time' : 'Vazio: vale a RAIS'}</p>
    </div>
  );
}

const MILHAO = 1_000_000;

/** "77" → 77 mi; "1,5" ou "1.5" → 1,5 mi. Truncado, nunca arredondado (ADR-0011). */
function deMilhoes(texto: string): number | null {
  const normalizado = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  const n = Number(normalizado.trim());
  return texto.trim() && Number.isFinite(n) && n > 0 ? Math.trunc(n * MILHAO) : null;
}

const emMilhoes = (valor: number) => (valor / MILHAO).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Faturamento que o time sabe, em milhões; entra como "Estimado" (pelo time). */
function Faturamento({ empresa, podeEditar }: { empresa: ProspectCompanyDB; podeEditar: boolean }) {
  const salvar = useFaturamentoDoTime();
  const id = useId();
  const atual = empresa.faturamento_anual ?? null;
  const [texto, setTexto] = useState(atual != null ? emMilhoes(atual) : '');
  const valor = deMilhoes(texto);
  const mudou = valor != null && valor !== atual;
  const origem = atual == null ? 'Sem faturamento na empresa' : `Hoje: ${getFaturamentoBaseLabel(empresa.faturamento_anual_base)?.toLowerCase() ?? 'informado'}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">Faturamento anual</Label>
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">R$</span>
          <Input id={id} inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!podeEditar} className="h-9 pl-9 pr-9 font-mono tabular-nums" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">mi</span>
        </div>
        {podeEditar && (
          <Button size="sm" className="h-9" disabled={!mudou || salvar.isPending} onClick={() => valor && salvar.mutate({ companyId: empresa.id, valor })}>
            Salvar
          </Button>
        )}
      </div>
      <p className="text-[11.5px] text-muted-foreground">{origem}</p>
    </div>
  );
}

const SEM_ALAVANCA = 'sem';

function Alavanca({ prospect, podeEditar }: { prospect: ProspectWithCompany; podeEditar: boolean }) {
  const atualizar = useUpdateProspect();
  const id = useId();
  return (
    <Secao titulo="Alavanca" descricao="O canal de chegada na empresa, definido ao abordar.">
      <Label htmlFor={id} className="sr-only">Alavanca</Label>
      <Select
        value={prospect.lever ?? SEM_ALAVANCA}
        disabled={!podeEditar || atualizar.isPending}
        onValueChange={(v) => atualizar.mutate({ id: prospect.id, updates: { lever: v === SEM_ALAVANCA ? null : v } })}
      >
        <SelectTrigger id={id} className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={SEM_ALAVANCA}>Sem alavanca</SelectItem>
          {PROSPECT_LEVERS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </Secao>
  );
}
