import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactDetailDialog } from '@/components/prospeccao/ContactDetailDialog';
import { ContactTable } from '@/components/prospeccao/ContactTable';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { AbasDaLista, EstadoVazio, RodapeDaLista } from '@/components/prospeccao/ListaDeCadastro';
import { ContactFormDialog } from '@/components/prospeccao/ContactFormDialog';
import { OpportunityFormDialog } from '@/components/prospeccao/OpportunityFormDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectWonDialog } from '@/components/prospeccao/ProspectWonDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import { useProspects } from '@/hooks/useProspects';
import { paginar } from '@/lib/prospecting/companyList';
import {
  applyContactQuery,
  buildContactRows,
  countContactTabs,
  sortContacts,
  type ContactQuery,
  type ContactRow,
  type ContactSort,
  type ContactSortKey,
  type ContactTab,
} from '@/lib/prospecting/contactList';
import type { ProspectContactWithCompany, ProspectWithCompany } from '@/types/prospect';

const POR_PAGINA = 25;
const CONSULTA_INICIAL: ContactQuery = { tab: 'todos', busca: '' };

const ABAS: ReadonlyArray<{ valor: ContactTab; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'no_pipeline', rotulo: 'No Pipeline' },
  { valor: 'fora', rotulo: 'Fora do Pipeline' },
];

/**
 * Contatos (01/10/2026, ADR-0045) — a visão por PESSOA, como Empresas é a visão por conta.
 * Todo contato incluído numa oportunidade aparece aqui; o criado aqui fica fora do Pipeline até
 * alguém incluí-lo numa oportunidade da empresa dele (09/10/2026).
 */
export default function ProspeccaoContatos() {
  const { can } = useAuth();
  const lista = useListaDeContatos();
  const dialogos = useDialogosDeContato(lista.linhas, lista.cards);

  return (
    <AppLayout
      title="Contatos"
      description="As pessoas das empresas: em que oportunidades estão e quem pode ser abordado"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Contatos' }]}
      actions={
        can('prospeccao:editar') && (
          <Button onClick={() => dialogos.setCriando(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Novo contato
          </Button>
        )
      }
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <AbasDaLista
            rotulo="Filtrar por situação no Pipeline"
            abas={ABAS}
            valor={lista.consulta.tab}
            contagem={lista.contagem}
            onChange={(tab) => lista.setConsulta((c) => ({ ...c, tab }))}
          />
          <div className="relative ml-auto min-w-[220px] flex-[0_1_320px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={lista.consulta.busca}
              onChange={(e) => lista.setConsulta((c) => ({ ...c, busca: e.target.value }))}
              placeholder="Buscar por nome, e-mail, empresa ou cargo"
              aria-label="Buscar contato"
              className="h-[34px] pl-9 text-[13.5px]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <Conteudo lista={lista} onOpen={(row) => dialogos.setContatoAberto(row.contact.id)} />
          </div>
          <RodapeDaLista
            texto={textoDoRodape(lista.visiveis.length, lista.linhas.length, lista.filtrado)}
            pagina={lista.pagina}
            totalDePaginas={lista.totalDePaginas}
            onPagina={lista.setPagina}
          />
        </div>
      </div>

      <Dialogos dialogos={dialogos} />
    </AppLayout>
  );
}

function useListaDeContatos() {
  const { data: contatos = [], isLoading: carregandoContatos } = useProspectContacts();
  const { data: cards = [], isLoading: carregandoCards } = useProspects();
  const [consulta, setConsulta] = useState<ContactQuery>(CONSULTA_INICIAL);
  const [sort, setSort] = useState<ContactSort>({ key: 'name', dir: 1 });
  const [pagina, setPagina] = useState(0);

  const linhas = useMemo(() => buildContactRows(contatos, cards), [contatos, cards]);
  const visiveis = useMemo(() => sortContacts(applyContactQuery(linhas, consulta), sort), [linhas, consulta, sort]);
  const contagem = useMemo(() => countContactTabs(linhas, consulta), [linhas, consulta]);
  useEffect(() => setPagina(0), [consulta, sort]);

  const alternarOrdem = (key: ContactSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  return {
    cards,
    linhas,
    visiveis,
    contagem,
    consulta,
    setConsulta,
    sort,
    alternarOrdem,
    pagina,
    setPagina,
    totalDePaginas: Math.max(1, Math.ceil(visiveis.length / POR_PAGINA)),
    paginaAtual: paginar(visiveis, pagina, POR_PAGINA),
    carregando: carregandoContatos || carregandoCards,
    filtrado: consulta.tab !== CONSULTA_INICIAL.tab || !!consulta.busca.trim(),
    limpar: () => setConsulta(CONSULTA_INICIAL),
  };
}

type ListaDeContatos = ReturnType<typeof useListaDeContatos>;

/**
 * Os popups leem a versão atual, não a cópia do clique: editar o contato atualiza a ficha, e
 * a oportunidade aberta a partir dela é a mesma que o quadro mostra.
 */
function useDialogosDeContato(linhas: ContactRow[], cards: ProspectWithCompany[]) {
  const [criando, setCriando] = useState(false);
  const [contatoAberto, setContatoAberto] = useState<string | null>(null);
  const [levando, setLevando] = useState<ProspectContactWithCompany | null>(null);
  const [cardAberto, setCardAberto] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);

  return {
    criando,
    setCriando,
    contatoAtual: linhas.find((l) => l.contact.id === contatoAberto) ?? null,
    setContatoAberto,
    levando,
    setLevando,
    cardAtual: cards.find((c) => c.id === cardAberto) ?? null,
    setCardAberto,
    descartando,
    setDescartando,
    ganhando,
    setGanhando,
  };
}

type DialogosDeContato = ReturnType<typeof useDialogosDeContato>;

function Dialogos({ dialogos }: { dialogos: DialogosDeContato }) {
  const d = dialogos;
  const abrirCard = (card: ProspectWithCompany) => d.setCardAberto(card.id);
  return (
    <>
      <ContactFormDialog
        open={d.criando}
        onOpenChange={d.setCriando}
        onExistingContact={(contato) => d.setContatoAberto(contato.id)}
      />

      <OpportunityFormDialog
        open={!!d.levando}
        onOpenChange={(aberto) => !aberto && d.setLevando(null)}
        contatoInicial={d.levando}
        onOpenOpportunity={abrirCard}
      />

      <ContactDetailDialog
        row={d.contatoAtual}
        open={!!d.contatoAtual}
        onOpenChange={(aberto) => !aberto && d.setContatoAberto(null)}
        onOpenCard={abrirCard}
        onStartProspecting={(contato) => {
          d.setContatoAberto(null);
          d.setLevando(contato);
        }}
      />

      <ProspectDetailDialog
        prospect={d.cardAtual}
        open={!!d.cardAtual}
        onOpenChange={(aberto) => !aberto && d.setCardAberto(null)}
        onDiscard={d.setDescartando}
        onWin={d.setGanhando}
      />

      <DiscardProspectDialog
        prospect={d.descartando}
        open={!!d.descartando}
        onOpenChange={(aberto) => !aberto && d.setDescartando(null)}
      />

      <ProspectWonDialog
        prospect={d.ganhando}
        open={!!d.ganhando}
        onOpenChange={(aberto) => !aberto && d.setGanhando(null)}
      />
    </>
  );
}

function Conteudo({ lista, onOpen }: { lista: ListaDeContatos; onOpen: (row: ContactRow) => void }) {
  if (lista.carregando) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando contatos">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (lista.linhas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum contato cadastrado ainda"
        texto="Os contatos entram ao cadastrar alguém aqui ou numa oportunidade."
      />
    );
  }
  if (lista.visiveis.length === 0) {
    return (
      <EstadoVazio titulo="Nenhum contato encontrado" texto="Ajuste a busca ou a aba escolhida.">
        <Button variant="outline" size="sm" className="mt-1" onClick={lista.limpar}>Limpar tudo</Button>
      </EstadoVazio>
    );
  }
  return <ContactTable rows={lista.paginaAtual} sort={lista.sort} onSort={lista.alternarOrdem} onOpen={onOpen} />;
}

function textoDoRodape(exibidos: number, total: number, filtrado: boolean): string {
  return `${exibidos} ${exibidos === 1 ? 'contato' : 'contatos'}${filtrado ? ` de ${total}` : ''}`;
}
