import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectFilterButton } from '@/components/prospeccao/ProspectFilterButton';
import { ProspectFormDialog } from '@/components/prospeccao/ProspectFormDialog';
import { ProspectKanbanBoard } from '@/components/prospeccao/ProspectKanbanBoard';
import { ProspectWonDialog } from '@/components/prospeccao/ProspectWonDialog';
import { useProspects } from '@/hooks/useProspects';
import { contactsInConversationByCompany } from '@/lib/prospecting/companyStatus';
import {
  applyProspectFilter,
  countActiveFilters,
  FILTRO_VAZIO,
  type ProspectFilter,
} from '@/lib/prospecting/filters';
import { PROSPECT_BOARD_STAGES, type ProspectWithCompany } from '@/types/prospect';

/**
 * Prospecção — o quadro comercial de ponta a ponta (28/09/2026): do primeiro toque ao
 * fechamento. O contato sai do trabalho de dois jeitos só, Ganho ou Perda, e os dois são
 * colunas do quadro — a aba de encerrados deixou de existir. As Métricas, que eram a outra
 * aba, viraram item do menu Comercial em 29/09/2026 (`/comercial/metricas`).
 *
 * O quadro abre primeiro: com a lista diária removida (17/09/2026), é por ele que a pessoa
 * encontra o que precisa de ação — a data de vencimento fica no card.
 */
export default function Prospeccao() {
  const { data: todos = [], isLoading } = useProspects();

  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);
  const [filtro, setFiltro] = useState<ProspectFilter>(FILTRO_VAZIO);
  const [agrupar, setAgrupar] = useState(lerPreferenciaDeAgrupar);
  // `?contato=<id>`: o link que vem de Clientes, Projetos e das Métricas (29/09/2026).
  const [params, setParams] = useSearchParams();
  const contatoDoLink = params.get('contato');
  // O quadro inteiro: o trabalho em aberto e os dois desfechos, Ganho e Perda (28/09/2026).
  const noFunil = useMemo(
    () => todos.filter((p) => PROSPECT_BOARD_STAGES.includes(p.stage)),
    [todos],
  );
  // Sobre TODOS os contatos, inclusive os encerrados: quem já está em conversa ocupa a empresa.
  const emConversaPorEmpresa = useMemo(() => contactsInConversationByCompany(todos), [todos]);
  const noFunilFiltrado = useMemo(() => applyProspectFilter(noFunil, filtro), [noFunil, filtro]);
  const filtrando = countActiveFilters(filtro) > 0;

  useEffect(() => {
    if (!contatoDoLink || isLoading) return;
    const alvo = todos.find((p) => p.id === contatoDoLink);
    if (alvo) setSelecionado(alvo);
    // O parâmetro sai depois de usado: fechar a ficha não pode reabri-la.
    setParams((atual) => {
      atual.delete('contato');
      return atual;
    }, { replace: true });
  }, [contatoDoLink, isLoading, todos, setParams]);

  // O detalhe precisa refletir a linha recém-invalidada, não a cópia do clique.
  const selecionadoAtual = useMemo(
    () => (selecionado ? todos.find((p) => p.id === selecionado.id) ?? selecionado : null),
    [selecionado, todos],
  );

  // Métricas viraram item do menu (29/09/2026): link antigo com `?aba=metricas` segue valendo.
  if (params.get('aba') === 'metricas') return <Navigate to="/comercial/metricas" replace />;

  return (
    <AppLayout
      title="Prospecção"
      description="Do primeiro contato ao fechamento: cada contato termina em Ganho ou Perda"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Prospecção' }]}
      actions={
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo contato
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {filtrando && (
            <p className="text-sm text-muted-foreground">
              {noFunilFiltrado.length} de {noFunil.length}{' '}
              {noFunil.length === 1 ? 'contato' : 'contatos'}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="agrupar-empresa"
              checked={agrupar}
              onCheckedChange={(v) => {
                setAgrupar(v);
                guardarPreferenciaDeAgrupar(v);
              }}
            />
            <Label htmlFor="agrupar-empresa" className="text-sm font-normal">Agrupar por empresa</Label>
          </div>
          <ProspectFilterButton filtro={filtro} onChange={setFiltro} />
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <ProspectKanbanBoard
            prospects={noFunilFiltrado}
            emConversaPorEmpresa={emConversaPorEmpresa}
            onOpen={setSelecionado}
            agruparPorEmpresa={agrupar}
          />
        )}
      </div>

      <ProspectFormDialog open={novoAberto} onOpenChange={setNovoAberto} />

      <ProspectDetailDialog
        prospect={selecionadoAtual}
        open={!!selecionado}
        onOpenChange={(aberto) => !aberto && setSelecionado(null)}
        onDiscard={setDescartando}
        onWin={setGanhando}
      />

      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(aberto) => !aberto && setDescartando(null)}
      />

      <ProspectWonDialog
        prospect={ganhando}
        open={!!ganhando}
        onOpenChange={(aberto) => !aberto && setGanhando(null)}
      />
    </AppLayout>
  );
}

/** Preferência de quem está vendo, neste navegador: conveniência, não dado do sistema. */
const CHAVE_AGRUPAR = 'pulse.prospeccao.agruparPorEmpresa';

function lerPreferenciaDeAgrupar(): boolean {
  try {
    return localStorage.getItem(CHAVE_AGRUPAR) === '1';
  } catch {
    return false;
  }
}

function guardarPreferenciaDeAgrupar(valor: boolean): void {
  try {
    localStorage.setItem(CHAVE_AGRUPAR, valor ? '1' : '0');
  } catch {
    // navegação privada ou storage bloqueado: a chave só não é lembrada
  }
}
