import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DiscardProspectDialog } from '@/components/prospeccao/DiscardProspectDialog';
import { ProspectDetailDialog } from '@/components/prospeccao/ProspectDetailDialog';
import { ProspectFilterButton } from '@/components/prospeccao/ProspectFilterButton';
import { OpportunityFormDialog } from '@/components/prospeccao/OpportunityFormDialog';
import { ProspectKanbanBoard } from '@/components/prospeccao/ProspectKanbanBoard';
import { ProspectWonDialog } from '@/components/prospeccao/ProspectWonDialog';
import { useProspects } from '@/hooks/useProspects';
import { opportunitiesInProgressByCompany } from '@/lib/prospecting/companyStatus';
import {
  applyProspectFilter,
  countActiveFilters,
  FILTRO_VAZIO,
  type ProspectFilter,
} from '@/lib/prospecting/filters';
import { PROSPECT_BOARD_STAGES, type ProspectWithCompany } from '@/types/prospect';

/**
 * Oportunidades — o quadro comercial de ponta a ponta (28/09/2026): do primeiro toque ao
 * fechamento. Até 09/10/2026 o menu se chamava Prospecção e cada card era um contato; agora
 * cada card é uma oportunidade da EMPRESA, com o nome dela e os contatos dentro. A rota
 * continua `/comercial/prospeccao`, para não quebrar link salvo.
 *
 * A oportunidade sai do trabalho de dois jeitos só, Ganho ou Perda, e os dois são colunas do
 * quadro. As Métricas viraram item do menu Comercial em 29/09/2026 (`/comercial/metricas`).
 */
export default function Prospeccao() {
  const { data: todos = [], isLoading } = useProspects();

  const [novoAberto, setNovoAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);
  const [filtro, setFiltro] = useState<ProspectFilter>(FILTRO_VAZIO);
  // `?oportunidade=<id>`: o link que vem de Clientes, Projetos e das Métricas. `?contato=` é o
  // nome de antes de 09/10/2026 e continua valendo para link salvo — o id é o mesmo.
  const [params, setParams] = useSearchParams();
  const idDoLink = params.get('oportunidade') ?? params.get('contato');
  // O quadro inteiro: o trabalho em aberto e os dois desfechos, Ganho e Perda (28/09/2026).
  const noFunil = useMemo(
    () => todos.filter((p) => PROSPECT_BOARD_STAGES.includes(p.stage)),
    [todos],
  );
  // Sobre todas as oportunidades: o balão avisa a outra da mesma empresa em andamento.
  const emAndamentoPorEmpresa = useMemo(() => opportunitiesInProgressByCompany(todos), [todos]);
  const noFunilFiltrado = useMemo(() => applyProspectFilter(noFunil, filtro), [noFunil, filtro]);
  const filtrando = countActiveFilters(filtro) > 0;

  useEffect(() => {
    if (!idDoLink || isLoading) return;
    const alvo = todos.find((p) => p.id === idDoLink);
    if (alvo) setSelecionado(alvo);
    // O parâmetro sai depois de usado: fechar a ficha não pode reabri-la.
    setParams((atual) => {
      atual.delete('oportunidade');
      atual.delete('contato');
      return atual;
    }, { replace: true });
  }, [idDoLink, isLoading, todos, setParams]);

  // O detalhe precisa refletir a linha recém-invalidada, não a cópia do clique.
  const selecionadoAtual = useMemo(
    () => (selecionado ? todos.find((p) => p.id === selecionado.id) ?? selecionado : null),
    [selecionado, todos],
  );

  // Métricas viraram item do menu (29/09/2026): link antigo com `?aba=metricas` segue valendo.
  if (params.get('aba') === 'metricas') return <Navigate to="/comercial/metricas" replace />;

  return (
    // A página é só o quadro: ele prende a altura na janela e rola só dentro das colunas.
    <AppLayout
      fillViewport
      title="Oportunidades"
      description="Do primeiro contato ao fechamento: cada oportunidade termina em Ganho ou Perda"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Oportunidades' }]}
      actions={
        <Button onClick={() => setNovoAberto(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Nova oportunidade
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {filtrando && (
            <p className="text-sm text-muted-foreground">
              {noFunilFiltrado.length} de {noFunil.length}{' '}
              {noFunil.length === 1 ? 'oportunidade' : 'oportunidades'}
            </p>
          )}
          <ProspectFilterButton filtro={filtro} onChange={setFiltro} />
        </div>

        {isLoading ? (
          <Skeleton className="w-full flex-1" />
        ) : (
          <ProspectKanbanBoard
            prospects={noFunilFiltrado}
            emAndamentoPorEmpresa={emAndamentoPorEmpresa}
            onOpen={setSelecionado}
          />
        )}
      </div>

      {/* Criada a oportunidade, a ficha abre: é lá que entram os contatos e o primeiro toque. */}
      <OpportunityFormDialog
        open={novoAberto}
        onOpenChange={setNovoAberto}
        onOpenOpportunity={setSelecionado}
      />

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
