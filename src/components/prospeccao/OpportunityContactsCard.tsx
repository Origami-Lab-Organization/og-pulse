import { useState } from 'react';
import { Instagram, Linkedin, Mail, Pencil, Phone, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import {
  useAddOpportunityContact,
  useUpdateOpportunityContactRole,
} from '@/hooks/useProspects';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { cn } from '@/lib/utils';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import {
  getContactRoleLabel,
  sortOpportunityContacts,
  type ProspectContactWithCompany,
  type ProspectOpportunityContact,
  type ProspectWithCompany,
} from '@/types/prospect';
import { OpportunityContactEditForm } from './OpportunityContactEditForm';
import { NovoContatoDaOportunidade } from './OpportunityNewContactForm';
import { OpportunityContactRoleSelect } from './OpportunityContactRoleSelect';
import { ProspectContactSelect } from './ProspectContactSelect';
import { CartaoDaFicha, LinhaDeDado } from './FichaDaOportunidade';

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
    <ul className="-mb-4 -mt-4 divide-y">
      {contatos.map((c) => (
        <li key={c.contact_id}>
          <LinhaDoContato prospectId={prospectId} vinculo={c} podeEditar={podeEditar} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Um perfil por pessoa (16/11/2026, no desenho de ficha de contato do HubSpot): avatar, nome e
 * cargo no topo; uma fileira de ações rápidas (ligar, e-mail, redes) e, embaixo, os dados com
 * o rótulo sobre o valor. Ação sem dado cadastrado fica apagada, para mostrar o que falta.
 *
 * Desde 26/11/2026 o lápis abre a edição da pessoa no lugar do perfil, e retirar da
 * oportunidade só aparece lá — o X solto no canto tirava gente por engano.
 */
function LinhaDoContato(props: { prospectId: string; vinculo: ProspectOpportunityContact; podeEditar: boolean }) {
  const { prospectId, vinculo, podeEditar } = props;
  const [editando, setEditando] = useState(false);
  const pessoa = vinculo.contact;
  const nome = pessoa?.name ?? 'Contato';

  if (editando && pessoa) {
    return (
      <div className="py-5">
        <OpportunityContactEditForm prospectId={prospectId} pessoa={pessoa} onFechar={() => setEditando(false)} />
      </div>
    );
  }

  return (
    <article aria-label={nome} className="relative space-y-5 py-5">
      {podeEditar && pessoa && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-2 top-4 h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label={`Editar ${nome}`}
          title="Editar contato"
          onClick={() => setEditando(true)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      <div className="flex items-center gap-3 pr-8">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">{iniciaisDe(nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold leading-tight">{nome}</p>
          {pessoa?.role && <p className="mt-1 break-words text-sm text-muted-foreground">{pessoa.role}</p>}
        </div>
      </div>
      <AcoesRapidas pessoa={pessoa} />
      <dl className="space-y-3.5">
        <LinhaDeDado termo="E-mail">
          {pessoa?.email && <LinkDeMeio href={`mailto:${pessoa.email}`} texto={pessoa.email} />}
        </LinhaDeDado>
        <LinhaDeDado termo="Telefone">
          {pessoa?.phone && <LinkDeMeio href={`tel:${pessoa.phone.replace(/[^\d+]/g, '')}`} texto={pessoa.phone} />}
        </LinhaDeDado>
        <PapelNaDecisao prospectId={prospectId} vinculo={vinculo} nome={nome} podeEditar={podeEditar} />
      </dl>
    </article>
  );
}

function PapelNaDecisao(props: { prospectId: string; vinculo: ProspectOpportunityContact; nome: string; podeEditar: boolean }) {
  const { prospectId, vinculo, nome, podeEditar } = props;
  const mudarPapel = useUpdateOpportunityContactRole();
  if (!podeEditar) return <LinhaDeDado termo="Papel na decisão">{getContactRoleLabel(vinculo.role)}</LinhaDeDado>;
  return (
    <LinhaDeDado termo="Papel na decisão">
      <OpportunityContactRoleSelect
        value={vinculo.role}
        nome={nome}
        onChange={(role) => mudarPapel.mutate({ prospectId, contactId: vinculo.contact_id, role })}
        disabled={mudarPapel.isPending}
        className="mt-0.5 h-9 w-full text-sm font-normal"
      />
    </LinhaDeDado>
  );
}

function LinkDeMeio({ href, texto }: { href: string; texto: string }) {
  return (
    <a
      href={href}
      title={texto}
      className="break-all rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {texto}
    </a>
  );
}

/** A fileira de ações do perfil: um círculo por meio, com o nome embaixo. */
function AcoesRapidas({ pessoa }: { pessoa: ProspectOpportunityContact['contact'] }) {
  const instagram = urlDoInstagram(pessoa?.instagram_url);
  const linkedin = pessoa?.linkedin_url ? comProtocolo(pessoa.linkedin_url) : null;
  return (
    <div className="flex justify-start gap-4">
      <AcaoRapida rotulo="Ligar" icone={Phone} href={pessoa?.phone ? `tel:${pessoa.phone.replace(/[^\d+]/g, '')}` : null} />
      <AcaoRapida rotulo="E-mail" icone={Mail} href={pessoa?.email ? `mailto:${pessoa.email}` : null} />
      <AcaoRapida rotulo="LinkedIn" icone={Linkedin} href={linkedin} externo />
      <AcaoRapida rotulo="Instagram" icone={Instagram} href={instagram} externo />
    </div>
  );
}

function AcaoRapida(props: { rotulo: string; icone: typeof Mail; href: string | null; externo?: boolean }) {
  const { rotulo, icone: Icone, href, externo = false } = props;
  const circulo = 'flex h-10 w-10 items-center justify-center rounded-full border transition-colors';
  if (!href) {
    return (
      <span className="flex w-14 flex-col items-center gap-1.5 text-muted-foreground/60" title={`${rotulo}: não cadastrado`}>
        <span className={cn(circulo, 'border-dashed')} aria-hidden="true">
          <Icone className="h-4 w-4" />
        </span>
        <span className="text-xs">{rotulo}</span>
        <span className="sr-only">não cadastrado</span>
      </span>
    );
  }
  return (
    <a
      href={href}
      className="group flex w-14 flex-col items-center gap-1.5 rounded-md text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className={cn(circulo, 'bg-card text-primary group-hover:border-primary group-hover:bg-primary/10')} aria-hidden="true">
        <Icone className="h-4 w-4" />
      </span>
      <span className="text-xs group-hover:text-foreground">{rotulo}</span>
    </a>
  );
}

/**
 * A linha compacta de meios (telefone por extenso; e-mail e redes pelo ícone), usada fora da
 * ficha — no Estudo da Conta. Na ficha, o perfil do contato usa as ações rápidas.
 *
 * O telefone por extenso, que é o que se disca; e-mail e redes, só pelo ícone (o endereço vai no título). */
export function MeiosDeContato({ pessoa }: { pessoa: ProspectOpportunityContact['contact'] }) {
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
