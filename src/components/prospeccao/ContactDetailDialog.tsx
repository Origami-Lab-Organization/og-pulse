import { useEffect, useState } from 'react';
import { ChevronRight, Instagram, Kanban, Linkedin, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';
import {
  useDeleteProspectContact,
  useProspectContactDuplicate,
  useUpdateProspectContact,
} from '@/hooks/useProspectContacts';
import type { ContactRow } from '@/lib/prospecting/contactList';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import { cn } from '@/lib/utils';
import {
  getContactRoleLabel,
  getProspectStageColor,
  getProspectStageLabel,
  opportunityName,
  type ProspectCompanyDB,
  type ProspectContactWithCompany,
  type ProspectWithCompany,
} from '@/types/prospect';
import { Item, LinkExterno, Rodape, Secao } from './FichaDeCadastro';
import { ProspectCompanySelect } from './ProspectCompanySelect';

interface ContactDetailDialogProps {
  row: ContactRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCard: (card: ProspectWithCompany) => void;
  /** "Incluir em oportunidade": a nova, ou uma que a empresa já tem em andamento. */
  onStartProspecting: (contato: ProspectContactWithCompany) => void;
}

/**
 * O contato inteiro num lugar só (01/10/2026, ADR-0045): quem é e as oportunidades em que
 * está ou esteve. Editar aqui edita a pessoa, e isso vale para todas as oportunidades dela.
 */
export function ContactDetailDialog(props: ContactDetailDialogProps) {
  const { row, open, onOpenChange } = props;
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (open) setEditando(false);
  }, [open, row?.contact.id]);

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-14 flex max-h-[calc(100vh-7rem)] max-w-[600px] translate-y-0 flex-col gap-0 overflow-hidden rounded-[14px] p-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0"
        onEscapeKeyDown={(e) => {
          // Esc sai da edição antes de fechar: a pessoa não perde o modal por engano.
          if (!editando) return;
          e.preventDefault();
          setEditando(false);
        }}
      >
        <Cabecalho row={row} />
        {editando ? (
          <Edicao row={row} onFechar={() => setEditando(false)} />
        ) : (
          <Visualizacao {...props} row={row} onEditar={() => setEditando(true)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Cabecalho({ row }: { row: ContactRow }) {
  const { contact, aberto } = row;
  return (
    <DialogHeader className="space-y-3 border-b px-6 pb-[18px] pt-[22px] text-left">
      <div className="space-y-1 pr-8">
        <DialogTitle className="text-[19px] font-semibold leading-[1.3] tracking-[-0.01em]">{contact.name}</DialogTitle>
        <DialogDescription className="text-[13px]">
          {[contact.role, contact.company?.name].filter(Boolean).join(' · ') || 'Sem cargo informado'}
        </DialogDescription>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {aberto ? (
          <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(aberto.stage))}>
            No Pipeline · {getProspectStageLabel(aberto.stage)}
          </Badge>
        ) : (
          <span className="inline-flex h-[26px] items-center rounded-full border px-2.5 text-[12.5px] text-muted-foreground">
            Fora do Pipeline
          </span>
        )}
      </div>
    </DialogHeader>
  );
}

interface VisualizacaoProps extends ContactDetailDialogProps {
  row: ContactRow;
  onEditar: () => void;
}

function Visualizacao(props: VisualizacaoProps) {
  const { row, onOpenCard } = props;
  const { contact, cards } = row;

  return (
    <>
      <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto px-6 pb-5 pt-1.5">
        <Secao titulo="Dados do contato">
          <Item rotulo="Empresa">{contact.company?.name}</Item>
          <Item rotulo="Cargo">{contact.role}</Item>
          <Item rotulo="E-mail">{contact.email && <span className="truncate">{contact.email}</span>}</Item>
          <Item rotulo="Telefone">{contact.phone}</Item>
          <Item rotulo="LinkedIn">
            {contact.linkedin_url && <LinkExterno href={comProtocolo(contact.linkedin_url)} icone={Linkedin} />}
          </Item>
          <Item rotulo="Instagram">
            {contact.instagram_url && <LinkExterno href={urlDoInstagram(contact.instagram_url)} icone={Instagram} />}
          </Item>
        </Secao>

        <Secao titulo={`Oportunidades · ${cards.length}`}>
          <div className="pt-1">
            <CardsDoContato contatoId={contact.id} cards={cards} onOpenCard={onOpenCard} />
          </div>
        </Secao>
      </div>

      <AcoesDoContato {...props} />
    </>
  );
}

/**
 * Excluir só quem não está em nenhuma oportunidade (a FK recusa o resto). Incluir em
 * oportunidade vale sempre (09/10/2026): a mesma pessoa pode estar em duas oportunidades.
 */
function AcoesDoContato(props: VisualizacaoProps) {
  const { row, onEditar, onOpenChange, onStartProspecting } = props;
  const { can } = useAuth();
  const fechar = () => onOpenChange(false);
  if (!can('prospeccao:editar')) {
    return <Rodape><Button variant="outline" onClick={fechar}>Fechar</Button></Rodape>;
  }
  return (
    <Rodape>
      {row.cards.length === 0 && <BotaoExcluir contato={row.contact} onExcluido={fechar} />}
      <Button variant="outline" onClick={fechar}>Fechar</Button>
      <Button variant="outline" onClick={() => onStartProspecting(row.contact)}>
        <Kanban className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Incluir em oportunidade
      </Button>
      <Button onClick={onEditar}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Editar dados
      </Button>
    </Rodape>
  );
}

/** As oportunidades da pessoa, da mais recente à mais antiga: etapa, empresa, papel dela e com quem do time. */
function CardsDoContato(props: {
  contatoId: string;
  cards: ProspectWithCompany[];
  onOpenCard: (card: ProspectWithCompany) => void;
}) {
  const { contatoId, cards, onOpenCard } = props;
  const { byId } = useEmployeeDirectoryMap();
  if (cards.length === 0) {
    return <p className="py-3 text-[13.5px] text-muted-foreground">Ainda não está em nenhuma oportunidade. Use "Incluir em oportunidade".</p>;
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {cards.map((card) => {
        const responsavel = card.owner_id ? byId.get(card.owner_id)?.nome : undefined;
        const papel = getContactRoleLabel(card.contacts?.find((c) => c.contact_id === contatoId)?.role);
        const detalhe = [opportunityName(card), papel, responsavel && `com ${responsavel}`, `aberta em ${formatarData(card.created_at)}`]
          .filter(Boolean)
          .join(' · ');
        return (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onOpenCard(card)}
              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(card.stage))}>
                  {getProspectStageLabel(card.stage)}
                </Badge>
                <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BotaoExcluir({ contato, onExcluido }: { contato: ProspectContactWithCompany; onExcluido: () => void }) {
  const excluir = useDeleteProspectContact();
  const [confirmando, setConfirmando] = useState(false);
  return (
    <>
      <Button variant="outline" className="mr-auto text-destructive hover:text-destructive" onClick={() => setConfirmando(true)}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Excluir
      </Button>
      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {contato.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O contato sai do cadastro. Ele não está em nenhuma oportunidade, então nenhum histórico se perde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={excluir.isPending}
              onClick={() => excluir.mutate(contato.id, { onSuccess: onExcluido })}
            >
              Excluir contato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type Rascunho = Record<'name' | 'role' | 'email' | 'phone' | 'linkedin' | 'instagram', string>;

const CAMPOS: ReadonlyArray<{ chave: keyof Rascunho; rotulo: string; largo?: boolean; placeholder?: string; tipo?: string }> = [
  { chave: 'name', rotulo: 'Nome', largo: true },
  { chave: 'role', rotulo: 'Cargo' },
  { chave: 'phone', rotulo: 'Telefone' },
  { chave: 'email', rotulo: 'E-mail', largo: true, tipo: 'email' },
  { chave: 'linkedin', rotulo: 'LinkedIn', placeholder: 'linkedin.com/in/…' },
  { chave: 'instagram', rotulo: 'Instagram', placeholder: '@contato ou link do perfil' },
];

function Edicao({ row, onFechar }: { row: ContactRow; onFechar: () => void }) {
  const { contact } = row;
  const atualizar = useUpdateProspectContact();
  const empresaAtual = useEmpresaDoContato(contact);
  const [empresa, setEmpresa] = useState<ProspectCompanyDB | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(() => rascunhoInicial(contact));
  const duplicado = useProspectContactDuplicate(rascunho.email, rascunho.linkedin, contact.id).data ?? null;
  const empresaEscolhida = empresa ?? empresaAtual;

  const bloqueado = atualizar.isPending || !!duplicado || rascunho.name.trim().length < 2;

  const salvar = () => {
    const companyId = empresaEscolhida?.id ?? contact.company_id;
    atualizar.mutate({ id: contact.id, input: pessoaDoRascunho(rascunho, companyId) }, { onSuccess: onFechar });
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-3.5 overflow-y-auto px-6 pb-6 pt-5">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[12.5px] font-medium text-muted-foreground">Empresa</Label>
          <ProspectCompanySelect value={empresaEscolhida} onChange={(c) => c && setEmpresa(c)} disabled={atualizar.isPending} />
        </div>
        {CAMPOS.map((campo) => (
          <div key={campo.chave} className={cn('space-y-1.5', campo.largo && 'col-span-2')}>
            <Label htmlFor={`contato-${campo.chave}`} className="text-[12.5px] font-medium text-muted-foreground">
              {campo.rotulo}
            </Label>
            <Input
              id={`contato-${campo.chave}`}
              type={campo.tipo}
              value={rascunho[campo.chave]}
              placeholder={campo.placeholder}
              onChange={(e) => setRascunho((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
              disabled={atualizar.isPending}
              className="h-[38px]"
            />
          </div>
        ))}
        {duplicado && <AvisoDeDuplicado contato={duplicado} />}
        <p className="col-span-2 text-xs text-muted-foreground">
          Os dados do contato valem para todas as oportunidades dele. Trocar a empresa não move as oportunidades já abertas.
        </p>
      </div>

      <Rodape>
        <Button type="button" variant="outline" onClick={onFechar} disabled={atualizar.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={bloqueado}>
          {atualizar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar alterações
        </Button>
      </Rodape>
    </form>
  );
}

/** A deduplicação vale na edição também: o e-mail ou LinkedIn não pode ser de outra pessoa. */
function AvisoDeDuplicado({ contato }: { contato: ProspectContactWithCompany }) {
  const empresa = contato.company?.name ? ` (${contato.company.name})` : '';
  return (
    <p role="alert" className="col-span-2 text-xs font-medium text-destructive">
      {contato.name}{empresa} já usa este e-mail ou LinkedIn.
    </p>
  );
}

function pessoaDoRascunho(rascunho: Rascunho, companyId: string) {
  return {
    company_id: companyId,
    name: rascunho.name,
    role: rascunho.role,
    email: rascunho.email,
    phone: rascunho.phone,
    linkedin_url: rascunho.linkedin,
    instagram_url: rascunho.instagram,
  };
}

/** A empresa completa do contato, para o seletor mostrar o nome dela. */
function useEmpresaDoContato(contato: ProspectContactWithCompany): ProspectCompanyDB | null {
  const { data: empresas = [] } = useProspectCompanies();
  return empresas.find((e) => e.id === contato.company_id) ?? null;
}

function rascunhoInicial(contato: ProspectContactWithCompany): Rascunho {
  return {
    name: contato.name,
    role: contato.role ?? '',
    email: contato.email ?? '',
    phone: contato.phone ?? '',
    linkedin: contato.linkedin_url ?? '',
    instagram: contato.instagram_url ?? '',
  };
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}
