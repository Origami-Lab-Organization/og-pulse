import { useState } from 'react';
import { Instagram, Linkedin, Mail, Phone, Plus, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import {
  useAddOpportunityContact,
  useRemoveOpportunityContact,
  useUpdateOpportunityContactRole,
} from '@/hooks/useProspects';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import {
  getContactRoleLabel,
  sortOpportunityContacts,
  type ProspectContactWithCompany,
  type ProspectOpportunityContact,
  type ProspectWithCompany,
} from '@/types/prospect';
import { NovoContatoDaOportunidade } from './OpportunityNewContactForm';
import { OpportunityContactRoleSelect } from './OpportunityContactRoleSelect';
import { ProspectContactSelect } from './ProspectContactSelect';
import { CartaoDaFicha } from './FichaDaOportunidade';

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

  const acao = podeEditar && !incluindo && (
    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setIncluindo(true)}>
      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      Incluir
    </Button>
  );

  return (
    <CartaoDaFicha
      rotulo="Contatos da oportunidade"
      titulo={<>Contatos <span className="font-normal text-muted-foreground">· {contatos.length}</span></>}
      resumo={contatos.map((c) => c.contact?.name).filter(Boolean).join(', ')}
      acao={acao}
    >
      <ListaDeContatos prospectId={prospect.id} contatos={contatos} podeEditar={podeEditar} vazioVisivel={!incluindo} />
      {incluindo && <InclusaoDeContato prospect={prospect} onFechar={() => setIncluindo(false)} />}
      {podeEditar && <SugestoesDaEmpresa prospect={prospect} />}
    </CartaoDaFicha>
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
    <ul className="-mb-2.5 -mt-1.5 divide-y">
      {contatos.map((c) => (
        <li key={c.contact_id}>
          <LinhaDoContato prospectId={prospectId} vinculo={c} podeEditar={podeEditar} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Uma pessoa por linha (27/10/2026): nome e cargo em cima; embaixo, como falar com ela e o
 * papel na decisão num seletor pequeno. Antes era um cartão por pessoa, com o seletor largo
 * numa seção própria — três contatos enchiam a coluna.
 */
function LinhaDoContato(props: { prospectId: string; vinculo: ProspectOpportunityContact; podeEditar: boolean }) {
  const { prospectId, vinculo, podeEditar } = props;
  const retirar = useRemoveOpportunityContact();
  const pessoa = vinculo.contact;
  const nome = pessoa?.name ?? 'Contato';

  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback className="bg-muted text-[11px] font-semibold text-muted-foreground">{iniciaisDe(nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <p className="min-w-0 flex-1 truncate text-sm" title={pessoa?.role ? `${nome} · ${pessoa.role}` : nome}>
            <span className="font-medium">{nome}</span>
            {pessoa?.role && <span className="text-muted-foreground"> · {pessoa.role}</span>}
          </p>
          {podeEditar && (
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Retirar ${nome} da oportunidade`}
              title="Retirar da oportunidade"
              disabled={retirar.isPending}
              onClick={() => retirar.mutate({ prospectId, contactId: vinculo.contact_id })}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <MeiosDeContato pessoa={pessoa} />
          <PapelNaDecisao prospectId={prospectId} vinculo={vinculo} nome={nome} podeEditar={podeEditar} />
        </div>
      </div>
    </div>
  );
}

function PapelNaDecisao(props: { prospectId: string; vinculo: ProspectOpportunityContact; nome: string; podeEditar: boolean }) {
  const { prospectId, vinculo, nome, podeEditar } = props;
  const mudarPapel = useUpdateOpportunityContactRole();
  if (!podeEditar) {
    const papel = getContactRoleLabel(vinculo.role);
    return papel ? <Badge variant="secondary" className="ml-auto shrink-0 font-normal">{papel}</Badge> : null;
  }
  return (
    <OpportunityContactRoleSelect
      value={vinculo.role}
      nome={nome}
      onChange={(role) => mudarPapel.mutate({ prospectId, contactId: vinculo.contact_id, role })}
      disabled={mudarPapel.isPending}
      // Sem borda, do tamanho do texto: o seletor largo cortava o telefone ao lado.
      className="ml-auto h-7 w-auto shrink-0 gap-1 border-transparent bg-transparent px-1.5 text-xs text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
    />
  );
}

/** O telefone por extenso, que é o que se disca; e-mail e redes, só pelo ícone (o endereço vai no título). */
function MeiosDeContato({ pessoa }: { pessoa: ProspectOpportunityContact['contact'] }) {
  if (!pessoa) return <span className="flex-1" />;
  const instagram = urlDoInstagram(pessoa.instagram_url);
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {pessoa.phone && (
        <a
          href={`tel:${pessoa.phone.replace(/[^\d+]/g, '')}`}
          className="mr-0.5 flex min-w-0 items-center gap-1 rounded text-xs text-foreground/90 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Phone className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{pessoa.phone}</span>
        </a>
      )}
      {pessoa.email && <IconeDeMeio href={`mailto:${pessoa.email}`} icone={Mail} rotulo={pessoa.email} externo={false} />}
      {pessoa.linkedin_url && <IconeDeMeio href={comProtocolo(pessoa.linkedin_url)} icone={Linkedin} rotulo={`LinkedIn de ${pessoa.name}`} />}
      {instagram && <IconeDeMeio href={instagram} icone={Instagram} rotulo={`Instagram de ${pessoa.name}`} />}
    </div>
  );
}

function IconeDeMeio(props: { href: string; icone: typeof Mail; rotulo: string; externo?: boolean }) {
  const { href, icone: Icone, rotulo, externo = true } = props;
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary" asChild>
      <a href={href} aria-label={rotulo} title={rotulo} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        <Icone className="h-3.5 w-3.5" aria-hidden="true" />
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
    return (
      <div className="mt-3 rounded-md border bg-muted/30 p-2.5">
        <NovoContatoDaOportunidade
          prospect={prospect}
          nomeInicial={novoNome}
          onUsarExistente={vincular}
          onIncluido={onFechar}
          onCancelar={onFechar}
          compacto
        />
      </div>
    );
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
