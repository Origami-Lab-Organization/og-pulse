import { useState } from 'react';
import { Instagram, Linkedin, Loader2, Mail, Phone, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreateProspectContact,
  useProspectContactDuplicate,
  useProspectContacts,
} from '@/hooks/useProspectContacts';
import {
  useAddOpportunityContact,
  useRemoveOpportunityContact,
  useUpdateOpportunityContactRole,
} from '@/hooks/useProspects';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import {
  getContactRoleLabel,
  opportunityName,
  sortOpportunityContacts,
  type ProspectContactWithCompany,
  type ProspectOpportunityContact,
  type ProspectWithCompany,
} from '@/types/prospect';
import { OpportunityContactRoleSelect } from './OpportunityContactRoleSelect';
import { ProspectContactSelect } from './ProspectContactSelect';

interface OpportunityContactsCardProps {
  prospect: ProspectWithCompany;
  /** `false` na oportunidade somente leitura; a capacidade de editar é conferida aqui. */
  podeEditar: boolean;
}

/**
 * Quem participa da oportunidade (09/10/2026): cada pessoa com o papel dela na decisão.
 *
 * Os dados da pessoa (nome, cargo, e-mail, redes) são do cadastro de Contatos e valem para
 * todas as oportunidades dela; aqui se decide só QUEM participa e com que papel. Retirar
 * alguém não apaga a pessoa nem as atividades registradas com ela.
 */
export function OpportunityContactsCard({ prospect, podeEditar: editavel }: OpportunityContactsCardProps) {
  const { can } = useAuth();
  const podeEditar = editavel && can('prospeccao:editar');
  const [incluindo, setIncluindo] = useState(false);
  const contatos = sortOpportunityContacts(prospect.contacts ?? []);

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Contatos da oportunidade">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contatos · {contatos.length}</h3>
        {podeEditar && !incluindo && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIncluindo(true)}>
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            Incluir
          </Button>
        )}
      </header>

      <ListaDeContatos prospectId={prospect.id} contatos={contatos} podeEditar={podeEditar} vazioVisivel={!incluindo} />
      {incluindo && <InclusaoDeContato prospect={prospect} onFechar={() => setIncluindo(false)} />}
      {podeEditar && <SugestoesDaEmpresa prospect={prospect} />}

      <p className="mt-3 text-xs text-muted-foreground">Os dados de cada pessoa se editam em Contatos.</p>
    </section>
  );
}

function ListaDeContatos(props: {
  prospectId: string;
  contatos: ProspectOpportunityContact[];
  podeEditar: boolean;
  vazioVisivel: boolean;
}) {
  const { prospectId, contatos, podeEditar, vazioVisivel } = props;
  if (contatos.length === 0) {
    return vazioVisivel ? <p className="text-sm text-muted-foreground">Nenhum contato nesta oportunidade ainda.</p> : null;
  }
  return (
    <ul className="space-y-2">
      {contatos.map((c) => (
        <li key={c.contact_id}>
          <LinhaDoContato prospectId={prospectId} vinculo={c} podeEditar={podeEditar} />
        </li>
      ))}
    </ul>
  );
}

function LinhaDoContato(props: { prospectId: string; vinculo: ProspectOpportunityContact; podeEditar: boolean }) {
  const { prospectId, vinculo, podeEditar } = props;
  const mudarPapel = useUpdateOpportunityContactRole();
  const retirar = useRemoveOpportunityContact();
  const pessoa = vinculo.contact;
  const nome = pessoa?.name ?? 'Contato';
  const papel = getContactRoleLabel(vinculo.role);

  return (
    <div className="space-y-1.5 rounded-md border p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{nome}</p>
          {pessoa?.role && <p className="truncate text-xs text-muted-foreground">{pessoa.role}</p>}
        </div>
        {podeEditar ? (
          <>
            <OpportunityContactRoleSelect
              value={vinculo.role}
              nome={nome}
              onChange={(role) => mudarPapel.mutate({ prospectId, contactId: vinculo.contact_id, role })}
              disabled={mudarPapel.isPending}
              className="w-32"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Retirar ${nome} da oportunidade`}
              title="Retirar da oportunidade"
              disabled={retirar.isPending}
              onClick={() => retirar.mutate({ prospectId, contactId: vinculo.contact_id })}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        ) : (
          papel && <Badge variant="secondary" className="shrink-0 font-normal">{papel}</Badge>
        )}
      </div>
      <MeiosDeContato pessoa={pessoa} />
    </div>
  );
}

type Pessoa = NonNullable<ProspectOpportunityContact['contact']>;

/** Cada meio de contato preenchido vira um botão: e-mail e telefone abrem o app, redes abrem aba. */
const MEIOS: ReadonlyArray<{
  campo: 'email' | 'phone' | 'linkedin_url' | 'instagram_url';
  icone: typeof Mail;
  href: (valor: string) => string;
  rotulo: (valor: string) => string;
  externo: boolean;
}> = [
  { campo: 'email', icone: Mail, href: (v) => `mailto:${v}`, rotulo: (v) => v, externo: false },
  { campo: 'phone', icone: Phone, href: (v) => `tel:${v.replace(/[^\d+]/g, '')}`, rotulo: (v) => v, externo: false },
  { campo: 'linkedin_url', icone: Linkedin, href: comProtocolo, rotulo: () => 'LinkedIn', externo: true },
  { campo: 'instagram_url', icone: Instagram, href: (v) => urlDoInstagram(v) ?? v, rotulo: () => 'Instagram', externo: true },
];

function MeiosDeContato({ pessoa }: { pessoa: ProspectOpportunityContact['contact'] }) {
  const meios = pessoa ? MEIOS.filter((m) => !!pessoa[m.campo]) : [];
  if (!pessoa || meios.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {meios.map((meio) => (
        <LinkDeMeio key={meio.campo} meio={meio} valor={(pessoa as Pessoa)[meio.campo] as string} />
      ))}
    </div>
  );
}

function LinkDeMeio({ meio, valor }: { meio: (typeof MEIOS)[number]; valor: string }) {
  const { icone: Icone, externo } = meio;
  return (
    <Button variant="outline" size="sm" className="h-7 max-w-full px-2 text-xs font-normal" asChild>
      <a href={meio.href(valor)} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        <Icone className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{meio.rotulo(valor)}</span>
      </a>
    </Button>
  );
}

/**
 * Incluir alguém: busca quem já está cadastrado (em qualquer empresa) ou cadastra a pessoa
 * nova já na empresa da oportunidade — com a mesma deduplicação por e-mail e LinkedIn.
 */
function InclusaoDeContato({ prospect, onFechar }: { prospect: ProspectWithCompany; onFechar: () => void }) {
  const incluir = useAddOpportunityContact();
  const [novoNome, setNovoNome] = useState<string | null>(null);
  const jaIncluidos = new Set((prospect.contacts ?? []).map((c) => c.contact_id));

  const vincular = (contato: ProspectContactWithCompany | null) => {
    if (!contato) return;
    incluir.mutate({ prospectId: prospect.id, contactId: contato.id }, { onSuccess: onFechar });
  };

  if (novoNome !== null) {
    return <PessoaNova prospect={prospect} nomeInicial={novoNome} onUsarExistente={vincular} onFechar={onFechar} />;
  }

  return (
    <div className="mt-3 space-y-2">
      <ProspectContactSelect
        value={null}
        onChange={vincular}
        onCreateNew={setNovoNome}
        excluir={jaIncluidos}
        placeholder="Buscar contato para incluir"
        disabled={incluir.isPending}
      />
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onFechar} disabled={incluir.isPending}>
        Cancelar
      </Button>
    </div>
  );
}

type CampoDaPessoa = 'name' | 'role' | 'email' | 'phone' | 'linkedin_url';

const CAMPOS_DA_PESSOA: ReadonlyArray<{ campo: CampoDaPessoa; rotulo: string; tipo?: string }> = [
  { campo: 'name', rotulo: 'Nome' },
  { campo: 'role', rotulo: 'Cargo' },
  { campo: 'email', rotulo: 'E-mail', tipo: 'email' },
  { campo: 'phone', rotulo: 'Telefone' },
  { campo: 'linkedin_url', rotulo: 'LinkedIn' },
];

function PessoaNova(props: {
  prospect: ProspectWithCompany;
  nomeInicial: string;
  onUsarExistente: (contato: ProspectContactWithCompany) => void;
  onFechar: () => void;
}) {
  const { prospect, nomeInicial, onUsarExistente, onFechar } = props;
  const criar = useCreateProspectContact();
  const incluir = useAddOpportunityContact();
  const [dados, setDados] = useState<Record<CampoDaPessoa, string>>({
    name: nomeInicial, role: '', email: '', phone: '', linkedin_url: '',
  });
  const duplicado = useProspectContactDuplicate(dados.email, dados.linkedin_url).data ?? null;
  const ocupado = criar.isPending || incluir.isPending;
  const bloqueado = ocupado || !!duplicado || dados.name.trim().length < 2;

  const salvar = async () => {
    const pessoa = await criar.mutateAsync({ ...dados, company_id: prospect.company_id });
    await incluir.mutateAsync({ prospectId: prospect.id, contactId: pessoa.id });
    onFechar();
  };

  return (
    <form
      className="mt-3 space-y-2 rounded-md border bg-muted/30 p-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        salvar().catch(() => undefined);
      }}
    >
      <p className="text-xs font-medium">Novo contato em {opportunityName(prospect)}</p>
      {CAMPOS_DA_PESSOA.map(({ campo, rotulo, tipo }) => (
        <div key={campo} className="space-y-1">
          <Label htmlFor={`novo-contato-${campo}`} className="text-xs text-muted-foreground">{rotulo}</Label>
          <Input
            id={`novo-contato-${campo}`}
            type={tipo}
            value={dados[campo]}
            onChange={(e) => setDados((atual) => ({ ...atual, [campo]: e.target.value }))}
            disabled={ocupado}
            className="h-8"
          />
        </div>
      ))}
      {duplicado && <AvisoDeDuplicado contato={duplicado} onUsar={() => onUsarExistente(duplicado)} />}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={bloqueado}>
          {ocupado && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Cadastrar e incluir
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onFechar} disabled={ocupado}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** A deduplicação vale aqui também: quem já usa o e-mail ou LinkedIn é incluído, não recriado. */
function AvisoDeDuplicado({ contato, onUsar }: { contato: ProspectContactWithCompany; onUsar: () => void }) {
  return (
    <div role="alert" className="space-y-1.5 rounded-md border border-warning/40 bg-warning-subtle p-2 text-xs text-warning-emphasis">
      <p>
        Já existe <span className="font-medium">{contato.name}</span>
        {contato.company?.name && <> ({contato.company.name})</>} com este e-mail ou LinkedIn.
      </p>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={onUsar}>
        Incluir este contato
      </Button>
    </div>
  );
}

/** As pessoas da empresa que ainda não estão na oportunidade: um clique para incluir. */
function SugestoesDaEmpresa({ prospect }: { prospect: ProspectWithCompany }) {
  const { data: pessoas = [] } = useProspectContacts();
  const incluir = useAddOpportunityContact();
  const jaIncluidos = new Set((prospect.contacts ?? []).map((c) => c.contact_id));
  const sugestoes = pessoas.filter((p) => p.company_id === prospect.company_id && !jaIncluidos.has(p.id));
  if (sugestoes.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Outros contatos da empresa</p>
      <div className="flex flex-wrap gap-1.5">
        {sugestoes.map((p) => (
          <Button
            key={p.id}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-normal"
            disabled={incluir.isPending}
            aria-label={`Incluir ${p.name} na oportunidade`}
            onClick={() => incluir.mutate({ prospectId: prospect.id, contactId: p.id })}
          >
            <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
            {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
